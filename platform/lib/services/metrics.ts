/* ------------------------------------------------------------------ *
 * Founder and operations numbers — computed from real rows, never typed in.
 *  - Money is reported per currency; nothing is summed across currencies.
 *  - "Created" and "realised" bookings are kept apart.
 *  - Sample (demo) records are excluded unless explicitly included.
 * ------------------------------------------------------------------ */
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { addDays, daysBetween, todayIso } from '@/lib/domain/dates';

const { bookings, agencies, searchLog, supplierCalls, groupEnquiries, groupProposals, groupHotelRequests, ledgerEntries, contracts, hotels, supportTickets, partnerApplications } = schema;

const REALISED = ['confirmed', 'amendment_requested', 'cancellation_requested'];

type CurrencyRow = { currency: string; gbv: number; netRevenue: number; cost: number; roomNights: number; count: number };

export async function founderMetrics(db: DB, opts: { days?: number; includeSample?: boolean } = {}) {
  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * 86_400_000);
  const sampleFilter = opts.includeSample ? undefined : eq(bookings.isSample, false);
  const agencySample = opts.includeSample ? undefined : eq(agencies.isSample, false);

  const [agencyCounts] = await db.select({
    registered: sql<number>`count(*)::int`,
    verified: sql<number>`count(*) filter (where ${agencies.status} = 'verified')::int`,
    pending: sql<number>`count(*) filter (where ${agencies.status} = 'pending')::int`,
  }).from(agencies).where(agencySample);

  const [activity] = await db.select({
    searches: sql<number>`count(*)::int`,
    searchingAgencies: sql<number>`count(distinct ${searchLog.agencyId})::int`,
  }).from(searchLog).innerJoin(agencies, eq(agencies.id, searchLog.agencyId)).where(and(gte(searchLog.createdAt, since), agencySample));

  const [bookingCounts] = await db.select({
    created: sql<number>`count(*)::int`,
    realised: sql<number>`count(*) filter (where ${bookings.status} in ('confirmed','amendment_requested','cancellation_requested'))::int`,
    cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')::int`,
    failed: sql<number>`count(*) filter (where ${bookings.status} in ('failed','declined'))::int`,
    bookingAgencies: sql<number>`count(distinct ${bookings.agencyId})::int`,
  }).from(bookings).where(and(gte(bookings.createdAt, since), sampleFilter));

  const perCurrency = await db.select({
    currency: bookings.currency,
    gbv: sql<number>`coalesce(sum(${bookings.sellMinor}),0)::bigint`,
    netRevenue: sql<number>`coalesce(sum(${bookings.netRevenueMinor}),0)::bigint`,
    cost: sql<number>`coalesce(sum(${bookings.supplierCostMinor}),0)::bigint`,
    roomNights: sql<number>`coalesce(sum(jsonb_array_length(${bookings.rooms}) * (${bookings.checkOut} - ${bookings.checkIn})),0)::int`,
    count: sql<number>`count(*)::int`,
  }).from(bookings).where(and(gte(bookings.createdAt, since), inArray(bookings.status, REALISED), sampleFilter)).groupBy(bookings.currency);

  // Repeat booking rate: agencies with 2+ realised bookings ever / agencies with 1+.
  const [repeat] = await db.select({
    one: sql<number>`count(*) filter (where n >= 1)::int`,
    two: sql<number>`count(*) filter (where n >= 2)::int`,
  }).from(sql`(select agency_id, count(*) as n from bookings where status in ('confirmed','amendment_requested','cancellation_requested') ${opts.includeSample ? sql`` : sql`and is_sample = false`} group by agency_id) t`);

  const [supplier] = await db.select({
    calls: sql<number>`count(*)::int`,
    failures: sql<number>`count(*) filter (where ${supplierCalls.outcome} in ('timeout','error','unavailable'))::int`,
  }).from(supplierCalls).where(and(gte(supplierCalls.createdAt, since), inArray(supplierCalls.operation, ['book', 'revalidate', 'cancel'])));

  const concentration = await db.select({
    hotel: hotels.name, currency: bookings.currency,
    gbv: sql<number>`sum(${bookings.sellMinor})::bigint`, n: sql<number>`count(*)::int`,
  }).from(bookings).innerJoin(hotels, eq(hotels.id, bookings.hotelId))
    .where(and(gte(bookings.createdAt, since), inArray(bookings.status, REALISED), sampleFilter))
    .groupBy(hotels.name, bookings.currency).orderBy(sql`sum(${bookings.sellMinor}) desc`).limit(8);

  const [groups] = await db.select({
    total: sql<number>`count(*)::int`,
    won: sql<number>`count(*) filter (where ${groupEnquiries.status} = 'won')::int`,
    closed: sql<number>`count(*) filter (where ${groupEnquiries.status} in ('won','lost','cancelled'))::int`,
    open: sql<number>`count(*) filter (where ${groupEnquiries.status} not in ('won','lost','cancelled'))::int`,
  }).from(groupEnquiries).where(opts.includeSample ? undefined : eq(groupEnquiries.isSample, false));

  const [ttq] = await db.select({
    hours: sql<number | null>`avg(extract(epoch from (p.sent_at - e.created_at)) / 3600)`,
  }).from(sql`group_enquiries e join lateral (select min(sent_at) as sent_at from group_proposals gp where gp.enquiry_id = e.id and gp.sent_at is not null) p on p.sent_at is not null`);

  // Obligations: what is owed, per currency, from the ledger.
  const obligations = await db.select({
    account: ledgerEntries.account, currency: ledgerEntries.currency,
    balance: sql<number>`sum(${ledgerEntries.amountMinor})::bigint`,
  }).from(ledgerEntries).groupBy(ledgerEntries.account, ledgerEntries.currency);

  return {
    days,
    agencies: agencyCounts,
    activity: { ...activity, activeAgencies: Math.max(activity.searchingAgencies, bookingCounts.bookingAgencies) },
    bookings: bookingCounts,
    conversionBps: activity.searches ? Math.round((bookingCounts.created / activity.searches) * 10_000) : null,
    cancellationBps: bookingCounts.created ? Math.round((bookingCounts.cancelled / bookingCounts.created) * 10_000) : null,
    perCurrency: perCurrency.map((r) => ({ ...r, gbv: Number(r.gbv), netRevenue: Number(r.netRevenue), cost: Number(r.cost) })) as CurrencyRow[],
    repeatBps: repeat.one ? Math.round((repeat.two / repeat.one) * 10_000) : null,
    supplierFailureBps: supplier.calls ? Math.round((supplier.failures / supplier.calls) * 10_000) : null,
    supplierCalls: supplier.calls,
    concentration: concentration.map((c) => ({ ...c, gbv: Number(c.gbv) })),
    groups: { ...groups, conversionBps: groups.closed ? Math.round((groups.won / groups.closed) * 10_000) : null, hoursToProposal: ttq?.hours == null ? null : Number(ttq.hours) },
    obligations: obligations.map((o) => ({ ...o, balance: Number(o.balance) })).filter((o) => o.balance !== 0),
  };
}

