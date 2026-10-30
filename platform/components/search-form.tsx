'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { buttonClass, cx } from './ui';
import { encodeRooms, MAX_ROOMS } from '@/lib/domain/occupancy';
import type { RoomRequest } from '@/lib/db/schema';

type Dest = { city: string; country: string; n: number };

export function SearchForm({ destinations, initial, compact = false }: {
  destinations: Dest[]; initial: { city?: string; checkIn?: string; checkOut?: string; rooms: RoomRequest[] }; compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [city, setCity] = useState(initial.city ?? destinations[0]?.city ?? '');
  const [checkIn, setIn] = useState(initial.checkIn ?? '');
  const [checkOut, setOut] = useState(initial.checkOut ?? '');
  const [rooms, setRooms] = useState<RoomRequest[]>(initial.rooms);
  const [error, setError] = useState('');
  const [roomsOpen, setRoomsOpen] = useState(!compact);

  const today = new Date().toISOString().slice(0, 10);
  const guests = rooms.reduce((s, r) => s + r.adults + r.childAges.length, 0);

  const update = (i: number, patch: Partial<RoomRequest>) => setRooms((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!city) return setError('Choose a destination');
    if (!checkIn || !checkOut) return setError('Choose your dates');
    if (checkOut <= checkIn) return setError('Check-out must be after check-in');
    setError('');
    const q = new URLSearchParams({ city, in: checkIn, out: checkOut, rooms: encodeRooms(rooms) });
    start(() => router.push(`/agent/search?${q}`));
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] md:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-1.5 block text-[0.78rem] font-medium text-muted">Destination</span>
          <select className="field" value={city} onChange={(e) => setCity(e.target.value)}>
            {destinations.length === 0 && <option value="">No destinations live yet</option>}
            {destinations.map((d) => <option key={d.city} value={d.city}>{d.city}, {d.country} · {d.n} hotel{d.n === 1 ? '' : 's'}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.78rem] font-medium text-muted">Check-in</span>
          <input type="date" className="field num" min={today} value={checkIn} onChange={(e) => { setIn(e.target.value); if (checkOut && e.target.value >= checkOut) setOut(''); }} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.78rem] font-medium text-muted">Check-out</span>
          <input type="date" className="field num" min={checkIn || today} value={checkOut} onChange={(e) => setOut(e.target.value)} />
        </label>
        <div>
          <span className="mb-1.5 block text-[0.78rem] font-medium text-muted">Rooms &amp; guests</span>
          <button type="button" onClick={() => setRoomsOpen((v) => !v)} className="field text-left" aria-expanded={roomsOpen}>
            {rooms.length} room{rooms.length === 1 ? '' : 's'} · {guests} guest{guests === 1 ? '' : 's'}
          </button>
        </div>
        <button className={buttonClass('primary', 'md', 'h-[46px] md:px-7')} disabled={pending}>
          {pending ? 'Searching…' : 'Search'}
        </button>
      </div>

      {roomsOpen && (
        <div className="mt-4 border-t border-line pt-4 animate-[var(--animate-fade)]">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r, i) => (
              <fieldset key={i} className="rounded-[var(--radius-md)] border border-line bg-paper/60 p-3.5">
                <legend className="sr-only">Room {i + 1}</legend>
                <div className="flex items-center justify-between">
                  <p className="text-[0.85rem] font-semibold">Room {i + 1}</p>
                  {rooms.length > 1 && (
                    <button type="button" className="text-[0.78rem] text-muted hover:text-negative" onClick={() => setRooms((rs) => rs.filter((_, j) => j !== i))}>Remove</button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[0.85rem] text-muted">Adults</span>
                  <Stepper value={r.adults} min={1} max={4} onChange={(v) => update(i, { adults: v })} label={`Adults in room ${i + 1}`} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[0.85rem] text-muted">Children</span>
                  <Stepper value={r.childAges.length} min={0} max={3} label={`Children in room ${i + 1}`}
                    onChange={(v) => update(i, { childAges: v > r.childAges.length ? [...r.childAges, 8] : r.childAges.slice(0, v) })} />
                </div>
                {r.childAges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.childAges.map((age, k) => (
                      <label key={k} className="flex items-center gap-1.5 text-[0.78rem] text-muted">
                        Age
                        <select className="field num !w-auto !py-1 !pr-7 !pl-2 text-[0.82rem]" value={age}
                          onChange={(e) => update(i, { childAges: r.childAges.map((a, x) => (x === k ? Number(e.target.value) : a)) })}>
                          {Array.from({ length: 18 }, (_, a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {rooms.length < MAX_ROOMS && (
              <button type="button" className="text-[0.85rem] font-medium text-ink underline underline-offset-4" onClick={() => setRooms((rs) => [...rs, { adults: 2, childAges: [] }])}>+ Add room</button>
            )}
            <p className="text-[0.78rem] text-faint">Over {MAX_ROOMS} rooms? Use the Group Desk for negotiated rates.</p>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-[0.85rem] text-negative">{error}</p>}
    </form>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const btn = 'flex size-7 items-center justify-center rounded-full border border-line-strong text-[0.95rem] leading-none hover:border-ink disabled:opacity-30';
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease">−</button>
      <span className={cx('num w-4 text-center text-[0.92rem] font-medium')} aria-live="polite">{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">+</button>
    </div>
  );
}
