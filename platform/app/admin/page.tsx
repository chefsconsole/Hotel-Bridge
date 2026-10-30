import Link from 'next/link';
import { Empty, Money, Notice, PageHeader, Panel, Pill, Stat } from '@/components/ui';
import { expireHoldsAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { demoMode } from '@/lib/config';
import { founderMetrics, operationalIssues } from '@/lib/services/metrics';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Operations overview' };

const pct = (bps: number | null) => (bps == null ? '—' : `${(bps / 100).toFixed(1)}%`);
const ACCOUNT_LABEL: Record<string, string> = { agent: 'Receivable from agents (net)', supplier: 'Payable to hotels & suppliers', commission: 'Commission receivable from hotels' };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ days?: string; sample?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const includeSample = demoMode && sp.sample !== '0';
  const db = await getDb();
  const [m, issues] = await Promise.all([founderMetrics(db, { days, includeSample }), operationalIssues(db)]);
  const noVolume = m.bookings.created === 0 && m.activity.searches === 0;
  return (
    <>
      <PageHeader eyebrow="Founder view" title="How the business is doing" description="Every number below is counted from real records. Money is shown per currency and never added across currencies."
        actions={<div className="flex gap-1.5">{[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin?days=${d}${sp.sample ? `&sample=${sp.sample}` : ''}`} className={`rounded-full px-3 py-1.5 text-[0.8rem] ${d === days ? 'bg-ink text-paper' : 'bg-surface ring-1 ring-line text-muted'}`}>{d === 365 ? '12 mo' : `${d} days`}</Link>)}</div>} />
      {demoMode && (
        <div className="mb-6"><Notice tone="warning" title={includeSample ? 'Including sample data' : 'Sample data excluded'}>
          This is a demo environment. {includeSample ? <Link href={`/admin?days=${days}&sample=0`} className="underline">Exclude sample records</Link> : <Link href={`/admin?days=${days}`} className="underline">Include sample records</Link>}
        </Notice></div>
      )}

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
