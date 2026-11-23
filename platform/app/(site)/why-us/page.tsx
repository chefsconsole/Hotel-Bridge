import { LinkButton } from '@/components/ui';
import { Card, Figures, PageHero, Section } from '@/components/site/page-bits';
import { liveNetwork } from '@/lib/services/network';

/* Why agencies use us — including what we are not. The comparison below makes
 * only structural claims about the alternatives, never invented figures about
 * their pricing or performance. */

export const metadata = {
  title: 'Why agencies use HotelBridge',
  description: 'Direct hotel contracts instead of a chain of resellers, small curated collections, written offers, and your own brand in front of your client.',
};

export const revalidate = 300;

const rows: [string, string, string, string][] = [
  ['Where the rate comes from', 'A contract we signed with the hotel, or a quote its sales team sent for your enquiry', 'A wholesaler’s rate, resold onward', 'The hotel, once you reach the right person'],
  ['Hotels per destination', 'A small collection, chosen deliberately', 'Everything bookable in the feed', 'Whoever answers'],
  ['Who answers an unusual request', 'The hotel’s own sales team, through us', 'Nobody — the feed has no opinion', 'The hotel, if you have the contact'],
  ['Groups, MICE and weddings', 'Group Desk: forward the enquiry in any format and get written offers', 'Generally out of scope', 'Your own emails, hotel by hotel'],
  ['What your client sees', 'Your agency’s brand, your price', 'Your brand, if the portal allows it', 'Your brand'],
  ['Terms and inclusions', 'In writing, attached to the booking', 'As the feed supplies them', 'Wherever the email thread ended up'],
  ['Effort per enquiry', 'One request', 'One search', 'One email per hotel, then chasing'],
];

export default async function WhyUsPage() {
  const live = await liveNetwork();
  return (
    <>
      <PageHero
        eyebrow="Why us"
        title={<>The shortest line between <br className="hidden md:block" />your client and the hotel.</>}
        lead="Not more hotels than anyone else. Fewer, contracted properly, answered by the people who own the rooms."
      >
        {live && live.hotels > 0 && (
          <Figures light items={[[live.hotels, 'partner hotels'], [live.cities, 'destinations'], [live.countries, 'countries']]} />
        )}
      </PageHero>

      <Section eyebrow="The difference" title="Five things that follow from contracting hotels ourselves.">
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          <Card n={1} title="No margin stacked on margin">
            Every step between a hotel and an agent takes a cut. We removed the steps rather than negotiating harder
            against them.
          </Card>
          <Card n={2} title="Someone can always call the hotel">
            We hold the contract and the relationship, so when a booking needs a human — an early check-in, a room moved,
            a name corrected — there is a named person at the hotel to ask.
          </Card>
          <Card n={3} title="One price for the whole stay">
            Per-night rates, weekday bands, compulsory gala dinners and taxes are worked out before you see a figure, and
            the price is revalidated before you book. If we cannot price a night honestly, we tell you instead of
            guessing.
          </Card>
          <Card n={4} title="Curated, not exhaustive">
            A short list you can trust beats four hundred results you have to vet. We add a hotel when there is a reason
            to and decline the rest.
          </Card>
          <Card n={5} title="Your client never meets us">
            Proposals, vouchers and correspondence carry your agency&apos;s brand. We are your supplier, not a competitor
            for your client.
          </Card>
        </ul>
      </Section>

      <Section eyebrow="Compared with" tone="surface" title="Three honest ways to book a hotel for a client."
        lead="All three work. They cost you different things.">
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-[0.88rem]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="sticky left-0 z-10 bg-surface py-4 pr-4 font-medium text-faint">&nbsp;</th>
                <th scope="col" className="py-4 pr-4 font-semibold">HotelBridge</th>
                <th scope="col" className="py-4 pr-4 font-medium text-muted">A bed bank or API portal</th>
                <th scope="col" className="py-4 font-medium text-muted">Contacting hotels yourself</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(([label, us, feed, direct]) => (
                <tr key={label} className="align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-surface py-4 pr-4 font-medium">{label}</th>
                  <td className="py-4 pr-4 leading-relaxed">{us}</td>
                  <td className="py-4 pr-4 leading-relaxed text-muted">{feed}</td>
                  <td className="py-4 leading-relaxed text-muted">{direct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-2xl text-[0.85rem] leading-relaxed text-faint">
          Contacting hotels directly is how we work too — we have simply already done it, signed the contracts and put
          the answers somewhere you can search.
        </p>
      </Section>

      <Section eyebrow="Being straight with you" title="What HotelBridge is not.">
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Card title="Not a bed bank">
            We do not carry every hotel in every city, and we will not pretend to. If we have nothing right for your
            client in a destination, ask the Group Desk and we will go to the hotels — or tell you we cannot help.
          </Card>
          <Card title="Not always the cheapest line">
            On a given date a bed bank clearing distressed inventory may undercut a contracted rate. What we offer is a
            rate from the hotel, terms in writing and someone to call. Where that is not worth more to you, use the
            cheaper line.
          </Card>
          <Card title="Not an instant-everything engine">
            Where we hold rooms, you book instantly. Where we do not, a real person at the hotel has to answer, and that
            takes the time it takes. We show you which is which rather than confirming something the hotel has not
            agreed to.
          </Card>
        </div>
      </Section>

      <Section eyebrow="Next" tone="surface" title="See it with your own client&apos;s enquiry.">
        <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-muted">
          Register your agency, and once you are verified — usually within one working day — put a real enquiry through
          and judge the answer you get back.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/register" size="lg">Register your agency</LinkButton>
          <LinkButton href="/contact" size="lg" className="border border-line bg-transparent">Ask us something first</LinkButton>
        </div>
      </Section>
    </>
  );
}
