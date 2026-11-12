/* ------------------------------------------------------------------ *
 * The live pipeline for the admin overview: every open enquiry and
 * booking, by stage, counted from real records. Demo/sample agencies are
 * counted separately so the real numbers stay honest.
 * ------------------------------------------------------------------ */
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { addDays, todayIso } from '@/lib/domain/dates';
import { SYSTEM } from './actor';
import { BOARD_STAGES } from './group-board';
import { STAGE_LABEL } from './groups';
import { listRateRequests } from './rate-requests';

export type Stage = { label: string; n: number; demo: number; href: string; tone: 'attention' | 'pending' | 'positive' | 'neutral' };

export async function livePipeline(db: DB) {
  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;

  // Best rate on request — one row per agent request.
  const rr = await listRateRequests(db, SYSTEM);
  const count = (f: (r: (typeof rr)[number]) => boolean) => ({ n: rr.filter((r) => !r.sample && f(r)).length, demo: rr.filter((r) => r.sample && f(r)).length });
  const bestRate: Stage[] = [
    { label: 'New — ask hotels', ...count((r) => r.needsAsking || r.toQuoteInHouse), href: '/admin/rate-requests', tone: 'attention' },
    { label: 'Hotel replies to check', ...count((r) => r.toReview > 0), href: '/admin/rate-requests', tone: 'attention' },
    { label: 'Waiting on hotels', ...count((r) => r.state === 'working' && r.waiting > 0 && !r.toReview), href: '/admin/rate-requests', tone: 'pending' },
    { label: 'Offers with agents', ...count((r) => r.state === 'offers'), href: '/admin/rate-requests', tone: 'positive' },
    { label: 'Accepted — confirm', ...count((r) => r.state === 'accepted'), href: '/admin/rate-requests', tone: 'attention' },
    { label: 'Booked this month', ...count((r) => r.state === 'booked' && r.updatedAt.toISOString().slice(0, 10) >= monthStart), href: '/admin/rate-requests', tone: 'positive' },
  ];

  // Group Desk — open stages, plus won this month.
  const groups = await db.select({ status: schema.groupEnquiries.status, sample: schema.groupEnquiries.isSample, n: sql<number>`count(*)::int` })
    .from(schema.groupEnquiries).where(inArray(schema.groupEnquiries.status, [...BOARD_STAGES])).groupBy(schema.groupEnquiries.status, schema.groupEnquiries.isSample);
  const won = await db.select({ sample: schema.groupEnquiries.isSample, n: sql<number>`count(*)::int` }).from(schema.groupEnquiries)
    .where(and(eq(schema.groupEnquiries.status, 'won'), gte(schema.groupEnquiries.updatedAt, new Date(`${monthStart}T00:00:00Z`)))).groupBy(schema.groupEnquiries.isSample);
  const g = (st: string) => ({ n: groups.filter((x) => x.status === st && !x.sample).reduce((a, x) => a + x.n, 0), demo: groups.filter((x) => x.status === st && x.sample).reduce((a, x) => a + x.n, 0) });
  const groupStages: Stage[] = [
    ...BOARD_STAGES.map((st) => ({ label: STAGE_LABEL[st], ...g(st), href: '/admin/groups', tone: (st === 'new' || st === 'offers_received' ? 'attention' : st === 'sent_to_agent' ? 'positive' : 'pending') as Stage['tone'] })),
    { label: 'Won this month', n: won.filter((x) => !x.sample).reduce((a, x) => a + x.n, 0), demo: won.filter((x) => x.sample).reduce((a, x) => a + x.n, 0), href: '/admin/groups?view=list', tone: 'positive' },
  ];

  // Bookings — what is in flight.
  const b = schema.bookings;
  const byStatus = await db.select({ status: b.status, sample: b.isSample, n: sql<number>`count(*)::int` }).from(b)
    .where(inArray(b.status, ['awaiting_payment', 'pending_confirmation', 'outcome_unknown', 'cancellation_requested'])).groupBy(b.status, b.isSample);
  const arriving = await db.select({ sample: b.isSample, n: sql<number>`count(*)::int` }).from(b)
    .where(and(eq(b.status, 'confirmed'), gte(b.checkIn, today), lte(b.checkIn, addDays(today, 7)))).groupBy(b.isSample);
  const bs = (st: string) => ({ n: byStatus.filter((x) => x.status === st && !x.sample).reduce((a, x) => a + x.n, 0), demo: byStatus.filter((x) => x.status === st && x.sample).reduce((a, x) => a + x.n, 0) });
  const bookingStages: Stage[] = [
    { label: 'Awaiting payment', ...bs('awaiting_payment'), href: '/admin/bookings?status=awaiting_payment', tone: 'attention' },
    { label: 'Hotel confirming', ...bs('pending_confirmation'), href: '/admin/bookings?status=pending_confirmation', tone: 'pending' },
    { label: 'Outcome unknown', ...bs('outcome_unknown'), href: '/admin/bookings?status=outcome_unknown', tone: 'attention' },
    { label: 'Cancellation asked', ...bs('cancellation_requested'), href: '/admin/bookings?status=cancellation_requested', tone: 'attention' },
    { label: 'Arriving in 7 days', n: arriving.filter((x) => !x.sample).reduce((a, x) => a + x.n, 0), demo: arriving.filter((x) => x.sample).reduce((a, x) => a + x.n, 0), href: '/admin/tracker', tone: 'positive' },
  ];

  return { bestRate, groups: groupStages, bookings: bookingStages };
}
