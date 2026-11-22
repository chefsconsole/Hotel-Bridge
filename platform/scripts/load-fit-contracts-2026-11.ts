/* npm run tsx scripts/load-fit-contracts-2026-11.ts
 *
 * Loads the four FIT contracts that arrived by email in November 2026 and were
 * complete enough to price: Centre Point Hotel Sukhumvit 10 (Bangkok),
 * Mövenpick Hotel Zürich-Airport, and Apple A Day Resort and The Capuchin
 * Hotel (both Krabi, same operator).
 *
 * Both go in as DRAFT with distribution NOT permitted, because both hotels
 * asked for a countersigned agreement before the rates apply. Nothing reaches
 * an agent until Ronak signs and someone flips the contract to active.
 *
 * Idempotent: re-running updates nothing it already created.
 */
import './env';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb, schema, type DB } from '@/lib/db';

const MON_THU = 0b0001111;
const FRI_SUN = 0b1110000;
const ALL = 0b1111111;

async function hotel(db: DB, v: typeof schema.hotels.$inferInsert) {
  const [found] = await db.select().from(schema.hotels).where(eq(schema.hotels.slug, v.slug));
  if (found) { console.log(`  hotel exists: ${found.name}`); return found; }
  const [h] = await db.insert(schema.hotels).values(v).returning();
  console.log(`  hotel created: ${h.name}`);
  return h;
}

async function room(db: DB, hotelId: string, v: Omit<typeof schema.roomTypes.$inferInsert, 'hotelId'>) {
  const [found] = await db.select().from(schema.roomTypes)
    .where(and(eq(schema.roomTypes.hotelId, hotelId), eq(schema.roomTypes.name, v.name!)));
  if (found) return found;
  const [r] = await db.insert(schema.roomTypes).values({ ...v, hotelId }).returning();
  return r;
}

async function contract(db: DB, v: typeof schema.contracts.$inferInsert) {
  const [found] = await db.select().from(schema.contracts)
    .where(and(eq(schema.contracts.hotelId, v.hotelId), eq(schema.contracts.reference, v.reference)));
  if (found) { console.log(`  contract exists: ${found.reference} (${found.status})`); return found; }
  const [c] = await db.insert(schema.contracts).values(v).returning();
  console.log(`  contract created: ${c.reference} (${c.status}, distribution ${c.distributionPermitted})`);
  return c;
}

async function rates(db: DB, contractId: string, rows: (typeof schema.ratePeriods.$inferInsert)[]) {
  const existing = await db.select().from(schema.ratePeriods).where(eq(schema.ratePeriods.contractId, contractId));
  if (existing.length) { console.log(`  ${existing.length} rate periods already loaded — left alone`); return; }
  await db.insert(schema.ratePeriods).values(rows);
  console.log(`  ${rows.length} rate periods loaded`);
}

/* ---------------- Centre Point Hotel Sukhumvit 10 ---------------- *
 * Source: "Contract Rate_1 NOV'26-31 OCT'27" + "Winter Promotion_1 NOV'26-31
 * MAR'27", both from wilailack.c@centrepoint.com on 17 Nov 2026.
 *
 * THB per room per night, non-commissionable, net and inclusive of 7%
 * government tax and service charge. The winter promotion undercuts the
 * contract rate from 1 Nov to 31 Mar except over its two blackout windows,
 * where the standard contract rate stands — so the promo and the contract
 * rate are loaded as alternating date bands of one contract rather than as
 * two contracts that would both claim the same nights.
 */
