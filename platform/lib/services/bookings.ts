/* ------------------------------------------------------------------ *
 * The booking lifecycle.
 *
 *  1. Revalidate the offer with its supplier and re-price it centrally.
 *     A different price is never applied silently: the agent must accept it.
 *  2. Write the booking row FIRST (status "submitting") under a unique
 *     (agency, idempotency key). A double-click or a retried request finds
 *     the existing booking instead of creating a second reservation.
 *  3. Call the supplier ONCE. A timeout means "we don't know" -> status
 *     outcome_unknown, resolved only by looking the booking up (reconcile),
 *     never by booking again.
 *  4. Money moves only through the append-only ledger.
 * ------------------------------------------------------------------ */
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB, type Executor } from '@/lib/db';
import type { BookedRoom } from '@/lib/db/schema';
import { PAYMENT_HOLD_HOURS } from '@/lib/config';
import { assertTransition, type BookingStatus } from '@/lib/domain/booking-state';
import { cancellationPenalty, type CancelPolicy } from '@/lib/domain/cancellation';
import { todayIso } from '@/lib/domain/dates';
import { describeRoom } from '@/lib/domain/occupancy';
import type { PriceBreakdown } from '@/lib/domain/pricing';
import { callSupplier, getAdapter } from '@/lib/suppliers/registry';
import { SupplierRejectedError, SupplierTimeoutError, SupplierUnavailableError, type BookResult, type SupplierOffer } from '@/lib/suppliers/types';
import { SYSTEM, agencyOf, isStaff, requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { randomCode } from './counters';
import { AppError, ForbiddenError, NotFoundError, isUniqueViolation } from './errors';
import { agencyOutstanding, balances, issueInvoice, post } from './ledger';
import { getQuote, priceSupplierOffer, createQuote, type QuoteSnapshot } from './search';

const { bookings, bookingEvents, agencies, hotels } = schema;
type Booking = typeof bookings.$inferSelect;

/* ------------------------------ helpers ------------------------------ */

async function transition(db: Executor, actor: Actor, b: Booking, to: BookingStatus, note?: string, patch: Partial<typeof bookings.$inferInsert> = {}): Promise<Booking> {
  assertTransition(b.status, to);
  // Optimistic concurrency: only move if nobody else moved it first.
  const [updated] = await db.update(bookings)
    .set({ ...patch, status: to, updatedAt: new Date() })
    .where(and(eq(bookings.id, b.id), eq(bookings.status, b.status)))
    .returning();
  if (!updated) throw new AppError('This booking was updated by someone else. Refresh and try again.', 'conflict');
  await db.insert(bookingEvents).values({
    bookingId: b.id, fromStatus: b.status, toStatus: to, actorId: actor === SYSTEM ? null : actor.userId, actorLabel: actor.label, note: note ?? null,
  });
  return updated;
}

async function setPayment(db: Executor, b: Booking): Promise<Booking> {
  const bal = await balances(db, b.id);
  let paymentStatus = b.paymentStatus;
  if (b.paymentArrangement === 'direct') paymentStatus = 'direct';
  else if (!bal.hasCharge) paymentStatus = 'not_due';
  else if (bal.agentBalance > 0) paymentStatus = 'due';
  else if (bal.agentBalance < 0) paymentStatus = 'refund_due';
  else paymentStatus = bal.agentRefunded > 0 ? 'refunded' : bal.agentPaid > 0 ? 'paid' : 'not_due';
  if (paymentStatus === b.paymentStatus) return b;
  const [u] = await db.update(bookings).set({ paymentStatus, updatedAt: new Date() }).where(eq(bookings.id, b.id)).returning();
  return u;
}

async function postCharge(db: Executor, actor: Actor, b: Booking, dueAt: Date) {
  const bal = await balances(db, b.id);
  if (bal.hasCharge) return;
  await post(db, actor, [{ bookingId: b.id, agencyId: b.agencyId, kind: 'agent_charge', account: 'agent', amountMinor: b.sellMinor, currency: b.currency, reference: b.reference, memo: 'Accommodation' }]);
  await issueInvoice(db, {
    agencyId: b.agencyId, bookingId: b.id, kind: 'invoice', currency: b.currency, totalMinor: b.sellMinor, taxMinor: b.taxMinor, dueAt,
    lines: [{ label: `Accommodation ${b.checkIn} – ${b.checkOut} · ${b.rooms.length} room(s) · ${b.reference}`, amountMinor: b.sellMinor }],
  });
}

async function postConfirmedEconomics(db: Executor, actor: Actor, b: Booking) {
  const bal = await balances(db, b.id);
  if (b.paymentArrangement === 'direct') {
    if (bal.hasCommission) return;
    const p = b.pricing as PriceBreakdown;
    await post(db, actor, [
      { bookingId: b.id, agencyId: b.agencyId, kind: 'commission_receivable', account: 'commission', amountMinor: b.commissionReceivableMinor, currency: b.currency, reference: b.reference, memo: 'Hotel commission' },
      ...(p.agentCommissionMinor > 0 ? [{ bookingId: b.id, agencyId: b.agencyId, kind: 'agent_commission', account: 'agent' as const, amountMinor: -p.agentCommissionMinor, currency: b.currency, reference: b.reference, memo: 'Agent share of commission' }] : []),
    ]);
    return;
  }
  if (!bal.hasSupplierPayable && b.supplierCostMinor > 0) {
    await post(db, actor, [{ bookingId: b.id, agencyId: b.agencyId, kind: 'supplier_payable', account: 'supplier', amountMinor: b.supplierCostMinor, currency: b.currency, reference: b.supplierRef ?? b.reference, memo: `Owed to ${b.supplier}` }]);
  }
}

/** Decide where the booking goes once the supplier has accepted it. */
async function applySupplierResult(db: DB, actor: Actor, b: Booking, r: BookResult | { state: 'confirmed' | 'held' | 'pending'; supplierRef?: string | null; hotelConfirmation?: string | null }, note?: string): Promise<Booking> {
  return db.transaction(async (tx) => {
    const patch = { supplierRef: r.supplierRef ?? b.supplierRef, hotelConfirmation: r.hotelConfirmation ?? b.hotelConfirmation };
    if (r.state === 'pending') return transition(tx, actor, b, 'pending_confirmation', note ?? 'Sent to the hotel for confirmation', patch);

    if (b.paymentArrangement === 'direct') {
      const c = await transition(tx, actor, b, 'confirmed', note ?? 'Confirmed by supplier', { ...patch, paymentStatus: 'direct' });
      await postConfirmedEconomics(tx, actor, c);
      return c;
    }
    if (b.paymentArrangement === 'credit') {
      const [agency] = await tx.select().from(agencies).where(eq(agencies.id, b.agencyId));
      const due = new Date(Date.now() + Math.max(1, agency.paymentTermsDays) * 86_400_000);
      let c = await transition(tx, actor, b, 'confirmed', note ?? 'Confirmed on account', { ...patch, paymentDueAt: due });
      await postCharge(tx, actor, c, due);
      await postConfirmedEconomics(tx, actor, c);
      c = await setPayment(tx, c);
      return c;
    }
    // prepay
    const bal = await balances(tx, b.id);
    if (bal.hasCharge && bal.agentBalance <= 0) {
      const c = await transition(tx, actor, b, 'confirmed', note ?? 'Paid and confirmed', patch);
      await postConfirmedEconomics(tx, actor, c);
      return setPayment(tx, c);
    }
    const due = b.paymentDueAt ?? new Date(Date.now() + PAYMENT_HOLD_HOURS * 3_600_000);
    let c = await transition(tx, actor, b, 'awaiting_payment', note ?? `Held until ${due.toISOString().slice(0, 16).replace('T', ' ')} UTC pending payment`, { ...patch, paymentDueAt: due });
    await postCharge(tx, actor, c, due);
    c = await setPayment(tx, c);
    return c;
  });
}

/* --------------------------- create booking --------------------------- */

export const guestSchema = z.object({
  quoteId: z.string().uuid(),
  idempotencyKey: z.string().min(16).max(80),
  acceptedSellMinor: z.number().int().nonnegative(),
  leadGuest: z.string().trim().min(2, 'Lead guest name is required').max(120),
  guestNames: z.array(z.array(z.string().trim().max(120))),
  agentReference: z.string().trim().max(60).optional().nullable(),
  specialRequests: z.string().trim().max(500).optional().nullable(),
});

export type CreateResult =
  | { kind: 'created' | 'existing'; booking: Booking }
  | { kind: 'price_changed'; quoteId: string; oldSellMinor: number; newSellMinor: number; currency: string }
  | { kind: 'unavailable'; reason: string };

export async function createBooking(db: DB, actor: Actor, input: z.infer<typeof guestSchema>): Promise<CreateResult> {
  const agencyId = agencyOf(actor);
  const data = guestSchema.parse(input);

  // 0. The same submission twice returns the first result.
  const [dup] = await db.select().from(bookings).where(and(eq(bookings.agencyId, agencyId), eq(bookings.idempotencyKey, data.idempotencyKey)));
  if (dup) return { kind: 'existing', booking: dup };

  const [agency] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!agency || agency.status !== 'verified') {
    throw new AppError('Your agency is awaiting verification. You can search and quote, but booking opens once HotelBridge has verified your account.', 'not_verified');
  }

  const quote = await getQuote(db, actor, data.quoteId);
  const snap = quote.snapshot;
  if (data.guestNames.length !== quote.rooms.length) throw new AppError('Guest names do not match the rooms in this quote');

  // 1. Revalidate with the supplier and re-price.
  const adapter = getAdapter(quote.supplier);
  const today = todayIso();
  let fresh: SupplierOffer | { unavailable: string };
  try {
    fresh = await callSupplier(db, adapter, 'revalidate', { offerKey: quote.offerKey },
      () => adapter.revalidate({ db }, quote.offerKey, { city: snap.city, checkIn: quote.checkIn, checkOut: quote.checkOut, rooms: quote.rooms, today, hotelId: quote.hotelId }));
  } catch {
    throw new AppError('We could not reach the supplier to confirm the price. Nothing has been booked — please try again.', 'supplier_unavailable');
  }
  if ('unavailable' in fresh) return { kind: 'unavailable', reason: fresh.unavailable };
  const priced = await priceSupplierOffer(db, agencyId, fresh);
  if (priced.price.sellMinor !== data.acceptedSellMinor || priced.price.currency !== snap.priced.price.currency) {
    const q = await createQuote(db, actor, { offerKey: quote.offerKey, hotelId: quote.hotelId, checkIn: quote.checkIn, checkOut: quote.checkOut, rooms: quote.rooms });
    const newSell = (q.snapshot as QuoteSnapshot).priced.price.sellMinor;
    return { kind: 'price_changed', quoteId: q.id, oldSellMinor: data.acceptedSellMinor, newSellMinor: newSell, currency: priced.price.currency };
  }

  // 2. Payment arrangement. Credit only if finance enabled it and there is headroom.
  const price = priced.price;
  let arrangement: 'credit' | 'prepay' | 'direct' = 'prepay';
  if (price.collectionModel === 'pay_direct_to_hotel') arrangement = 'direct';
  else if (agency.creditEnabled && price.currency === agency.billingCurrency) {
    const outstanding = await agencyOutstanding(db, agencyId, price.currency);
    if (outstanding + price.sellMinor <= agency.creditLimitMinor) arrangement = 'credit';
  }

  const policy = fresh.cancelPolicy;
  const rooms: BookedRoom[] = quote.rooms.map((r, i) => ({
    adults: r.adults, childAges: r.childAges, roomTypeId: fresh.roomTypeId ?? '', roomName: fresh.roomName, mealPlan: fresh.mealPlan,
    guestNames: (data.guestNames[i] ?? []).filter(Boolean),
  }));

  // 3. Write the booking before talking to the supplier.
  let b: Booking | undefined;
  for (let attempt = 0; attempt < 5 && !b; attempt++) {
    try {
      b = await db.transaction(async (tx) => {
        const [row] = await tx.insert(bookings).values({
          reference: 'HB-' + randomCode(6),
          agencyId, createdBy: actor.userId, idempotencyKey: data.idempotencyKey,
          supplier: quote.supplier, hotelId: quote.hotelId, contractId: fresh.contractId, offerKey: quote.offerKey,
          checkIn: quote.checkIn, checkOut: quote.checkOut, rooms,
          leadGuest: data.leadGuest, agentReference: data.agentReference || null, specialRequests: data.specialRequests || null,
          status: 'submitting', paymentStatus: arrangement === 'direct' ? 'direct' : 'not_due', paymentArrangement: arrangement,
          currency: price.currency, sellMinor: price.sellMinor, supplierCostMinor: price.supplierCostMinor, taxMinor: price.taxMinor,
          localTaxMinor: price.localTaxMinor, commissionReceivableMinor: price.commissionReceivableMinor, netRevenueMinor: price.netRevenueMinor,
          collectionModel: price.collectionModel,
          pricing: { ...price, contractAmountMinor: fresh.contractAmountMinor, firstNightContractMinor: fresh.firstNightContractMinor, availability: fresh.availability },
          cancelPolicy: policy, freeCancelUntil: priced.freeCancelUntil,
          isSample: agency.isSample,
        }).returning();
        await tx.insert(bookingEvents).values({ bookingId: row.id, fromStatus: null, toStatus: 'submitting', actorId: actor.userId, actorLabel: actor.label, note: `${fresh.availability === 'instant' ? 'Instant' : 'On request'} · ${arrangement}` });
        return row;
      });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      const [again] = await db.select().from(bookings).where(and(eq(bookings.agencyId, agencyId), eq(bookings.idempotencyKey, data.idempotencyKey)));
      if (again) return { kind: 'existing', booking: again };
      // Reference collision — try another code.
    }
  }
  if (!b) throw new Error('Could not allocate a booking reference');
  await audit(db, actor, 'booking.created', 'booking', b.id, { reference: b.reference, sell: b.sellMinor, currency: b.currency }, agencyId);

  // Prepay against a supplier that cannot hold: don't submit until paid.
  const hold = arrangement === 'prepay';
  if (hold && !adapter.capabilities.hold && fresh.availability === 'instant') {
    return { kind: 'created', booking: await db.transaction(async (tx) => {
      const due = new Date(Date.now() + PAYMENT_HOLD_HOURS * 3_600_000);
      let c = await transition(tx, actor, b!, 'awaiting_payment', 'Supplier cannot hold rooms: reservation is placed once payment is received', { paymentDueAt: due });
      await postCharge(tx, actor, c, due);
      c = await setPayment(tx, c);
      return c;
    }) };
  }

  return { kind: 'created', booking: await submitToSupplier(db, actor, b, fresh, hold) };
}

