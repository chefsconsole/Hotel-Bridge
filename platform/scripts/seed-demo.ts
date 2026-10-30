/* ------------------------------------------------------------------ *
 * DEVELOPMENT / DEMO DATA ONLY.
 * Every hotel, agency and rate here is FICTIONAL, flagged is_sample, and
 * shown with a "Sample" tag. Refuses to run in production.
 *
 * Demo logins (development only — change or delete before any real use):
 *   admin@demo.hotelbridge.test    / demo-admin-2026   (HotelBridge admin)
 *   agent@demo-travels.test        / demo-agent-2026   (verified agency, prepay)
 *   pending@demo-newco.test        / demo-agent-2026   (agency awaiting verification)
 *   frontdesk@demo-hotel.test      / demo-hotel-2026   (hotel partner, Maison Lumière)
 * ------------------------------------------------------------------ */
import './env';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { isProduction } from '@/lib/config';
import { addDays, todayIso } from '@/lib/domain/dates';
import { hashPassword } from '@/lib/services/auth';

type H = { name: string; city: string; country: string; stars: number; collections: string[]; summary: string; facilities: string[]; transport: string; base: number; model: 'net_instant' | 'net_request' | 'commission_direct' };

const HOTELS: H[] = [
  { name: 'Maison Lumière', city: 'Paris', country: 'France', stars: 4, collections: ['city_centre', 'premium'], summary: 'Fictional sample: a quiet four-star townhouse hotel close to the river.', facilities: ['Wi-Fi', '24-hour reception', 'Breakfast room', 'Lift', 'Air conditioning'], transport: 'Sample data — metro 3 minutes on foot.', base: 16_500, model: 'net_instant' },
  { name: 'Hôtel Gare Nord Exemple', city: 'Paris', country: 'France', stars: 3, collections: ['station', 'value'], summary: 'Fictional sample: a practical three-star next to a main-line station.', facilities: ['Wi-Fi', '24-hour reception', 'Luggage storage'], transport: 'Sample data — opposite the station entrance.', base: 11_000, model: 'net_instant' },
  { name: 'Le Grand Exemple', city: 'Paris', country: 'France', stars: 5, collections: ['premium', 'business'], summary: 'Fictional sample: five-star palace-style hotel for premium clients.', facilities: ['Spa', 'Restaurant', 'Concierge', 'Meeting rooms', 'Valet parking'], transport: 'Sample data — 15 minutes by taxi from the centre.', base: 42_000, model: 'net_request' },
  { name: 'Aéroport Démo Hotel', city: 'Paris', country: 'France', stars: 3, collections: ['airport', 'business'], summary: 'Fictional sample: airport hotel for early departures and crew.', facilities: ['Wi-Fi', 'Shuttle bus', 'Restaurant', 'Early breakfast'], transport: 'Sample data — free shuttle to the terminals every 20 minutes.', base: 9_800, model: 'commission_direct' },
  { name: 'Résidence Groupe Exemple', city: 'Paris', country: 'France', stars: 3, collections: ['group_friendly', 'value'], summary: 'Fictional sample: coach-friendly hotel with a large breakfast room.', facilities: ['Coach drop-off', 'Breakfast for 200', 'Wi-Fi', 'Lift'], transport: 'Sample data — coach parking on site.', base: 10_500, model: 'net_instant' },
  { name: 'Seeblick Muster Hotel', city: 'Zürich', country: 'Switzerland', stars: 4, collections: ['city_centre', 'business'], summary: 'Fictional sample: four-star by the lake, walkable to the old town.', facilities: ['Wi-Fi', 'Fitness room', 'Restaurant', 'Bar'], transport: 'Sample data — tram stop outside.', base: 24_000, model: 'net_instant' },
  { name: 'Bahnhof Beispiel', city: 'Zürich', country: 'Switzerland', stars: 3, collections: ['station', 'value'], summary: 'Fictional sample: simple, reliable rooms beside the main station.', facilities: ['Wi-Fi', 'Breakfast', '24-hour reception'], transport: 'Sample data — 2 minutes from the main station.', base: 15_500, model: 'net_request' },
  // Thailand — fictional samples, priced in THB (satang). Thai hotels usually quote "++": 10% service + 7% VAT on top.
  { name: 'Sukhumvit Sample Residence', city: 'Bangkok', country: 'Thailand', stars: 4, collections: ['city_centre', 'business'], summary: 'Fictional sample: a calm four-star near the BTS, popular with Indian families.', facilities: ['Wi-Fi', 'Rooftop pool', 'Indian breakfast options', 'Fitness room'], transport: 'Sample data — 4 minutes to the skytrain.', base: 320_000, model: 'net_instant' },
  { name: 'Riverside Example Bangkok', city: 'Bangkok', country: 'Thailand', stars: 5, collections: ['premium'], summary: 'Fictional sample: five-star on the river for premium clients and honeymooners.', facilities: ['Spa', 'River shuttle', 'Pool', 'Fine dining'], transport: 'Sample data — hotel boat to the nearest pier.', base: 780_000, model: 'net_request' },
  { name: 'Airport Link Demo Hotel', city: 'Bangkok', country: 'Thailand', stars: 3, collections: ['airport', 'value'], summary: 'Fictional sample: simple rooms for late arrivals near the airport.', facilities: ['Wi-Fi', 'Airport shuttle', '24-hour reception'], transport: 'Sample data — free airport shuttle.', base: 160_000, model: 'net_instant' },
  { name: 'Beachfront Sample Pattaya', city: 'Pattaya', country: 'Thailand', stars: 4, collections: ['group_friendly', 'city_centre'], summary: 'Fictional sample: coach-friendly four-star on the beach road.', facilities: ['Coach drop-off', 'Pool', 'Banquet hall', 'Indian kitchen on request'], transport: 'Sample data — 2 hours by road from Bangkok.', base: 280_000, model: 'net_instant' },
  { name: 'Pattaya Value Example', city: 'Pattaya', country: 'Thailand', stars: 3, collections: ['value'], summary: 'Fictional sample: practical rooms a short walk from the beach.', facilities: ['Wi-Fi', 'Pool', 'Breakfast'], transport: 'Sample data — 5 minutes to the beach.', base: 150_000, model: 'net_instant' },
  { name: 'Patong Sample Resort', city: 'Phuket', country: 'Thailand', stars: 4, collections: ['group_friendly', 'premium'], summary: 'Fictional sample: resort-style four-star close to Patong beach.', facilities: ['Pools', 'Spa', 'Kids club', 'Restaurant'], transport: 'Sample data — 45 minutes from Phuket airport.', base: 420_000, model: 'net_instant' },
  { name: 'Kata Bay Example Villas', city: 'Phuket', country: 'Thailand', stars: 5, collections: ['premium'], summary: 'Fictional sample: pool villas above a quiet bay, for honeymoons.', facilities: ['Private pools', 'Spa', 'Butler service'], transport: 'Sample data — 60 minutes from Phuket airport.', base: 1_250_000, model: 'net_request' },
];