type CpRoom = {
  name: string; sqm: number; cap: number; beds: string; extraBed: boolean;
  ro: number; bb: number; wRo: number; wBb: number; note: string;
};
const CP_ROOMS: CpRoom[] = [
  { name: 'Deluxe Greenery', sqm: 35, cap: 2, beds: 'King/Twin', extraBed: true, ro: 4_500, bb: 5_100, wRo: 2_700, wBb: 3_200, note: 'Greenery Wing. Pantry & microwave, Toto washlet.' },
  { name: 'Deluxe Pool View', sqm: 35, cap: 2, beds: 'King/Twin', extraBed: false, ro: 5_000, bb: 5_600, wRo: 2_900, wBb: 3_400, note: 'Greenery Wing. Pantry & microwave, Toto washlet. No extra bed.' },
  { name: 'Suite Greenery Family', sqm: 70, cap: 2, beds: 'King/Twin', extraBed: true, ro: 6_500, bb: 7_100, wRo: 3_600, wBb: 4_100, note: 'Greenery Wing. Full kitchen & bathtub with Toto washlet.' },
  { name: 'Deluxe Balcony', sqm: 38, cap: 2, beds: 'King', extraBed: false, ro: 5_500, bb: 6_100, wRo: 3_400, wBb: 3_900, note: 'Scenery Wing. Pantry & microwave, bathtub & Toto washlet. No extra bed.' },
  { name: 'Grand Deluxe', sqm: 45, cap: 2, beds: 'King/Twin', extraBed: true, ro: 6_000, bb: 6_600, wRo: 3_200, wBb: 3_700, note: 'Scenery Wing. Pantry & microwave, Toto washlet.' },
  { name: '1 Bedroom Balcony Junior Suite', sqm: 65, cap: 2, beds: 'King', extraBed: true, ro: 7_300, bb: 7_900, wRo: 3_600, wBb: 4_100, note: 'Scenery Wing. Pantry & microwave, Toto washlet.' },
  { name: '1 Bedroom Balcony Triple Suite', sqm: 76, cap: 3, beds: 'King/Twin + 1 sofa bed', extraBed: false, ro: 8_300, bb: 9_200, wRo: 4_600, wBb: 5_350, note: 'Scenery Wing. Pantry & microwave, Toto washlet. Sleeps 3. No extra bed.' },
  { name: '1 Bedroom Balcony Residence Suite', sqm: 76, cap: 2, beds: 'King/Twin', extraBed: true, ro: 8_300, bb: 8_900, wRo: 4_200, wBb: 4_700, note: 'Residence Concept: full kitchen & washing machine. Bathtub, shower & Toto washlet.' },
  { name: '2 Bedroom Family Deluxe', sqm: 89, cap: 4, beds: 'King/Twin + Queen', extraBed: true, ro: 9_300, bb: 10_500, wRo: 5_600, wBb: 6_600, note: 'Residence Concept. Sleeps 4. Rates quoted are per room per night.' },
  { name: '3 Bedroom Family Grand Suite', sqm: 121, cap: 6, beds: 'King + Queen + Twin', extraBed: true, ro: 10_800, bb: 12_600, wRo: 7_200, wBb: 8_700, note: 'Residence Concept. Sleeps 6. Rates quoted are per room per night.' },
];

/* Promo band / contract band, alternating around the promo's two blackouts. */
const CP_BANDS: { from: string; to: string; promo: boolean }[] = [
  { from: '2026-11-01', to: '2026-12-23', promo: true },
  { from: '2026-12-24', to: '2027-01-03', promo: false }, // promo blackout
  { from: '2027-01-04', to: '2027-02-03', promo: true },
  { from: '2027-02-04', to: '2027-02-08', promo: false }, // promo blackout
  { from: '2027-02-09', to: '2027-03-31', promo: true },
  { from: '2027-04-01', to: '2027-10-31', promo: false }, // promo over, contract rate
];

