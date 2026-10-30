import Link from 'next/link';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { StatusPill } from '@/components/booking-bits';
import { Empty, LinkButton, Money, Notice, PageHeader, Panel } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { decodeRooms, describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { recentSearches } from '@/lib/services/search';
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
  const [upcoming, attention, recent, searches, proposals, groups] = await Promise.all([
    db.select({ b, hotel: h.name }).from(b).innerJoin(h, eq(h.id, b.hotelId))
      .where(and(eq(b.agencyId, agency.id), inArray(b.status, ['confirmed', 'amendment_requested', 'cancellation_requested']), gte(b.checkIn, today))).orderBy(b.checkIn).limit(5),
    db.select({ b, hotel: h.name }).from(b).innerJoin(h, eq(h.id, b.hotelId))
      .where(and(eq(b.agencyId, agency.id), inArray(b.status, ['awaiting_payment', 'pending_confirmation', 'outcome_unknown']))).orderBy(b.createdAt),
    db.select({ b, hotel: h.name }).from(b).innerJoin(h, eq(h.id, b.hotelId)).where(eq(b.agencyId, agency.id)).orderBy(desc(b.createdAt)).limit(5),
    recentSearches(db, actor, 4),
    proposalsAwaitingAgent(db, agency.id),
    db.select().from(schema.groupEnquiries).where(eq(schema.groupEnquiries.agencyId, agency.id)).orderBy(desc(schema.groupEnquiries.updatedAt)).limit(4),
  ]);

  return (
    <>
      <PageHeader eyebrow={agency.name} title={`Good to see you, ${user.name.split(' ')[0]}.`}
        actions={<><LinkButton href="/agent/search">Search hotels</LinkButton><LinkButton href="/agent/groups/new" variant="secondary">Group request</LinkButton></>} />

      {agency.status === 'pending' && (
        <div className="mb-6"><Notice tone="warning" title={welcome ? 'Your account is ready — verification is next' : 'Verification pending'}>
          You can search and quote now. Booking opens once our team has verified your agency, usually within one working day. We may contact you for your trade licence or registration documents.
        </Notice></div>
      )}
      {(agency.status === 'suspended' || agency.status === 'rejected') && (
        <div className="mb-6"><Notice tone="error" title="Booking is disabled for this account">Please contact HotelBridge.</Notice></div>
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
                  <span className="num text-[0.82rem] text-muted">{b.reference}</span>
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
