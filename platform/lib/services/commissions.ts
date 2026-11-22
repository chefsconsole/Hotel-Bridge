/* ------------------------------------------------------------------ *
 * Commission tracker: what hotels owe HotelBridge on pay-direct
 * bookings, what has actually been collected, and what is overdue.
 *
 * Every figure here is read from the ledger and the bookings that
 * produced it — nothing is estimated and no commission percentage is
 * assumed. A booking's commission is whatever its contract said at the
 * time, frozen on the booking when it was made.
 *
 * Earned      commission_receivable posted when the stay was confirmed
 * Received    commission_received posted when finance recorded the money
 * Outstanding earned − received, which is exactly the ledger balance
 * ------------------------------------------------------------------ */
import { sql } from 'drizzle-orm';
import type { DB } from '@/lib/db';
import { todayIso } from '@/lib/domain/dates';

/** A hotel's commission position in one currency. */
export type HotelCommission = {
  hotelId: string;
  hotelName: string;
  city: string;
  currency: string;
  bookings: number;
  earnedMinor: number;
  receivedMinor: number;
  outstandingMinor: number;
  /** Stay that finished longest ago and is still unpaid — null when nothing is owed. */
  oldestUnpaidCheckOut: string | null;
  /** Days since that stay ended. Commission is only chaseable after the guest has left. */
  daysOverdue: number;
};

export type CommissionTotals = { currency: string; earnedMinor: number; receivedMinor: number; outstandingMinor: number; overdueMinor: number };

/** Commission is fair to chase once the guest has checked out and this long has passed. */
export const COMMISSION_TERMS_DAYS = 30;

const rowsOf = (res: unknown) =>
  ((res as { rows?: Record<string, unknown>[] }).rows ?? (res as Record<string, unknown>[])) ?? [];

export async function hotelCommissions(db: DB): Promise<HotelCommission[]> {
  const today = todayIso();
  const res = await db.execute(sql`
    with led as (
      select coalesce(l.hotel_id, b.hotel_id) as hotel_id, l.currency,
        coalesce(sum(l.amount_minor) filter (where l.kind = 'commission_receivable'), 0) as earned,
        -coalesce(sum(l.amount_minor) filter (where l.kind = 'commission_received'), 0) as received
      from ledger_entries l
      left join bookings b on b.id = l.booking_id
      where l.account = 'commission' and coalesce(l.hotel_id, b.hotel_id) is not null
      group by 1, 2
    ),
    bk as (
      select hotel_id, currency, count(*)::int as n,
        min(check_out) filter (where status not in ('cancelled', 'declined', 'failed')) as oldest_out
      from bookings
      where commission_receivable_minor > 0
      group by 1, 2
    )
    select h.id as hotel_id, h.name, h.city, led.currency,
           led.earned, led.received, coalesce(bk.n, 0) as bookings, bk.oldest_out
    from led
    join hotels h on h.id = led.hotel_id
    left join bk on bk.hotel_id = led.hotel_id and bk.currency = led.currency
    where led.earned <> 0 or led.received <> 0
    order by (led.earned - led.received) desc`);

  return rowsOf(res).map((r) => {
    const earnedMinor = Number(r.earned);
    const receivedMinor = Number(r.received);
    const outstandingMinor = earnedMinor - receivedMinor;
    // Only a stay that has finished and is still unpaid counts as overdue.
    const oldest = outstandingMinor > 0 && r.oldest_out ? String(r.oldest_out).slice(0, 10) : null;
    const days = oldest ? Math.max(0, Math.floor((Date.parse(today) - Date.parse(oldest)) / 86_400_000)) : 0;
    return {
      hotelId: String(r.hotel_id), hotelName: String(r.name), city: String(r.city),
      currency: String(r.currency), bookings: Number(r.bookings),
      earnedMinor, receivedMinor, outstandingMinor,
      oldestUnpaidCheckOut: oldest,
      daysOverdue: days > COMMISSION_TERMS_DAYS ? days : 0,
    };
  });
}

/** Totals per currency. Money is never added across currencies. */
export function commissionTotals(rows: HotelCommission[]): CommissionTotals[] {
  const by = new Map<string, CommissionTotals>();
  for (const r of rows) {
    const t = by.get(r.currency) ?? { currency: r.currency, earnedMinor: 0, receivedMinor: 0, outstandingMinor: 0, overdueMinor: 0 };
    t.earnedMinor += r.earnedMinor;
    t.receivedMinor += r.receivedMinor;
    t.outstandingMinor += r.outstandingMinor;
    if (r.daysOverdue > 0) t.overdueMinor += r.outstandingMinor;
    by.set(r.currency, t);
  }
  return [...by.values()].sort((a, b) => b.outstandingMinor - a.outstandingMinor);
}

/** Share of what we have earned that has actually arrived, 0–100. */
export function collectionRate(t: CommissionTotals): number {
  return t.earnedMinor > 0 ? Math.round((t.receivedMinor / t.earnedMinor) * 100) : 0;
}
