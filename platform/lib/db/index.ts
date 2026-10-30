/* ------------------------------------------------------------------ *
 * One database, two drivers.
 *
 *  - No DATABASE_URL  -> PGlite: real PostgreSQL (WASM) in-process, data in
 *    .data/pg. Zero setup for local development.
 *  - DATABASE_URL set -> postgres-js against Supabase / Neon / RDS.
 *
 * The database is opened LAZILY on first use. Opening at import time lets
 * Next's build/dev workers open a second copy of the embedded database and
 * corrupt it (learned the hard way on the Unnatti app). Never change that.
 * ------------------------------------------------------------------ */
import * as schema from './schema';

export type DB =
  | import('drizzle-orm/pglite').PgliteDatabase<typeof schema>
  | import('drizzle-orm/postgres-js').PostgresJsDatabase<typeof schema>;

/** A transaction handle; same query surface as DB. */
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
export type Executor = DB | Tx;

type Handle = { db: DB; ready: Promise<unknown>; close: () => Promise<void> };

declare global {
  var __hbDb: Handle | undefined;
}

const MIGRATIONS_FOLDER = process.cwd() + '/drizzle';

function assertHostable() {
  const hosted = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    || process.env.NETLIFY || process.env.RENDER || process.env.FLY_APP_NAME;
  if (!hosted || process.env.DATABASE_URL) return;
  throw new Error('No DATABASE_URL on the host. The embedded database needs a real disk — set DATABASE_URL to a Postgres connection string.');
}

function create(): Handle {
  const url = process.env.DATABASE_URL;
  /* eslint-disable @typescript-eslint/no-require-imports */
  if (url) {
    const postgres = require('postgres');
    const { drizzle } = require('drizzle-orm/postgres-js');
    const client = postgres(url, { max: Number(process.env.DATABASE_MAX_CONNECTIONS) || 10, prepare: false });
    const db = drizzle(client, { schema }) as DB;
    // Against a server database, migrations are an explicit deploy step.
    return { db, ready: Promise.resolve(), close: () => client.end() };
  }
  assertHostable();
  const { PGlite } = require('@electric-sql/pglite');
  const fs = require('node:fs');
  const { drizzle } = require('drizzle-orm/pglite');
  const { migrate } = require('drizzle-orm/pglite/migrator');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const dir = process.env.PGLITE_DIR || process.cwd() + '/.data/pg';
  fs.mkdirSync(dir, { recursive: true });
  takeLock(dir, fs);
  const client = new PGlite(dir);
  const db = drizzle(client, { schema }) as DB;
  const ready = (async () => {
    await client.waitReady;
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  })();
  const close = async () => {
    try { await client.close(); } catch { /* already closed */ }
    try { if (Number(fs.readFileSync(dir + '.lock', 'utf8')) === process.pid) fs.unlinkSync(dir + '.lock'); } catch { /* ignore */ }
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(sig, () => { void close().then(() => process.exit(0)); });
  }
  return { db, ready, close };
}

/** One process per embedded data directory. */
function takeLock(dir: string, fs: typeof import('node:fs')) {
  const lock = dir + '.lock';
  try {
    const holder = Number(fs.readFileSync(lock, 'utf8').trim());
    if (holder && holder !== process.pid) {
      let alive = false;
      try { process.kill(holder, 0); alive = true; } catch { /* dead */ }
      if (alive) {
        throw new Error(`The embedded database at ${dir} is already open in process ${holder}. Stop the app before running scripts, or set DATABASE_URL.`);
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('The embedded database')) throw e;
  }
  fs.writeFileSync(lock, String(process.pid));
}

/** The database, ready to query (migrated, for the embedded one). */
export async function getDb(): Promise<DB> {
  if (!globalThis.__hbDb) globalThis.__hbDb = create();
  await globalThis.__hbDb.ready;
  return globalThis.__hbDb.db;
}

export async function closeDb() {
  const h = globalThis.__hbDb;
  globalThis.__hbDb = undefined;
  if (h) await h.close();
}

/** For tests: a fresh in-memory database with all migrations applied. */
export async function createMemoryDb(): Promise<{ db: DB; close: () => Promise<void> }> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { PGlite } = require('@electric-sql/pglite');
  const { drizzle } = require('drizzle-orm/pglite');
  const { migrate } = require('drizzle-orm/pglite/migrator');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const client = new PGlite();
  const db = drizzle(client, { schema }) as DB;
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, close: () => client.close() };
}

export { schema };
