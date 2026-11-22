/* Stay dates are plain ISO calendar dates (YYYY-MM-DD). All arithmetic is in
 * UTC so a server in any timezone gets the same nights. */

const DAY = 86_400_000;

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toDate(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return iso(new Date(toDate(s).getTime() + n * DAY));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY);
}

/** Each night of a stay: check-in up to (not including) check-out. */
export function nightsOf(checkIn: string, checkOut: string): string[] {
  const n = daysBetween(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}

export function todayIso(now = new Date()): string {
  return iso(now);
}

export function within(night: string, from: string, to: string): boolean {
  return night >= from && night <= to;
}

export function formatDate(s: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const d = typeof s === 'string' ? (s.length === 10 ? toDate(s) : new Date(s)) : s;
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(d);
}

export function formatDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(d)) + ' UTC';
}

/** Whole hours from now until `d` (negative once passed). */
export function hoursUntil(d: Date | string, now = new Date()): number {
  return Math.floor((new Date(d).getTime() - now.getTime()) / 3_600_000);
}

/* ------------------------------------------------------------------ *
 * Day-of-week rate bands.
 *
 * Business and airport hotels routinely price Monday–Thursday differently
 * from Friday–Sunday, so a rate period carries a mask of the weekdays it
 * applies to. Bit 0 is Monday through bit 6 Sunday; ALL_DAYS (127) means
 * "every night", which is what a sheet without a weekday split means and
 * what every period loaded before this existed keeps.
 * ------------------------------------------------------------------ */

export const ALL_DAYS = 0b1111111; // 127

/** 0 = Monday … 6 = Sunday. */
export function dayOfWeek(night: string): number {
  return (toDate(night).getUTCDay() + 6) % 7;
}

/** Does this rate period's weekday mask cover this night? */
export function dayAllowed(mask: number, night: string): boolean {
  return (mask & (1 << dayOfWeek(night))) !== 0;
}

/** Do two weekday masks share any day? Disjoint masks may overlap in date. */
export function daysOverlap(a: number, b: number): boolean {
  return (a & b) !== 0;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "Every night", "Mon–Thu", or "Mon, Wed, Fri" — for the desk to read. */
export function describeDays(mask: number): string {
  if ((mask & ALL_DAYS) === ALL_DAYS) return 'Every night';
  const on = DAY_NAMES.filter((_, i) => (mask & (1 << i)) !== 0);
  if (on.length === 0) return 'No nights';
  // Contiguous runs read better as a range.
  const idx = DAY_NAMES.map((_, i) => i).filter((i) => (mask & (1 << i)) !== 0);
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && on.length > 2) return `${on[0]}–${on[on.length - 1]}`;
  return on.join(', ');
}
