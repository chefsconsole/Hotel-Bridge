/* Patong Resort Hotel, Phuket — the parts of the 2026/27 contract that are not
 * room rates: meals, airport transfers, the two gala dinners, and the breakfast
 * charge for a child sharing without a bed.
 *
 * Source: "Hotel Contract 2026/2027" (reference PATONG-PHK-2627), emailed by
 * Piyarat Chantasaswat <piyarat@patongresorthotel.com> on 9 November 2026,
 * clauses 2 (meals), 3 (transportation), 4 (child policy) and 5 (gala dinner).
 * Every figure below is read off that document. Nothing is estimated.
 *
 * Prices are NET, as the contract states them. Agents see net plus the extras
 * markup (setting `extras.markupPct`, 20% by default) — the net price never
 * leaves the server.
 *
 * NOT loaded here, on purpose:
 *   - Adult and child extra beds. They are already inside the room rates:
 *     price3 is the twin rate plus that season's adult extra bed, and
 *     childMinor is the child extra bed. Loading them again would double-charge.
 *   - The Early Bird discount (10% at 30+ days, 15% at 60+). The pricing engine
 *     has no booking-lead-time rule, so there is nowhere to put it.
 *
 * 31 December 2026 stays unpriced. `compulsory` on an extra is a display badge
 * only — see lib/services/extras.ts and components/extras.tsx; the contract
 * engine never adds an extra to a quote. So marking the gala compulsory does
 * not stop a room-only booking on that night, and the night must keep its
 * deliberate gap until the engine can enforce a supplement.
 *
 * Safe to re-run: this hotel's extras are replaced in full each time.
 *   npx tsx scripts/load-patong-extras-2026-11.ts [--dry-run]
 */
import './env';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { SYSTEM } from '@/lib/services/actor';
import { audit } from '@/lib/services/audit';
import type { Extra } from '@/data/partners';

const HOTEL_SLUG = 'patong-resort-hotel-phuket';
const CURRENCY = 'THB';
/** The contract runs 1 Nov 2026 – 31 Oct 2027; undated extras expire with it. */
const VALID_TO = '2027-10-31';

const EXTRAS: Extra[] = [
  // Clause 2. Breakfast is already included in every room rate.
  { name: 'Set lunch', category: 'dining', unit: 'per_person', price: 650, child: 450,
    note: 'Child price applies to ages 4–12.' },
  { name: 'Set dinner', category: 'dining', unit: 'per_person', price: 950, child: 650,
    note: 'Child price applies to ages 4–12.' },

  // Clause 4. A child 4–12 sharing without an extra bed pays for breakfast only.
  // The room rates cover the child who takes the extra bed, not this one.
  { name: 'Breakfast for a child sharing without an extra bed', category: 'dining', unit: 'per_person', price: 200,
    note: 'Ages 4–12, per child per night. Up to two children under 12 may share with their parents: the first needs an extra bed (already in the room price), the second pays breakfast only. Children 0–3.99 share an existing bed free, breakfast included.' },
  { name: 'Baby cot', category: 'other', unit: 'per_stay', price: 0,
    note: 'Free of charge for a child under 2, but must be requested when the booking is made. Maximum one extra bed per room.' },

  // Clause 5. Two galas, only one of them compulsory.
  { name: 'Christmas Eve gala dinner', category: 'celebration', unit: 'per_person', price: 3200, child: 2000,
    validFrom: '2026-12-24', validTo: '2026-12-24',
    note: 'Optional — 24 December 2026 only. Child price applies to ages 4–12.' },
  { name: "New Year's Eve gala dinner", category: 'celebration', unit: 'per_person', price: 4300, child: 2800,
    validFrom: '2026-12-31', validTo: '2026-12-31', compulsory: true,
    note: 'Compulsory for every guest in house on 31 December 2026. The room rate for that night is deliberately not loaded, so quote 31 December by hand: room plus this supplement for each adult and child. Child price applies to ages 4–12.' },

  // Clause 3. Phuket International Airport, priced per vehicle in one direction.
  { name: 'Airport transfer — private taxi, one way', category: 'other', unit: 'per_stay', price: 1500,
    note: 'Phuket International Airport, maximum 3 passengers, per car each way. Add it twice for a return transfer.' },
  { name: 'Airport transfer — private minibus, one way', category: 'other', unit: 'per_stay', price: 1800,
    note: 'Phuket International Airport, maximum 7 passengers, per van each way. Add it twice for a return transfer.' },
];

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const db = await getDb();

  const [hotel] = await db.select({ id: schema.hotels.id, name: schema.hotels.name })
    .from(schema.hotels).where(eq(schema.hotels.slug, HOTEL_SLUG));
  if (!hotel) throw new Error(`No hotel with slug "${HOTEL_SLUG}" — nothing was changed.`);

  const existing = await db.select({ id: schema.hotelExtras.id })
    .from(schema.hotelExtras).where(eq(schema.hotelExtras.hotelId, hotel.id));

  console.log(`${hotel.name}: ${existing.length} extra(s) now, ${EXTRAS.length} to load.`);
  for (const x of EXTRAS) {
    const when = x.validFrom ? ` [${x.validFrom}]` : '';
    const child = x.child == null ? '' : ` / child ${x.child}`;
    console.log(`  ${x.compulsory ? '*' : ' '} ${x.name}${when} — ${CURRENCY} ${x.price}${child} ${x.unit}`);
  }
  if (dryRun) { console.log('\n--dry-run: nothing written.'); await closeDb(); return; }

  await db.delete(schema.hotelExtras).where(eq(schema.hotelExtras.hotelId, hotel.id));
  const rows = await db.insert(schema.hotelExtras).values(EXTRAS.map((x, i) => ({
    hotelId: hotel.id, name: x.name, category: x.category, unit: x.unit,
    priceMinor: x.price * 100, childPriceMinor: x.child == null ? null : x.child * 100,
    currency: CURRENCY, validFrom: x.validFrom ?? null, validTo: x.validTo ?? VALID_TO,
    note: x.note ?? null, compulsory: x.compulsory ?? false, sortOrder: i,
  }))).returning();

  await audit(db, SYSTEM, 'hotel.extras.replaced', 'hotel', hotel.id, {
    source: 'PATONG-PHK-2627 clauses 2, 3, 4, 5', removed: existing.length, added: rows.length,
  });

  console.log(`\nReplaced ${existing.length} extra(s) with ${rows.length}.`);
  await closeDb();
})();
