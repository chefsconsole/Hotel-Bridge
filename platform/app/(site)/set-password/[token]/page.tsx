import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { setPasswordAction } from '@/app/actions/auth';
import { getDb } from '@/lib/db';
import { passwordLinkUser } from '@/lib/services/auth';

export const metadata = { title: 'Set your password' };

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const who = await passwordLinkUser(await getDb(), token);
  return (
    <div className="mx-auto max-w-md px-4 py-20 md:py-28">
      <h1 className="text-[2rem] font-semibold">Set your password</h1>
      {who ? (
        <ActionForm action={setPasswordAction} className="mt-8 space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
          <p className="text-[0.9rem] text-muted">For <strong className="text-ink">{who.email}</strong>. At least 10 characters.</p>
          <input type="hidden" name="token" value={token} />
          <Field label="New password"><input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" /></Field>
          <Field label="Type it again"><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field" /></Field>
          <SubmitButton className="w-full" size="lg" pendingLabel="Saving…">Save password</SubmitButton>
        </ActionForm>
      ) : (
        <p className="mt-6 text-muted">This link has expired or was already used. Ask HotelBridge for a new one, or <Link href="/login" className="text-ink underline">sign in</Link>.</p>
      )}
    </div>
  );
}
