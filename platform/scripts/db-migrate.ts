import './env';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeDb, getDb } from '@/lib/db';

/* Embedded DB migrates itself on open. Against a server Postgres, run this on deploy. */
(async () => {
  const db = await getDb();
  if (process.env.DATABASE_URL) await migrate(db as never, { migrationsFolder: process.cwd() + '/drizzle' });
  console.log('Database is migrated.');
  await closeDb();
})().catch((e) => { console.error(e); process.exit(1); });
