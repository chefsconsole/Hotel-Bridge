import { HotelDeadline, StatusPill } from '@/components/booking-bits';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, Money, PageHeader, Panel } from '@/components/ui';
import { partnerRespondAction } from '@/app/actions/partner';
import { getDb } from '@/lib/db';
import { addDays, formatDate, formatDateTime, todayIso } from '@/lib/domain/dates';
import { describeRoom } from '@/lib/domain/occupancy';
import { requirePartner } from '@/lib/session';
import { listForPartner } from '@/lib/services/bookings';
import { arrivals, hotelAccounts, hotelVolume, partnerHotel } from '@/lib/services/tracker';

export const metadata = { title: 'Reservations' };

export default async function PartnerHome() {
  const { actor } = await requirePartner();
  const db = await getDb();
  const rows = await listForPartner(db, actor);
  const hotelId = partnerHotel(actor);
  const today = todayIso();
  const [coming, accounts, volume] = await Promise.all([
    arrivals(db, { from: today, to: addDays(today, 7), hotelId }),
    hotelAccounts(db, hotelId),
    hotelVolume(db, { from: addDays(today, -30), to: addDays(today, 365), hotelId }),
  ]);
  const on = (d: string) => coming.filter((a) => a.date === d);
  const pending = rows.filter((r) => r.status === 'pending_confirmation');
  const rest = rows.filter((r) => r.status !== 'pending_confirmation');
  return (
    <>
      <PageHeader eyebrow="HotelBridge partner" title="Reservations" description="Requests waiting for your answer, and every reservation made through HotelBridge. Rates are the fixed rates in our contract; amounts shown are what HotelBridge owes your hotel. Please confirm or decline each request within the time shown — unanswered requests lapse automatically." />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {([['Arriving today', on(today)], ['Arriving tomorrow', on(addDays(today, 1))], ['Next 7 days', coming]] as const).map(([label, l]) => (
          <div key={label} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)]">
            <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{label}</p>
            <p className="num mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-none font-light">{l.length}</p>
            <p className="mt-1 text-[0.78rem] text-muted">{l.reduce((x, a) => x + a.rooms, 0)} rooms · {l.reduce((x, a) => x + a.pax, 0)} guests</p>
          </div>
        ))}
        <div className="rounded-[var(--radius-lg)] bg-ink p-5 text-paper shadow-[var(--shadow-lift)]">
          <p className="text-[0.68rem] font-medium tracking-[0.14em] text-paper/50 uppercase">Your account with us</p>
          {accounts.length === 0 ? <p className="mt-3 text-[0.9rem] text-paper/70">All settled.</p> : accounts.map((a) => (
            <div key={a.currency} className="mt-3 space-y-1 text-[0.85rem]">
              {a.weOweMinor > 0 && <p className="flex justify-between gap-2"><span className="text-paper/60">HotelBridge owes you</span><Money minor={a.weOweMinor} currency={a.currency} className="font-medium text-[#8fd1aa]" /></p>}
              {a.theyOweMinor > 0 && <p className="flex justify-between gap-2"><span className="text-paper/60">Commission due to us</span><Money minor={a.theyOweMinor} currency={a.currency} className="font-medium text-champagne" /></p>}
            </div>
          ))}
          {volume.length > 0 && <p className="mt-3 border-t border-paper/10 pt-2 text-[0.75rem] text-paper/50">{volume.reduce((x, v) => x + v.roomNights, 0)} room nights booked through HotelBridge</p>}
        </div>
      </div>
      <Panel title={`Waiting for your confirmation (${pending.length})`} className="mb-6" padded={false}>
        {pending.length === 0 ? <Empty title="No open requests" /> : (
          <ul className="divide-y divide-line">{pending.map((b) => (
            <li key={b.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="num font-semibold">{b.reference} <span className="font-normal text-muted">· requested {formatDateTime(b.createdAt)}</span></p>
                <div className="mt-2"><HotelDeadline status={b.status} respondBy={b.hotelRespondBy} who="You" /></div>
                <p className="mt-1">{formatDate(b.checkIn)} – {formatDate(b.checkOut)} · lead guest {b.leadGuest}</p>
                <ul className="mt-1 text-[0.85rem] text-muted">{b.rooms.map((r, i) => <li key={i}>{r.roomName} ({r.mealPlan}) · {describeRoom(r)}</li>)}</ul>
                {b.specialRequests && <p className="mt-1 text-[0.85rem]">Requests: {b.specialRequests}</p>}
                {b.collectionModel === 'prepaid_to_hb' ? <p className="mt-1 text-[0.85rem]">Payable to hotel: <Money minor={b.supplierCostMinor} currency={b.currency} /></p> : <p className="mt-1 text-[0.85rem]">Guest pays at the hotel</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ActionForm action={partnerRespondAction}><input type="hidden" name="bookingId" value={b.id} />
                  <Field label="Your confirmation number"><input name="confirmation" className="field" /></Field>
                  <SubmitButton size="sm" className="mt-2" name="decision" value="accept">Confirm</SubmitButton>
                </ActionForm>
                <ActionForm action={partnerRespondAction}><input type="hidden" name="bookingId" value={b.id} />
                  <Field label="Reason (optional)"><input name="note" className="field" /></Field>
                  <SubmitButton size="sm" variant="danger" className="mt-2" name="decision" value="decline" confirm="Decline this request?">Decline</SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}</ul>
        )}
      </Panel>
      <Panel title="All reservations" padded={false}>
        {rest.length === 0 ? <Empty title="No reservations yet" /> : (
          <table className="table"><thead><tr><th>Reference</th><th>Stay</th><th>Guest</th><th>Rooms</th><th>Status</th><th>Your confirmation</th></tr></thead>
            <tbody>{rest.map((b) => <tr key={b.id}><td className="num">{b.reference}</td><td className="num">{formatDate(b.checkIn)} – {formatDate(b.checkOut)}</td><td>{b.leadGuest}</td><td>{b.rooms.length}</td><td><StatusPill status={b.status} /></td><td>{b.hotelConfirmation ?? '—'}</td></tr>)}</tbody></table>
        )}
      </Panel>
    </>
  );
}
