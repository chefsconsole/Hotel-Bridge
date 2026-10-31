/* ------------------------------------------------------------------ *
 * The agency's own clients and trips (packages).
 *
 *  - Everything is scoped to the actor's agency; another agency's client,
 *    trip or item is "not found".
 *  - Hotels are added from a live offer: the price is re-checked with the
 *    supplier (a quote) and the HotelBridge net is stored next to the
 *    client price the agent sets.
 *  - "Book all hotels" books each unbooked hotel through the normal booking
 *    lifecycle with a key derived from the item, so a double click or a
 *    retry never makes a second reservation. A changed price is never
 *    accepted silently: the item is updated and the agent books again.
 *  - Client payments are the agency's records, not HotelBridge's ledger.
 * ------------------------------------------------------------------ */
import { and, asc, desc, eq, ilike, inArray, lte, notInArray, or } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { TRIP_ITEM_KINDS, type RoomRequest } from '@/lib/db/schema';
import { isIsoDate, todayIso } from '@/lib/domain/dates';
import { formatMoney, isCurrency, parseMoney } from '@/lib/domain/money';
import { roomsSchema } from '@/lib/domain/occupancy';
import { tripTotals, type TripTotals } from '@/lib/domain/trip';
import { MEAL_PLANS } from './catalog';
import { agencyOf, type Actor } from './actor';
import { audit } from './audit';
import { randomCode } from './counters';
import { AppError, NotFoundError, isUniqueViolation } from './errors';
import { createBooking } from './bookings';
import { createQuote, type QuoteSnapshot } from './search';

const { clients, trips, tripItems, tripPayments, bookings, hotels, agencies } = schema;
type Trip = typeof trips.$inferSelect;
type Item = typeof tripItems.$inferSelect;

export const TRIP_STATUSES = ['enquiry', 'quoted', 'booked', 'completed', 'cancelled'] as const;
export const TRIP_STATUS_LABEL: Record<string, string> = {
  enquiry: 'New enquiry', quoted: 'Proposal sent', booked: 'Booked', completed: 'Travelled', cancelled: 'Cancelled',
};
export const TRIP_STATUS_TONE: Record<string, 'neutral' | 'info' | 'positive' | 'pending' | 'negative'> = {
  enquiry: 'pending', quoted: 'info', booked: 'positive', completed: 'neutral', cancelled: 'negative',
};
export const ITEM_KIND_LABEL: Record<string, string> = {
  hotel: 'Hotel', flight: 'Flights', visa: 'Visa', transfer: 'Transfers', activity: 'Activities & tours', insurance: 'Insurance', other: 'Other',
};
export const LEAD_SOURCES = { whatsapp: 'WhatsApp', instagram: 'Instagram / Facebook', referral: 'Referral', repeat: 'Repeat client', walk_in: 'Walk-in / call', website: 'Website', other: 'Other' } as const;
export const PAYMENT_METHODS = { upi: 'UPI', bank: 'Bank transfer', card: 'Card', cash: 'Cash', other: 'Other' } as const;
/** Bookings that no longer hold a room: the hotel can be booked again. */
const DEAD = ['cancelled', 'declined', 'failed'];

const optDate = z.string().optional().nullable().transform((v) => v || null).refine((v) => v == null || isIsoDate(v), 'Use a valid date');
const optText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

/** "12,500" in the trip currency -> minor units; empty -> null. */
function amount(raw: string | null | undefined, currency: string, what: string): number | null {
  if (raw == null || String(raw).trim() === '') return null;
  let v: number;
  try { v = parseMoney(String(raw), currency); } catch { throw new AppError(`${what}: enter an amount, e.g. 12500 or 12500.50`); }
  if (v < 0) throw new AppError(`${what} cannot be negative`);
  return v;
}

/* ------------------------------ clients ------------------------------ */

