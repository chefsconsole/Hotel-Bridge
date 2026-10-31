'use client';
/* The hotel search bar: Where to · Check-in · Check-out · Guests · Search.
 * One rounded bar; each part opens its own panel underneath. Choosing a
 * destination opens the calendar, choosing check-out closes it. */
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { RangeCalendar, shortDate } from './date-range-picker';
import { cx } from './ui';
import { encodeRooms, MAX_ROOMS } from '@/lib/domain/occupancy';
import { daysBetween } from '@/lib/domain/dates';
import type { RoomRequest } from '@/lib/db/schema';

type Dest = { city: string; country: string; n: number };
type Panel = 'where' | 'in' | 'out' | 'guests' | null;

const I = {
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-3.9 3.1-6 7-6s7 2.1 7 6',
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21',
};
const Icon = ({ d, className = 'size-5' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={cx('shrink-0', className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

export function SearchForm({ destinations, initial, keep }: {
  destinations: Dest[]; initial: { city?: string; checkIn?: string; checkOut?: string; rooms: RoomRequest[] }; compact?: boolean;
  /** Extra URL parameters carried into the results, e.g. the trip being built. */
  keep?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [city, setCity] = useState(initial.city ?? '');
  const [query, setQuery] = useState(initial.city ?? '');
  const [checkIn, setIn] = useState(initial.checkIn ?? '');
  const [checkOut, setOut] = useState(initial.checkOut ?? '');
  const [rooms, setRooms] = useState<RoomRequest[]>(initial.rooms);
  const [panel, setPanel] = useState<Panel>(null);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const whereInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!panel) return;
    const down = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setPanel(null); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [panel]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === city.toLowerCase()) return destinations;
    return destinations.filter((d) => d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q));
  }, [query, city, destinations]);

  const adults = rooms.reduce((s, r) => s + r.adults, 0);
  const kids = rooms.reduce((s, r) => s + r.childAges.length, 0);
  const guestsText = `${adults} adult${adults === 1 ? '' : 's'}${kids ? `, ${kids} child${kids === 1 ? '' : 'ren'}` : ''} · ${rooms.length} room${rooms.length === 1 ? '' : 's'}`;
  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;

  function chooseCity(d: Dest) {
    setCity(d.city);
    setQuery(d.city);
    setError('');
    setPanel(checkIn && checkOut ? null : 'in');
  }

  function onWhereKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setPanel('where'); setCursor((c) => Math.min(c + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && panel === 'where' && matches[cursor]) { e.preventDefault(); chooseCity(matches[cursor]); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = city || destinations.find((d) => d.city.toLowerCase() === query.trim().toLowerCase())?.city;
    if (!chosen) { setError('Choose a destination from the list'); setPanel('where'); whereInput.current?.focus(); return; }
    if (!checkIn || !checkOut) { setError('Choose check-in and check-out dates'); setPanel(checkIn ? 'out' : 'in'); return; }
    setError('');
    setPanel(null);
    start(() => router.push(`/agent/search?${new URLSearchParams({ ...keep, city: chosen, in: checkIn, out: checkOut, rooms: encodeRooms(rooms) })}`));
  }

  const update = (i: number, patch: Partial<RoomRequest>) => setRooms((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const segment = (key: Exclude<Panel, null>, label: string, icon: string, value: ReactNode, onClick: () => void, extra = '') => (
    <button type="button" onClick={onClick} aria-expanded={panel === key}
      className={cx('flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors @3xl:rounded-full @3xl:px-5',
        panel === key ? 'bg-surface shadow-[var(--shadow-lift)] ring-1 ring-line' : 'hover:bg-mist/70', extra)}>
      <Icon d={icon} className="size-5 text-champagne" />
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{label}</span>
        <span className="block truncate text-[0.95rem]">{value}</span>
      </span>
    </button>
  );
  const divider = <span className="mx-1 hidden h-8 w-px shrink-0 bg-line @3xl:block" aria-hidden />;

  return (
    <form onSubmit={submit} noValidate className="@container">
      <div ref={wrap} className="relative">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-soft)] @3xl:flex @3xl:items-center @3xl:rounded-full">
          {/* Where to — a real text field */}
          <label className={cx('col-span-2 flex min-w-0 flex-[1.4] cursor-text items-center gap-3 rounded-xl px-4 py-3 transition-colors @3xl:rounded-full @3xl:px-5',
            panel === 'where' ? 'bg-surface shadow-[var(--shadow-lift)] ring-1 ring-line' : 'hover:bg-mist/70')}>
            <Icon d={I.pin} className="size-5 text-champagne" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">Where to</span>
              <input ref={whereInput} value={query} autoComplete="off" spellCheck={false}
                onChange={(e) => { setQuery(e.target.value); setCity(''); setCursor(0); setPanel('where'); }}
                onFocus={() => { setPanel('where'); setCursor(0); }} onKeyDown={onWhereKey}
                placeholder="Search a city" role="combobox" aria-expanded={panel === 'where'} aria-controls="hb-where"
                className="block w-full bg-transparent text-[0.95rem] outline-none placeholder:text-faint" />
            </span>
          </label>
          {divider}
          {segment('in', 'Check-in', I.cal, checkIn ? shortDate(checkIn) : <span className="text-faint">Add date</span>, () => setPanel('in'), 'flex-1')}
          {divider}
          {segment('out', 'Check-out', I.cal,
            checkOut ? <>{shortDate(checkOut)}{nights > 0 && <span className="num ml-2 text-[0.78rem] text-champagne">{nights}N</span>}</> : <span className="text-faint">Add date</span>,
            () => setPanel(checkIn ? 'out' : 'in'), 'flex-1')}
          {divider}
          {segment('guests', 'Guests', I.user, guestsText, () => setPanel('guests'), 'col-span-2 flex-[1.2]')}
          <button type="submit" disabled={pending} aria-label="Search hotels"
            className="col-span-2 mt-1 flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-[0.95rem] font-medium text-paper transition-colors hover:bg-ink-3 disabled:opacity-60 @3xl:mt-0 @3xl:ml-1 @3xl:size-14 @3xl:rounded-full @3xl:px-0">
            {pending ? <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Icon d={I.search} />}
            <span className="@3xl:sr-only">{pending ? 'Searching…' : 'Search'}</span>
          </button>
        </div>

        {panel && (
          <div className={cx('absolute top-full z-50 mt-3 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-lift)] animate-[var(--animate-fade)] sm:p-6',
            panel === 'where' && 'inset-x-0 @3xl:right-auto @3xl:w-[420px]',
            (panel === 'in' || panel === 'out') && 'inset-x-0 @3xl:mx-auto @3xl:w-[720px]',
            panel === 'guests' && 'inset-x-0 @3xl:left-auto @3xl:w-[400px]')}>

            {panel === 'where' && (
              <div id="hb-where" role="listbox">
                <p className="mb-2 px-2 text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{query && !city ? 'Matching destinations' : 'Our destinations'}</p>
                {matches.length === 0 ? (
                  <p className="px-2 py-3 text-[0.9rem] text-muted">We don&apos;t have hotels in “{query}” yet. The Group Desk can still source them for you.</p>
                ) : (
                  <ul className="max-h-80 overflow-auto">
                    {matches.map((d, i) => (
                      <li key={d.city}>
                        <button type="button" role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => chooseCity(d)}
                          className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left', i === cursor ? 'bg-mist' : '')}>
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-champagne-soft text-champagne"><Icon d={I.pin} className="size-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{d.city}</span>
                            <span className="block text-[0.8rem] text-muted">{d.country}</span>
                          </span>
                          <span className="text-[0.78rem] text-faint">{d.n} hotel{d.n === 1 ? '' : 's'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {(panel === 'in' || panel === 'out') && (
              <RangeCalendar
                checkIn={checkIn} checkOut={checkOut} phase={panel}
                onPick={(a, b) => { setIn(a); setOut(b); setError(''); if (b) setTimeout(() => setPanel(null), 160); else setPanel('out'); }}
                onClear={() => { setIn(''); setOut(''); setPanel('in'); }}
                onDone={() => setPanel(null)}
              />
            )}

            {panel === 'guests' && (
              <div>
                <ul className="max-h-[22rem] space-y-3 overflow-auto">
                  {rooms.map((r, i) => (
                    <li key={i} className="rounded-xl border border-line p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[0.9rem] font-medium">Room {i + 1}</p>
                        {rooms.length > 1 && <button type="button" className="text-[0.8rem] text-muted hover:text-negative" onClick={() => setRooms((rs) => rs.filter((_, j) => j !== i))}>Remove</button>}
                      </div>
                      <Row label="Adults" hint="18+" value={r.adults} min={1} max={4} onChange={(v) => update(i, { adults: v })} />
                      <Row label="Children" hint="0–17" value={r.childAges.length} min={0} max={3}
                        onChange={(v) => update(i, { childAges: v > r.childAges.length ? [...r.childAges, 8] : r.childAges.slice(0, v) })} />
                      {r.childAges.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.childAges.map((age, k) => (
                            <label key={k} className="flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-[0.8rem] text-muted">
                              Child {k + 1} age
                              <select value={age} onChange={(e) => update(i, { childAges: r.childAges.map((a, x) => (x === k ? Number(e.target.value) : a)) })}
                                className="num bg-transparent font-medium text-ink outline-none">
                                {Array.from({ length: 18 }, (_, a) => <option key={a} value={a}>{a}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between">
                  {rooms.length < MAX_ROOMS
                    ? <button type="button" className="text-[0.88rem] font-medium underline underline-offset-4" onClick={() => setRooms((rs) => [...rs, { adults: 2, childAges: [] }])}>+ Add another room</button>
                    : <span className="text-[0.8rem] text-faint">More rooms? Use the Group Desk.</span>}
                  <button type="button" onClick={() => setPanel(null)} className="rounded-full bg-ink px-5 py-2 text-[0.85rem] text-paper">Done</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p role="alert" className="mt-3 px-2 text-[0.88rem] text-negative">{error}</p>}
    </form>
  );
}

function Row({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = 'flex size-8 items-center justify-center rounded-full border border-line-strong text-[1rem] hover:border-ink disabled:opacity-30';
  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="text-[0.9rem]">{label} <span className="text-[0.78rem] text-faint">{hint}</span></span>
      <div className="flex items-center gap-3" role="group" aria-label={label}>
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${label.toLowerCase()}`}>−</button>
        <span className="num w-4 text-center font-medium" aria-live="polite">{value}</span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}
