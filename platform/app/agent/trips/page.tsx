import Link from 'next/link';
import { Empty, LinkButton, Money, PageHeader, Pill } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { hotelShare } from '@/lib/domain/trip';
import { requireAgent } from '@/lib/session';
import { TRIP_STATUS_LABEL, TRIP_STATUS_TONE, LEAD_SOURCES, listTrips, receivables } from '@/lib/services/trips';

export const metadata = { title: 'Client trips' };

const STAGES = ['enquiry', 'quoted', 'booked', 'completed', 'cancelled'] as const;

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ stage?: string; q?: string; owed?: string }> }) {
  const { actor } = await requireAgent();
  const { stage = 'open', q = '', owed } = await searchParams;
  const db = await getDb();
  const all = await listTrips(db, actor);
  const today = todayIso();
  const counts = Object.fromEntries(STAGES.map((s) => [s, all.filter((r) => r.trip.status === s).length]));
  let rows = stage === 'all' ? all : stage === 'open' ? all.filter((r) => r.trip.status !== 'completed' && r.trip.status !== 'cancelled') : all.filter((r) => r.trip.status === stage);
  if (owed) rows = rows.filter((r) => r.totals.pendingMinor > 0 && r.trip.status !== 'cancelled');
  const needle = q.trim().toLowerCase();
  if (needle) rows = rows.filter((r) => [r.trip.title, r.trip.reference, r.client.name, r.client.phone ?? ''].some((s) => s.toLowerCase().includes(needle)));
  const owedTotals = receivables(all);
  const followUps = all.filter((r) => r.trip.followUpOn && r.trip.followUpOn <= today && r.trip.status !== 'completed' && r.trip.status !== 'cancelled').length;

  const tab = (key: string, label: string, n?: number) => (
    <Link key={key} href={`/agent/trips?stage=${key}`} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] ${key === stage ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>
      {label}{n != null && <span className={`num text-[0.72rem] ${key === stage ? 'text-paper/60' : 'text-faint'}`}>{n}</span>}
    </Link>
  );

  return (
    <>
      <PageHeader eyebrow="Sell" title="Client trips"
        description="Every enquiry becomes a trip: hotels booked with us, plus the flights, visas and tours you sell yourself — one price for the client, one place to track what they owe."
        actions={<><LinkButton href="/agent/clients" variant="secondary">Clients</LinkButton><LinkButton href="/agent/trips/new">New trip</LinkButton></>} />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <Card label="Open trips" value={String(all.filter((r) => ['enquiry', 'quoted', 'booked'].includes(r.trip.status)).length)} hint={`${counts.enquiry} new · ${counts.quoted} proposals out`} />
        <Card label="Follow-ups due" value={String(followUps)} hint={followUps ? 'Today or overdue' : 'Nothing waiting'} tone={followUps ? 'attention' : undefined} />
        {owedTotals.length === 0
          ? <Card label="Clients owe you" value="—" hint="Nothing pending" />
          : owedTotals.slice(0, 2).map((o) => (
            <Link key={o.currency} href="/agent/trips?stage=all&owed=1" className="block">
              <Card label={`Clients owe you · ${o.currency}`} value={<Money minor={o.pendingMinor} currency={o.currency} compact />}
                hint={o.overdueMinor > 0 ? <span className="text-negative">Overdue <Money minor={o.overdueMinor} currency={o.currency} compact /></span> : `${o.trips} trip${o.trips === 1 ? '' : 's'}`} />
            </Link>
          ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tab('open', 'Open', counts.enquiry + counts.quoted + counts.booked)}
          {STAGES.map((s) => tab(s, TRIP_STATUS_LABEL[s], counts[s]))}
          {tab('all', 'All', all.length)}
        </div>
        <form className="md:w-72"><input type="hidden" name="stage" value={stage} /><input name="q" defaultValue={q} placeholder="Client, phone, trip or TR-ref" className="field" /></form>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? (
          <Empty title={all.length ? 'No trips match' : 'Your first client trip'} action={<LinkButton href="/agent/trips/new" size="sm">New trip</LinkButton>}>
            {all.length ? 'Try another stage or search.' : 'Add the client, then hotels from search and anything else they are buying. Share one branded plan and track every payment.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Trip</th><th>Client</th><th>Dates</th><th>Stage</th><th className="text-right">Package</th><th className="text-right">Client owes</th><th>Next step</th></tr></thead>
              <tbody>
                {rows.map(({ trip: t, client, totals, overdue }) => (
                  <tr key={t.id}>
                    <td className="min-w-48">
                      <Link href={`/agent/trips/${t.id}`} className="font-medium underline-offset-4 hover:underline">{t.title}</Link>
                      <p className="num text-[0.75rem] text-faint">{t.reference}{t.source ? ` · ${LEAD_SOURCES[t.source as keyof typeof LEAD_SOURCES]}` : ''}</p>
                    </td>
                    <td>{client.name}{client.phone && <p className="text-[0.75rem] text-faint">{client.phone}</p>}</td>
                    <td className="num whitespace-nowrap">{t.startDate ? `${formatDate(t.startDate, { day: 'numeric', month: 'short' })}${t.endDate ? ` – ${formatDate(t.endDate)}` : ''}` : <span className="text-faint">Dates open</span>}</td>
                    <td>
                      <Pill tone={TRIP_STATUS_TONE[t.status]}>{TRIP_STATUS_LABEL[t.status]}</Pill>
                      {t.clientApprovedAt && t.status !== 'booked' && t.status !== 'completed' && <p className="mt-1 text-[0.72rem] font-medium text-positive">Client approved</p>}
                    </td>
                    <td className="text-right">
                      {totals.totalMinor > 0 ? <Money minor={totals.totalMinor} currency={t.currency} compact /> : <span className="text-faint">—</span>}
                      {totals.totalMinor > 0 && <p className="text-[0.72rem] text-faint">{hotelShare(totals)}% hotels</p>}
                    </td>
                    <td className="text-right">
                      {totals.pendingMinor > 0 && t.status !== 'cancelled'
                        ? <><Money minor={totals.pendingMinor} currency={t.currency} compact className={overdue ? 'font-medium text-negative' : 'font-medium'} />{overdue && <p className="text-[0.72rem] text-negative">Overdue since {formatDate(t.balanceDueOn!, { day: 'numeric', month: 'short' })}</p>}</>
                        : totals.totalMinor > 0 ? <span className="text-[0.82rem] text-positive">Paid</span> : <span className="text-faint">—</span>}
                    </td>
                    <td className="max-w-56 text-[0.82rem]">
                      {t.followUpOn
                        ? <span className={t.followUpOn <= today ? 'font-medium text-attention' : 'text-muted'}>{t.followUpOn < today ? 'Overdue · ' : t.followUpOn === today ? 'Today · ' : `${formatDate(t.followUpOn, { day: 'numeric', month: 'short' })} · `}{t.followUpNote ?? 'Follow up'}</span>
                        : <span className="text-faint">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Card({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'attention' }) {
  return (
    <div className="h-full rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)]">
      <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{label}</p>
      <p className={`num mt-3 font-[family-name:var(--font-display)] text-[1.75rem] leading-none font-light tracking-[-0.03em] ${tone === 'attention' ? 'text-attention' : ''}`}>{value}</p>
      {hint && <p className="mt-2 text-[0.78rem] text-muted">{hint}</p>}
    </div>
  );
}
