/* The client's view of a trip: the travel agency's brand, the plan and the
 * price — never HotelBridge, net rates, costs or internal references.
 * Anyone with the link can read it; the agent can turn it off or replace it. */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/forms';
import { AutoPrint, PrintLink } from '@/components/print-auto';
import { approveTripAction } from '@/app/actions/trips';
import { getDb } from '@/lib/db';
import { daysBetween } from '@/lib/domain/dates';
import { describeRooms } from '@/lib/domain/occupancy';
import { clientMoney, whatsappNumber } from '@/lib/domain/trip';
import { ITEM_KIND_LABEL, sharedTrip } from '@/lib/services/trips';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ token: string }>; searchParams: Promise<{ print?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const data = await sharedTrip(await getDb(), (await params).token);
  return {
    title: { absolute: data ? `${data.trip.title} — ${data.agency.name}` : 'Trip plan' },
    robots: { index: false, follow: false },
    icons: { icon: data?.agency.logoUrl ? data.agency.logoUrl : 'data:,' },
  };
}

const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(new Date(s + 'T00:00:00Z'));

export default async function SharedTripPage({ params, searchParams }: P) {
  const { token } = await params;
  const { print } = await searchParams;
  const data = await sharedTrip(await getDb(), token);
  if (!data) notFound();
  const { agency, trip: t, items, totals, clientName } = data;
  const nights = t.startDate && t.endDate ? daysBetween(t.startDate, t.endDate) : 0;
  const wa = whatsappNumber(agency.phone);
  const canApprove = !t.approvedAt && (t.status === 'enquiry' || t.status === 'quoted');
  const initials = agency.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const hotelsCount = items.filter((i) => i.kind === 'hotel').length;

  return (
    <div className="min-h-dvh bg-paper print:bg-white">
      {print && <AutoPrint />}
      <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-8 sm:py-14 print:max-w-none print:p-0">
        {/* Agency */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {agency.logoUrl
              // eslint-disable-next-line @next/next/no-img-element -- the agency's own logo URL, any host
              ? <img src={agency.logoUrl} alt={agency.name} className="h-12 w-auto max-w-48 object-contain" />
              : <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink font-[family-name:var(--font-display)] text-[1.05rem] tracking-wide text-champagne">{initials}</span>}
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-[1.15rem] font-medium tracking-[-0.01em]">{agency.name}</p>
              <p className="truncate text-[0.8rem] text-muted">{[agency.phone, agency.email].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <PrintLink />
        </header>

        {/* Cover */}
        <section className="relative mt-8 overflow-hidden rounded-[var(--radius-lg)] bg-ink px-6 py-10 text-paper sm:px-10 sm:py-14 print:mt-6 print:rounded-none">
          <svg viewBox="0 0 400 200" className="pointer-events-none absolute -right-10 -bottom-16 h-64 w-auto text-champagne/25" aria-hidden>
            <path d="M10 190C80 60 160 20 200 20s120 40 190 170" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M60 190C110 100 160 70 200 70s90 30 140 120" fill="none" stroke="currentColor" strokeWidth="0.8" />
          </svg>
          <p className="text-[0.7rem] font-medium tracking-[0.24em] text-champagne uppercase">Trip plan for {clientName}</p>
          <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-[2.1rem] leading-[1.08] font-light tracking-[-0.03em] sm:text-[2.9rem]">{t.title}</h1>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-[0.9rem]">
            {t.startDate && <div><dt className="text-[0.68rem] tracking-[0.16em] text-paper/50 uppercase">Dates</dt><dd className="num mt-1">{fmt(t.startDate, { day: 'numeric', month: 'short' })}{t.endDate && ` – ${fmt(t.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}</dd></div>}
            {nights > 0 && <div><dt className="text-[0.68rem] tracking-[0.16em] text-paper/50 uppercase">Duration</dt><dd className="num mt-1">{nights} night{nights === 1 ? '' : 's'}</dd></div>}
            <div><dt className="text-[0.68rem] tracking-[0.16em] text-paper/50 uppercase">Travellers</dt><dd className="num mt-1">{t.adults} adult{t.adults === 1 ? '' : 's'}{t.children ? `, ${t.children} child${t.children === 1 ? '' : 'ren'}` : ''}</dd></div>
            {hotelsCount > 0 && <div><dt className="text-[0.68rem] tracking-[0.16em] text-paper/50 uppercase">Stays</dt><dd className="num mt-1">{hotelsCount} hotel{hotelsCount === 1 ? '' : 's'}</dd></div>}
          </dl>
        </section>

        {t.note && <p className="mt-8 rounded-[var(--radius-md)] border border-line bg-surface px-5 py-4 text-[0.95rem] leading-relaxed whitespace-pre-line">{t.note}</p>}

        {/* Itinerary */}
        <section className="mt-10">
          <h2 className="eyebrow">Your itinerary</h2>
          {items.length === 0 ? <p className="mt-4 text-muted">Your travel consultant is preparing the plan.</p> : (
            <ol className="relative mt-5 space-y-4 before:absolute before:top-4 before:bottom-4 before:left-[2.1rem] before:w-px before:bg-line sm:before:left-[2.6rem]">
              {items.map((i) => {
                const n = i.startDate && i.endDate ? daysBetween(i.startDate, i.endDate) : 0;
                return (
                  <li key={i.id} className="relative flex gap-4 break-inside-avoid sm:gap-6">
                    <div className="relative z-10 flex w-[4.2rem] shrink-0 self-start flex-col items-center rounded-[var(--radius-md)] border border-line bg-surface py-2.5 text-center sm:w-[5.2rem]">
                      {i.startDate ? <>
                        <span className="text-[0.66rem] font-medium tracking-[0.14em] text-champagne uppercase">{fmt(i.startDate, { month: 'short' })}</span>
                        <span className="num font-[family-name:var(--font-display)] text-[1.6rem] leading-none font-light">{fmt(i.startDate, { day: 'numeric' })}</span>
                        <span className="mt-0.5 text-[0.68rem] text-faint">{fmt(i.startDate, { weekday: 'short' })}</span>
                      </> : <span className="py-2 text-[0.72rem] text-faint">Any day</span>}
                    </div>
                    <div className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)] print:shadow-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-medium tracking-[0.16em] text-faint uppercase">{ITEM_KIND_LABEL[i.kind] ?? i.kind}{i.kind === 'hotel' && i.details ? ` · ${i.details}` : ''}{i.stars ? ` · ${i.stars}★` : ''}</p>
                          <p className="mt-1 text-[1.08rem] font-medium tracking-[-0.01em]">{i.title}{i.sample && <span className="ml-2 text-[0.7rem] font-normal text-faint">(sample hotel)</span>}</p>
                        </div>
                        {t.showItemPrices && i.priceMinor != null && <p className="num text-[1.02rem] font-medium">{clientMoney(i.priceMinor, t.currency)}</p>}
                      </div>
                      {i.kind === 'hotel' ? (
                        <div className="mt-2 space-y-1 text-[0.88rem] text-muted">
                          <p>{n > 0 && <span className="num">{n} night{n === 1 ? '' : 's'}{i.endDate ? ` · check-out ${fmt(i.endDate, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}</span>}</p>
                          <p>{i.roomName}{i.mealPlan ? ` · ${i.mealPlan}` : ''}{i.rooms ? ` · ${describeRooms(i.rooms)}` : ''}</p>
                          {i.address && <p className="text-faint">{i.address}</p>}
                          {i.cancellation && <p className="text-[0.8rem] text-faint">{i.cancellation}</p>}
                        </div>
                      ) : i.details ? <p className="mt-2 text-[0.88rem] whitespace-pre-line text-muted">{i.details}</p> : null}
                      {i.status && (
                        <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${i.status === 'Confirmed' ? 'bg-positive-bg text-positive' : i.status === 'Cancelled' ? 'bg-negative-bg text-negative' : 'bg-pending-bg text-pending'}`}>
                          {i.status}{i.confirmation ? ` · Confirmation ${i.confirmation}` : ''}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Price */}
        <section className="mt-10 break-inside-avoid rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8 print:shadow-none">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Total package price</p>
              <p className="num mt-2 font-[family-name:var(--font-display)] text-[2.4rem] leading-none font-light tracking-[-0.03em]">{clientMoney(totals.totalMinor, t.currency)}</p>
              <p className="mt-2 text-[0.82rem] text-muted">For {t.adults + t.children} traveller{t.adults + t.children === 1 ? '' : 's'}{totals.unpriced ? ' · some items are still being priced' : ''}</p>
            </div>
            {totals.receivedMinor > 0 && (
              <dl className="grid grid-cols-2 gap-x-8 text-right text-[0.88rem]">
                <dt className="text-muted">Paid</dt><dd className="num">{clientMoney(totals.receivedMinor, t.currency)}</dd>
                <dt className="mt-1 font-medium">{totals.pendingMinor > 0 ? 'Balance' : 'Fully paid'}</dt><dd className="num mt-1 font-medium">{totals.pendingMinor > 0 ? clientMoney(totals.pendingMinor, t.currency) : '✓'}</dd>
              </dl>
            )}
          </div>
          {totals.pendingMinor > 0 && t.balanceDueOn && <p className="mt-5 border-t border-line pt-4 text-[0.88rem]">Please pay <span className="font-medium">{clientMoney(totals.pendingMinor, t.currency)}</span> by <span className="font-medium">{fmt(t.balanceDueOn, { day: 'numeric', month: 'long', year: 'numeric' })}</span>.</p>}
        </section>

        {/* Approve */}
        <section className="no-print mt-8">
          {t.approvedAt ? (
            <p className="rounded-[var(--radius-md)] bg-positive-bg px-5 py-4 text-[0.92rem] text-positive">You approved this plan on {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(t.approvedAt)}. {agency.name} will confirm your bookings.</p>
          ) : canApprove && items.length > 0 ? (
            <ActionForm action={approveTripAction} className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-champagne/40 bg-champagne-soft p-6 sm:flex-row sm:items-center sm:justify-between">
              <input type="hidden" name="token" value={token} />
              <div>
                <p className="font-medium">Happy with this plan?</p>
                <p className="text-[0.85rem] text-muted">Let {agency.name} know, and they will confirm everything with you.</p>
              </div>
              <SubmitButton size="lg" pendingLabel="Sending…">Approve this plan</SubmitButton>
            </ActionForm>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, about my trip "${t.title}" (${t.reference}): `)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-[#1f8f4e] px-5 text-[0.9rem] font-medium text-white hover:bg-[#187a41]">Message on WhatsApp</a>}
            {agency.email && <a href={`mailto:${agency.email}?subject=${encodeURIComponent(`${t.title} (${t.reference})`)}`} className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong bg-surface px-5 text-[0.9rem] font-medium hover:border-ink">Email us</a>}
          </div>
        </section>

        <footer className="mt-12 border-t border-line pt-6 text-[0.78rem] leading-relaxed text-faint">
          <p className="font-medium text-muted">{agency.name}{agency.website ? ` · ${agency.website.replace(/^https?:\/\//, '')}` : ''}</p>
          {agency.footer && <p className="mt-1 whitespace-pre-line">{agency.footer}</p>}
          <p className="mt-2">Ref. {t.reference} · Prices and availability are confirmed at the time of booking.</p>
        </footer>
      </div>
    </div>
  );
}
