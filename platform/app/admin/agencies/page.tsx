import Link from 'next/link';
import { Empty, PageHeader, Pill, SampleTag } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { listAgencies } from '@/lib/services/catalog';

export const metadata = { title: 'Agencies' };

export default async function Agencies() {
  await requireStaff();
  const rows = await listAgencies(await getDb());
  return (
    <>
      <PageHeader eyebrow="Distribution" title="Agencies" description="Verify agencies before they can book. Credit stays off unless finance approves it." />
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No agencies have registered yet" /> : (
          <table className="table"><thead><tr><th>Agency</th><th>Country</th><th>Registered</th><th>Status</th><th>Credit</th><th className="text-right">Users</th><th className="text-right">Bookings</th></tr></thead>
            <tbody>{rows.map(({ a, users, bookings }) => (
              <tr key={a.id}>
                <td><Link href={`/admin/agencies/${a.id}`} className="font-medium hover:underline">{a.name}</Link> {a.isSample && <SampleTag />}</td>
                <td>{a.country}</td><td>{formatDate(a.createdAt)}</td>
                <td><Pill tone={a.status === 'verified' ? 'positive' : a.status === 'pending' ? 'attention' : 'negative'}>{a.status}</Pill></td>
                <td>{a.creditEnabled ? 'On' : 'Off'}</td><td className="num text-right">{users}</td><td className="num text-right">{bookings}</td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
