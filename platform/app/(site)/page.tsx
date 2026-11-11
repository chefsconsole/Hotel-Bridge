import Link from 'next/link';
import { and, eq, sql } from 'drizzle-orm';
import { LinkButton } from '@/components/ui';
import { HomeMotion } from '@/components/home/home-motion';
import { NetworkMap } from '@/components/home/network-map';
import { getDb, schema } from '@/lib/db';

/* Homepage. Every number and every city shown is read from the database — never
 * a marketing figure. Product previews are labelled "Example". Motion is CSS
 * plus one small script (HomeMotion) and stops for reduced-motion users. */

/** Served from the CDN; the live counts refresh every 5 minutes. */
export const revalidate = 300;

type Live = { hotels: number; countries: number; cities: number; rows: { city: string; country: string; n: number }[] };

async function liveNetwork(): Promise<Live | null> {
  try {
    const db = await getDb();
    const live = and(eq(schema.hotels.isSample, false), sql`${schema.hotels.status} <> 'inactive'`);
    const rows = await db.select({ city: schema.hotels.city, country: schema.hotels.country, n: sql<number>`count(*)::int` })
      .from(schema.hotels).where(live).groupBy(schema.hotels.city, schema.hotels.country).orderBy(sql`count(*) desc`, schema.hotels.city);
    return {
      rows,
      hotels: rows.reduce((s, r) => s + r.n, 0),
      cities: rows.length,
      countries: new Set(rows.map((r) => r.country)).size,
    };
  } catch { return null; }
}