async function submitToSupplier(db: DB, actor: Actor, b: Booking, offer: SupplierOffer, hold: boolean): Promise<Booking> {
  const adapter = getAdapter(b.supplier);
  try {
    const r = await callSupplier(db, adapter, 'book',
      { clientReference: b.reference, offerKey: offer.offerKey, leadGuest: b.leadGuest, hold },
      () => adapter.book({ db }, {
        clientReference: b.reference, offer, checkIn: b.checkIn, checkOut: b.checkOut, leadGuest: b.leadGuest,
        guestNames: b.rooms.map((r) => r.guestNames), specialRequests: b.specialRequests, hold,
      }), { bookingId: b.id });
    return applySupplierResult(db, actor, b, r);
  } catch (e) {
    if (e instanceof SupplierRejectedError) return transition(db, actor, b, 'failed', `Supplier declined: ${e.message}`);
    if (e instanceof SupplierUnavailableError) return transition(db, actor, b, 'failed', `Not sent: ${e.message}`);
    // Timeout or anything unexpected after the request may have left: do NOT retry.
    const why = e instanceof SupplierTimeoutError ? 'Supplier did not respond in time' : 'Unexpected error while booking';
    return transition(db, actor, b, 'outcome_unknown', `${why}. Reservation may exist — reconciliation required, do not rebook.`);
  }
}

