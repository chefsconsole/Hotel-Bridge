import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/forms';
import { DL, Money, Notice, PageHeader, Panel, Pill } from '@/components/ui';
import { rateRequestDecisionAction } from '@/app/actions/rate-requests';
import { getDb } from '@/lib/db';
import { daysBetween, formatDate, formatDateTime, hoursUntil } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { describeRoom, describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { NotFoundError } from '@/lib/services/errors';
import { RATE_STATUS, getRateRequest, tierLabel } from '@/lib/services/rate-requests';

export const metadata = { title: 'Best-rate request' };

export default async function RateRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, agency } = await requireAgent();
  const { id } = await params;
  const db = await getDb();
  const data = await getRateRequest(db, actor, id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!data) notFound();
  const { request: r, fit, alternatives, children } = data;
  const nights = daysBetween(r.checkIn, r.checkOut);
  const status = RATE_STATUS[r.status] ?? { label: r.status, tone: 'neutral' as const };
  const stayQuery = new URLSearchParams({ in: r.checkIn, out: r.checkOut, rooms: encodeRooms(r.rooms) }).toString();
  const meal = (k: string | null) => (k ? MEAL_PLANS[k as keyof typeof MEAL_PLANS] ?? k : null);

  return (
    <div className="animate-[var(--animate-rise)]">
      <Link href="/agent/rate-requests" className="text-[0.85rem] text-muted hover:text-ink">← All best-rate requests</Link>
      <PageHeader eyebrow={r.reference} title={r.hotelName} description={`${r.city} · ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)} · ${nights} night${nights === 1 ? '' : 's'} · ${describeRooms(r.rooms)}`}
        actions={<Pill tone={status.tone}>{status.label}</Pill>} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {r.status === 'quoted' || r.status === 'accepted' ? (
            <Panel title={r.status === 'accepted' ? 'You accepted this rate' : 'The hotel’s best rate'}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[0.75rem] text-faint">Total for the stay · all rooms</p>
                  <Money minor={r.sellMinor!} currency={r.quoteCurrency!} className="text-[2rem] font-semibold" />
                  <p className="mt-1 text-[0.85rem] text-muted">{r.quoteRoomType} · {meal(r.quoteMealPlan) ?? 'meals as quoted'} · about {formatMoney(Math.round(r.sellMinor! / (r.rooms.length * nights)), r.quoteCurrency!)} per room per night</p>
                </div>
                {fit === 'within' && <Pill tone="positive">Within your client’s budget</Pill>}
                {fit === 'over' && <Pill tone="attention">Above your client’s budget</Pill>}
              </div>
              <div className="mt-5">
                <DL items={[
                  ['Cancellation', r.quoteCancellation],
                  ['Hotel notes', r.quoteNotes],
                  ['Valid until', r.quoteValidUntil ? formatDate(r.quoteValidUntil) : null],
                  ['Accepted', r.acceptedAt ? formatDateTime(r.acceptedAt) : null],
                ]} />
              </div>
              {r.status === 'quoted' ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <ActionForm action={rateRequestDecisionAction}>
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="accept" />
                    <SubmitButton size="lg" pendingLabel="Accepting…" confirm={`Accept ${formatMoney(r.sellMinor!, r.quoteCurrency!)} for this stay?`}>Accept this rate</SubmitButton>
                  </ActionForm>
                  <ActionForm action={rateRequestDecisionAction}>
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="cancel" />
                    <SubmitButton variant="secondary" size="lg" pendingLabel="Cancelling…" confirm="Cancel this request?">Not needed</SubmitButton>
                  </ActionForm>
                </div>
              ) : (
                <div className="mt-5"><Notice tone="success">The hotel has been asked to hold the rooms. Our reservations team will contact you for guest names and payment to confirm the booking.</Notice></div>
              )}
            </Panel>
          ) : r.status === 'sent' || r.status === 'not_emailed' ? (
            <Panel title="Waiting for the hotel">
              {r.status === 'sent'
                ? <p className="text-[0.92rem]">We’ve asked {r.hotelName} for its best rate. The hotel answers by <span className="font-medium">{formatDateTime(r.respondByAt)}</span> ({Math.max(hoursUntil(r.respondByAt), 0)}h left) — you’ll get an email and see the price here.</p>
                : agency.isSample
                  ? <Notice title="Demo account — the hotel was not emailed">Requests from a demo account are recorded but never sent, so no real hotel is contacted. To see the hotel’s side, open this request’s hotel reply link from Admin → Rate requests.</Notice>
                  : <Notice tone="warning" title="Not emailed yet">Our email isn’t connected on this environment, so the hotel hasn’t been asked automatically. HotelBridge will send it by hand.</Notice>}
              <ActionForm action={rateRequestDecisionAction} className="mt-5">
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="cancel" />
                <SubmitButton variant="secondary" size="sm" pendingLabel="Cancelling…" confirm="Cancel this request?">Cancel request</SubmitButton>
              </ActionForm>
            </Panel>
          ) : (
            <Panel title={status.label}>
              <p className="text-[0.92rem] text-muted">
                {r.status === 'declined' ? `${r.hotelName} can’t offer this stay${r.declineReason ? `: ${r.declineReason}` : '.'}` :
                  r.status === 'no_response' ? `${r.hotelName} didn’t answer in time.` :
                    r.status === 'expired' ? 'The quoted rate has expired.' : 'This request is closed.'}
                {' '}Similar hotels are below.
              </p>
            </Panel>
          )}

          {(alternatives.onRequest.length > 0 || alternatives.priced.length > 0) && (
            <Panel title={fit === 'over' ? 'Hotels that may fit the budget' : 'Similar hotels in ' + r.city} description="Same dates and rooms. Asking another hotel keeps your private budget.">
              <ul className="divide-y divide-line">
                {alternatives.priced.map(({ hotel, fromMinor, currency }) => (
                  <li key={hotel.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div><p className="font-medium">{hotel.name}</p><p className="text-[0.8rem] text-muted">{tierLabel(hotel.tier) ?? 'Contracted hotel'} · instant price</p></div>
                    <div className="flex items-center gap-3"><Money minor={fromMinor} currency={currency} className="font-semibold" /><Link href={`/agent/hotels/${hotel.id}?${stayQuery}`} className="text-[0.88rem] font-medium underline underline-offset-4">See rooms</Link></div>
                  </li>
                ))}
                {alternatives.onRequest.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div><p className="font-medium">{h.name}</p><p className="text-[0.8rem] text-muted">{tierLabel(h.tier) ?? 'Partner hotel'} · best rate on request</p></div>
                    <ActionForm action={rateRequestDecisionAction}>
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="alternative" /><input type="hidden" name="hotelId" value={h.id} />
                      <SubmitButton size="sm" variant="secondary" pendingLabel="Asking…">Ask for best rate</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Your request">
            <DL cols={1} items={[
              ['Rooms', <ul key="r">{r.rooms.map((room, i) => <li key={i}>Room {i + 1}: {describeRoom(room)}</li>)}</ul>],
              ['Meals', meal(r.mealPlan) ?? 'Hotel’s best option'],
              ['Notes for the hotel', r.notes],
              ['Client budget (private)', r.budgetMinor != null && r.budgetCurrency ? formatMoney(r.budgetMinor, r.budgetCurrency) : 'Not given'],
              ['Asked', formatDateTime(r.createdAt)],
            ]} />
            <p className="mt-4 text-[0.78rem] text-faint">The hotel never sees your agency name or your client’s budget.</p>
          </Panel>
          {children.length > 0 && (
            <Panel title="Also asked">
              <ul className="space-y-2 text-[0.9rem]">{children.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2"><Link href={`/agent/rate-requests/${c.id}`} className="hover:underline">{c.hotelName}</Link><Pill tone={RATE_STATUS[c.status]?.tone ?? 'neutral'}>{RATE_STATUS[c.status]?.label ?? c.status}</Pill></li>
              ))}</ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
