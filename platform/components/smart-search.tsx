'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { smartSearchAction } from '@/app/actions/ai';
import { Sparkle } from './ai-bits';
import { cx } from './ui';

function Go() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] bg-champagne px-5 text-[0.9rem] font-medium text-ink transition-colors hover:bg-[#b8955c] disabled:opacity-60">
      {pending ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Sparkle />}
      {pending ? 'Reading…' : 'Find hotels'}
    </button>
  );
}

/** "Describe the stay" — turns plain language into a search. */
export function SmartSearch({ enabled, tone = 'dark' }: { enabled: boolean; tone?: 'dark' | 'light' }) {
  const [state, run] = useActionState(smartSearchAction, null);
  return (
    <form action={run}>
      <div className={cx('flex flex-col gap-2 rounded-[var(--radius-md)] p-1.5 sm:flex-row', tone === 'dark' ? 'bg-paper/[0.06] ring-1 ring-paper/15' : 'bg-surface ring-1 ring-line')}>
        <input
          name="q" disabled={!enabled} autoComplete="off"
          placeholder={enabled ? 'e.g. 3 rooms in Phuket, 12–16 Dec — two couples and a single' : 'AI search switches on once an API key is added'}
          className={cx('h-12 min-w-0 flex-1 bg-transparent px-4 text-[0.98rem] outline-none disabled:cursor-not-allowed',
            tone === 'dark' ? 'text-paper placeholder:text-paper/40' : 'text-ink placeholder:text-faint')}
        />
        {enabled && <Go />}
      </div>
      {state?.message && <p role="status" className={cx('mt-3 text-[0.88rem]', tone === 'dark' ? 'text-paper/75' : 'text-muted')}>{state.message}</p>}
    </form>
  );
}
