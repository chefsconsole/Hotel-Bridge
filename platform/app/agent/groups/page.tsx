import Link from 'next/link';
import { StagePill, roomsText } from '@/components/group-bits';
import { Empty, LinkButton, PageHeader } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { requireAgent } from '@/lib/session';
import { listEnquiries } from '@/lib/services/groups';

export const metadata = { title: 'Group Desk' };

export default async function GroupsPage() {
  const { actor } = await requireAgent();
  const rows = await listEnquiries(await getDb(), actor);
  return (
    <>
      <PageHeader eyebrow="Group Desk" title="Group requests" description="For larger rooming lists, multi-city tours and special requirements. A specialist negotiates with the hotels and sends you a written proposal."
        actions={<LinkButton href="/agent/groups/new">New group request</LinkButton>} />
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No group requests yet" action={<LinkButton href="/agent/groups/new" size="sm">Start a request</LinkButton>} /> : (
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Reference</th><th>Group</th><th>Itinerary</th><th>Rooms</th><th>Quote needed by</th><th>Stage</th></tr></thead>
            <tbody>{rows.map(({ e }) => (
              <tr key={e.id}>
                <td><Link href={`/agent/groups/${e.id}`} className="num font-medium hover:underline">{e.reference}</Link></td>
                <td>{e.groupName}<p className="text-[0.75rem] text-faint">{e.totalPax} travellers · {e.groupType}</p></td>
                <td>{e.legs.map((l) => l.city).join(' → ')}<p className="text-[0.75rem] text-faint">{formatDate(e.legs[0].checkIn)}</p></td>
                <td className="text-[0.85rem]">{roomsText(e.rooms)}</td>
                <td>{formatDate(e.quoteNeededBy)}</td>
                <td><StagePill status={e.status} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
