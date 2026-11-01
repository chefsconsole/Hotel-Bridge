/* The page a hotel opens from a group request email. No login: the link is
 * the key. It shows the group (never which agency) and takes the hotel's
 * offer or decline, inside the 48-hour window. */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Logo } from '@/components/ui';
import { hotelReplyAction } from '@/app/actions/hotel-reply';
import { getDb } from '@/lib/db';
import { addDays, daysBetween, formatDate, formatDateTime, hoursUntil, todayIso } from '@/lib/domain/dates';
import { CURRENCIES } from '@/lib/domain/money';
import { TIER_INFO, isTier } from '@/lib/domain/tiers';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { requestByToken } from '@/lib/services/group-desk';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: 'Group request · HotelBridge' }, robots: { index: false, follow: false } };


export default async function HotelReplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await requestByToken(await getDb(), token);
  if (!found) notFound();
  const { request: r, enquiry: e, open } = found;
  const leg = e.legs.find((l) => l.city.trim().toLowerCase() === r.city.trim().toLowerCase()) ?? e.legs[0];
  const nights = daysBetween(leg.checkIn, leg.checkOut);
  const rooms = ([['Single', e.rooms.single], ['Double', e.rooms.double], ['Twin', e.rooms.twin], ['Triple', e.rooms.triple]] as const).filter(([, n]) => n > 0);
  const tiers = e.tiers.filter(isTier).map((t) => TIER_INFO[t].label);
  const left = r.respondByAt ? hoursUntil(r.respondByAt) : null;
  const guessCurrency = e.currency;
  const minValid = addDays(todayIso(), 2);
  const answered = r.status === 'responded' || r.status === 'declined';

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between"><Logo /><span className="text-[0.8rem] text-muted">Group request · {e.reference}</span></header>

        <section className="mt-8 rounded-[var(--radius-lg)] bg-ink p-6 text-paper sm:p-8">
          <p className="text-[0.7rem] font-medium tracking-[0.2em] text-champagne uppercase">For {r.hotelName}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[1.9rem] leading-tight font-light tracking-[-0.02em]">{e.totalPax} guests · {r.city} · {nights} night{nights === 1 ? '' : 's'}</h1>
          <dl className="mt-6 grid gap-4 text-[0.9rem] sm:grid-cols-4">
            <div><dt className="text-[0.66rem] tracking-[0.16em] text-paper/50 uppercase">Arrival</dt><dd className="num mt-1">{formatDate(leg.checkIn, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
            <div><dt className="text-[0.66rem] tracking-[0.16em] text-paper/50 uppercase">Departure</dt><dd className="num mt-1">{formatDate(leg.checkOut, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
            <div><dt className="text-[0.66rem] tracking-[0.16em] text-paper/50 uppercase">Rooms</dt><dd className="num mt-1">{rooms.map(([k, n]) => `${n} ${k.toLowerCase()}`).join(', ')}</dd></div>
            <div><dt className="text-[0.66rem] tracking-[0.16em] text-paper/50 uppercase">Meals</dt><dd className="mt-1">{e.mealPlan ? MEAL_PLANS[e.mealPlan as keyof typeof MEAL_PLANS] : 'Room only and breakfast, please'}</dd></div>
          </dl>
          <p className="mt-5 text-[0.85rem] text-paper/70">
            {e.groupType[0].toUpperCase() + e.groupType.slice(1)} group{tiers.length ? ` · looking for ${tiers.join(' / ')}` : ''}{e.coachParking ? ' · coach parking needed' : ''}
            {e.accessibility ? ` · accessibility: ${e.accessibility}` : ''}{e.specialRequests ? ` · ${e.specialRequests}` : ''}
          </p>
        </section>

        {answered ? (
          <p className="mt-8 rounded-[var(--radius-md)] bg-positive-bg px-5 py-4 text-positive">Thank you — your answer reached HotelBridge {r.answeredAt ? `on ${formatDateTime(r.answeredAt)}` : ''}. We will be in touch.</p>
        ) : !open ? (
          <p className="mt-8 rounded-[var(--radius-md)] bg-pending-bg px-5 py-4 text-pending">This request is closed{r.respondByAt ? ` — answers were due by ${formatDateTime(r.respondByAt)}` : ''}. If you can still help, reply to the email and the Group Desk will get back to you.</p>
        ) : (
          <>
            {left != null && <p className={`mt-6 inline-flex rounded-full px-3 py-1 text-[0.82rem] font-medium ${left < 12 ? 'bg-attention-bg text-attention' : 'bg-pending-bg text-pending'}`}>Please answer by {formatDateTime(r.respondByAt!)} ({left < 1 ? 'under 1 hour' : `${left}h`} left)</p>}

            <ActionForm action={hotelReplyAction} className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
              <input type="hidden" name="token" value={token} />
              <h2 className="text-[1.1rem] font-medium">Your group offer</h2>
              <p className="mt-1 text-[0.85rem] text-muted">Net rate per room per night. Add or change room types if you&apos;d rather offer different ones.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field label="Currency"><select name="currency" defaultValue={guessCurrency} className="field">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Meal plan included"><select name="mealPlan" defaultValue={e.mealPlan ?? 'BB'} className="field">{Object.entries(MEAL_PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                <Field label="Offer valid until" hint={`At least ${formatDate(minValid)}`}><input name="validUntil" type="date" min={minValid} defaultValue={addDays(todayIso(), 7)} className="field num" /></Field>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[520px] text-[0.88rem]">
                  <thead><tr className="text-left text-[0.7rem] tracking-[0.1em] text-faint uppercase"><th className="pb-2 font-medium">Room type</th><th className="pb-2 font-medium">Rooms</th><th className="pb-2 font-medium">Nights</th><th className="pb-2 font-medium">Rate / room / night</th></tr></thead>
                  <tbody>
                    {[...rooms.map(([k, n]) => ({ type: k, n })), { type: '', n: 0 }, { type: '', n: 0 }].slice(0, 6).map((row, i) => (
                      <tr key={i}>
                        <td className="py-1 pr-2"><input name={`l${i}_type`} defaultValue={row.type} placeholder={row.type ? '' : 'Another room type'} className="field py-2" /></td>
                        <td className="w-24 py-1 pr-2"><input name={`l${i}_rooms`} defaultValue={row.n || ''} inputMode="numeric" className="field num py-2" /></td>
                        <td className="w-24 py-1 pr-2"><input name={`l${i}_nights`} defaultValue={row.type ? nights : ''} inputMode="numeric" className="field num py-2" /></td>
                        <td className="w-44 py-1"><input name={`l${i}_rate`} inputMode="decimal" placeholder="e.g. 4500" className="field num py-2" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Taxes" hint="Included or extra, and the rate"><input name="taxesNote" className="field" placeholder="Including service charge and VAT" /></Field>
                <Field label="City tax per person per night" hint="If payable at the hotel"><input name="cityTax" inputMode="decimal" className="field num" /></Field>
                <Field label="Cancellation and attrition terms" className="sm:col-span-2"><textarea name="cancellationTerms" rows={3} className="field" placeholder="e.g. Free until 30 days before arrival; 10% attrition allowed until 21 days" /></Field>
                <Field label="Deposit and payment schedule" className="sm:col-span-2"><textarea name="paymentTerms" rows={2} className="field" /></Field>
              </div>
              <SubmitButton size="lg" className="mt-6" pendingLabel="Sending…">Send offer to HotelBridge</SubmitButton>
            </ActionForm>

            <ActionForm action={hotelReplyAction} className="mt-4 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:flex-row sm:items-end">
              <input type="hidden" name="token" value={token} /><input type="hidden" name="intent" value="decline" />
              <Field label="Can't take this group?" className="flex-1"><input name="reason" className="field" placeholder="Optional: fully booked, minimum stay…" /></Field>
              <SubmitButton variant="secondary" pendingLabel="Sending…" confirm="Tell HotelBridge you can't take this group?">Not available</SubmitButton>
            </ActionForm>
          </>
        )}
        <p className="mt-10 text-[0.75rem] text-faint">HotelBridge Group Desk · This private link was sent to {r.hotelName}. Questions? Reply to the request email.</p>
      </div>
    </div>
  );
}
