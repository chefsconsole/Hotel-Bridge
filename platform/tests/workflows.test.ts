import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import { login, registerAgency } from '@/lib/services/auth';
import { createQuote, searchHotels, getQuote, type QuoteSnapshot } from '@/lib/services/search';
import {
  createBooking, getBookingForActor, hotelRespond, listBookingsForActor, listForPartner, processCancellation,
  reconcileBooking, recordPayment, requestCancellation, expireUnpaidHolds, lapseUnansweredRequests, payFromWallet, recordWalletPayout, penaltyFor,
} from '@/lib/services/bookings';
import { balances, walletBalance } from '@/lib/services/ledger';
import { addRatePeriod, createContract, setAgencyCredit, setContractStatus, importRateSheet, parseRateSheet } from '@/lib/services/catalog';
import { buildProposal, createEnquiry, decideProposal, generateHotelRequests, getEnquiry, markRequestSent, recordOffer, sendProposal } from '@/lib/services/groups';
import { founderMetrics, operationalIssues } from '@/lib/services/metrics';
import { key, setup, stay, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

async function quoteFor(fx: Fixture, rooms = [{ adults: 2, childAges: [] as number[] }], from = 10, nights = 2, supplier = 'contracted') {
  const s = stay(fx.today, from, nights);
  const { results } = await searchHotels(fx.db, fx.A, { city: 'Paris', ...s, rooms });
  const offer = results[0]?.offers.find((o) => o.supplier === supplier);
  if (!offer) throw new Error('no offer');
  const q = await createQuote(fx.db, fx.A, { offerKey: offer.offerKey, hotelId: fx.hotel.id, ...s, rooms });
  return { q, snap: q.snapshot as QuoteSnapshot, s };
}

const book = (fx: Fixture, q: { id: string }, sell: number, extra: Partial<Parameters<typeof createBooking>[2]> = {}, actor = fx.A) =>
  createBooking(fx.db, actor, { quoteId: q.id, idempotencyKey: key(), acceptedSellMinor: sell, leadGuest: 'Ravi Kumar', guestNames: [['Ravi Kumar']], ...extra });

describe('authentication', () => {
  it('logs in, rejects bad passwords, and throttles', async () => {
    f = await setup();
    const ok = await login(f.db, 'A@Alpha.test ', 'correct horse battery');
    expect(ok.token.length).toBeGreaterThan(30);
    for (let i = 0; i < 5; i++) await expect(login(f.db, 'a@alpha.test', 'wrong')).rejects.toThrow(/incorrect/);
    await expect(login(f.db, 'a@alpha.test', 'correct horse battery')).rejects.toThrow(/Too many/);
    // Sessions store only a hash of the token
    const rows = await f.db.select().from(schema.sessions);
    expect(rows[0].id).not.toBe(ok.token);
  });
  it('registers agencies as pending; pending agencies cannot book', async () => {
    f = await setup();
    const pdf = { name: 'pan.pdf', type: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.4 test') };
    const { agency } = await registerAgency(f.db, { agencyName: 'New Co', country: 'India', billingCurrency: 'EUR', name: 'Nadia', email: 'n@new.test', password: 'long enough pw', pan: 'aaapz1234c' }, { panCard: pdf });
    expect(agency.pan).toBe('AAAPZ1234C');
    expect(agency.status).toBe('pending');
    expect(agency.creditEnabled).toBe(false);
    await expect(registerAgency(f.db, { agencyName: 'Other Co', country: 'India', billingCurrency: 'EUR', name: 'Nadia', email: 'n@new.test', password: 'long enough pw', pan: 'AAAPZ1234C' }, { panCard: pdf })).rejects.toThrow(/already exists/);
    const s = stay(f.today);
    const { results } = await searchHotels(f.db, f.P, { city: 'Paris', ...s, rooms: [{ adults: 2, childAges: [] }] });
    const o = results[0].offers.find((x) => x.supplier === 'contracted')!;
    const q = await createQuote(f.db, f.P, { offerKey: o.offerKey, hotelId: f.hotel.id, ...s, rooms: [{ adults: 2, childAges: [] }] });
    await expect(book(f, q, o.price.sellMinor, {}, f.P)).rejects.toThrow(/verification/);
  });
});

describe('search and quotes', () => {
  it('preserves mixed room configurations through search, quote and booking', async () => {
    f = await setup();
    const rooms = [{ adults: 2, childAges: [] }, { adults: 2, childAges: [] }, { adults: 1, childAges: [] }];
    const { q, snap } = await quoteFor(f, rooms);
    expect(q.rooms).toEqual(rooms);
    expect(snap.offer.rooms.map((r) => r.totalMinor)).toEqual([24_000, 24_000, 20_000]);
    const res = await createBooking(f.db, f.A, { quoteId: q.id, idempotencyKey: key(), acceptedSellMinor: snap.priced.price.sellMinor, leadGuest: 'Lead', guestNames: [['A'], ['B'], ['C']] });
    expect(res.kind).toBe('created');
    if (res.kind !== 'created') return;
    expect(res.booking.rooms.map((r) => r.adults)).toEqual([2, 2, 1]);
    expect(res.booking.sellMinor).toBe(snap.priced.price.sellMinor);
  });
  it('quotes are tenant-scoped', async () => {
    f = await setup();
    const { q } = await quoteFor(f);
    await expect(getQuote(f.db, f.B, q.id)).rejects.toThrow(/not found/);
  });
  it('shows a simulated sandbox offer outside production, clearly flagged', async () => {
    f = await setup();
    await f.db.update(schema.hotels).set({ isSample: true });
    const { results } = await searchHotels(f.db, f.A, { city: 'Paris', ...stay(f.today), rooms: [{ adults: 2, childAges: [] }] });
    const sbx = results[0].offers.find((o) => o.supplier === 'sandbox');
    expect(sbx?.simulated).toBe(true);
  });
});

describe('booking lifecycle', () => {
  it('prepay: holds allotment, awaits payment, confirms on payment, and posts the ledger', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    expect(r.booking.status).toBe('awaiting_payment');
    expect(r.booking.paymentStatus).toBe('due');
    const [a] = await f.db.select().from(schema.allocations).where(and(eq(schema.allocations.roomTypeId, f.dbl.id), eq(schema.allocations.night, stay(f.today).checkIn)));
    expect(a.sold).toBe(1);
    const paid = await recordPayment(f.db, f.ADMIN, r.booking.id, { amountMinor: r.booking.sellMinor, reference: 'BANK-1' });
    expect(paid.status).toBe('confirmed');
    expect(paid.paymentStatus).toBe('paid');
    const bal = await balances(f.db, paid.id);
    expect(bal.agentBalance).toBe(0);
    expect(bal.supplierBalance).toBe(paid.supplierCostMinor);
    const invoices = await f.db.select().from(schema.invoices);
    expect(invoices).toHaveLength(1);
  });

  it('credit: only when finance enabled it, within the limit', async () => {
    f = await setup();
    await expect(setAgencyCredit(f.db, f.A, f.agencyA.id, { enabled: true, limitMinor: 1, termsDays: 30, note: 'self-approval' })).rejects.toThrow();
    await setAgencyCredit(f.db, f.ADMIN, f.agencyA.id, { enabled: true, limitMinor: 100_000, termsDays: 14, note: 'Approved by finance after trade references' });
    const { q, snap } = await quoteFor(f);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    expect(r.booking.status).toBe('confirmed');
    expect(r.booking.paymentArrangement).toBe('credit');
    // Over the limit: falls back to prepay rather than extending credit.
    await setAgencyCredit(f.db, f.ADMIN, f.agencyA.id, { enabled: true, limitMinor: 30_000, termsDays: 14, note: 'Reduced limit' });
    const second = await quoteFor(f);
    const r2 = await book(f, second.q, second.snap.priced.price.sellMinor);
    if (r2.kind !== 'created') throw new Error(r2.kind);
    expect(r2.booking.paymentArrangement).toBe('prepay');
  });

  it('a double submission creates exactly one booking', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f);
    const k = key();
    const input = { quoteId: q.id, idempotencyKey: k, acceptedSellMinor: snap.priced.price.sellMinor, leadGuest: 'Ravi', guestNames: [['Ravi']] };
    const [r1, r2] = await Promise.all([createBooking(f.db, f.A, input), createBooking(f.db, f.A, input)]);
    const r3 = await createBooking(f.db, f.A, input);
    const ids = [r1, r2, r3].map((r) => ('booking' in r ? r.booking.id : null));
    expect(new Set(ids).size).toBe(1);
    expect(r3.kind).toBe('existing');
    const [{ n }] = await f.db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings);
    expect(n).toBe(1);
    const [a] = await f.db.select().from(schema.allocations).where(and(eq(schema.allocations.roomTypeId, f.dbl.id), eq(schema.allocations.night, stay(f.today).checkIn)));
    expect(a.sold).toBe(1);
  });

  it('never silently changes the price', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f);
    await f.db.update(schema.ratePeriods).set({ price2Minor: 13_000 }).where(eq(schema.ratePeriods.roomTypeId, f.dbl.id));
    const r = await book(f, q, snap.priced.price.sellMinor);
    expect(r.kind).toBe('price_changed');
    if (r.kind !== 'price_changed') return;
    expect(r.newSellMinor).toBeGreaterThan(r.oldSellMinor);
    const [{ n }] = await f.db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings);
    expect(n).toBe(0);
    const ok = await book(f, { id: r.quoteId }, r.newSellMinor);
    expect(ok.kind).toBe('created');
  });

  it('explains when availability disappears', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f);
    await f.db.insert(schema.restrictions).values({ contractId: f.contract.id, kind: 'stop_sell', dateFrom: stay(f.today).checkIn, dateTo: stay(f.today).checkIn, roomTypeId: null });
    const r = await book(f, q, snap.priced.price.sellMinor);
    expect(r).toMatchObject({ kind: 'unavailable' });
  });

  it('on request: pending until the hotel confirms; partner sees cost, never our selling price', async () => {
    f = await setup({ confirmationMode: 'on_request' });
    const { q, snap } = await quoteFor(f);
    expect(snap.offer.availability).toBe('on_request');
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    expect(r.booking.status).toBe('pending_confirmation');
    expect((await balances(f.db, r.booking.id)).hasCharge).toBe(false);
    const list = await listForPartner(f.db, f.PARTNER);
    expect(list).toHaveLength(1);
    expect(Object.keys(list[0])).not.toContain('sellMinor');
    expect(Object.keys(list[0])).not.toContain('netRevenueMinor');
    await expect(hotelRespond(f.db, f.B, r.booking.id, { accept: true, confirmation: 'X' })).rejects.toThrow(/not found/);
    const c = await hotelRespond(f.db, f.PARTNER, r.booking.id, { accept: true, confirmation: 'HTL-778' });
    expect(c.status).toBe('awaiting_payment');
    expect(c.hotelConfirmation).toBe('HTL-778');
  });

  it('on request: the hotel has 48 hours (per contract); unanswered requests lapse with no charge', async () => {
    f = await setup({ confirmationMode: 'on_request' });
    const { q, snap } = await quoteFor(f);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    const hours = (r.booking.hotelRespondBy!.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47.9);
    expect(hours).toBeLessThanOrEqual(48);
    // Nothing lapses inside the window.
    expect(await lapseUnansweredRequests(f.db)).toEqual([]);
    // The hotel cannot confirm once its window has closed: the request lapses instead.
    const late = new Date(Date.now() - 60_000);
    await f.db.update(schema.bookings).set({ hotelRespondBy: late }).where(eq(schema.bookings.id, r.booking.id));
    await expect(hotelRespond(f.db, f.PARTNER, r.booking.id, { accept: true, confirmation: 'LATE-1' })).rejects.toThrow(/lapsed/);
    const [lapsed] = await f.db.select().from(schema.bookings).where(eq(schema.bookings.id, r.booking.id));
    expect(lapsed.status).toBe('declined');
    expect((await balances(f.db, r.booking.id)).hasCharge).toBe(false);
    expect(await f.db.select().from(schema.ledgerEntries)).toEqual([]);

    // A contract can set a shorter window; the housekeeping run lapses it.
    await f.db.update(schema.contracts).set({ responseHours: 12 });
    const { q: q2, snap: s2 } = await quoteFor(f, undefined, 20);
    const r2 = await book(f, q2, s2.priced.price.sellMinor);
    if (r2.kind !== 'created') throw new Error(r2.kind);
    expect(Math.round((r2.booking.hotelRespondBy!.getTime() - Date.now()) / 3_600_000)).toBe(12);
    expect(await lapseUnansweredRequests(f.db, new Date(Date.now() + 13 * 3_600_000))).toEqual([r2.booking.reference]);
  });

  it('timeout -> outcome unknown -> reconciled, never rebooked', async () => {
    f = await setup();
    await f.db.update(schema.hotels).set({ isSample: true });
    const { q, snap } = await quoteFor(f, undefined, 10, 2, 'sandbox');
    const r = await book(f, q, snap.priced.price.sellMinor, { leadGuest: 'TEST TIMEOUT' });
    if (r.kind !== 'created') throw new Error(r.kind);
    // sandbox can't hold -> prepay is not submitted until paid
    expect(r.booking.status).toBe('awaiting_payment');
    const after = await recordPayment(f.db, f.ADMIN, r.booking.id, { amountMinor: r.booking.sellMinor, reference: 'BANK-2' });
    expect(after.status).toBe('outcome_unknown');
    const calls = await f.db.select().from(schema.supplierCalls).where(eq(schema.supplierCalls.operation, 'book'));
    expect(calls).toHaveLength(1); // no retry
    expect(JSON.stringify(calls[0].request)).not.toContain('TEST TIMEOUT'); // guest name redacted
    const issues = await operationalIssues(f.db);
    expect(issues.some((i) => i.title.includes('outcome unknown'))).toBe(true);
    const rec = await reconcileBooking(f.db, f.ADMIN, r.booking.id);
    expect(rec.status).toBe('confirmed');
    expect(rec.supplierRef).toMatch(/^SBX-/);
  });

  it('supplier rejection fails cleanly with no charge', async () => {
    f = await setup();
    await f.db.update(schema.hotels).set({ isSample: true });
    await setAgencyCredit(f.db, f.ADMIN, f.agencyA.id, { enabled: true, limitMinor: 1_000_000, termsDays: 14, note: 'Approved for test' });
    const { q, snap } = await quoteFor(f, undefined, 10, 2, 'sandbox');
    const r = await book(f, q, snap.priced.price.sellMinor, { leadGuest: 'TEST REJECT' });
    if (r.kind !== 'created') throw new Error(r.kind);
    expect(r.booking.status).toBe('failed');
    expect((await balances(f.db, r.booking.id)).hasCharge).toBe(false);
  });

  it('cancellation: free cancellation is automatic and releases allotment; late needs ops and charges the penalty', async () => {
    f = await setup();
    await setAgencyCredit(f.db, f.ADMIN, f.agencyA.id, { enabled: true, limitMinor: 1_000_000, termsDays: 14, note: 'Approved for test' });
    const early = await quoteFor(f, undefined, 20);
    const r = await book(f, early.q, early.snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    const c = await requestCancellation(f.db, f.A, r.booking.id, 'Client changed plans');
    expect(c.status).toBe('cancelled');
    expect((await balances(f.db, c.id)).agentBalance).toBe(0);
    const [a] = await f.db.select().from(schema.allocations).where(and(eq(schema.allocations.roomTypeId, f.dbl.id), eq(schema.allocations.night, stay(f.today, 20).checkIn)));
    expect(a.sold).toBe(0);
    expect((await f.db.select().from(schema.invoices).where(eq(schema.invoices.kind, 'credit_note')))).toHaveLength(1);

    const late = await quoteFor(f, undefined, 2, 2);
    const r2 = await book(f, late.q, late.snap.priced.price.sellMinor);
    if (r2.kind !== 'created') throw new Error(r2.kind);
    const req = await requestCancellation(f.db, f.A, r2.booking.id, '');
    expect(req.status).toBe('cancellation_requested');
    await expect(processCancellation(f.db, f.A, r2.booking.id)).rejects.toThrow();
    const done = await processCancellation(f.db, f.ADMIN, r2.booking.id);
    expect(done.status).toBe('cancelled');
    const bal = await balances(f.db, done.id);
    expect(bal.agentBalance).toBeGreaterThan(0); // first-night penalty owed
    expect(bal.agentBalance).toBeLessThan(r2.booking.sellMinor);
  });

  it('free cancellation of a paid booking returns 100% to the agency wallet, which pays the next booking', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f, undefined, 20);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    await recordPayment(f.db, f.ADMIN, r.booking.id, { amountMinor: r.booking.sellMinor, reference: 'BANK-3' });
    const c = await requestCancellation(f.db, f.A, r.booking.id, '');
    expect(c.status).toBe('cancelled');
    expect(c.paymentStatus).toBe('credited');
    expect((await balances(f.db, c.id)).agentBalance).toBe(0);
    expect(await walletBalance(f.db, f.agencyA.id, 'EUR')).toBe(r.booking.sellMinor); // every cent back
    expect(await walletBalance(f.db, f.agencyB.id, 'EUR')).toBe(0);

    // The next booking is paid from the wallet and confirmed.
    const { q: q2, snap: s2 } = await quoteFor(f, undefined, 30);
    const r2 = await book(f, q2, s2.priced.price.sellMinor);
    if (r2.kind !== 'created') throw new Error(r2.kind);
    await expect(payFromWallet(f.db, f.B, r2.booking.id)).rejects.toThrow(/not found/);
    const paid = await payFromWallet(f.db, f.A, r2.booking.id);
    expect(paid.paid).toBe(Math.min(r.booking.sellMinor, r2.booking.sellMinor));
    if (r2.booking.sellMinor <= r.booking.sellMinor) expect(paid.booking.status).toBe('confirmed');
    const left = await walletBalance(f.db, f.agencyA.id, 'EUR');
    expect(left).toBe(Math.max(0, r.booking.sellMinor - r2.booking.sellMinor));

    // Finance can pay the rest out to the bank, never more than the wallet holds.
    if (left > 0) {
      await expect(recordWalletPayout(f.db, f.ADMIN, f.agencyA.id, { amountMinor: left + 1, currency: 'EUR', reference: 'NEFT-1' })).rejects.toThrow(/more than the wallet/);
      await expect(recordWalletPayout(f.db, f.A, f.agencyA.id, { amountMinor: left, currency: 'EUR', reference: 'NEFT-1' })).rejects.toThrow();
      await recordWalletPayout(f.db, f.ADMIN, f.agencyA.id, { amountMinor: left, currency: 'EUR', reference: 'NEFT-1' });
      expect(await walletBalance(f.db, f.agencyA.id, 'EUR')).toBe(0);
    }
  });

  it('a late cancellation credits the wallet with everything except the hotel penalty', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f, undefined, 2, 2); // inside the 3-day penalty window
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    await recordPayment(f.db, f.ADMIN, r.booking.id, { amountMinor: r.booking.sellMinor, reference: 'BANK-4' });
    const pen = penaltyFor(r.booking);
    expect(pen.free).toBe(false);
    await requestCancellation(f.db, f.A, r.booking.id, 'client ill');
    const c = await processCancellation(f.db, f.ADMIN, r.booking.id);
    expect(c.paymentStatus).toBe('credited');
    expect(await walletBalance(f.db, f.agencyA.id, 'EUR')).toBe(r.booking.sellMinor - pen.sellPenaltyMinor);
  });

  it('expires unpaid holds and releases the rooms', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    const expired = await expireUnpaidHolds(f.db, new Date(Date.now() + 49 * 3_600_000));
    expect(expired).toEqual([r.booking.reference]);
    const b = await getBookingForActor(f.db, f.A, r.booking.id);
    expect(b.status).toBe('cancelled');
    expect((await balances(f.db, b.id)).agentBalance).toBe(0);
  });

  it('commissionable pay-at-hotel books with commission receivable, nothing charged to the agent', async () => {
    f = await setup({ rateBasis: 'commissionable', collection: 'pay_direct_to_hotel' });
    const { q, snap } = await quoteFor(f);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    expect(r.booking.status).toBe('confirmed');
    expect(r.booking.paymentStatus).toBe('direct');
    const bal = await balances(f.db, r.booking.id);
    expect(bal.hasCharge).toBe(false);
    expect(bal.commissionBalance).toBe(r.booking.commissionReceivableMinor);
  });
});

