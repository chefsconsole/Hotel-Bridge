import { desc } from 'drizzle-orm';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Empty, PageHeader, Panel, Pill } from '@/components/ui';
import { applicationStatusAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { formatDateTime } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Partner applications' };

export default async function Partners() {
  await requireStaff();
  const rows = await (await getDb()).select().from(schema.partnerApplications).orderBy(desc(schema.partnerApplications.createdAt));
  return (
    <>
      <PageHeader eyebrow="Partnerships" title="Partner applications" description="Hotels and distribution partners who asked to join. Onboard a hotel by creating it under Hotels & contracts." />
      <Panel padded={false}>
        {rows.length === 0 ? <Empty title="No applications yet" /> : (
          <ul className="divide-y divide-line">{rows.map((a) => (
            <li key={a.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium">{a.organisation} <Pill tone="neutral" dot={false}>{a.kind}</Pill> <Pill tone={a.status === 'new' ? 'attention' : 'neutral'}>{a.status}</Pill></p>
                <p className="text-[0.85rem] text-muted">{a.contactName} · {a.email}{a.phone ? ` · ${a.phone}` : ''} · {[a.city, a.country].filter(Boolean).join(', ')}{a.rooms ? ` · ${a.rooms} rooms` : ''}</p>
                {a.message && <p className="mt-1 text-[0.85rem] whitespace-pre-line">{a.message}</p>}
                <p className="text-[0.75rem] text-faint">{formatDateTime(a.createdAt)}</p>
              </div>
              <ActionForm action={applicationStatusAction} className="flex gap-1.5">
                <input type="hidden" name="id" value={a.id} />
                {['contacted', 'onboarding', 'declined'].map((s) => <SubmitButton key={s} size="sm" variant="secondary" name="status" value={s}>{s}</SubmitButton>)}
              </ActionForm>
            </li>
          ))}</ul>
        )}
      </Panel>
    </>
  );
}
