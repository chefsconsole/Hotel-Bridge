import { desc } from 'drizzle-orm';
import { PageHeader, Panel } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { formatDateTime } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Audit log' };

export default async function Audit() {
  await requireStaff();
  const rows = await (await getDb()).select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(300);
  return (
    <>
      <PageHeader eyebrow="Governance" title="Audit log" description="Every commercial and account change, who made it and when. Latest 300 entries." />
      <Panel padded={false}>
        <div className="overflow-x-auto"><table className="table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td className="text-[0.8rem] whitespace-nowrap">{formatDateTime(r.createdAt)}</td><td className="text-[0.85rem]">{r.actorLabel}</td><td className="font-medium">{r.action}</td><td className="text-[0.8rem]">{r.entity}</td>
              <td className="max-w-md truncate font-mono text-[0.72rem] text-muted" title={JSON.stringify(r.detail)}>{r.detail ? JSON.stringify(r.detail) : ''}</td></tr>
          ))}</tbody></table></div>
      </Panel>
    </>
  );
}
