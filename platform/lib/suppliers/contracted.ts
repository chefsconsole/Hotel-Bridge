/* ------------------------------------------------------------------ *
 * HotelBridge's own contracted inventory, exposed through the same adapter
 * boundary as any third-party supplier.
 * ------------------------------------------------------------------ */
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { evaluateStay, type AllocationRow } from '@/lib/domain/contract-engine';
import { nightsOf } from '@/lib/domain/dates';
import type { CancelPolicy } from '@/lib/domain/cancellation';
import type { PricingTerms } from '@/lib/domain/pricing';
import {
  SupplierRejectedError, type BookRequest, type BookResult, type RetrieveResult, type SearchRequest,
  type SupplierAdapter, type SupplierContext, type SupplierOffer,
} from './types';

const { hotels, contracts, roomTypes, ratePeriods, restrictions, allocations, bookings } = schema;

export function contractOfferKey(contractId: string, roomTypeId: string, mealPlan: string) {
  return `contracted:${contractId}:${roomTypeId}:${mealPlan}`;
}

function parseKey(key: string) {
  const [src, contractId, roomTypeId, mealPlan] = key.split(':');
  if (src !== 'contracted' || !contractId || !roomTypeId || !mealPlan) throw new SupplierRejectedError('Unknown offer');
  return { contractId, roomTypeId, mealPlan };
}

type ContractRecord = typeof contracts.$inferSelect;

export function termsOf(c: ContractRecord): PricingTerms {
  return {
    currency: c.currency,
    rateBasis: c.rateBasis as PricingTerms['rateBasis'],
    collectionModel: c.collectionModel as PricingTerms['collectionModel'],
    taxMode: c.taxMode as PricingTerms['taxMode'],
    taxBps: c.taxBps,
    commissionBps: c.commissionBps,
    localTaxMinor: c.localTaxMinor,
  };
}

export function policyOf(c: ContractRecord): CancelPolicy {
  return {
    nonRefundable: c.nonRefundable,
    freeCancelDays: c.freeCancelDays,
    latePenaltyType: c.latePenaltyType as CancelPolicy['latePenaltyType'],
    latePenaltyBps: c.latePenaltyBps,
  };
}

async function offersFor(db: DB, req: SearchRequest, filter: { hotelIds: string[]; contractId?: string; roomTypeId?: string; mealPlan?: string }): Promise<SupplierOffer[]> {
  if (filter.hotelIds.length === 0) return [];
  const nights = nightsOf(req.checkIn, req.checkOut);
  if (nights.length === 0) return [];
  const first = nights[0];
  const last = nights[nights.length - 1];

  const cs = await db.select().from(contracts).where(and(
    inArray(contracts.hotelId, filter.hotelIds),
    eq(contracts.status, 'active'),
    eq(contracts.distributionPermitted, true),
    lte(contracts.validFrom, first),
    gte(contracts.validTo, last),
    filter.contractId ? eq(contracts.id, filter.contractId) : undefined,
  ));
  if (cs.length === 0) return [];
  const contractIds = cs.map((c) => c.id);
  const [rts, periods, restr, allots] = await Promise.all([
    db.select().from(roomTypes).where(inArray(roomTypes.hotelId, filter.hotelIds)),
    db.select().from(ratePeriods).where(and(inArray(ratePeriods.contractId, contractIds), eq(ratePeriods.active, true))),
    db.select().from(restrictions).where(and(inArray(restrictions.contractId, contractIds), lte(restrictions.dateFrom, last), gte(restrictions.dateTo, first))),
    db.select().from(allocations).where(and(inArray(allocations.contractId, contractIds), gte(allocations.night, first), lte(allocations.night, last))),
  ]);

  const offers: SupplierOffer[] = [];
  for (const c of cs) {
    const cPeriods = periods.filter((p) => p.contractId === c.id);
    const combos = new Set(cPeriods.map((p) => `${p.roomTypeId}|${p.mealPlan}`));
    for (const combo of combos) {
      const [roomTypeId, mealPlan] = combo.split('|');
      if (filter.roomTypeId && filter.roomTypeId !== roomTypeId) continue;
      if (filter.mealPlan && filter.mealPlan !== mealPlan) continue;
      const rt = rts.find((r) => r.id === roomTypeId);
      if (!rt) continue;
      const res = evaluateStay({
        contract: c,
        roomType: rt,
        mealPlan,
        periods: cPeriods,
        restrictions: restr.filter((r) => r.contractId === c.id),
        allocations: allots.filter((a) => a.contractId === c.id) as AllocationRow[],
        stay: { checkIn: req.checkIn, checkOut: req.checkOut, rooms: req.rooms, today: req.today },
      });
      if (!res.ok) continue;
      offers.push({
        supplier: 'contracted',
        offerKey: contractOfferKey(c.id, roomTypeId, mealPlan),
        hotelId: c.hotelId,
        contractId: c.id,
        roomTypeId,
        roomName: rt.name,
        mealPlan,
        availability: res.availability,
        terms: termsOf(c),
        rooms: res.rooms,
        contractAmountMinor: res.contractAmountMinor,
        firstNightContractMinor: res.rooms.reduce((s, r) => s + (r.nightly[0]?.amountMinor ?? 0), 0),
        roomNights: res.roomNights,
        personNights: res.personNights,
        cancelPolicy: policyOf(c),
        notes: res.notes,
      });
    }
  }
  return offers;
}

