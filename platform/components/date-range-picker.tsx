'use client';
/* Check-in / check-out in one place: two months side by side, pick the
 * arrival then the departure, the stay is highlighted and the nights are
 * counted as you go. Dates are plain ISO strings (YYYY-MM-DD). */
import { useEffect, useRef, useState } from 'react';
import { addDays, daysBetween } from '@/lib/domain/dates';
import { cx } from './ui';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthLabel = (y: number, m: number) => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, 1)));
const short = (s: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s + 'T00:00:00Z'));

function localToday() {
  const d = new Date();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthGrid(y: number, m: number): (string | null)[] {
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7; // Monday-first weeks
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(isoOf(y, m, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function DateRangePicker({ checkIn, checkOut, onChange, maxNights = 30, autoOpen = false }: {
  checkIn: string; checkOut: string; onChange: (checkIn: string, checkOut: string) => void; maxNights?: number; autoOpen?: boolean;
}) {
  const [today] = useState(localToday);
  const [open, setOpen] = useState(autoOpen);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [hover, setHover] = useState<string | null>(null);
  const start = checkIn || today;
  const [view, setView] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }));
  const box = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;
  const lastAllowedOut = checkIn ? addDays(checkIn, maxNights) : null;

  function openAt(p: 'in' | 'out', from: HTMLElement) {
    setPhase(p === 'out' && !checkIn ? 'in' : p);
    const anchor = (p === 'out' && checkOut) || checkIn || today;
    let y = Number(anchor.slice(0, 4));
    let m = Number(anchor.slice(5, 7)) - 1;
    // One month visible (phones) and fewer than a week left in it: start on next month.
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    if (!checkIn && window.innerWidth < 640 && daysInMonth - Number(anchor.slice(8)) < 6) { m += 1; if (m > 11) { m = 0; y += 1; } }
    setView({ y, m });
    // Keep the popover on screen: slide it left if it would overflow.
    const r = from.closest('[data-drp]')?.getBoundingClientRect();
    if (r) {
      const width = Math.min(680, window.innerWidth - 32);
      setShiftX(Math.min(0, window.innerWidth - 16 - (r.left + width)));
    }
    setOpen(true);
  }

  function pick(day: string) {
    if (phase === 'in' || !checkIn || day <= checkIn) {
      onChange(day, '');
      setPhase('out');
      return;
    }
    if (lastAllowedOut && day > lastAllowedOut) return;
    onChange(checkIn, day);
    setPhase('in');
    setHover(null);
    setTimeout(() => setOpen(false), 180);
  }

  const shift = (delta: number) => setView(({ y, m }) => { const d = new Date(Date.UTC(y, m + delta, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const second = (() => { const d = new Date(Date.UTC(view.y, view.m + 1, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; })();
  const canGoBack = `${view.y}-${pad(view.m + 1)}` > today.slice(0, 7);
  const rangeEnd = checkOut || (phase === 'out' && hover && checkIn && hover > checkIn ? hover : '');
  const previewNights = checkIn && rangeEnd ? daysBetween(checkIn, rangeEnd) : 0;

  const renderMonth = (y: number, m: number) => (
    <div key={`${y}-${m}`} className="min-w-0">
      <p className="mb-3 text-center font-[family-name:var(--font-display)] text-[0.98rem] font-medium tracking-[-0.01em]">{monthLabel(y, m)}</p>
      <div className="grid grid-cols-7 text-center text-[0.68rem] font-medium tracking-[0.08em] text-faint uppercase">
        {WEEKDAYS.map((w) => <span key={w} className="py-1.5">{w}</span>)}
      </div>
      <div className="grid grid-cols-7" role="grid">
        {monthGrid(y, m).map((d, i) => {
          if (!d) return <span key={i} />;
          const past = d < today;
          const tooLong = phase === 'out' && !!checkIn && d > checkIn && !!lastAllowedOut && d > lastAllowedOut;
          const disabled = past || tooLong;
          const isStart = d === checkIn;
          const isEnd = d === rangeEnd;
          const inRange = !!checkIn && !!rangeEnd && d > checkIn && d < rangeEnd;
          const isToday = d === today;
          return (
            <div key={d} className={cx('relative py-0.5',
              inRange && 'bg-champagne-soft',
              isStart && rangeEnd && 'bg-gradient-to-r from-transparent from-50% to-champagne-soft to-50%',
              isEnd && checkIn && 'bg-gradient-to-l from-transparent from-50% to-champagne-soft to-50%')}>
              <button
                type="button" disabled={disabled}
                onClick={() => pick(d)} onMouseEnter={() => setHover(d)}
                aria-label={short(d)} aria-pressed={isStart || isEnd}
                className={cx(
                  'num relative mx-auto flex size-10 items-center justify-center rounded-full text-[0.88rem] transition-colors duration-150',
                  disabled ? 'cursor-not-allowed text-line-strong' : 'hover:bg-mist',
                  (isStart || isEnd) && 'bg-ink text-paper hover:bg-ink',
                  isToday && !isStart && !isEnd && 'font-semibold text-champagne',
                )}
              >
                {Number(d.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderHalf = (label: string, value: string, active: boolean, onClick: (el: HTMLElement) => void) => (
    <button type="button" onClick={(e) => onClick(e.currentTarget)}
      className={cx('min-w-0 flex-1 rounded-[var(--radius-sm)] px-4 py-2.5 text-left transition-colors', active ? 'bg-mist' : 'hover:bg-mist/60')}>
      <span className="block text-[0.68rem] font-medium tracking-[0.12em] text-faint uppercase">{label}</span>
      <span className={cx('block truncate text-[0.95rem]', value ? 'text-ink' : 'text-faint')}>{value ? short(value) : 'Add date'}</span>
    </button>
  );

  return (
    <div ref={box} data-drp className="relative">
      <div className={cx('flex items-stretch rounded-[var(--radius-sm)] border bg-surface p-1 transition-colors', open ? 'border-champagne shadow-[0_0_0_3px_rgb(160_127_74/0.14)]' : 'border-line-strong hover:border-faint')}>
        {renderHalf('Check-in', checkIn, open && phase === 'in', (el) => openAt('in', el))}
        <span className="my-2 w-px bg-line" aria-hidden />
        {renderHalf('Check-out', checkOut, open && phase === 'out', (el) => openAt('out', el))}
        {nights > 0 && (
          <span className="num mx-1 my-auto shrink-0 rounded-full bg-champagne-soft px-2.5 py-1 text-[0.75rem] font-medium text-ink">
            {nights} night{nights === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {open && (
        <div style={{ transform: `translateX(${shiftX}px)` }}
          className="absolute top-[calc(100%+8px)] left-0 z-50 w-[min(680px,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-lift)] animate-[var(--animate-fade)] sm:p-6"
          role="dialog" aria-label="Choose your dates" onMouseLeave={() => setHover(null)}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[0.88rem] text-muted">{phase === 'in' ? 'Select check-in' : 'Select check-out'}</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => shift(-1)} disabled={!canGoBack} aria-label="Previous month"
                className="flex size-9 items-center justify-center rounded-full border border-line hover:border-ink disabled:opacity-30">‹</button>
              <button type="button" onClick={() => shift(1)} aria-label="Next month"
                className="flex size-9 items-center justify-center rounded-full border border-line hover:border-ink">›</button>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {renderMonth(view.y, view.m)}
            <div className="hidden sm:block">{renderMonth(second.y, second.m)}</div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[0.88rem]">
              {checkIn ? short(checkIn) : '—'} <span className="text-faint">→</span> {rangeEnd ? short(rangeEnd) : '—'}
              {previewNights > 0 && <span className="num ml-2 text-muted">· {previewNights} night{previewNights === 1 ? '' : 's'}</span>}
              {phase === 'out' && checkIn && <span className="ml-2 text-faint">· up to {maxNights} nights</span>}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { onChange('', ''); setPhase('in'); }} className="px-3 py-1.5 text-[0.85rem] text-muted underline-offset-4 hover:underline">Clear</button>
              <button type="button" onClick={() => setOpen(false)} disabled={!checkOut}
                className="rounded-[var(--radius-sm)] bg-ink px-4 py-1.5 text-[0.85rem] text-paper disabled:opacity-40">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