export async function loadCentrePoint(db: DB) {
  console.log('\nCentre Point Hotel Sukhumvit 10 — Bangkok');
  const h = await hotel(db, {
    name: 'Centre Point Hotel Sukhumvit 10', slug: 'centre-point-hotel-sukhumvit-10',
    city: 'Bangkok', country: 'Thailand', status: 'active', tier: 'premium',
    address: '39 Soi Sukhumvit 10, Sukhumvit Rd., Klongtoey, Bangkok 10110, Thailand',
    description: 'Serviced-apartment style hotel on Sukhumvit Soi 10, a short walk from Nana BTS and Benjakitti Park. Rooms have a pantry and microwave; the Residence rooms add a full kitchen and washing machine, which suits families and longer stays.',
    facilities: ['Wi-Fi', 'Swimming pool', 'Fitness centre', 'Restaurant', 'Laundry', 'Airport transfer on request'],
    collections: ['city_centre', 'value'],
    checkInTime: '14:00', checkOutTime: '12:00',
    contactName: 'Ms. Suphuttar Bunsoem (Sales Manager)',
    contactEmail: 'suphuttar.b@centrepoint.com',
    reservationsEmail: 'rsvn_sukhumvit10@centrepoint.com',
  });

  const c = await contract(db, {
    hotelId: h.id, reference: 'CP-SUK10-2627', inventoryModel: 'direct_net', rateBasis: 'net',
    collectionModel: 'prepaid_to_hb', currency: 'THB',
    validFrom: '2026-11-01', validTo: '2027-10-31', commissionBps: 0,
    taxMode: 'included', taxBps: 0, localTaxMinor: 0,
    confirmationMode: 'on_request', responseHours: 48,
    // The sheet has two cancellation seasons (7 days 1 Nov–28 Feb, 3 days
    // 1 Mar–31 Oct) and the schema holds one. The stricter is loaded so we
    // never promise an agent more freedom than the hotel gave us; the exact
    // wording is in the notes below.
    freeCancelDays: 7, latePenaltyType: 'full', latePenaltyBps: 10_000, nonRefundable: false,
    paymentTerms: 'Full prepayment 7 days before arrival. Rates are non-commissionable and net of 7% government tax and service charge. Original Travel Agent Voucher required at check-in.',
    distributionPermitted: false,
    status: 'draft',
    internalNotes: [
      'Source: Contract Rate 1 Nov 26 – 31 Oct 27 and Winter Promotion 1 Nov 26 – 31 Mar 27, emailed by Wilailack Chiakram (wilailack.c@centrepoint.com) on 17 Nov 2026.',
      'PENDING SIGNATURE. The hotel asked for the contract to be signed and returned; they activate our rates in their system on receipt. Do not set this contract active until that is done.',
      'Cancellation, as written: 1 Nov – 28 Feb, 7 days prior; 0–6 days = 100% of booking revenue. 1 Mar – 31 Oct, 3 days prior; 0–2 days = 1 night. The stricter season is what is loaded.',
      'Winter promotion blackouts (24 Dec 26 – 3 Jan 27 and 4–8 Feb 27) are loaded as standard contract-rate bands, so those nights price at the contract rate rather than falling out of sale.',
      'Promotion rates must not be sold on the internet or any B2C website. Our portal is closed and behind an agent login, which satisfies this.',
      'Wholesale use only: rates must be bundled with another travel component (transfer, air, tour).',
      'Extras, net: breakfast THB 440 adult / THB 220 child 4–12. Extra bed THB 1,100 including breakfast. One child 0–12 free sharing with family, no bed and no breakfast.',
      'Allotment is not contracted — every booking is on request to the hotel.',
      'CHECK BEFORE SIGNING: our outreach went to "Grande Centre Point Sukhumvit 10" but every reply and both rate sheets are from Centre Point Hotel Sukhumvit 10, a different property. The contract also carries our address as "Bandra Kurla Complex Mumbai 400051", which is incomplete — ask them to correct it.',
    ].join('\n'),
  });

  const rows: (typeof schema.ratePeriods.$inferInsert)[] = [];
  for (const r of CP_ROOMS) {
    const rt = await room(db, h.id, {
      name: r.name,
      // Never advertise an occupancy we cannot price: the rate sheet gives one
      // room rate, and the schema prices up to three adults.
      maxAdults: Math.min(r.cap, 3), maxChildren: 1, maxOccupancy: Math.min(r.cap, 3) + 1,
      sizeSqm: r.sqm, bedding: r.beds,
      description: `${r.sqm} sq.m. ${r.beds}. Sleeps ${r.cap}. ${r.note}${r.extraBed ? '' : ' Extra bed not available.'}`,
    });
    for (const b of CP_BANDS) {
      const ro = b.promo ? r.wRo : r.ro;
      const bb = b.promo ? r.wBb : r.bb;
      for (const [mealPlan, price] of [['RO', ro], ['BB', bb]] as const) {
        const cap = Math.min(r.cap, 3);
        rows.push({
          contractId: c.id, roomTypeId: rt.id, mealPlan,
          dateFrom: b.from, dateTo: b.to,
          // One room rate whatever the occupancy, up to what the room sleeps.
          price1Minor: price * 100,
          price2Minor: cap >= 2 ? price * 100 : null,
          price3Minor: cap >= 3 ? price * 100 : null,
          childMinor: 0, // one child 0–12 free sharing, no bed or breakfast
          daysOfWeek: ALL, minStay: 1, releaseDays: 0,
        });
      }
    }
  }
  await rates(db, c.id, rows);
}

