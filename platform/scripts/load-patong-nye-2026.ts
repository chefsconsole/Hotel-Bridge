/* Patong Resort Hotel — make 31 December 2026 sellable.
 *
 * The contract (PATONG-PHK-2627, clause 5) makes the New Year's Eve gala
 * dinner compulsory: THB 4,300 an adult, THB 2,800 a child 4–12. When the
 * rates were first loaded the engine could only add a supplement per room per
 * night, so that night was deliberately left unpriced rather than quoted as a
 * room alone — which would have absorbed the gala for every guest.
 *
 * The engine now charges supplements per person, so this script:
 *   1. records the gala as a per-person supplement on the contract, and
 *   2. extends December's rate period to cover the 31st.
 *
 * Period B of the contract runs 1 Dec 2026 – 31 Jan 2027 and was loaded as
 * 1–30 Dec plus 1–31 Jan. Extending December to the 31st restores the
 * contract's own range; the prices are unchanged.
 *
 * ORDER MATTERS: the per-person charge is only applied by the new engine. The
 * contract is still draft with distribution off, so nothing can be quoted
 * either way — but deploy before activating it, or a 31 December quote would
 * add the gala once per room instead of once per guest.
 *
 * Safe to re-run.
 *   npx tsx scripts/load-patong-nye-2026.ts [--dry-run]
 */
import './env';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { SYSTEM } from '@/lib/services/actor';
import { audit } from '@/lib/services/audit';

const CONTRACT = 'e60de7b9-1f06-4384-bd07-1113c96599db';
const NYE = '2026-12-31';
const GALA_ADULT_MINOR = 430_000;
const GALA_CHILD_MINOR = 280_000;

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const db = await getDb();

  const [c] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, CONTRACT));
  if (!c) throw new Error('Patong contract not found — nothing was changed.');
  console.log(`Contract ${c.reference}: status=${c.status}, distribution=${c.distributionPermitted}`);

  const existing = await db.select().from(schema.restrictions).where(and(
    eq(schema.restrictions.contractId, CONTRACT), eq(schema.restrictions.dateFrom, NYE),
  ));

  const decPeriods = await db.select().from(schema.ratePeriods).where(and(
    eq(schema.ratePeriods.contractId, CONTRACT), eq(schema.ratePeriods.dateFrom, '2026-12-01'),
  ));
  const toExtend = decPeriods.filter((p) => p.dateTo === '2026-12-30');

  console.log(`\nGala supplement on ${NYE}: ${existing.length ? 'already present' : 'to be added'} — THB ${GALA_ADULT_MINOR / 100} adult / ${GALA_CHILD_MINOR / 100} child, per person per night.`);
  console.log(`December rate periods ending 30 Dec: ${toExtend.length} (of ${decPeriods.length}) — extending to 31 Dec.`);
  if (dryRun) { console.log('\n--dry-run: nothing written.'); await closeDb(); return; }

  if (!existing.length) {
    await db.insert(schema.restrictions).values({
      contractId: CONTRACT, roomTypeId: null, kind: 'supplement',
      dateFrom: NYE, dateTo: NYE, basis: 'per_person',
      amountMinor: GALA_ADULT_MINOR, childAmountMinor: GALA_CHILD_MINOR,
      note: 'Compulsory New Year’s Eve gala dinner (contract clause 5)',
    });
    await audit(db, SYSTEM, 'restriction.supplement', 'contract', CONTRACT, {
      night: NYE, basis: 'per_person', adultMinor: GALA_ADULT_MINOR, childMinor: GALA_CHILD_MINOR,
      source: 'PATONG-PHK-2627 clause 5',
    });
  }

  for (const p of toExtend) {
    await db.update(schema.ratePeriods).set({ dateTo: NYE }).where(eq(schema.ratePeriods.id, p.id));
  }
  if (toExtend.length) {
    await audit(db, SYSTEM, 'rate.extended', 'contract', CONTRACT, {
      from: '2026-12-30', to: NYE, periods: toExtend.length,
      why: 'New Year’s Eve is priceable now that the compulsory gala is enforced per person',
    });
  }

  console.log(`\nDone. Gala supplement ${existing.length ? 'was already in place' : 'added'}; ${toExtend.length} rate period(s) extended to 31 Dec.`);
  await closeDb();
})();