describe('tenant isolation', () => {
  it('agents cannot read or act on another agency\'s bookings', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    await expect(getBookingForActor(f.db, f.B, r.booking.id)).rejects.toThrow(/not found/);
    await expect(requestCancellation(f.db, f.B, r.booking.id, '')).rejects.toThrow(/not found/);
    expect(await listBookingsForActor(f.db, f.B)).toHaveLength(0);
    expect(await listBookingsForActor(f.db, f.A)).toHaveLength(1);
    await expect(recordPayment(f.db, f.A, r.booking.id, { amountMinor: 1, reference: 'self' })).rejects.toThrow();
    // A partner of another hotel sees nothing.
    expect(await listForPartner(f.db, { ...f.PARTNER, partnerHotelId: crypto.randomUUID() })).toHaveLength(0);
  });
});

describe('ledger integrity', () => {
  it('refuses to edit or delete financial history', async () => {
    f = await setup();
    const { q, snap } = await quoteFor(f);
    await book(f, q, snap.priced.price.sellMinor);
    await expect(f.db.update(schema.ledgerEntries).set({ amountMinor: 1 })).rejects.toThrow();
    await expect(f.db.delete(schema.ledgerEntries)).rejects.toThrow();
    await expect(f.db.delete(schema.invoices)).rejects.toThrow();
  });
});