/* ---------------- Mövenpick Hotel Zürich-Airport ---------------- *
 * Source: Siham Bentalha (Siham.BENTALHA@movenpick.com), 16 Nov 2026.
 * CHF per room per night including buffet breakfast, city tax charged
 * separately. Weekdays are dearer than weekends, which is why rate periods
 * carry a weekday mask.
 */
const MP_SEASONS: { from: string; to: string; wd: [number, number, number]; we: [number, number, number] }[] = [
  { from: '2026-09-01', to: '2027-03-31', wd: [153, 168, 252], we: [138, 156, 234] },
  { from: '2027-04-01', to: '2027-04-12', wd: [167, 184, 276], we: [158, 174, 261] },
  { from: '2027-04-13', to: '2027-07-19', wd: [175, 192, 288], we: [169, 186, 279] },
  { from: '2027-07-20', to: '2027-09-27', wd: [167, 184, 276], we: [158, 174, 261] },
  { from: '2027-09-28', to: '2028-03-31', wd: [153, 168, 252], we: [138, 156, 234] },
];

export async function loadMovenpick(db: DB) {
  console.log('\nMövenpick Hotel Zürich-Airport — Zurich');
  const h = await hotel(db, {
    name: 'Mövenpick Hotel Zürich-Airport', slug: 'movenpick-hotel-zurich-airport',
    city: 'Zurich', country: 'Switzerland', status: 'active', tier: 'premium',
    address: 'Walter Mittelholzerstrasse 8, 8152 Glattbrugg, Zürich, Switzerland',
    description: 'Four-star hotel minutes from Zürich Airport, with a shuttle to the terminal and a direct train into the city. Suits arrival and departure nights on European itineraries.',
    facilities: ['Wi-Fi', 'Airport shuttle', 'Restaurant', 'Bar', 'Fitness centre', 'Meeting rooms'],
    collections: ['airport', 'business'],
    contactName: 'Siham Bentalha (Reservation Manager)',
    contactEmail: 'Siham.BENTALHA@movenpick.com',
    reservationsEmail: 'Siham.BENTALHA@movenpick.com',
  });

  const c = await contract(db, {
    hotelId: h.id, reference: 'MP-ZRH-2628', inventoryModel: 'direct_net', rateBasis: 'net',
    collectionModel: 'prepaid_to_hb', currency: 'CHF',
    validFrom: '2026-09-01', validTo: '2028-03-31', commissionBps: 0,
    taxMode: 'included', taxBps: 0,
    localTaxMinor: 350, // CHF 3.50 per person per night, paid at the hotel
    confirmationMode: 'on_request', responseHours: 48,
    freeCancelDays: null,
    latePenaltyType: 'first_night', latePenaltyBps: 0, nonRefundable: false,
    paymentTerms: 'Booking, payment and cancellation conditions still to be agreed with the hotel.',
    distributionPermitted: false,
    status: 'draft',
    internalNotes: [
      'Source: B2B FIT rate proposal from Siham Bentalha, Reservation Manager (Siham.BENTALHA@movenpick.com), 16 Nov 2026.',
      'PENDING SIGNATURE. Her words: "a signed FIT agreement is required before these rates can be applied to your bookings." Do not set this contract active until it is signed.',
      'STILL TO AGREE: booking, payment and cancellation conditions. The free-cancellation window is deliberately left empty rather than guessed.',
      'CHF per room per night, buffet breakfast included. City tax CHF 3.50 per person per night is charged separately and is loaded as the local tax.',
      'Monday–Thursday and Friday–Sunday are priced differently; each season is loaded as two periods carrying the matching weekday mask.',
      'Occupancy: Queen Single Use 1 guest, Queen Double 2, Queen Triple 3 — one room type priced by occupancy.',
      'Children: 0–5.99 free sharing the parents\' bed or in a cot; 6–11.99 CHF 50 per night for an extra bed, which is what the child rate holds; 12 and over pay the adult rate.',
      'All reservations subject to availability. No allotment contracted.',
    ].join('\n'),
  });

  const rt = await room(db, h.id, {
    name: 'Queen', maxAdults: 3, maxChildren: 1, maxOccupancy: 3, bedding: 'Queen',
    description: 'Queen room, sold for single, double or triple occupancy. Buffet breakfast included.',
  });

  const rows: (typeof schema.ratePeriods.$inferInsert)[] = [];
  for (const s of MP_SEASONS) {
    for (const [mask, p] of [[MON_THU, s.wd], [FRI_SUN, s.we]] as const) {
      rows.push({
        contractId: c.id, roomTypeId: rt.id, mealPlan: 'BB',
        dateFrom: s.from, dateTo: s.to,
        price1Minor: p[0] * 100, price2Minor: p[1] * 100, price3Minor: p[2] * 100,
        childMinor: 5_000, // CHF 50 extra bed, child 6–11.99
        daysOfWeek: mask, minStay: 1, releaseDays: 0,
      });
    }
  }
  await rates(db, c.id, rows);
}


