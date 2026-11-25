/* voco Dubai (IHG), Sheikh Zayed Road — add as a hotel prospect.
 *
 * Inbound: the hotel's Senior Sales Manager for Leisure & MICE wrote to
 * introduce herself after joining, and invited enquiries. That makes this a
 * warm contact in a market we sell, which is why it goes in at P1.
 *
 * The CONTACT DETAILS ARE NOT IN THIS FILE. A named person's direct email and
 * mobile do not belong in version control; they belong in the prospect record,
 * which is where /admin/prospects reads them from. Pass them in when running
 * this, from her email signature:
 *
 *   VOCO_CONTACT_NAME, VOCO_CONTACT_ROLE, VOCO_CONTACT_EMAIL, VOCO_CONTACT_PHONE
 *
 * Room count, star tier and rate type are not in her email either, and are
 * left empty rather than guessed.
 *
 * Safe to re-run — the name + destination pair is unique.
 *   npx tsx scripts/add-voco-dubai.ts [--dry-run]
 */
import './env';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { SYSTEM } from '@/lib/services/actor';
import { audit } from '@/lib/services/audit';

const NAME = 'voco Dubai';
const DESTINATION = 'Dubai — Sheikh Zayed Road';

const PROSPECT = {
  name: NAME,
  destination: DESTINATION,
  region: 'UAE',
  priority: 'P1',
  // The name and contact come from the hotel's own sales manager, on an
  // @ihg.com address, so there is nothing left to verify.
  nameChecked: true,
  // She approached us, so the relationship is open — but we have asked for
  // nothing yet, which is what the next step is for.
  stage: 'contacted',
  contactName: process.env.VOCO_CONTACT_NAME || null,
  contactRole: process.env.VOCO_CONTACT_ROLE || 'Senior Sales Manager — Leisure & MICE',
  contactEmail: process.env.VOCO_CONTACT_EMAIL || null,
  contactPhone: process.env.VOCO_CONTACT_PHONE || null,
  contactSource: 'Inbound introduction email from the hotel, 25 Nov 2026',
  nextStep: 'Reply with the HotelBridge profile and ask for 2027 Leisure (FIT) contract rates, net, and whether B2B distribution is permitted',
  nextStepOn: '2026-11-27',
  lastContactOn: '2026-11-25',
  notes: [
    'Brand styles the name lowercase, "voco Dubai". IHG upscale brand.',
    'Sheikh Zayed Road, PO Box 9940, Dubai, UAE. vocohotels.com/dubai — the hotel switchboard and the manager\'s direct line are on the prospect record, not in this script.',
    'She covers Leisure AND MICE, so this is a Group Desk contact as well as an FIT one.',
    'Room count, star tier and whether rates are net or commissionable are not stated in her email — ask, do not assume.',
  ].join('\n'),
};

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const db = await getDb();

  const [existing] = await db.select().from(schema.hotelProspects).where(and(
    eq(schema.hotelProspects.name, NAME), eq(schema.hotelProspects.destination, DESTINATION),
  ));
  if (existing) {
    console.log(`Already a prospect: ${existing.name} (${existing.destination}) — stage ${existing.stage}, contact ${existing.contactName ?? 'none'}. Nothing changed.`);
    await closeDb();
    return;
  }

  console.log(`To add: ${PROSPECT.name} — ${PROSPECT.destination}`);
  console.log(`  ${PROSPECT.contactName ?? 'no contact name given'}, ${PROSPECT.contactRole}`);
  console.log(`  contact details ${PROSPECT.contactEmail ? 'supplied' : 'NOT supplied — set VOCO_CONTACT_* to record them'}`);
  console.log(`  stage=${PROSPECT.stage} priority=${PROSPECT.priority} next step ${PROSPECT.nextStepOn}`);
  if (dryRun) { console.log('\n--dry-run: nothing written.'); await closeDb(); return; }

  const [row] = await db.insert(schema.hotelProspects).values(PROSPECT).returning();
  await audit(db, SYSTEM, 'prospect.added', 'hotel_prospect', row.id, {
    name: NAME, destination: DESTINATION, source: 'inbound introduction from the hotel',
  });
  console.log(`\nAdded. Open it at /admin/prospects — id ${row.id}`);
  await closeDb();
})();