export const clientSchema = z.object({
  name: z.string().trim().min(2, 'Client name is required').max(120),
  phone: optText(40),
  email: optText(160).refine((v) => v == null || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
  city: optText(80),
  notes: optText(1000),
});

export async function createClient(db: DB, actor: Actor, input: z.input<typeof clientSchema>) {
  const agencyId = agencyOf(actor);
  const data = clientSchema.parse(input);
  const [c] = await db.insert(clients).values({ ...data, agencyId, createdBy: actor.userId }).returning();
  return c;
}

export async function updateClient(db: DB, actor: Actor, id: string, input: z.input<typeof clientSchema>) {
  const c = await getClient(db, actor, id);
  const data = clientSchema.parse(input);
  const [u] = await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, c.id)).returning();
  return u;
}

export async function getClient(db: DB, actor: Actor, id: string) {
  const agencyId = agencyOf(actor);
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Client');
  const [c] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.agencyId, agencyId)));
  if (!c) throw new NotFoundError('Client');
  return c;
}

export async function listClients(db: DB, actor: Actor, q?: string) {
  const agencyId = agencyOf(actor);
  const term = q?.trim();
  return db.select().from(clients)
    .where(and(eq(clients.agencyId, agencyId), term ? or(ilike(clients.name, `%${term}%`), ilike(clients.phone, `%${term}%`), ilike(clients.email, `%${term}%`)) : undefined))
    .orderBy(asc(clients.name));
}

/* ------------------------------ trips ------------------------------ */

export const tripSchema = z.object({
  title: z.string().trim().min(2, 'Give the trip a name, e.g. "Mehta family · Thailand"').max(140),
  currency: z.string().refine(isCurrency, 'Choose a currency'),
  startDate: optDate,
  endDate: optDate,
  adults: z.coerce.number().int().min(1).max(500).default(2),
  children: z.coerce.number().int().min(0).max(500).default(0),
  balanceDueOn: optDate,
  source: z.string().optional().nullable().transform((v) => (v && v in LEAD_SOURCES ? v : null)),
  followUpOn: optDate,
  followUpNote: optText(200),
  notes: optText(2000),
  clientNote: optText(2000),
}).superRefine((v, ctx) => {
  if (v.startDate && v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: 'custom', message: 'The trip cannot end before it starts', path: ['endDate'] });
});

export async function createTrip(db: DB, actor: Actor, input: z.input<typeof tripSchema> & { clientId?: string | null; newClient?: z.input<typeof clientSchema> | null }) {
  const agencyId = agencyOf(actor);
  const data = tripSchema.parse(input);
  const client = input.clientId ? await getClient(db, actor, input.clientId)
    : input.newClient ? await createClient(db, actor, input.newClient)
    : null;
  if (!client) throw new AppError('Choose a client or add a new one');
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [t] = await db.insert(trips).values({
        ...data, agencyId, clientId: client.id, reference: 'TR-' + randomCode(5),
        shareToken: randomCode(24), createdBy: actor.userId,
      }).returning();
      await audit(db, actor, 'trip.create', 'trip', t.id, { reference: t.reference });
      return t;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new AppError('Could not create the trip. Please try again.');
}

async function ownTrip(db: DB, actor: Actor, id: string): Promise<Trip> {
  const agencyId = agencyOf(actor);
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Trip');
  const [t] = await db.select().from(trips).where(and(eq(trips.id, id), eq(trips.agencyId, agencyId)));
  if (!t) throw new NotFoundError('Trip');
  return t;
}

async function ownItem(db: DB, actor: Actor, id: string): Promise<Item> {
  const agencyId = agencyOf(actor);
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Item');
  const [i] = await db.select().from(tripItems).where(and(eq(tripItems.id, id), eq(tripItems.agencyId, agencyId)));
  if (!i) throw new NotFoundError('Item');
  return i;
}

export async function updateTrip(db: DB, actor: Actor, id: string, input: z.input<typeof tripSchema>) {
  const t = await ownTrip(db, actor, id);
  const data = tripSchema.parse(input);
  if (data.currency !== t.currency) {
    const priced = await db.select({ id: tripItems.id }).from(tripItems).where(eq(tripItems.tripId, t.id));
    const paid = await db.select({ id: tripPayments.id }).from(tripPayments).where(eq(tripPayments.tripId, t.id));
    if (priced.length || paid.length) throw new AppError(`This trip already has prices in ${t.currency}. Its currency can't change.`);
  }
  const [u] = await db.update(trips).set({ ...data, updatedAt: new Date() }).where(eq(trips.id, t.id)).returning();
  return u;
}

