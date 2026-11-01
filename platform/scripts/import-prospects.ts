import './env';
import { readFileSync } from 'node:fs';
import { closeDb, getDb } from '@/lib/db';
import { SYSTEM } from '@/lib/services/actor';
import { importProspects } from '@/lib/services/prospects';

/* npm run import:prospects -- [path]   (default: docs/hotel-targets.csv)
 * Loads the hotel research list into Hotel outreach. Existing hotels are skipped,
 * so it is safe to run again after the list grows. Stop the dev server first. */
(async () => {
  const path = process.argv[2] ?? 'docs/hotel-targets.csv';
  const db = await getDb();
  const r = await importProspects(db, SYSTEM, readFileSync(path, 'utf8'));
  console.log(`Hotel outreach: ${r.added} added, ${r.skipped} already there (${r.rows} rows in ${path}).`);
  await closeDb();
})().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