describe('contracts', () => {
  it('cannot be activated without distribution permission and rates; overlapping rates are refused', async () => {
    f = await setup();
    const c = await createContract(f.db, f.ADMIN, f.hotel.id, {
      reference: 'C-2', inventoryModel: 'direct_net', rateBasis: 'net', collectionModel: 'prepaid_to_hb', currency: 'EUR',
      validFrom: f.today, validTo: addDays(f.today, 100), commissionBps: 0, taxMode: 'included', taxBps: 1000, localTaxMinor: 0,
      confirmationMode: 'on_request', freeCancelDays: 2, latePenaltyType: 'first_night', latePenaltyBps: 0, nonRefundable: false, distributionPermitted: false,
    });
    await expect(setContractStatus(f.db, f.ADMIN, c.id, 'active')).rejects.toThrow(/distribution.*rates/);
    const rate = { roomTypeId: f.dbl.id, mealPlan: 'RO' as const, dateFrom: f.today, dateTo: addDays(f.today, 50), price1Minor: 8_000, price2Minor: 9_000, price3Minor: null, childMinor: null, minStay: 1, releaseDays: 0 };
    await addRatePeriod(f.db, f.ADMIN, c.id, rate);
    await expect(addRatePeriod(f.db, f.ADMIN, c.id, { ...rate, dateFrom: addDays(f.today, 40), dateTo: addDays(f.today, 60) })).rejects.toThrow(/already cover/);
    await expect(addRatePeriod(f.db, f.A, c.id, rate)).rejects.toThrow();
    await expect(createContract(f.db, f.ADMIN, f.hotel.id, {
      reference: 'C-3', inventoryModel: 'direct_net', rateBasis: 'net', collectionModel: 'pay_direct_to_hotel', currency: 'EUR',
      validFrom: f.today, validTo: addDays(f.today, 100), commissionBps: 0, taxMode: 'included', taxBps: 0, localTaxMinor: 0,
      confirmationMode: 'on_request', freeCancelDays: 2, latePenaltyType: 'first_night', latePenaltyBps: 0, nonRefundable: false, distributionPermitted: true,
    })).rejects.toThrow(/prepaid/);
  });
  it('imports a rate sheet only when every line is valid', async () => {
    f = await setup();
    const from = addDays(f.today, 200);
    const to = addDays(f.today, 250);
    const bad = `room_type,meal_plan,from,to,single,double,triple,child,min_stay,release\nDouble,HB,${from},${to},90,110,,20,2,7\nPenthouse,BB,${from},${to},1,2,,,1,0`;
    const parsed = await parseRateSheet(f.db, f.contract.id, bad);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors[0]).toMatch(/unknown room type/);
    await expect(importRateSheet(f.db, f.ADMIN, f.contract.id, bad)).rejects.toThrow(/Nothing imported/);
    expect(await importRateSheet(f.db, f.ADMIN, f.contract.id, bad.split('\n').slice(0, 2).join('\n'))).toBe(1);
  });
});