export async function setTripStatus(db: DB, actor: Actor, id: string, status: string) {
  const t = await ownTrip(db, actor, id);
  if (!(TRIP_STATUSES as readonly string[]).includes(status)) throw new AppError('Unknown status');
  const [u] = await db.update(trips).set({ status, updatedAt: new Date() }).where(eq(trips.id, t.id)).returning();
  await audit(db, actor, 'trip.status', 'trip', t.id, { from: t.status, to: status });
  return u;
}

export async function setSharing(db: DB, actor: Actor, id: string, opts: { enabled?: boolean; showItemPrices?: boolean; rotate?: boolean }) {
  const t = await ownTrip(db, actor, id);
  const [u] = await db.update(trips).set({
    shareEnabled: opts.enabled ?? t.shareEnabled,
    showItemPrices: opts.showItemPrices ?? t.showItemPrices,
    shareToken: opts.rotate ? randomCode(24) : t.shareToken,
    updatedAt: new Date(),
  }).where(eq(trips.id, t.id)).returning();
  return u;
}

/** The agent's next action on a lead — the heart of a simple pipeline. */
export async function setFollowUp(db: DB, actor: Actor, id: string, input: { followUpOn?: string | null; followUpNote?: string | null }) {
  const t = await ownTrip(db, actor, id);
  const on = input.followUpOn || null;
  if (on && !isIsoDate(on)) throw new AppError('Choose a valid follow-up date');
  const [u] = await db.update(trips).set({ followUpOn: on, followUpNote: on ? (input.followUpNote?.trim() || null) : null, updatedAt: new Date() }).where(eq(trips.id, t.id)).returning();
  return u;
}

/** A copy to quote again: same client, lines and prices; no bookings, no payments. */
export async function duplicateTrip(db: DB, actor: Actor, id: string) {
  const { trip: t, items } = await getTrip(db, actor, id);
  const copy = await createTrip(db, actor, {
    title: `${t.title} (copy)`, currency: t.currency, startDate: t.startDate, endDate: t.endDate, adults: t.adults, children: t.children,
    source: t.source, notes: t.notes, clientNote: t.clientNote, clientId: t.clientId,
  });
  if (items.length) {
    await db.insert(tripItems).values(items.map((i) => ({
      tripId: copy.id, agencyId: copy.agencyId, kind: i.kind, title: i.title, details: i.details, startDate: i.startDate, endDate: i.endDate,
      clientPriceMinor: i.clientPriceMinor, costMinor: i.kind === 'hotel' ? i.netMinor : i.costMinor, costCurrency: i.kind === 'hotel' ? i.netCurrency : i.costCurrency,
      supplierName: i.supplierName, hotelId: i.hotelId, offerKey: i.offerKey, rooms: i.rooms, roomName: i.roomName, mealPlan: i.mealPlan,
      cancellation: i.cancellation, netMinor: i.netMinor, netCurrency: i.netCurrency, sortOrder: i.sortOrder,
      lastIssue: i.kind === 'hotel' ? 'Copied — the price is re-checked with the hotel when you book' : null,
    })));
  }
  return copy;
}

/** Leads whose follow-up is due today or earlier. */
export async function dueFollowUps(db: DB, actor: Actor) {
  const agencyId = agencyOf(actor);
  return db.select({ trip: trips, clientName: clients.name, clientPhone: clients.phone })
    .from(trips).innerJoin(clients, eq(clients.id, trips.clientId))
    .where(and(eq(trips.agencyId, agencyId), lte(trips.followUpOn, todayIso()), notInArray(trips.status, ['completed', 'cancelled'])))
    .orderBy(asc(trips.followUpOn));
}

/* ------------------------------ items ------------------------------ */

