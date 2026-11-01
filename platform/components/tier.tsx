/* The curation tier and the facts an agent needs at a glance. */
import { cx } from './ui';
import { TIER_INFO, isTier } from '@/lib/domain/tiers';

const TONE = { smart: 'bg-mist text-ink', premium: 'bg-[#e9eef7] text-[#1f3a6b]', luxury: 'bg-champagne-soft text-[#6d5326]', ultra: 'bg-ink text-champagne' } as const;

export function TierBadge({ tier, className }: { tier: string | null; className?: string }) {
  if (!isTier(tier)) return null;
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.06em] uppercase', TONE[tier], className)}>{TIER_INFO[tier].label}</span>;
}

export function HotelFacts({ hotel }: { hotel: { tier: string | null; totalRooms: number | null; acceptsGroups: boolean } }) {
  const facts = [
    hotel.totalRooms ? `${hotel.totalRooms} rooms` : null,
    hotel.acceptsGroups ? 'Groups welcome' : null,
    'Contracted rate',
  ].filter(Boolean);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted">
      <TierBadge tier={hotel.tier} />
      {facts.map((f, i) => <span key={i}>{i > 0 || isTier(hotel.tier) ? '· ' : ''}{f}</span>)}
    </div>
  );
}