/* --------------------------- reconciliation --------------------------- */

export async function reconcileBooking(db: DB, actor: Actor, bookingId: string): Promise<Booking> {
  requireStaff(actor, ['admin', 'ops']);
  const b = await loadForStaff(db, bookingId);
  if (b.status !== 'outcome_unknown' && b.status !== 'submitting') throw new AppError('Only unresolved bookings need reconciling');
  const adapter = getAdapter(b.supplier);
  if (!adapter.capabilities.retrieve) throw new AppError(`${adapter.label} cannot look bookings up — contact the supplier and resolve manually.`);
  const r = await callSupplier(db, adapter, 'retrieve', { clientReference: b.reference }, () => adapter.retrieve({ db }, { clientReference: b.reference, supplierRef: b.supplierRef }), { bookingId: b.id });
  let cur = b;
  if (cur.status === 'submitting') cur = await transition(db, actor, cur, 'outcome_unknown', 'Stuck in submission — checking with supplier');
  if (r.state === 'not_found' || r.state === 'cancelled') {
    return transition(db, actor, cur, 'failed', r.state === 'not_found' ? 'Supplier has no record — nothing was booked' : 'Supplier shows the reservation cancelled');
  }
  return applySupplierResult(db, actor, cur, { state: r.state, supplierRef: r.supplierRef }, 'Reconciled with supplier');
}

