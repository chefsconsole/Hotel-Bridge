/* Uptime check: is the app up, can it reach the database, how fast? Reveals nothing sensitive. */
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    const first = Date.now() - started;
    const t2 = Date.now();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, region: process.env.VERCEL_REGION ?? 'local', dbMsFirst: first, dbMs: Date.now() - t2 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, region: process.env.VERCEL_REGION ?? 'local', error: 'database unreachable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