describe('group desk', () => {
  it('runs enquiry -> hotel requests -> offers -> proposal -> acceptance, hiding costs from the agent', async () => {
    f = await setup();
    const leg = { city: 'Paris', checkIn: addDays(f.today, 60), checkOut: addDays(f.today, 63) };
    await expect(createEnquiry(f.db, f.A, {
      groupName: 'Sharma wedding', groupType: 'wedding', legs: [leg], totalPax: 40, rooms: { single: 0, double: 10, twin: 0, triple: 0 },
      currency: 'EUR', coachParking: true, quoteNeededBy: addDays(f.today, 10),
    })).rejects.toThrow(/sleep 20/);
    const e = await createEnquiry(f.db, f.A, {
      groupName: 'Sharma wedding', groupType: 'wedding', legs: [leg], totalPax: 40, rooms: { single: 0, double: 20, twin: 0, triple: 0 },
      currency: 'EUR', coachParking: true, mealPlan: 'BB', quoteNeededBy: addDays(f.today, 10),
    });
    expect(e.reference).toMatch(/^GRP-\d{4}-0001$/);
    await expect(getEnquiry(f.db, f.B, e.id)).rejects.toThrow(/not found/);

    await generateHotelRequests(f.db, f.ADMIN, e.id, { hotelIds: [f.hotel.id], manual: [{ name: 'Hotel Other', city: 'Paris' }], respondBy: addDays(f.today, 5) });
    const staffView = await getEnquiry(f.db, f.ADMIN, e.id);
    expect(staffView.requests).toHaveLength(2);
    expect(staffView.requests[0].status).toBe('generated'); // not "sent" until a human says so
    expect(staffView.requests[0].body).toContain('Coach parking');
    await markRequestSent(f.db, f.ADMIN, staffView.requests[0].id);

    const o = await recordOffer(f.db, f.ADMIN, e.id, { requestId: staffView.requests[0].id, hotelName: 'Hotel Test Centre', city: 'Paris', currency: 'EUR', lines: [{ roomType: 'Double', rooms: 20, nights: 3, rateMinor: 11_000 }], validUntil: addDays(f.today, 20) });
    expect(o.costTotalMinor).toBe(660_000);
    await expect(buildProposal(f.db, f.ADMIN, e.id, { offerIds: [o.id], markupBps: 1000, validUntil: addDays(f.today, 30) })).rejects.toThrow(/expires/);
    const p = await buildProposal(f.db, f.ADMIN, e.id, { offerIds: [o.id], markupBps: 1000, validUntil: addDays(f.today, 15) });
    expect(p.sellMinor).toBe(726_000);

    await sendProposal(f.db, f.ADMIN, p.proposal.id);
    const agentView = await getEnquiry(f.db, f.A, e.id);
    expect(agentView.requests).toHaveLength(0);
    expect(agentView.proposals[0].costTotalMinor).toBe(0);
    expect(agentView.offers[0].lines).toHaveLength(0);
    expect(agentView.messages.every((m) => m.visibility === 'shared')).toBe(true);

    await decideProposal(f.db, f.A, p.proposal.id, true);
    const done = await getEnquiry(f.db, f.ADMIN, e.id);
    expect(done.enquiry.status).toBe('won');
  });
});

describe('founder metrics', () => {
  it('reports real activity per currency and separates created from realised', async () => {
    f = await setup();
    const empty = await founderMetrics(f.db);
    expect(empty.perCurrency).toHaveLength(0);
    const { q, snap } = await quoteFor(f);
    const r = await book(f, q, snap.priced.price.sellMinor);
    if (r.kind !== 'created') throw new Error(r.kind);
    let m = await founderMetrics(f.db);
    expect(m.bookings.created).toBe(1);
    expect(m.bookings.realised).toBe(0); // awaiting payment is not realised
    await recordPayment(f.db, f.ADMIN, r.booking.id, { amountMinor: r.booking.sellMinor, reference: 'BANK-4' });
    m = await founderMetrics(f.db);
    expect(m.bookings.realised).toBe(1);
    expect(m.perCurrency[0]).toMatchObject({ currency: 'EUR', gbv: r.booking.sellMinor, netRevenue: r.booking.netRevenueMinor, roomNights: 2 });
  });
});
