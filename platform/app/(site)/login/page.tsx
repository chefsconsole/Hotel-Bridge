import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { loginAction } from '@/app/actions/auth';
import { getSession, homeFor } from '@/lib/session';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await getSession();
  if (s) redirect(homeFor(s.user));
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <p className="eyebrow">Agent, partner and team sign-in</p>
      <h1 className="mt-3 text-[2rem] font-semibold">Welcome back</h1>
      <ActionForm action={loginAction} className="mt-8 space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
        <input type="hidden" name="next" value={next ?? ''} />
        <Field label="Email"><input name="email" type="email" autoComplete="email" required className="field" /></Field>
        <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className="field" /></Field>
        <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-[0.9rem] text-muted">
        New to HotelBridge? <Link href="/register" className="font-medium text-ink underline underline-offset-4">Register your agency</Link>
      </p>
      <p className="mt-2 text-center text-[0.8rem] text-faint">Forgotten your password? Email info@hotelbridge.co from your registered address.</p>
    </div>
  );
}