export const contractedAdapter: SupplierAdapter = {
  id: 'contracted',
  label: 'HotelBridge contracts',
  environment: 'production',
  capabilities: { search: true, revalidate: true, book: true, hold: true, retrieve: true, cancel: true, amend: false, idempotentCreate: true },

  async search({ db }: SupplierContext, req: SearchRequest) {
    const hs = await db.select({ id: hotels.id }).from(hotels).where(and(
      eq(hotels.status, 'active'),
      req.hotelId ? eq(hotels.id, req.hotelId) : sql`lower(${hotels.city}) = lower(${req.city})`,
    ));
    return offersFor(db, req, { hotelIds: hs.map((h) => h.id) });
  },

  async revalidate({ db }, offerKey, req) {
    const k = parseKey(offerKey);
    const [c] = await db.select({ hotelId: contracts.hotelId }).from(contracts).where(eq(contracts.id, k.contractId));
    if (!c) return { unavailable: 'This rate is no longer offered' };
    const [o] = await offersFor(db, req, { hotelIds: [c.hotelId], ...k });
    return o ?? { unavailable: 'This room is no longer available for these dates' };
  },

  async book({ db }, req: BookRequest): Promise<BookResult> {
    const { contractId, roomTypeId } = parseKey(req.offer.offerKey);
    const nights = nightsOf(req.checkIn, req.checkOut);
    const need = req.offer.rooms.length;
    if (req.offer.availability === 'instant') {
      // Take allotment atomically for every night, or for none.
      const took = await db.transaction(async (tx) => {
        const updated = await tx.update(allocations)
          .set({ sold: sql`${allocations.sold} + ${need}` })
          .where(and(
            eq(allocations.contractId, contractId),
            eq(allocations.roomTypeId, roomTypeId),
            inArray(allocations.night, nights),
            sql`${allocations.total} - ${allocations.sold} >= ${need}`,
          ))
          .returning();
        if (updated.length !== nights.length) {
          tx.rollback();
        }
        return true;
      }).catch(() => false);
      if (took) return { state: req.hold ? 'held' : 'confirmed', supplierRef: `HBC-A-${req.clientReference}` };
      // Allotment went between revalidation and booking: ask the hotel instead.
    }
    return { state: 'pending', supplierRef: `HBC-R-${req.clientReference}` };
  },

  async retrieve({ db }, ref): Promise<RetrieveResult> {
    const [b] = await db.select({ status: bookings.status, supplierRef: bookings.supplierRef }).from(bookings).where(eq(bookings.reference, ref.clientReference));
    if (!b || !b.supplierRef) return { state: 'not_found' };
    if (b.status === 'cancelled' || b.status === 'declined') return { state: 'cancelled', supplierRef: b.supplierRef };
    if (b.status === 'pending_confirmation') return { state: 'pending', supplierRef: b.supplierRef };
    return { state: 'confirmed', supplierRef: b.supplierRef };
  },

  async cancel({ db }, ref) {
    if (ref.supplierRef.startsWith('HBC-A-')) {
      const [b] = await db.select().from(bookings).where(eq(bookings.reference, ref.clientReference));
      if (!b) return { cancelled: false };
      const { contractId, roomTypeId } = parseKey(b.offerKey);
      await db.update(allocations)
        .set({ sold: sql`greatest(${allocations.sold} - ${b.rooms.length}, 0)` })
        .where(and(eq(allocations.contractId, contractId), eq(allocations.roomTypeId, roomTypeId), inArray(allocations.night, nightsOf(b.checkIn, b.checkOut))));
    }
    return { cancelled: true };
  },
};
