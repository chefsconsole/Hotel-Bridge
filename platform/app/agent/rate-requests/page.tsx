import Link from 'next/link';
import { Empty, Money, PageHeader, Pill } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { describeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { RATE_STATUS, listRateRequests } from '@/lib/services/rate-requests';

export const metadata = { title: 'Best-rate requests' };

export default async function RateRequestsPage() {
  const { actor } = await requireAgent();
  const rows = await listRateRequests(await getDb(), actor);
  return (
    <>
      <PageHeader eyebrow="Book" title="Best-rate requests" description="Hotels marked “Best rate on request” quote a special price for each enquiry, usually below their public rate. Ask from the hotel page; the answer arrives here within 24 hours." />
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No requests yet" action={<Link href="/agent/search" className="text-[0.9rem] font-medium underline underline-offset-4">Search hotels</Link>}>Open a hotel marked “Best rate on request” and press Get best rate.</Empty> : (
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Reference</th><th>Hotel</th><th>Stay</th><th>Rooms</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/agent/rate-requests/${r.id}`} className="num font-medium hover:underline">{r.reference}</Link></td>
                <td>{r.hotelName}<p className="text-[0.75rem] text-faint">{r.city}</p></td>
                <td className="num">{formatDate(r.checkIn)} – {formatDate(r.checkOut)}</td>
                <td className="text-[0.85rem]">{describeRooms(r.rooms)}</td>
                <td>{r.sellMinor != null && r.quoteCurrency ? <Money minor={r.sellMinor} currency={r.quoteCurrency} /> : '—'}{r.fit === 'over' && <p className="text-[0.72rem] text-attention">Above budget</p>}</td>
                <td><Pill tone={RATE_STATUS[r.status]?.tone ?? 'neutral'}>{RATE_STATUS[r.status]?.label ?? r.status}</Pill></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
