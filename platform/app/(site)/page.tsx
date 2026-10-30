import Link from 'next/link';
import { LinkButton } from '@/components/ui';

export default function Home() {
  return (
    <>
      <Hero />
      <Network />
      <AgentFlow />
      <HotelPartners />
      <GroupDesk />
      <Join />
      <Clarity />
    </>
  );
}

/* --------------------------------- hero --------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      <svg className="absolute inset-0 -z-10 size-full opacity-[0.07]" aria-hidden>
        <defs><pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#fff" strokeWidth="0.6" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-20 pb-24 md:grid-cols-[1.15fr_1fr] md:px-6 md:pt-28 md:pb-32">
        <div className="animate-[var(--animate-rise)]">
          <p className="eyebrow">B2B hotel distribution for travel professionals</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.035em] md:text-[4.1rem]">
            The right hotels,<br />on the right terms.
          </h1>
          <p className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-paper/70">
            HotelBridge is a curated network of contracted hotel partners for travel agents, tour operators and DMCs.
            Search a considered collection in each destination, see every condition before you commit, and book or request in minutes.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <LinkButton href="/login" variant="inverse" size="lg">Open the agent portal</LinkButton>
            <LinkButton href="/register" size="lg" className="border border-paper/25 bg-transparent hover:bg-paper/10">Register your agency</LinkButton>
          </div>
          <p className="mt-6 text-[0.88rem] text-paper/55">
            Hotel or distribution partner? <Link href="/partners" className="text-paper underline decoration-champagne underline-offset-4 hover:decoration-2">Talk to our partnerships team</Link>
          </p>
        </div>
        <LifecycleCard />
      </div>
    </section>
  );
}

/** A product diagram, not a screenshot of fake data. */
function LifecycleCard() {
  const steps = [
    ['Search', 'Destination, dates and every room as it really is — 2 adults, 2 adults, 1 adult.'],
    ['Compare', 'Room, meal plan, cancellation deadline and the total stay price, side by side.'],
    ['Re-check', 'Price and availability are revalidated with the hotel before anything is booked.'],
    ['Confirm or request', 'Instant where we hold allotment. Otherwise clearly marked “on request”.'],
    ['Manage', 'Vouchers, invoices, amendments and cancellations in one place.'],
  ];
  return (
    <div className="relative animate-[var(--animate-rise)] [animation-delay:120ms]">
      <div className="rounded-[var(--radius-lg)] border border-paper/12 bg-ink-2/80 p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.6)] backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-[0.72rem] tracking-[0.16em] text-paper/50 uppercase">A booking, end to end</p>
          <svg viewBox="0 0 40 20" className="h-4 w-auto" aria-hidden><path d="M2 18C6 8 12 3 20 3s14 5 18 15" fill="none" stroke="var(--color-champagne)" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <ol className="mt-6 space-y-5">
          {steps.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="num flex size-7 items-center justify-center rounded-full border border-paper/20 text-[0.75rem] text-paper/80">{i + 1}</span>
              <div>
                <p className="font-medium text-paper">{t}</p>
                <p className="mt-0.5 text-[0.86rem] leading-relaxed text-paper/55">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-wrap gap-2 border-t border-paper/10 pt-5 text-[0.72rem]">
          <span className="rounded-full bg-positive/25 px-2.5 py-1 text-[#bfe3cd]">Confirmed</span>
          <span className="rounded-full bg-pending/30 px-2.5 py-1 text-[#f1dcaa]">Pending hotel confirmation</span>
          <span className="rounded-full bg-paper/10 px-2.5 py-1 text-paper/70">Price re-checked</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- network ------------------------------- */

function Network() {
  const needs = [
    ['City centre', 'Walkable to the sights and the evening — the default for most leisure travellers.'],
    ['Near the airport', 'Early departures, late arrivals, crew and transit stays.'],
    ['Business', 'Reliable Wi-Fi, desks, meeting space and quick check-in.'],
    ['Premium leisure', 'Five-star and boutique properties for clients who expect more.'],
    ['Group travel', 'Coach access, breakfast capacity and teams who handle rooming lists.'],
    ['Value', 'Well-run three-star hotels in the right places, at honest prices.'],
  ];
  return (
    <section id="network" className="scroll-mt-20 bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">The curated network</p>
            <h2 className="mt-4 text-[2.1rem] leading-tight font-semibold md:text-[2.8rem]">Fewer hotels.<br />Better ones.</h2>
          </div>
          <div className="prose-hb text-[1.05rem]">
            <p>Most booking tools give you thousands of results and leave the judgement to you. We do the opposite. In each destination we select a small collection — often around ten hotels — and every one has a reason to be there: its location, its service, its suitability for groups, or simply its value.</p>
            <p>Concentrating demand on fewer partners lets us negotiate properly, know the hotels well, and stand behind what we sell.</p>
          </div>
        </div>
        <div className="mt-16 grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-3">
          {needs.map(([t, d]) => (
            <div key={t} className="group border-r border-b border-line bg-surface p-7 transition-colors hover:bg-mist/50">
              <div className="mb-5 h-px w-8 bg-champagne transition-all group-hover:w-14" />
              <h3 className="text-[1.12rem] font-semibold">{t}</h3>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ agent flow ------------------------------ */

function AgentFlow() {
  const steps = [
    ['Search', 'Choose the destination and dates. Configure each room separately — adults, children and their ages.'],
    ['Compare', 'Every option shows the room, meal plan, total stay price, what taxes are included, and the exact cancellation deadline.'],
    ['Book or request', 'Where we hold allotment, you book instantly. Otherwise you send a request and we tell you it is a request.'],
    ['Receive documents', 'A voucher once — and only once — the hotel has confirmed. An invoice for everything you are charged.'],
    ['Manage', 'Track status, request amendments and cancel with the penalty shown before you confirm.'],
  ];
  return (
    <section id="agents" className="scroll-mt-20 border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
        <p className="eyebrow">For travel agents</p>
        <h2 className="mt-4 max-w-2xl text-[2.1rem] leading-tight font-semibold md:text-[2.8rem]">Effortless to use. Nothing hidden.</h2>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line md:grid-cols-5">
          {steps.map(([t, d], i) => (
            <li key={t} className="bg-surface p-6">
              <p className="num text-[0.8rem] text-champagne">0{i + 1}</p>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <LinkButton href="/register">Register your agency</LinkButton>
          <p className="text-[0.88rem] text-muted">Accounts are verified by our team before the first booking.</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- hotel partners ---------------------------- */

function HotelPartners() {
  const points = [
    ['Verified B2B demand', 'Bookings come from travel businesses we have verified — not anonymous traffic.'],
    ['Incremental, not cannibalising', 'We work on agreed contract terms and respect your rate parity and distribution rules.'],
    ['One commercial relationship', 'A single partner for many agencies: one contract, one point of contact, one reconciliation.'],
    ['Structured group business', 'Group enquiries arrive complete — dates, room split, meal plan, coach and accessibility needs.'],
    ['Production visibility', 'See every reservation and request made through HotelBridge, and answer requests in one place.'],
  ];
  return (
    <section id="hotels" className="scroll-mt-20 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 md:grid-cols-[1fr_1.3fr] md:px-6 md:py-32">
        <div>
          <p className="eyebrow">For hotel partners</p>
          <h2 className="mt-4 text-[2.1rem] leading-tight font-semibold md:text-[2.8rem]">A partner, not another channel.</h2>
          <p className="mt-6 text-paper/65 leading-relaxed">
            We don&apos;t promise volumes we can&apos;t yet show you. We do promise a small, carefully chosen portfolio, honest reporting, and a team that knows your hotel.
          </p>
          <LinkButton href="/partners" variant="inverse" className="mt-8">Apply to join the network</LinkButton>
        </div>
        <ul className="divide-y divide-paper/10 border-y border-paper/10">
          {points.map(([t, d]) => (
            <li key={t} className="grid gap-1 py-5 sm:grid-cols-[220px_1fr] sm:gap-6">
              <p className="font-medium">{t}</p>
              <p className="text-[0.92rem] leading-relaxed text-paper/60">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------ group desk ------------------------------ */

function GroupDesk() {
  return (
    <section id="groups" className="scroll-mt-20 bg-paper">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 md:grid-cols-2 md:px-6 md:py-32">
        <div>
          <p className="eyebrow">Group Desk</p>
          <h2 className="mt-4 text-[2.1rem] leading-tight font-semibold md:text-[2.8rem]">Groups deserve a desk, not a contact form.</h2>
          <p className="mt-6 text-[1.02rem] leading-relaxed text-muted">
            Tour groups, weddings, incentives, sports teams, multi-city itineraries. Tell us the dates, the room split and what matters — coach parking, breakfast, accessibility — and our Group Desk approaches the right hotels, compares their offers like for like, and sends you one written proposal with every condition on it.
          </p>
          <p className="mt-4 text-[0.92rem] text-muted">Negotiated rates are negotiated by people. The paperwork around them is handled by the platform.</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-7 shadow-[var(--shadow-soft)]">
          <p className="text-[0.75rem] tracking-[0.14em] text-faint uppercase">How a group enquiry moves</p>
          <ol className="mt-5 space-y-3">
            {['Received and acknowledged', 'Reviewed by a specialist', 'Sent to selected hotels', 'Offers compared', 'Proposal sent to you', 'Accepted, contracted, confirmed'].map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[0.94rem]">
                <span className={`size-2 rounded-full ${i < 5 ? 'bg-champagne' : 'bg-positive'}`} />
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-line pt-4 text-[0.82rem] text-muted">Every enquiry has a reference, an owner and a deadline.</p>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- join --------------------------------- */

function Join() {
  const cards = [
    ['Travel agents & DMCs', 'Register your agency, get verified, and book from the curated collection.', '/register', 'Register your agency'],
    ['Hotels', 'Tell us about your property. We add hotels where there is a clear reason to.', '/partners?kind=hotel', 'Apply as a hotel'],
    ['Distribution partners', 'Channel managers, wholesalers and technology partners.', '/partners?kind=distribution', 'Start a conversation'],
  ];
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6">
        <h2 className="text-[2rem] leading-tight font-semibold md:text-[2.4rem]">Work with HotelBridge</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map(([t, d, href, cta]) => (
            <Link key={t} href={href} className="group flex flex-col justify-between rounded-[var(--radius-lg)] border border-line bg-paper p-7 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lift)]">
              <div>
                <h3 className="text-[1.15rem] font-semibold">{t}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">{d}</p>
              </div>
              <p className="mt-8 text-[0.9rem] font-medium">{cta} <span className="inline-block transition-transform group-hover:translate-x-1">→</span></p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- clarity ------------------------------- */

function Clarity() {
  const items = [
    ['How bookings are confirmed', 'Instant bookings are confirmed against allotment we hold with the hotel. Requests go to the hotel and stay “pending” until the hotel answers. You only receive a voucher for confirmed bookings.'],
    ['Prices', 'The price you see is the total for the stay, for every room. Before booking we check it again with the hotel or supplier. If it has changed, we show you the new price and you decide.'],
    ['Cancellations', 'Every rate shows its cancellation deadline as a date. When you cancel, we show the charge (if any) before you confirm.'],
    ['Payment', 'New agencies prepay before a booking is confirmed; rooms are held until a stated deadline. Credit terms are available only after a review by our finance team.'],
    ['Support', 'Reach a person for urgent issues. Every booking has a full timeline, so nobody has to ask what happened.'],
  ];
  return (
    <section id="how" className="scroll-mt-20 bg-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:grid-cols-[1fr_1.6fr] md:px-6 md:py-32">
        <div>
          <p className="eyebrow">Operational clarity</p>
          <h2 className="mt-4 text-[2.1rem] leading-tight font-semibold">How it works, plainly.</h2>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {items.map(([q, a]) => (
            <details key={q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="text-faint transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-[0.94rem] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
