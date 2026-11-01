/* HotelBridge curates: every hotel we sell sits in one of four tiers. Agents
 * pick the tier that fits their client; bedbanks sell everything, we don't. */

export const TIERS = ['smart', 'premium', 'luxury', 'ultra'] as const;
export type Tier = typeof TIERS[number];

export const TIER_INFO: Record<Tier, { label: string; short: string; stars: string; client: string }> = {
  smart: { label: 'Smart', short: 'Smart', stars: '3.5–4★', client: 'Value-conscious families and groups: reliable, well located, great rate.' },
  premium: { label: 'Premium', short: 'Premium', stars: 'Upper 4★', client: 'Comfort-first clients: better rooms, pools, breakfast that impresses.' },
  luxury: { label: 'Luxury', short: 'Luxury', stars: '4.5–5★', client: 'Honeymoons and celebrations: full-service 5-star.' },
  ultra: { label: 'Ultra-luxury', short: 'Ultra', stars: 'The icons', client: 'The best address in the destination — palaces, private islands, legends.' },
};

export const isTier = (t: string | null | undefined): t is Tier => !!t && (TIERS as readonly string[]).includes(t);

/** "premium,luxury" → ['premium','luxury'] (unknown values dropped). */
export function parseTiers(s: string | string[] | null | undefined): Tier[] {
  const list = Array.isArray(s) ? s : (s ?? '').split(',');
  return [...new Set(list.map((x) => x.trim()).filter(isTier))];
}

/** Map the research tracker's tier labels to ours. */
export function tierFromLabel(label: string | null | undefined): Tier | null {
  const l = (label ?? '').toLowerCase();
  if (l.startsWith('ultra')) return 'ultra';
  if (l.startsWith('luxury')) return 'luxury';
  if (l.startsWith('premium')) return 'premium';
  if (l.startsWith('smart') || l.startsWith('value')) return 'smart';
  return null;
}
