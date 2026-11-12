import Link from 'next/link';
import { Empty, Money, Notice } from '@/components/ui';
import { SmartSearch } from '@/components/smart-search';
import { SearchForm } from '@/components/search-form';
import { HomeMotion } from '@/components/home/home-motion';
import { listTrips, receivables } from '@/lib/services/trips';
import { aiConfigured } from '@/lib/ai/client';
import { getDb } from '@/lib/db';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { decodeRooms, describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { destinations, recentSearches, whereHotels } from '@/lib/services/search';
import { agentActivity, agentInbox, agentPulse, ago, greetingFor, type InboxItem, type Pulse, type Urgency } from '@/lib/services/agent-today';

export const metadata = { title: 'Today' };

const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` });

export default async function AgentOverview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, actor, agency } = await requireAgent();
  const { welcome } = await searchParams;
  const db = await getDb();
  const today = todayIso();
  const aiOn = aiConfigured();
  const [inbox, pulse, activity, tripRows, searches, dests, partnerHotels] = await Promise.all([
    agentInbox(db, actor), agentPulse(db, actor), agentActivity(db, actor), listTrips(db, actor), recentSearches(db, actor, 3), destinations(db), whereHotels(db),
  ]);
  const owed = receivables(tripRows);
  const actNow = inbox.filter((i) => i.urgency === 'now').length;
  const toDo = inbox.filter((i) => i.urgency !== 'waiting').length;

  return (
    <>
      <HomeMotion />
      <section className="relative isolate z-20 mb-8 rounded-[1.25rem] bg-[#060a14] px-5 py-9 text-paper shadow-[var(--shadow-lift)] md:px-12 md:py-12">
        {/* Glow is clipped on its own layer, so the search dropdown can hang below the hero. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[1.25rem]"><div className="hb-aurora absolute -inset-[30%] bg-[radial-gradient(ellipse_35%_45%_at_80%_20%,rgba(199,154,74,0.22),transparent_65%),radial-gradient(ellipse_40%_50%_at_10%_100%,rgba(37,52,104,0.85),transparent_70%)]" /></div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="hb-rise eyebrow">{agency.name}</p>
            <h1 className="hb-rise mt-3 text-[2.1rem] leading-[1.05] font-light tracking-[-0.04em] md:text-[3rem]" style={delay(60)}>Good {greetingFor(agency.country)}, {user.name.split(' ')[0]}.</h1>
            <p className="hb-rise mt-3 flex items-center gap-2.5 text-[1rem] text-paper/65" style={delay(140)}>
              <span className="relative flex size-2">{actNow > 0 && <span className="hb-ping absolute inline-flex size-full rounded-full bg-[#e0bd78]" />}<span className={`relative inline-flex size-2 rounded-full ${toDo ? 'bg-[#e0bd78]' : 'bg-positive'}`} /></span>
              {toDo === 0 ? 'You’re all caught up.' : actNow > 0 ? `${actNow} thing${actNow > 1 ? 's' : ''} need${actNow > 1 ? '' : 's'} you today${toDo > actNow ? `, ${toDo - actNow} more this week` : ''}.` : `${toDo} thing${toDo > 1 ? 's' : ''} to handle this week.`}
            </p>
          </div>
          <Link href="/agent/groups/new" className="hb-rise rounded-full border border-paper/20 px-4 py-2 text-[0.85rem] text-paper/80 transition-colors hover:border-[#e0bd78]/60 hover:text-paper" style={delay(200)}>10+ rooms? Paste a group enquiry →</Link>
        </div>
        <div className="hb-rise relative z-30 mt-8 text-ink" style={delay(240)}><SearchForm destinations={dests} hotels={partnerHotels} initial={{ rooms: [{ adults: 2, childAges: [] }] }} /></div>
        {aiOn && <div className="hb-rise mt-5 max-w-3xl" style={delay(300)}><p className="mb-2 text-[0.8rem] text-paper/50">Or describe the stay in your own words</p><SmartSearch enabled /></div>}
        {searches.length > 0 && (
          <div className="hb-rise mt-5 flex flex-wrap items-center gap-2 text-[0.8rem]" style={delay(340)}>
            <span className="text-paper/45">Search again</span>
            {searches.map((s) => {
              const rooms = decodeRooms(encodeRooms(s.rooms));
              const past = s.checkIn < today;
              const href = `/agent/search?city=${encodeURIComponent(s.city)}${past ? '' : `&in=${s.checkIn}&out=${s.checkOut}`}&rooms=${encodeRooms(rooms)}`;
              return <Link key={s.id} prefetch={false} href={href} className="rounded-full bg-paper/[0.07] px-3 py-1 text-paper/80 ring-1 ring-paper/10 transition-colors hover:bg-paper/[0.12] hover:text-paper">{s.city}{past ? '' : ` · ${formatDate(s.checkIn, { day: 'numeric', month: 'short' })}`} · {describeRooms(rooms)}</Link>;
            })}
          </div>
        )}
      </section>

      {agency.status === 'pending' && (
        <div className="mb-6"><Notice tone="warning" title={welcome ? 'Your account is ready — verification is next' : 'Verification pending'}>
          You can search and quote now. Booking opens once our team has verified your agency, usually within one working day. We may contact you for your trade licence or registration documents.
        </Notice></div>
      )}
      {(agency.status === 'suspended' || agency.status === 'rejected') && (
        <div className="mb-6"><Notice tone="error" title="Booking is disabled for this account">Please contact HotelBridge.</Notice></div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <TodayList items={inbox} />
        <div className="space-y-6">
          <PulseCard pulse={pulse} />
          {owed.length > 0 && (
            <Link href="/agent/trips?stage=all&owed=1" className="hb-lift block rounded-[var(--radius-lg)] border border-line bg-surface p-5">
              <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">Clients owe you</p>
              {owed.map((o) => (
                <div key={o.currency} className="mt-2 flex items-baseline justify-between gap-3">
                  <Money minor={o.pendingMinor} currency={o.currency} compact className="text-[1.5rem] font-light tracking-[-0.03em]" />
                  <span className="text-[0.78rem] text-muted">{o.trips} trip{o.trips === 1 ? '' : 's'}{o.overdueMinor > 0 && <span className="text-negative"> · <Money minor={o.overdueMinor} currency={o.currency} compact /> overdue</span>}</span>
                </div>
              ))}
              <p className="mt-3 text-[0.82rem] font-medium">Send reminders →</p>
            </Link>
          )}
          <ActivityFeed items={activity} />
        </div>
      </div>

      {dests.length > 0 && (
        <section className="mt-10" data-reveal="">
          <div className="mb-4 flex items-end justify-between"><p className="eyebrow">Destinations</p><Link href="/agent/search" className="text-[0.8rem] text-muted hover:text-ink">{dests.reduce((n, d) => n + d.n, 0)} curated hotels →</Link></div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {dests.map((d) => (
              <Link key={d.city} href={`/agent/search?city=${encodeURIComponent(d.city)}`} className="hb-lift hb-spot group w-40 shrink-0 snap-start rounded-[var(--radius-md)] border border-line bg-surface px-4 py-5 hover:border-champagne/50 sm:w-auto">
                <p className="font-[family-name:var(--font-display)] text-[1.1rem] tracking-[-0.02em]">{d.city}</p>
                <p className="mt-1 text-[0.75rem] text-faint">{d.country} · {d.n} hotel{d.n === 1 ? '' : 's'}</p>
                <div className="mt-4 h-px w-6 bg-champagne transition-all duration-300 group-hover:w-12" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* --------------------------------- today --------------------------------- */

const GROUP_LABEL: Record<Urgency, string> = { now: 'Act now', soon: 'This week', waiting: 'In progress' };
const BAR: Record<Urgency, string> = { now: 'bg-[#c79a4a]', soon: 'bg-ink/30', waiting: 'bg-line-strong' };
const KIND_ICON: Record<InboxItem['kind'], string> = {
  offer: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  payment: 'M3 6h18v12H3zM3 10h18M7 15h3',
  proposal: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.7-5 6-5s6 2 6 5',
  follow_up: 'M5 4h14v16l-7-4-7 4z',
  arrival: 'M3 20h18M5 17l14-6-1.5-3-5 2L8 5 6 6l2.5 5.5-3.5 1.5-1.5-1-1.5.5z',
  asked: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  confirming: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
};

function TodayList({ items }: { items: InboxItem[] }) {
  const groups = (['now', 'soon', 'waiting'] as const).map((u) => ({ u, list: items.filter((i) => i.urgency === u) })).filter((g) => g.list.length);
  let n = 0;
  return (
    <section aria-labelledby="today-h" className="rounded-[var(--radius-lg)] border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id="today-h" className="text-[1.05rem] font-semibold tracking-[-0.01em]">Today</h2>
        <span className="hidden text-[0.78rem] text-faint sm:inline">Offers, payments, follow-ups and arrivals — in one place</span>
      </header>
      {items.length === 0 ? (
        <Empty title="All caught up">New hotel offers, payments due and client follow-ups will appear here the moment they need you.</Empty>
      ) : groups.map(({ u, list }) => (
        <div key={u}>
          <p className="flex items-center gap-2 px-5 pt-4 pb-1 text-[0.68rem] font-medium tracking-[0.16em] text-faint uppercase">{GROUP_LABEL[u]} <span className="num text-muted">{list.length}</span></p>
          <ul className="px-2 pb-2">
            {list.map((i) => (
              <li key={i.key} className="animate-[var(--animate-rise)]" style={{ animationDelay: `${Math.min(n++, 10) * 45}ms` }}>
                <Link href={i.href} className="group relative flex items-center gap-3 rounded-[var(--radius-md)] py-3 pr-3 pl-4 transition-colors hover:bg-mist/70">
                  <span aria-hidden className={`absolute top-3 bottom-3 left-1 w-[3px] rounded-full ${BAR[u]}`} />
                  <span aria-hidden className={`flex size-9 shrink-0 items-center justify-center rounded-full ${u === 'now' ? 'bg-[#fbf3e4] text-champagne' : 'bg-mist text-muted'}`}>
                    <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={KIND_ICON[i.kind]} /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[0.92rem] ${u === 'waiting' ? 'text-muted' : 'font-medium'}`}>{i.title}</span>
                    <span className="block truncate text-[0.78rem] text-faint">{i.detail}</span>
                  </span>
                  <span className={`hidden shrink-0 rounded-full px-3 py-1 text-[0.76rem] font-medium transition-all sm:inline ${u === 'now' ? 'bg-ink text-paper group-hover:bg-[#c79a4a] group-hover:text-ink' : 'text-muted ring-1 ring-line group-hover:text-ink group-hover:ring-ink/30'}`}>{i.cta}</span>
                  <span aria-hidden className="text-faint transition-transform group-hover:translate-x-0.5 sm:hidden">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/* --------------------------------- pulse --------------------------------- */

