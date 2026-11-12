/* ------------------------------------------------------------------ *
 * The agent's "Today": one ranked list of everything that needs them,
 * a pulse of their real numbers this month, and a live activity feed.
 * Everything is read from the agency's own records — nothing estimated.
 * ------------------------------------------------------------------ */
import { and, desc, eq, gte, inArray, isNull, lte, notInArray, sql } from 'drizzle-orm';
import { WORKING } from './rate-requests';
import { schema, type DB } from '@/lib/db';
import { addDays, daysBetween, formatDate, todayIso } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { agencyOf, type Actor } from './actor';

const { rateRequests: rr, bookings: bk, hotels: ht, groupEnquiries: ge, groupProposals: gp, trips: tr, clients: cl } = schema;

/** now: act today · soon: act this week · waiting: someone else's move, shown so nothing feels lost. */
export type Urgency = 'now' | 'soon' | 'waiting';
export type InboxItem = {
  key: string; kind: 'offer' | 'payment' | 'proposal' | 'follow_up' | 'arrival' | 'asked' | 'confirming';
  title: string; detail: string; href: string; cta: string; urgency: Urgency;
  /** Sort key within an urgency: the deadline or the time it happened. */
  at: number;
};

const ORDER: Record<Urgency, number> = { now: 0, soon: 1, waiting: 2 };
/** Act-now first, then by deadline (soonest first). Pure — tested directly. */
export function rankInbox(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency] || a.at - b.at);
}

const nightsAndRooms = (checkIn: string, checkOut: string, rooms: number) => `${daysBetween(checkIn, checkOut)}n · ${rooms} room${rooms > 1 ? 's' : ''}`;

