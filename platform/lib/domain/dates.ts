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
