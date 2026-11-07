import type { Metadata } from 'next';
import { LinkButton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Happy Diwali from HotelBridge',
  description: 'This Diwali, HotelBridge goes live: hotels direct, no APIs, no middleman — for Indian travel agents.',
};

/** Destinations where partner hotels are loaded today (see data/partners.ts). */
const DESTINATIONS: [string, string][] = [
  ['Thailand', 'Phuket, Bangkok, Pattaya, Krabi'],
  ['Vietnam', 'Hanoi, Da Nang'],
  ['Bali, Singapore & Hong Kong', 'Hand-picked city and resort hotels'],
  ['Dubai & the Maldives', 'Groups, MICE and leisure'],
  ['Europe', 'London, Switzerland, Paris, Rome, Amsterdam, Prague, Vienna'],
  ['India', 'Kerala, Goa, Agra, Varanasi, Srinagar, the hills and more'],
];

const PROMISES: [string, string][] = [
  ['Direct to the hotel', 'No APIs and no wholesalers. Every rate is a direct contract or a direct quote from the hotel’s own team.'],
  ['Confirmed by the hotel', 'Your booking is confirmed by the hotel itself — not by a system several steps away from the room.'],
  ['Best offer within 1 hour', 'Send your client’s dates and rooms, and we aim to get you the hotel’s best offer within an hour, right in the portal.'],
  ['Groups on request', 'Bigger groups, MICE and weddings go to the hotel with full details, for their best group rate.'],
];

export default function DiwaliPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <Diyas />
        <div className="mx-auto max-w-4xl px-4 pt-20 pb-24 text-center md:px-6 md:pt-28 md:pb-28">
          <p className="eyebrow">शुभ दीपावली · Happy Diwali</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] md:text-[4rem]">
            A new light for<br />Indian travel agents.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[1.08rem] leading-relaxed text-paper/70">
            This Diwali, HotelBridge goes live. A small, hand-picked set of hotels in each destination —
            and every rate comes straight from the hotel, with no middleman in between.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/register" variant="inverse" size="lg">Register your agency</LinkButton>
            <LinkButton href="/login" size="lg" className="border border-paper/25 bg-transparent hover:bg-paper/10">Open the agent portal</LinkButton>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="eyebrow">Our Diwali promise to you</p>
          <h2 className="mt-3 max-w-2xl text-[1.9rem] leading-tight font-semibold tracking-[-0.025em] md:text-[2.4rem]">Hotels direct. No APIs. No middleman.</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map(([t, d]) => (
              <div key={t} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
                <p className="font-semibold">{t}</p>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="eyebrow">Where you can book today</p>
          <h2 className="mt-3 text-[1.9rem] leading-tight font-semibold tracking-[-0.025em] md:text-[2.4rem]">The destinations your clients ask for.</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS.map(([t, d]) => (
              <li key={t} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-[0.9rem] text-muted">{d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-14 rounded-[var(--radius-lg)] bg-ink p-8 text-center text-paper md:p-12">
            <p className="text-[1.4rem] font-semibold tracking-[-0.02em] md:text-[1.8rem]">May this Diwali bring you full bookings and happy clients.</p>
            <p className="mt-3 text-paper/65">— Ronak and the HotelBridge team</p>
            <div className="mt-7 flex justify-center">
              <LinkButton href="/register" variant="inverse" size="lg">Register your agency</LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Decorative row of diyas (SVG, no images). */
function Diyas() {
  return (
    <svg className="absolute inset-x-0 bottom-0 -z-10 h-28 w-full opacity-60" viewBox="0 0 1200 110" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-champagne)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-champagne)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: 9 }, (_, i) => {
        const x = 70 + i * 132;
        return (
          <g key={i}>
            <circle cx={x} cy={58} r={34} fill="url(#glow)" />
            <path d={`M${x} 40c-6 8-8 14-4 20 2 3 6 3 8 0 4-6 2-12-4-20z`} fill="var(--color-champagne)" />
            <path d={`M${x - 26} 72h52c-4 14-14 22-26 22s-22-8-26-22z`} fill="#b86b2b" />
          </g>
        );
      })}
    </svg>
  );
}
