import Link from 'next/link';
import { Empty, Money, PageHeader, Pill } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { describeRooms } from '@/lib/domain/occupancy';
import { requireStaff } from '@/lib/session';
import { listStaff } from '@/lib/services/staff';
import { listRateRequests } from '@/lib/services/rate-requests';

export const metadata = { title: 'Best-rate requests' };

type Row = Awaited<ReturnType<typeof listRateRequests>>[number];

/** What the desk has to do next — the list is sorted by it. */
function next(r: Row): { label: string; tone: 'attention' | 'pending' | 'positive' | 'neutral'; rank: number } {
  if (r.state === 'accepted') return { label: 'Accepted — confirm the booking', tone: 'positive', rank: 2 };
  if (r.toReview) return { label: `${r.toReview} hotel repl${r.toReview === 1 ? 'y' : 'ies'} to check & send`, tone: 'attention', rank: 0 };
  if (r.toQuoteInHouse) return { label: 'Our contract — enter the rate', tone: 'attention', rank: 0 };
  if (r.needsAsking) return { label: r.asked === 0 ? 'New — ask hotels' : 'Agent added a hotel — ask it', tone: 'attention', rank: 0 };
  if (r.state === 'working' && r.waiting === 0) return { label: 'No hotel replies left — ask more or close', tone: 'attention', rank: 0 };
  if (r.state === 'working') return { label: `Waiting for ${r.waiting} hotel${r.waiting === 1 ? '' : 's'}`, tone: 'pending', rank: 1 };
  if (r.state === 'offers') return { label: `${r.offers} offer${r.offers === 1 ? '' : 's'} with the agent`, tone: 'positive', rank: 3 };
  if (r.state === 'no_offer') return { label: 'Closed — no offer', tone: 'neutral', rank: 4 };
  if (r.state === 'expired') return { label: 'Offer expired', tone: 'neutral', rank: 4 };
  return { label: 'Cancelled', tone: 'neutral', rank: 5 };
}

export default async function AdminRateRequestsPage() {
  const { actor } = await requireStaff();
  const db = await getDb();
  const [rows, staff] = await Promise.all([listRateRequests(db, actor), listStaff(db)]);
  const who = (id: string | null) => staff.find((u) => u.id === id)?.name ?? null;
  const sorted = rows.map((r) => ({ r, n: next(r) })).sort((a, b) => a.n.rank - b.n.rank || b.r.createdAt.getTime() - a.r.createdAt.getTime());
  const todo = sorted.filter((x) => x.n.rank === 0).length;
  return (
    <>
      <PageHeader eyebrow="Operations" title="Best-rate requests"
        description={`Agents ask, we ask the hotels, check the replies and send the best ones back. Agents never see this side.${todo ? ` ${todo} need${todo === 1 ? 's' : ''} you now.` : ''}`} />
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No best-rate requests yet">Mark a hotel “Best rate on request” in Hotels, and agents can ask for it from the hotel page.</Empty> : (
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Request</th><th>Agency</th><th>Stay</th><th>Next step</th><th>Best offer</th><th>Handled by</th></tr></thead>
            <tbody>{sorted.map(({ r, n }) => (
              <tr key={r.id}>
                <td><Link href={`/admin/rate-requests/${r.id}`} className="font-medium hover:underline">{r.hotelName}</Link><p className="text-[0.72rem] text-faint">{r.reference} · {r.city} · {formatDateTime(r.createdAt)}</p></td>
                <td>{r.agencyName}</td>
                <td className="num">{formatDate(r.checkIn)} – {formatDate(r.checkOut)}<p className="text-[0.72rem] text-faint">{describeRooms(r.rooms)}{r.hotels > 1 ? ` · ${r.hotels} hotels` : ''}</p></td>
                <td><Pill tone={n.tone}>{n.label}</Pill></td>
                <td className="text-[0.85rem]">{r.best ? <><Money minor={r.best.sellMinor!} currency={r.best.quoteCurrency!} /><p className="text-[0.72rem] text-faint">{r.best.hotelName} · net {formatMoney(r.best.quoteNetMinor!, r.best.quoteCurrency!)}</p></> : '—'}{r.fit === 'over' && <p className="text-[0.72rem] text-attention">Above budget</p>}</td>
                <td className="text-[0.85rem]">{who(r.assignedTo) ?? <span className="text-faint">Team inbox</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
