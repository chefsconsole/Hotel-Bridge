import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { DL, Money, Notice, PageHeader, Panel, Pill } from '@/components/ui';
import { deskAction } from '@/app/actions/rate-requests';
import { getDb } from '@/lib/db';
import { daysBetween, formatDate, formatDateTime } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { describeRoom, describeRooms } from '@/lib/domain/occupancy';
import { requireStaff } from '@/lib/session';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { appUrl } from '@/lib/services/email';
import { NotFoundError } from '@/lib/services/errors';
import { AGENT_STATE, RATE_STATUS, budgetFit, deskRequest, quotesInHouse, tierLabel } from '@/lib/services/rate-requests';

export const metadata = { title: 'Best-rate request' };

/* The HotelBridge desk for one best-rate enquiry:
 *  1. who handles it  2. tick suitable hotels → email them all in one click
 *  3. check each hotel's reply, set the markup, send the good ones to the agent. */
export default async function DeskRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor } = await requireStaff();
  const { id } = await params;
  const data = await deskRequest(await getDb(), actor, id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!data) notFound();
  const { root: r, rows, agency, agent, state, candidates, staff, markupPct } = data;
  const nights = daysBetween(r.checkIn, r.checkOut);
  const meal = (k: string | null) => (k ? MEAL_PLANS[k as keyof typeof MEAL_PLANS] ?? k : null);
  const closed = state === 'accepted' || state === 'booked' || state === 'cancelled';
  const acceptedRow = rows.find((x) => x.status === 'accepted');
  const toReview = rows.filter((x) => x.status === 'hotel_quoted');
  const others = rows.filter((x) => x.status !== 'hotel_quoted' && x.status !== 'review');
  const askable = candidates.filter((c) => c.askable && c.email);
  const badge = AGENT_STATE[state];

  return (
    <div className="animate-[var(--animate-rise)]">
      <Link href="/admin/rate-requests" className="text-[0.85rem] text-muted hover:text-ink">← All best-rate requests</Link>
      <PageHeader eyebrow={`${r.reference} · ${agency?.name ?? ''}${agency?.isSample ? ' · demo' : ''}`} title={`${r.hotelName}, ${r.city}`}
        description={`${formatDate(r.checkIn)} – ${formatDate(r.checkOut)} · ${nights} night${nights === 1 ? '' : 's'} · ${describeRooms(r.rooms)} · asked ${formatDateTime(r.createdAt)}`}
        actions={<div className="flex flex-col items-end gap-1"><Pill tone={badge.tone}>Agent sees: {badge.label}</Pill></div>} />

      {agency?.isSample && <div className="mb-6"><Notice title="Demo agency">Emails to hotels for this request are recorded but never sent. Use each hotel’s reply link below to play the hotel.</Notice></div>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {acceptedRow && (
            <Panel title={`Agent accepted ${acceptedRow.hotelName} — confirm with the hotel`} description={`Agent pays ${formatMoney(acceptedRow.sellMinor!, acceptedRow.quoteCurrency!)} · hotel net ${formatMoney(acceptedRow.quoteNetMinor!, acceptedRow.quoteCurrency!)}. The hotel was asked to hold the rooms. Confirm with them, then mark it booked — the agent gets an email.`}>
              <ActionForm action={deskAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={acceptedRow.id} /><input type="hidden" name="rootId" value={r.id} /><input type="hidden" name="intent" value="booked" />
                <Field label="Hotel confirmation number (optional)" className="min-w-0 flex-1"><input name="confirmation" className="field" maxLength={80} placeholder="e.g. 48213977" /></Field>
                <SubmitButton pendingLabel="Saving…" confirm="Mark this as booked and tell the agent?">Mark as booked</SubmitButton>
              </ActionForm>
            </Panel>
          )}

          {toReview.length > 0 && (
            <Panel title={`Hotel replies to check · ${toReview.length}`} description="The agent sees nothing until you send it. Adjust the markup if needed — the agent price updates when you send.">
              <ul className="space-y-4">
                {toReview.map((o) => {
                  const fit = budgetFit(o);
                  return (
                    <li key={o.id} className="rounded-[var(--radius-md)] border border-line bg-paper/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{o.hotelName}</p>
                          <p className="text-[0.85rem] text-muted">{o.quoteRoomType} · {meal(o.quoteMealPlan) ?? 'meals as quoted'} · {formatMoney(o.quoteRateMinor!, o.quoteCurrency!)} / room / night net · valid until {o.quoteValidUntil ? formatDate(o.quoteValidUntil) : '—'}</p>
                          <p className="mt-1 text-[0.82rem] text-muted">Cancellation: {o.quoteCancellation}{o.quoteNotes ? ` · ${o.quoteNotes}` : ''}</p>
                        </div>
                        <div className="text-right text-[0.85rem]">
                          <p className="text-faint">Net for the stay</p>
                          <Money minor={o.quoteNetMinor!} currency={o.quoteCurrency!} className="font-semibold" />
                          <p className="mt-1 text-faint">Agent pays at {(o.markupBps ?? 0) / 100}%: <span className="font-medium text-ink">{formatMoney(o.sellMinor!, o.quoteCurrency!)}</span></p>
                          {fit === 'over' && <p className="text-attention">Above the client’s budget</p>}
                          {fit === 'within' && <p className="text-positive">Within the client’s budget</p>}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-end gap-3">
                        <ActionForm action={deskAction} className="flex flex-wrap items-end gap-3">
                          <input type="hidden" name="id" value={o.id} /><input type="hidden" name="rootId" value={r.id} /><input type="hidden" name="intent" value="release" />
                          <Field label="Markup %" className="w-28"><input name="markupPct" defaultValue={String((o.markupBps ?? markupPct * 100) / 100)} inputMode="decimal" className="field num" /></Field>
                          <SubmitButton pendingLabel="Sending…" confirm={`Send ${o.hotelName} to the agent?`}>Send to agent</SubmitButton>
                        </ActionForm>
                        <ActionForm action={deskAction}>
                          <input type="hidden" name="id" value={o.id} /><input type="hidden" name="rootId" value={r.id} /><input type="hidden" name="intent" value="holdback" />
                          <SubmitButton variant="ghost" size="sm" pendingLabel="…" confirm="Set this reply aside? The agent won’t see it.">Don’t send</SubmitButton>
                        </ActionForm>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {!closed && (
            <Panel title="Ask hotels" description={`Tick the suitable hotels — the one requested and, for choice, 2–3 similar ones in ${r.city}. One click emails each its private link. Budget and agency are never shared.`}>
              {askable.length === 0 ? <p className="text-[0.9rem] text-muted">Every suitable hotel with an email in {r.city} has been asked.</p> : (
                <ActionForm action={deskAction}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="ask" />
                  <ul className="divide-y divide-line">
                    {askable.map((c) => (
                      <li key={c.hotel.id}>
                        <label className="flex cursor-pointer items-center gap-3 py-2.5">
                          <input type="checkbox" name="hotelIds" value={c.hotel.id} defaultChecked={c.requested} className="size-4 accent-[var(--color-ink)]" />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{c.hotel.name}</span>
                            {c.requested && <span className="ml-2 rounded-full bg-champagne-soft px-2 py-0.5 text-[0.7rem] font-medium text-ink">Agent asked for this</span>}
                            <span className="block truncate text-[0.78rem] text-muted">{tierLabel(c.hotel.tier) ?? 'Partner hotel'} · {c.inHouse ? <span className="font-medium text-ink">Our contract — we quote it ourselves (no email)</span> : c.email}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4"><SubmitButton pendingLabel="Emailing…">Email selected hotels</SubmitButton></div>
                </ActionForm>
              )}
            </Panel>
          )}

          <Panel title="Hotels on this request" padded={false}>
            {rows.length === 0 ? null : (
              <div className="overflow-x-auto"><table className="table">
                <thead><tr><th>Hotel</th><th>Status</th><th>Reply</th><th /></tr></thead>
                <tbody>{rows.map((x) => (
                  <tr key={x.id}>
                    <td className="font-medium">{x.hotelName}<p className="text-[0.72rem] font-normal text-faint">{x.reference}{x.hotelEmail ? ` · ${x.hotelEmail}` : ''}</p></td>
                    <td><Pill tone={RATE_STATUS[x.status]?.tone ?? 'neutral'}>{x.status === 'review' && quotesInHouse(x.hotelEmail) ? 'Our contract — enter rate' : x.status === 'not_emailed' && agency?.isSample ? 'Demo — recorded, not sent' : RATE_STATUS[x.status]?.label ?? x.status}</Pill>{x.status === 'sent' && <p className="mt-1 text-[0.72rem] text-faint">reply by {formatDateTime(x.respondByAt)}</p>}</td>
                    <td className="text-[0.85rem]">{x.quoteNetMinor != null && x.quoteCurrency ? <>net {formatMoney(x.quoteNetMinor, x.quoteCurrency)}{x.sellMinor != null && ['quoted', 'accepted', 'booked'].includes(x.status) ? <> → agent {formatMoney(x.sellMinor, x.quoteCurrency)}</> : null}</> : x.declineReason ?? '—'}</td>
                    <td>{['review', 'sent', 'not_emailed'].includes(x.status) && <a href={appUrl(`/r/${x.token}`)} target="_blank" rel="noreferrer" className="text-[0.78rem] font-medium underline" title={quotesInHouse(x.hotelEmail) ? 'We hold the contract: enter the rate from it' : 'Open to enter a reply the hotel gave by phone or email'}>{quotesInHouse(x.hotelEmail) ? 'Enter our rate' : 'Hotel reply link'}</a>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
            {others.length === 0 && rows.every((x) => x.status === 'review') && <p className="px-6 pb-5 text-[0.85rem] text-muted">No hotel asked yet — tick hotels above and email them.</p>}
          </Panel>

          {!closed && state !== 'offers' && (
            <Panel title="No suitable offer?">
              <ActionForm action={deskAction}>
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="close" />
                <Field label="Note to the agent" required><textarea name="message" required rows={2} className="field" defaultValue={`We’re sorry — ${r.city} is very full for these dates and we couldn’t get a good offer. Shall we look at nearby dates or another area?`} /></Field>
                <div className="mt-3"><SubmitButton variant="secondary" size="sm" confirm="Close this request and send the note to the agent?">Close and tell the agent</SubmitButton></div>
              </ActionForm>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Handled by">
            <ActionForm action={deskAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="intent" value="assign" />
              <Field label="Team member" className="min-w-0 flex-1">
                <select name="userId" defaultValue={r.assignedTo ?? ''} className="field">
                  <option value="">Not assigned — team inbox only</option>
                  {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <SubmitButton variant="secondary" size="sm">Assign</SubmitButton>
            </ActionForm>
            <p className="mt-2 text-[0.78rem] text-faint">They get the enquiry by email, and every hotel reply after it.</p>
          </Panel>
          <Panel title="The request">
            <DL cols={1} items={[
              ['Agent', agent ? <span key="a">{agent.name}<br /><a className="text-muted underline" href={`mailto:${agent.email}`}>{agent.email}</a></span> : null],
              ['Agency', agency ? <Link key="ag" href={`/admin/agencies/${agency.id}`} className="underline">{agency.name}</Link> : null],
              ['Rooms', <ul key="r">{r.rooms.map((room, i) => <li key={i}>Room {i + 1}: {describeRoom(room)}</li>)}</ul>],
              ['Meals', meal(r.mealPlan) ?? 'Best option'],
              ['Agent notes', r.notes],
              ['Client budget (private)', r.budgetMinor != null && r.budgetCurrency ? formatMoney(r.budgetMinor, r.budgetCurrency) : 'Not given'],
            ]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
