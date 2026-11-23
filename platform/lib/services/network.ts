/* The public shape of the hotel network, for the marketing pages.
 *
 * Every figure on a public page comes from here, so the site can never claim a
 * hotel, a destination or a country we do not actually have under contract.
 * Sample data and inactive hotels are excluded. */
import { and, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';

export type NetworkRow = { city: string; country: string; n: number };
export type Network = { hotels: number; countries: number; cities: number; rows: NetworkRow[] };

/** Null when the database cannot be reached: the caller shows no numbers at all
 *  rather than a stale or invented one. */
export async function liveNetwork(): Promise<Network | null> {
  try {
    const db = await getDb();
    const live = and(eq(schema.hotels.isSample, false), sql`${schema.hotels.status} <> 'inactive'`);
    const rows = await db
      .select({ city: schema.hotels.city, country: schema.hotels.country, n: sql<number>`count(*)::int` })
      .from(schema.hotels).where(live)
      .groupBy(schema.hotels.city, schema.hotels.country)
      .orderBy(sql`count(*) desc`, schema.hotels.city);
    return {
      rows,
      hotels: rows.reduce((s, r) => s + r.n, 0),
      cities: rows.length,
      countries: new Set(rows.map((r) => r.country)).size,
    };
  } catch { return null; }
}