export type OpsIssue = { severity: 'urgent' | 'attention'; kind: string; title: string; detail: string; href: string };

/** Everything that needs a human, newest risk first. */
export async function operationalIssues(db: DB): Promise<OpsIssue[]> {
  const issues: OpsIssue[] = [];
  const now = new Date();
  const today = todayIso();

  const unknown = await db.select().from(bookings).where(inArray(bookings.status, ['outcome_unknown']));
  for (const b of unknown) issues.push({ severity: 'urgent', kind: 'booking', title: `${b.reference}: outcome unknown`, detail: 'Supplier did not answer. Reconcile before anyone rebooks.', href: `/admin/bookings/${b.id}` });

  const stuck = await db.select().from(bookings).where(and(eq(bookings.status, 'submitting'), lt(bookings.updatedAt, new Date(now.getTime() - 5 * 60_000))));
  for (const b of stuck) issues.push({ severity: 'urgent', kind: 'booking', title: `${b.reference}: stuck submitting`, detail: 'In submission for over 5 minutes.', href: `/admin/bookings/${b.id}` });

  const pending = await db.select().from(bookings).where(eq(bookings.status, 'pending_confirmation'));
  for (const b of pending) {
    const hours = (now.getTime() - b.createdAt.getTime()) / 3_600_000;
    const left = b.hotelRespondBy ? (b.hotelRespondBy.getTime() - now.getTime()) / 3_600_000 : null;
    const soon = daysBetween(today, b.checkIn) <= 3;
    // Chase the hotel before its window closes, and always for near arrivals.
    if (soon || (left != null ? left < 12 : hours > 24)) issues.push({
      severity: soon || (left != null && left < 4) ? 'urgent' : 'attention', kind: 'booking', title: `${b.reference}: hotel has not confirmed`,
      detail: `${left != null ? (left > 0 ? `Lapses in ${Math.floor(left)}h` : 'Window closed') : `Requested ${Math.round(hours)}h ago`} · arrival ${b.checkIn} — call the hotel`,
      href: `/admin/bookings/${b.id}`,
    });
  }

  const requested = await db.select().from(bookings).where(inArray(bookings.status, ['cancellation_requested', 'amendment_requested']));
  for (const b of requested) issues.push({ severity: 'attention', kind: 'booking', title: `${b.reference}: ${b.status === 'cancellation_requested' ? 'cancellation' : 'amendment'} requested`, detail: 'Waiting for operations.', href: `/admin/bookings/${b.id}` });

  const overdue = await db.select().from(bookings).where(and(eq(bookings.status, 'awaiting_payment'), lt(bookings.paymentDueAt, now)));
  for (const b of overdue) issues.push({ severity: 'attention', kind: 'payment', title: `${b.reference}: payment overdue`, detail: 'Hold expired — release or extend.', href: `/admin/bookings/${b.id}` });

  const refunds = await db.select().from(bookings).where(eq(bookings.paymentStatus, 'refund_due'));
  for (const b of refunds) issues.push({ severity: 'attention', kind: 'payment', title: `${b.reference}: refund due to agent`, detail: 'Record the refund once paid.', href: `/admin/bookings/${b.id}` });

  const waiting = await db.select({ id: agencies.id, name: agencies.name, createdAt: agencies.createdAt }).from(agencies).where(eq(agencies.status, 'pending'));
  for (const a of waiting) {
    const hours = (now.getTime() - a.createdAt.getTime()) / 3_600_000;
    issues.push({ severity: hours > 24 ? 'urgent' : 'attention', kind: 'agency', title: `${a.name}: waiting for approval`, detail: `Registered ${Math.round(hours)}h ago — check KYC and approve or decline`, href: `/admin/agencies/${a.id}` });
  }

  const lateGroups = await db.select().from(groupEnquiries).where(and(inArray(groupEnquiries.status, ['new', 'under_review']), lt(groupEnquiries.respondBy, now)));
  for (const g of lateGroups) issues.push({ severity: 'urgent', kind: 'group', title: `${g.reference}: first response overdue`, detail: `${g.groupName} · ${g.totalPax} pax`, href: `/admin/groups/${g.id}` });

  const dueGroups = await db.select().from(groupEnquiries).where(and(inArray(groupEnquiries.status, ['under_review', 'sent_to_hotels', 'offers_received', 'proposal_prepared']), lt(groupEnquiries.quoteNeededBy, addDays(today, 2))));
  for (const g of dueGroups) issues.push({ severity: g.quoteNeededBy < today ? 'urgent' : 'attention', kind: 'group', title: `${g.reference}: quotation due ${g.quoteNeededBy}`, detail: g.groupName, href: `/admin/groups/${g.id}` });

  const silentHotels = await db.select({ r: groupHotelRequests, ref: groupEnquiries.reference }).from(groupHotelRequests)
    .innerJoin(groupEnquiries, eq(groupEnquiries.id, groupHotelRequests.enquiryId))
    .where(and(eq(groupHotelRequests.status, 'sent'), lt(groupHotelRequests.respondBy, today)));
  for (const { r, ref } of silentHotels) issues.push({ severity: 'attention', kind: 'group', title: `${ref}: ${r.hotelName} has not replied`, detail: `Reply was due ${r.respondBy}`, href: `/admin/groups/${r.enquiryId}` });

  const unsent = await db.select({ n: sql<number>`count(*)::int`, enquiryId: groupHotelRequests.enquiryId, ref: groupEnquiries.reference }).from(groupHotelRequests)
    .innerJoin(groupEnquiries, eq(groupEnquiries.id, groupHotelRequests.enquiryId))
    .where(eq(groupHotelRequests.status, 'generated')).groupBy(groupHotelRequests.enquiryId, groupEnquiries.reference);
  for (const u of unsent) issues.push({ severity: 'attention', kind: 'group', title: `${u.ref}: ${u.n} hotel enquir${u.n === 1 ? 'y' : 'ies'} generated but not sent`, detail: 'Send them and mark as sent.', href: `/admin/groups/${u.enquiryId}` });

  const expiring = await db.select({ c: contracts, hotel: hotels.name }).from(contracts).innerJoin(hotels, eq(hotels.id, contracts.hotelId))
    .where(and(eq(contracts.status, 'active'), lt(contracts.validTo, addDays(today, 45))));
  for (const { c, hotel } of expiring) issues.push({ severity: 'attention', kind: 'contract', title: `${hotel}: contract ends ${c.validTo}`, detail: `${c.reference} — renew or load next season`, href: `/admin/contracts/${c.id}` });

  const pendingAgencies = await db.select({ n: sql<number>`count(*)::int` }).from(agencies).where(eq(agencies.status, 'pending'));
  if (pendingAgencies[0].n) issues.push({ severity: 'attention', kind: 'agency', title: `${pendingAgencies[0].n} agenc${pendingAgencies[0].n === 1 ? 'y' : 'ies'} awaiting verification`, detail: 'They can search but not book.', href: '/admin/agencies' });

  const urgentTickets = await db.select().from(supportTickets).where(and(eq(supportTickets.status, 'open')));
  for (const t of urgentTickets) issues.push({ severity: t.urgency === 'urgent' ? 'urgent' : 'attention', kind: 'support', title: `Support: ${t.subject}`, detail: t.urgency === 'urgent' ? 'Marked urgent by the agent' : 'Open ticket', href: '/admin/support' });

  const apps = await db.select({ n: sql<number>`count(*)::int` }).from(partnerApplications).where(eq(partnerApplications.status, 'new'));
  if (apps[0].n) issues.push({ severity: 'attention', kind: 'partner', title: `${apps[0].n} new partner application${apps[0].n === 1 ? '' : 's'}`, detail: 'Hotels or distributors asking to join.', href: '/admin/partners' });

  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'urgent' ? -1 : 1));
}

export async function proposalsAwaitingAgent(db: DB, agencyId: string) {
  return db.select({ p: groupProposals, e: groupEnquiries }).from(groupProposals)
    .innerJoin(groupEnquiries, eq(groupEnquiries.id, groupProposals.enquiryId))
    .where(and(eq(groupEnquiries.agencyId, agencyId), eq(groupProposals.status, 'sent')));
}