/* ---------------- Apple A Day Resort & The Capuchin, Krabi ---------------- *
 * Source: two "Contract Rate Agreement 2026-2027 X HOTEL BRIDGE" PDFs plus
 * both stop-sale charts, from Sittisak Detaran (sales@appleadaykrabi.com),
 * 17 Nov 2026. Same operator, same terms, two properties on Ao Nang Soi 8.
 *
 * Net THB per room per night, breakfast for two included, inclusive of 10%
 * service charge, 7% government tax and 1% provincial tax.
 *
 * The stop-sale charts matter more than the rates here: The Capuchin is shut
 * to us every night from 1 Nov 2026 to 31 Mar 2027, and Apple A Day for all
 * but a handful of nights over the same months. They are loaded as blackout
 * restrictions so the portal can never quote a night the hotel has closed.
 */
const KRABI_SEASONS = [
  { name: 'Shoulder', from: '2026-11-01', to: '2026-11-30', idx: 2, minStay: 1 },
  { name: 'High', from: '2026-12-01', to: '2026-12-20', idx: 1, minStay: 1 },
  { name: 'Peak', from: '2026-12-21', to: '2026-12-23', idx: 0, minStay: 1 },
  { name: 'Peak (min 2 nights)', from: '2026-12-24', to: '2027-01-05', idx: 0, minStay: 2 },
  { name: 'Peak', from: '2027-01-06', to: '2027-01-20', idx: 0, minStay: 1 },
  { name: 'High', from: '2027-01-21', to: '2027-02-28', idx: 1, minStay: 1 },
  { name: 'Shoulder', from: '2027-03-01', to: '2027-04-20', idx: 2, minStay: 1 },
  { name: 'Low', from: '2027-04-21', to: '2027-10-31', idx: 3, minStay: 1 },
] as const;

// Peak, High, Shoulder, Low — the order of the contract's own columns.
const EXTRA_BED_ADULT = [1_200, 1_000, 800, 600];
const EXTRA_BED_CHILD = [1_000, 800, 600, 400];

type KrabiRoom = { name: string; sqm: number; adults: number; rates: [number, number, number, number]; desc: string };

const AADR_ROOMS: KrabiRoom[] = [
  { name: 'Chic Apple Room (Deluxe)', sqm: 32, adults: 2, rates: [3_200, 2_500, 2_300, 1_500], desc: 'Balcony, rain shower. Single or twin.' },
  { name: 'Chill Apple Room (Grand Deluxe)', sqm: 32, adults: 2, rates: [3_600, 2_800, 2_600, 1_800], desc: 'Balcony, jacuzzi. Single or twin.' },
  { name: 'Charm Apple Room (Pool Access)', sqm: 32, adults: 2, rates: [4_000, 3_100, 2_900, 2_100], desc: 'Pool access, balcony, jacuzzi. Single or twin.' },
  { name: 'Wow Apple Room (Family Suite)', sqm: 72, adults: 3, rates: [6_800, 5_400, 5_000, 3_400], desc: 'Family suite, 72.5 sq.m. Balcony, rain shower, 1 king and 1 twin with living room. Sleeps 4 adults, or 3 adults and 1 child.' },
  { name: 'Wow Apple Room (Family Suite) with Bathtub', sqm: 72, adults: 3, rates: [7_400, 6_000, 5_600, 4_000], desc: 'Family suite with bathtub, 72.5 sq.m. Balcony, rain shower, 1 king and 1 twin with living room. Sleeps 4 adults, or 3 adults and 1 child.' },
];