export async function addHotelToTrip(db: DB, actor: Actor, tripId: string, args: { offerKey: string; hotelId: string; checkIn: string; checkOut: string; rooms: RoomRequest[] }) {
  const t = await ownTrip(db, actor, tripId);
  const rooms = roomsSchema.parse(args.rooms);
  // Re-checks availability and price with the supplier, priced for this agency.
  const q = await createQuote(db, actor, { ...args, rooms });
  const snap = q.snapshot as QuoteSnapshot;
  const p = snap.priced;
  const net = p.price.sellMinor;
  const [last] = await db.select({ n: tripItems.sortOrder }).from(tripItems).where(eq(tripItems.tripId, t.id)).orderBy(desc(tripItems.sortOrder)).limit(1);
  const [item] = await db.insert(tripItems).values({
    tripId: t.id, agencyId: t.agencyId, kind: 'hotel',
    title: snap.hotelName, details: snap.city,
    startDate: q.checkIn, endDate: q.checkOut,
    // Same currency: start the client price at our price; the agent adds their margin.
    clientPriceMinor: p.price.currency === t.currency ? net : null,
    costMinor: net, costCurrency: p.price.currency,
    hotelId: q.hotelId, offerKey: q.offerKey, rooms,
    roomName: p.roomName, mealPlan: p.mealPlan, cancellation: p.cancellation,
    netMinor: net, netCurrency: p.price.currency,
    sortOrder: (last?.n ?? 0) + 1,
  }).returning();
  return item;
}

export const extraSchema = z.object({
  kind: z.enum(TRIP_ITEM_KINDS).refine((k) => k !== 'hotel', 'Hotels are added from search'),
  title: z.string().trim().min(2, 'Describe the item, e.g. "Delhi–Bangkok return flights"').max(160),
  details: optText(1000),
  startDate: optDate,
  endDate: optDate,
  supplierName: optText(120),
});

export async function addExtra(db: DB, actor: Actor, tripId: string, input: z.input<typeof extraSchema> & { clientPrice?: string | null; cost?: string | null; costCurrency?: string | null }) {
  const t = await ownTrip(db, actor, tripId);
  const data = extraSchema.parse(input);
  const costCurrency = input.costCurrency && isCurrency(input.costCurrency) ? input.costCurrency : t.currency;
  const [last] = await db.select({ n: tripItems.sortOrder }).from(tripItems).where(eq(tripItems.tripId, t.id)).orderBy(desc(tripItems.sortOrder)).limit(1);
  const cost = amount(input.cost, costCurrency, 'Your cost');
  const [item] = await db.insert(tripItems).values({
    ...data, tripId: t.id, agencyId: t.agencyId,
    clientPriceMinor: amount(input.clientPrice, t.currency, 'Client price'),
    costMinor: cost, costCurrency: cost == null ? null : costCurrency,
    sortOrder: (last?.n ?? 0) + 1,
  }).returning();
  return item;
}

/** The agent sets what the client pays (and, for extras, their own cost). */
export async function priceItem(db: DB, actor: Actor, itemId: string, input: { clientPrice?: string | null; cost?: string | null; costCurrency?: string | null }) {
  const item = await ownItem(db, actor, itemId);
  const t = await ownTrip(db, actor, item.tripId);
  const patch: Partial<typeof tripItems.$inferInsert> = { clientPriceMinor: amount(input.clientPrice, t.currency, 'Client price'), updatedAt: new Date() };
  if (item.kind !== 'hotel' && input.cost !== undefined) {
    const cc = input.costCurrency && isCurrency(input.costCurrency) ? input.costCurrency : t.currency;
    patch.costMinor = amount(input.cost, cc, 'Your cost');
    patch.costCurrency = patch.costMinor == null ? null : cc;
  }
  const [u] = await db.update(tripItems).set(patch).where(eq(tripItems.id, item.id)).returning();
  return u;
}

export async function removeItem(db: DB, actor: Actor, itemId: string) {
  const item = await ownItem(db, actor, itemId);
  if (item.bookingId) {
    const [b] = await db.select({ status: bookings.status, reference: bookings.reference }).from(bookings).where(eq(bookings.id, item.bookingId));
    if (b && !DEAD.includes(b.status)) throw new AppError(`This hotel is booked (${b.reference}). Cancel the booking first, then remove it from the trip.`);
  }
  await db.delete(tripItems).where(eq(tripItems.id, item.id));
}

