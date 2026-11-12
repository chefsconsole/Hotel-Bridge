import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/forms';
import { DL, Money, Notice, PageHeader, Panel, Pill } from '@/components/ui';
import { rateRequestDecisionAction } from '@/app/actions/rate-requests';
import { getDb } from '@/lib/db';
import { daysBetween, formatDate, formatDateTime } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { describeRoom, describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { NotFoundError } from '@/lib/services/errors';
import { AGENT_STATE, budgetFit, getRateRequest, tierLabel } from '@/lib/services/rate-requests';

export const metadata = { title: 'Best-rate request' };

/* The agent sees only what matters to them: we're on it, then the offers to choose from.
 * Never which hotels we asked, emails, replies or timings — that's HotelBridge's side. */
export default async function RateRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor } = await requireAgent();
  const { id } = await params;
  const db = await getDb();
  const data = await getRateRequest(db, actor, id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!data) notFound();
  const { request: r, state, offers, alternatives, stillWorking } = data;
  const nights = daysBetween(r.checkIn, r.checkOut);
  const badge = AGENT_STATE[state];
  const stayQuery = new URLSearchParams({ in: r.checkIn, out: r.checkOut, rooms: encodeRooms(r.rooms) }).toString();
  const meal = (k: string | null) => (k ? MEAL_PLANS[k as keyof typeof MEAL_PLANS] ?? k : null);
  const open = state === 'working' || state === 'offers';

  return (
    <div className="animate-[var(--animate-rise)]">
      <Link href="/agent/rate-requests" className="text-[0.85rem] text-muted hover:text-ink">← All best-rate requests</Link>
      <PageHeader eyebrow={r.reference} title={r.hotelName} description={`${r.city} · ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)} · ${nights} night${nights === 1 ? '' : 's'} · ${describeRooms(r.rooms)}`}
        actions={<Pill tone={badge.tone}>{badge.label}</Pill>} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {state === 'working' && (
            <Panel title="We’re on it">
              <div className="flex items-start gap-4">
                <span className="relative mt-1.5 flex size-2.5 shrink-0"><span className="hb-ping absolute inline-flex size-full rounded-full bg-champagne" /><span className="relative inline-flex size-2.5 rounded-full bg-champagne" /></span>
                <div>
                  <p className="text-[0.98rem] font-medium">The HotelBridge team will send you an offer soon.</p>
                  <p className="mt-1 text-[0.88rem] text-muted">We’re getting you our best price for this stay — often with a couple of similar hotels to choose from. You’ll get an email the moment it’s ready, and it will appear right here.</p>
                </div>
              </div>
            </Panel>
          )}

          {offers.length > 0 && (
            <Panel title={state === 'accepted' ? 'Your accepted offer' : offers.length > 1 ? `Your offers · choose one` : 'Your offer'}
              description={state === 'offers' && stillWorking ? 'More options may follow — we’ll email you if they do.' : undefined}>
              <ul className="space-y-4">
                {offers.map((o) => {
                  const fit = budgetFit(o);
                  const accepted = o.status === 'accepted';
                  return (
                    <li key={o.id} className={`rounded-[var(--radius-md)] border p-5 ${accepted ? 'border-positive/40 bg-positive-bg/40' : 'border-line bg-paper/40'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[1.05rem] font-semibold">{o.hotelName}</p>
                          <p className="mt-0.5 text-[0.85rem] text-muted">{o.quoteRoomType} · {meal(o.quoteMealPlan) ?? 'meals as offered'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.72rem] text-faint">Total · all rooms</p>
                          <Money minor={o.sellMinor!} currency={o.quoteCurrency!} className="text-[1.6rem] font-semibold" />
                          <p className="text-[0.78rem] text-muted">about {formatMoney(Math.round(o.sellMinor! / (o.rooms.length * nights)), o.quoteCurrency!)} / room / night</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {fit === 'within' && <Pill tone="positive">Within your client’s budget</Pill>}
                        {fit === 'over' && <Pill tone="attention">Above your client’s budget</Pill>}
                      </div>
                      <div className="mt-4">
                        <DL items={([
                          ['Cancellation', o.quoteCancellation],
                          ['Notes', o.quoteNotes],
                          ['Valid until', o.quoteValidUntil ? formatDate(o.quoteValidUntil) : null],
                          ['Accepted', o.acceptedAt ? formatDateTime(o.acceptedAt) : null],
                        ] as [string, string | null][]).filter(([, v]) => v)} />
                      </div>
                      {o.status === 'quoted' && (
                        <ActionForm action={rateRequestDecisionAction} className="mt-5">
                          <input type="hidden" name="id" value={o.id} /><input type="hidden" name="intent" value="accept" />
                          <SubmitButton size="lg" pendingLabel="Accepting…" confirm={`Accept ${o.hotelName} at ${formatMoney(o.sellMinor!, o.quoteCurrency!)} for this stay?${offers.length > 1 ? ' The other offers will be withdrawn.' : ''}`}>Accept {offers.length > 1 ? 'this offer' : 'this rate'}</SubmitButton>
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
              {state === 'accepted' && <div className="mt-5"><Notice tone="success">Done — our reservations team will contact you for the guest names and payment to confirm the booking.</Notice></div>}
            </Panel>
          )}

          {state === 'no_offer' && (
            <Panel title="No offer this time">
              <p className="text-[0.92rem] text-muted">{r.declineReason ?? 'We couldn’t get a good offer for these dates. Try similar hotels below, or message us and we’ll keep looking.'}</p>
            </Panel>
          )}
          {state === 'expired' && <Panel title="Offer expired"><p className="text-[0.92rem] text-muted">The offer has passed its valid-until date. Ask for one of the hotels below, or message us and we’ll refresh it.</p></Panel>}
          {state === 'cancelled' && <Panel title="Cancelled"><p className="text-[0.92rem] text-muted">You cancelled this request.</p></Panel>}

          {(alternatives.onRequest.length > 0 || alternatives.priced.length > 0) && (
            <Panel title="Want more choice?" description="Same dates and rooms. Your client’s budget stays private.">
              <ul className="divide-y divide-line">
                {alternatives.priced.map(({ hotel, fromMinor, currency }) => (
                  <li key={hotel.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div><p className="font-medium">{hotel.name}</p><p className="text-[0.8rem] text-muted">{tierLabel(hotel.tier) ?? 'Partner hotel'} · instant price</p></div>
                    <div className="flex items-center gap-3"><Money minor={fromMinor} currency={currency} className="font-semibold" /><Link href={`/agent/hotels/${hotel.id}?${stayQuery}`} className="text-[0.88rem] font-medium underline underline-offset-4">See rooms</Link></div>
                  </li>
                ))}
                {alternatives.onRequest.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div><p className="font-medium">{h.name}</p><p className="text-[0.8rem] text-muted">{tierLabel(h.tier) ?? 'Partner hotel'} · best rate on request</p></div>
                    <ActionForm action={rateRequestDecisionAction}>
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="alternative" /><input type="hidden" name="hotelId" value={h.id} />
                      <SubmitButton size="sm" variant="secondary" pendingLabel="Adding…">Get an offer too</SubmitButton>
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
              ['Meals', meal(r.mealPlan) ?? 'Best option'],
              ['Your notes', r.notes],
              ['Client budget (private)', r.budgetMinor != null && r.budgetCurrency ? formatMoney(r.budgetMinor, r.budgetCurrency) : 'Not given'],
              ['Sent', formatDateTime(r.createdAt)],
            ]} />
            <p className="mt-4 text-[0.78rem] text-faint">Your agency name and your client’s budget stay private to you and HotelBridge.</p>
            {open && (
              <ActionForm action={rateRequestDecisionAction} className="mt-5">
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="cancel" />
                <SubmitButton variant="secondary" size="sm" pendingLabel="Cancelling…" confirm="Cancel this request? Any offers will be withdrawn.">Cancel request</SubmitButton>
              </ActionForm>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
