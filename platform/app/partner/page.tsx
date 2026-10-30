import { StatusPill } from '@/components/booking-bits';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, Money, PageHeader, Panel } from '@/components/ui';
import { partnerRespondAction } from '@/app/actions/partner';
import { getDb } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { describeRoom } from '@/lib/domain/occupancy';
import { requirePartner } from '@/lib/session';
import { listForPartner } from '@/lib/services/bookings';

export const metadata = { title: 'Reservations' };

export default async function PartnerHome() {
  const { actor } = await requirePartner();
  const rows = await listForPartner(await getDb(), actor);
  const pending = rows.filter((r) => r.status === 'pending_confirmation');
  const rest = rows.filter((r) => r.status !== 'pending_confirmation');
  return (
    <>
      <PageHeader eyebrow="HotelBridge partner" title="Reservations" description="Requests waiting for your answer, and every reservation made through HotelBridge. Amounts shown are what HotelBridge owes your hotel under the contract." />
      <Panel title={`Waiting for your confirmation (${pending.length})`} className="mb-6" padded={false}>
        {pending.length === 0 ? <Empty title="No open requests" /> : (
          <ul className="divide-y divide-line">{pending.map((b) => (
            <li key={b.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="num font-semibold">{b.reference} <span className="font-normal text-muted">· requested {formatDateTime(b.createdAt)}</span></p>
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
