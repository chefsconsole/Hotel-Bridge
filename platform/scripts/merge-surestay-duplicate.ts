/* SureStay by Best Western Iconic Ari-Jatujak exists twice in the catalogue.
 *
 * Two active hotel records, same name, same city, two different reservation
 * addresses. It has already cost us once: "ask all Bangkok hotels" asked this
 * hotel twice, from two records, with two separate reply links, and one had to
 * be cancelled by hand.
 *
 *   KEEP  fc355678  created 19 Nov. Holds the contract SURESTAY-ARI-2627, the
 *                   room type, the allotment, the tier, facilities, check-in
 *                   times and a real description. The richer record.
 *   DROP  67fbfe6c  created 12 Nov. Referenced by exactly ONE row — the
 *                   cancelled request RR-2026-0031 — and nothing else.
 *
 * But the one being dropped holds three things the keeper does not, and losing
 * them would make this merge a net loss:
 *   - the real STREET ADDRESS (the keeper has only "Ari–Jatujak, Bangkok")
 *   - accepts_groups = true and the GROUPS EMAIL. The keeper cannot take a
 *     group enquiry at all, so without this the Group Desk quietly loses a
 *     Bangkok hotel.
 *   - the contact's job title
 *
 * Those move across first. Only then is the duplicate retired.
 *
 * RETIRED, NOT DELETED: set to inactive, so the cancelled RR-2026-0031 still
 * resolves to a hotel and the audit trail stays readable. Deleting it would
 * cascade and leave that request pointing at nothing.
 *
 * NOT copied: the duplicate's summary and description are generic
 * best-rate-on-request boilerplate, and the keeper's description is real. Its
 * slug is left alone too — the keeper's is the shorter one and is the one in
 * use.
 *
 * Safe to re-run.
 *   npx tsx scripts/merge-surestay-duplicate.ts [--dry-run]
 */
import './env';
import { eq, inArray } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { SYSTEM } from '@/lib/services/actor';
import { audit } from '@/lib/services/audit';

const KEEP = 'fc355678-52de-4216-8ed3-cc467d009832';
const DROP = '67fbfe6c-aefc-43aa-8962-a112a12419cd';

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const db = await getDb();

  const rows = await db.select().from(schema.hotels).where(inArray(schema.hotels.id, [KEEP, DROP]));
  const keep = rows.find((h) => h.id === KEEP);
  const drop = rows.find((h) => h.id === DROP);
  if (!keep) throw new Error('The record to keep is missing — nothing changed.');
  if (!drop) { console.log('The duplicate is already gone. Nothing to do.'); await closeDb(); return; }
  if (keep.name !== drop.name || keep.city !== drop.city) {
    throw new Error(`These are not the same hotel ("${keep.name}" vs "${drop.name}") — refusing to merge.`);
  }

  /* Re-check that nothing but the one cancelled request points at the
   * duplicate. If something new has attached itself since this was written,
   * stop rather than orphan it. */
  const blockers: string[] = [];
  const [cs, rts, bs, ex, sv, pr] = await Promise.all([
    db.select({ id: schema.contracts.id }).from(schema.contracts).where(eq(schema.contracts.hotelId, DROP)),
    db.select({ id: schema.roomTypes.id }).from(schema.roomTypes).where(eq(schema.roomTypes.hotelId, DROP)),
    db.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.hotelId, DROP)),
    db.select({ id: schema.hotelExtras.id }).from(schema.hotelExtras).where(eq(schema.hotelExtras.hotelId, DROP)),
    db.select({ hotelId: schema.savedHotels.hotelId }).from(schema.savedHotels).where(eq(schema.savedHotels.hotelId, DROP)),
    db.select({ id: schema.hotelProspects.id }).from(schema.hotelProspects).where(eq(schema.hotelProspects.hotelId, DROP)),
  ]);
  if (cs.length) blockers.push(`${cs.length} contract(s)`);
  if (rts.length) blockers.push(`${rts.length} room type(s)`);
  if (bs.length) blockers.push(`${bs.length} booking(s)`);
  if (ex.length) blockers.push(`${ex.length} extra(s)`);
  if (sv.length) blockers.push(`${sv.length} saved-hotel row(s)`);
  if (pr.length) blockers.push(`${pr.length} prospect(s)`);
  if (blockers.length) {
    throw new Error(`The duplicate now has ${blockers.join(', ')} attached. Move those first — refusing to retire it.`);
  }

  const requests = await db.select({ reference: schema.rateRequests.reference, status: schema.rateRequests.status })
    .from(schema.rateRequests).where(eq(schema.rateRequests.hotelId, DROP));
  const live = requests.filter((r) => !['cancelled', 'expired', 'no_response', 'declined'].includes(r.status));
  if (live.length) {
    throw new Error(`The duplicate has live request(s) ${live.map((r) => `${r.reference} (${r.status})`).join(', ')}. Close them first — refusing.`);
  }

  // Only fill a gap on the keeper; never overwrite something it already says.
  const patch: Record<string, unknown> = {};
  const vagueAddress = !keep.address || keep.address.length < (drop.address?.length ?? 0) / 2;
  if (drop.address && vagueAddress) patch.address = drop.address;
  if (!keep.acceptsGroups && drop.acceptsGroups) patch.acceptsGroups = true;
  if (!keep.groupsEmail && drop.groupsEmail) patch.groupsEmail = drop.groupsEmail;
  if (!keep.groupNotes && drop.groupNotes) patch.groupNotes = drop.groupNotes;
  if (drop.contactName && (drop.contactName.length > (keep.contactName?.length ?? 0))) patch.contactName = drop.contactName;
  if (!keep.contactEmail && drop.contactEmail) patch.contactEmail = drop.contactEmail;
  if (!keep.totalRooms && drop.totalRooms) patch.totalRooms = drop.totalRooms;

  console.log(`Keeping   ${keep.name} [${KEEP.slice(0, 8)}]  status=${keep.status}`);
  console.log(`Retiring  ${drop.name} [${DROP.slice(0, 8)}]  status=${drop.status}`);
  console.log(`Requests on the duplicate: ${requests.length ? requests.map((r) => `${r.reference} (${r.status})`).join(', ') : 'none'}`);
  console.log(`\nMoving onto the keeper: ${Object.keys(patch).length ? '' : 'nothing — it already has everything'}`);
  for (const [k, v] of Object.entries(patch)) console.log(`  ${k} = ${JSON.stringify(v)}`);

  if (dryRun) { console.log('\n--dry-run: nothing written.'); await closeDb(); return; }

  if (Object.keys(patch).length) {
    await db.update(schema.hotels).set({ ...patch, updatedAt: new Date() }).where(eq(schema.hotels.id, KEEP));
  }
  await db.update(schema.hotels)
    .set({ status: 'inactive', bestRateOnRequest: false, acceptsGroups: false, updatedAt: new Date() })
    .where(eq(schema.hotels.id, DROP));

  await audit(db, SYSTEM, 'hotel.duplicate_retired', 'hotel', DROP, {
    name: drop.name, mergedInto: KEEP, moved: Object.keys(patch),
    why: 'two active records for one hotel; it was asked twice in one best-rate round',
    retiredNotDeleted: 'the cancelled request RR-2026-0031 still points at this row',
  });
  await audit(db, SYSTEM, 'hotel.duplicate_merged', 'hotel', KEEP, { from: DROP, moved: Object.keys(patch) });

  console.log('\nDone. The duplicate is inactive, off best-rate-on-request and off groups.');
  await closeDb();
})();