export default async function Home() {
  const live = await liveNetwork();
  return (
    <>
      <HomeMotion />
      <DiwaliStrip />
      <Hero live={live} />
      {live && live.rows.length > 0 && <CityRibbon rows={live.rows} />}
      <BestRate />
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
const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` });

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`flex items-center gap-3 text-[0.72rem] font-medium tracking-[0.22em] uppercase ${light ? 'text-[#d9b56f]' : 'text-champagne'}`}><span className="h-px w-8 bg-current" />{children}</p>;
}

function Example() {
  return <span className="absolute top-3 right-3 rounded-full bg-ink/5 px-2 py-0.5 text-[0.62rem] tracking-[0.14em] text-faint uppercase">Example</span>;
}

/** Words that rise in one after another on load. */
function Words({ text, from = 0, className = '' }: { text: string; from?: number; className?: string }) {
  return <>{text.split(' ').map((w, i) => <span key={i} className={`hb-word ${className}`} style={delay(from + i * 70)}>{w}{' '}</span>)}</>;
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

function Hero({ live }: { live: Live | null }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#060a14] text-paper">
      <div aria-hidden className="hb-aurora absolute -inset-[20%] -z-10 bg-[radial-gradient(ellipse_45%_40%_at_75%_30%,rgba(199,154,74,0.26),transparent_60%),radial-gradient(ellipse_50%_45%_at_15%_85%,rgba(37,52,104,0.85),transparent_70%),radial-gradient(ellipse_35%_30%_at_45%_10%,rgba(80,96,160,0.25),transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-[#060a14]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-16 md:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-6 lg:pt-20 lg:pb-24">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="hb-rise mb-6"><img src="/hotelbridge-mark-inverse.png" alt="HotelBridge" width={140} height={86} className="h-16 w-auto md:h-20" /></div>
          <div className="hb-rise" style={delay(80)}><Eyebrow light>B2B hotels for Indian travel agents</Eyebrow></div>
          <h1 className="mt-5 text-[2.9rem] leading-[1] font-semibold tracking-[-0.045em] md:text-[4.6rem]">
            <Words text="Hotels direct." from={150} /><br />
            <span className="hb-word hb-gold-shimmer" style={delay(330)}>No middleman.</span>
          </h1>
          <p className="hb-rise mt-6 max-w-xl text-[1.08rem] leading-relaxed text-paper/70" style={delay(480)}>
            Hand-picked 4★ and 5★ hotels in the destinations your clients book — every rate straight from the hotel.
            Ask for a best rate and get the hotel&apos;s offer within an hour, right in the portal.
          </p>
          <div className="hb-rise mt-9 flex flex-wrap items-center gap-3" style={delay(600)}>
            <LinkButton href="/register" variant="inverse" size="lg" className="shadow-[0_10px_40px_-10px_rgba(199,154,74,0.6)] transition-transform hover:-translate-y-0.5">Register your agency</LinkButton>
            <LinkButton href="/login" size="lg" className="border border-paper/25 bg-transparent hover:bg-paper/10">Agent login</LinkButton>
          </div>
          {live && live.hotels > 0 && (
            <dl className="hb-rise mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-paper/10 pt-6" style={delay(720)}>
              {([[live.hotels, 'partner hotels'], [live.cities, 'destinations'], [live.countries, 'countries']] as const).map(([n, l]) => (
                <div key={l}><dt className="sr-only">{l}</dt><dd><span className="num block text-[2rem] font-semibold tracking-tight" data-count={n}>{n}</span><span className="text-[0.8rem] text-paper/50">{l}</span></dd></div>
              ))}
            </dl>
          )}
        </div>
        {live && live.rows.length > 0 && (
          <figure className="hb-rise relative" style={delay(250)}>
            <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-[#c79a4a]/[0.07] blur-3xl" />
            <NetworkMap cities={live.rows} />
            <figcaption className="mt-2 flex items-center justify-center gap-2 text-[0.75rem] tracking-[0.14em] text-paper/45 uppercase">
              <span className="relative flex size-2"><span className="hb-ping absolute inline-flex size-full rounded-full bg-[#e0bd78]" /><span className="relative inline-flex size-2 rounded-full bg-[#e0bd78]" /></span>
              Live network · {live.cities} destinations
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ city ribbon ------------------------------ */

/** Every city we have hotels in, scrolling. Doubled so the loop is seamless; the copy is hidden from screen readers. */
function CityRibbon({ rows }: { rows: Live['rows'] }) {
  const list = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10">
      {rows.map((r) => (
        <li key={`${r.city}-${r.country}`} className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[1.05rem] font-medium text-paper/85">{r.city.replace(/ \(.*\)/, '')}</span>
          <span className="text-[0.7rem] tracking-[0.16em] text-paper/35 uppercase">{r.country}</span>
          <span aria-hidden className="ml-8 text-[#c79a4a]/60">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Destinations with partner hotels" className="hb-marquee-wrap border-y border-paper/10 bg-[#060a14] py-5">
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="hb-marquee flex w-max" style={{ ['--t' as string]: `${Math.max(40, rows.length * 2.4)}s` }}>{list(false)}{list(true)}</div>
      </div>
    </section>
  );
}

/* ------------------------------- best rate ------------------------------- */

function BestRate() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6 md:py-28">
        <div data-reveal="">
          <Eyebrow>Best rate on request</Eyebrow>
          <h2 className={H2}>Ask the hotel. <span className="text-champagne">Get its offer within the hour.</span></h2>
          <p className="mt-5 max-w-lg text-[1rem] leading-relaxed text-muted">Pick any partner hotel and add your client&apos;s dates and rooms. The request goes to the hotel&apos;s own sales team — not a feed — and their best rate comes back into your portal, ready to quote.</p>
          <ul className="mt-8 space-y-3 text-[0.95rem]">
            {['Straight to the hotel’s sales team', 'Usually below the public price', 'Accept it, or ask another hotel in one click'].map((x) => <li key={x} className="flex gap-3"><span className="text-champagne">✓</span>{x}</li>)}
          </ul>
        </div>
        <RequestCard />
      </div>
    </section>
  );
}

/** How a best-rate request looks — an illustration, labelled as one. Steps light up in turn when it scrolls into view. */
function RequestCard() {
  const steps: [string, string, boolean][] = [
    ['Sent to the hotel’s own sales team', 'Not a booking feed, not a wholesaler', false],
    ['Hotel replies with its best rate', 'Usually below its public price', false],
    ['Offer in your portal', 'Accept it, or ask another hotel in one click', true],
  ];
  return (
    <div data-reveal="" style={delay(120)} className="relative">
      <div aria-hidden className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(199,154,74,0.22),transparent)] blur-xl" />
      <div className="hb-float relative rounded-[1.1rem] border border-paper/10 bg-[#0b1122] p-6 text-paper shadow-[0_50px_100px_-40px_rgb(6_10_20/0.75)] md:p-7">
        <span className="absolute top-4 right-4 rounded-full bg-paper/10 px-2 py-0.5 text-[0.62rem] tracking-[0.14em] text-paper/60 uppercase">Example</span>
        <p className="text-[0.72rem] tracking-[0.16em] text-paper/45 uppercase">Best rate request</p>
        <p className="mt-2 text-[1.15rem] font-medium">4★ beach resort · Phuket</p>
        <p className="text-[0.85rem] text-paper/55">3 nights · 2 rooms · 4 adults, 1 child (6)</p>
        <ol className="mt-6 space-y-4 text-[0.88rem]">
          {steps.map(([t, d, now], i) => (
            <li key={t} className="hb-step grid grid-cols-[22px_1fr] gap-3" style={delay(300 + i * 450)}>
              <span className={`mt-0.5 flex size-[22px] items-center justify-center rounded-full text-[0.7rem] ${now ? 'bg-[#c79a4a] text-ink shadow-[0_0_0_4px_rgba(199,154,74,0.18)]' : 'border border-paper/25 text-paper/70'}`}>{now ? '★' : '✓'}</span>
              <div><p className="font-medium text-paper">{t}</p><p className="text-[0.8rem] text-paper/50">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-center justify-between rounded-[var(--radius-md)] bg-paper/[0.06] px-4 py-3">
          <span className="text-[0.82rem] text-paper/60">Offer within</span>
          <span className="flex items-center gap-3">
            <svg viewBox="0 0 36 36" className="size-8 -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#e0bd78" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset="0.02" className="hb-ring" />
            </svg>
            <span className="text-[1.05rem] font-semibold text-[#e0bd78]">≈ 1 hour</span>
          </span>
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
        <div data-reveal=""><Eyebrow>Why HotelBridge</Eyebrow>
        <h2 className={H2}>Most portals sell you hotels through a chain of APIs. <span className="text-champagne">We go to the hotel.</span></h2></div>
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
          ].map(([t, d], i) => (
            <div key={t} data-reveal="" style={delay(i * 90)} className="hb-lift hb-spot rounded-[var(--radius-lg)] border border-line bg-surface p-5">
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
    <div data-reveal="" style={delay(gold ? 140 : 0)} className={`rounded-[var(--radius-lg)] border p-6 ${gold ? 'border-[#c79a4a]/50 bg-[#fbf6ec] shadow-[0_30px_60px_-40px_rgba(160,127,74,0.55)]' : 'border-line bg-surface'}`}>
      <p className={`text-[0.78rem] font-medium tracking-[0.14em] uppercase ${gold ? 'text-champagne' : 'text-faint'}`}>{title}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-[0.86rem] font-medium ${gold ? (s === 'Hotel' || s === 'You' ? 'bg-ink text-paper' : 'bg-[#c79a4a] text-ink') : 'bg-mist text-muted'}`}>{s}</span>
            {i < steps.length - 1 && <span className={gold ? 'text-champagne' : 'text-faint'}>→</span>}
          </span>
        ))}
      </div>
      <div aria-hidden className="relative mt-6 h-[3px] rounded-full bg-ink/[0.07]">
        {steps.slice(1, -1).map((s, i) => <span key={s} className={`absolute top-1/2 size-2 -translate-y-1/2 rounded-full ${gold ? 'bg-[#c79a4a]' : 'bg-faint/60'}`} style={{ left: `${((i + 1) / (steps.length - 1)) * 100}%` }} />)}
        <span className={`hb-dot-slide absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${gold ? 'bg-[#c79a4a] shadow-[0_0_14px_3px_rgba(199,154,74,0.55)]' : 'bg-muted/60'}`} style={{ ['--t' as string]: gold ? '1.8s' : '6s' }} />
      </div>
      <p className="mt-2 flex justify-between text-[0.72rem] tracking-[0.12em] text-faint uppercase"><span>Your rate request</span><span>{gold ? 'Straight to the hotel' : `${steps.length - 2} hands on the way`}</span></p>
      <p className="mt-4 text-[0.9rem] text-muted">{note}</p>
    </div>
  );
}

