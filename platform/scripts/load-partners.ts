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
import { ASHLEE, ASHLEE_EXTRAS, ASHLEE_CHILD_BREAKFAST, ASHLEE_EXTRA_BED, ASHLEE_NYE_SUPPLEMENT_PER_ROOM, ASHLEE_PERIODS, MUONG_THANH as MT, ON_REQUEST, ashleeNotes, onRequestDescription } from '@/data/partners';

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

  // Ashlee Group — signed-by-hotel 2026–27 contracts (net THB, RO + BB).
  const today = todayIso();
  for (const k of ASHLEE) {
    const slug = slugify(`${k.hotelName}-${k.city}`);
    const [hotel] = await db.select({ id: schema.hotels.id }).from(schema.hotels).where(eq(schema.hotels.slug, slug));
    if (!hotel) throw new Error(`Load ${k.hotelName} before its contract`);
    await db.update(schema.hotels).set({
      address: k.address, checkInTime: k.checkInTime, checkOutTime: k.checkOutTime, bestRateOnRequest: false,
      summary: 'Contracted 2026–27 rates — room only or with breakfast.',
      description: 'HotelBridge contracted rates for 2026–27, room only or with breakfast. Every booking is confirmed by the hotel.\nNew Year\'s Eve 31 Dec 2026: a gala dinner is compulsory (included in the price for those dates). Check-out is not possible on 31 Dec or 1 Jan.',
      updatedAt: new Date(),
    }).where(eq(schema.hotels.id, hotel.id));
    // Extras: replaced in full on every run, so the list always matches data/partners.ts.
    const extras = ASHLEE_EXTRAS[k.hotelName] ?? [];
    await db.delete(schema.hotelExtras).where(eq(schema.hotelExtras.hotelId, hotel.id));
    if (extras.length) await db.insert(schema.hotelExtras).values(extras.map((x, i) => ({
      hotelId: hotel.id, name: x.name, category: x.category, unit: x.unit, priceMinor: x.price * 100,
      childPriceMinor: x.child == null ? null : x.child * 100, currency: 'THB',
      validFrom: x.validFrom ?? '2026-11-01', validTo: x.validTo ?? k.validTo, note: x.note ?? null, compulsory: x.compulsory ?? false, sortOrder: i,
    })));
    const [exists] = await db.select({ id: schema.contracts.id }).from(schema.contracts).where(eq(schema.contracts.reference, k.reference));
    if (exists) continue;
    const [c] = await db.insert(schema.contracts).values({
      hotelId: hotel.id, reference: k.reference, inventoryModel: 'direct_net', rateBasis: 'net', collectionModel: 'prepaid_to_hb',
      currency: 'THB', validFrom: today, validTo: k.validTo, commissionBps: 0, taxMode: 'included', taxBps: 0,
      confirmationMode: 'on_request', responseHours: 48, freeCancelDays: 7, latePenaltyType: 'full',
      distributionPermitted: true, status: 'active', approvedAt: new Date(), internalNotes: ashleeNotes,
    }).returning();
    for (const room of k.rooms) {
      const [rt] = await db.insert(schema.roomTypes).values({
        hotelId: hotel.id, name: room.name, bedding: room.bedding ?? null, sizeSqm: room.sizeSqm ?? null,
        maxAdults: room.maxAdults, maxChildren: room.maxChildren, maxOccupancy: room.maxAdults + room.maxChildren,
      }).returning();
      const rows = ASHLEE_PERIODS.flatMap(([from, to], i) => {
        if (to < today) return [];
        const dateFrom = from < today ? today : from;
        return (['RO', 'BB'] as const).map((mealPlan) => {
          const rate = (mealPlan === 'RO' ? room.ro : room.bb)[i] * 100; // THB → satang
          const third = room.includedAdults >= 3 ? rate : room.extraBed ? rate + ASHLEE_EXTRA_BED * 100 : null;
          return {
            contractId: c.id, roomTypeId: rt.id, mealPlan, dateFrom, dateTo: to,
            price1Minor: rate, price2Minor: rate, price3Minor: room.maxAdults >= 3 ? third : null,
            childMinor: mealPlan === 'BB' ? ASHLEE_CHILD_BREAKFAST * 100 : 0,
          };
        });
      });
      await db.insert(schema.ratePeriods).values(rows);
    }
    await db.insert(schema.restrictions).values({
      contractId: c.id, roomTypeId: null, kind: 'supplement', dateFrom: '2026-12-31', dateTo: '2026-12-31',
      amountMinor: ASHLEE_NYE_SUPPLEMENT_PER_ROOM * 100, note: 'Compulsory New Year\'s Eve gala dinner (2 adults × 2,500 THB)',
    });
    await audit(db, SYSTEM, 'contract.created', 'contract', c.id, { reference: c.reference, source: 'load-partners' });
    console.log(`${k.hotelName}: contract ${k.reference} with ${k.rooms.length} room type(s).`);
  }

  console.log(`Partners: ${created} added, ${updated} updated (${ON_REQUEST.length} on request + Muong Thanh).`);
  await closeDb();
})().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
