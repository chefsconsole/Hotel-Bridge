'use client';
/* Picking the client for a new trip: an existing one, or a new one typed
 * right here — a lead should take seconds to capture. */
import { useState } from 'react';
import { cx } from './ui';

type C = { id: string; name: string; phone: string | null };

export function ClientPicker({ clients, initial }: { clients: C[]; initial?: string }) {
  const [mode, setMode] = useState<'new' | 'existing'>(initial || clients.length ? (initial ? 'existing' : 'new') : 'new');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(initial ?? '');
  const shown = clients.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone ?? '').includes(q)).slice(0, 8);
  return (
    <div>
      <input type="hidden" name="clientId" value={mode === 'new' ? 'new' : picked} />
      {clients.length > 0 && (
        <div className="mb-4 inline-flex rounded-full bg-mist p-1 text-[0.85rem]">
          {(['new', 'existing'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cx('rounded-full px-4 py-1.5', mode === m ? 'bg-surface font-medium shadow-[var(--shadow-soft)]' : 'text-muted')}>
              {m === 'new' ? 'New client' : 'Existing client'}
            </button>
          ))}
        </div>
      )}
      {mode === 'new' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Client name"><input name="clientName" className="field" placeholder="e.g. Ravi Mehta" autoFocus /></L>
          <L label="Mobile (WhatsApp)"><input name="clientPhone" className="field" inputMode="tel" placeholder="+91 98200 12345" /></L>
          <L label="Email" hint="Optional"><input name="clientEmail" type="email" className="field" /></L>
          <L label="City" hint="Optional"><input name="clientCity" className="field" /></L>
        </div>
      ) : (
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" className="field" />
          <ul className="mt-2 max-h-64 divide-y divide-line overflow-auto rounded-[var(--radius-sm)] border border-line">
            {shown.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setPicked(c.id)} className={cx('flex w-full items-center justify-between px-3 py-2.5 text-left text-[0.9rem]', picked === c.id ? 'bg-champagne-soft' : 'hover:bg-mist')}>
                  <span className="font-medium">{c.name}</span><span className="text-[0.8rem] text-muted">{c.phone}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-3 text-[0.85rem] text-muted">No client matches — switch to New client.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[0.82rem] font-medium">{label}{hint && <span className="ml-1.5 font-normal text-faint">{hint}</span>}</span>{children}</label>;
}