/* ------------------------------ payments ------------------------------ */

export async function recordPayment(db: DB, actor: Actor, bookingId: string, input: { amountMinor: number; reference: string }) {
  requireStaff(actor, ['admin', 'finance']);
  const amount = z.number().int().positive().parse(input.amountMinor);
  const reference = z.string().trim().min(2, 'Payment reference is required').max(120).parse(input.reference);
  const b = await loadForStaff(db, bookingId);
  if (b.paymentArrangement === 'direct') throw new AppError('This booking is paid at the hotel');
  await post(db, actor, [{ bookingId: b.id, agencyId: b.agencyId, kind: 'agent_payment', account: 'agent', amountMinor: -amount, currency: b.currency, reference, memo: 'Payment received' }]);
  await audit(db, actor, 'booking.payment_recorded', 'booking', b.id, { amount, currency: b.currency, reference }, b.agencyId);
  let cur = await setPayment(db, b);
  if (cur.status === 'awaiting_payment' && cur.paymentStatus === 'paid') {
    if (cur.supplierRef) {
      cur = await db.transaction(async (tx) => {
        const c = await transition(tx, actor, cur, 'confirmed', 'Payment received — confirmed');
        await postConfirmedEconomics(tx, actor, c);
        return c;
      });
    } else {
      // Not yet placed with the supplier (it cannot hold). Place it now.
      const adapter = getAdapter(cur.supplier);
      const q = cur.offerKey;
      const fresh = await callSupplier(db, adapter, 'revalidate', { offerKey: q }, () => adapter.revalidate({ db }, q, {
        city: '', checkIn: cur.checkIn, checkOut: cur.checkOut, rooms: cur.rooms.map((r) => ({ adults: r.adults, childAges: r.childAges })), today: todayIso(), hotelId: cur.hotelId,
      }));
      cur = await transition(db, actor, cur, 'submitting', 'Payment received — placing reservation');
      if ('unavailable' in fresh) return transition(db, actor, cur, 'failed', `Supplier no longer has the room: ${fresh.unavailable}. Refund due.`);
      cur = await submitToSupplier(db, actor, cur, fresh, false);
    }
  }
  return cur;
}