(async () => {
  if (isProduction) throw new Error('Refusing to seed demo data in production.');
  const db = await getDb();
  const today = todayIso();
  const end = addDays(today, 365);
  const [existingAdmin] = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@demo.hotelbridge.test'));
  if (!existingAdmin) await seedAccounts(db);
  let added = 0;
  for (const h of HOTELS) {
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-sample';
    const [exists] = await db.select({ id: schema.hotels.id }).from(schema.hotels).where(eq(schema.hotels.slug, slug));
    if (exists) continue;
    await seedHotel(db, h, slug, today, end);
    added++;
  }
  console.log(added ? `Demo data: added ${added} sample hotel(s). Logins are listed at the top of scripts/seed-demo.ts.` : 'Demo data already present — nothing to do.');
  await closeDb();
})().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });

type DBT = Awaited<ReturnType<typeof getDb>>;

async function seedAccounts(db: DBT) {
  await db.insert(schema.users).values({ email: 'admin@demo.hotelbridge.test', name: 'Demo Admin', platformRole: 'admin', passwordHash: await hashPassword('demo-admin-2026') });
  const [agency] = await db.insert(schema.agencies).values({ name: 'Demo Travels (sample)', legalName: 'Demo Travels Pvt Ltd (fictional)', country: 'India', city: 'Mumbai', status: 'verified', billingCurrency: 'EUR', verifiedAt: new Date(), isSample: true }).returning();
  await db.insert(schema.users).values({ email: 'agent@demo-travels.test', name: 'Asha Demo', agencyId: agency.id, agencyRole: 'owner', passwordHash: await hashPassword('demo-agent-2026') });
  const [pending] = await db.insert(schema.agencies).values({ name: 'NewCo Holidays (sample)', country: 'United Arab Emirates', city: 'Dubai', status: 'pending', billingCurrency: 'EUR', isSample: true }).returning();
  await db.insert(schema.users).values({ email: 'pending@demo-newco.test', name: 'Omar Demo', agencyId: pending.id, agencyRole: 'owner', passwordHash: await hashPassword('demo-agent-2026') });
  await db.insert(schema.pricingRules).values({ kind: 'percent', valueBps: 1000, rounding: 'whole_unit', agentCommissionShareBps: 3000, note: 'Demo default: 10% markup on net; 30% of commission shared' });
}

