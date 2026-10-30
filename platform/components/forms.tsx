'use client';
/* Interactive form primitives. Every form posts to a server action that
 * returns an ActionResult; nothing is validated only in the browser. */
import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonClass, cx } from './ui';
import type { ActionResult } from '@/lib/action';

export function SubmitButton({ children, pendingLabel, variant = 'primary', size = 'md', className = '', name, value, confirm }: {
  children: ReactNode; pendingLabel?: string; variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1];
  className?: string; name?: string; value?: string; confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit" name={name} value={value} disabled={pending} aria-busy={pending}
      className={buttonClass(variant, size, className)}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
    >
      {pending && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {pending ? pendingLabel ?? 'Working…' : children}
    </button>
  );
}

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/** A form bound to a server action, with inline errors and success messages. */
export function ActionForm({ action, children, className = '', resetOnSuccess = false, id }: { action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean; id?: string }) {
  const [state, run] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={run} className={className} id={id} noValidate>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: ActionResult | null }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? 'status' : 'alert'} className={cx('mt-3 rounded-[var(--radius-sm)] px-3 py-2 text-[0.88rem] whitespace-pre-line animate-[var(--animate-fade)]', state.ok ? 'bg-positive-bg text-positive' : 'bg-negative-bg text-negative')}>
      {state.message}
    </p>
  );
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[0.82rem] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.78rem] text-faint">{hint}</span>}
    </label>
  );
}