export async function recordRefund(db: DB, actor: Actor, bookingId: string, input: { amountMinor: number; reference: string }) {
  requireStaff(actor, ['admin', 'finance']);
  const amount = z.number().int().positive().parse(input.amountMinor);
  const reference = z.string().trim().min(2).max(120).parse(input.reference);
  const b = await loadForStaff(db, bookingId);
  const bal = await balances(db, b.id);
  if (-bal.agentBalance < amount) throw new AppError('Refund exceeds the amount owed back to the agent');
  await post(db, actor, [{ bookingId: b.id, agencyId: b.agencyId, kind: 'agent_refund', account: 'agent', amountMinor: amount, currency: b.currency, reference, memo: 'Refund paid' }]);
  await audit(db, actor, 'booking.refund_recorded', 'booking', b.id, { amount, reference }, b.agencyId);
  return setPayment(db, b);
}

/* ---------------------------- cancellation ---------------------------- */

export function penaltyFor(b: Booking, today = todayIso()) {
  const p = b.pricing as PriceBreakdown & { contractAmountMinor: number; firstNightContractMinor: number };
  return cancellationPenalty({
    policy: b.cancelPolicy as CancelPolicy, checkIn: b.checkIn, today,
    sellMinor: b.sellMinor, costMinor: b.supplierCostMinor,
    firstNightContractMinor: p.firstNightContractMinor ?? 0, contractAmountMinor: p.contractAmountMinor ?? 0,
  });
}

