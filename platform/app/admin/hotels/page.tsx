import Link from 'next/link';
import { Empty, LinkButton, PageHeader, Pill, SampleTag } from '@/components/ui';
import { getDb } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { listHotelsAdmin } from '@/lib/services/catalog';

export const metadata = { title: 'Hotels & contracts' };

export default async function AdminHotels() {
  await requireStaff();
  const rows = await listHotelsAdmin(await getDb());
  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Hotels & contracts" description="A hotel is visible to agents once published; it is bookable only with an active contract that permits distribution." actions={<LinkButton href="/admin/hotels/new">Add hotel</LinkButton>} />
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No hotels yet" action={<LinkButton href="/admin/hotels/new" size="sm">Add the first hotel</LinkButton>}>Add contracted partners one at a time. Partner data is never bulk-imported into code.</Empty> : (
          <table className="table"><thead><tr><th>Hotel</th><th>City</th><th>Profile</th><th>Contracts</th></tr></thead>
            <tbody>{rows.map(({ h, contracts, activeContracts }) => (
              <tr key={h.id}>
                <td><Link href={`/admin/hotels/${h.id}`} className="font-medium hover:underline">{h.name}</Link> {h.isSample && <SampleTag />}</td>
                <td>{h.city}, {h.country}</td>
                <td><Pill tone={h.status === 'active' ? 'positive' : h.status === 'draft' ? 'pending' : 'neutral'}>{h.status === 'active' ? 'Published' : h.status}</Pill></td>
                <td>{activeContracts ? <Pill tone="positive">{activeContracts} active</Pill> : <Pill tone="attention">None active</Pill>} <span className="text-[0.8rem] text-faint">{contracts} total</span></td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
