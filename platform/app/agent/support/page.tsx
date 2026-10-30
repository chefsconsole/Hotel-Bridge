import { desc, eq } from 'drizzle-orm';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, PageHeader, Panel, Pill } from '@/components/ui';
import { supportAction } from '@/app/actions/agent';
import { getDb, schema } from '@/lib/db';
import { formatDateTime } from '@/lib/domain/dates';
import { requireAgent } from '@/lib/session';
import { SUPPORT_EMAIL } from '@/lib/config';

export const metadata = { title: 'Support' };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { agency } = await requireAgent();
  const { ref } = await searchParams;
  const db = await getDb();
  const tickets = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.agencyId, agency.id)).orderBy(desc(schema.supportTickets.createdAt));
  return (
    <>
      <PageHeader eyebrow="Help" title="Support" description={`Write to us here or at ${SUPPORT_EMAIL}. Include the booking reference so we can act straight away.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
        <Panel title="New request">
          <ActionForm action={supportAction} resetOnSuccess className="space-y-4">
            <Field label="Booking reference (optional)"><input name="bookingRef" defaultValue={ref} className="field num" placeholder="HB-XXXXXX" /></Field>
            <Field label="Subject"><input name="subject" className="field" /></Field>
            <Field label="How can we help?"><textarea name="body" rows={5} className="field" /></Field>
            <label className="flex items-center gap-2 text-[0.88rem]"><input type="checkbox" name="urgent" className="size-4 accent-[var(--color-ink)]" /> Urgent — guest affected in the next 48 hours</label>
            <SubmitButton>Send</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="Your requests" padded={false}>
          {tickets.length === 0 ? <Empty title="No support requests" /> : (
            <ul className="divide-y divide-line">
              {tickets.map((t) => (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium">{t.subject}</p><Pill tone={t.status === 'open' ? 'pending' : 'positive'}>{t.status}</Pill></div>
                  <p className="text-[0.75rem] text-faint">{formatDateTime(t.createdAt)}{t.urgency === 'urgent' ? ' · urgent' : ''}</p>
                  <p className="mt-2 text-[0.88rem] text-muted whitespace-pre-line">{t.body}</p>
                  {t.reply && <p className="mt-3 rounded-[var(--radius-sm)] bg-mist p-3 text-[0.88rem] whitespace-pre-line"><span className="font-medium">HotelBridge:</span> {t.reply}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