export async function requestCancellation(db: DB, actor: Actor, bookingId: string, reason: string) {
  const b = await getBookingForActor(db, actor, bookingId);
  if (b.status === 'pending_confirmation') {
    // Nothing confirmed, nothing charged: withdraw the request.
    return finaliseCancellation(db, actor, b, 'Request withdrawn by agent');
  }
  if (!['confirmed', 'amendment_requested', 'awaiting_payment'].includes(b.status)) throw new AppError('This booking cannot be cancelled in its current state');
  const pen = penaltyFor(b);
  const adapter = getAdapter(b.supplier);
  const note = `${reason ? reason + ' · ' : ''}${pen.reason}; charge ${pen.sellPenaltyMinor / 100} ${b.currency}`;
  if (pen.free && adapter.capabilities.cancel && b.status !== 'amendment_requested') {
    // Free and the supplier supports it: process immediately.
    return finaliseCancellation(db, actor, b, note);
  }
  if (b.status === 'awaiting_payment') return finaliseCancellation(db, actor, b, note);
  return transition(db, actor, b, 'cancellation_requested', note);
}

export async function processCancellation(db: DB, actor: Actor, bookingId: string) {
  requireStaff(actor, ['admin', 'ops']);
  const b = await loadForStaff(db, bookingId);
  if (!['cancellation_requested', 'confirmed', 'amendment_requested', 'awaiting_payment', 'pending_confirmation'].includes(b.status)) throw new AppError('Booking is not cancellable');
  return finaliseCancellation(db, actor, b, 'Cancelled by HotelBridge operations');
}

