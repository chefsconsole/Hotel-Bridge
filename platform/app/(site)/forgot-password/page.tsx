import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { forgotPasswordAction } from '@/app/actions/auth';

export const metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 md:py-28">
      <h1 className="text-[2rem] font-semibold">Forgot your password?</h1>
      <p className="mt-3 text-muted">Enter the email you sign in with. We&apos;ll email you a link to set a new password.</p>
      <ActionForm action={forgotPasswordAction} className="mt-8 space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
        <Field label="Email"><input name="email" type="email" required autoComplete="email" className="field" /></Field>
        <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">Email me a link</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-[0.9rem] text-muted"><Link href="/login" className="text-ink underline">Back to sign in</Link></p>
    </div>
  );
}
