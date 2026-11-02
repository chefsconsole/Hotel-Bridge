import Link from 'next/link';
import { Empty, Money, PageHeader, Panel, Pill } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { describeRooms } from '@/lib/domain/occupancy';
import { requireStaff } from '@/lib/session';
import { appUrl } from '@/lib/services/email';
import { RATE_STATUS, listRateRequests } from '@/lib/services/rate-requests';

export const metadata = { title: 'Best-rate requests' };

export default async function AdminRateRequestsPage() {
  const { actor } = await requireStaff();
  const rows = await listRateRequests(await getDb(), actor);
  const accepted = rows.filter((r) => r.status === 'accepted');
  return (
    <>
      <PageHeader eyebrow="Operations" title="Best-rate requests" description="Enquiries sent to hotels that quote per stay. Budgets are private to us and the agent. Accepted rates need a booking confirmed with the hotel." />
      {accepted.length > 0 && (
        <div className="mb-6"><Panel title={`To confirm with the hotel · ${accepted.length}`}>
          <ul className="divide-y divide-line text-[0.9rem]">{accepted.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2"><span><span className="num font-medium">{r.reference}</span> · {r.hotelName} · {formatDate(r.checkIn)} – {formatDate(r.checkOut)} · {r.agencyName}</span><span>{formatMoney(r.sellMinor!, r.quoteCurrency!)} (net {formatMoney(r.quoteNetMinor!, r.quoteCurrency!)})</span></li>
          ))}</ul>
        </Panel></div>
      )}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No best-rate requests yet">Mark a hotel “Best rate on request” in Hotels, and agents can ask it from the hotel page.</Empty> : (
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Reference</th><th>Agency</th><th>Hotel</th><th>Stay</th><th>Budget (private)</th><th>Net → sell</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="num font-medium">{r.reference}<p className="text-[0.72rem] font-normal text-faint">{formatDateTime(r.createdAt)}</p></td>
                <td>{r.agencyName}</td>
                <td>{r.hotelName}<p className="text-[0.72rem] text-faint">{r.hotelEmail}</p>{(r.status === 'not_emailed' || r.status === 'sent') && <Link href={appUrl(`/r/${r.token}`)} className="text-[0.72rem] underline">Hotel reply link</Link>}</td>
                <td className="num">{formatDate(r.checkIn)} – {formatDate(r.checkOut)}<p className="text-[0.72rem] text-faint">{describeRooms(r.rooms)}</p></td>
                <td>{r.budgetMinor != null && r.budgetCurrency ? <Money minor={r.budgetMinor} currency={r.budgetCurrency} /> : '—'}{r.fit === 'over' && <p className="text-[0.72rem] text-attention">Quote above budget</p>}</td>
                <td className="text-[0.85rem]">{r.quoteNetMinor != null && r.quoteCurrency ? `${formatMoney(r.quoteNetMinor, r.quoteCurrency)} → ${formatMoney(r.sellMinor!, r.quoteCurrency)}` : '—'}</td>
                <td><Pill tone={RATE_STATUS[r.status]?.tone ?? 'neutral'}>{RATE_STATUS[r.status]?.label ?? r.status}</Pill></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
