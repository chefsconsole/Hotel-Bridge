import Link from 'next/link';
import { BarList } from '@/components/bars';
import { Empty, LinkButton, Money, PageHeader, Panel, Stat } from '@/components/ui';
import { getDb } from '@/lib/db';
import { requireAgent } from '@/lib/session';
import { agencyInsights } from '@/lib/services/insights';

export const metadata = { title: 'Insights' };
const RANGES = [30, 90, 365];

export default async function AgentInsights({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { agency } = await requireAgent();
  const days = RANGES.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 90;
  const i = await agencyInsights(await getDb(), agency.id, days);
  const month = (m: string) => new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'));
  return (
    <>
      <PageHeader eyebrow="Insights" title="Your business with HotelBridge" description="Counted from your agency's own bookings and searches. Nothing here is estimated."
        actions={<div className="flex gap-1.5">{RANGES.map((d) => <Link key={d} href={`/agent/insights?days=${d}`} className={`rounded-full px-3.5 py-1.5 text-[0.8rem] ${d === days ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line'}`}>{d === 365 ? '12 months' : `${d} days`}</Link>)}</div>} />
      {i.created === 0 ? (
        <Panel><Empty title="No bookings in this period" action={<LinkButton href="/agent/search" size="sm">Search hotels</LinkButton>}>Your insights build up as you book.</Empty></Panel>
      ) : (
        <>
          <div className="mb-8 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line shadow-[var(--shadow-soft)] sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-surface p-6"><Stat label="Confirmed bookings" value={i.confirmed} hint={`${i.created} made · ${i.cancelled} cancelled`} /></div>
            <div className="bg-surface p-6"><Stat label="Room nights" value={i.roomNights} hint={i.avgNights ? `${i.avgNights} nights per stay on average` : undefined} /></div>
            <div className="bg-surface p-6"><Stat label="Booked value" value={i.value.length ? <Money minor={i.value[0].total} currency={i.value[0].currency} compact /> : '—'} hint={i.value.length > 1 ? `+ ${i.value.slice(1).map((v) => v.currency).join(', ')} bookings` : 'confirmed bookings, what you paid'} /></div>
            <div className="bg-surface p-6"><Stat label="Booking lead time" value={i.leadDays == null ? '—' : `${i.leadDays} days`} hint="average, booking to arrival" /></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <Panel title="Where your clients stay" description="Confirmed bookings by destination"><BarList items={i.byCity.map((c) => ({ label: c.city, value: c.bookings, hint: `${c.roomNights} room nights` }))} /></Panel>
            <Panel title="Your most-booked hotels"><BarList items={i.byHotel.map((h) => ({ label: h.name, value: h.bookings, hint: h.city }))} /></Panel>
            <Panel title="Bookings by month" description="Confirmed, last 6 months"><BarList items={i.monthly.map((m) => ({ label: month(m.month), value: m.confirmed, hint: `${m.created} made` }))} /></Panel>
            <Panel title="What you search for" description="Searches by destination"><BarList items={i.searches.map((s) => ({ label: s.city, value: s.n }))} /></Panel>
          </div>
        </>
      )}
    </>
  );
}
