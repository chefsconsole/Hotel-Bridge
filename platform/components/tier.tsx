/* The curation tier and the facts an agent needs at a glance. */
import { cx } from './ui';
import { TIER_INFO, isTier } from '@/lib/domain/tiers';

const TONE = { smart: 'bg-mist text-ink', premium: 'bg-[#e9eef7] text-[#1f3a6b]', luxury: 'bg-champagne-soft text-[#6d5326]', ultra: 'bg-ink text-champagne' } as const;

export function TierBadge({ tier, className }: { tier: string | null; className?: string }) {
  if (!isTier(tier)) return null;
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.06em] uppercase', TONE[tier], className)}>{TIER_INFO[tier].label}</span>;
}

export function HotelFacts({ hotel }: { hotel: { tier: string | null; totalRooms: number | null; acceptsGroups: boolean; bestRateOnRequest?: boolean } }) {
  const facts = [
    hotel.totalRooms ? `${hotel.totalRooms} rooms` : null,
    hotel.acceptsGroups ? 'Groups welcome' : null,
    hotel.bestRateOnRequest ? 'Best rate on request' : 'Contracted rate',
  ].filter(Boolean);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted">
      <TierBadge tier={hotel.tier} />
      {facts.map((f, i) => <span key={i}>{i > 0 || isTier(hotel.tier) ? '· ' : ''}{f}</span>)}
    </div>
  );
}

/** A hotel collection: one rate across a group's hotels; the group picks the hotel on confirmation. */
export function CollectionNote({ hotels, assigned, className = '' }: { hotels: string[]; assigned?: string | null; className?: string }) {
  if (!hotels.length) return null;
  return (
    <div className={`rounded-[var(--radius-sm)] border border-champagne/40 bg-champagne-soft/50 px-3 py-2 text-[0.82rem] ${className}`}>
      {assigned
        ? <p><span className="font-medium">Your hotel: {assigned}</span> <span className="text-muted">· allocated by the hotel group from this collection</span></p>
        : <><p className="font-medium">Hotel collection · guaranteed in one of {hotels.length} hotels</p>
          <p className="mt-0.5 text-muted">{hotels.join(' · ')}. The hotel group confirms which one; a specific hotel isn&apos;t guaranteed unless it confirms it.</p></>}
    </div>
  );
}

/** For the hotel group (or HotelBridge staff) confirming a collection booking. */
export function AssignedHotelField({ hotels }: { hotels: string[] }) {
  if (!hotels.length) return null;
  return (
    <label className="mt-2 block text-[0.82rem]">
      <span className="font-medium">Hotel allocated</span>
      <select name="assignedHotel" defaultValue="" className="field mt-1" required>
        <option value="" disabled>Choose the hotel…</option>
        {hotels.map((h) => <option key={h}>{h}</option>)}
      </select>
    </label>
  );
}
