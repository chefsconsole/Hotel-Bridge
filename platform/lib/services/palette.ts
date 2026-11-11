/* ------------------------------------------------------------------ *
 * Cmd+K search. One box that finds real records, scoped to who is asking:
 *  - staff: hotels, agencies, bookings, groups, hotel outreach;
 *  - agents: partner hotels, and only their OWN bookings, groups, clients
 *    and best-rate requests;
 *  - hotel partners: nothing beyond navigation.
 * Sample records are hidden in production, like everywhere else.
 * ------------------------------------------------------------------ */
import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { demoMode } from '@/lib/config';
import type { Actor } from './actor';

export type PaletteHit = { kind: 'Hotel' | 'Agency' | 'Booking' | 'Group' | 'Client' | 'Best rate' | 'Outreach'; title: string; detail: string; href: string };

const LIMIT = 5;
/** Treat what the user types as plain text inside LIKE. */
const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function paletteSearch(db: DB, actor: Actor, raw: string): Promise<PaletteHit[]> {
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return [];
  const p = like(q);
  const { hotels, agencies, bookings, groupEnquiries, clients, rateRequests, hotelProspects } = schema;
  const hideSample = <T>(col: T) => (demoMode ? undefined : eq(col as never, false));

  if (actor.platformRole) {
    const [h, a, b, g, pr] = await Promise.all([
      db.select({ id: hotels.id, name: hotels.name, city: hotels.city, country: hotels.country }).from(hotels)
        .where(and(or(ilike(hotels.name, p), ilike(hotels.city, p)), hideSample(hotels.isSample))).orderBy(hotels.name).limit(LIMIT),
      db.select({ id: agencies.id, name: agencies.name, city: agencies.city, status: agencies.status }).from(agencies)
        .where(and(or(ilike(agencies.name, p), ilike(agencies.city, p)), hideSample(agencies.isSample))).orderBy(agencies.name).limit(LIMIT),
      db.select({ id: bookings.id, ref: bookings.reference, guest: bookings.leadGuest, checkIn: bookings.checkIn, status: bookings.status }).from(bookings)
        .where(and(or(ilike(bookings.reference, p), ilike(bookings.leadGuest, p), ilike(bookings.agentReference, p)), hideSample(bookings.isSample))).orderBy(desc(bookings.createdAt)).limit(LIMIT),
      db.select({ id: groupEnquiries.id, ref: groupEnquiries.reference, name: groupEnquiries.groupName, status: groupEnquiries.status }).from(groupEnquiries)
        .where(and(or(ilike(groupEnquiries.reference, p), ilike(groupEnquiries.groupName, p)), hideSample(groupEnquiries.isSample))).orderBy(desc(groupEnquiries.createdAt)).limit(LIMIT),
      db.select({ id: hotelProspects.id, name: hotelProspects.name, city: hotelProspects.destination, stage: hotelProspects.stage }).from(hotelProspects)
        .where(or(ilike(hotelProspects.name, p), ilike(hotelProspects.destination, p))).orderBy(hotelProspects.name).limit(LIMIT),
    ]);
    return [
      ...h.map((x) => ({ kind: 'Hotel' as const, title: x.name, detail: `${x.city}, ${x.country}`, href: `/admin/hotels/${x.id}` })),
      ...a.map((x) => ({ kind: 'Agency' as const, title: x.name, detail: [x.city, x.status].filter(Boolean).join(' · '), href: `/admin/agencies/${x.id}` })),
      ...b.map((x) => ({ kind: 'Booking' as const, title: x.ref, detail: `${x.guest} · ${x.checkIn} · ${x.status.replace(/_/g, ' ')}`, href: `/admin/bookings/${x.id}` })),
      ...g.map((x) => ({ kind: 'Group' as const, title: x.ref, detail: `${x.name} · ${x.status.replace(/_/g, ' ')}`, href: `/admin/groups/${x.id}` })),
      ...pr.map((x) => ({ kind: 'Outreach' as const, title: x.name, detail: [x.city, x.stage].filter(Boolean).join(' · '), href: `/admin/prospects/${x.id}` })),
    ];
  }

  if (actor.agencyId) {
    const mine = actor.agencyId;
    const [h, b, g, c, r] = await Promise.all([
      db.select({ id: hotels.id, name: hotels.name, city: hotels.city, country: hotels.country }).from(hotels)
        .where(and(eq(hotels.status, 'active'), or(ilike(hotels.name, p), ilike(hotels.city, p)), hideSample(hotels.isSample))).orderBy(hotels.name).limit(LIMIT),
      db.select({ id: bookings.id, ref: bookings.reference, guest: bookings.leadGuest, checkIn: bookings.checkIn, status: bookings.status }).from(bookings)
        .where(and(eq(bookings.agencyId, mine), or(ilike(bookings.reference, p), ilike(bookings.leadGuest, p), ilike(bookings.agentReference, p)))).orderBy(desc(bookings.createdAt)).limit(LIMIT),
      db.select({ id: groupEnquiries.id, ref: groupEnquiries.reference, name: groupEnquiries.groupName, status: groupEnquiries.status }).from(groupEnquiries)
        .where(and(eq(groupEnquiries.agencyId, mine), or(ilike(groupEnquiries.reference, p), ilike(groupEnquiries.groupName, p)))).orderBy(desc(groupEnquiries.createdAt)).limit(LIMIT),
      db.select({ id: clients.id, name: clients.name, city: clients.city }).from(clients)
        .where(and(eq(clients.agencyId, mine), ilike(clients.name, p))).orderBy(clients.name).limit(LIMIT),
      db.select({ id: rateRequests.id, ref: rateRequests.reference, hotel: rateRequests.hotelName, status: rateRequests.status }).from(rateRequests)
        .where(and(eq(rateRequests.agencyId, mine), ne(rateRequests.status, 'cancelled'), or(ilike(rateRequests.reference, p), ilike(rateRequests.hotelName, p)))).orderBy(desc(rateRequests.createdAt)).limit(LIMIT),
    ]);
    return [
      ...h.map((x) => ({ kind: 'Hotel' as const, title: x.name, detail: `${x.city}, ${x.country}`, href: `/agent/hotels/${x.id}` })),
      ...b.map((x) => ({ kind: 'Booking' as const, title: x.ref, detail: `${x.guest} · ${x.checkIn} · ${x.status.replace(/_/g, ' ')}`, href: `/agent/bookings/${x.id}` })),
      ...g.map((x) => ({ kind: 'Group' as const, title: x.ref, detail: `${x.name} · ${x.status.replace(/_/g, ' ')}`, href: `/agent/groups/${x.id}` })),
      ...c.map((x) => ({ kind: 'Client' as const, title: x.name, detail: x.city ?? '', href: `/agent/clients/${x.id}` })),
      ...r.map((x) => ({ kind: 'Best rate' as const, title: x.ref, detail: `${x.hotel} · ${x.status.replace(/_/g, ' ')}`, href: `/agent/rate-requests/${x.id}` })),
    ];
  }
  return [];
}