function replyText(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function PulseCard({ pulse }: { pulse: Pulse }) {
  const max = Math.max(1, ...pulse.weekly.map((w) => w.n));
  const stats: [number, string][] = [[pulse.confirmed, 'bookings confirmed'], [pulse.roomNights, 'room nights'], [pulse.requests, 'best-rate requests'], [pulse.offers, 'offers received']];
  return (
    <section aria-labelledby="pulse-h" className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="pulse-h" className="text-[1.05rem] font-semibold tracking-[-0.01em]">Your {pulse.monthLabel}</h2>
        <Link href="/agent/insights" className="text-[0.78rem] text-muted hover:text-ink">Insights →</Link>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        {stats.map(([n, l]) => (
          <div key={l}><dd className="num text-[1.9rem] leading-none font-light tracking-[-0.03em]" data-count={n}>{n}</dd><dt className="mt-1.5 text-[0.75rem] text-muted">{l}</dt></div>
        ))}
      </dl>
      {pulse.medianReplyMinutes != null && (
        <p className="mt-5 flex items-center gap-2 rounded-[var(--radius-md)] bg-[#fbf6ec] px-3 py-2.5 text-[0.82rem] text-ink">
          <span aria-hidden className="text-champagne">✦</span>Hotels answered your requests in a median of&nbsp;<strong className="font-semibold whitespace-nowrap">{replyText(pulse.medianReplyMinutes)}</strong>
        </p>
      )}
      <figure className="mt-5">
        <figcaption className="mb-2 flex justify-between text-[0.72rem] text-faint"><span>Best-rate requests per week</span><span>last 8 weeks</span></figcaption>
        <div className="flex h-20 items-end gap-[3px]" role="img" aria-label={`Best-rate requests per week, last 8 weeks: ${pulse.weekly.map((w) => w.n).join(', ')}`}>
          {pulse.weekly.map((w, i) => (
            <div key={w.week} className="group relative flex h-full flex-1 items-end">
              <div className={`hb-bar w-full rounded-t-[4px] ${i === pulse.weekly.length - 1 ? 'bg-[#c79a4a]' : 'bg-ink/15 group-hover:bg-ink/30'}`} style={{ height: `${w.n ? Math.max(6, (w.n / max) * 100) : 3}%`, ...delay(i * 60) }} />
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[0.68rem] whitespace-nowrap text-paper opacity-0 transition-opacity group-hover:opacity-100">{w.n} · w/c {formatDate(w.week, { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      </figure>
    </section>
  );
}

/* -------------------------------- activity -------------------------------- */

const DOT = { positive: 'bg-positive', attention: 'bg-attention', neutral: 'bg-line-strong' } as const;

function ActivityFeed({ items }: { items: Awaited<ReturnType<typeof agentActivity>> }) {
  return (
    <section aria-labelledby="act-h" className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h2 id="act-h" className="text-[1.05rem] font-semibold tracking-[-0.01em]">Live activity</h2>
      {items.length === 0 ? <p className="mt-3 text-[0.85rem] text-muted">Your requests, bookings and groups will show here as they move.</p> : (
        <ol className="relative mt-4 space-y-3.5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[3.5px] before:w-px before:bg-line">
          {items.map((a) => (
            <li key={a.key} className="relative pl-5">
              <span aria-hidden className={`absolute top-1.5 left-0 size-2 rounded-full ring-2 ring-surface ${DOT[a.tone]}`} />
              <Link href={a.href} className="block text-[0.84rem] leading-snug hover:underline">{a.text}</Link>
              <p className="text-[0.72rem] text-faint">{ago(a.at)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
