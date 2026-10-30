import Link from 'next/link';
import { StagePill, roomsText } from '@/components/group-bits';
import { Empty, PageHeader, SampleTag } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate, formatDateTime, todayIso } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { listEnquiries, GROUP_STAGES, STAGE_LABEL } from '@/lib/services/groups';

export const metadata = { title: 'Group Desk' };

export default async function AdminGroups({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { actor } = await requireStaff();
  const { stage } = await searchParams;
  let rows = await listEnquiries(await getDb(), actor);
  const counts = Object.fromEntries(GROUP_STAGES.map((s) => [s, rows.filter((r) => r.e.status === s).length]));
  if (stage) rows = rows.filter((r) => r.e.status === stage);
  const now = new Date();
  const today = todayIso();
  return (
    <>
      <PageHeader eyebrow="Group Desk" title="Pipeline" />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/admin/groups" className={`rounded-full px-3 py-1.5 text-[0.8rem] ${!stage ? 'bg-ink text-paper' : 'bg-surface ring-1 ring-line text-muted'}`}>All</Link>
        {GROUP_STAGES.map((s) => <Link key={s} href={`/admin/groups?stage=${s}`} className={`rounded-full px-3 py-1.5 text-[0.8rem] ${stage === s ? 'bg-ink text-paper' : 'bg-surface ring-1 ring-line text-muted'}`}>{STAGE_LABEL[s]} <span className="num opacity-60">{counts[s]}</span></Link>)}
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No enquiries here" /> : (
          <table className="table"><thead><tr><th>Ref</th><th>Agency</th><th>Group</th><th>Itinerary</th><th>Rooms</th><th>Deadlines</th><th>Stage</th></tr></thead>
            <tbody>{rows.map(({ e, agencyName }) => {
              const late = ['new', 'under_review'].includes(e.status) && e.respondBy < now;
              return (
                <tr key={e.id}>
                  <td><Link href={`/admin/groups/${e.id}`} className="num font-medium hover:underline">{e.reference}</Link> {e.isSample && <SampleTag />}</td>
                  <td>{agencyName}</td><td>{e.groupName}<p className="text-[0.75rem] text-faint">{e.totalPax} pax · {e.groupType}</p></td>
                  <td>{e.legs.map((l) => l.city).join(' → ')}<p className="text-[0.75rem] text-faint">{formatDate(e.legs[0].checkIn)}</p></td>
                  <td className="text-[0.85rem]">{roomsText(e.rooms)}</td>
                  <td className="text-[0.8rem]"><p className={late ? 'text-negative' : 'text-muted'}>Reply by {formatDateTime(e.respondBy)}</p><p className={e.quoteNeededBy <= today ? 'text-attention' : 'text-muted'}>Quote by {formatDate(e.quoteNeededBy)}</p></td>
                  <td><StagePill status={e.status} /></td>
                </tr>
              );
            })}</tbody></table>
        )}
      </div>
    </>
  );
}