const CAPUCHIN_ROOMS: KrabiRoom[] = [
  { name: 'Deluxe Room', sqm: 38, adults: 2, rates: [2_800, 2_300, 2_100, 1_200], desc: 'Balcony, rain shower, 38 sq.m. Twin or double.' },
];

/* Stop-sale, read off the charts issued 5 Nov 2026. Inclusive ranges. */
const AADR_STOP: [string, string][] = [
  ['2026-11-06', '2027-02-28'], // open only 1–5 Nov, then shut solid to end Feb
  ['2027-03-01', '2027-03-02'],
  ['2027-03-05', '2027-03-09'],
  ['2027-03-12', '2027-03-16'],
  ['2027-03-19', '2027-03-20'],
  ['2027-03-22', '2027-03-27'],
];
const CAPUCHIN_STOP: [string, string][] = [
  ['2026-11-01', '2027-03-31'], // shut to us for the whole winter
];

const KRABI_TERMS = [
  'Net THB per room per night, inclusive of breakfast for 2 persons, 10% service charge, 7% government tax and 1% provincial tax.',
  'Cancellation, as written: Low 7 days / 25%, Shoulder 7 days / 50%, High 14 days / 75%, Peak 21 days / full length of stay. No-show is charged the entire stay, and an early departure pays the full stay. The strictest season is what is loaded.',
  'Payment: full prepayment by bank transfer, 7 days before arrival for stays 1 May – 31 Oct, and 21 days before arrival for stays 1 Nov – 30 Apr.',
  'Allotment is "on request" in every season, so every booking goes to the hotel. Cut-off, if allotment is ever granted: Peak 21 days, High 14, Shoulder/Low 7.',
  'Extra bed per night by season (Peak/High/Shoulder/Low): adult 12+ THB 1,200 / 1,000 / 800 / 600; child 4–11 THB 1,000 / 800 / 600 / 400. Child under 4 free. Additional breakfast THB 300 adult, THB 200 child 4–11.',
  'Airport transfer, net one way: car (max 3) THB 600, van (max 8) THB 800.',
  'Reservations to rsvn@appleadaykrabi.com; accounts to acc@appleadaykrabi.com.',
  'PENDING SIGNATURE. "May please have your kind to sign contract agreement by return." Do not set this contract active until it is signed and returned.',
  'CHECK BEFORE SIGNING: clause 4 says the agreement is confidential, must not be disclosed to third parties, and that contract rates "cannot be offered directly to end-user customers both offline and online". Our portal shows rates to logged-in agents, not to consumers — confirm in writing that this is agreed before going live. Clause 1 also says "these rates are valid for corporate only", which sits oddly with an FIT agreement; get that clarified too.',
  'NOTE: this contract carries our address as C/3002 Sunrise Charkop, Kandivali West, Mumbai 400067, while the Centre Point contract uses Bandra Kurla Complex Mumbai 400051. Settle on one registered address before signing either.',
].join('\n');

