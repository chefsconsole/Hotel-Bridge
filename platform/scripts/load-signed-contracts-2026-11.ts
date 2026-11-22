/* npx tsx scripts/load-signed-contracts-2026-11.ts
 *
 * Two contracts that the hotel had already signed and returned, sitting
 * unread in the inbox and never loaded:
 *
 *   Patong Resort Hotel (Phuket)  — signed by the hotel 9 Nov 2026
 *   SureStay by Best Western Iconic Ari-Jatujak (Bangkok) — signed 9 Nov 2026
 *
 * Both load as DRAFT with distribution off. Neither has been countersigned,
 * and SureStay's offer carried a 16 November deadline that has already passed,
 * so nothing here is sellable until Ronak confirms the rates still stand.
 *
 * Idempotent: anything already present is left exactly as it is.
 */
import './env';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb, schema, type DB } from '@/lib/db';

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

/* ------------------------- Patong Resort Hotel ------------------------- *
 * Four seasons, three room categories, single and twin priced separately.
 *
 * 31 December 2026 is deliberately left UNPRICED: the gala dinner that night
 * is compulsory (THB 4,300 adult / 2,800 child) and the room rate alone would
 * under-quote the stay. Same call as Hotel Clarks Shiraz Agra.
 */
const PATONG_SEASONS = [
  { from: '2026-11-01', to: '2026-11-30', i: 0 },
  { from: '2026-12-01', to: '2026-12-30', i: 1 }, // Period B, up to the gala
  // 2026-12-31 — compulsory gala dinner, no rate loaded on purpose
  { from: '2027-01-01', to: '2027-01-31', i: 1 }, // Period B resumes
  { from: '2027-02-01', to: '2027-03-31', i: 2 },
  { from: '2027-04-01', to: '2027-10-31', i: 3 },
] as const;

/** [single, twin] per season: A, B, C, Summer. */
const PATONG_ROOMS: { name: string; sqm?: number; rates: [number, number][]; desc: string }[] = [
  { name: 'Superior', rates: [[3_000, 3_300], [3_400, 3_700], [3_100, 3_400], [2_300, 2_600]], desc: 'Superior room, single or twin. Breakfast included.' },
  { name: 'Deluxe', rates: [[3_700, 4_000], [4_300, 4_600], [3_800, 4_100], [3_000, 3_300]], desc: 'Deluxe room, single or twin. Breakfast included. Recommended for two adults with children.' },
  { name: 'Premium Deluxe', rates: [[4_500, 4_800], [5_100, 5_400], [4_600, 4_900], [3_800, 4_100]], desc: 'Premium Deluxe room, single or twin. Breakfast included. Recommended for two adults with children.' },
];
const PATONG_EXTRA_ADULT = [1_000, 1_000, 1_000, 900];
const PATONG_EXTRA_CHILD = [900, 900, 900, 800];