async function finaliseCancellation(db: DB, actor: Actor, b: Booking, note: string, opts: { waivePenalty?: boolean } = {}): Promise<Booking> {
  const pen = opts.waivePenalty ? { sellPenaltyMinor: 0, costPenaltyMinor: 0, free: true, reason: 'Penalty waived' } : penaltyFor(b);
  if (b.supplierRef && b.status !== 'pending_confirmation') {
    const adapter = getAdapter(b.supplier);
    try {
      const r = await callSupplier(db, adapter, 'cancel', { clientReference: b.reference }, () => adapter.cancel({ db }, { clientReference: b.reference, supplierRef: b.supplierRef! }), { bookingId: b.id });
      if (!r.cancelled) throw new AppError('The supplier did not accept the cancellation. Operations will follow up.');
    } catch (e) {
      if (e instanceof AppError) throw e;
      if (b.status !== 'cancellation_requested') await transition(db, actor, b, 'cancellation_requested', 'Supplier did not respond to the cancellation — operations will verify');
      throw new AppError('The supplier did not respond. Your cancellation request is recorded and operations will verify it with the supplier.');
    }
  } else if (b.supplierRef && b.status === 'pending_confirmation') {
    const adapter = getAdapter(b.supplier);
    await adapter.cancel({ db }, { clientReference: b.reference, supplierRef: b.supplierRef });
  }
  return db.transaction(async (tx) => {
    let c = await transition(tx, actor, b, 'cancelled', note);
    const bal = await balances(tx, b.id);
    const entries = [];
    if (bal.hasCharge) {
      entries.push({ bookingId: b.id, agencyId: b.agencyId, kind: 'reversal', account: 'agent' as const, amountMinor: -b.sellMinor, currency: b.currency, reference: b.reference, memo: 'Cancellation — charge reversed' });
      if (pen.sellPenaltyMinor > 0) entries.push({ bookingId: b.id, agencyId: b.agencyId, kind: 'cancellation_fee', account: 'agent' as const, amountMinor: pen.sellPenaltyMinor, currency: b.currency, reference: b.reference, memo: pen.reason });
    }
    if (bal.hasSupplierPayable) {
      entries.push({ bookingId: b.id, agencyId: b.agencyId, kind: 'reversal', account: 'supplier' as const, amountMinor: -b.supplierCostMinor, currency: b.currency, reference: b.reference, memo: 'Cancellation — payable reversed' });
      if (pen.costPenaltyMinor > 0) entries.push({ bookingId: b.id, agencyId: b.agencyId, kind: 'supplier_payable', account: 'supplier' as const, amountMinor: pen.costPenaltyMinor, currency: b.currency, reference: b.reference, memo: 'Supplier cancellation charge' });
    }
    if (bal.hasCommission) {
      entries.push({ bookingId: b.id, agencyId: b.agencyId, kind: 'reversal', account: 'commission' as const, amountMinor: -bal.commissionBalance, currency: b.currency, reference: b.reference, memo: 'Cancellation — commission reversed' });
    }
    await post(tx, actor, entries);
    if (bal.hasCharge) {
      const credit = b.sellMinor - pen.sellPenaltyMinor;
      if (credit > 0) {
        await issueInvoice(tx, { agencyId: b.agencyId, bookingId: b.id, kind: 'credit_note', currency: b.currency, totalMinor: -credit, taxMinor: 0, lines: [{ label: `Cancellation of ${b.reference}`, amountMinor: -credit }] });
      }
    }
    c = await setPayment(tx, c);
    await audit(tx, actor, 'booking.cancelled', 'booking', b.id, { penalty: pen }, b.agencyId);
    return c;
  });
}

/* ----------------------------- amendments ----------------------------- */

export async function requestAmendment(db: DB, actor: Actor, bookingId: string, details: string) {
  const text = z.string().trim().min(5, 'Describe the change you need').max(1000).parse(details);
  const b = await getBookingForActor(db, actor, bookingId);
  if (b.status !== 'confirmed') throw new AppError('Only confirmed bookings can be amended');
  return transition(db, actor, b, 'amendment_requested', text);
}

export async function resolveAmendment(db: DB, actor: Actor, bookingId: string, note: string) {
  requireStaff(actor, ['admin', 'ops']);
  const b = await loadForStaff(db, bookingId);
  if (b.status !== 'amendment_requested') throw new AppError('No amendment pending');
  return transition(db, actor, b, 'confirmed', z.string().trim().min(3, 'Record what was agreed').parse(note));
}

/* ------------------------- hotel confirmations ------------------------- */

