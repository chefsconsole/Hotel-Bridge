/* Patong Resort Hotel — load the Early Bird discount.
 *
 * The contract (PATONG-PHK-2627) offers 10% off for booking 30+ days before
 * arrival and 15% for 60+ days, for stays 1 Nov 2026 – 31 Oct 2027, with
 * 20 Dec 2026 – 20 Jan 2027 excluded, and never on meal or gala supplements.
 *
 * Until now the engine had no booking-lead-time discount at all, so this was
 * margin we neither passed on nor captured on every advance booking. It does
 * now, and the discount comes off the room rate only — the compulsory New
 * Year's Eve gala is money the hotel passes through, not ours to discount.
 *
 * The 20 Dec – 20 Jan exclusion is loaded as a GAP between each tier's two
 * rows rather than as a flag: a night no row covers simply gets no discount.
 * That is why there are four rows for two tiers.
 *
 * The contract is still draft with distribution off, so nothing can be quoted
 * either way until it is countersigned and activated.
 *
 * Safe to re-run.
 *   npx tsx scripts/load-patong-early-bird.ts [--dry-run]
 */
import './env';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { SYSTEM } from '@/lib/services/actor';
import { audit } from '@/lib/services/audit';

const CONTRACT = 'e60de7b9-1f06-4384-bd07-1113c96599db';

/* Stays 1 Nov 26 – 31 Oct 27, less the 20 Dec – 20 Jan blackout. */
const WINDOWS = [
  { dateFrom: '2026-11-01', dateTo: '2026-12-19' },
  { dateFrom: '2027-01-21', dateTo: '2027-10-31' },
];
const TIERS = [
  { minLeadDays: 30, discountBps: 1000 },
  { minLeadDays: 60, discountBps: 1500 },
];
const NOTE = 'Early Bird (PATONG-PHK-2627): 10% at 30+ days, 15% at 60+. Room rate only — never on meal or gala supplements. Excludes 20 Dec 26 – 20 Jan 27.';

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const db = await getDb();

  const [c] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, CONTRACT));
  if (!c) throw new Error('Patong contract not found — nothing was changed.');
  console.log(`Contract ${c.reference}: status=${c.status}, distribution=${c.distributionPermitted}, currency=${c.currency}`);

  const existing = await db.select().from(schema.rateDiscounts)
    .where(and(eq(schema.rateDiscounts.contractId, CONTRACT), eq(schema.rateDiscounts.kind, 'early_bird')));

  const wanted = WINDOWS.flatMap((w) => TIERS.map((t) => ({ ...w, ...t })));
  const missing = wanted.filter((x) => !existing.some((e) =>
    e.dateFrom === x.dateFrom && e.dateTo === x.dateTo && e.minLeadDays === x.minLeadDays && e.discountBps === x.discountBps));

  console.log(`\nEarly Bird tiers already loaded: ${existing.length} of ${wanted.length}.`);
  for (const x of wanted) {
    const here = !missing.includes(x);
    console.log(`  ${x.dateFrom} .. ${x.dateTo}  ${x.minLeadDays}+ days  ${x.discountBps / 100}%  ${here ? '(present)' : '-> to be added'}`);
  }
  if (dryRun) { console.log('\n--dry-run: nothing written.'); await closeDb(); return; }
  if (!missing.length) { console.log('\nNothing to do.'); await closeDb(); return; }

  await db.insert(schema.rateDiscounts).values(missing.map((x) => ({
    contractId: CONTRACT, roomTypeId: null, kind: 'early_bird',
    dateFrom: x.dateFrom, dateTo: x.dateTo,
    minLeadDays: x.minLeadDays, discountBps: x.discountBps,
    active: true, note: NOTE,
  })));
  await audit(db, SYSTEM, 'rate.discount_loaded', 'contract', CONTRACT, {
    kind: 'early_bird', rows: missing.length, tiers: TIERS, windows: WINDOWS,
    excludes: '2026-12-20..2027-01-20',
    source: 'PATONG-PHK-2627 Early Bird clause',
  });

  console.log(`\nDone. ${missing.length} tier row(s) added. The contract is still ${c.status} — activate it before anything quotes.`);
  await closeDb();
})();
