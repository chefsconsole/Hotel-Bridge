/* The Travel Therapyy — best-rate requests for a couple, Bangkok then Phuket.
 *
 *   Bangkok  29 Nov – 3 Dec 2026  (4 nights)
 *   Phuket    3 Dec –  9 Dec 2026 (6 nights)
 *   1 room, 2 adults, no children.
 *
 * Ronak asked for every on-request hotel in both cities, including Patong
 * Resort and Centre Point Sukhumvit 10 whose contracts are still awaiting our
 * countersignature.
 *
 * ONE DELIBERATE EXCLUSION: SureStay Ari-Jatujak exists TWICE in the
 * catalogue, as two active hotels with two different reservation addresses.
 * Asking "all" would send the same hotel two separate requests from two
 * records, which looks careless and splits any reply. Only the record that
 * holds the contract is asked. The duplicate still needs merging — that is a
 * separate job, and nothing here fixes it.
 *
 * Phuket is asked even though we already hold 34 contracted offers for those
 * dates. That is Ronak's call: the contracted rates are the floor, and these
 * replies are the comparison.
 *
 * WHAT THIS SENDS: one email per hotel, from the portal, with a private
 * one-click reply link. 21 hotels. The agency and any budget are never shown
 * to a hotel. --dry-run lists every recipient and sends nothing.
 *
 *   npx tsx scripts/ask-therapyy-bkk-hkt-bestrates.ts --dry-run
 *   npx tsx scripts/ask-therapyy-bkk-hkt-bestrates.ts --send
 */
import './env';
import { and, eq, isNull } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { SYSTEM, type Actor } from '@/lib/services/actor';
import { askHotels, createRateRequest, onRequestHotels, quotesInHouse } from '@/lib/services/rate-requests';

const AGENCY = '6d339e53-5f2e-4c99-a423-f6a4949bbc0a'; // The Travel Therapyy, HB-A0004
const AUTHOR = '69e5620c-4811-4ef9-92f9-25bee99c6cc8'; // Ronak Dhanwani (admin) — he asked for these
/** The SureStay record WITHOUT the contract. The duplicate, so not asked. */
const SURESTAY_DUPLICATE = '67fbfe6c';

/** Acts for the agency, not as staff: this is the agency's own enquiry. */
const AS_AGENCY: Actor = {
  userId: AUTHOR, label: 'The Travel Therapyy (raised by the desk)',
  platformRole: null, agencyId: AGENCY, agencyRole: 'owner', partnerHotelId: null,
};

const LEGS = [
  { city: 'Bangkok', checkIn: '2026-11-29', checkOut: '2026-12-03' },
  { city: 'Phuket', checkIn: '2026-12-03', checkOut: '2026-12-09' },
];
const ROOMS = [{ adults: 2, childAges: [] as number[] }];
const NOTES = 'Couple travelling Bangkok then Phuket on consecutive dates. Best available B2B rate please — room only or with breakfast, whichever is your best offer.';

(async () => {
  const send = process.argv.includes('--send');
  const dryRun = !send;
  const db = await getDb();

  const [ag] = await db.select().from(schema.agencies).where(eq(schema.agencies.id, AGENCY));
  if (!ag) throw new Error('Agency not found — nothing was sent.');
  console.log(`Agency: ${ag.name} (${ag.code}), status ${ag.status}\n`);

  for (const leg of LEGS) {
    const all = await onRequestHotels(db, leg.city);
    const targets = all.filter((h) => !h.id.startsWith(SURESTAY_DUPLICATE));
    const dropped = all.length - targets.length;

    console.log(`${leg.city} ${leg.checkIn} -> ${leg.checkOut}: ${targets.length} hotel(s)${dropped ? `, ${dropped} duplicate skipped` : ''}`);
    for (const h of targets) {
      const email = h.rateRequestEmail ?? h.reservationsEmail ?? h.contactEmail ?? null;
      console.log(`   ${quotesInHouse(email) ? 'in-house' : 'email   '}  ${h.name}  ${email}`);
    }

    if (dryRun) { console.log(''); continue; }

    // Does this leg already have a request? Never raise a second one.
    const existing = await db.select().from(schema.rateRequests).where(and(
      eq(schema.rateRequests.agencyId, AGENCY), eq(schema.rateRequests.city, h0(targets)),
      eq(schema.rateRequests.checkIn, leg.checkIn), isNull(schema.rateRequests.parentId),
    ));
    let rootId = existing[0]?.id;
    if (rootId) {
      console.log(`   root already exists (${existing[0].reference}) — adding any hotels not yet asked`);
    } else {
      const root = await createRateRequest(db, AS_AGENCY, {
        hotelId: targets[0].id, checkIn: leg.checkIn, checkOut: leg.checkOut, rooms: ROOMS, notes: NOTES,
      });
      rootId = root.id;
      console.log(`   raised ${root.reference}`);
    }

    const res = await askHotels(db, SYSTEM, rootId, targets.map((h) => h.id), { email: true });
    console.log(`   emailed ${res.emailed.length}: ${res.emailed.join(', ') || '—'}`);
    if (res.failed.length) console.log(`   FAILED ${res.failed.length}: ${res.failed.join(', ')}`);
    if (res.skipped.length) console.log(`   skipped: ${res.skipped.join(', ')}`);
    if (res.inHouse.length) console.log(`   in-house (no email, quote from our own contract): ${res.inHouse.join(', ')}`);
    console.log('');
  }

  if (dryRun) console.log('--dry-run: nothing raised, nothing emailed. Re-run with --send.');
  await closeDb();
})();

/** The city as the catalogue spells it, so the lookup matches what was stored. */
function h0(targets: { city: string }[]) {
  return targets[0].city;
}
