import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { PrintButton } from '@/components/print-button';
import { Logo, Notice } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { daysBetween, formatDate } from '@/lib/domain/dates';
import { describeRoom } from '@/lib/domain/occupancy';
import { formatMoney } from '@/lib/domain/money';
import { requireAgent } from '@/lib/session';
import { getBookingForActor } from '@/lib/services/bookings';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { NotFoundError } from '@/lib/services/errors';
import { SUPPORT_EMAIL } from '@/lib/config';

export const metadata = { title: 'Voucher' };

export default async function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, agency } = await requireAgent();
  const { id } = await params;
  const db = await getDb();
  const b = await getBookingForActor(db, actor, id).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  if (!['confirmed', 'amendment_requested', 'cancellation_requested'].includes(b.status)) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Notice tone="warning" title="No voucher for this booking">Vouchers are issued only once the hotel has confirmed. This booking is not confirmed.</Notice>
        <Link href={`/agent/bookings/${b.id}`} className="mt-4 inline-block text-[0.9rem] underline">Back to booking</Link>
      </div>
    );
  }
  const [hotel] = await db.select().from(schema.hotels).where(eq(schema.hotels.id, b.hotelId));
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/agent/bookings/${b.id}`} className="text-[0.85rem] text-muted hover:text-ink">← Booking</Link>
        <PrintButton />
      </div>
      <article className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 print:border-0 print:p-0 md:p-12">
        <header className="flex items-start justify-between border-b border-line pb-6">
          <Logo />
          <div className="text-right">
            <p className="eyebrow">Hotel voucher</p>
            <p className="num mt-1 text-[1.3rem] font-semibold">{b.reference}</p>
            {b.isSample && <p className="mt-1 text-[0.75rem] font-semibold text-attention uppercase">Sample — not valid for travel</p>}
          </div>
        </header>
        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-[0.75rem] tracking-wide text-faint uppercase">Hotel</p>
            <p className="mt-1 font-semibold">{hotel.name}</p>
            <p className="text-[0.88rem] text-muted">{hotel.address}<br />{hotel.city}, {hotel.country}</p>
          </div>
          <div>
            <p className="text-[0.75rem] tracking-wide text-faint uppercase">Confirmation</p>
            <p className="num mt-1 font-semibold">{b.hotelConfirmation ?? b.supplierRef ?? b.reference}</p>
            <p className="text-[0.88rem] text-muted">Booked by {agency.name}{b.agentReference ? ` · ref ${b.agentReference}` : ''}</p>
          </div>
          <div>
            <p className="text-[0.75rem] tracking-wide text-faint uppercase">Arrival</p>
            <p className="mt-1 font-semibold">{formatDate(b.checkIn, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {hotel.checkInTime && <p className="text-[0.88rem] text-muted">Check-in from {hotel.checkInTime}</p>}
          </div>
          <div>
            <p className="text-[0.75rem] tracking-wide text-faint uppercase">Departure</p>
            <p className="mt-1 font-semibold">{formatDate(b.checkOut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-[0.88rem] text-muted">{daysBetween(b.checkIn, b.checkOut)} nights{hotel.checkOutTime ? ` · check-out by ${hotel.checkOutTime}` : ''}</p>
          </div>
        </section>
        <table className="table border-t border-line">
          <thead><tr><th>Room</th><th>Occupancy</th><th>Board</th><th>Guests</th></tr></thead>
          <tbody>
            {b.rooms.map((r, i) => (
              <tr key={i}><td>{i + 1}. {r.roomName}</td><td>{describeRoom(r)}</td><td>{MEAL_PLANS[r.mealPlan as keyof typeof MEAL_PLANS] ?? r.mealPlan}</td><td>{i === 0 ? [b.leadGuest, ...r.guestNames.filter((n) => n !== b.leadGuest)].join(', ') : r.guestNames.join(', ') || '—'}</td></tr>
            ))}
          </tbody>
        </table>
        <section className="mt-6 space-y-2 border-t border-line pt-6 text-[0.85rem] text-muted">
          {b.specialRequests && <p><span className="font-medium text-ink">Requests (not guaranteed):</span> {b.specialRequests}</p>}
          {b.paymentArrangement === 'direct'
            ? <p><span className="font-medium text-ink">Payment:</span> the guest pays the hotel directly for the stay.</p>
            : <p><span className="font-medium text-ink">Payment:</span> accommodation{b.rooms[0]?.mealPlan !== 'RO' ? ' and board as shown' : ''} prepaid via HotelBridge. Extras are payable by the guest.</p>}
          {b.localTaxMinor > 0 && <p><span className="font-medium text-ink">Payable at the hotel:</span> city tax, approximately {formatMoney(b.localTaxMinor, b.currency)} in total.</p>}
          <p>Questions on arrival: HotelBridge · {SUPPORT_EMAIL} · quote {b.reference}.</p>
        </section>
      </article>
    </div>
  );
}
