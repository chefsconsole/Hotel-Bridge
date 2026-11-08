import Link from 'next/link';
import { and, eq, sql } from 'drizzle-orm';
import { LinkButton } from '@/components/ui';
import { getDb, schema } from '@/lib/db';

/* Homepage. Every number shown is read from the database — never a marketing
 * figure. Product previews are labelled "Example". */

/** Served from the CDN; the live counts refresh every 5 minutes. */
export const revalidate = 300;

async function liveCounts() {
  try {
    const db = await getDb();
    const [r] = await db.select({
      hotels: sql<number>`count(*)::int`,
      countries: sql<number>`count(distinct ${schema.hotels.country})::int`,
      cities: sql<number>`count(distinct ${schema.hotels.city})::int`,
    }).from(schema.hotels).where(and(eq(schema.hotels.isSample, false), sql`${schema.hotels.status} <> 'inactive'`));
    return r;
  } catch { return null; }
}

export default async function Home() {
  const counts = await liveCounts();
  return (
    <>
      <DiwaliStrip />
      <Hero counts={counts} />
      <DirectToHotel />
      <Features />
      <Destinations />
      <Steps />
      <GroupDesk />
      <HotelPartners />
      <Faq />
      <FinalCta />
    </>
  );
}

/* ------------------------------- helpers -------------------------------- */

const H2 = 'mt-4 max-w-3xl text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.03em] md:text-[3rem]';
const GOLD = 'text-[#c79a4a]';

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`flex items-center gap-3 text-[0.72rem] font-medium tracking-[0.22em] uppercase ${light ? 'text-[#d9b56f]' : 'text-champagne'}`}><span className="h-px w-8 bg-current" />{children}</p>;
}

function Example() {
  return <span className="absolute top-3 right-3 rounded-full bg-ink/5 px-2 py-0.5 text-[0.62rem] tracking-[0.14em] text-faint uppercase">Example</span>;
}

/* ------------------------------- diwali -------------------------------- */

function DiwaliStrip() {
  if (new Date() > new Date('2026-11-21T00:00:00+05:30')) return null;
  return (
    <Link href="/diwali" className="block bg-gradient-to-r from-[#b8862e] via-[#d9b56f] to-[#b8862e] text-ink">
      <p className="mx-auto max-w-6xl px-4 py-2.5 text-center text-[0.86rem] font-medium md:px-6">
        🪔 Happy Diwali from HotelBridge — we are live. <span className="underline underline-offset-4">See what&apos;s new for travel agents →</span>
      </p>
    </Link>
  );
}

/* --------------------------------- hero --------------------------------- */

