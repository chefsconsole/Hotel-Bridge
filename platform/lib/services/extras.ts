/* ------------------------------------------------------------------ *
 * Hotel extras — candle-light dinners, activities, spa, meal plans.
 * Stored at the hotel's NET price. Agents only ever see the selling
 * price: net + the extras markup (setting `extras.markupPct`, kept
 * separate from — and normally higher than — the room markup).
 * ------------------------------------------------------------------ */
import { and, asc, eq } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { applyBps, roundUpToWholeUnit } from '@/lib/domain/money';
import { getSetting } from './settings';

export const EXTRA_UNIT: Record<string, string> = {
  per_person: 'per person', per_couple: 'for 2 people', per_room: 'per room', per_stay: 'per stay',
};
export const EXTRA_CATEGORY: Record<string, string> = {
  dining: 'Dining', activity: 'Activities', spa: 'Spa & wellness', meal_plan: 'Meal plans', celebration: 'Celebrations', other: 'Other',
};

export async function extrasMarkupBps(db: DB): Promise<number> {
  const pct = Number(await getSetting(db, 'extras.markupPct'));
  return Number.isFinite(pct) ? Math.round(Math.min(Math.max(pct, 0), 50) * 100) : 2000;
}

/** Selling price of one net amount: net + markup, rounded up to a whole unit of currency. */
export function extraSellMinor(netMinor: number, currency: string, markupBps: number): number {
  return roundUpToWholeUnit(netMinor + applyBps(netMinor, markupBps, 'up'), currency);
}

/** Staff view: net prices. */
export async function listHotelExtras(db: DB, hotelId: string) {
  return db.select().from(schema.hotelExtras)
    .where(and(eq(schema.hotelExtras.hotelId, hotelId), eq(schema.hotelExtras.active, true)))
    .orderBy(asc(schema.hotelExtras.sortOrder), asc(schema.hotelExtras.name));
}

export type AgentExtra = {
  id: string; name: string; category: string; unit: string; currency: string;
  sellMinor: number; childSellMinor: number | null; note: string | null; compulsory: boolean;
  validFrom: string | null; validTo: string | null;
};

/** Agent view: selling prices only — the hotel's net price never leaves the server. */
export async function extrasForAgent(db: DB, hotelId: string): Promise<AgentExtra[]> {
  const [rows, bps] = await Promise.all([listHotelExtras(db, hotelId), extrasMarkupBps(db)]);
  return rows.map((x) => ({
    id: x.id, name: x.name, category: x.category, unit: x.unit, currency: x.currency,
    sellMinor: extraSellMinor(x.priceMinor, x.currency, bps),
    childSellMinor: x.childPriceMinor == null ? null : extraSellMinor(x.childPriceMinor, x.currency, bps),
    note: x.note, compulsory: x.compulsory, validFrom: x.validFrom, validTo: x.validTo,
  }));
}