async function seedHotel(db: DBT, h: H, slug: string, today: string, end: string) {
  {
    const thai = h.country === 'Thailand';
    const currency = h.country === 'Switzerland' ? 'CHF' : thai ? 'THB' : 'EUR';
    const [hotel] = await db.insert(schema.hotels).values({
      name: h.name, slug, city: h.city, country: h.country,
      address: `Sample address, ${h.city}`, starRating: h.stars, starRatingVerified: false, collections: h.collections, summary: h.summary,
      description: `${h.summary}\nThis property is fictional and exists only to demonstrate the HotelBridge platform. Its name, rates and facilities are invented.`,
      facilities: h.facilities, transport: h.transport, checkInTime: '15:00', checkOutTime: '11:00',
      groupNotes: h.collections.includes('group_friendly') ? 'Sample: coach drop-off at entrance; breakfast in two sittings for large groups.' : null,
      reservationsEmail: 'reservations@example.invalid', status: 'active', isSample: true,
    }).returning();
    const [dbl] = await db.insert(schema.roomTypes).values({ hotelId: hotel.id, name: 'Double or Twin', maxAdults: 2, maxChildren: 1, maxOccupancy: 3, bedding: 'Double or two singles', sizeSqm: 18 }).returning();
    const [fam] = await db.insert(schema.roomTypes).values({ hotelId: hotel.id, name: 'Triple / Family', maxAdults: 3, maxChildren: 2, maxOccupancy: 4, bedding: 'Double + single', sizeSqm: 26 }).returning();
    const commission = h.model === 'commission_direct';
    const [c] = await db.insert(schema.contracts).values({
      hotelId: hotel.id, reference: `SAMPLE-${hotel.slug.slice(0, 10).toUpperCase()}`,
      inventoryModel: commission ? 'direct_commissionable' : h.model === 'net_request' ? 'request_only' : 'direct_net',
      rateBasis: commission ? 'commissionable' : 'net', collectionModel: commission ? 'pay_direct_to_hotel' : 'prepaid_to_hb',
      currency, validFrom: today, validTo: end, commissionBps: commission ? 1500 : 0,
      taxMode: thai ? 'excluded' : 'included', taxBps: thai ? 1770 : currency === 'CHF' ? 380 : 1000,
      localTaxMinor: thai ? 0 : currency === 'CHF' ? 250 : 288, confirmationMode: h.model === 'net_instant' ? 'instant_allocation' : 'on_request',
      freeCancelDays: h.stars === 5 ? 7 : 3, latePenaltyType: 'first_night', nonRefundable: false, distributionPermitted: true, status: 'active',
      paymentTerms: 'Sample: hotel invoices HotelBridge monthly, 30 days.', approvedAt: new Date(), internalNotes: 'Fictional demo contract.',
    }).returning();
    const season = addDays(today, 150);
    for (const [rt, mult] of [[dbl, 1], [fam, 1.35]] as const) {
      const p = (x: number) => Math.round((h.base * mult * x) / 100) * 100;
      await db.insert(schema.ratePeriods).values([
        { contractId: c.id, roomTypeId: rt.id, mealPlan: 'BB', dateFrom: today, dateTo: season, price1Minor: p(0.85), price2Minor: p(1), price3Minor: rt === fam ? p(1.25) : null, childMinor: p(0.15), minStay: 1, releaseDays: 3 },
        { contractId: c.id, roomTypeId: rt.id, mealPlan: 'BB', dateFrom: addDays(season, 1), dateTo: end, price1Minor: p(1), price2Minor: p(1.2), price3Minor: rt === fam ? p(1.45) : null, childMinor: p(0.15), minStay: 2, releaseDays: 7 },
        { contractId: c.id, roomTypeId: rt.id, mealPlan: 'RO', dateFrom: today, dateTo: end, price1Minor: p(0.75), price2Minor: p(0.88), price3Minor: rt === fam ? p(1.1) : null, childMinor: p(0.05), minStay: 1, releaseDays: 3 },
      ]);
    }
    if (h.model === 'net_instant') {
      const nights = Array.from({ length: 120 }, (_, i) => addDays(today, i));
      await db.insert(schema.allocations).values(nights.flatMap((night) => [
        { contractId: c.id, roomTypeId: dbl.id, night, total: 6, sold: 0 },
        { contractId: c.id, roomTypeId: fam.id, night, total: 2, sold: 0 },
      ]));
      await db.insert(schema.restrictions).values({ contractId: c.id, roomTypeId: null, kind: 'supplement', dateFrom: addDays(today, 45), dateTo: addDays(today, 48), amountMinor: 4_000, note: 'Sample trade-fair supplement' });
    }
    if (h.name === 'Maison Lumière') {
      await db.insert(schema.users).values({ email: 'frontdesk@demo-hotel.test', name: 'Front Office (sample)', partnerHotelId: hotel.id, passwordHash: await hashPassword('demo-hotel-2026') });
    }
  }
}
