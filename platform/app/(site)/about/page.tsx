import { LinkButton } from '@/components/ui';
import { Card, Figures, PageHero, Section } from '@/components/site/page-bits';
import { OFFICE_ADDRESS, SUPPORT_EMAIL } from '@/lib/config';
import { liveNetwork } from '@/lib/services/network';

/* About. Written to be checkable: the only figures are the live network counts,
 * and there is no claim here that a hotel or an agency could not verify. */

export const metadata = {
  title: 'About HotelBridge',
  description: 'A B2B hotel distribution business for Indian travel agencies, contracting hotels direct from Mumbai.',
};

export const revalidate = 300;

export default async function AboutPage() {
  const live = await liveNetwork();
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={<>We put travel agents <br className="hidden md:block" />back in front of the hotel.</>}
        lead="HotelBridge is a B2B hotel distribution business based in Mumbai. We contract hotels directly and sell them to verified travel agencies, tour operators and DMCs — so the agency, the hotel and the guest all deal with each other, not with a chain of resellers."
      >
        {live && live.hotels > 0 && (
          <Figures light items={[[live.hotels, 'partner hotels'], [live.cities, 'destinations'], [live.countries, 'countries']]} />
        )}
      </PageHero>

      <Section eyebrow="Why we exist" title="A rate that has been resold four times is nobody's best rate.">
        <div className="prose-hb mt-6 max-w-2xl">
          <p>
            An agent searching most B2B portals is not seeing a hotel&apos;s price. They are seeing a wholesaler&apos;s price,
            passed through an aggregator, marked up by a portal, and quoted onward — each step adding margin and losing
            information. By the time something goes wrong with the booking, there is nobody to call who can actually
            speak to the hotel.
          </p>
          <p>
            We started from the other end. Every hotel in the collection is one we approached, negotiated with and
            signed, and every price an agent sees is either that signed contract or a quote the hotel&apos;s own sales team
            sent for that specific enquiry. Nothing in between.
          </p>
          <p>
            That is a slower way to build a hotel list. It is also the only way we can tell an agent, honestly, that the
            rate in front of them came from the hotel.
          </p>
        </div>
      </Section>

      <Section eyebrow="How we work" tone="surface" title="Three commitments we hold ourselves to.">
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          <Card n={1} title="Direct contracts only">
            We do not resell rates from supplier APIs or bed banks. If we cannot contract a hotel or get a written quote
            from it, that hotel is not on the portal.
          </Card>
          <Card n={2} title="Small collections, chosen on purpose">
            A handful of properties per destination rather than everything bookable. We add a hotel when there is a
            commercial and a guest-experience reason to, and we say no to the rest.
          </Card>
          <Card n={3} title="Written, not verbal">
            Offers, cancellation terms, inclusions and payment deadlines arrive in writing and stay on the booking.
            Nothing an agent relies on lives in a WhatsApp message that scrolls away.
          </Card>
        </ul>
      </Section>

      <Section eyebrow="Who we work with" title="Both sides of the booking.">
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-line bg-paper p-7">
            <p className="text-[1.1rem] font-semibold">Travel agencies, tour operators and DMCs</p>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
              We verify every agency before its first booking — Indian agencies with their PAN and a PAN card scan, and
              their GSTIN if they are registered. Verification is usually done within one working day. After that, the
              portal is yours: search contracted hotels, ask any partner hotel for its best rate, send group enquiries to
              the Group Desk and quote your client under your own brand.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <LinkButton href="/register" size="sm">Register your agency</LinkButton>
              <LinkButton href="/services" size="sm" className="border border-line bg-transparent">What you get</LinkButton>
            </div>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-paper p-7">
            <p className="text-[1.1rem] font-semibold">Hotels and hotel groups</p>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
              We act as a sales channel into the Indian agency market. Enquiries reach your sales team with full details
              — dates, rooms, occupancy, what the client actually asked for — and you answer them. Bookings, payment and
              the guest relationship stay between your hotel and the agency. We agree in writing which B2B channels we
              may distribute to, and we hold to it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <LinkButton href="/partners" size="sm">Partner with us</LinkButton>
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Where we are" tone="surface" title="Mumbai, and on WhatsApp.">
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.4fr]">
          <address className="text-[0.95rem] leading-relaxed text-muted not-italic">
            {OFFICE_ADDRESS.map((l) => <span key={l} className="block">{l}</span>)}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 block text-ink hover:underline">{SUPPORT_EMAIL}</a>
          </address>
          <div>
            <p className="max-w-xl text-[0.95rem] leading-relaxed text-muted">
              Most of our work with agents happens on WhatsApp, because that is where the enquiry arrives from their
              client. The portal is there so that what gets agreed on WhatsApp ends up written down, priced correctly and
              confirmed by the hotel.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <LinkButton href="/contact" size="sm">Talk to us</LinkButton>
              <LinkButton href="/why-us" size="sm" className="border border-line bg-transparent">Why agencies use us</LinkButton>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
