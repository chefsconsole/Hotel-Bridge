/* ------------------------------------------------------------------ *
 * Money. Integers in minor units, always paired with a currency.
 * Every rounding decision lives here so it is made the same way everywhere.
 * ------------------------------------------------------------------ */

export type Money = { minor: number; currency: string };

export const CURRENCIES = ['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED', 'THB', 'SGD', 'JPY'] as const;

export function isCurrency(c: string): boolean {
  return /^[A-Z]{3}$/.test(c);
}

export function minorDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function assertMinor(n: number, what = 'amount'): number {
  if (!Number.isSafeInteger(n)) throw new Error(`${what} must be an integer number of minor units (got ${n})`);
  return n;
}

export type Rounding = 'half_up' | 'up' | 'down';

/** a * num / den with integer rounding, via BigInt so nothing overflows. */
export function mulDiv(a: number, num: number, den: number, rounding: Rounding = 'half_up'): number {
  assertMinor(a);
  if (den <= 0) throw new Error('den must be positive');
  const neg = (a < 0) !== (num < 0);
  const A = BigInt(Math.abs(a)) * BigInt(Math.abs(num));
  const D = BigInt(den);
  let q = A / D;
  const r = A % D;
  if (r !== BigInt(0)) {
    // Rounding is applied to the magnitude, then the sign is restored.
    if (rounding === 'up') q += BigInt(1);
    else if (rounding === 'half_up' && r * BigInt(2) >= D) q += BigInt(1);
  }
  const v = Number(q);
  return neg && v !== 0 ? -v : v;
}

/** amount * bps / 10_000 */
export function applyBps(minor: number, bps: number, rounding: Rounding = 'half_up'): number {
  return mulDiv(minor, bps, 10_000, rounding);
}

/** Round UP to the next whole currency unit (e.g. 101.20 -> 102.00). */
export function roundUpToWholeUnit(minor: number, currency: string): number {
  const unit = 10 ** minorDigits(currency);
  return Math.ceil(minor / unit) * unit;
}

/** Parse a user-entered decimal ("1,234.50") into minor units. Throws on junk. */
export function parseMoney(input: string, currency: string): number {
  const s = input.trim().replace(/[\s,]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`"${input}" is not an amount`);
  const digits = minorDigits(currency);
  const [whole, frac = ''] = s.replace('-', '').split('.');
  if (frac.length > digits) throw new Error(`${currency} amounts have at most ${digits} decimal places`);
  const minor = Number(whole) * 10 ** digits + Number((frac + '0'.repeat(digits)).slice(0, digits) || '0');
  return assertMinor(s.startsWith('-') ? -minor : minor);
}

export function toDecimalString(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const unit = 10 ** digits;
  const whole = Math.floor(abs / unit);
  const frac = digits ? '.' + String(abs % unit).padStart(digits, '0') : '';
  return (neg ? '-' : '') + whole + frac;
}

export function formatMoney(minor: number, currency: string, opts: { compact?: boolean } = {}): string {
  const digits = minorDigits(currency);
  // Rupees read best in Indian grouping (1,00,000); everything else en-GB.
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-GB', {
    style: 'currency', currency,
    minimumFractionDigits: opts.compact ? 0 : digits,
    maximumFractionDigits: opts.compact ? 0 : digits,
  }).format(minor / 10 ** digits);
}

/* ------------------------------ FX ------------------------------ */

export type FxRate = { base: string; quote: string; rateE8: number; source: string; asOf: Date };

/** Convert using a RECORDED rate. 1 base = rateE8/1e8 quote. */
export function convert(minor: number, fx: FxRate, from: string, to: string): number {
  if (from === to) return minor;
  const fromDigits = minorDigits(from);
  const toDigits = minorDigits(to);
  // minor_to = minor_from * rate * 10^(toDigits - fromDigits)
  let num: number;
  let den = 1e8;
  if (fx.base === from && fx.quote === to) num = fx.rateE8;
  else if (fx.base === to && fx.quote === from) { num = 1e8; den = fx.rateE8; }
  else throw new Error(`FX rate ${fx.base}/${fx.quote} cannot convert ${from} to ${to}`);
  const shift = toDigits - fromDigits;
  if (shift >= 0) return mulDiv(minor * 10 ** shift, num, den);
  return mulDiv(minor, num, den * 10 ** -shift);
}

/** Sum amounts that must share a currency; refuses to mix them silently. */
export function sumSameCurrency(items: Money[]): Money | null {
  if (items.length === 0) return null;
  const c = items[0].currency;
  let total = 0;
  for (const m of items) {
    if (m.currency !== c) throw new Error(`Cannot add ${m.currency} to ${c} without an FX rate`);
    total += assertMinor(m.minor);
  }
  return { minor: assertMinor(total), currency: c };
}

/** Group amounts per currency — the honest way to show multi-currency totals. */
export function totalsByCurrency(items: Money[]): Money[] {
  const map = new Map<string, number>();
  for (const m of items) map.set(m.currency, (map.get(m.currency) ?? 0) + m.minor);
  return [...map.entries()].map(([currency, minor]) => ({ currency, minor })).sort((a, b) => b.minor - a.minor);
}