/* --------------------------- book all hotels --------------------------- */

export type BookOutcome = { itemId: string; title: string; outcome: 'booked' | 'already_booked' | 'price_changed' | 'unavailable' | 'error'; message: string; bookingId?: string };

const compact = (uuid: string) => uuid.replace(/-/g, '');

export async function bookTripHotels(db: DB, actor: Actor, tripId: string, opts: { leadGuest?: string | null } = {}): Promise<BookOutcome[]> {
  const t = await ownTrip(db, actor, tripId);
  const [client] = await db.select().from(clients).where(eq(clients.id, t.clientId));
  const leadGuest = (opts.leadGuest?.trim() || client.name).slice(0, 120);
  const items = await db.select().from(tripItems).where(and(eq(tripItems.tripId, t.id), eq(tripItems.kind, 'hotel'))).orderBy(asc(tripItems.startDate), asc(tripItems.sortOrder));
  const linked = items.map((i) => i.bookingId).filter((x): x is string => !!x);
  const live = new Map((linked.length ? await db.select({ id: bookings.id, status: bookings.status, reference: bookings.reference }).from(bookings).where(inArray(bookings.id, linked)) : []).map((b) => [b.id, b]));

  const out: BookOutcome[] = [];
  for (const item of items) {
    const prev = item.bookingId ? live.get(item.bookingId) : undefined;
    if (prev && !DEAD.includes(prev.status)) { out.push({ itemId: item.id, title: item.title, outcome: 'already_booked', message: `Already booked (${prev.reference})`, bookingId: prev.id }); continue; }
    if (!item.offerKey || !item.hotelId || !item.startDate || !item.endDate || !item.rooms || item.netMinor == null) {
      out.push({ itemId: item.id, title: item.title, outcome: 'error', message: 'Missing stay details — remove it and add the hotel again from search' });
      continue;
    }
    const issue = async (outcome: BookOutcome['outcome'], message: string, patch: Partial<typeof tripItems.$inferInsert> = {}) => {
      await db.update(tripItems).set({ ...patch, lastIssue: message, updatedAt: new Date() }).where(eq(tripItems.id, item.id));
      out.push({ itemId: item.id, title: item.title, outcome, message });
    };
    try {
      // 1. Fresh price and availability.
      const q = await createQuote(db, actor, { offerKey: item.offerKey, hotelId: item.hotelId, checkIn: item.startDate, checkOut: item.endDate, rooms: item.rooms });
      const price = (q.snapshot as QuoteSnapshot).priced.price;
      if (price.sellMinor !== item.netMinor || price.currency !== item.netCurrency) {
        await issue('price_changed', `Price changed from ${formatMoney(item.netMinor, item.netCurrency ?? price.currency)} to ${formatMoney(price.sellMinor, price.currency)}. Check the client price, then book again.`,
          { netMinor: price.sellMinor, netCurrency: price.currency, costMinor: price.sellMinor, costCurrency: price.currency });
        continue;
      }
      // 2. Book. The key is fixed for this item, price and previous attempt: a retry finds the same booking.
      const idempotencyKey = `trip-${compact(item.id)}-${item.netMinor}-${item.bookingId ? compact(item.bookingId).slice(0, 8) : 'first'}`;
      const res = await createBooking(db, actor, {
        quoteId: q.id, idempotencyKey, acceptedSellMinor: price.sellMinor, leadGuest,
        guestNames: item.rooms.map((_, i) => (i === 0 ? [leadGuest] : [])), agentReference: t.reference, specialRequests: null,
      });
      if (res.kind === 'created' || res.kind === 'existing') {
        await db.update(tripItems).set({ bookingId: res.booking.id, lastIssue: null, costMinor: res.booking.sellMinor, costCurrency: res.booking.currency, updatedAt: new Date() }).where(eq(tripItems.id, item.id));
        out.push({ itemId: item.id, title: item.title, outcome: 'booked', message: `${res.booking.reference} · ${res.booking.status === 'confirmed' ? 'confirmed' : 'sent for confirmation'}`, bookingId: res.booking.id });
      } else if (res.kind === 'price_changed') {
        await issue('price_changed', `Price changed to ${formatMoney(res.newSellMinor, res.currency)}. Check the client price, then book again.`,
          { netMinor: res.newSellMinor, netCurrency: res.currency, costMinor: res.newSellMinor, costCurrency: res.currency });
      } else if (res.kind === 'unavailable') {
        await issue('unavailable', `No longer available: ${res.reason}`);
      }
    } catch (e) {
      // An unverified agency can't book anything: stop, don't mark every line.
      if (e instanceof AppError && e.code === 'not_verified') throw e;
      if (e instanceof AppError && e.code === 'unavailable') { await issue('unavailable', `No longer available: ${e.message}`); continue; }
      if (e instanceof AppError) { await issue('error', e.message); continue; }
      throw e;
    }
  }
  const booked = out.filter((o) => o.outcome === 'booked' || o.outcome === 'already_booked').length;
  if (items.length && booked === items.length && (t.status === 'enquiry' || t.status === 'quoted')) {
    await db.update(trips).set({ status: 'booked', updatedAt: new Date() }).where(eq(trips.id, t.id));
  }
  await audit(db, actor, 'trip.book_hotels', 'trip', t.id, { results: out.map((o) => ({ item: o.itemId, outcome: o.outcome })) });
  return out;
}

