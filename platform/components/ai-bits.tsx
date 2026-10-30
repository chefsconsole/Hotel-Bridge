'use client';
import { useActionState, useState, type ReactNode } from 'react';
import { SubmitButton } from './forms';
import { buttonClass, cx } from './ui';
import type { ActionResult } from '@/lib/action';

type Action = (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export function Sparkle({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z" strokeLinejoin="round" />
    </svg>
  );
}

/** A form whose server action returns { data: { output, notes } } — shown in a copyable panel. */
export function AiForm({ action, children, submit, pendingLabel = 'Thinking…', disabled, outputLabel = 'Draft', useHrefBase, useLabel = 'Use this' }: {
  action: Action; children: ReactNode; submit: string; pendingLabel?: string; disabled?: boolean; outputLabel?: string; useHrefBase?: string; useLabel?: string;
}) {
  const [state, run] = useActionState(action, null);
  const [copied, setCopied] = useState(false);
  const output = state?.data?.output as string | undefined;
  const notes = state?.data?.notes as string | undefined;
  return (
    <div>
      <form action={run} className="space-y-4" noValidate>
        {children}
        <SubmitButton pendingLabel={pendingLabel} className={cx(disabled && 'pointer-events-none opacity-40')}>
          <Sparkle /> {submit}
        </SubmitButton>
      </form>
      {state && !state.ok && state.message && (
        <p role="alert" className="mt-4 rounded-[var(--radius-sm)] bg-mist px-4 py-3 text-[0.9rem] whitespace-pre-line text-ink">{state.message}</p>
      )}
      {output && (
        <div className="mt-6 animate-[var(--animate-rise)] rounded-[var(--radius-md)] border border-champagne/30 bg-champagne-soft/40">
          <div className="flex items-center justify-between border-b border-champagne/20 px-4 py-2.5">
            <p className="eyebrow">{outputLabel} · review before use</p>
            <div className="flex gap-2">
              {useHrefBase && <a href={useHrefBase + encodeURIComponent(output)} className={buttonClass('secondary', 'sm')}>{useLabel}</a>}
              <button type="button" className={buttonClass('ghost', 'sm')} onClick={async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <pre className="max-h-[28rem] overflow-auto px-4 py-4 font-[family-name:var(--font-sans)] text-[0.9rem] leading-relaxed whitespace-pre-wrap">{output}</pre>
          {notes && <p className="border-t border-champagne/20 px-4 py-3 text-[0.82rem] whitespace-pre-line text-attention">{notes}</p>}
        </div>
      )}
    </div>
  );
}

export function AiOffNotice() {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-dashed border-line-strong bg-surface px-4 py-3 text-[0.88rem] text-muted">
      <Sparkle className="mt-0.5 size-4 shrink-0 text-champagne" />
      <p><span className="font-medium text-ink">AI is not connected yet.</span> An administrator adds an Anthropic API key to the server (<code className="text-[0.8rem]">ANTHROPIC_API_KEY</code>) to switch these tools on. Everything else works without it.</p>
    </div>
  );
}