async function loadPatong(db: DB) {
  console.log('\nPatong Resort Hotel — Phuket');
  const h = await hotel(db, {
    name: 'Patong Resort Hotel', slug: 'patong-resort-hotel-phuket',
    city: 'Phuket', country: 'Thailand', status: 'active', tier: 'smart',
    address: '208 Raj-Uthit 200 Pee Road, Patong Beach, Phuket 83150, Thailand',
    description: 'Long-established resort a few minutes from Patong beach and Bangla Road, with three room grades and a pool. Suits families and groups who want Patong on a sensible budget.',
    facilities: ['Wi-Fi', 'Swimming pool', 'Restaurant', 'Airport transfer on request'],
    collections: ['value'], checkInTime: '15:00', checkOutTime: '12:00',
    contactName: 'Toon (Piyarat Chantasaswat)',
    contactEmail: 'piyarat@patongresorthotel.com',
    reservationsEmail: 'bangkok@patongresorthotel.com',
  });

  const c = await contract(db, {
    hotelId: h.id, reference: 'PATONG-PHK-2627', inventoryModel: 'direct_net', rateBasis: 'net',
    collectionModel: 'prepaid_to_hb', currency: 'THB',
    validFrom: '2026-11-01', validTo: '2027-10-31', commissionBps: 0,
    taxMode: 'included', taxBps: 0, localTaxMinor: 0,
    confirmationMode: 'on_request', responseHours: 48,
    freeCancelDays: 7, latePenaltyType: 'full', latePenaltyBps: 10_000, nonRefundable: false,
    paymentTerms: 'Telegraphic transfer to the hotel before the check-in date, per clause 7 of the contract.',
    distributionPermitted: false, status: 'draft',
    internalNotes: [
      'CONFIRM BEFORE COUNTERSIGNING — TAX: this contract says nothing about tax, VAT, service charge or commission, which is unusual. Every other Thai contract we hold states it explicitly (SureStay: "net and inclusive of 10% service charge and 7% VAT"; Centre Point: "net and inclusive of government tax 7% and service charge"; Apple A Day: "inclusive of 10% service charge, 7% government tax and 1% provincial tax"). The rates are loaded as TAX INCLUDED on that reading. If tax is in fact added on top, every quote is roughly 17.7% short and we absorb it. Get it in writing.',
      'Source: HOTELBRIDGE.pdf, "Hotel Contract 2026/2027", emailed by Piyarat Chantasaswat (piyarat@patongresorthotel.com) 9 Nov 2026. Signed by the hotel; both copies to be signed and stamped by us and returned.',
      'PENDING COUNTERSIGNATURE. Not sellable until signed and the contract is set active.',
      '31 DECEMBER 2026 IS DELIBERATELY UNPRICED: the gala dinner that night is compulsory (THB 4,300 adult, THB 2,800 child 4–12) and a room-only rate would under-quote the stay. Quote 31 Dec by hand until the gala is loaded as a supplement. The 24 December gala (THB 3,200 / 2,000) is NOT compulsory and is ignored.',
      'Rates are per room per night including breakfast. price1 is the single rate, price2 the twin rate, price3 the twin rate plus that season\'s adult extra bed.',
      'Extra bed by season (A/B/C/Summer): adult THB 1,000/1,000/1,000/900; child 4–12 THB 900/900/900/800. Breakfast only, child 4–12 with no bed: THB 200. Maximum one extra bed per room.',
      'Children: cot free under 2 on request. Children 0–3.99 share an existing bed free including breakfast. Up to two children under 12 may share with parents — the first needs an extra bed, the second pays breakfast only.',
      'Cancellation, as written: stays 21 Dec – 14 Jan, free to 7 days before, then the full reservation. Stays 1 Nov – 20 Dec and 15 Jan – 28 Feb, free to 5 days, then 50% (minimum one night). Stays 1 Mar – 31 Oct, free to 3 days, then the first night. No-show is charged as a cancellation. The strictest season is what is loaded.',
      'NOT LOADED — Early Bird: 10% off for booking 30+ days ahead, 15% for 60+ days, valid 1 Nov 26 – 31 Oct 27, blacked out 20 Dec 26 – 20 Jan 27, and never on meal or gala supplements. The pricing engine has no booking-lead-time discount, so this is margin we are not yet passing on or capturing. Worth building.',
      'Meals: set lunch THB 650 adult / 450 child; set dinner THB 950 / 650. Airport transfer: taxi (max 3) THB 1,500 each way, minibus (max 7) THB 1,800.',
      'Our address on the contract reads "Sunrise Charkop, Kandivali West, Mumbai 400067" — the same address as the Krabi contracts, and different from the Centre Point one. Settle on one registered address.',
    ].join('\n'),
  });

  const rows: (typeof schema.ratePeriods.$inferInsert)[] = [];
  for (const r of PATONG_ROOMS) {
    const rt = await room(db, h.id, {
      name: r.name, maxAdults: 3, maxChildren: 2, maxOccupancy: 4,
      bedding: 'Single or twin', description: r.desc,
    });
    for (const s of PATONG_SEASONS) {
      const [single, twin] = r.rates[s.i];
      rows.push({
        contractId: c.id, roomTypeId: rt.id, mealPlan: 'BB',
        dateFrom: s.from, dateTo: s.to,
        price1Minor: single * 100,
        price2Minor: twin * 100,
        price3Minor: (twin + PATONG_EXTRA_ADULT[s.i]) * 100,
        childMinor: PATONG_EXTRA_CHILD[s.i] * 100,
        daysOfWeek: ALL, minStay: 1, releaseDays: 0,
      });
    }
  }
  await rates(db, c.id, rows);
}

/* ------------- SureStay by Best Western Iconic Ari-Jatujak ------------- */
const SURESTAY_BANDS = [
  { from: '2026-11-09', to: '2026-12-24', rate: 1_300 },
  { from: '2026-12-25', to: '2027-01-02', rate: 1_600 },
  { from: '2027-01-03', to: '2027-10-31', rate: 1_300 },
] as const;