/* --------------------------- client payments --------------------------- */

export const paymentSchema = z.object({
  amount: z.string().min(1, 'Enter the amount received'),
  method: z.enum(Object.keys(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS]),
  receivedOn: z.string().refine(isIsoDate, 'Choose the date received'),
  reference: optText(80),
  note: optText(300),
});

export async function recordClientPayment(db: DB, actor: Actor, tripId: string, input: z.input<typeof paymentSchema>) {
  const t = await ownTrip(db, actor, tripId);
  const data = paymentSchema.parse(input);
  const amountMinor = amount(data.amount, t.currency, 'Amount');
  if (!amountMinor) throw new AppError('Amount must be more than zero');
  if (data.receivedOn > todayIso()) throw new AppError('A payment cannot be received in the future');
  const [p] = await db.insert(tripPayments).values({
    tripId: t.id, agencyId: t.agencyId, amountMinor, currency: t.currency, method: data.method,
    reference: data.reference, receivedOn: data.receivedOn, note: data.note, createdBy: actor.userId,
  }).returning();
  await audit(db, actor, 'trip.payment', 'trip', t.id, { amountMinor, currency: t.currency });
  return p;
}

export async function deleteClientPayment(db: DB, actor: Actor, paymentId: string) {
  const agencyId = agencyOf(actor);
  if (!z.string().uuid().safeParse(paymentId).success) throw new NotFoundError('Payment');
  const [p] = await db.select().from(tripPayments).where(and(eq(tripPayments.id, paymentId), eq(tripPayments.agencyId, agencyId)));
  if (!p) throw new NotFoundError('Payment');
  await db.delete(tripPayments).where(eq(tripPayments.id, p.id));
  await audit(db, actor, 'trip.payment_removed', 'trip', p.tripId, { amountMinor: p.amountMinor, currency: p.currency, receivedOn: p.receivedOn });
  return p;
}

/* ------------------------------ reading ------------------------------ */

export type TripItemView = Item & {
  booking: { id: string; reference: string; status: string; paymentStatus: string; hotelConfirmation: string | null; sellMinor: number; currency: string } | null;
};

function totalsFor(t: Trip, items: Item[], payments: { amountMinor: number }[]): TripTotals {
  return tripTotals(t.currency, items.map((i) => ({ kind: i.kind, clientPriceMinor: i.clientPriceMinor, costMinor: i.costMinor, costCurrency: i.costCurrency })),
    payments.reduce((s, p) => s + p.amountMinor, 0));
}

export async function getTrip(db: DB, actor: Actor, id: string) {
  const t = await ownTrip(db, actor, id);
  return loadTrip(db, t);
}

