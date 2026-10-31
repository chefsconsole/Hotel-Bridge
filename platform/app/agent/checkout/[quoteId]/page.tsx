import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckoutForm } from '@/components/checkout-form';
import { AvailabilityPill } from '@/components/offers';
import { Money, Notice, PageHeader, Pill, SampleTag } from '@/components/ui';
import { CancellationBox } from '@/components/cancellation';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { PAYMENT_HOLD_HOURS } from '@/lib/config';
import { daysBetween, formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { describeRoom, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { getQuote } from '@/lib/services/search';
import { agencyOutstanding } from '@/lib/services/ledger';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { NotFoundError } from '@/lib/services/errors';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { actor, agency } = await requireAgent();
  const { quoteId } = await params;
  const db = await getDb();
  const q = await getQuote(db, actor, quoteId).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  const { priced, offer, hotelName, city } = q.snapshot;
  const [hotel] = await db.select().from(schema.hotels).where(eq(schema.hotels.id, q.hotelId));
  const p = priced.price;
  const nights = daysBetween(q.checkIn, q.checkOut);
  const expired = q.expiresAt < new Date();

  let arrangement: 'direct' | 'credit' | 'prepay' = 'prepay';
  if (p.collectionModel === 'pay_direct_to_hotel') arrangement = 'direct';
  else if (agency.creditEnabled && agency.billingCurrency === p.currency) {
    const outstanding = await agencyOutstanding(db, agency.id, p.currency);
    if (outstanding + p.sellMinor <= agency.creditLimitMinor) arrangement = 'credit';
  }
  const paymentText = {
    direct: 'Payable by the guest directly at the hotel. HotelBridge does not charge you for this booking.',
    credit: `Charged to your account on confirmation. Payment due within ${agency.paymentTermsDays} days of the invoice.`,
    prepay: `Prepayment. On booking we hold the rooms and issue an invoice; payment is due within ${PAYMENT_HOLD_HOURS} hours, or the hold is released at no charge. The booking is confirmed once payment is received.`,
  }[arrangement];
  const searchHref = `/agent/search?city=${encodeURIComponent(city)}&in=${q.checkIn}&out=${q.checkOut}&rooms=${encodeRooms(q.rooms)}`;
  const cta = offer.availability === 'instant'
    ? (arrangement === 'prepay' ? `Book and hold · ${formatMoney(p.sellMinor, p.currency)}` : `Book now · ${formatMoney(p.sellMinor, p.currency)}`)
    : 'Send booking request to the hotel';

  return (
    <>
      <Link href={searchHref} className="text-[0.85rem] text-muted hover:text-ink">← Back to results</Link>
      <PageHeader eyebrow="Checkout" title={hotelName} description={`${formatDate(q.checkIn)} – ${formatDate(q.checkOut)} · ${nights} night${nights === 1 ? '' : 's'} · ${q.rooms.length} room${q.rooms.length === 1 ? '' : 's'}`} />
      {agency.status !== 'verified' && (
        <div className="mb-6"><Notice tone="warning" title="Booking opens after verification">Your agency is awaiting verification by HotelBridge. You can review this quote, but booking is enabled once we have verified your account.</Notice></div>
      )}
      {expired && <div className="mb-6"><Notice>This quote is more than 20 minutes old. That&apos;s fine — the price is always re-checked with the hotel when you book, and you&apos;ll be asked to approve any change.</Notice></div>}
      <CancellationBox policy={offer.cancelPolicy} checkIn={q.checkIn} className="mb-6" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <CheckoutForm quoteId={q.id} idempotencyKey={crypto.randomUUID()} sellMinor={p.sellMinor} rooms={q.rooms} roomName={offer.roomName} cta={cta} searchHref={searchHref}>
          <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 text-[0.88rem]">
            <h2 className="font-semibold">Conditions</h2>
            <dl className="mt-3 space-y-3">
              <div><dt className="font-medium">Cancellation</dt><dd className="text-muted">{priced.cancellation}</dd></div>
              <div><dt className="font-medium">Payment</dt><dd className="text-muted">{paymentText}</dd></div>
              <div><dt className="font-medium">Confirmation</dt><dd className="text-muted">{offer.availability === 'instant' ? 'Confirmed against allotment HotelBridge holds with the hotel.' : 'This is a request. The hotel must confirm it; until then it is not a reservation and no voucher is issued.'}</dd></div>
              {priced.notes.length > 0 && <div><dt className="font-medium">Supplier notes</dt><dd className="text-muted">{priced.notes.join(' ')}</dd></div>}
            </dl>
          </section>
        </CheckoutForm>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface">
            <div className="border-b border-line p-5">
              <div className="flex items-center gap-2">{hotel?.isSample && <SampleTag />}<AvailabilityPill availability={offer.availability} />{priced.simulated && <Pill tone="neutral" dot={false}>Simulated supplier</Pill>}</div>
              <p className="mt-3 font-semibold">{offer.roomName}</p>
              <p className="text-[0.85rem] text-muted">{MEAL_PLANS[offer.mealPlan as keyof typeof MEAL_PLANS] ?? offer.mealPlan}</p>
            </div>
            <ul className="divide-y divide-line px-5 text-[0.88rem]">
              {q.rooms.map((r, i) => (
                <li key={i} className="flex justify-between gap-4 py-3">
                  <span className="text-muted">Room {i + 1} · {describeRoom(r)}</span>
                  <Money minor={priced.perRoomMinor[i]} currency={p.currency} />
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-line bg-paper/60 p-5 text-[0.88rem]">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total for the stay</span>
                <Money minor={p.sellMinor} currency={p.currency} className="text-[1.35rem] font-semibold" />
              </div>
              {p.taxMinor > 0 && <div className="flex justify-between text-muted"><span>of which taxes</span><Money minor={p.taxMinor} currency={p.currency} /></div>}
              {p.localTaxMinor > 0 && <div className="flex justify-between text-muted"><span>City tax, paid at the hotel</span><Money minor={p.localTaxMinor} currency={p.currency} /></div>}
              <p className="pt-2 text-[0.75rem] text-faint">Per-room amounts are the total split in proportion to each room&apos;s rate, for your records. The total is what you are charged.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
