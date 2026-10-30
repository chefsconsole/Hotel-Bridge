import Link from 'next/link';
import { StatusPill, PaymentPill } from '@/components/booking-bits';
import { Empty, LinkButton, Money, PageHeader } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { requireAgent } from '@/lib/session';
import { listBookingsForActor } from '@/lib/services/bookings';

export const metadata = { title: 'My bookings' };

const FILTERS: Record<string, { label: string; statuses?: string[] }> = {
  all: { label: 'All' },
  action: { label: 'Needs attention', statuses: ['awaiting_payment', 'pending_confirmation', 'outcome_unknown', 'cancellation_requested', 'amendment_requested'] },
  confirmed: { label: 'Confirmed', statuses: ['confirmed'] },
  closed: { label: 'Cancelled & failed', statuses: ['cancelled', 'declined', 'failed'] },
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { actor } = await requireAgent();
  const { f = 'all', q = '' } = await searchParams;
  const filter = FILTERS[f] ?? FILTERS.all;
  const db = await getDb();
  let rows = await listBookingsForActor(db, actor, { status: filter.statuses });
  const needle = q.trim().toLowerCase();
  if (needle) rows = rows.filter(({ b, hotelName }) => [b.reference, b.leadGuest, b.agentReference ?? '', hotelName].some((s) => s.toLowerCase().includes(needle)));
  const today = todayIso();
  return (
    <>
      <PageHeader eyebrow="Bookings" title="My bookings" actions={<LinkButton href="/agent/search">New booking</LinkButton>} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(FILTERS).map(([k, v]) => (
            <Link key={k} href={`/agent/bookings?f=${k}`} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${k === f ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>{v.label}</Link>
          ))}
        </div>
        <form className="md:w-72"><input type="hidden" name="f" value={f} /><input name="q" defaultValue={q} placeholder="Reference, guest or hotel" className="field" /></form>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? (
          <Empty title={needle || f !== 'all' ? 'No bookings match' : 'No bookings yet'} action={<LinkButton href="/agent/search" size="sm">Search hotels</LinkButton>}>
            {needle || f !== 'all' ? 'Try another filter.' : 'Your agency’s bookings will appear here with their live status.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Reference</th><th>Hotel</th><th>Stay</th><th>Lead guest</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {rows.map(({ b, hotelName, city }) => (
                  <tr key={b.id}>
                    <td><Link href={`/agent/bookings/${b.id}`} className="num font-medium underline-offset-4 hover:underline">{b.reference}</Link>{b.agentReference && <p className="text-[0.75rem] text-faint">{b.agentReference}</p>}</td>
                    <td>{hotelName}<p className="text-[0.75rem] text-faint">{city}</p></td>
                    <td className="num whitespace-nowrap">{formatDate(b.checkIn, { day: 'numeric', month: 'short' })} – {formatDate(b.checkOut)}{b.checkIn >= today && b.status === 'confirmed' && <p className="text-[0.75rem] text-faint">Upcoming</p>}</td>
                    <td>{b.leadGuest}</td>
                    <td><StatusPill status={b.status} /></td>
                    <td><PaymentPill status={b.paymentStatus} /></td>
                    <td className="text-right"><Money minor={b.sellMinor} currency={b.currency} /></td>
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
