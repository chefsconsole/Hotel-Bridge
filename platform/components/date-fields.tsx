'use client';
/* Form fields that use the stay calendar instead of the browser's date box.
 * They submit plain ISO dates through hidden inputs, so server actions read
 * them exactly as before. Not wrapped in <label>: a click on the open panel
 * would otherwise re-trigger the field button. */
import { useEffect, useRef, useState } from 'react';
import { RangeCalendar, shortDate } from './date-range-picker';
import { cx } from './ui';
import { daysBetween } from '@/lib/domain/dates';

/** Open state, how many months fit (the form's section, not the window, sets
 *  the room) and which edge of the field the panel hangs from. */
function usePopover() {
  const [open, setOpenState] = useState(false);
  const [months, setMonths] = useState<1 | 2>(2);
  const [align, setAlign] = useState<'left' | 'right'>('left');
  const wrap = useRef<HTMLDivElement>(null);
  const setOpen = (next: boolean) => {
    if (next && wrap.current) {
      const box = (wrap.current.closest('section') ?? document.body).getBoundingClientRect();
      const field = wrap.current.getBoundingClientRect();
      const m = box.width >= 700 ? 2 : 1;
      const width = m === 2 ? 680 : 360;
      setMonths(m);
      // Hang from the left edge when the panel fits to the right of it; otherwise from the right edge.
      setAlign(field.left + width <= box.right + 8 ? 'left' : 'right');
    }
    setOpenState(next);
  };
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  return { open, setOpen, wrap, months, align };
}

const panelClass = (months: 1 | 2, align: 'left' | 'right') => cx('absolute top-full z-50 mt-2 rounded-2xl', align === 'left' ? 'left-0' : 'right-0', months === 2 ? 'w-[680px]' : 'w-[min(360px,calc(100vw-2rem))]', ' border border-line bg-surface p-5 shadow-[var(--shadow-lift)] animate-[var(--animate-fade)] sm:p-6');
const Label = ({ children }: { children: string }) => <span className="mb-1.5 block text-[0.82rem] font-medium text-ink">{children}</span>;

/** Arrival + departure as one field, e.g. a Group Desk itinerary stop. */
export function StayDatesField({ label, nameIn, nameOut, defaultIn = '', defaultOut = '', className }: {
  label: string; nameIn: string; nameOut: string; defaultIn?: string; defaultOut?: string; className?: string;
}) {
  const { open, setOpen, wrap, months, align } = usePopover();
  const [checkIn, setIn] = useState(defaultIn);
  const [checkOut, setOut] = useState(defaultOut);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;
  return (
    <div ref={wrap} className={cx('relative', className)}>
      <Label>{label}</Label>
      <input type="hidden" name={nameIn} value={checkIn} />
      <input type="hidden" name={nameOut} value={checkOut} />
      <button type="button" onClick={() => { setPhase(checkIn && !checkOut ? 'out' : 'in'); setOpen(!open); }} aria-expanded={open}
        className={cx('field flex items-center gap-2 text-left', open && 'border-champagne')}>
        {checkIn
          ? <span className="num">{shortDate(checkIn)} <span className="text-faint">→</span> {checkOut ? shortDate(checkOut) : <span className="text-faint">Departure</span>}</span>
          : <span className="text-faint">Arrival → Departure</span>}
        {nights > 0 && <span className="num ml-auto shrink-0 text-[0.82rem] font-medium text-champagne">{nights}N</span>}
      </button>
      {open && (
        <div className={panelClass(months, align)}>
          <RangeCalendar months={months} checkIn={checkIn} checkOut={checkOut} phase={phase} labels={['Arrival', 'Departure']}
            title={phase === 'out' && checkIn ? 'When do they leave?' : 'When do they arrive?'}
            onPick={(a, b) => { setIn(a); setOut(b); if (b) setTimeout(() => setOpen(false), 160); else setPhase('out'); }}
            onClear={() => { setIn(''); setOut(''); setPhase('in'); }}
            onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/** A single date, e.g. "quotation needed by". */
export function DateField({ label, name, defaultValue = '', title, className }: {
  label: string; name: string; defaultValue?: string; title?: string; className?: string;
}) {
  const { open, setOpen, wrap, months, align } = usePopover();
  const [value, setValue] = useState(defaultValue);
  return (
    <div ref={wrap} className={cx('relative', className)}>
      <Label>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className={cx('field text-left', open && 'border-champagne')}>
        {value ? <span className="num">{shortDate(value)}</span> : <span className="text-faint">Choose a date</span>}
      </button>
      {open && (
        <div className={panelClass(months, align)}>
          <RangeCalendar single months={months} checkIn={value} checkOut="" phase="in" title={title ?? label} labels={['No date chosen', '']}
            onPick={(a) => { setValue(a); setTimeout(() => setOpen(false), 160); }}
            onClear={() => setValue('')}
            onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
