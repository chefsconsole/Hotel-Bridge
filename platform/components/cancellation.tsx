/* The cancellation terms, impossible to miss: free-until date in large type,
 * where the money goes, and what happens after. For agents the refund goes
 * to their HotelBridge wallet; clients just see "full refund". */
import { cx } from './ui';
import { cancellationView, type CancelPolicy } from '@/lib/domain/cancellation';
import { formatDate } from '@/lib/domain/dates';

const long = (d: string) => formatDate(d, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

export function CancellationBox({ policy, checkIn, audience = 'agent', compact = false, className }: {
  policy: CancelPolicy; checkIn: string; audience?: 'agent' | 'client'; compact?: boolean; className?: string;
}) {
  const v = cancellationView(policy, checkIn);
  const back = audience === 'agent' ? 'back to your HotelBridge wallet' : 'refunded';
  const tone = v.state === 'free' ? 'free' : v.state === 'non_refundable' || v.state === 'arrived' ? 'none' : 'late';
  const styles = {
    free: 'border-[#bfdcc9] bg-positive-bg text-positive',
    late: 'border-[#ecd9b5] bg-pending-bg text-pending',
    none: 'border-[#f0caca] bg-negative-bg text-negative',
  }[tone];
  const icon = tone === 'free' ? 'M5 12l5 5L20 7' : tone === 'none' ? 'M6 6l12 12M18 6 6 18' : 'M12 8v5m0 3h.01M12 3l9 16H3z';

  const title = v.state === 'free' ? <>Free cancellation until <span className="whitespace-nowrap">{long(v.until)}</span></>
    : v.state === 'free_ended' ? <>Free cancellation ended on {long(v.until)}</>
    : v.state === 'non_refundable' ? 'Non-refundable rate'
    : v.state === 'arrived' ? 'Arrival date reached'
    : 'Cancellation charges apply from booking';

  const body = v.state === 'free'
    ? <>Cancel by 23:59 hotel time on that date and <strong>100% of what you paid comes {back}</strong>{audience === 'agent' ? ' — the moment it is cancelled. HotelBridge keeps nothing.' : '.'}</>
    : v.state === 'non_refundable' ? <>If cancelled or not used, nothing is refunded.</>
    : v.state === 'arrived' ? <>{v.late[0].toUpperCase() + v.late.slice(1)}.</>
    : <>If cancelled now, {v.late} (as per the hotel&apos;s terms); everything else comes {back}.</>;

  return (
    <div className={cx('flex gap-3 rounded-[var(--radius-md)] border', compact ? 'px-3.5 py-3' : 'px-5 py-4', styles, className)} role="note">
      <span className={cx('flex shrink-0 items-center justify-center rounded-full bg-current/10', compact ? 'size-7' : 'size-9')}>
        <svg viewBox="0 0 24 24" className={compact ? 'size-4' : 'size-5'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={icon} /></svg>
      </span>
      <div className="min-w-0">
        <p className={cx('font-semibold tracking-[-0.01em]', compact ? 'text-[0.92rem]' : 'text-[1.05rem]')}>{title}</p>
        <p className={cx('mt-0.5 leading-relaxed opacity-90', compact ? 'text-[0.8rem]' : 'text-[0.88rem]')}>{body}</p>
        {v.state === 'free' && <p className={cx('mt-1 opacity-75', compact ? 'text-[0.74rem]' : 'text-[0.8rem]')}>After that, {v.late}. No-shows are charged in full.</p>}
      </div>
    </div>
  );
}
