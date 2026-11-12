'use client';
/* Interactive form primitives. Every form posts to a server action that
 * returns an ActionResult; nothing is validated only in the browser. */
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonClass, cx } from './ui';
import type { ActionResult } from '@/lib/action';

export function SubmitButton({ children, pendingLabel, variant = 'primary', size = 'md', className = '', name, value, confirm }: {
  children: ReactNode; pendingLabel?: string; variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1];
  className?: string; name?: string; value?: string; confirm?: string;
}) {
  const { pending: nativePending } = useFormStatus();
  const pending = useContext(Pending) || nativePending;
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

/** True while the surrounding form (ActionForm or a native action form) is submitting. */
export function useFormPending() {
  const { pending } = useFormStatus();
  return useContext(Pending) || pending;
}

/** Pending state for SubmitButton when the form is submitted by ActionForm. */
const Pending = createContext(false);

/** Vercel refuses requests over 4.5 MB; stay safely under it. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const labelOf = (el: Element) => ((el as HTMLElement).dataset.label ?? el.closest('label')?.querySelector('span')?.textContent ?? (el as HTMLInputElement).name).replace(/\s*\*$/, '').trim();

/** A form bound to a server action, with inline errors and success messages.
 *  What the user typed is never cleared on an error — only on success when resetOnSuccess is set. */
export function ActionForm({ action, children, className = '', resetOnSuccess = false, id, showMessage = true }: {
  action: Action; children: ReactNode | ((state: ActionResult | null) => ReactNode); className?: string; resetOnSuccess?: boolean; id?: string;
  /** false when the children render the result themselves (children as a function). */
  showMessage?: boolean;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [local, setLocal] = useState<ActionResult | null>(null);
  const ref = useRef<HTMLFormElement>(null);

  const mark = (names: string[]) => {
    const form = ref.current;
    if (!form) return;
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    let first: HTMLElement | null = null;
    for (const n of names) {
      // A server field may map to a differently named input (data-field="legs"), and a
      // hidden input (date pickers) is shown through the button next to it.
      let el = form.querySelector<HTMLElement>(`[name="${CSS.escape(n)}"]`) ?? form.querySelector<HTMLElement>(`[data-field~="${CSS.escape(n)}"]`);
      if (el instanceof HTMLInputElement && el.type === 'hidden') el = el.parentElement?.querySelector<HTMLElement>('button') ?? null;
      if (!el) continue;
      el.setAttribute('aria-invalid', 'true');
      first ??= el;
    }
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus({ preventScroll: true }); }
  };

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
    const fields = (state?.data as { fields?: string[] } | undefined)?.fields;
    if (state && !state.ok && fields) mark(fields);
  }, [state, resetOnSuccess]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    // Submit ourselves instead of <form action>, because React clears an action form
    // after every submission — including failed ones — and agents lost what they typed.
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const missing: Element[] = [];
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[required]').forEach((el) => {
      if (el.disabled) return;
      const empty = el instanceof HTMLInputElement && el.type === 'checkbox' ? !el.checked : !String(el.value).trim();
      if (empty) missing.push(el);
    });
    let bytes = 0;
    form.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((el) => { for (const f of Array.from(el.files ?? [])) bytes += f.size; });
    if (missing.length) {
      setLocal({ ok: false, message: `Please fill in: ${[...new Set(missing.map(labelOf))].join(', ')}` });
      mark(missing.map((el) => (el as HTMLInputElement).name));
      return;
    }
    if (bytes > MAX_UPLOAD_BYTES) {
      setLocal({ ok: false, message: `Your files add up to ${(bytes / 1048576).toFixed(1)} MB. The limit is 4 MB in total — please upload a smaller scan or a phone photo.` });
      return;
    }
    setLocal(null);
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    const fd = new FormData(form, submitter);
    startTransition(() => run(fd));
  };

  return (
    <Pending.Provider value={pending}>
      {/* action={run} keeps the form working before the page's JavaScript has loaded (a normal POST to the
          server action). Once it has, onSubmit takes over and preventDefault stops React's auto-reset path. */}
      <form ref={ref} action={run} onSubmit={onSubmit} className={className} id={id} noValidate
        onInput={(e) => { const t = e.target as HTMLElement; if (t.getAttribute('aria-invalid')) t.removeAttribute('aria-invalid'); }}>
        {typeof children === 'function' ? children(local ?? (pending ? null : state)) : children}
        {showMessage && <FormMessage state={local ?? (pending ? null : state)} />}
      </form>
    </Pending.Provider>
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

export function Field({ label, hint, children, className = '', required = false }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[0.82rem] font-medium text-ink">{label}{required && <span className="text-negative" aria-hidden> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.78rem] text-faint">{hint}</span>}
    </label>
  );
}
