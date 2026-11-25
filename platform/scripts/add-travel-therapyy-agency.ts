/* The Travel Therapyy — add as an agency on HotelBridge.
 *
 * Ronak's own B2C consumer brand, not a third-party B2B agent. It buys from
 * HotelBridge the same way any agency does, which is why it gets a real agency
 * record and a real trading code rather than a special case in the code.
 *
 * Created directly rather than through registerAgency() because that path
 * requires a password for an owner login and a PAN for an Indian agency.
 * Neither is mine to type. So:
 *   - no user is created; Ronak sets his own login from the Team screen or
 *     the normal registration flow, and picks his own password;
 *   - PAN and GSTIN are left empty and the gap is recorded in internalNotes.
 *     They are needed before we invoice this agency, not before we quote it.
 *
 * Credit stays OFF (the column default) — same as any other agency, turned on
 * by someone with finance rights or not at all.
 *
 * Safe to re-run.
 *   npx tsx scripts/add-travel-therapyy-agency.ts [--dry-run]
 */
import './env';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { agencyCode } from '@/lib/domain/grades';
import { SYSTEM } from '@/lib/services/actor';
import { audit } from '@/lib/services/audit';
import { nextNumber } from '@/lib/services/counters';

const NAME = 'The Travel Therapyy';

const NOTES = [
  'OUR OWN BRAND. Ronak owns this agency — it is HotelBridge\'s B2C consumer face, not an outside agent. Grade "key" and tagged accordingly so nobody mistakes it for third-party volume when reading the numbers.',
  'KYC OUTSTANDING: PAN and GSTIN are not on file. Required before we raise an invoice to this agency, not before we quote it. Status is verified because there is no counterparty to verify — but the tax IDs still have to be added.',
  'No owner login was created. Ronak sets his own password; nobody else should type one for him.',
  'Billing currency INR. Change it if this agency is ever billed in anything else.',
  'Note for whoever maintains both systems: Voyantra also carries "Travel Therapyy" agencies, and there are two of them there with only one holding the suppliers. This is the separate HotelBridge record for the same brand — do not assume ids match across the two systems.',
].join('\n\n');

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const db = await getDb();

  const [existing] = await db.select().from(schema.agencies).where(eq(schema.agencies.name, NAME));
  if (existing) {
    console.log(`Already an agency: ${existing.name} — ${existing.code}, status ${existing.status}. Nothing changed.`);
    await closeDb();
    return;
  }

  if (dryRun) {
    console.log(`To add: ${NAME} (India / Mumbai), grade key, status verified, INR, credit off, no owner user.`);
    console.log('--dry-run: nothing written, and no trading code consumed.');
    await closeDb();
    return;
  }

  const code = agencyCode(await nextNumber(db, 'agency'));
  const [agency] = await db.insert(schema.agencies).values({
    code,
    name: NAME,
    grade: 'key',
    tags: ['own brand', 'B2C'],
    country: 'India',
    city: 'Mumbai',
    segments: 'B2C leisure — direct consumer bookings',
    billingCurrency: 'INR',
    status: 'verified',
    verifiedAt: new Date(),
    internalNotes: NOTES,
  }).returning();

  await audit(db, SYSTEM, 'agency.created', 'agency', agency.id, {
    name: NAME, code, why: 'own B2C brand, added by the desk', kyc: 'PAN and GSTIN outstanding',
  });

  console.log(`Added ${agency.name} — ${agency.code} (${agency.id})`);
  console.log('Status verified, grade key, INR, credit off, no owner login, PAN/GSTIN outstanding.');
  await closeDb();
})();
