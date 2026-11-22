import Link from 'next/link';
import { Empty, Money, PageHeader, Panel, Pill, Stat } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import {
  COMMISSION_TERMS_DAYS, collectionRate, commissionTotals, hotelCommissions,
} from '@/lib/services/commissions';

export const metadata = { title: 'Commissions' };

/** What hotels owe us on pay-direct bookings, what has arrived, and what is late.
 *  Every figure comes from the ledger — no commission percentage is assumed. */
export default async function CommissionsPage() {
  await requireStaff();
  const rows = await hotelCommissions(await getDb());
  const totals = commissionTotals(rows);
  const overdue = rows.filter((r) => r.daysOverdue > 0);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Commissions"
        description={`What hotels owe us on pay-direct bookings, what has been received, and what is late. Commission becomes chaseable ${COMMISSION_TERMS_DAYS} days after the guest checks out. Money is shown per currency and never added across them.`}
      />

      {totals.length === 0 ? (
        <Panel title="Nothing to collect yet">
          <Empty title="No commission earned yet">
            Commission appears here once a pay-direct booking is confirmed — the kind where the guest settles with
            the hotel and the hotel owes us our share. Prepaid bookings earn a margin instead, which you&rsquo;ll find
            under Insights.
          </Empty>
        </Panel>
      ) : (
        <>
          {totals.map((t) => (
            <div key={t.currency} className="mb-6">
              <p className="mb-3 text-[0.7rem] font-medium tracking-[0.14em] text-faint uppercase">{t.currency}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Earned" value={<Money minor={t.earnedMinor} currency={t.currency} />} hint="all time" />
                <Stat label="Received" value={<Money minor={t.receivedMinor} currency={t.currency} />} hint={`${collectionRate(t)}% collected`} />
                <Stat label="Outstanding" value={<Money minor={t.outstandingMinor} currency={t.currency} />} hint="hotels still owe us" />
                <Stat label="Overdue" value={<Money minor={t.overdueMinor} currency={t.currency} />} hint={`over ${COMMISSION_TERMS_DAYS} days since check-out`} />
              </div>
            </div>
          ))}

          {overdue.length > 0 && (
            <Panel
              title={`Chase these first · ${overdue.length}`}
              description="The guest left more than a month ago and the commission still has not arrived."
              className="mb-6"
              padded={false}
            >
              <div className="overflow-x-auto"><table className="table">
                <thead><tr><th>Hotel</th><th>Oldest unpaid stay</th><th className="text-right">Outstanding</th><th /></tr></thead>
                <tbody>{overdue.map((r) => (
                  <tr key={`${r.hotelId}-${r.currency}`}>
                    <td className="font-medium">{r.hotelName}<p className="text-[0.75rem] font-normal text-faint">{r.city}</p></td>
                    <td>
                      {r.oldestUnpaidCheckOut ? formatDate(r.oldestUnpaidCheckOut) : '—'}
                      <p className="text-[0.75rem] text-faint">{r.daysOverdue} days ago</p>
                    </td>
                    <td className="num text-right"><Money minor={r.outstandingMinor} currency={r.currency} /></td>
                    <td className="text-right">
                      <Link href={`/admin/tracker?hotel=${r.hotelId}`} className="text-[0.8rem] font-medium underline underline-offset-4">Record payment</Link>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            </Panel>
          )}

          <Panel title="By hotel" padded={false} description="Every hotel we have earned commission from.">
            <div className="overflow-x-auto"><table className="table">
              <thead><tr>
                <th>Hotel</th><th className="text-right">Bookings</th><th className="text-right">Earned</th>
                <th className="text-right">Received</th><th className="text-right">Outstanding</th><th>Status</th><th />
              </tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={`${r.hotelId}-${r.currency}`}>
                  <td className="font-medium">{r.hotelName}<p className="text-[0.75rem] font-normal text-faint">{r.city} · {r.currency}</p></td>
                  <td className="num text-right">{r.bookings}</td>
                  <td className="num text-right"><Money minor={r.earnedMinor} currency={r.currency} /></td>
                  <td className="num text-right"><Money minor={r.receivedMinor} currency={r.currency} /></td>
                  <td className="num text-right font-medium"><Money minor={r.outstandingMinor} currency={r.currency} /></td>
                  <td>
                    {r.outstandingMinor <= 0
                      ? <Pill tone="positive">Settled</Pill>
                      : r.daysOverdue > 0
                        ? <Pill tone="attention">{r.daysOverdue} days overdue</Pill>
                        : <Pill tone="pending">Outstanding</Pill>}
                  </td>
                  <td className="text-right">
                    <Link href={`/admin/tracker?hotel=${r.hotelId}`} className="text-[0.8rem] underline underline-offset-4">Open</Link>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          </Panel>
        </>
      )}
    </>
  );
}
