/* npm run backfill:codes
 *
 * Issues a trading code to every agency and agent that pre-dates codes, and
 * leaves the counter where the next new agency carries on from.
 *
 * Idempotent: anything that already has a code is left exactly as it is, so a
 * code is issued once and never changes. Order is by registration date, so the
 * oldest agency is HB-A0001 and the numbering reads like a real ledger.
 */
import './env';
import { asc, isNull, sql } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { agencyCode, agentCode } from '@/lib/domain/grades';

(async () => {
  const db = await getDb();
  const dryRun = process.argv.includes('--dry-run');

  const existing = await db.select({ code: schema.agencies.code }).from(schema.agencies).where(sql`code is not null`);
  // Carry on from the highest code already issued, so re-running never collides.
  let next = existing.reduce((max, a) => {
    const n = Number((a.code ?? '').replace(/^HB-A/, ''));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  const agencies = await db.select().from(schema.agencies).where(isNull(schema.agencies.code)).orderBy(asc(schema.agencies.createdAt));
  console.log(`${agencies.length} agenc${agencies.length === 1 ? 'y' : 'ies'} without a code (next free number: ${next + 1})`);

  for (const a of agencies) {
    const code = agencyCode(++next);
    console.log(`${dryRun ? 'Would issue' : 'Issuing'} ${code} → ${a.name}`);
    if (dryRun) continue;
    await db.update(schema.agencies).set({ code, updatedAt: new Date() }).where(sql`id = ${a.id}`);
  }

  // Seat codes: owners first so the owner reliably takes 01.
  const withCode = await db.select().from(schema.agencies).where(sql`code is not null`);
  let seats = 0;
  for (const a of withCode) {
    const users = await db.select().from(schema.users).where(sql`agency_id = ${a.id}`)
      .orderBy(sql`case when agency_role = 'owner' then 0 else 1 end`, asc(schema.users.createdAt));
    let seat = 0;
    for (const u of users) {
      seat++;
      if (u.code) continue;
      const code = agentCode(a.code!, seat);
      console.log(`${dryRun ? 'Would issue' : 'Issuing'} ${code} → ${u.name} (${a.name})`);
      if (!dryRun) await db.update(schema.users).set({ code }).where(sql`id = ${u.id}`);
      seats++;
    }
  }

  // Leave the shared counter past everything issued, so the next registration
  // does not reuse a number this backfill just handed out.
  if (!dryRun && next > 0) {
    await db.execute(sql`
      insert into counters (name, value) values ('agency', ${next})
      on conflict (name) do update set value = greatest(counters.value, ${next})`);
  }

  console.log(dryRun ? `Dry run: ${agencies.length} agency code(s), ${seats} seat code(s).` : `Done: ${agencies.length} agency code(s), ${seats} seat code(s). Counter at ${next}.`);
  await closeDb();
  process.exit(0);
})();
