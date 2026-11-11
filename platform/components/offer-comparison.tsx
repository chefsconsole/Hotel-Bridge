/* Side-by-side hotel offers for one group, city by city. Built from recorded
 * offers only; the city-tax figure is the one estimate and says so. */
import type { ReactNode } from 'react';
import { formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import type { CityComparison, OfferColumn } from '@/lib/domain/offer-compare';
import { Pill, cx } from './ui';

const dash = <span className="text-faint">—</span>;

export function OfferComparison({ cities, groupCurrency }: { cities: CityComparison[]; groupCurrency: string }) {
  return (
    <div className="space-y-6">
      {cities.map((c) => {
        const row = (label: string, cell: (col: OfferColumn) => ReactNode, hint?: string) => (
          <tr>
            <th scope="row" className="sticky left-0 z-10 w-40 min-w-40 bg-surface px-4 py-2.5 text-left align-top text-[0.78rem] font-medium text-muted">
              {label}{hint && <span className="block text-[0.7rem] font-normal text-faint">{hint}</span>}
            </th>
            {c.columns.map((col) => <td key={col.offer.id} className={cx('min-w-52 px-4 py-2.5 align-top text-[0.84rem]', col.lowest && 'bg-positive-bg/40', col.expired && 'opacity-60')}>{cell(col)}</td>)}
          </tr>
        );
        return (
          <section key={c.city} aria-label={`Offers in ${c.city}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
              <h3 className="text-[0.95rem] font-semibold">{c.city}{c.nights != null && <span className="font-normal text-muted"> · {c.nights} night{c.nights > 1 ? 's' : ''}</span>}</h3>
              <p className="text-[0.75rem] text-faint">{c.columns.length} offer{c.columns.length > 1 ? 's' : ''}{c.mixedCurrency ? ' · different currencies, so no “lowest” is marked' : ''}</p>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-y border-line">
                    <th className="sticky left-0 z-10 bg-surface px-4 py-3" />
                    {c.columns.map((col) => (
                      <th key={col.offer.id} scope="col" className={cx('px-4 py-3 text-left align-top', col.lowest && 'bg-positive-bg/40')}>
                        <p className="text-[0.92rem] font-semibold">{col.offer.hotelName}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {col.lowest && <Pill tone="positive">Lowest per room-night</Pill>}
                          {col.expired && <Pill tone="negative">Offer expired</Pill>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {row('Per room-night', (col) => <span className="num text-[1.05rem] font-semibold">{col.roomNights ? formatMoney(col.perRoomNightMinor, col.offer.currency) : dash}</span>, 'average, net')}
                  {row('Total cost', (col) => <span className="num font-medium">{formatMoney(col.offer.costTotalMinor, col.offer.currency)}</span>)}
                  {row('Rooms covered', (col) => col.coverage ? (
                    <span className={cx('num', col.coverage.offered < col.coverage.needed ? 'text-attention' : 'text-ink')}>
                      {col.coverage.offered} of {col.coverage.needed} room-nights{col.coverage.offered < col.coverage.needed ? ' — short' : ''}
                    </span>
                  ) : <span className="text-faint">City not on the itinerary</span>)}
                  {row('Budget', (col) => col.budget === 'within' ? <span className="text-positive">Within budget</span> : col.budget === 'over' ? <span className="text-negative">Over budget</span> : <span className="text-faint">{col.offer.currency !== groupCurrency ? `Budget is in ${groupCurrency}` : 'No budget given'}</span>)}
                  {row('Rate lines', (col) => <ul className="space-y-0.5">{col.offer.lines.map((l, i) => <li key={i} className="num text-[0.8rem]">{l.rooms}× {l.roomType} × {l.nights}n @ {formatMoney(l.rateMinor, col.offer.currency)}</li>)}</ul>)}
                  {row('Board', (col) => col.offer.mealPlan ? <span className={col.boardMatches === false ? 'text-attention' : undefined}>{col.offer.mealPlan}{col.boardMatches === false ? ' — not what was asked' : ''}</span> : dash)}
                  {row('Taxes', (col) => col.offer.taxesNote ?? dash)}
                  {row('City tax', (col) => col.cityTaxEstimateMinor != null ? <span><span className="num">≈ {formatMoney(col.cityTaxEstimateMinor, col.offer.currency)}</span><span className="block text-[0.72rem] text-faint">{formatMoney(col.offer.cityTaxMinor ?? 0, col.offer.currency)} per person per night, paid at the hotel</span></span> : col.offer.cityTaxMinor ? `${formatMoney(col.offer.cityTaxMinor, col.offer.currency)} pppn` : dash, 'estimate')}
                  {row('Cancellation', (col) => col.offer.cancellationTerms ? <span className="whitespace-pre-line text-[0.8rem]">{col.offer.cancellationTerms}</span> : <span className="text-attention">Not given — ask the hotel</span>)}
                  {row('Deposit & payment', (col) => col.offer.paymentTerms ? <span className="whitespace-pre-line text-[0.8rem]">{col.offer.paymentTerms}</span> : <span className="text-attention">Not given — ask the hotel</span>)}
                  {row('Valid until', (col) => col.offer.validUntil ? <span className={cx('num', col.expired && 'text-negative')}>{formatDate(col.offer.validUntil)}</span> : dash)}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
