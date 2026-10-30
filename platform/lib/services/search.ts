/* ------------------------------------------------------------------ *
 * Search and quotes. Supplier offers are priced here, centrally, with the
 * agency's pricing rule. A quote freezes the server's own calculation; the
 * client never sends a price that we trust.
 * ------------------------------------------------------------------ */
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import type { RoomRequest } from '@/lib/db/schema';
import { QUOTE_TTL_MINUTES } from '@/lib/config';
import { describePolicy, freeCancelUntil } from '@/lib/domain/cancellation';
import { daysBetween, isIsoDate, todayIso } from '@/lib/domain/dates';
import { roomsSchema } from '@/lib/domain/occupancy';
import { DEFAULT_RULE, priceOffer, type PriceBreakdown, type PricingRule } from '@/lib/domain/pricing';
import { adapters, breakerState, callSupplier, getAdapter } from '@/lib/suppliers/registry';
import type { SupplierOffer } from '@/lib/suppliers/types';
import { agencyOf, type Actor } from './actor';
import { AppError, NotFoundError } from './errors';

const { hotels, pricingRules, quotes, searchLog } = schema;

export const searchSchema = z.object({
  city: z.string().trim().min(1, 'Choose a destination'),
  checkIn: z.string().refine(isIsoDate, 'Choose a check-in date'),
  checkOut: z.string().refine(isIsoDate, 'Choose a check-out date'),
  rooms: roomsSchema,
}).superRefine((v, ctx) => {
  const n = daysBetween(v.checkIn, v.checkOut);
  if (n < 1) ctx.addIssue({ code: 'custom', message: 'Check-out must be after check-in', path: ['checkOut'] });
  if (n > 30) ctx.addIssue({ code: 'custom', message: 'Stays longer than 30 nights go through Group Desk', path: ['checkOut'] });
  if (v.checkIn < todayIso()) ctx.addIssue({ code: 'custom', message: 'Check-in cannot be in the past', path: ['checkIn'] });
});

export type SearchInput = z.infer<typeof searchSchema>;

export type PricedOffer = {
  offerKey: string;
  supplier: string;
  supplierLabel: string;
  simulated: boolean;
  roomName: string;
  roomTypeId: string | null;
  mealPlan: string;
  availability: 'instant' | 'on_request';
  price: PriceBreakdown;
  perRoomMinor: number[];
  freeCancelUntil: string | null;
  cancellation: string;
  nonRefundable: boolean;
  notes: string[];
};

export type HotelResult = {
  hotel: typeof hotels.$inferSelect;
  offers: PricedOffer[];
  fromMinor: number;
  currency: string;
};

/** Most specific active rule wins: agency+hotel > agency > hotel > default. */
export async function resolveRule(db: DB, agencyId: string, hotelId: string, currency: string): Promise<PricingRule> {
  const rows = await db.select().from(pricingRules).where(and(
    eq(pricingRules.active, true),
    or(eq(pricingRules.agencyId, agencyId), isNull(pricingRules.agencyId)),
    or(eq(pricingRules.hotelId, hotelId), isNull(pricingRules.hotelId)),
  ));
  const score = (r: typeof rows[number]) => (r.agencyId ? 2 : 0) + (r.hotelId ? 1 : 0);
  const usable = rows
    // A fixed amount in another currency would be meaningless — skip it.
    .filter((r) => r.kind !== 'fixed' || r.currency === currency)
    .sort((a, b) => score(b) - score(a));
  const r = usable[0];
  if (!r) return DEFAULT_RULE;
  return {
    kind: r.kind as PricingRule['kind'],
    valueBps: r.valueBps, fixedMinor: r.fixedMinor, agentCommissionShareBps: r.agentCommissionShareBps,
    rounding: r.rounding as PricingRule['rounding'],
    source: r.agencyId ? 'Agency agreement' : r.hotelId ? 'Hotel rule' : 'Default rule',
  };
}

export async function priceSupplierOffer(db: DB, agencyId: string, o: SupplierOffer): Promise<PricedOffer> {
  const rule = await resolveRule(db, agencyId, o.hotelId, o.terms.currency);
  const price = priceOffer({ terms: o.terms, contractAmountMinor: o.contractAmountMinor, roomNights: o.roomNights, personNights: o.personNights, rule });
  // Split the stay price per room in proportion to contract amounts (display only).
  const perRoomMinor = o.rooms.map((r) => Math.round(price.sellMinor * (r.totalMinor / Math.max(1, o.contractAmountMinor))));
  const adapter = adapters().find((a) => a.id === o.supplier);
  return {
    offerKey: o.offerKey,
    supplier: o.supplier,
    supplierLabel: adapter?.label ?? o.supplier,
    simulated: adapter?.environment === 'development',
    roomName: o.roomName,
    roomTypeId: o.roomTypeId,
    mealPlan: o.mealPlan,
    availability: o.availability,
    price,
    perRoomMinor,
    freeCancelUntil: null,
    cancellation: '',
    nonRefundable: o.cancelPolicy.nonRefundable,
    notes: [...o.notes, ...price.notes],
  };
}

