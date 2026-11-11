/* ------------------------------------------------------------------ *
 * Side-by-side hotel comparison for agents. 2–4 published hotels.
 * With dates and rooms, prices come from the same search the booking
 * page uses (searchHotels): nothing here is estimated or cached.
 * Best-rate-on-request hotels have no fixed price — we say so.
 * ------------------------------------------------------------------ */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { daysBetween } from '@/lib/domain/dates';
import type { RoomRequest } from '@/lib/db/schema';
import type { Actor } from './actor';
import { AppError } from './errors';
import { searchHotels, searchSchema, type PricedOffer } from './search';

export const MAX_COMPARE = 4;

export type CompareColumn = {
  hotel: typeof schema.hotels.$inferSelect;
  roomTypes: number;
  extras: number;
  /** priced: cheapest offer for the stay · on_request: ask the hotel · unavailable: no offer · no_dates: dates not given */
  status: 'priced' | 'on_request' | 'unavailable' | 'no_dates';
  cheapest?: PricedOffer;
  mealPlans: string[];
  nights?: number;
};

export async function compareHotels(db: DB, actor: Actor, idsRaw: string[], stay?: { checkIn: string; checkOut: string; rooms: RoomRequest[] }): Promise<{ columns: CompareColumn[]; error?: string }> {
  const ids = [...new Set(idsRaw)].filter((id) => z.string().uuid().safeParse(id).success).slice(0, MAX_COMPARE);
  if (ids.length < 2) throw new AppError('Choose at least two hotels to compare.');
  const hotels = await db.select().from(schema.hotels).where(and(inArray(schema.hotels.id, ids), eq(schema.hotels.status, 'active')));
  const [rt, ex] = await Promise.all([
    db.select({ id: schema.roomTypes.hotelId, n: sql<number>`count(*)::int` }).from(schema.roomTypes).where(and(inArray(schema.roomTypes.hotelId, ids), eq(schema.roomTypes.active, true))).groupBy(schema.roomTypes.hotelId),
    db.select({ id: schema.hotelExtras.hotelId, n: sql<number>`count(*)::int` }).from(schema.hotelExtras).where(inArray(schema.hotelExtras.hotelId, ids)).groupBy(schema.hotelExtras.hotelId),
  ]);
  const count = (rows: { id: string; n: number }[], id: string) => rows.find((r) => r.id === id)?.n ?? 0;

  // Prices: one real search per city, only when the stay is valid.
  let error: string | undefined;
  const offersByHotel = new Map<string, PricedOffer[]>();
  if (stay) {
    for (const city of [...new Set(hotels.filter((h) => !h.bestRateOnRequest).map((h) => h.city))]) {
      const parsed = searchSchema.safeParse({ city, ...stay });
      if (!parsed.success) { error = parsed.error.issues[0]?.message; break; }
      const { results } = await searchHotels(db, actor, parsed.data, { log: false });
      for (const r of results) offersByHotel.set(r.hotel.id, r.offers);
    }
  }
  const nights = stay && !error ? daysBetween(stay.checkIn, stay.checkOut) : undefined;

  // Keep the agent's order.
  const columns = ids.map((id) => hotels.find((h) => h.id === id)).filter((h): h is NonNullable<typeof h> => !!h).map((hotel): CompareColumn => {
    const base = { hotel, roomTypes: count(rt, hotel.id), extras: count(ex, hotel.id), mealPlans: [] as string[], nights };
    if (hotel.bestRateOnRequest) return { ...base, status: 'on_request' };
    if (!stay || error) return { ...base, status: 'no_dates' };
    const offers = offersByHotel.get(hotel.id) ?? [];
    if (!offers.length) return { ...base, status: 'unavailable' };
    const cheapest = [...offers].sort((a, b) => a.price.sellMinor - b.price.sellMinor)[0];
    return { ...base, status: 'priced', cheapest, mealPlans: [...new Set(offers.map((o) => o.mealPlan))] };
  });
  return { columns, error };
}
