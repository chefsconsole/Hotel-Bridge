/* The page a hotel opens from a best-rate request email. No login: the link
 * is the key. It shows the stay — never the agency, never the client's
 * budget — and takes the hotel's best rate or "not available". */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Logo } from '@/components/ui';
import { hotelQuoteAction } from '@/app/actions/rate-requests';
import { getDb } from '@/lib/db';
import { addDays, daysBetween, formatDate, formatDateTime, hoursUntil, todayIso } from '@/lib/domain/dates';
import { CURRENCIES } from '@/lib/domain/money';
import { describeRoom } from '@/lib/domain/occupancy';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { rateRequestByToken } from '@/lib/services/rate-requests';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: 'Best rate request · HotelBridge' }, robots: { index: false, follow: false } };

export default async function HotelRatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await rateRequestByToken(await getDb(), token);
  if (!found) notFound();
  const { request: r, open } = found;
  const nights = daysBetween(r.checkIn, r.checkOut);
  const left = hoursUntil(r.respondByAt);
  const answered = ['quoted', 'declined', 'accepted'].includes(r.status);
  const minValid = addDays(todayIso(), 1);
  const meal = r.mealPlan ? MEAL_PLANS[r.mealPlan as keyof typeof MEAL_PLANS] : null;

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between"><Logo /><span className="text-[0.8rem] text-muted">Best rate request · {r.reference}</span></header>

        <section className="mt-8 rounded-[var(--radius-lg)] bg-ink p-6 text-paper sm:p-8">
          <p className="text-[0.7rem] font-medium tracking-[0.2em] text-champagne uppercase">For {r.hotelName}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[1.9rem] leading-tight font-light tracking-[-0.02em]">{r.rooms.length} room{r.rooms.length === 1 ? '' : 's'} · {nights} night{nights === 1 ? '' : 's'}</h1>
          <dl className="mt-6 grid gap-4 text-[0.9rem] sm:grid-cols-3">
            <div><dt className="text-[0.66rem] tracking-[0.16em] text-paper/50 uppercase">Arrival</dt><dd className="num mt-1">{formatDate(r.checkIn, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
            <div><dt className="text-[0.66rem] tracking-[0.16em] text-paper/50 uppercase">Departure</dt><dd className="num mt-1">{formatDate(r.checkOut, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
            <div><dt className="text-[0.66rem] tracking-[0.16em] text-paper/50 uppercase">Meals</dt><dd className="mt-1">{meal ?? 'Your best option'}</dd></div>
          </dl>
          <ul className="mt-5 space-y-1 text-[0.88rem] text-paper/80">{r.rooms.map((room, i) => <li key={i}>Room {i + 1}: {describeRoom(room)}</li>)}</ul>
          {r.notes && <p className="mt-3 text-[0.85rem] text-paper/70">Notes: {r.notes}</p>}
        </section>

        {answered ? (
          <p className="mt-8 rounded-[var(--radius-md)] bg-positive-bg px-5 py-4 text-positive">Thank you — your answer reached HotelBridge{r.answeredAt ? ` on ${formatDateTime(r.answeredAt)}` : ''}.</p>
        ) : !open ? (
          <p className="mt-8 rounded-[var(--radius-md)] bg-pending-bg px-5 py-4 text-pending">This request is closed — answers were due by {formatDateTime(r.respondByAt)}. If you can still help, reply to the email.</p>
        ) : (
          <>
            <p className={`mt-6 inline-flex rounded-full px-3 py-1 text-[0.82rem] font-medium ${left < 6 ? 'bg-attention-bg text-attention' : 'bg-pending-bg text-pending'}`}>Please answer by {formatDateTime(r.respondByAt)} ({left < 1 ? 'under 1 hour' : `${left}h`} left)</p>
            <ActionForm action={hotelQuoteAction} className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
              <input type="hidden" name="token" value={token} />
              <h2 className="text-[1.1rem] font-medium">Your best rate</h2>
              <p className="mt-1 text-[0.85rem] text-muted">Your best rate per room per night for these dates. The best rate wins the booking; payment and guest arrangements stay directly between your hotel and the travel agency.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field label="Room type" className="sm:col-span-2"><input name="roomType" className="field" placeholder="e.g. Deluxe Sea View" /></Field>
                <Field label="Currency"><select name="currency" defaultValue="THB" className="field">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Rate / room / night"><input name="rate" inputMode="decimal" placeholder="e.g. 3200" className="field num" /></Field>
                <Field label="Meals included"><select name="mealPlan" defaultValue={r.mealPlan ?? 'BB'} className="field">{Object.entries(MEAL_PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                <Field label="Rate valid until" hint={`At least ${formatDate(minValid)}`}><input name="validUntil" type="date" min={minValid} defaultValue={addDays(todayIso(), 3)} className="field num" /></Field>
                <Field label="Cancellation terms" className="sm:col-span-3"><textarea name="cancellation" rows={2} className="field" placeholder="e.g. Free until 7 days before arrival, then first night" /></Field>
                <Field label="Anything else" hint="Taxes, upgrades, inclusions" className="sm:col-span-3"><input name="notes" className="field" placeholder="Includes service charge and VAT" /></Field>
              </div>
              <SubmitButton size="lg" className="mt-6" pendingLabel="Sending…">Send best rate</SubmitButton>
            </ActionForm>
            <ActionForm action={hotelQuoteAction} className="mt-4 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:flex-row sm:items-end">
              <input type="hidden" name="token" value={token} /><input type="hidden" name="intent" value="decline" />
              <Field label="Not available?" className="flex-1"><input name="reason" className="field" placeholder="Optional: fully booked, minimum stay…" /></Field>
              <SubmitButton variant="secondary" pendingLabel="Sending…" confirm="Tell HotelBridge you are not available?">Not available</SubmitButton>
            </ActionForm>
          </>
        )}
        <p className="mt-10 text-[0.75rem] text-faint">HotelBridge · This private link was sent to {r.hotelName}. Questions? Reply to the request email.</p>
      </div>
    </div>
  );
}