async function loadSureStay(db: DB) {
  console.log('\nSureStay by Best Western Iconic Ari-Jatujak — Bangkok');
  const h = await hotel(db, {
    name: 'SureStay by Best Western Iconic Ari-Jatujak', slug: 'surestay-iconic-ari-jatujak-bangkok',
    city: 'Bangkok', country: 'Thailand', status: 'active', tier: 'smart',
    address: 'Ari–Jatujak, Bangkok, Thailand',
    description: 'Straightforward three-star near Ari and Chatuchak, on the BTS line into the centre. One room type, breakfast included, and a daily allotment — useful for agents who need reliable Bangkok beds at a fixed price.',
    facilities: ['Wi-Fi', 'Swimming pool', 'Fitness centre', 'In-room safe', 'Complimentary water'],
    collections: ['value', 'station'], checkInTime: '14:00', checkOutTime: '12:00',
    contactName: 'Cherry (Nuengruthai Sornsuwanthara)',
    contactEmail: 'sales2@surestayiconicari.com',
    reservationsEmail: 'rsvn@surestayiconicari.com',
  });

  const c = await contract(db, {
    hotelId: h.id, reference: 'SURESTAY-ARI-2627', inventoryModel: 'direct_net', rateBasis: 'net',
    collectionModel: 'prepaid_to_hb', currency: 'THB',
    validFrom: '2026-11-09', validTo: '2027-10-31', commissionBps: 0,
    taxMode: 'included', taxBps: 0, localTaxMinor: 0,
    confirmationMode: 'on_request', responseHours: 48,
    freeCancelDays: 7, latePenaltyType: 'full', latePenaltyBps: 10_000, nonRefundable: false,
    paymentTerms: 'Full pre-payment required 7 days before the arrival date. Rates are net and non-commissionable.',
    distributionPermitted: false, status: 'draft',
    internalNotes: [
      'DEADLINE ALREADY PASSED — the hotel signed on 9 Nov 2026 and asked for the countersigned copy within 7 days, by 16 November. That date has gone. Confirm with Cherry (sales2@surestayiconicari.com) that the rates still stand before signing or activating.',
      'Source: "SureStay Iconic Ari-Jatujak - HotelBridge (Main Contract 2026-2027).pdf", emailed 9 Nov 2026. Signed for the hotel by Nongyao Vinyou (Asst. Director of Sales & Marketing) and Viroj Thoraninpanich (GM).',
      'Rates are net per room per night, inclusive of 10% service charge and 7% VAT, non-commissionable. Breakfast included. Worldwide market.',
      'FIT rates loaded. A separate GROUP rate exists at THB 1,200 / 1,500 / 1,200 for the same bands, minimum 8 rooms — not loaded, because the portal prices FIT. Use it on the Group Desk.',
      'ALLOTMENT NOT LOADED: the contract grants 10 rooms a day for the whole term with a 7-day cut-off, which would allow instant confirmation. No allocation rows are loaded, so every booking goes to the hotel as a request. Load the allotment to turn this into instant inventory.',
      'Extra bed (rollaway) THB 700 net per person per night including breakfast, maximum one per room — loaded as the third-adult price.',
      'CHILD RATE IS DERIVED, CONFIRM IT: the contract says children 5–12 are charged 50% of the adult rate and does not give a figure. THB 350 is loaded, being half the THB 700 extra bed. Children 0–4 are free; 12 and over pay the adult rate; maximum one child sharing.',
      'Additional breakfast if ever needed: adult THB 200 net, child 5–12 THB 100 net, under 5 free.',
      'Cancellation: 7 days notice for the whole term; inside that, the full stay is charged. Early departure is non-refundable unless notice is given.',
      'The hotel wrote our address as "Bandra Kurla Complex Mumbai 400051" — correct it before signing.',
    ].join('\n'),
  });

  const rt = await room(db, h.id, {
    name: 'Deluxe Room', maxAdults: 3, maxChildren: 1, maxOccupancy: 3,
    sizeSqm: 30, bedding: 'King or twin',
    description: '30 sq.m. Deluxe room, king or twin beds. Breakfast included. Tea and coffee facilities, two bottles of water daily, in-room safe.',
  });

  await rates(db, c.id, SURESTAY_BANDS.map((b) => ({
    contractId: c.id, roomTypeId: rt.id, mealPlan: 'BB',
    dateFrom: b.from, dateTo: b.to,
    price1Minor: b.rate * 100,
    price2Minor: b.rate * 100,
    price3Minor: (b.rate + 700) * 100, // room plus one rollaway
    childMinor: 350 * 100, // 50% of the adult extra bed — derived, see notes
    daysOfWeek: ALL, minStay: 1, releaseDays: 7,
  })));
}

async function main() {
  const db = await getDb();
  await loadPatong(db);
  await loadSureStay(db);
  console.log('\nBoth contracts are DRAFT with distribution off — nothing is visible to agents.');
  await closeDb();
  process.exit(0);
}
main();
