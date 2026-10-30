/* ------------------------------------------------------------------ *
 * DEVELOPMENT-ONLY simulated wholesaler. It exists so the multi-supplier
 * path, rate comparison and timeout reconciliation can be exercised before
 * any real supplier contract exists. It is never registered in production
 * and every offer it makes is labelled as simulated in the UI.
 *
 * Only serves hotels flagged is_sample. Test switches via the lead guest:
 *   "TEST TIMEOUT" -> reservation is created, then the response is "lost"
 *   "TEST REJECT"  -> supplier rejects (sold out)
 * Price drift for revalidation tests: settings key sandbox.priceDriftBps.
 * ------------------------------------------------------------------ */
import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { nightsOf } from '@/lib/domain/dates';
import { applyBps } from '@/lib/domain/money';
import {
  SupplierRejectedError, SupplierTimeoutError, type SearchRequest, type SupplierAdapter, type SupplierContext, type SupplierOffer,
} from './types';

const { hotels, sandboxReservations, settings } = schema;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

async function drift(ctx: SupplierContext): Promise<number> {
  const [row] = await ctx.db.select().from(settings).where(eq(settings.key, 'sandbox.priceDriftBps'));
  return typeof row?.value === 'number' ? row.value : 0;
}

function makeOffer(hotelId: string, req: SearchRequest, driftBps: number): SupplierOffer | null {
  const nights = nightsOf(req.checkIn, req.checkOut);
  if (!nights.length || req.rooms.some((r) => r.adults > 2 || r.childAges.length > 1)) return null;
  const base = 9_000 + (hash(hotelId) % 9_000); // 90.00–179.99 per room night
  const rooms = req.rooms.map((r, i) => {
    const perNight = base + (r.adults - 1) * 2_500 + r.childAges.length * 1_500;
    const nightly = nights.map((night) => ({ night, amountMinor: perNight + applyBps(perNight, driftBps) }));
    return { roomIndex: i, nightly, totalMinor: nightly.reduce((s, n) => s + n.amountMinor, 0) };
  });
  const contractAmountMinor = rooms.reduce((s, r) => s + r.totalMinor, 0);
  return {
    supplier: 'sandbox',
    offerKey: `sandbox:${hotelId}:DBL:BB`,
    hotelId,
    contractId: null,
    roomTypeId: null, // the wholesaler's room is not mapped to our catalogue
    roomName: 'Double room (wholesale)',
    mealPlan: 'BB',
    availability: 'instant',
    terms: { currency: 'EUR', rateBasis: 'net', collectionModel: 'prepaid_to_hb', taxMode: 'included', taxBps: 1000, commissionBps: 0, localTaxMinor: 0 },
    rooms,
    contractAmountMinor,
    firstNightContractMinor: rooms.reduce((s, r) => s + r.nightly[0].amountMinor, 0),
    roomNights: nights.length * req.rooms.length,
    personNights: req.rooms.reduce((s, r) => s + r.adults + r.childAges.length, 0) * nights.length,
    cancelPolicy: { nonRefundable: false, freeCancelDays: 3, latePenaltyType: 'full', latePenaltyBps: 0 },
    notes: ['Simulated supplier — development only. Not real inventory.'],
  };
}

export const sandboxAdapter: SupplierAdapter = {
  id: 'sandbox',
  label: 'Sandbox wholesaler (simulated)',
  environment: 'development',
  capabilities: { search: true, revalidate: true, book: true, hold: false, retrieve: true, cancel: true, amend: false, idempotentCreate: true },

  async search(ctx, req) {
    const hs = await ctx.db.select({ id: hotels.id }).from(hotels).where(and(
      eq(hotels.status, 'active'), eq(hotels.isSample, true),
      req.hotelId ? eq(hotels.id, req.hotelId) : sql`lower(${hotels.city}) = lower(${req.city})`,
    ));
    const d = await drift(ctx);
    return hs.map((h) => makeOffer(h.id, req, d)).filter((o): o is SupplierOffer => o != null);
  },

  async revalidate(ctx, offerKey, req) {
    const hotelId = offerKey.split(':')[1];
    const o = makeOffer(hotelId, req, await drift(ctx));
    return o ?? { unavailable: 'The wholesaler no longer offers this room' };
  },

  async book(ctx, req) {
    const [existing] = await ctx.db.select().from(sandboxReservations).where(eq(sandboxReservations.clientReference, req.clientReference));
    if (existing) return { state: 'confirmed', supplierRef: existing.supplierRef };
    if (/TEST REJECT/i.test(req.leadGuest)) throw new SupplierRejectedError('Sold out at the supplier');
    const supplierRef = 'SBX-' + (hash(req.clientReference) % 10_000_000).toString().padStart(7, '0');
    await ctx.db.insert(sandboxReservations).values({
      supplierRef, clientReference: req.clientReference, state: 'confirmed',
      payload: { hotelId: req.offer.hotelId, checkIn: req.checkIn, checkOut: req.checkOut, rooms: req.offer.rooms.length },
    });
    // The reservation exists, but our side never hears back.
    if (/TEST TIMEOUT/i.test(req.leadGuest)) throw new SupplierTimeoutError('Supplier did not respond within the timeout');
    return { state: 'confirmed', supplierRef };
  },

  async retrieve(ctx, ref) {
    const [r] = await ctx.db.select().from(sandboxReservations).where(eq(sandboxReservations.clientReference, ref.clientReference));
    if (!r) return { state: 'not_found' };
    return { state: r.state === 'cancelled' ? 'cancelled' : 'confirmed', supplierRef: r.supplierRef };
  },

  async cancel(ctx, ref) {
    const res = await ctx.db.update(sandboxReservations).set({ state: 'cancelled' })
      .where(eq(sandboxReservations.supplierRef, ref.supplierRef)).returning();
    return { cancelled: res.length > 0 };
  },
};