function withPolicy(p: PricedOffer, o: SupplierOffer, checkIn: string): PricedOffer {
  return { ...p, freeCancelUntil: freeCancelUntil(o.cancelPolicy, checkIn), cancellation: describePolicy(o.cancelPolicy, checkIn) };
}

export async function collectOffers(db: DB, req: SearchInput & { hotelId?: string }): Promise<{ offers: SupplierOffer[]; warnings: string[] }> {
  const warnings: string[] = [];
  const today = todayIso();
  const results = await Promise.all(adapters().filter((a) => a.capabilities.search).map(async (a) => {
    if (breakerState(a.id) === 'open') { warnings.push(`${a.label} is temporarily unavailable.`); return []; }
    try {
      return await callSupplier(db, a, 'search', { ...req, supplier: a.id }, () => a.search({ db }, { ...req, today }));
    } catch {
      warnings.push(`${a.label} did not respond; results may be incomplete.`);
      return [];
    }
  }));
  return { offers: results.flat(), warnings };
}

export async function searchHotels(db: DB, actor: Actor, input: SearchInput, opts: { log?: boolean } = {}) {
  const agencyId = agencyOf(actor);
  const req = searchSchema.parse(input);
  const { offers, warnings } = await collectOffers(db, req);

  const hotelIds = [...new Set(offers.map((o) => o.hotelId))];
  const hs = hotelIds.length ? await db.select().from(hotels).where(inArray(hotels.id, hotelIds)) : [];
  const results: HotelResult[] = [];
  for (const h of hs) {
    const priced: PricedOffer[] = [];
    for (const o of offers.filter((x) => x.hotelId === h.id)) {
      priced.push(withPolicy(await priceSupplierOffer(db, agencyId, o), o, req.checkIn));
    }
    // Instant before on-request, then cheapest.
    priced.sort((a, b) => (a.availability === b.availability ? a.price.sellMinor - b.price.sellMinor : a.availability === 'instant' ? -1 : 1));
    const cheapest = [...priced].sort((a, b) => a.price.sellMinor - b.price.sellMinor)[0];
    results.push({ hotel: h, offers: priced, fromMinor: cheapest.price.sellMinor, currency: cheapest.price.currency });
  }
  results.sort((a, b) => a.hotel.name.localeCompare(b.hotel.name));

  if (opts.log !== false) {
    await db.insert(searchLog).values({ agencyId, userId: actor.userId, city: req.city, checkIn: req.checkIn, checkOut: req.checkOut, rooms: req.rooms, resultCount: results.length });
  }
  return { results, warnings, request: req };
}

/** Destinations that have at least one active hotel. */
export async function destinations(db: DB) {
  return db.select({ city: hotels.city, country: hotels.country, n: sql<number>`count(*)::int` })
    .from(hotels).where(eq(hotels.status, 'active')).groupBy(hotels.city, hotels.country).orderBy(asc(hotels.city));
}

export type QuoteSnapshot = { offer: SupplierOffer; priced: PricedOffer; hotelName: string; city: string };

export async function createQuote(db: DB, actor: Actor, args: { offerKey: string; hotelId: string; checkIn: string; checkOut: string; rooms: RoomRequest[] }) {
  const agencyId = agencyOf(actor);
  const req = searchSchema.parse({ city: '-', checkIn: args.checkIn, checkOut: args.checkOut, rooms: args.rooms });
  const supplier = args.offerKey.split(':')[0];
  const adapter = getAdapter(supplier);
  const [hotel] = await db.select().from(hotels).where(eq(hotels.id, args.hotelId));
  if (!hotel) throw new NotFoundError('Hotel');
  const res = await callSupplier(db, adapter, 'revalidate', { offerKey: args.offerKey, ...req },
    () => adapter.revalidate({ db }, args.offerKey, { ...req, city: hotel.city, today: todayIso(), hotelId: hotel.id }));
  if ('unavailable' in res) throw new AppError(res.unavailable, 'unavailable');
  const priced = withPolicy(await priceSupplierOffer(db, agencyId, res), res, req.checkIn);
  const snapshot: QuoteSnapshot = { offer: res, priced, hotelName: hotel.name, city: hotel.city };
  const [q] = await db.insert(quotes).values({
    agencyId, userId: actor.userId, supplier, hotelId: hotel.id, offerKey: args.offerKey,
    checkIn: req.checkIn, checkOut: req.checkOut, rooms: req.rooms, snapshot,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000),
  }).returning();
  return q;
}

export async function getQuote(db: DB, actor: Actor, quoteId: string) {
  const agencyId = agencyOf(actor);
  if (!z.string().uuid().safeParse(quoteId).success) throw new NotFoundError('Quote');
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), eq(quotes.agencyId, agencyId)));
  if (!q) throw new NotFoundError('Quote');
  return { ...q, snapshot: q.snapshot as QuoteSnapshot };
}

export async function recentSearches(db: DB, actor: Actor, limit = 5) {
  return db.select().from(searchLog).where(eq(searchLog.userId, actor.userId)).orderBy(desc(searchLog.createdAt)).limit(limit);
}