export async function agentInbox(db: DB, actor: Actor, now = new Date()): Promise<InboxItem[]> {
  const agencyId = agencyOf(actor);
  const today = todayIso(now);
  const in3 = addDays(today, 3);
  const [offers, asked, pay, arrivals, proposals, followUps] = await Promise.all([
    db.select().from(rr).where(and(eq(rr.agencyId, agencyId), eq(rr.status, 'quoted'))).orderBy(rr.quoteValidUntil),
    db.select().from(rr).where(and(eq(rr.agencyId, agencyId), inArray(rr.status, WORKING))).orderBy(rr.createdAt),
    db.select({ b: bk, hotel: ht.name }).from(bk).innerJoin(ht, eq(ht.id, bk.hotelId))
      .where(and(eq(bk.agencyId, agencyId), inArray(bk.status, ['awaiting_payment', 'pending_confirmation', 'outcome_unknown']))).orderBy(bk.createdAt),
    db.select({ b: bk, hotel: ht.name }).from(bk).innerJoin(ht, eq(ht.id, bk.hotelId))
      .where(and(eq(bk.agencyId, agencyId), eq(bk.status, 'confirmed'), gte(bk.checkIn, today), lte(bk.checkIn, in3))).orderBy(bk.checkIn),
    db.select({ p: gp, e: ge }).from(gp).innerJoin(ge, eq(ge.id, gp.enquiryId)).where(and(eq(ge.agencyId, agencyId), eq(gp.status, 'sent'))),
    db.select({ t: tr, client: cl.name }).from(tr).innerJoin(cl, eq(cl.id, tr.clientId))
      .where(and(eq(tr.agencyId, agencyId), lte(tr.followUpOn, today), notInArray(tr.status, ['completed', 'cancelled']))).orderBy(tr.followUpOn),
  ]);

  const items: InboxItem[] = [];
  // One line per request, however many offers we sent for it: cheapest first, soonest expiry decides urgency.
  const byRequest = new Map<string, typeof offers>();
  for (const r of offers) byRequest.set(r.parentId ?? r.id, [...(byRequest.get(r.parentId ?? r.id) ?? []), r]);
  for (const [root, list] of byRequest) {
    const cheapest = [...list].sort((x, y) => (x.sellMinor ?? 0) - (y.sellMinor ?? 0))[0];
    const valid = list.map((x) => x.quoteValidUntil).filter(Boolean).sort()[0] ?? null;
    const lastDay = !!valid && valid <= addDays(today, 1);
    const price = cheapest.sellMinor && cheapest.quoteCurrency ? formatMoney(cheapest.sellMinor, cheapest.quoteCurrency) : null;
    items.push({
      key: `offer-${root}`, kind: 'offer', href: `/agent/rate-requests/${root}`, cta: list.length > 1 ? 'Compare offers' : 'Review offer',
      title: list.length > 1 ? `${list.length} offers ready · ${cheapest.city}` : `Best rate ready · ${cheapest.hotelName}`,
      detail: [list.length > 1 && price ? `from ${price} (${cheapest.hotelName})` : price, `${formatDate(cheapest.checkIn, { day: 'numeric', month: 'short' })}`, nightsAndRooms(cheapest.checkIn, cheapest.checkOut, cheapest.rooms.length), valid ? `valid until ${formatDate(valid, { day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · '),
      urgency: lastDay ? 'now' : 'soon', at: valid ? Date.parse(valid) : (cheapest.offeredAt ?? cheapest.answeredAt ?? cheapest.createdAt).getTime(),
    });
  }
  for (const { b, hotel } of pay) {
    if (b.status === 'awaiting_payment') {
      const due = b.paymentDueAt;
      items.push({
        key: `pay-${b.id}`, kind: 'payment', href: `/agent/bookings/${b.id}`, cta: 'Pay now',
        title: `Pay to hold ${hotel}`, detail: `${b.reference} · ${b.leadGuest} · ${formatMoney(b.sellMinor, b.currency)}${due ? ` · by ${formatDate(due, { day: 'numeric', month: 'short' })}` : ''}`,
        urgency: due && due.getTime() - now.getTime() < 36 * 3_600_000 ? 'now' : 'soon', at: (due ?? b.createdAt).getTime(),
      });
    } else {
      items.push({
        key: `conf-${b.id}`, kind: 'confirming', href: `/agent/bookings/${b.id}`, cta: 'View',
        title: b.status === 'outcome_unknown' ? `Checking ${hotel} with the supplier` : `${hotel} is confirming`,
        detail: `${b.reference} · ${b.leadGuest} · ${formatDate(b.checkIn, { day: 'numeric', month: 'short' })}`, urgency: 'waiting', at: b.createdAt.getTime(),
      });
    }
  }
  for (const { p, e } of proposals) {
    const lapsed = p.validUntil < today;
    items.push({
      key: `prop-${p.id}`, kind: 'proposal', href: `/agent/groups/${e.id}`, cta: lapsed ? 'Ask to refresh' : 'Open proposal',
      title: lapsed ? `Group proposal expired · ${e.groupName}` : `Group proposal ready · ${e.groupName}`,
      detail: `${e.reference} · ${formatMoney(p.sellTotalMinor, p.currency)} · ${lapsed ? 'expired' : 'valid until'} ${formatDate(p.validUntil, { day: 'numeric', month: 'short' })}${lapsed ? ' — message the Group Desk for fresh rates' : ''}`,
      urgency: p.validUntil <= addDays(today, 1) ? 'now' : 'soon', at: Date.parse(p.validUntil),
    });
  }
  for (const { t, client } of followUps) {
    const overdue = !!t.followUpOn && t.followUpOn < today;
    items.push({
      key: `fu-${t.id}`, kind: 'follow_up', href: `/agent/trips/${t.id}`, cta: 'Follow up',
      title: `Follow up with ${client}`, detail: `${t.followUpNote ?? t.title}${overdue ? ` · since ${formatDate(t.followUpOn!, { day: 'numeric', month: 'short' })}` : ' · today'}`,
      urgency: 'now', at: Date.parse(t.followUpOn ?? today),
    });
  }
  for (const { b, hotel } of arrivals) {
    const d = daysBetween(today, b.checkIn);
    items.push({
      key: `arr-${b.id}`, kind: 'arrival', href: `/agent/bookings/${b.id}`, cta: 'Voucher & message',
      title: `${b.leadGuest} arrives ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`}`, detail: `${hotel} · ${b.reference} · send the voucher and a welcome message`,
      urgency: d <= 1 ? 'now' : 'soon', at: Date.parse(b.checkIn),
    });
  }
  // One "we're on it" line per request (however many hotels HotelBridge is asking), and none once an offer is out.
  const withOffer = new Set(offers.map((o) => o.parentId ?? o.id));
  const seenRoots = new Set<string>();
  for (const r of asked) {
    const root = r.parentId ?? r.id;
    if (seenRoots.has(root) || withOffer.has(root)) continue;
    seenRoots.add(root);
    const first = asked.find((x) => x.id === root) ?? r;
    items.push({
      key: `ask-${root}`, kind: 'asked', href: `/agent/rate-requests/${root}`, cta: 'View',
      title: `Getting your best rate · ${first.hotelName}`, detail: `${first.reference} · ${first.city} · ${formatDate(first.checkIn, { day: 'numeric', month: 'short' })} · the HotelBridge team will send you an offer soon`,
      urgency: 'waiting', at: first.createdAt.getTime(),
    });
  }
  return rankInbox(items);
}

export type Pulse = {
  monthLabel: string;
  confirmed: number; roomNights: number; requests: number; offers: number;
  /** Median minutes from asking a hotel to its offer, over the last 90 days. Null until there are answers. */
  medianReplyMinutes: number | null;
  /** Best-rate requests per week, oldest first — 8 weeks. */
  weekly: { week: string; n: number }[];
};

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** Minutes from each request to its first offer. */
function firstOffers(rows: { id: string; parentId: string | null; created: Date; offered: Date | null }[]) {
  const roots = new Map(rows.filter((r) => !r.parentId).map((r) => [r.id, r.created]));
  const first = new Map<string, number>();
  for (const r of rows) {
    if (!r.offered) continue;
    const root = r.parentId ?? r.id;
    const created = roots.get(root);
    if (!created) continue;
    const m = Math.round((r.offered.getTime() - created.getTime()) / 60_000);
    first.set(root, Math.min(first.get(root) ?? Infinity, m));
  }
  return [...first.values()];
}

export async function agentPulse(db: DB, actor: Actor, now = new Date()): Promise<Pulse> {
  const agencyId = agencyOf(actor);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const eightWeeks = new Date(now.getTime() - 56 * 86_400_000);
  const ninety = new Date(now.getTime() - 90 * 86_400_000);
  const [confirmed, reqs, answered, weekly] = await Promise.all([
    db.select({ checkIn: bk.checkIn, checkOut: bk.checkOut, rooms: bk.rooms }).from(bk)
      .where(and(eq(bk.agencyId, agencyId), inArray(bk.status, ['confirmed', 'completed', 'amendment_requested']), gte(bk.createdAt, monthStart))),
    db.select({ status: rr.status, parentId: rr.parentId }).from(rr).where(and(eq(rr.agencyId, agencyId), gte(rr.createdAt, monthStart))),
    db.select({ id: rr.id, parentId: rr.parentId, created: rr.createdAt, offered: rr.offeredAt }).from(rr)
      .where(and(eq(rr.agencyId, agencyId), gte(rr.createdAt, ninety))),
    db.select({ week: sql<string>`to_char(date_trunc('week', ${rr.createdAt}), 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` }).from(rr)
      .where(and(eq(rr.agencyId, agencyId), isNull(rr.parentId), gte(rr.createdAt, eightWeeks))).groupBy(sql`1`).orderBy(sql`1`),
  ]);
  // Fill empty weeks so the chart has 8 even bars.
  const mondays: string[] = [];
  const d = new Date(now); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  for (let i = 7; i >= 0; i--) mondays.push(new Date(d.getTime() - i * 7 * 86_400_000).toISOString().slice(0, 10));
  return {
    monthLabel: monthStart.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' }),
    confirmed: confirmed.length,
    roomNights: confirmed.reduce((s, b) => s + b.rooms.length * daysBetween(b.checkIn, b.checkOut), 0),
    requests: reqs.filter((r) => !r.parentId).length,
    offers: reqs.filter((r) => ['quoted', 'accepted', 'expired'].includes(r.status)).length,
    // From the agent asking to the first offer reaching them.
    medianReplyMinutes: median(firstOffers(answered).map((m) => Math.max(1, m))),
    weekly: mondays.map((w) => ({ week: w, n: weekly.find((x) => x.week === w)?.n ?? 0 })),
  };
}

export type Activity = { key: string; at: Date; text: string; href: string; tone: 'positive' | 'neutral' | 'attention' };

/** The agency's own recent events, newest first. */
export async function agentActivity(db: DB, actor: Actor, limit = 8): Promise<Activity[]> {
  const agencyId = agencyOf(actor);
  const [rates, books, groups] = await Promise.all([
    db.select().from(rr).where(eq(rr.agencyId, agencyId)).orderBy(desc(rr.updatedAt)).limit(limit),
    db.select({ b: bk, hotel: ht.name }).from(bk).innerJoin(ht, eq(ht.id, bk.hotelId)).where(eq(bk.agencyId, agencyId)).orderBy(desc(bk.updatedAt)).limit(limit),
    db.select().from(ge).where(eq(ge.agencyId, agencyId)).orderBy(desc(ge.updatedAt)).limit(limit),
  ]);
  // Only what the agent did and what we sent them — never the hotel side.
  const rateText: Record<string, [string, Activity['tone']]> = {
    review: ['best rate requested', 'neutral'], sent: ['best rate requested', 'neutral'], not_emailed: ['best rate requested', 'neutral'], hotel_quoted: ['best rate requested', 'neutral'],
    quoted: ['offer ready', 'positive'], accepted: ['offer accepted', 'positive'], booked: ['booked', 'positive'], declined: ['no offer this time', 'neutral'], no_response: ['best rate requested', 'neutral'],
    expired: ['offer expired', 'neutral'], cancelled: ['request cancelled', 'neutral'],
  };
  const bookText: Record<string, [string, Activity['tone']]> = {
    confirmed: ['confirmed', 'positive'], completed: ['completed', 'positive'], awaiting_payment: ['awaiting payment', 'attention'],
    pending_confirmation: ['waiting for the hotel', 'neutral'], cancelled: ['cancelled', 'neutral'], declined: ['declined by the hotel', 'attention'],
  };
  const all: Activity[] = [
    ...rates.filter((r) => !r.parentId || ['quoted', 'accepted'].includes(r.status)).map((r) => {
      const [t, tone] = rateText[r.status] ?? [r.status.replace(/_/g, ' '), 'neutral' as const];
      return { key: `r-${r.id}`, at: r.updatedAt, text: `${r.hotelName} — ${t}`, href: `/agent/rate-requests/${r.parentId ?? r.id}`, tone };
    }),
    ...books.map(({ b, hotel }) => {
      const [t, tone] = bookText[b.status] ?? [b.status.replace(/_/g, ' '), 'neutral' as const];
      return { key: `b-${b.id}`, at: b.updatedAt, text: `${b.reference} at ${hotel} — ${t}`, href: `/agent/bookings/${b.id}`, tone };
    }),
    ...groups.map((g) => ({ key: `g-${g.id}`, at: g.updatedAt, text: `Group ${g.groupName} — ${g.status.replace(/_/g, ' ')}`, href: `/agent/groups/${g.id}`, tone: g.status === 'won' ? 'positive' as const : 'neutral' as const })),
  ];
  return all.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

/** "Good evening" in the agent's own time: India by default, since our agents are Indian. */
export function greetingFor(country: string | null | undefined, now = new Date()): 'morning' | 'afternoon' | 'evening' {
  const tz = !country || country === 'India' ? 'Asia/Kolkata' : 'UTC';
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: tz }).format(now));
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

/** Relative time for the activity feed: "just now", "12 min ago", "3 h ago", "2 Nov". */
export function ago(d: Date, now = new Date()): string {
  const m = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return formatDate(d, { day: 'numeric', month: 'short' });
}
