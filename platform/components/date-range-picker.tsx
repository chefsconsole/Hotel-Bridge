'use client';
/* The calendar panel for choosing a stay: two months side by side (one on
 * phones), pick check-in then check-out, the stay is highlighted and the
 * nights are counted as you go. Dates are ISO strings (YYYY-MM-DD).
 * The panel only renders the calendar; the search bar decides where it sits. */
import { useState } from 'react';
import { addDays, daysBetween } from '@/lib/domain/dates';
import { cx } from './ui';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthLabel = (y: number, m: number) => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, 1)));

export const shortDate = (s: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s + 'T00:00:00Z'));

export function localToday() {
  const d = new Date();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthGrid(y: number, m: number): (string | null)[] {
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Monday-first
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(isoOf(y, m, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function startView(anchor: string, today: string, single: boolean) {
  let y = Number(anchor.slice(0, 4));
  let m = Number(anchor.slice(5, 7)) - 1;
  // One month visible and under a week left in it: open on next month.
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  if (single && anchor === today && dim - Number(anchor.slice(8)) < 6) { m += 1; if (m > 11) { m = 0; y += 1; } }
  return { y, m };
}

const isSmall = () => typeof window !== 'undefined' && window.innerWidth < 640;

export function RangeCalendar({ checkIn, checkOut, phase, onPick, onClear, onDone, maxNights = 30 }: {
  checkIn: string; checkOut: string; phase: 'in' | 'out';
  onPick: (checkIn: string, checkOut: string) => void; onClear: () => void; onDone: () => void; maxNights?: number;
}) {
  const [today] = useState(localToday);
  const [single] = useState(isSmall);
  const [view, setView] = useState(() => startView((phase === 'out' && checkOut) || checkIn || localToday(), localToday(), isSmall()));
  const [hover, setHover] = useState<string | null>(null);

  const lastOut = checkIn ? addDays(checkIn, maxNights) : null;
  const choosingOut = phase === 'out' && !!checkIn;
  const rangeEnd = checkOut || (choosingOut && hover && hover > checkIn ? hover : '');
  const nights = checkIn && rangeEnd ? daysBetween(checkIn, rangeEnd) : 0;
  const canBack = `${view.y}-${pad(view.m + 1)}` > today.slice(0, 7);
  const shift = (delta: number) => setView(({ y, m }) => { const d = new Date(Date.UTC(y, m + delta, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const next = (() => { const d = new Date(Date.UTC(view.y, view.m + 1, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; })();

  function pick(day: string) {
    if (!choosingOut || day <= checkIn) return onPick(day, '');
    if (lastOut && day > lastOut) return;
    setHover(null);
    onPick(checkIn, day);
  }

  const month = (y: number, m: number) => (
    <div key={`${y}-${m}`} className="min-w-0">
      <p className="mb-3 text-center text-[0.95rem] font-medium">{monthLabel(y, m)}</p>
      <div className="grid grid-cols-7 text-center text-[0.68rem] font-medium tracking-[0.08em] text-faint uppercase">
        {WEEKDAYS.map((w) => <span key={w} className="py-1.5">{w}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(y, m).map((d, i) => {
          if (!d) return <span key={i} />;
          const disabled = d < today || (choosingOut && d > checkIn && !!lastOut && d > lastOut);
          const isStart = d === checkIn;
          const isEnd = d === rangeEnd;
          const inRange = !!checkIn && !!rangeEnd && d > checkIn && d < rangeEnd;
          return (
            <div key={d} className={cx('py-0.5',
              inRange && 'bg-champagne-soft',
              isStart && rangeEnd && 'bg-[linear-gradient(to_right,transparent_50%,var(--color-champagne-soft)_50%)]',
              isEnd && checkIn && 'bg-[linear-gradient(to_left,transparent_50%,var(--color-champagne-soft)_50%)]')}>
              <button type="button" disabled={disabled} onClick={() => pick(d)} onMouseEnter={() => setHover(d)}
                aria-label={shortDate(d)} aria-pressed={isStart || isEnd}
                className={cx('num mx-auto flex size-10 items-center justify-center rounded-full text-[0.88rem]',
                  disabled ? 'cursor-not-allowed text-line-strong' : 'hover:ring-1 hover:ring-ink',
                  (isStart || isEnd) && 'bg-ink text-paper',
                  d === today && !isStart && !isEnd && 'font-semibold text-champagne')}>
                {Number(d.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div onMouseLeave={() => setHover(null)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[0.9rem] font-medium">{choosingOut ? 'When do they check out?' : 'When do they check in?'}</p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => shift(-1)} disabled={!canBack} aria-label="Previous month" className="flex size-9 items-center justify-center rounded-full border border-line text-lg hover:border-ink disabled:opacity-30">‹</button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="flex size-9 items-center justify-center rounded-full border border-line text-lg hover:border-ink">›</button>
        </div>
      </div>
      <div className={cx('grid gap-8', !single && 'grid-cols-2')}>
        {month(view.y, view.m)}
        {!single && month(next.y, next.m)}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[0.88rem]">
          {checkIn ? shortDate(checkIn) : 'Check-in'} <span className="text-faint">→</span> {rangeEnd ? shortDate(rangeEnd) : 'Check-out'}
          {nights > 0 && <span className="num ml-2 font-medium text-champagne">{nights} night{nights === 1 ? '' : 's'}</span>}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClear} className="px-3 py-1.5 text-[0.85rem] text-muted hover:text-ink">Clear</button>
          <button type="button" onClick={onDone} disabled={!checkOut} className="rounded-full bg-ink px-5 py-1.5 text-[0.85rem] text-paper disabled:opacity-40">Done</button>
        </div>
      </div>
    </div>
  );
}
