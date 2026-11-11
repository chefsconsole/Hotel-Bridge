'use client';
/* Cmd/Ctrl+K from anywhere in the workspace: jump to a page, run an action,
 * or find a real record. Keyboard first: ↑ ↓ to move, Enter to open, Esc to close. */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { paletteSearchAction } from '@/app/actions/palette';
import type { PaletteHit } from '@/lib/services/palette';
import { cx } from './ui';

export type PaletteLink = { label: string; href: string; hint?: string };
type Row = { key: string; group: string; title: string; detail?: string; href: string };

export function CommandPalette({ pages, actions }: { pages: PaletteLink[]; actions: PaletteLink[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<PaletteHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const close = useCallback(() => { setOpen(false); setQ(''); setHits([]); setActive(0); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('hb:palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hb:palette', onOpen); };
  }, []);


  // Search real records, debounced; only the latest answer is shown.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) return;
    const mine = ++seq.current;
    const t = setTimeout(() => start(async () => {
      const r = await paletteSearchAction(term);
      if (mine === seq.current) { setHits(r); setActive(0); }
    }), 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const rows = useMemo<Row[]>(() => {
    const n = q.trim().toLowerCase();
    const match = (l: PaletteLink) => !n || l.label.toLowerCase().includes(n) || (l.hint ?? '').toLowerCase().includes(n);
    return [
      ...actions.filter(match).map((a) => ({ key: `a:${a.href}`, group: 'Actions', title: a.label, detail: a.hint, href: a.href })),
      ...(n.length >= 2 ? hits : []).map((h) => ({ key: `h:${h.href}`, group: h.kind, title: h.title, detail: h.detail, href: h.href })),
      ...pages.filter(match).map((p) => ({ key: `p:${p.href}`, group: 'Go to', title: p.label, href: p.href })),
    ];
  }, [q, hits, pages, actions]);


  const go = (r?: Row) => { if (!r) return; close(); router.push(r.href); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(rows[active]); }
  };

  if (!open) return null;
  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-3 pt-[12vh] backdrop-blur-[2px] motion-safe:animate-[var(--animate-fade)]" onMouseDown={close}>
      <div role="dialog" aria-modal="true" aria-label="Search HotelBridge" onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[620px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[0_30px_80px_-20px_rgb(10_15_26/0.45)]">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21" /></svg>
          <input ref={input} autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown}
            role="combobox" aria-expanded="true" aria-controls="hb-palette-list" aria-activedescendant={rows[active] ? `hb-row-${active}` : undefined}
            placeholder="Search hotels, bookings, groups, agencies… or jump to a page"
            className="h-14 w-full bg-transparent text-[0.98rem] outline-none placeholder:text-faint" />
          {pending && <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" aria-label="Searching" />}
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[0.7rem] text-faint sm:block">Esc</kbd>
        </div>
        <ul id="hb-palette-list" role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto py-2">
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-[0.9rem] text-muted">{q.trim().length < 2 ? 'Type to search' : pending ? 'Searching…' : `Nothing found for “${q.trim()}”`}</li>
          )}
          {rows.map((r, i) => {
            const header = r.group !== lastGroup ? (lastGroup = r.group) : null;
            return (
              <li key={r.key}>
                {header && <p className="px-4 pt-3 pb-1 text-[0.66rem] font-medium tracking-[0.18em] text-faint uppercase">{header}</p>}
                <button id={`hb-row-${i}`} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => go(r)}
                  className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left', i === active ? 'bg-mist' : '')}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9rem] font-medium">{r.title}</span>
                    {r.detail && <span className="block truncate text-[0.78rem] text-muted">{r.detail}</span>}
                  </span>
                  {i === active && <span className="text-[0.75rem] text-faint" aria-hidden>↵</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[0.72rem] text-faint">
          <span>↑ ↓ to move</span><span>↵ to open</span><span className="ml-auto">⌘K / Ctrl K</span>
        </div>
      </div>
    </div>
  );
}

/** A button that opens the palette (for the sidebar and the mobile header). */
export function PaletteButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event('hb:palette'))}
      className={cx('flex items-center gap-2.5 rounded-[var(--radius-sm)] text-paper/60 ring-1 ring-paper/15 transition-colors hover:text-paper hover:ring-paper/30', compact ? 'px-2.5 py-1.5' : 'w-full px-3 py-2 text-[0.84rem]', className)}
      aria-label="Search (Cmd+K)">
      <svg viewBox="0 0 24 24" className="size-[16px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21" /></svg>
      {!compact && <><span className="flex-1 text-left">Search</span><kbd className="rounded border border-paper/20 px-1.5 text-[0.66rem]">⌘K</kbd></>}
    </button>
  );
}
