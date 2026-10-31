'use client';
/* Sending things to the agent's client: the proposal link and payment
 * reminders. Nothing is sent by us — WhatsApp and email open on the
 * agent's own phone or mail app with the message filled in, so it comes
 * from the agent and the agent sees exactly what goes out. */
import { useState, useSyncExternalStore } from 'react';
import { buttonClass, cx } from './ui';
import { parseMoney, toDecimalString } from '@/lib/domain/money';
import { clientMoney, mailtoLink, proposalMessage, reminderMessage, whatsappLink, whatsappNumber } from '@/lib/domain/trip';

const useOrigin = () => useSyncExternalStore(() => () => {}, () => window.location.origin, () => '');

const WA = 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm4.6 12.6c-.2.6-1.1 1.1-1.6 1.1-.4.1-.9.1-1.5-.1-.3-.1-.8-.3-1.3-.5-2.3-1-3.8-3.3-3.9-3.5-.1-.2-.9-1.2-.9-2.3 0-1.1.6-1.6.8-1.9.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.7c.1.1.1.3 0 .4l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.4.1.5-.1l.7-.9c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.2.1.7-.1 1.3Z';
const MAIL = 'M3 6h18v12H3zM3 7l9 6 9-6';
const LINK = 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1';
const DOC = 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6';

function Glyph({ d, fill = false }: { d: string; fill?: boolean }) {
  return <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={className ?? buttonClass('secondary', 'sm')}
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ } }}>
      <Glyph d={LINK} />{done ? 'Copied' : label}
    </button>
  );
}

const waClass = 'inline-flex h-8 items-center gap-2 rounded-[var(--radius-sm)] bg-[#1f8f4e] px-3 text-[0.82rem] font-medium text-white transition-colors hover:bg-[#187a41]';

type Who = { clientName: string; phone: string | null; email: string | null; agencyName: string; signOff?: string | null; title: string };

export function ShareProposal({ path, enabled, who }: { path: string; enabled: boolean; who: Who }) {
  const url = useOrigin() + path;
  if (!enabled) return <p className="text-[0.85rem] text-muted">Sharing is off. Turn it on to send the plan to your client.</p>;
  const msg = proposalMessage({ clientName: who.clientName, agencyName: who.agencyName, tripTitle: who.title, link: url, signOff: who.signOff });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-mist/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[0.8rem] text-muted">{url || path}</span>
        <CopyButton text={url} label="Copy link" className="inline-flex shrink-0 items-center gap-1.5 text-[0.8rem] font-medium text-ink hover:underline" />
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={whatsappLink(who.phone, msg)} target="_blank" rel="noreferrer" className={waClass}><Glyph d={WA} fill />WhatsApp</a>
        <a href={mailtoLink(who.email, `Your trip plan — ${who.title}`, msg)} className={buttonClass('secondary', 'sm')}><Glyph d={MAIL} />Email</a>
        <a href={`${path}?print=1`} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}><Glyph d={DOC} />PDF</a>
        <a href={path} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'sm')}>Preview</a>
      </div>
      {!whatsappNumber(who.phone) && <p className="text-[0.75rem] text-faint">No client mobile number saved — WhatsApp will ask you to pick the chat.</p>}
    </div>
  );
}

export function ReminderComposer({ who, currency, pendingMinor, totalMinor, receivedMinor, dueOn, sharePath }: {
  who: Who; currency: string; pendingMinor: number; totalMinor: number; receivedMinor: number; dueOn: string | null; sharePath: string | null;
}) {
  const base = useOrigin();
  const [amount, setAmount] = useState(toDecimalString(Math.max(0, pendingMinor), currency).replace(/\.00$/, ''));
  const [due, setDue] = useState(dueOn ?? '');
  const [withLink, setWithLink] = useState(!!sharePath);
  const [edited, setEdited] = useState<string | null>(null);

  let minor: number | null = null;
  try { minor = parseMoney(amount || '0', currency); } catch { minor = null; }
  const generated = minor == null ? '' : reminderMessage({
    clientName: who.clientName, agencyName: who.agencyName, tripTitle: who.title, amountMinor: minor, currency, dueOn: due || null,
    totalMinor, receivedMinor, link: withLink && sharePath ? base + sharePath : null, signOff: who.signOff,
  });
  const text = edited ?? generated;
  const usable = minor != null && minor > 0 && text.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[0.78rem] font-medium">Amount ({currency})</span>
          <input value={amount} onChange={(e) => { setAmount(e.target.value); setEdited(null); }} inputMode="decimal" className={cx('field num', minor == null && 'border-negative')} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.78rem] font-medium">Pay by</span>
          <input type="date" value={due} onChange={(e) => { setDue(e.target.value); setEdited(null); }} className="field num" />
        </label>
      </div>
      {minor != null && minor > 0 && minor !== pendingMinor && <p className="text-[0.75rem] text-muted">Pending on this trip is {clientMoney(Math.max(0, pendingMinor), currency)} — you are asking for {clientMoney(minor, currency)}.</p>}
      {sharePath && (
        <label className="flex items-center gap-2 text-[0.82rem]"><input type="checkbox" checked={withLink} onChange={(e) => { setWithLink(e.target.checked); setEdited(null); }} className="size-4 accent-[var(--color-ink)]" /> Include the trip link</label>
      )}
      <textarea value={text} onChange={(e) => setEdited(e.target.value)} rows={9} className="field text-[0.85rem] leading-relaxed" aria-label="Reminder message" />
      {edited != null && <button type="button" onClick={() => setEdited(null)} className="text-[0.75rem] text-muted underline underline-offset-2">Reset to the standard message</button>}
      <div className={cx('flex flex-wrap gap-2', !usable && 'pointer-events-none opacity-50')} aria-disabled={!usable}>
        <a href={whatsappLink(who.phone, text)} target="_blank" rel="noreferrer" className={waClass}><Glyph d={WA} fill />Send on WhatsApp</a>
        <a href={mailtoLink(who.email, `Payment reminder — ${who.title}`, text)} className={buttonClass('secondary', 'sm')}><Glyph d={MAIL} />Email</a>
        <CopyButton text={text} label="Copy text" />
      </div>
    </div>
  );
}
