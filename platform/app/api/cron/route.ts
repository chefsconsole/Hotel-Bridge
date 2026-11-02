/* Scheduled housekeeping, called by the host's scheduler (e.g. Vercel Cron,
 * which sends "Authorization: Bearer $CRON_SECRET"). Releases unpaid holds and
 * lapses hotel, group and best-rate requests that weren't answered in time. Safe to run often:
 * every job only acts on what is overdue. Without CRON_SECRET it never runs. */
import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/lib/db';
import { expireUnpaidHolds, lapseUnansweredRequests } from '@/lib/services/bookings';
import { lapseGroupRequests } from '@/lib/services/group-desk';
import { lapseRateRequests } from '@/lib/services/rate-requests';

export const dynamic = 'force-dynamic';

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return Response.json({ error: 'CRON_SECRET is not set' }, { status: 503 });
  if (!authorised(req)) return Response.json({ error: 'Unauthorised' }, { status: 401 });
  const db = await getDb();
  const releasedHolds = await expireUnpaidHolds(db);
  const lapsedRequests = await lapseUnansweredRequests(db);
  const lapsedGroupRequests = await lapseGroupRequests(db);
  const lapsedRateRequests = await lapseRateRequests(db);
  return Response.json({ ok: true, at: new Date().toISOString(), releasedHolds, lapsedRequests, lapsedGroupRequests, lapsedRateRequests });
}