/* ------------------------------- features -------------------------------- */

function Features() {
  return (
    <section id="agents" className="scroll-mt-20 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div data-reveal=""><Eyebrow>For travel agents</Eyebrow>
        <h2 className={H2}>Everything you need to sell hotels — in one place.</h2>
        <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted">From the first WhatsApp enquiry to the client&apos;s check-in.</p></div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature d={0} title="Best rate on request" text="Pick a partner hotel, add your client’s dates and rooms. The hotel’s best offer lands in your portal — we aim for within the hour.">
            <MiniRow l="Request" r="Sent to hotel" /><MiniRow l="Offer" r={<span className="font-medium text-positive">Received</span>} /><MiniRow l="Time" r="≈ 1 hour" />
          </Feature>
          <Feature d={80} title="Paste any group enquiry" text="Copy the WhatsApp or email as it is. Our AI sorts it into a group request and sends it to our Group Desk.">
            <p className="rounded-[var(--radius-sm)] bg-[#e7f6e7] px-3 py-2 text-[0.78rem] text-[#24502a]">“40 pax wedding, Phuket 12–15 Feb, 18 DBL + 2 TPL, 5★, BB…”</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{['Phuket', '12–15 Feb', '40 pax', '18 DBL · 2 TPL', '5★', 'Breakfast'].map((c) => <span key={c} className="rounded-full bg-[#fbf6ec] px-2 py-0.5 text-[0.72rem] text-champagne ring-1 ring-[#c79a4a]/30">{c}</span>)}</div>
          </Feature>
          <Feature d={160} title="Your price, your profit" text="Build a quote for your client, set what they pay, and see your profit on every line before you send it.">
            <MiniRow l="Our price to you" r="₹ 41,800" /><MiniRow l="Client pays" r="₹ 46,500" /><MiniRow l="Your profit" r={<span className="font-semibold text-positive">₹ 4,700</span>} />
          </Feature>
          <Feature d={240} title="Clients & follow-ups" text="Every lead, trip and follow-up in one list — so no enquiry goes cold and nobody has to ask what happened.">
            <MiniRow l="Mehta family · Dubai" r={<span className="text-attention">Follow up today</span>} /><MiniRow l="Shah honeymoon · Bali" r="Quote sent" /><MiniRow l="Iyer group · Vietnam" r="Booked" />
          </Feature>
          <Feature d={320} title="Your brand on documents" text="Your agency’s name and logo on the proposals and messages your clients see — HotelBridge stays in the background.">
            <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-line px-3 py-2"><span className="flex size-8 items-center justify-center rounded-full bg-ink text-[0.7rem] font-semibold text-paper">YA</span><div><p className="text-[0.82rem] font-medium">Your Agency</p><p className="text-[0.72rem] text-faint">Proposal for Mr &amp; Mrs Shah</p></div></div>
          </Feature>
          <Feature d={400} title="AI client messages & team logins" text="One click writes the client’s WhatsApp or email for a booking, in their language. Add your staff with their own logins.">
            <p className="ml-auto max-w-[85%] rounded-[var(--radius-sm)] bg-[#dcf8c6] px-3 py-2 text-[0.78rem] text-[#1f3b1f]">Namaste Mr Shah 🙏 Your stay in Bali is confirmed: 4 nights, Deluxe Pool Villa, breakfast included…</p>
          </Feature>
        </div>
      </div>
    </section>
  );
}

