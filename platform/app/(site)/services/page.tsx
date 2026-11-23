import Link from 'next/link';
import { LinkButton } from '@/components/ui';
import { Card, PageHero, Section } from '@/components/site/page-bits';
import { GROUP_FIRST_RESPONSE_HOURS, HOTEL_RESPONSE_HOURS, PAYMENT_HOLD_HOURS } from '@/lib/config';

/* What an agency actually gets. Every timing on this page is read from the same
 * constants the product enforces, so the page cannot promise something the
 * portal does not do. Features that are not live are not listed. */

export const metadata = {
  title: 'What HotelBridge does for your agency',
  description: 'Contracted hotels you can book, best-rate requests answered by the hotel, a Group Desk for groups and MICE, and client proposals under your own brand.',
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="What we do"
        title={<>Everything between your client&apos;s enquiry <br className="hidden md:block" />and the hotel&apos;s confirmation.</>}
        lead="One portal for the whole job: find the hotel, get a real price, quote your client under your own name, and hold a confirmation you can rely on."
      >
        <div className="mt-9 flex flex-wrap gap-3">
          <LinkButton href="/register" variant="inverse" size="lg">Register your agency</LinkButton>
          <LinkButton href="/login" size="lg" className="border border-paper/25 bg-transparent hover:bg-paper/10">Agent login</LinkButton>
        </div>
      </PageHero>

      <Section eyebrow="For travel agencies" title="Four ways to get a price — all of them from the hotel.">
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          <Card title="Search contracted hotels">
            Where we hold a signed contract and rooms with the hotel, you search, see one price for the whole stay, and
            book. The price is revalidated before the booking goes through, so what you quote is what you pay.
          </Card>
          <Card title="Ask any partner hotel for its best rate">
            Add your client&apos;s dates, rooms and occupancy and send the request. It goes to that hotel&apos;s own sales team,
            not to a feed. We aim to have their offer back in your portal within the hour during hotel working hours, and
            a request stays open for 24 hours.
          </Card>
          <Card title="Send a group to the Group Desk">
            Groups, MICE and weddings. Forward the enquiry exactly as your client sent it — WhatsApp text, a forwarded
            email, a photograph of a note. We read it, go to the right hotels with the full brief, and come back with
            written offers you can accept online. You hear from us within {GROUP_FIRST_RESPONSE_HOURS} hours.
          </Card>
          <Card title="On-request bookings">
            Where a hotel holds no allotment for your dates, the booking goes to the hotel to accept or decline. It stays
            visibly pending — never falsely confirmed — and the hotel has {HOTEL_RESPONSE_HOURS} hours to answer unless
            its contract says otherwise.
          </Card>
        </ul>
      </Section>

      <Section eyebrow="Then the part clients see" tone="surface" title="Quote in your name, not ours.">
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Card title="Your own proposal">
            Set your client&apos;s price, add your logo and your footer — address, GST number, licence, payment details — and
            send a proposal that carries your agency&apos;s name. HotelBridge does not appear in front of your client.
          </Card>
          <Card title="Your margin stays yours">
            You decide the selling price. The rate we show you is yours to work from, and your client never sees it.
          </Card>
          <Card title="Clients and trips in one place">
            Keep the client, the trip, what was quoted and what has been paid together, so the next enquiry from the same
            client does not start from an empty page.
          </Card>
        </div>
      </Section>

      <Section eyebrow="After the booking" title="A confirmation that means something.">
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          <Card title="Vouchers on confirmation">
            A voucher is issued only once the hotel has confirmed. A pending request never produces one.
          </Card>
          <Card title="Amendments and cancellations">
            Both run through the portal, against the cancellation terms that were shown when you booked. Charges are
            calculated from the moment we receive your request, and the terms stay attached to the booking.
          </Card>
          <Card title="Clear payment terms">
            New agencies prepay; credit terms are available after review. An unpaid hold is released after{' '}
            {PAYMENT_HOLD_HOURS} hours at no charge. For best-rate hotels, payment and guest arrangements stay directly
            between the hotel and your agency.
          </Card>
        </ul>
      </Section>

      <Section eyebrow="For hotels" tone="surface" title="The other side of the same service.">
        <div className="prose-hb mt-6 max-w-2xl">
          <p>
            For hotels, HotelBridge is a sales channel into the Indian agency market. We bring you enquiries with the
            detail your revenue team needs to price properly, and we keep each destination&apos;s collection small so your
            property is seen rather than buried in a list of four hundred.
          </p>
          <p>
            Bookings, payment and the guest relationship stay between your hotel and the agency. We agree in writing
            which B2B channels we may distribute to.
          </p>
        </div>
        <div className="mt-7 flex flex-wrap gap-2">
          <LinkButton href="/partners" size="sm">Partner with HotelBridge</LinkButton>
          <Link href="/#how" className="inline-flex items-center px-2 py-2 text-[0.88rem] font-medium hover:underline">See how a booking works →</Link>
        </div>
      </Section>
    </>
  );
}
