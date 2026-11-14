/* ------------------------------------------------------------------ *
 * How HotelBridge ranks an agency relationship, and the codes everything
 * is filed under.
 *
 * The grade is OUR judgement of the relationship, for our own desk. It is
 * never shown to the agency and never changes what they are quoted —
 * pricing comes from the contract and the pricing rule, not from this.
 * ------------------------------------------------------------------ */

export const GRADES = ['key', 'preferred', 'hot', 'standard', 'watch'] as const;
export type Grade = typeof GRADES[number];

export const GRADE_INFO: Record<Grade, { label: string; short: string; tone: 'positive' | 'attention' | 'pending' | 'neutral'; meaning: string }> = {
  key: { label: 'Key account', short: 'Key', tone: 'positive', meaning: 'Books regularly and at volume. Answer first, every time.' },
  preferred: { label: 'Preferred', short: 'Preferred', tone: 'positive', meaning: 'Steady, reliable business. Worth protecting.' },
  hot: { label: 'Hot lead', short: 'Hot', tone: 'attention', meaning: 'New or warming up — enquiring now. Chase these while they are live.' },
  standard: { label: 'Standard', short: 'Standard', tone: 'neutral', meaning: 'Registered and trading normally.' },
  watch: { label: 'Watch', short: 'Watch', tone: 'pending', meaning: 'Something needs care — payment history, disputes, or dormant.' },
};

export const isGrade = (g: string | null | undefined): g is Grade => !!g && (GRADES as readonly string[]).includes(g);
export const gradeOf = (g: string | null | undefined): Grade => (isGrade(g) ? g : 'standard');

/** Agency trading code: HB-A0042. Padded so it sorts and reads consistently. */
export function agencyCode(n: number): string {
  return `HB-A${String(n).padStart(4, '0')}`;
}

/** An agent's code under their agency: HB-A0042-02. The owner is -01. */
export function agentCode(agency: string, seat: number): string {
  return `${agency}-${String(seat).padStart(2, '0')}`;
}

/** Tags are free text, but kept tidy: trimmed, deduped, lower-cased, capped. */
export function cleanTags(input: string | string[] | null | undefined): string[] {
  const list = Array.isArray(input) ? input : (input ?? '').split(',');
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.trim().replace(/\s+/g, ' ').slice(0, 40).toLowerCase();
    if (t && !out.includes(t)) out.push(t);
    if (out.length === 20) break;
  }
  return out;
}