function Hero({ counts }: { counts: Awaited<ReturnType<typeof liveCounts>> }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#070b16] text-paper">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_80%_20%,rgba(199,154,74,0.22),transparent_60%),radial-gradient(ellipse_60%_50%_at_10%_90%,rgba(31,43,85,0.9),transparent_70%)]" />
      <svg className="absolute inset-0 -z-10 size-full opacity-[0.05]" aria-hidden>
        <defs><pattern id="g" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#fff" strokeWidth="0.6" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-20 md:grid-cols-[1.1fr_1fr] md:px-6 md:pt-24 md:pb-28">
        <div className="animate-[var(--animate-rise)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hotelbridge-mark-inverse.png" alt="HotelBridge" width={140} height={86} className="mb-6 h-20 w-auto md:h-24" />
          <Eyebrow light>B2B hotels for Indian travel agents</Eyebrow>
          <h1 className="mt-5 text-[2.7rem] leading-[1.02] font-semibold tracking-[-0.04em] md:text-[4.4rem]">
            Hotels direct.<br /><span className={GOLD}>No middleman.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-paper/70">
            Hand-picked 4★ and 5★ hotels in the destinations your clients book — with every rate coming straight from the hotel.
            Ask for a best rate and get the hotel&apos;s offer within an hour, right in the portal.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <LinkButton href="/register" variant="inverse" size="lg">Register your agency</LinkButton>
            <LinkButton href="/login" size="lg" className="border border-paper/25 bg-transparent hover:bg-paper/10">Agent login</LinkButton>
          </div>
          {counts && counts.hotels > 0 && (
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-paper/10 pt-6">
              {([[counts.hotels, 'partner hotels'], [counts.cities, 'destinations'], [counts.countries, 'countries']] as const).map(([n, l]) => (
                <div key={l}><p className="num text-[1.9rem] font-semibold tracking-tight">{n}</p><p className="text-[0.8rem] text-paper/50">{l}</p></div>
              ))}
            </div>
          )}
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

/** How a best-rate request looks — an illustration, labelled as one. */
function HeroPreview() {
  return (
    <div className="relative animate-[var(--animate-rise)] [animation-delay:120ms]">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[#c79a4a]/10 blur-2xl" />
      <div className="relative rounded-[var(--radius-lg)] border border-paper/12 bg-[#0e1426]/90 p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] backdrop-blur">
        <span className="absolute top-4 right-4 rounded-full bg-paper/10 px-2 py-0.5 text-[0.62rem] tracking-[0.14em] text-paper/60 uppercase">Example</span>
        <p className="text-[0.72rem] tracking-[0.16em] text-paper/45 uppercase">Best rate request</p>
        <p className="mt-2 text-[1.1rem] font-medium">4★ beach resort · Phuket</p>
        <p className="text-[0.85rem] text-paper/55">3 nights · 2 rooms · 4 adults, 1 child (6)</p>
        <ol className="mt-6 space-y-4 text-[0.88rem]">
          {[
            ['Sent to the hotel’s own sales team', 'Not a booking feed, not a wholesaler', 'done'],
            ['Hotel replies with its best rate', 'Usually below its public price', 'done'],
            ['Offer in your portal', 'Accept it, or ask another hotel in one click', 'now'],
          ].map(([t, d, s]) => (
            <li key={t} className="grid grid-cols-[22px_1fr] gap-3">
              <span className={`mt-0.5 flex size-[22px] items-center justify-center rounded-full text-[0.7rem] ${s === 'now' ? 'bg-[#c79a4a] text-ink' : 'border border-paper/25 text-paper/70'}`}>{s === 'now' ? '★' : '✓'}</span>
              <div><p className="font-medium text-paper">{t}</p><p className="text-[0.8rem] text-paper/50">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-center justify-between rounded-[var(--radius-md)] bg-paper/[0.06] px-4 py-3">
          <span className="text-[0.82rem] text-paper/60">Offer within</span>
          <span className="text-[1.05rem] font-semibold text-[#e0bd78]">≈ 1 hour</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- direct to hotel ---------------------------- */

function DirectToHotel() {
  return (
    <section id="network" className="scroll-mt-20 border-b border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <Eyebrow>Why HotelBridge</Eyebrow>
        <h2 className={H2}>Most portals sell you hotels through a chain of APIs. <span className="text-champagne">We go to the hotel.</span></h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Chain title="Typical B2B portal" tone="muted" steps={['You', 'Portal', 'Supplier API', 'Wholesaler', 'Hotel']} note="Each step adds a margin — and a chance the room isn’t really there." />
          <Chain title="HotelBridge" tone="gold" steps={['You', 'HotelBridge', 'Hotel']} note="Every rate is a direct contract or a direct quote. The hotel confirms your booking itself." />
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['No APIs, no wholesalers', 'Rates come from the hotel’s own team — never a feed resold several times.'],
            ['Confirmed by the hotel', 'Your client’s room is confirmed by the hotel, not by a system steps away from it.'],
            ['Best offer within 1 hour', 'Ask for a best rate on any partner hotel; we aim to have the offer in your portal within the hour.'],
            ['Only hotels worth selling', '5–10 hand-picked hotels per destination, focused on the 4★ and 5★ your clients book.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
              <p className="font-semibold">{t}</p>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chain({ title, steps, note, tone }: { title: string; steps: string[]; note: string; tone: 'muted' | 'gold' }) {
  const gold = tone === 'gold';
  return (
    <div className={`rounded-[var(--radius-lg)] border p-6 ${gold ? 'border-[#c79a4a]/50 bg-[#fbf6ec]' : 'border-line bg-surface'}`}>
      <p className={`text-[0.78rem] font-medium tracking-[0.14em] uppercase ${gold ? 'text-champagne' : 'text-faint'}`}>{title}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-[0.86rem] font-medium ${gold ? (s === 'Hotel' || s === 'You' ? 'bg-ink text-paper' : 'bg-[#c79a4a] text-ink') : 'bg-mist text-muted'}`}>{s}</span>
            {i < steps.length - 1 && <span className={gold ? 'text-champagne' : 'text-faint'}>→</span>}
          </span>
        ))}
      </div>
      <p className="mt-5 text-[0.9rem] text-muted">{note}</p>
    </div>
  );
}

/* ------------------------------- features -------------------------------- */

function Features() {
  return (
    <section id="agents" className="scroll-mt-20 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <Eyebrow>For travel agents</Eyebrow>
        <h2 className={H2}>Everything you need to sell hotels — in one place.</h2>
        <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted">From the first WhatsApp enquiry to the client&apos;s check-in.</p>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature title="Best rate on request" text="Pick a partner hotel, add your client’s dates and rooms. The hotel’s best offer lands in your portal — we aim for within the hour.">
            <MiniRow l="Request" r="Sent to hotel" /><MiniRow l="Offer" r={<span className="font-medium text-positive">Received</span>} /><MiniRow l="Time" r="≈ 1 hour" />
          </Feature>
          <Feature title="Paste any group enquiry" text="Copy the WhatsApp or email as it is. Our AI sorts it into a group request and sends it to our Group Desk.">
            <p className="rounded-[var(--radius-sm)] bg-[#e7f6e7] px-3 py-2 text-[0.78rem] text-[#24502a]">“40 pax wedding, Phuket 12–15 Feb, 18 DBL + 2 TPL, 5★, BB…”</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{['Phuket', '12–15 Feb', '40 pax', '18 DBL · 2 TPL', '5★', 'Breakfast'].map((c) => <span key={c} className="rounded-full bg-[#fbf6ec] px-2 py-0.5 text-[0.72rem] text-champagne ring-1 ring-[#c79a4a]/30">{c}</span>)}</div>
          </Feature>
          <Feature title="Your price, your profit" text="Build a quote for your client, set what they pay, and see your profit on every line before you send it.">
            <MiniRow l="Our price to you" r="₹ 41,800" /><MiniRow l="Client pays" r="₹ 46,500" /><MiniRow l="Your profit" r={<span className="font-semibold text-positive">₹ 4,700</span>} />
          </Feature>
          <Feature title="Clients & follow-ups" text="Every lead, trip and follow-up in one list — so no enquiry goes cold and nobody has to ask what happened.">
            <MiniRow l="Mehta family · Dubai" r={<span className="text-attention">Follow up today</span>} /><MiniRow l="Shah honeymoon · Bali" r="Quote sent" /><MiniRow l="Iyer group · Vietnam" r="Booked" />
          </Feature>
          <Feature title="Your brand on documents" text="Your agency’s name and logo on the proposals and messages your clients see — HotelBridge stays in the background.">
            <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-line px-3 py-2"><span className="flex size-8 items-center justify-center rounded-full bg-ink text-[0.7rem] font-semibold text-paper">YA</span><div><p className="text-[0.82rem] font-medium">Your Agency</p><p className="text-[0.72rem] text-faint">Proposal for Mr &amp; Mrs Shah</p></div></div>
          </Feature>
          <Feature title="AI client messages & team logins" text="One click writes the client’s WhatsApp or email for a booking, in their language. Add your staff with their own logins.">
            <p className="ml-auto max-w-[85%] rounded-[var(--radius-sm)] bg-[#dcf8c6] px-3 py-2 text-[0.78rem] text-[#1f3b1f]">Namaste Mr Shah 🙏 Your stay in Bali is confirmed: 4 nights, Deluxe Pool Villa, breakfast included…</p>
          </Feature>
        </div>
      </div>
    </section>
  );
}

function Feature({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-lg)] border border-line bg-paper p-6 transition-shadow hover:shadow-[var(--shadow-soft)]">
      <div className="relative rounded-[var(--radius-md)] border border-line bg-surface p-4 pt-8"><Example />{children}</div>
      <p className="mt-6 text-[1.05rem] font-semibold">{title}</p>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function MiniRow({ l, r }: { l: string; r: React.ReactNode }) {
  return <div className="flex items-center justify-between border-b border-line py-1.5 text-[0.8rem] last:border-0"><span className="text-muted">{l}</span><span className="num">{r}</span></div>;
}

/* ------------------------------ destinations ----------------------------- */

const DESTINATIONS: [string, string][] = [
  ['Thailand', 'Phuket · Bangkok · Pattaya · Krabi'],
  ['Vietnam', 'Hanoi · Da Nang'],
  ['Bali & Singapore', 'Resorts and city hotels'],
  ['Dubai & Maldives', 'Leisure, groups and MICE'],
  ['Europe', 'London · Switzerland · Paris · Rome · Amsterdam · Prague · Vienna'],
  ['India', 'Kerala · Goa · Agra · Varanasi · Srinagar · the hills'],
];

function Destinations() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Eyebrow>Where you can book</Eyebrow>
        <h2 className={H2}>The destinations your clients ask for.</h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map(([t, d]) => (
            <li key={t} className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 transition-colors hover:border-[#c79a4a]/60">
              <p className="text-[1.15rem] font-semibold">{t}</p>
              <p className="mt-1 text-[0.88rem] text-muted">{d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[0.88rem] text-muted">More destinations are added every week. Need one we don&apos;t have yet? Ask the Group Desk — we&apos;ll go to the hotels for you.</p>
      </div>
    </section>
  );
}

/* --------------------------------- steps --------------------------------- */

function Steps() {
  const steps = [
    ['Register', 'Your agency details and PAN. We verify every agency, usually within one working day.'],
    ['Search or ask', 'Book instantly where we hold rooms, or ask a partner hotel for its best rate.'],
    ['Quote your client', 'Set your client’s price and send a proposal under your own brand.'],
    ['Confirm & manage', 'Voucher once the hotel confirms. Amendments and cancellations in one place.'],
  ];
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Eyebrow>How it works</Eyebrow>
        <h2 className={H2}>From enquiry to check-in, in four steps.</h2>
        <ol className="mt-12 grid gap-5 md:grid-cols-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="rounded-[var(--radius-lg)] border border-line bg-paper p-6">
              <span className="num flex size-9 items-center justify-center rounded-full bg-ink text-[0.85rem] font-semibold text-paper">{i + 1}</span>
              <p className="mt-5 font-semibold">{t}</p>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------ group desk ------------------------------- */

function GroupDesk() {
  return (
    <section id="groups" className="scroll-mt-20 bg-[#070b16] text-paper">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6 md:py-28">
        <div>
          <Eyebrow light>Group Desk</Eyebrow>
          <h2 className="mt-4 text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.03em] md:text-[2.8rem]">Groups, MICE and weddings — <span className={GOLD}>just paste the enquiry.</span></h2>
          <p className="mt-5 max-w-lg text-paper/70">Forward it the way your client sent it. We read it, go to the right hotels with full details, and come back with written offers you can accept online.</p>
          <ul className="mt-8 space-y-3 text-[0.94rem] text-paper/80">
            {['Any format — WhatsApp, email or your notes', 'Hotels asked directly for their best group rate', 'Offers compared side by side, with all conditions', 'A reply within 24 hours'].map((x) => <li key={x} className="flex gap-3"><span className={GOLD}>✓</span>{x}</li>)}
          </ul>
          <div className="mt-9"><LinkButton href="/register" variant="inverse" size="lg">Register to send a group</LinkButton></div>
        </div>
        <div className="relative rounded-[var(--radius-lg)] border border-paper/12 bg-[#0e1426] p-6">
          <span className="absolute top-4 right-4 rounded-full bg-paper/10 px-2 py-0.5 text-[0.62rem] tracking-[0.14em] text-paper/60 uppercase">Example</span>
          <p className="text-[0.72rem] tracking-[0.16em] text-paper/45 uppercase">Pasted from WhatsApp</p>
          <p className="mt-3 rounded-[var(--radius-md)] bg-[#dcf8c6] p-4 text-[0.88rem] text-[#1f3b1f]">Hi! Need hotel for 42 people, Bangkok 3N + Pattaya 2N, 14 Feb onwards. 19 doubles 1 triple. 4 star, breakfast, coach parking needed. Pls send quote by Monday 🙏</p>
          <p className="mt-5 text-[0.72rem] tracking-[0.16em] text-paper/45 uppercase">Sorted by AI</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[0.84rem]">
            {[['Group', '42 travellers'], ['Rooms', '19 DBL · 1 TPL'], ['Bangkok', '3 nights from 14 Feb'], ['Pattaya', '2 nights'], ['Hotels', '4★ · breakfast'], ['Needs', 'Coach parking']].map(([k, v]) => (
              <div key={k} className="rounded-[var(--radius-sm)] bg-paper/[0.06] px-3 py-2"><p className="text-[0.7rem] text-paper/45">{k}</p><p className="font-medium">{v}</p></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- hotel partners ---------------------------- */

function HotelPartners() {
  return (
    <section id="hotels" className="scroll-mt-20 bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-24">
        <div>
          <Eyebrow>For hotels</Eyebrow>
          <h2 className="mt-4 text-[2rem] leading-tight font-semibold tracking-[-0.03em] md:text-[2.5rem]">Your sales partner for Indian travel agents.</h2>
          <p className="mt-5 max-w-xl text-muted">We feature only a few hotels per destination and send them real enquiries from verified Indian agencies. No reselling — bookings, payment and guests stay between your hotel and the agency.</p>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          {['Fixed FIT contract rates or best rate on request', 'Group, MICE and wedding enquiries with full details', 'Answer each request in one click — no extranet'].map((x) => <p key={x} className="flex gap-3 text-[0.92rem]"><span className="text-champagne">✓</span>{x}</p>)}
          <div className="mt-3"><LinkButton href="/partners?kind=hotel" variant="secondary">Become a partner hotel</LinkButton></div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- faq ---------------------------------- */

function Faq() {
  const items = [
    ['Who can register?', 'Travel agencies, tour operators and DMCs. Indian agencies add their PAN and a PAN card scan; we verify every agency before its first booking.'],
    ['What does “direct to the hotel” mean?', 'We don’t resell rates from supplier APIs or wholesalers. Every price is either a contract we signed with the hotel or a quote the hotel sent for your enquiry.'],
    ['How fast is a best-rate offer?', 'We aim to get you the hotel’s offer within an hour during hotel working hours. A request stays open for 24 hours.'],
    ['How are bookings confirmed?', 'Instant bookings are confirmed against rooms we hold with the hotel. Requests stay “pending” until the hotel answers, and you only get a voucher for a confirmed booking.'],
    ['How do I pay?', 'For best-rate hotels, payment and guest arrangements stay directly between the hotel and your agency. For instant bookings, new agencies prepay; credit terms are available after review.'],
    ['Can I send group enquiries?', 'Yes — paste the enquiry in any format. If something is missing, our Group Desk comes back to you; nothing you send is lost.'],
  ];
  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1fr_1.6fr] md:px-6 md:py-24">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-[2.1rem] leading-tight font-semibold tracking-[-0.03em]">Questions, answered plainly.</h2>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {items.map(([q, a]) => (
            <details key={q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}<span className="text-faint transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-[0.94rem] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- final cta ------------------------------- */

function FinalCta() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-[#070b16] px-6 py-14 text-center text-paper md:px-16 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(199,154,74,0.25),transparent_70%)]" />
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hotelbridge-mark-inverse.png" alt="" width={110} height={68} className="mx-auto h-16 w-auto" />
            <h2 className="mt-6 text-[2rem] leading-tight font-semibold tracking-[-0.03em] md:text-[2.8rem]">Book hotels direct — <span className={GOLD}>starting today.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-paper/65">Register your agency in a few minutes. We verify you, and you can start asking hotels for their best rates.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LinkButton href="/register" variant="inverse" size="lg">Register your agency</LinkButton>
              <LinkButton href="/login" size="lg" className="border border-paper/25 bg-transparent hover:bg-paper/10">Agent login</LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