async function loadTrip(db: DB, t: Trip) {
  const [client] = await db.select().from(clients).where(eq(clients.id, t.clientId));
  const items = await db.select().from(tripItems).where(eq(tripItems.tripId, t.id)).orderBy(asc(tripItems.startDate), asc(tripItems.sortOrder));
  const payments = await db.select().from(tripPayments).where(eq(tripPayments.tripId, t.id)).orderBy(desc(tripPayments.receivedOn), desc(tripPayments.createdAt));
  const ids = items.map((i) => i.bookingId).filter((x): x is string => !!x);
  const bs = ids.length ? await db.select({
    id: bookings.id, reference: bookings.reference, status: bookings.status, paymentStatus: bookings.paymentStatus,
    hotelConfirmation: bookings.hotelConfirmation, sellMinor: bookings.sellMinor, currency: bookings.currency,
  }).from(bookings).where(inArray(bookings.id, ids)) : [];
  const byId = new Map(bs.map((b) => [b.id, b]));
  const views: TripItemView[] = items.map((i) => ({ ...i, booking: i.bookingId ? byId.get(i.bookingId) ?? null : null }));
  return { trip: t, client, items: views, payments, totals: totalsFor(t, items, payments) };
}

export async function listTrips(db: DB, actor: Actor, opts: { clientId?: string; status?: string } = {}) {
  const agencyId = agencyOf(actor);
  const rows = await db.select({ trip: trips, client: { id: clients.id, name: clients.name, phone: clients.phone } })
    .from(trips).innerJoin(clients, eq(clients.id, trips.clientId))
    .where(and(eq(trips.agencyId, agencyId), opts.clientId ? eq(trips.clientId, opts.clientId) : undefined, opts.status ? eq(trips.status, opts.status) : undefined))
    .orderBy(desc(trips.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.trip.id);
  const items = await db.select().from(tripItems).where(inArray(tripItems.tripId, ids));
  const pays = await db.select({ tripId: tripPayments.tripId, amountMinor: tripPayments.amountMinor }).from(tripPayments).where(inArray(tripPayments.tripId, ids));
  const today = todayIso();
  return rows.map((r) => {
    const totals = totalsFor(r.trip, items.filter((i) => i.tripId === r.trip.id), pays.filter((p) => p.tripId === r.trip.id));
    const overdue = !!r.trip.balanceDueOn && r.trip.balanceDueOn < today && totals.pendingMinor > 0 && r.trip.status !== 'cancelled';
    return { ...r, totals, overdue, hotels: items.filter((i) => i.tripId === r.trip.id && i.kind === 'hotel').length };
  });
}

/** Everything clients owe this agency, per currency — never added across currencies. */
export function receivables(list: Awaited<ReturnType<typeof listTrips>>) {
  const map = new Map<string, { pendingMinor: number; overdueMinor: number; trips: number }>();
  for (const r of list) {
    if (r.trip.status === 'cancelled' || r.totals.pendingMinor <= 0) continue;
    const m = map.get(r.trip.currency) ?? { pendingMinor: 0, overdueMinor: 0, trips: 0 };
    m.pendingMinor += r.totals.pendingMinor;
    if (r.overdue) m.overdueMinor += r.totals.pendingMinor;
    m.trips++;
    map.set(r.trip.currency, m);
  }
  return [...map.entries()].map(([currency, v]) => ({ currency, ...v }));
}

/* ------------------------------ the client's view ------------------------------ */

const CLIENT_STATUS: Record<string, string> = {
  confirmed: 'Confirmed', pending_confirmation: 'Being confirmed', submitting: 'Being confirmed', outcome_unknown: 'Being confirmed',
  awaiting_payment: 'Being confirmed', amendment_requested: 'Confirmed', cancellation_requested: 'Cancellation in progress', cancelled: 'Cancelled',
};

/** What a client sees from a shared link: the agency's brand, never HotelBridge,
 *  never net rates, costs or internal references. */
export async function sharedTrip(db: DB, token: string) {
  if (!/^[A-Z2-9]{24}$/.test(token)) return null;
  const [t] = await db.select().from(trips).where(and(eq(trips.shareToken, token), eq(trips.shareEnabled, true)));
  if (!t) return null;
  const data = await loadTrip(db, t);
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, t.agencyId));
  const hotelIds = data.items.map((i) => i.hotelId).filter((x): x is string => !!x);
  const hs = hotelIds.length ? await db.select({ id: hotels.id, address: hotels.address, starRating: hotels.starRating, starRatingVerified: hotels.starRatingVerified, isSample: hotels.isSample }).from(hotels).where(inArray(hotels.id, hotelIds)) : [];
  const hotelById = new Map(hs.map((h) => [h.id, h]));
  return {
    agency: {
      name: agency.brandName || agency.name, email: agency.brandEmail, phone: agency.brandPhone || agency.phone,
      website: agency.website, logoUrl: agency.logoUrl, footer: agency.brandFooter,
    },
    trip: {
      title: t.title, reference: t.reference, status: t.status, currency: t.currency, startDate: t.startDate, endDate: t.endDate,
      adults: t.adults, children: t.children, balanceDueOn: t.balanceDueOn, note: t.clientNote, showItemPrices: t.showItemPrices, updatedAt: t.updatedAt,
      approvedAt: t.clientApprovedAt,
    },
    clientName: data.client.name,
    items: data.items.map((i) => {
      const h = i.hotelId ? hotelById.get(i.hotelId) : undefined;
      return {
        id: i.id, kind: i.kind, title: i.title, details: i.details, startDate: i.startDate, endDate: i.endDate,
        roomName: i.roomName, mealPlan: i.mealPlan ? MEAL_PLANS[i.mealPlan as keyof typeof MEAL_PLANS] ?? i.mealPlan : null,
        rooms: i.rooms, cancellation: i.cancellation, priceMinor: i.clientPriceMinor,
        address: h?.address ?? null, stars: h?.starRatingVerified ? h.starRating : null, sample: h?.isSample ?? false,
        status: i.booking ? CLIENT_STATUS[i.booking.status] ?? null : null,
        confirmation: i.booking?.status === 'confirmed' ? i.booking.hotelConfirmation : null,
      };
    }),
    totals: { totalMinor: data.totals.totalMinor, receivedMinor: data.totals.receivedMinor, pendingMinor: data.totals.pendingMinor, unpriced: data.totals.unpricedLines },
  };
}

