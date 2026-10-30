import { desc, eq } from 'drizzle-orm';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Empty, PageHeader, Panel, Pill } from '@/components/ui';
import { supportReplyAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { formatDateTime } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Support' };

export default async function Support() {
  await requireStaff();
  const db = await getDb();
  const rows = await db.select({ t: schema.supportTickets, agency: schema.agencies.name, ref: schema.bookings.reference }).from(schema.supportTickets)
    .innerJoin(schema.agencies, eq(schema.agencies.id, schema.supportTickets.agencyId)).leftJoin(schema.bookings, eq(schema.bookings.id, schema.supportTickets.bookingId))
    .orderBy(desc(schema.supportTickets.createdAt));
  return (
    <>
      <PageHeader eyebrow="Operations" title="Support requests" />
      <Panel padded={false}>
        {rows.length === 0 ? <Empty title="No support requests" /> : (
          <ul className="divide-y divide-line">{rows.map(({ t, agency, ref }) => (
            <li key={t.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{t.subject}</p>{t.urgency === 'urgent' && <Pill tone="negative">urgent</Pill>}<Pill tone={t.status === 'open' ? 'attention' : 'neutral'}>{t.status}</Pill></div>
              <p className="text-[0.8rem] text-muted">{agency}{ref ? ` · ${ref}` : ''} · {formatDateTime(t.createdAt)}</p>
              <p className="mt-2 text-[0.88rem] whitespace-pre-line">{t.body}</p>
              <ActionForm action={supportReplyAction} className="mt-3">
                <input type="hidden" name="id" value={t.id} />
                <textarea name="reply" rows={2} defaultValue={t.reply ?? ''} className="field" placeholder="Reply" />
                <div className="mt-2 flex items-center gap-3"><label className="flex items-center gap-1.5 text-[0.82rem]"><input type="checkbox" name="close" className="size-4" /> Close</label><SubmitButton size="sm" variant="secondary">Save reply</SubmitButton></div>
              </ActionForm>
            </li>
          ))}</ul>
        )}
      </Panel>
    </>
  );
}
