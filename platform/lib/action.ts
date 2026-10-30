/* Server-action plumbing: turn domain errors into messages the user can act
 * on, and never leak internals. Redirects and not-found pass through. */
import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import { AppError } from '@/lib/services/errors';
import { TransitionError } from '@/lib/domain/booking-state';
import { PricingError } from '@/lib/domain/pricing';

export type ActionResult = { ok: boolean; message?: string; data?: Record<string, unknown> };

export function messageFor(e: unknown): string {
  if (e instanceof AppError || e instanceof TransitionError || e instanceof PricingError) return e.message;
  if (e instanceof ZodError) {
    return e.issues.slice(0, 4).map((i) => (i.path.length ? `${humanPath(i.path)}: ${i.message}` : i.message)).join('\n');
  }
  console.error('[action]', e);
  return 'Something went wrong on our side. Nothing was charged. Please try again or contact support.';
}

function humanPath(p: (string | number)[]) {
  return p.map((x) => (typeof x === 'number' ? `#${x + 1}` : x.replace(/([A-Z])/g, ' $1').toLowerCase())).join(' ');
}

export async function attempt(fn: () => Promise<string | void | ActionResult>): Promise<ActionResult> {
  try {
    const r = await fn();
    if (r && typeof r === 'object') return r;
    return { ok: true, message: r || 'Saved.' };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, message: messageFor(e) };
  }
}

/* FormData helpers */
export const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
export const optStr = (fd: FormData, k: string) => str(fd, k) || undefined;
export const int = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === '' ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : NaN;
};
export const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
/** Percent text ("12.5") -> basis points (1250). */
export const bps = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
};
