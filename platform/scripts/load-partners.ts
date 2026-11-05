/* npm run load:partners
 * Loads the REAL partner hotels in data/partners.ts. Safe to re-run: hotels are
 * matched by slug and updated; Muong Thanh's contract is created once.
 * Stop the dev server first — the embedded database allows one process. */
import './env';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { addDays, todayIso } from '@/lib/domain/dates';
import { SYSTEM } from '@/lib/services/actor';
import { audit } from '@/lib/services/audit';
import { MUONG_THANH as MT, ON_REQUEST, onRequestDescription } from '@/data/partners';

type DBT = Awaited<ReturnType<typeof getDb>>;
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function upsertHotel(db: DBT, values: Omit<typeof schema.hotels.$inferInsert, 'slug'>) {
  const slug = slugify(`${values.name}-${values.city}`);
  const [existing] = await db.select({ id: schema.hotels.id }).from(schema.hotels).where(eq(schema.hotels.slug, slug));
  if (existing) {
    await db.update(schema.hotels).set({ ...values, updatedAt: new Date() }).where(eq(schema.hotels.id, existing.id));
    return { id: existing.id, created: false };
  }
  const [h] = await db.insert(schema.hotels).values({ ...values, slug }).returning();
  await audit(db, SYSTEM, 'hotel.created', 'hotel', h.id, { name: h.name, city: h.city, source: 'load-partners' });
  return { id: h.id, created: true };
}

(async () => {
  const db = await getDb();
  let created = 0, updated = 0;

  for (const p of ON_REQUEST) {
    const r = await upsertHotel(db, {
      name: p.name, city: p.city, country: p.country, address: p.address ?? null,
      starRating: p.starRating ?? null, starRatingVerified: false,
      summary: 'Best rate on request — FIT and groups.', description: onRequestDescription,
      bestRateOnRequest: true, rateRequestEmail: p.email,
      acceptsGroups: true, groupsEmail: p.email,
      contactName: p.contactName ?? null, contactEmail: p.email, reservationsEmail: p.reservationsEmail ?? p.email,
      collectionHotels: p.collectionHotels ?? [], status: 'active', isSample: false,
    });
    if (r.created) created++; else updated++;
  }

  // Muong Thanh Luxury Da Nang — fixed 2027 FIT rates.
  const h = MT.hotel;
  const mt = await upsertHotel(db, {
    name: h.name, city: h.city, country: h.country, address: h.address, summary: h.summary, description: h.description,
    facilities: h.facilities, transport: h.transport, checkInTime: h.checkInTime, checkOutTime: h.checkOutTime,
    acceptsGroups: true, groupsEmail: h.groupsEmail, contactName: h.contactName, contactEmail: h.email, reservationsEmail: h.email,
    status: 'active', isSample: false,
  });
  if (mt.created) created++; else updated++;
  const [hasContract] = await db.select({ id: schema.contracts.id }).from(schema.contracts).where(eq(schema.contracts.reference, MT.contract.reference));
  if (!hasContract) {
    const today = todayIso();
    const [c] = await db.insert(schema.contracts).values({
      hotelId: mt.id, reference: MT.contract.reference, inventoryModel: 'direct_net', rateBasis: 'net', collectionModel: 'prepaid_to_hb',
      currency: MT.contract.currency, validFrom: today, validTo: MT.contract.validTo, commissionBps: 0, taxMode: 'included', taxBps: 0,
      confirmationMode: 'on_request', responseHours: 48, freeCancelDays: null, latePenaltyType: 'first_night',
      distributionPermitted: true, status: 'active', approvedAt: new Date(), internalNotes: MT.contract.internalNotes,
    }).returning();
    const [hs, he] = MT.highSeason;
    for (const room of MT.rooms) {
      const [rt] = await db.insert(schema.roomTypes).values({ hotelId: mt.id, name: room.name, maxAdults: 3, maxChildren: 2, maxOccupancy: 4, bedding: room.bedding, sizeSqm: room.sizeSqm }).returning();
      const period = (dateFrom: string, dateTo: string, rate: number) => ({
        contractId: c.id, roomTypeId: rt.id, mealPlan: 'BB', dateFrom, dateTo,
        price1Minor: rate, price2Minor: rate, price3Minor: rate + MT.extraBed, childMinor: MT.child6to11,
      });
      await db.insert(schema.ratePeriods).values([
        period(today, addDays(hs, -1), room.low),
        period(hs, he, room.high),
        period(addDays(he, 1), MT.contract.validTo, room.low),
      ]);
    }
    await db.insert(schema.restrictions).values(MT.holidays.map(([dateFrom, dateTo, note]) => ({
      contractId: c.id, roomTypeId: null, kind: 'blackout', dateFrom, dateTo, note: `${note}: holiday rate not yet given by the hotel`,
    })));
    await audit(db, SYSTEM, 'contract.created', 'contract', c.id, { reference: c.reference, source: 'load-partners' });
    console.log(`Muong Thanh: contract ${c.reference} with ${MT.rooms.length} room types loaded.`);
  }

  console.log(`Partners: ${created} added, ${updated} updated (${ON_REQUEST.length} on request + Muong Thanh).`);
  await closeDb();
})().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