function Feature({ title, text, children, d = 0 }: { title: string; text: string; children: React.ReactNode; d?: number }) {
  return (
    <div data-reveal="" style={delay(d)} className="hb-lift hb-spot flex flex-col rounded-[var(--radius-lg)] border border-line bg-paper p-6">
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
        <div data-reveal=""><Eyebrow>Where you can book</Eyebrow>
        <h2 className={H2}>The destinations your clients ask for.</h2></div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map(([t, d], i) => (
            <li key={t} data-reveal="" style={delay(i * 70)} className="hb-lift hb-spot rounded-[var(--radius-lg)] border border-line bg-surface p-6 hover:border-[#c79a4a]/60">
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
        <div data-reveal=""><Eyebrow>How it works</Eyebrow>
        <h2 className={H2}>From enquiry to check-in, in four steps.</h2></div>
        <ol data-reveal="" className="relative mt-12 grid gap-5 md:grid-cols-4">
          <span aria-hidden className="hb-grow absolute top-[2.65rem] right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-[#c79a4a] via-[#c79a4a]/70 to-[#c79a4a]/20 md:block" />
          {steps.map(([t, d], i) => (
            <li key={t} className="hb-step hb-lift relative rounded-[var(--radius-lg)] border border-line bg-paper p-6" style={delay(200 + i * 220)}>
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
        <div data-reveal="">
          <Eyebrow light>Group Desk</Eyebrow>
          <h2 className="mt-4 text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.03em] md:text-[2.8rem]">Groups, MICE and weddings — <span className={GOLD}>just paste the enquiry.</span></h2>
          <p className="mt-5 max-w-lg text-paper/70">Forward it the way your client sent it. We read it, go to the right hotels with full details, and come back with written offers you can accept online.</p>
          <ul className="mt-8 space-y-3 text-[0.94rem] text-paper/80">
            {['Any format — WhatsApp, email or your notes', 'Hotels asked directly for their best group rate', 'Offers compared side by side, with all conditions', 'A reply within 24 hours'].map((x) => <li key={x} className="flex gap-3"><span className={GOLD}>✓</span>{x}</li>)}
          </ul>
          <div className="mt-9"><LinkButton href="/register" variant="inverse" size="lg">Register to send a group</LinkButton></div>
        </div>
        <div data-typing="" className="relative rounded-[var(--radius-lg)] border border-paper/12 bg-[#0e1426] p-6 shadow-[0_50px_100px_-50px_rgba(0,0,0,0.8)]">
          <span className="absolute top-4 right-4 rounded-full bg-paper/10 px-2 py-0.5 text-[0.62rem] tracking-[0.14em] text-paper/60 uppercase">Example</span>
          <p className="text-[0.72rem] tracking-[0.16em] text-paper/45 uppercase">Pasted from WhatsApp</p>
          <p data-type="" className="mt-3 min-h-[6.5rem] rounded-[var(--radius-md)] bg-[#dcf8c6] p-4 text-[0.88rem] text-[#1f3b1f]">Hi! Need hotel for 42 people, Bangkok 3N + Pattaya 2N, 14 Feb onwards. 19 doubles 1 triple. 4 star, breakfast, coach parking needed. Pls send quote by Monday 🙏</p>
          <p data-chip="" className="mt-5 text-[0.72rem] tracking-[0.16em] text-paper/45 uppercase">Sorted by AI</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[0.84rem]">
            {[['Group', '42 travellers'], ['Rooms', '19 DBL · 1 TPL'], ['Bangkok', '3 nights from 14 Feb'], ['Pattaya', '2 nights'], ['Hotels', '4★ · breakfast'], ['Needs', 'Coach parking']].map(([k, v], i) => (
              <div key={k} data-chip="" style={delay(120 + i * 110)} className="rounded-[var(--radius-sm)] bg-paper/[0.06] px-3 py-2 ring-1 ring-[#c79a4a]/0 transition-[box-shadow] hover:ring-[#c79a4a]/40"><p className="text-[0.7rem] text-paper/45">{k}</p><p className="font-medium">{v}</p></div>
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
        <div data-reveal="">
          <Eyebrow>For hotels</Eyebrow>
          <h2 className="mt-4 text-[2rem] leading-tight font-semibold tracking-[-0.03em] md:text-[2.5rem]">Your sales partner for Indian travel agents.</h2>
          <p className="mt-5 max-w-xl text-muted">We feature only a few hotels per destination and send them real enquiries from verified Indian agencies. No reselling — bookings, payment and guests stay between your hotel and the agency.</p>
        </div>
        <div data-reveal="" style={delay(120)} className="hb-spot flex flex-col justify-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
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
        <div data-reveal="" className="divide-y divide-line border-y border-line">
          {items.map(([q, a]) => (
            <details key={q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-faint transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-paper" aria-hidden>+</span>
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
        <div data-reveal="" className="relative overflow-hidden rounded-[1.5rem] bg-[#060a14] px-6 py-14 text-center text-paper md:px-16 md:py-20">
          <div aria-hidden className="hb-aurora absolute -inset-[30%] bg-[radial-gradient(ellipse_40%_50%_at_50%_20%,rgba(199,154,74,0.3),transparent_70%),radial-gradient(ellipse_40%_40%_at_20%_90%,rgba(37,52,104,0.8),transparent_70%)]" />
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hotelbridge-mark-inverse.png" alt="" width={110} height={68} className="hb-float mx-auto h-16 w-auto" />
            <h2 className="mt-6 text-[2rem] leading-tight font-semibold tracking-[-0.03em] md:text-[2.8rem]">Book hotels direct — <span className="hb-gold-shimmer">starting today.</span></h2>
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
