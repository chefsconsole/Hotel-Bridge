import { Pill, cx } from './ui';
import { PAYMENT_LABEL, STATUS_LABEL, STATUS_TONE } from '@/lib/domain/booking-state';
import { formatDateTime, hoursUntil } from '@/lib/domain/dates';

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Pill>;
}

/** "Hotel answers by …" for on-request bookings still waiting for the hotel. */
export function HotelDeadline({ status, respondBy, who = 'The hotel' }: { status: string; respondBy: Date | null; who?: string }) {
  if (status !== 'pending_confirmation' || !respondBy) return null;
  const left = hoursUntil(respondBy);
  const urgent = left < 6;
  return (
    <p className={cx('inline-flex flex-wrap items-center gap-x-1.5 rounded-full px-3 py-1 text-[0.8rem] font-medium', urgent ? 'bg-attention-bg text-attention' : 'bg-pending-bg text-pending')}>
      {left < 0 ? `${who === 'You' ? 'Your' : 'The'} answer was due ${formatDateTime(respondBy)} — lapsing` : <>{who} {who === 'You' ? 'have' : 'has'} until {formatDateTime(respondBy)} to answer <span className="font-normal opacity-80">({left < 1 ? 'under 1 hour' : `${left}h`} left)</span></>}
    </p>
  );
}

export function PaymentPill({ status }: { status: string }) {
  const tone = status === 'paid' || status === 'refunded' || status === 'credited' ? 'positive' : status === 'due' || status === 'refund_due' ? 'attention' : 'neutral';
  return <Pill tone={tone} dot={false}>{PAYMENT_LABEL[status] ?? status}</Pill>;
}

export function Timeline({ events }: { events: { id: string; toStatus: string; actorLabel: string; note: string | null; createdAt: Date }[] }) {
  return (
    <ol className="relative space-y-5 border-l border-line pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface bg-champagne" />
          <div className="flex flex-wrap items-center gap-2"><StatusPill status={e.toStatus} /><span className="num text-[0.75rem] text-faint">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(e.createdAt)} UTC</span></div>
          {e.note && <p className="mt-1 text-[0.85rem] text-muted">{e.note}</p>}
          <p className="text-[0.75rem] text-faint">{e.actorLabel.split(' (')[0]}</p>
        </li>
      ))}
    </ol>
  );
}