/** The client presses "Approve this plan" on the shared link. Recorded once;
 *  it books nothing — the agent still books and confirms. */
export async function approveSharedTrip(db: DB, token: string) {
  if (!/^[A-Z2-9]{24}$/.test(token)) return null;
  const [t] = await db.select().from(trips).where(and(eq(trips.shareToken, token), eq(trips.shareEnabled, true)));
  if (!t || t.status === 'cancelled') return null;
  if (t.clientApprovedAt) return t;
  const [u] = await db.update(trips).set({ clientApprovedAt: new Date(), updatedAt: new Date() }).where(eq(trips.id, t.id)).returning();
  await db.insert(schema.auditLog).values({ actorLabel: 'Client (shared link)', action: 'trip.client_approved', entity: 'trip', entityId: t.id, agencyId: t.agencyId });
  return u;
}

/* ------------------------------ branding ------------------------------ */

export const brandSchema = z.object({
  brandName: optText(120),
  brandEmail: optText(160).refine((v) => v == null || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
  brandPhone: optText(40),
  logoUrl: optText(500).refine((v) => v == null || /^https:\/\/\S+$/.test(v), 'Logo must be an https:// image link'),
  brandFooter: optText(600),
});

export async function updateBranding(db: DB, actor: Actor, input: z.input<typeof brandSchema>) {
  const agencyId = agencyOf(actor);
  const data = brandSchema.parse(input);
  const [a] = await db.update(agencies).set({ ...data, updatedAt: new Date() }).where(eq(agencies.id, agencyId)).returning();
  await audit(db, actor, 'agency.branding', 'agency', agencyId, data);
  return a;
}
