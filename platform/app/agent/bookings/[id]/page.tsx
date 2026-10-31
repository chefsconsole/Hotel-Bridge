import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { HotelDeadline, PaymentPill, StatusPill, Timeline } from '@/components/booking-bits';
import { DL, LinkButton, Money, Notice, Panel, SampleTag } from '@/components/ui';
import { CancellationBox } from '@/components/cancellation';
import { amendBookingAction, cancelBookingAction, payFromWalletAction } from '@/app/actions/agent';
import { getDb, schema } from '@/lib/db';
import { STATUS_EXPLAINER } from '@/lib/domain/booking-state';
import { describePolicy, type CancelPolicy } from '@/lib/domain/cancellation';
import { daysBetween, formatDate, formatDateTime } from '@/lib/domain/dates';
import { describeRoom } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { bookingTimeline, getBookingForActor, penaltyFor } from '@/lib/services/bookings';
import { balances, walletBalance } from '@/lib/services/ledger';
import { getSetting } from '@/lib/services/settings';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { NotFoundError } from '@/lib/services/errors';
import { SUPPORT_EMAIL } from '@/lib/config';

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { actor } = await requireAgent();
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const db = await getDb();
  const b = await getBookingForActor(db, actor, id).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  const [hotel] = await db.select().from(schema.hotels).where(eq(schema.hotels.id, b.hotelId));
  const [events, bal, invoices, instructions, wallet] = await Promise.all([
    bookingTimeline(db, b.id), balances(db, b.id),
    db.select().from(schema.invoices).where(eq(schema.invoices.bookingId, b.id)).orderBy(desc(schema.invoices.issuedAt)),
    getSetting(db, 'payment.instructions'),
    walletBalance(db, b.agencyId, b.currency),
  ]);
  const nights = daysBetween(b.checkIn, b.checkOut);
  const policy = b.cancelPolicy as CancelPolicy;
  const pen = penaltyFor(b);
  const cancellable = ['confirmed', 'awaiting_payment', 'pending_confirmation', 'amendment_requested'].includes(b.status);

  return (
    <>
      <Link href="/agent/bookings" className="text-[0.85rem] text-muted hover:text-ink">← All bookings</Link>
      <header className="mt-4 mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Booking</p>
          <h1 className="num mt-1 text-[2rem] font-semibold">{b.reference}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2"><StatusPill status={b.status} /><PaymentPill status={b.paymentStatus} />{b.isSample && <SampleTag />}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {b.status === 'confirmed' || b.status === 'amendment_requested' || b.status === 'cancellation_requested'
            ? <LinkButton href={`/agent/bookings/${b.id}/voucher`} variant="secondary">Voucher</LinkButton>
            : null}
          {invoices.map((inv) => <LinkButton key={inv.id} href={`/agent/invoices/${inv.id}`} variant="secondary">{inv.kind === 'invoice' ? 'Invoice' : 'Credit note'}</LinkButton>)}
        </div>
      </header>

      {isNew && (
        <div className="mb-6 animate-[var(--animate-rise)]">
          <Notice tone={b.status === 'confirmed' ? 'success' : b.status === 'failed' ? 'error' : 'info'} title={
            b.status === 'confirmed' ? 'Booked and confirmed.' : b.status === 'awaiting_payment' ? 'Rooms held — awaiting payment.' : b.status === 'pending_confirmation' ? 'Request sent to the hotel.' : b.status === 'failed' ? 'This booking could not be made.' : 'Booking received.'
          }>{STATUS_EXPLAINER[b.status]}</Notice>
        </div>
      )}
      {!isNew && <p className="mb-3 max-w-3xl text-[0.92rem] text-muted">{STATUS_EXPLAINER[b.status]}</p>}
      {b.status === 'pending_confirmation' && <div className="mb-6"><HotelDeadline status={b.status} respondBy={b.hotelRespondBy} /></div>}

      {['confirmed', 'awaiting_payment', 'pending_confirmation', 'amendment_requested'].includes(b.status) && <CancellationBox policy={b.cancelPolicy as CancelPolicy} checkIn={b.checkIn} className="mb-6" />}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          <Panel title={hotel.name} description={`${hotel.address ?? ''}${hotel.address ? ' · ' : ''}${hotel.city}, ${hotel.country}`}>
            <DL items={[
              ['Check-in', `${formatDate(b.checkIn, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${hotel.checkInTime ? ` from ${hotel.checkInTime}` : ''}`],
              ['Check-out', `${formatDate(b.checkOut, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${hotel.checkOutTime ? ` by ${hotel.checkOutTime}` : ''}`],
              ['Nights', String(nights)],
              ['Lead guest', b.leadGuest],
              ['Your reference', b.agentReference],
              ['Hotel confirmation', b.hotelConfirmation ?? (b.status === 'confirmed' ? 'Issued by HotelBridge' : null)],
            ]} />
            <ul className="mt-6 divide-y divide-line border-t border-line">
              {b.rooms.map((r, i) => (
                <li key={i} className="py-3 text-[0.9rem]">
                  <p className="font-medium">Room {i + 1} · {r.roomName} · {MEAL_PLANS[r.mealPlan as keyof typeof MEAL_PLANS] ?? r.mealPlan}</p>
                  <p className="text-muted">{describeRoom(r)}{r.guestNames.length ? ` — ${r.guestNames.join(', ')}` : ''}</p>
                </li>
              ))}
            </ul>
            {b.specialRequests && <p className="mt-3 text-[0.85rem] text-muted"><span className="font-medium text-ink">Requests:</span> {b.specialRequests}</p>}
          </Panel>

          {cancellable && (
            <Panel title="Change or cancel" description={describePolicy(policy, b.checkIn)}>
              <div className="grid gap-6 md:grid-cols-2">
                <ActionForm action={cancelBookingAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <p className="text-[0.88rem]">
                    {b.status === 'pending_confirmation'
                      ? 'Withdraw this request. No charge applies.'
                      : pen.free
                        ? <>Cancelling now is <span className="font-semibold text-positive">free</span>{bal.agentPaid > 0 && <> — <Money minor={bal.agentPaid} currency={b.currency} className="font-semibold" /> goes straight back to your wallet</>}.</>
                        : <>Cancelling now costs <Money minor={pen.sellPenaltyMinor} currency={b.currency} className="font-semibold" /> ({pen.reason.toLowerCase()}){bal.agentPaid > pen.sellPenaltyMinor && <>; <Money minor={bal.agentPaid - pen.sellPenaltyMinor} currency={b.currency} className="font-semibold" /> goes back to your wallet</>}.</>}
                  </p>
                  <Field label="Reason (optional)" className="mt-3"><input name="reason" className="field" maxLength={200} /></Field>
                  <SubmitButton variant="danger" size="sm" className="mt-3" confirm={`Cancel ${b.reference}?`} pendingLabel="Cancelling…">
                    {b.status === 'pending_confirmation' ? 'Withdraw request' : 'Cancel booking'}
                  </SubmitButton>
                </ActionForm>
                {b.status === 'confirmed' && (
                  <ActionForm action={amendBookingAction}>
                    <input type="hidden" name="bookingId" value={b.id} />
                    <Field label="Request an amendment" hint="Name changes, dates, room changes. Subject to the hotel's agreement and any price difference.">
                      <textarea name="details" rows={3} className="field" />
                    </Field>
                    <SubmitButton variant="secondary" size="sm" className="mt-3" pendingLabel="Sending…">Request amendment</SubmitButton>
                  </ActionForm>
                )}
              </div>
            </Panel>
          )}

          <Panel title="History">
            <Timeline events={events} />
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Price">
            <div className="flex items-baseline justify-between"><span className="text-muted">Total for the stay</span><Money minor={b.sellMinor} currency={b.currency} className="text-[1.3rem] font-semibold" /></div>
            {b.taxMinor > 0 && <div className="mt-1 flex justify-between text-[0.85rem] text-muted"><span>of which taxes</span><Money minor={b.taxMinor} currency={b.currency} /></div>}
            {b.localTaxMinor > 0 && <div className="mt-1 flex justify-between text-[0.85rem] text-muted"><span>City tax, paid at hotel</span><Money minor={b.localTaxMinor} currency={b.currency} /></div>}
          </Panel>
          <Panel title="Payment">
            {b.paymentArrangement === 'direct' ? (
              <p className="text-[0.88rem] text-muted">The guest pays the hotel directly. HotelBridge does not invoice you for this stay.</p>
            ) : (
              <div className="space-y-2 text-[0.88rem]">
                <div className="flex justify-between"><span className="text-muted">Arrangement</span><span>{b.paymentArrangement === 'credit' ? 'On account' : 'Prepayment'}</span></div>
                <div className="flex justify-between"><span className="text-muted">Paid</span><Money minor={bal.agentPaid} currency={b.currency} /></div>
                <div className="flex justify-between font-medium"><span>{bal.agentBalance < 0 ? 'We owe you' : 'Outstanding'}</span><Money minor={Math.abs(bal.agentBalance)} currency={b.currency} /></div>
                {b.paymentDueAt && bal.agentBalance > 0 && <p className="text-attention">Due by {formatDateTime(b.paymentDueAt)}</p>}
                {bal.agentBalance > 0 && b.status === 'awaiting_payment' && wallet > 0 && (
                  <ActionForm action={payFromWalletAction} className="mt-3 rounded-[var(--radius-sm)] border border-champagne/40 bg-champagne-soft p-3">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <p className="text-[0.84rem]">Wallet credit available: <Money minor={wallet} currency={b.currency} className="font-semibold" /></p>
                    <SubmitButton size="sm" className="mt-2 w-full" pendingLabel="Paying…">
                      Pay {wallet >= bal.agentBalance ? 'in full' : <>&nbsp;<Money minor={wallet} currency={b.currency} />&nbsp;</>} from wallet
                    </SubmitButton>
                  </ActionForm>
                )}
                {bal.agentBalance > 0 && (
                  <div className="mt-3 rounded-[var(--radius-sm)] bg-mist p-3 text-[0.82rem] text-muted whitespace-pre-line">
                    {instructions || `Payment instructions will be sent with your invoice. Questions: ${SUPPORT_EMAIL}`}
                    {'\n'}Quote reference {b.reference} with your payment.
                  </div>
                )}
              </div>
            )}
          </Panel>
          <Panel title="Need help?">
            <p className="text-[0.88rem] text-muted">Urgent issue with this stay? <Link href={`/agent/support?ref=${b.reference}`} className="font-medium text-ink underline underline-offset-4">Contact support</Link> and mark it urgent.</p>
          </Panel>
        </aside>
      </div>
    </>
  );
}

export const metadata = { title: 'Booking' };
