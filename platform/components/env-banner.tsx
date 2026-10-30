import { HB_ENV, demoMode, isProduction } from '@/lib/config';

/** Outside production, everyone can see which environment they are in. */
export function EnvBanner() {
  if (isProduction) return null;
  return (
    <div className="no-print bg-champagne-soft px-4 py-1.5 text-center text-[0.75rem] text-ink">
      <strong className="font-semibold uppercase tracking-wider">{HB_ENV}</strong>
      <span className="mx-2 text-faint">·</span>
      {demoMode
        ? 'Sample hotels, rates and agencies are fictional and marked “Sample”. The sandbox supplier is simulated. No real reservations are made.'
        : 'Not production. The sandbox supplier is simulated. No real reservations are made.'}
    </div>
  );
}
