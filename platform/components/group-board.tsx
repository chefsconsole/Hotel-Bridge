'use client';
/* Group Desk board. Drag a card to another stage, or use its "Move to" menu
 * (keyboard and phone friendly). The move shows at once and is undone if the
 * server refuses it. Closing (won / lost / cancelled) happens on the enquiry page. */
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { moveGroupStageAction } from '@/app/actions/admin';
import type { BoardCard, Tone } from '@/lib/services/group-board';
import { cx } from './ui';

type Stage = { key: string; label: string };

const TONE: Record<Tone, { dot: string; text: string; label: string }> = {
  urgent: { dot: 'bg-negative', text: 'text-negative', label: 'Urgent' },
  action: { dot: 'bg-attention', text: 'text-ink', label: 'Your move' },
  waiting: { dot: 'bg-line-strong', text: 'text-muted', label: 'Waiting' },
  done: { dot: 'bg-positive', text: 'text-muted', label: 'Closed' },
};

export function GroupBoard({ cards: initial, stages, closedLabels }: { cards: BoardCard[]; stages: Stage[]; closedLabels: Record<string, string> }) {
  const [cards, setCards] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [, start] = useTransition();

  const open = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter((c) => stages.some((s) => s.key === c.status))
      .filter((c) => !mineOnly || c.next.tone === 'urgent' || c.next.tone === 'action')
      .filter((c) => !needle || `${c.reference} ${c.groupName} ${c.agencyName} ${c.cities}`.toLowerCase().includes(needle));
  }, [cards, stages, mineOnly, q]);
  const closed = cards.filter((c) => c.status in closedLabels);
  const needYou = cards.filter((c) => stages.some((s) => s.key === c.status) && (c.next.tone === 'urgent' || c.next.tone === 'action')).length;

  function move(id: string, status: string) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return;
    const before = card.status;
    const label = stages.find((s) => s.key === status)?.label ?? status;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    setNotice(null);
    start(async () => {
      const r = await moveGroupStageAction(id, status);
      if (!r.ok) {
        setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: before } : c)));
        setNotice({ ok: false, text: r.message ?? 'Could not move it.' });
      } else setNotice({ ok: true, text: `${card.reference} moved to ${label}.` });
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a group, agency or city" aria-label="Filter the board" className="field !w-64 max-w-full !py-1.5 text-[0.85rem]" />
        <button type="button" onClick={() => setMineOnly((v) => !v)} aria-pressed={mineOnly}
          className={cx('rounded-full px-3 py-1.5 text-[0.8rem] transition-colors', mineOnly ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink')}>
          Needs us <span className="num opacity-60">{needYou}</span>
        </button>
        <p role="status" aria-live="polite" className={cx('text-[0.82rem]', notice?.ok === false ? 'text-negative' : 'text-muted')}>{notice?.text}</p>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {stages.map((s) => {
          const list = open.filter((c) => c.status === s.key);
          return (
            <section key={s.key} aria-label={`${s.label}: ${list.length}`}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); setOver(s.key); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === s.key ? null : o)); }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; setOver(null); setDragId(null); if (id) move(id, s.key); }}
              className={cx('flex w-[17.5rem] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] border bg-mist/50 transition-colors duration-150',
                over === s.key ? 'border-ink/40 bg-mist' : 'border-line')}>
              <header className="flex items-center justify-between px-3 pt-3 pb-2">
                <h2 className="text-[0.78rem] font-semibold tracking-wide text-muted uppercase">{s.label}</h2>
                <span className="num rounded-full bg-surface px-2 py-0.5 text-[0.72rem] text-muted ring-1 ring-line">{list.length}</span>
              </header>
              <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {list.map((c) => (
                  <li key={c.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; setDragId(c.id); }}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    className={cx('animate-rise group cursor-grab rounded-[var(--radius-md)] border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,opacity,transform] duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)] active:cursor-grabbing',
                      dragId === c.id && 'opacity-50')}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/groups/${c.id}`} className="min-w-0 font-medium leading-snug hover:underline">{c.groupName}</Link>
                      <span className="num shrink-0 text-[0.7rem] text-faint">{c.reference}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[0.78rem] text-muted">{c.agencyName}{c.isSample ? ' · sample' : ''}</p>
                    <p className="mt-1.5 text-[0.78rem] text-muted"><span className="text-ink">{c.cities}</span> · {c.arrival}</p>
                    <p className="num text-[0.75rem] text-faint">{c.pax} pax · {c.rooms} rooms{c.asked ? ` · ${c.offers}/${c.asked} offers` : ''} · quote {c.quoteDue}</p>
                    <p className={cx('mt-2 flex items-start gap-1.5 border-t border-line pt-2 text-[0.8rem] leading-snug', TONE[c.next.tone].text)}>
                      <span aria-hidden className={cx('mt-1.5 size-1.5 shrink-0 rounded-full', TONE[c.next.tone].dot)} />
                      <span><span className="sr-only">{TONE[c.next.tone].label}: </span>{c.next.label}</span>
                    </p>
                    <label className="mt-2 flex items-center gap-1.5 text-[0.72rem] text-faint">
                      <span>Move to</span>
                      <select value={c.status} onChange={(e) => move(c.id, e.target.value)} aria-label={`Move ${c.reference} to another stage`}
                        className="min-w-0 flex-1 rounded border border-line bg-surface px-1.5 py-0.5 text-[0.75rem] text-muted focus:text-ink">
                        {stages.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
                      </select>
                    </label>
                  </li>
                ))}
                {list.length === 0 && <li className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-line px-3 py-6 text-center text-[0.75rem] text-faint">{dragId ? 'Drop here' : 'Nothing here'}</li>}
              </ul>
            </section>
          );
        })}
      </div>

      {closed.length > 0 && (
        <details className="mt-4 rounded-[var(--radius-lg)] border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-[0.85rem] font-medium">Closed in the last 30 days <span className="num text-muted">{closed.length}</span></summary>
          <ul className="divide-y divide-line border-t border-line">
            {closed.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[0.85rem]">
                <Link href={`/admin/groups/${c.id}`} className="hover:underline">{c.groupName} <span className="num text-[0.75rem] text-faint">{c.reference}</span></Link>
                <span className="text-muted">{c.agencyName} · {closedLabels[c.status]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
