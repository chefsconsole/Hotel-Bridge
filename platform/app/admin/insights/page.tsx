import Link from 'next/link';
import { BarList } from '@/components/bars';
import { Empty, Money, Notice, PageHeader, Panel } from '@/components/ui';
import { getDb } from '@/lib/db';
import { demoMode } from '@/lib/config';
import { formatDate } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { platformInsights } from '@/lib/services/insights';

export const metadata = { title: 'Insights' };
const RANGES = [30, 90, 365];
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default async function AdminInsights({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff();
  const days = RANGES.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 90;
  const i = await platformInsights(await getDb(), days, demoMode);
  return (
    <>
      <PageHeader eyebrow="Commercial intelligence" title="Where demand is, and who delivers"
        description="Demand, conversion, hotel and agency performance — from real searches and bookings. Use it to decide which hotels to contract next and where to negotiate."
        actions={<div className="flex gap-1.5">{RANGES.map((d) => <Link key={d} href={`/admin/insights?days=${d}`} className={`rounded-full px-3.5 py-1.5 text-[0.8rem] ${d === days ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line'}`}>{d === 365 ? '12 months' : `${d} days`}</Link>)}</div>} />
      {demoMode && <div className="mb-8"><Notice tone="warning">Demo environment — sample records are included.</Notice></div>}

      <Panel title="Demand by destination" description="Searches, how many came back empty (no hotel could take the stay), and how many turned into bookings." padded={false} className="mb-6">
        {i.demand.length === 0 ? <Empty title="No searches yet" /> : (
          <table className="table"><thead><tr><th>Destination</th><th className="text-right">Searches</th><th className="text-right">Agencies</th><th className="text-right">No result</th><th className="text-right">Avg rooms</th><th className="text-right">Lead time</th><th className="text-right">Bookings</th><th className="text-right">Search → booking</th></tr></thead>
            <tbody>{i.demand.map((d) => (
              <tr key={d.city}><td className="font-medium">{d.city}</td><td className="num text-right">{d.searches}</td><td className="num text-right">{d.agencies}</td>
                <td className={`num text-right ${d.empty ? 'text-attention' : ''}`}>{d.empty} <span className="text-faint">({pct(d.empty, d.searches)})</span></td>
                <td className="num text-right">{d.avgRooms ?? '—'}</td><td className="num text-right">{d.leadDays == null ? '—' : `${d.leadDays}d`}</td>
                <td className="num text-right">{d.confirmed} <span className="text-faint">/ {d.bookings}</span></td><td className="num text-right">{pct(d.bookings, d.searches)}</td></tr>
            ))}</tbody></table>
        )}
      </Panel>

      <div className="mb-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Destinations agents asked for that we don't sell" description="From AI search requests. Evidence for where to contract next.">
          <BarList items={i.unserved.map((u) => ({ label: u.place, value: u.n, hint: `last ${formatDate(u.last)}` }))} empty="No unmet destination requests recorded" />
        </Panel>
        <Panel title="How far ahead agents book" description="Booking to arrival">
          <BarList items={i.lead.map((l) => ({ label: l.bucket, value: l.n }))} empty="No bookings yet" />
        </Panel>
      </div>

      <Panel title="Hotel performance" description="Production and reliability per hotel. Response time is how long on-request bookings waited for the hotel's answer." padded={false} className="mb-6">
        {i.hotels.length === 0 ? <Empty title="No hotel production yet" /> : (
          <table className="table"><thead><tr><th>Hotel</th><th className="text-right">Confirmed</th><th className="text-right">Cancelled</th><th className="text-right">Declined</th><th className="text-right">Room nights</th><th className="text-right">GBV</th><th className="text-right">Net revenue</th><th className="text-right">Avg response</th></tr></thead>
            <tbody>{i.hotels.map((h) => (
              <tr key={h.name + h.currency}><td className="font-medium">{h.name}<p className="text-[0.75rem] text-faint">{h.city}</p></td>
                <td className="num text-right">{h.confirmed}</td><td className="num text-right">{h.cancelled}</td><td className={`num text-right ${h.declined ? 'text-attention' : ''}`}>{h.declined}</td>
                <td className="num text-right">{h.roomNights}</td><td className="text-right"><Money minor={h.gbv} currency={h.currency} compact /></td>
                <td className="text-right"><Money minor={h.net} currency={h.currency} compact /></td><td className="num text-right">{h.responseHours == null ? '—' : `${h.responseHours}h`}</td></tr>
            ))}</tbody></table>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <Panel title="Agency leaderboard" padded={false}>
          {i.agencies.length === 0 ? <Empty title="No agency bookings yet" /> : (
            <table className="table"><thead><tr><th>Agency</th><th className="text-right">Confirmed</th><th className="text-right">GBV</th><th className="text-right">Last booking</th></tr></thead>
              <tbody>{i.agencies.map((a) => (
                <tr key={a.name + a.currency}><td className="font-medium">{a.name}<p className="text-[0.75rem] text-faint">{a.country}</p></td><td className="num text-right">{a.confirmed} <span className="text-faint">/ {a.bookings}</span></td>
                  <td className="text-right"><Money minor={a.gbv} currency={a.currency} compact /></td><td className="text-right text-[0.85rem]">{formatDate(a.last)}</td></tr>
              ))}</tbody></table>
          )}
        </Panel>
        <Panel title="Gone quiet" description="Verified agencies with no booking in 45+ days — worth a call.">
          {i.dormant.length === 0 ? <p className="text-[0.88rem] text-faint">No dormant agencies.</p> : (
            <ul className="divide-y divide-line">{i.dormant.map((a) => <li key={a.name} className="flex justify-between py-2.5 text-[0.88rem]"><span>{a.name} <span className="text-faint">· {a.country}</span></span><span className="text-muted">{formatDate(a.last)}</span></li>)}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}