export async function hotelRespond(db: DB, actor: Actor, bookingId: string, input: { accept: boolean; confirmation?: string; note?: string }) {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b) throw new NotFoundError('Booking');
  const isPartner = actor.partnerHotelId != null && actor.partnerHotelId === b.hotelId;
  if (!isPartner && !(actor.platformRole === 'admin' || actor.platformRole === 'ops')) throw new NotFoundError('Booking');
  if (b.status !== 'pending_confirmation') throw new AppError('This request has already been answered');
  if (!input.accept) return transition(db, actor, b, 'declined', input.note?.trim() || 'Declined by hotel');
  const confirmation = z.string().trim().min(2, 'Enter the hotel confirmation number').max(60).parse(input.confirmation ?? '');
  return applySupplierResult(db, actor, b, { state: 'confirmed', hotelConfirmation: confirmation },
    `${isPartner ? 'Confirmed by hotel' : 'Hotel confirmation recorded by HotelBridge'} (${confirmation})`);
}

/* ------------------------------ housekeeping ------------------------------ */

/** Release unpaid holds after their deadline. Safe to run repeatedly. */
export async function expireUnpaidHolds(db: DB, now = new Date()) {
  const due = await db.select().from(bookings).where(and(eq(bookings.status, 'awaiting_payment'), lt(bookings.paymentDueAt, now)));
  const done: string[] = [];
  for (const b of due) {
    if (b.paymentStatus === 'paid') continue;
    try {
      // An unpaid hold that lapses costs the agent nothing.
      await finaliseCancellation(db, SYSTEM, b, 'Payment not received by the deadline — hold released', { waivePenalty: true });
      done.push(b.reference);
    } catch { /* stays for operations */ }
  }
  return done;
}

/* ------------------------------- reading ------------------------------- */

async function loadForStaff(db: Executor, id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Booking');
  const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!b) throw new NotFoundError('Booking');
  return b;
}

/** Tenant-safe read: agents see their agency's bookings, staff see all. Others: not found. */
export async function getBookingForActor(db: Executor, actor: Actor, id: string): Promise<Booking> {
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Booking');
  if (isStaff(actor)) return loadForStaff(db, id);
  const agencyId = agencyOf(actor);
  const [b] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.agencyId, agencyId)));
  if (!b) throw new NotFoundError('Booking');
  return b;
}

export async function listBookingsForActor(db: Executor, actor: Actor, opts: { status?: string[]; limit?: number } = {}) {
  const agencyId = agencyOf(actor);
  return db.select({ b: bookings, hotelName: hotels.name, city: hotels.city }).from(bookings)
    .innerJoin(hotels, eq(hotels.id, bookings.hotelId))
    .where(and(eq(bookings.agencyId, agencyId), opts.status?.length ? inArray(bookings.status, opts.status) : undefined))
    .orderBy(desc(bookings.createdAt)).limit(opts.limit ?? 200);
}

export async function bookingTimeline(db: Executor, bookingId: string) {
  return db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId)).orderBy(bookingEvents.createdAt);
}

/** Partners see their own hotel's requests — without our selling price or margin. */
export async function listForPartner(db: Executor, actor: Actor) {
  if (!actor.partnerHotelId) throw new ForbiddenError();
  return db.select({
    id: bookings.id, reference: bookings.reference, status: bookings.status, checkIn: bookings.checkIn, checkOut: bookings.checkOut,
    rooms: bookings.rooms, leadGuest: bookings.leadGuest, specialRequests: bookings.specialRequests,
    supplierCostMinor: bookings.supplierCostMinor, currency: bookings.currency, collectionModel: bookings.collectionModel,
    hotelConfirmation: bookings.hotelConfirmation, createdAt: bookings.createdAt,
  }).from(bookings).where(and(eq(bookings.hotelId, actor.partnerHotelId), eq(bookings.supplier, 'contracted')))
    .orderBy(desc(bookings.createdAt)).limit(200);
}

export function roomsSummary(b: Pick<Booking, 'rooms'>) {
  return b.rooms.map((r, i) => `Room ${i + 1}: ${r.roomName}, ${describeRoom(r)}`).join(' · ');
}