async function loadKrabiHotel(
  db: DB,
  spec: {
    name: string; slug: string; address: string; description: string; reference: string;
    rooms: KrabiRoom[]; stop: [string, string][]; website: string; stopNote: string;
  },
) {
  console.log(`\n${spec.name} — Krabi`);
  const h = await hotel(db, {
    name: spec.name, slug: spec.slug, city: 'Krabi', country: 'Thailand',
    status: 'active', tier: 'smart', address: spec.address, description: spec.description,
    facilities: ['Wi-Fi', 'Swimming pool', 'Fitness room', 'Kids club', 'Water park', 'Snack room', 'Bicycle hire', 'Welcome drink'],
    collections: ['value'],
    checkInTime: '14:00', checkOutTime: '12:00',
    contactName: 'Mr. Sittisak Detaran (Max), Sales & Marketing Manager',
    contactEmail: 'sales@appleadaykrabi.com',
    reservationsEmail: 'rsvn@appleadaykrabi.com',
  });

  const c = await contract(db, {
    hotelId: h.id, reference: spec.reference, inventoryModel: 'direct_net', rateBasis: 'net',
    collectionModel: 'prepaid_to_hb', currency: 'THB',
    validFrom: '2026-11-01', validTo: '2027-10-31', commissionBps: 0,
    taxMode: 'included', taxBps: 0, localTaxMinor: 0,
    confirmationMode: 'on_request', responseHours: 48,
    freeCancelDays: 21, latePenaltyType: 'full', latePenaltyBps: 10_000, nonRefundable: false,
    paymentTerms: 'Full prepayment by bank transfer: 7 days before arrival for stays 1 May – 31 Oct, 21 days before arrival for stays 1 Nov – 30 Apr. Rates are net and non-commissionable.',
    distributionPermitted: false, status: 'draft',
    internalNotes: `Source: ${spec.reference} PDF and stop-sale chart issued 5 Nov 2026, emailed by Sittisak Detaran on 17 Nov 2026.\n${spec.stopNote}\n${KRABI_TERMS}`,
  });

  const rows: (typeof schema.ratePeriods.$inferInsert)[] = [];
  for (const r of spec.rooms) {
    const rt = await room(db, h.id, {
      name: r.name, maxAdults: r.adults, maxChildren: 1, maxOccupancy: r.adults + 1,
      sizeSqm: r.sqm, description: `${r.desc} Breakfast for 2 included.`,
    });
    for (const s of KRABI_SEASONS) {
      const base = r.rates[s.idx] * 100;
      rows.push({
        contractId: c.id, roomTypeId: rt.id, mealPlan: 'BB',
        dateFrom: s.from, dateTo: s.to,
        price1Minor: base,
        price2Minor: base, // one rate for single or twin; breakfast covers 2
        // A third adult is the room rate plus that season's adult extra bed.
        price3Minor: r.adults >= 3 ? base + EXTRA_BED_ADULT[s.idx] * 100 : null,
        childMinor: EXTRA_BED_CHILD[s.idx] * 100,
        daysOfWeek: ALL, minStay: s.minStay, releaseDays: 0,
      });
    }
  }
  await rates(db, c.id, rows);

  const existing = await db.select().from(schema.restrictions).where(eq(schema.restrictions.contractId, c.id));
  if (existing.length) {
    console.log(`  ${existing.length} restrictions already loaded — left alone`);
  } else {
    await db.insert(schema.restrictions).values(spec.stop.map(([from, to]) => ({
      contractId: c.id, roomTypeId: null, kind: 'blackout',
      dateFrom: from, dateTo: to,
      note: 'Hotel stop-sale, chart issued 5 Nov 2026',
    })));
    console.log(`  ${spec.stop.length} stop-sale blackouts loaded`);
  }
}

export async function loadKrabi(db: DB) {
  await loadKrabiHotel(db, {
    name: 'Apple A Day Resort', slug: 'apple-a-day-resort-krabi',
    address: '234 Moo 3, Soi Ao Nang 8, Ao Nang Beach, Muang, Krabi 81180, Thailand',
    description: 'Relaxed resort a short walk from Ao Nang beach, with a pool, kids club and water park. Family suites sleep four, which suits Indian families travelling together.',
    reference: 'AADR-KRB-2627', rooms: AADR_ROOMS, stop: AADR_STOP, website: 'www.appleadaykrabi.com',
    stopNote: 'STOP-SALE: open to us only 1–5 November 2026, then closed every night to 28 February 2027. March 2027 is closed 1–2, 5–9, 12–16, 19–20 and 22–27; open 3–4, 10–11, 17–18, 21 and 28–31. April 2027 onward carries no stop-sale. In practice this contract is sellable from late March 2027.',
  });
  await loadKrabiHotel(db, {
    name: 'The Capuchin Hotel', slug: 'the-capuchin-hotel-krabi',
    address: '204 Moo 3, Soi Ao Nang 8, Ao Nang Beach, Muang, Krabi 81180, Thailand',
    description: 'Sister property to Apple A Day Resort on the same lane off Ao Nang beach. One room category, simple and well priced, with the same guest facilities.',
    reference: 'CPC-KRB-2627', rooms: CAPUCHIN_ROOMS, stop: CAPUCHIN_STOP, website: 'www.thecapuchin.com',
    stopNote: 'STOP-SALE: closed to us every night from 1 November 2026 to 31 March 2027. April 2027 onward carries no stop-sale, so this contract is only sellable from 1 April 2027.',
  });
}


async function main() {
  const db = await getDb();
  await loadCentrePoint(db);
  await loadMovenpick(db);
  await loadKrabi(db);
  console.log('\nBoth contracts are DRAFT with distribution off — nothing is visible to agents yet.');
  await closeDb();
  process.exit(0);
}
main();
