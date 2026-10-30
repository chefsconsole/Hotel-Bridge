/* ------------------------------------------------------------------ *
 * Supplier registry + the one wrapper every supplier call goes through:
 * timeout, redacted request/response log, error classification, a simple
 * circuit breaker, and retries ONLY for operations that are safe to repeat.
 * ------------------------------------------------------------------ */
import { schema, type DB } from '@/lib/db';
import { isProduction } from '@/lib/config';
import { contractedAdapter } from './contracted';
import { sandboxAdapter } from './sandbox';
import { SupplierTimeoutError, SupplierUnavailableError, classify, type SupplierAdapter } from './types';

/** Candidate third-party sources. Listed so the gap is visible, not to pretend they work. */
export const SUPPLIER_CANDIDATES = [
  { id: 'hotelbeds', label: 'Hotelbeds (APItude)', needs: 'Commercial agreement, API key + secret, certification of booking flow' },
  { id: 'tbo', label: 'TBO Holidays', needs: 'B2B agreement, API credentials, IP allow-listing' },
  { id: 'ratehawk', label: 'RateHawk / Emerging Travel Group', needs: 'API partnership approval, key id + key' },
  { id: 'channel_manager', label: 'Hotel channel manager (per hotel)', needs: 'Hotel consent, channel manager connectivity agreement and credentials' },
] as const;

export function adapters(): SupplierAdapter[] {
  const list: SupplierAdapter[] = [contractedAdapter];
  if (!isProduction && process.env.HB_SANDBOX_SUPPLIER !== '0') list.push(sandboxAdapter);
  return list;
}

export function getAdapter(id: string): SupplierAdapter {
  const a = adapters().find((x) => x.id === id);
  if (!a) throw new SupplierUnavailableError(`Supplier "${id}" is not available in this environment`);
  return a;
}

/* --------------------------- circuit breaker --------------------------- */

type Breaker = { failures: number; openUntil: number };
const breakers = new Map<string, Breaker>();
const FAILURE_THRESHOLD = 5;
const OPEN_MS = 30_000;

export function breakerState(id: string): 'closed' | 'open' {
  const b = breakers.get(id);
  return b && b.openUntil > Date.now() ? 'open' : 'closed';
}

function recordOutcome(id: string, ok: boolean) {
  const b = breakers.get(id) ?? { failures: 0, openUntil: 0 };
  if (ok) b.failures = 0;
  else if (++b.failures >= FAILURE_THRESHOLD) { b.openUntil = Date.now() + OPEN_MS; b.failures = 0; }
  breakers.set(id, b);
}

/* ------------------------------ redaction ------------------------------ */

const SENSITIVE = /^(leadGuest|guestNames|email|phone|password|apiKey|secret|token|card.*)$/i;

export function redact(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, SENSITIVE.test(k) ? '[redacted]' : redact(x)]));
  }
  return v;
}

/* -------------------------------- call -------------------------------- */

export type Operation = 'search' | 'revalidate' | 'book' | 'retrieve' | 'cancel';

const TIMEOUT_MS: Record<Operation, number> = { search: 8_000, revalidate: 8_000, book: 30_000, retrieve: 10_000, cancel: 20_000 };
// Never retry book or cancel: a lost response does not mean nothing happened.
const RETRIES: Record<Operation, number> = { search: 1, revalidate: 1, book: 0, retrieve: 2, cancel: 0 };

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new SupplierTimeoutError(`${what} timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function callSupplier<T>(
  db: DB,
  adapter: SupplierAdapter,
  op: Operation,
  request: unknown,
  fn: () => Promise<T>,
  opts: { bookingId?: string | null; timeoutMs?: number } = {},
): Promise<T> {
  if (breakerState(adapter.id) === 'open' && op !== 'retrieve') {
    throw new SupplierUnavailableError(`${adapter.label} is temporarily paused after repeated failures`);
  }
  let attempt = 0;
  for (;;) {
    const started = Date.now();
    try {
      const res = await withTimeout(fn(), opts.timeoutMs ?? TIMEOUT_MS[op], `${adapter.label} ${op}`);
      recordOutcome(adapter.id, true);
      await log(db, adapter.id, op, 'ok', started, request, op === 'search' ? { offers: Array.isArray(res) ? res.length : null } : res, opts.bookingId);
      return res;
    } catch (e) {
      const kind = classify(e);
      // A rejection is a valid answer, not a supplier failure.
      if (kind !== 'rejected') recordOutcome(adapter.id, false);
      await log(db, adapter.id, op, kind === 'error' ? 'error' : kind, started, request, { error: (e as Error).message }, opts.bookingId);
      const retryable = (kind === 'timeout' || kind === 'error') && attempt < RETRIES[op];
      if (!retryable) throw e;
      attempt++;
    }
  }
}

async function log(db: DB, supplier: string, operation: string, outcome: string, started: number, request: unknown, response: unknown, bookingId?: string | null) {
  try {
    await db.insert(schema.supplierCalls).values({
      supplier, operation, outcome, durationMs: Date.now() - started,
      request: redact(request) as object, response: redact(response) as object, bookingId: bookingId ?? null,
    });
  } catch {
    // Logging must never break a booking.
  }
}
