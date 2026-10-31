import Link from 'next/link';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { StatusPill } from '@/components/booking-bits';
import { Empty, LinkButton, Money, Notice, Panel } from '@/components/ui';
import { SmartSearch } from '@/components/smart-search';
import { SearchForm } from '@/components/search-form';
import { dueFollowUps, listTrips, receivables } from '@/lib/services/trips';
import { aiConfigured } from '@/lib/ai/client';
import { getDb, schema } from '@/lib/db';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { decodeRooms, describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { destinations, recentSearches } from '@/lib/services/search';
import { proposalsAwaitingAgent } from '@/lib/services/metrics';
import { STAGE_LABEL } from '@/lib/services/groups';

export const metadata = { title: 'Overview' };

export default async function AgentOverview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, actor, agency } = await requireAgent();
  const { welcome } = await searchParams;
  const db = await getDb();
  const b = schema.bookings;
  const h = schema.hotels;
  const today = todayIso();
  const aiOn = aiConfigured();
  const [followUps, tripRows] = await Promise.all([dueFollowUps(db, actor), listTrips(db, actor)]);
  const owed = receivables(tripRows);
  const overdueTrips = tripRows.filter((r) => r.overdue).slice(0, 4);
  const [upcoming, attention, recent, searches, proposals, groups, dests] = await Promise.all([
    db.select({ b, hotel: h.name }).from(b).innerJoin(h, eq(h.id, b.hotelId))
      .where(and(eq(b.agencyId, agency.id), inArray(b.status, ['confirmed', 'amendment_requested', 'cancellation_requested']), gte(b.checkIn, today))).orderBy(b.checkIn).limit(5),
    db.select({ b, hotel: h.name }).from(b).innerJoin(h, eq(h.id, b.hotelId))
      .where(and(eq(b.agencyId, agency.id), inArray(b.status, ['awaiting_payment', 'pending_confirmation', 'outcome_unknown']))).orderBy(b.createdAt),
    db.select({ b, hotel: h.name }).from(b).innerJoin(h, eq(h.id, b.hotelId)).where(eq(b.agencyId, agency.id)).orderBy(desc(b.createdAt)).limit(5),
    recentSearches(db, actor, 4),
    proposalsAwaitingAgent(db, agency.id),
    db.select().from(schema.groupEnquiries).where(eq(schema.groupEnquiries.agencyId, agency.id)).orderBy(desc(schema.groupEnquiries.updatedAt)).limit(4),
    destinations(db),
  ]);

  return (
    <>
      <section className="relative isolate mb-10 rounded-[var(--radius-lg)] bg-ink px-6 py-10 text-paper shadow-[var(--shadow-lift)] md:px-12 md:py-14">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[var(--radius-lg)]" aria-hidden>
        <svg viewBox="0 0 400 160" className="absolute -right-10 -bottom-6 w-[520px] max-w-[70%] opacity-40">
          <path d="M0 150C80 60 150 20 200 20s120 40 200 130" fill="none" stroke="var(--color-champagne)" strokeWidth="0.8" />
          <path d="M40 150C110 80 160 50 200 50s90 30 160 100" fill="none" stroke="var(--color-champagne)" strokeWidth="0.5" opacity="0.6" />
        </svg>
        </div>
        <p className="eyebrow">{agency.name}</p>
        <h1 className="mt-4 text-[2.2rem] leading-[1.05] font-light tracking-[-0.04em] md:text-[3.2rem]">Good {greeting()}, {user.name.split(' ')[0]}.</h1>
        <p className="mt-3 max-w-lg text-[1rem] text-paper/60">Where are your clients going?</p>
        <div className="mt-8 max-w-5xl text-ink"><SearchForm destinations={dests} initial={{ rooms: [{ adults: 2, childAges: [] }] }} /></div>
        {aiOn && (
          <div className="mt-6 max-w-3xl">
            <p className="mb-2 text-[0.8rem] text-paper/50">Or describe the stay in your own words</p>
            <SmartSearch enabled />
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[0.88rem] text-paper/60">
          <Link href="/agent/groups/new" className="underline decoration-paper/25 underline-offset-4 hover:text-paper">More than 9 rooms? Request a group quote</Link>
        </div>
      </section>

      {dests.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between"><p className="eyebrow">Destinations</p><p className="text-[0.8rem] text-faint">{dests.reduce((n, d) => n + d.n, 0)} curated hotels</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {dests.map((d) => (
              <Link key={d.city} href={`/agent/search?city=${encodeURIComponent(d.city)}`} className="group rounded-[var(--radius-md)] border border-line bg-surface px-4 py-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:border-champagne/50">
                <p className="font-[family-name:var(--font-display)] text-[1.1rem] tracking-[-0.02em]">{d.city}</p>
                <p className="mt-1 text-[0.75rem] text-faint">{d.country} · {d.n} hotel{d.n === 1 ? '' : 's'}</p>
                <div className="mt-4 h-px w-6 bg-champagne transition-all duration-300 group-hover:w-12" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {agency.status === 'pending' && (
        <div className="mb-6"><Notice tone="warning" title={welcome ? 'Your account is ready — verification is next' : 'Verification pending'}>
          You can search and quote now. Booking opens once our team has verified your agency, usually within one working day. We may contact you for your trade licence or registration documents.
        </Notice></div>
      )}
      {(agency.status === 'suspended' || agency.status === 'rejected') && (
        <div className="mb-6"><Notice tone="error" title="Booking is disabled for this account">Please contact HotelBridge.</Notice></div>
      )}

      {tripRows.length > 0 && (
        <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title="Your clients today" padded={false} actions={<Link href="/agent/trips" className="text-[0.82rem] text-muted hover:text-ink">All trips</Link>}>
            {followUps.length === 0 && overdueTrips.length === 0 ? <Empty title="No follow-ups due">Every lead has a next step in the future.</Empty> : (
              <ul className="divide-y divide-line">
                {followUps.slice(0, 5).map(({ trip: t, clientName }) => (
                  <li key={t.id}><Link href={`/agent/trips/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-mist/50">
                    <span className="min-w-0"><span className="font-medium">{clientName}</span> <span className="text-muted">· {t.followUpNote ?? 'Follow up'}</span></span>
                    <span className={`text-[0.8rem] font-medium ${t.followUpOn! < today ? 'text-negative' : 'text-attention'}`}>{t.followUpOn! < today ? `Overdue · ${formatDate(t.followUpOn!, { day: 'numeric', month: 'short' })}` : 'Today'}</span>
                  </Link></li>
                ))}
                {overdueTrips.map(({ trip: t, client, totals }) => (
                  <li key={`o-${t.id}`}><Link href={`/agent/trips/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-mist/50">
                    <span className="min-w-0"><span className="font-medium">{client.name}</span> <span className="text-muted">· payment overdue · {t.title}</span></span>
                    <Money minor={totals.pendingMinor} currency={t.currency} compact className="font-medium text-negative" />
                  </Link></li>
                ))}
              </ul>
            )}
          </Panel>
          <Link href="/agent/trips?stage=all&owed=1" className="block rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
            <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">Clients owe you</p>
            {owed.length === 0 ? <p className="mt-3 font-[family-name:var(--font-display)] text-[1.8rem] font-light">—</p> : owed.map((o) => (
              <div key={o.currency} className="mt-3">
                <Money minor={o.pendingMinor} currency={o.currency} compact className="font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light tracking-[-0.03em]" />
                <p className="mt-1 text-[0.78rem] text-muted">{o.trips} trip{o.trips === 1 ? '' : 's'}{o.overdueMinor > 0 && <span className="text-negative"> · <Money minor={o.overdueMinor} currency={o.currency} compact /> overdue</span>}</p>
              </div>
            ))}
            <p className="mt-4 text-[0.82rem] font-medium">Send reminders →</p>
          </Link>
        </div>
      )}

      {(attention.length > 0 || proposals.length > 0) && (
        <Panel title="Needs your attention" className="mb-6" padded={false}>
          <ul className="divide-y divide-line">
            {attention.map(({ b, hotel }) => (
              <li key={b.id}><Link href={`/agent/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-mist/50">
                <span><span className="num font-medium">{b.reference}</span> <span className="text-muted">· {hotel} · {formatDate(b.checkIn)}</span></span>
                <span className="flex items-center gap-3">
                  {b.status === 'awaiting_payment' && b.paymentDueAt && <span className="text-[0.8rem] text-attention">Pay by {formatDate(b.paymentDueAt)}</span>}
                  <StatusPill status={b.status} />
                </span>
              </Link></li>
            ))}
            {proposals.map(({ p, e }) => (
              <li key={p.id}><Link href={`/agent/groups/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-mist/50">
                <span><span className="num font-medium">{e.reference}</span> <span className="text-muted">· proposal v{p.version} ready · valid until {formatDate(p.validUntil)}</span></span>
                <Money minor={p.sellTotalMinor} currency={p.currency} className="font-medium" />
              </Link></li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Upcoming stays" padded={false} actions={<Link href="/agent/bookings?f=confirmed" className="text-[0.82rem] text-muted hover:text-ink">All</Link>}>
          {upcoming.length === 0 ? <Empty title="No upcoming confirmed stays" /> : (
            <ul className="divide-y divide-line">
              {upcoming.map(({ b, hotel }) => (
                <li key={b.id}><Link href={`/agent/bookings/${b.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-mist/50">
                  <div><p className="font-medium">{hotel}</p><p className="text-[0.8rem] text-muted">{b.leadGuest} · {formatDate(b.checkIn)} – {formatDate(b.checkOut)}</p></div>
                  <span className="num shrink-0 text-[0.82rem] whitespace-nowrap text-muted">{b.reference}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent bookings" padded={false} actions={<Link href="/agent/bookings" className="text-[0.82rem] text-muted hover:text-ink">All</Link>}>
          {recent.length === 0 ? <Empty title="No bookings yet" action={<LinkButton href="/agent/search" size="sm">Make your first booking</LinkButton>} /> : (
            <ul className="divide-y divide-line">
              {recent.map(({ b, hotel }) => (
                <li key={b.id}><Link href={`/agent/bookings/${b.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-mist/50">
                  <div><p className="font-medium">{hotel}</p><p className="text-[0.8rem] text-muted"><span className="num">{b.reference}</span> · {formatDate(b.checkIn)}</p></div>
                  <StatusPill status={b.status} />
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent searches" padded={false}>
          {searches.length === 0 ? <Empty title="No searches yet" /> : (
            <ul className="divide-y divide-line">
              {searches.map((s) => {
                const rooms = decodeRooms(encodeRooms(s.rooms));
                const past = s.checkIn < today;
                const href = past
                  ? `/agent/search?city=${encodeURIComponent(s.city)}&rooms=${encodeRooms(rooms)}`
                  : `/agent/search?city=${encodeURIComponent(s.city)}&in=${s.checkIn}&out=${s.checkOut}&rooms=${encodeRooms(rooms)}`;
                return (
                  <li key={s.id}>
                    <Link prefetch={false} href={href} className="flex items-center justify-between px-5 py-3.5 hover:bg-mist/50">
                      <span><span className="font-medium">{s.city}</span> <span className="text-[0.82rem] text-muted">· {formatDate(s.checkIn)} – {formatDate(s.checkOut)} · {describeRooms(rooms)}</span></span>
                      <span className="text-[0.8rem] text-muted">{past ? 'Dates passed' : 'Search again →'}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Group requests" padded={false} actions={<Link href="/agent/groups" className="text-[0.82rem] text-muted hover:text-ink">All</Link>}>
          {groups.length === 0 ? <Empty title="No group requests" action={<LinkButton href="/agent/groups/new" size="sm" variant="secondary">Start one</LinkButton>}>For 10+ rooms, multi-city tours or special requirements.</Empty> : (
            <ul className="divide-y divide-line">
              {groups.map((g) => (
                <li key={g.id}><Link href={`/agent/groups/${g.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-mist/50">
                  <div><p className="font-medium">{g.groupName}</p><p className="text-[0.8rem] text-muted"><span className="num">{g.reference}</span> · {g.totalPax} pax · {g.legs.map((l) => l.city).join(' → ')}</p></div>
                  <span className="text-[0.8rem] text-muted">{STAGE_LABEL[g.status]}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function greeting() {
  // Server time; good enough for a greeting.
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}
