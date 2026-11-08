import { Empty, PageHeader, Pill } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/forms';
import { testEmailAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { formatDateTime } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { emailConfigured, recentEmails } from '@/lib/services/email';

export const metadata = { title: 'Emails' };

export default async function EmailsPage() {
  await requireStaff();
  const rows = await recentEmails(await getDb(), 200);
  const cfg = emailConfigured();
  return (
    <>
      <PageHeader eyebrow="Governance" title="Emails" description="Every email the system tried to send, and what really happened. Nothing counts as sent unless the email provider accepted it." />
      <p className={`mb-6 rounded-[var(--radius-md)] px-4 py-3 text-[0.88rem] ${cfg.ok ? 'bg-positive-bg text-positive' : 'bg-pending-bg text-pending'}`}>
        {cfg.ok ? 'Email is connected — messages go out through Resend.' : `Email is not sending: ${cfg.reason}. Messages are recorded here so they can be sent by hand.`}
      </p>
      <ActionForm action={testEmailAction} className="mb-6 flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" variant="secondary" pendingLabel="Sending…">Send test email</SubmitButton>
        <span className="text-[0.82rem] text-muted">Sends a short test to HotelBridge&apos;s own inbox.</span>
      </ActionForm>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No emails yet" /> : (
          <table className="table">
            <thead><tr><th>When</th><th>To</th><th>Subject</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.id}>
                <td className="text-[0.8rem] whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                <td className="text-[0.85rem]">{m.toName}<p className="text-[0.75rem] text-faint">{m.toEmail}</p></td>
                <td className="max-w-md text-[0.85rem]">
                  <details><summary className="cursor-pointer">{m.subject}</summary><pre className="mt-2 max-h-72 overflow-auto rounded bg-mist p-3 text-[0.75rem] whitespace-pre-wrap">{m.body}</pre></details>
                </td>
                <td className="text-[0.8rem]">{m.kind.replace('_', ' ')}</td>
                <td><Pill tone={m.status === 'sent' ? 'positive' : m.status === 'failed' ? 'negative' : 'pending'}>{m.status === 'not_configured' ? 'Not sent' : m.status}</Pill>{m.error && <p className="mt-1 max-w-48 text-[0.72rem] text-faint">{m.error}</p>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
