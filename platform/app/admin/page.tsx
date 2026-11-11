import Link from 'next/link';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Empty, Money, Notice, PageHeader, Panel, Pill, Stat } from '@/components/ui';
import { expireHoldsAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { formatDateTime } from '@/lib/domain/dates';
import { demoMode } from '@/lib/config';
import { founderMetrics, operationalIssues } from '@/lib/services/metrics';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Operations overview' };

const pct = (bps: number | null) => (bps == null ? '—' : `${(bps / 100).toFixed(1)}%`);
/** Where an activity entry links to, by the kind of record it changed. */
const ENTITY_HREF: Record<string, (id: string) => string> = {
  agency: (id) => `/admin/agencies/${id}`, hotel: (id) => `/admin/hotels/${id}`, group_enquiry: (id) => `/admin/groups/${id}`,
  booking: (id) => `/admin/bookings/${id}`, contract: (id) => `/admin/contracts/${id}`, rate_request: () => '/admin/rate-requests',
};
const ACTION_LABEL: Record<string, string> = {
  'agency.registered': 'Agency registered', 'agency.verified': 'Agency approved', 'agency.rejected': 'Agency declined', 'agency.suspended': 'Agency suspended',
  'group.created': 'Group enquiry received', 'rate_request.created': 'Best-rate request sent', 'rate_request.quoted': 'Hotel quoted a best rate', 'rate_request.accepted': 'Best rate accepted',
};

const ACCOUNT_LABEL: Record<string, string> = { agent: 'Receivable from agents (net)', supplier: 'Payable to hotels & suppliers', commission: 'Commission receivable from hotels' };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ days?: string; sample?: string }> }) {
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const includeSample = demoMode && sp.sample !== '0';
  const db = await getDb();
  const { user } = await requireStaff();
  const [m, issues, [{ hotels }], [{ awaiting }], activity] = await Promise.all([
    founderMetrics(db, { days, includeSample }), operationalIssues(db),
    db.select({ hotels: sql<number>`count(*)::int` }).from(schema.hotels).where(and(eq(schema.hotels.status, 'active'), includeSample ? undefined : eq(schema.hotels.isSample, false))),
    db.select({ awaiting: sql<number>`count(*)::int` }).from(schema.bookings).where(and(eq(schema.bookings.status, 'pending_confirmation'), includeSample ? undefined : eq(schema.bookings.isSample, false))),
    db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(10),
  ]);
  const roomNights = m.perCurrency.reduce((n, r) => n + r.roomNights, 0);
  const commission = m.obligations.filter((o) => o.account === 'commission' && o.balance !== 0);
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(now));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(now);
  const noVolume = m.bookings.created === 0 && m.activity.searches === 0;
  return (
    <>
      <PageHeader eyebrow={today} title={`${greeting}, ${user.name.split(' ')[0]}.`} description="Here's your hotel network. Every number is counted from real records; money is shown per currency and never added across currencies."
        actions={<div className="flex gap-1.5">{[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin?days=${d}${sp.sample ? `&sample=${sp.sample}` : ''}`} className={`rounded-full px-3 py-1.5 text-[0.8rem] whitespace-nowrap ${d === days ? 'bg-ink text-paper' : 'bg-surface ring-1 ring-line text-muted'}`}>{d === 365 ? '12 mo' : `${d} days`}</Link>)}</div>} />
      {demoMode && (
        <div className="mb-6"><Notice tone="warning" title={includeSample ? 'Including sample data' : 'Sample data excluded'}>
          This is a demo environment. {includeSample ? <Link href={`/admin?days=${days}&sample=0`} className="underline">Exclude sample records</Link> : <Link href={`/admin?days=${days}`} className="underline">Include sample records</Link>}
        </Notice></div>
      )}

      <div className="mb-6 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Published hotels', hotels, <Link key="h" href="/admin/hotels" className="underline-offset-2 hover:underline">open portfolio</Link>],
          ['Verified agencies', m.agencies.verified, m.agencies.pending ? <Link key="a" href="/admin/agencies?tab=pending" className="text-attention underline-offset-2 hover:underline">{m.agencies.pending} waiting</Link> : 'none waiting'],
          ['Confirmed bookings', m.bookings.realised, `last ${days === 365 ? '12 months' : `${days} days`}`],
          ['Room nights', roomNights, `confirmed, last ${days === 365 ? '12 months' : `${days} days`}`],
          ['Awaiting hotel', awaiting, awaiting ? 'confirmation needed' : 'nothing pending'],
          ['Commission due', commission.length ? commission.map((c) => <Money key={c.currency} minor={c.balance} currency={c.currency} className="mr-2" />) : '—', 'receivable from hotels'],
        ].map(([l, v, h]) => <div key={String(l)} className="bg-surface p-5"><Stat label={String(l)} value={v as React.ReactNode} hint={h as React.ReactNode} /></div>)}
      </div>

      <Panel title={`Needs attention (${issues.length})`} className="mb-6" padded={false}
        actions={<form action={expireHoldsAction}><button className="text-[0.8rem] text-muted underline">Release expired holds</button></form>}>
        {issues.length === 0 ? <Empty title="Nothing waiting">No unresolved bookings, overdue groups or expiring contracts.</Empty> : (
          <ul className="divide-y divide-line">
            {issues.slice(0, 12).map((i, k) => (
              <li key={k}><Link href={i.href} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-mist/50">
                <span className="flex items-center gap-3"><Pill tone={i.severity === 'urgent' ? 'negative' : 'attention'}>{i.severity}</Pill><span className="font-medium">{i.title}</span></span>
                <span className="text-[0.82rem] text-muted">{i.detail}</span>
              </Link></li>
            ))}
          </ul>
        )}
      </Panel>

      {noVolume && <div className="mb-6"><Notice title="No trading activity yet in this period">The figures fill in as agencies search and book. Nothing here is estimated.</Notice></div>}

      <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Agencies registered', m.agencies.registered, `${m.agencies.verified} verified · ${m.agencies.pending} pending`],
          ['Active agencies', m.activity.activeAgencies, `searched or booked in ${days} days`],
          ['Searches', m.activity.searches, `conversion to booking ${pct(m.conversionBps)}`],
          ['Bookings created', m.bookings.created, `${m.bookings.realised} confirmed · ${m.bookings.cancelled} cancelled · ${m.bookings.failed} failed`],
          ['Repeat booking rate', pct(m.repeatBps), 'agencies with 2+ confirmed bookings'],
          ['Cancellation rate', pct(m.cancellationBps), 'of bookings created'],
          ['Supplier failure rate', pct(m.supplierFailureBps), `${m.supplierCalls} book/revalidate/cancel calls`],
          ['Group conversion', pct(m.groups.conversionBps), `${m.groups.open} open · avg ${m.groups.hoursToProposal == null ? '—' : `${Math.round(m.groups.hoursToProposal)}h`} to proposal`],
        ].map(([l, v, h]) => <div key={String(l)} className="bg-surface p-5"><Stat label={String(l)} value={v as React.ReactNode} hint={h} /></div>)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Confirmed business by currency" description="Gross booking value is what agents pay — it is not our revenue." padded={false}>
          {m.perCurrency.length === 0 ? <Empty title="No confirmed bookings in this period" /> : (
            <table className="table"><thead><tr><th>Currency</th><th className="text-right">Bookings</th><th className="text-right">Room nights</th><th className="text-right">GBV</th><th className="text-right">Supplier cost</th><th className="text-right">Net revenue</th><th className="text-right">Margin</th></tr></thead>
              <tbody>{m.perCurrency.map((r) => (
                <tr key={r.currency}><td className="font-medium">{r.currency}</td><td className="num text-right">{r.count}</td><td className="num text-right">{r.roomNights}</td>
                  <td className="text-right"><Money minor={r.gbv} currency={r.currency} /></td><td className="text-right"><Money minor={r.cost} currency={r.currency} /></td>
                  <td className="text-right font-medium"><Money minor={r.netRevenue} currency={r.currency} /></td><td className="num text-right">{r.gbv ? `${((r.netRevenue / r.gbv) * 100).toFixed(1)}%` : '—'}</td></tr>
              ))}</tbody></table>
          )}
          <p className="border-t border-line px-5 py-3 text-[0.78rem] text-faint">Gross profit and contribution need payment-processing and servicing costs, which are not recorded yet (no payment provider connected). Net revenue is before those costs.</p>
        </Panel>
        <div className="space-y-6">
          <Panel title="Open obligations" description="From the ledger, all time" padded={false}>
            {m.obligations.length === 0 ? <Empty title="Nothing outstanding" /> : (
              <ul className="divide-y divide-line">{m.obligations.map((o) => (
                <li key={o.account + o.currency} className="flex justify-between px-5 py-3 text-[0.88rem]"><span className="text-muted">{ACCOUNT_LABEL[o.account] ?? o.account}</span><Money minor={o.balance} currency={o.currency} className="font-medium" /></li>
              ))}</ul>
            )}
          </Panel>
          <Panel title="Recent activity" padded={false} actions={<Link href="/admin/audit" className="text-[0.8rem] text-muted hover:text-ink">Full log</Link>}>
            {activity.length === 0 ? <Empty title="No activity yet" /> : (
              <ul className="divide-y divide-line">{activity.map((a) => {
                const href = a.entityId && ENTITY_HREF[a.entity]?.(a.entityId);
                const label = ACTION_LABEL[a.action] ?? a.action.replace(/[._]/g, ' ');
                const body = <><span className="font-medium">{label}</span><span className="block text-[0.76rem] text-faint">{a.actorLabel} · {formatDateTime(a.createdAt)}</span></>;
                return <li key={a.id}>{href ? <Link href={href} className="block px-5 py-3 text-[0.86rem] hover:bg-mist/50">{body}</Link> : <div className="px-5 py-3 text-[0.86rem]">{body}</div>}</li>;
              })}</ul>
            )}
          </Panel>
          <Panel title="Hotel concentration" description="Top hotels by confirmed GBV" padded={false}>
            {m.concentration.length === 0 ? <Empty title="No production yet" /> : (
              <ul className="divide-y divide-line">{m.concentration.map((c) => (
                <li key={c.hotel + c.currency} className="flex justify-between px-5 py-3 text-[0.88rem]"><span>{c.hotel} <span className="text-faint">· {c.n}</span></span><Money minor={c.gbv} currency={c.currency} /></li>
              ))}</ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
