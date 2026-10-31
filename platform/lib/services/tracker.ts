/* ------------------------------------------------------------------ *
 * The hotel tracker: who arrives when (FIT bookings and Group Desk
 * groups), and the money with each hotel — what we owe it for prepaid
 * stays and what it owes us in commission for pay-at-hotel stays.
 *
 * Money comes only from the ledger, per currency, never added across
 * currencies. Settlements (we paid the hotel / the hotel paid our
 * commission) are ledger rows carrying the hotel, not a booking.
 * ------------------------------------------------------------------ */
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { addDays, daysBetween, isIsoDate } from '@/lib/domain/dates';
import { LIVE_STATUSES } from '@/lib/domain/booking-state';
import { requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { AppError, ForbiddenError } from './errors';
import { post } from './ledger';

const { bookings, hotels, agencies, groupEnquiries, groupProposals, groupOffers } = schema;

export type Arrival = {
  type: 'fit' | 'group';
  date: string; nights: number;
  hotelId: string | null; hotelName: string; city: string;
  reference: string; href: string; agencyName: string; leadName: string;
  rooms: number; pax: number; status: string;
  currency: string | null;
  sellMinor: number | null; costMinor: number | null; // what the agent pays / what the hotel gets
  ourMinor: number | null; // HotelBridge net revenue
  collection: 'prepaid_to_hb' | 'pay_direct_to_hotel' | 'group' | null;
};

/** Arrivals between two dates (inclusive). Optionally one hotel (partner view). */
export async function arrivals(db: DB, range: { from: string; to: string; hotelId?: string }): Promise<Arrival[]> {
  if (!isIsoDate(range.from) || !isIsoDate(range.to)) throw new AppError('Invalid dates');
  const out: Arrival[] = [];
  const bs = await db.select({ b: bookings, hotel: hotels.name, city: hotels.city, agency: agencies.name })
    .from(bookings).innerJoin(hotels, eq(hotels.id, bookings.hotelId)).innerJoin(agencies, eq(agencies.id, bookings.agencyId))
    .where(and(gte(bookings.checkIn, range.from), lte(bookings.checkIn, range.to), inArray(bookings.status, LIVE_STATUSES),
      range.hotelId ? eq(bookings.hotelId, range.hotelId) : undefined))
    .orderBy(asc(bookings.checkIn));
  for (const { b, hotel, city, agency } of bs) {
    out.push({
      type: 'fit', date: b.checkIn, nights: daysBetween(b.checkIn, b.checkOut), hotelId: b.hotelId, hotelName: hotel, city,
      reference: b.reference, href: `/admin/bookings/${b.id}`, agencyName: agency, leadName: b.leadGuest,
      rooms: b.rooms.length, pax: b.rooms.reduce((s, r) => s + r.adults + r.childAges.length, 0), status: b.status,
      currency: b.currency, sellMinor: b.sellMinor, costMinor: b.supplierCostMinor, ourMinor: b.netRevenueMinor,
      collection: b.collectionModel as Arrival['collection'],
    });
  }
  if (range.hotelId) return out; // group legs are matched by hotel name, staff view only

  // Groups: won enquiries, the hotels in the accepted proposal, on the matching leg's dates.
  const won = await db.select({ e: groupEnquiries, p: groupProposals, agency: agencies.name })
    .from(groupEnquiries).innerJoin(groupProposals, and(eq(groupProposals.enquiryId, groupEnquiries.id), eq(groupProposals.status, 'accepted')))
    .innerJoin(agencies, eq(agencies.id, groupEnquiries.agencyId))
    .where(eq(groupEnquiries.status, 'won'));
  for (const { e, p, agency } of won) {
    const offers = p.offerIds.length ? await db.select().from(groupOffers).where(inArray(groupOffers.id, p.offerIds)) : [];
    const rooms = e.rooms.single + e.rooms.double + e.rooms.twin + e.rooms.triple;
    for (const o of offers) {
      const leg = e.legs.find((l) => l.city.trim().toLowerCase() === o.city.trim().toLowerCase()) ?? e.legs[0];
      if (!leg?.checkIn || leg.checkIn < range.from || leg.checkIn > range.to) continue;
      out.push({
        type: 'group', date: leg.checkIn, nights: leg.checkOut ? daysBetween(leg.checkIn, leg.checkOut) : 0, hotelId: null, hotelName: o.hotelName, city: o.city,
        reference: e.reference, href: `/admin/groups/${e.id}`, agencyName: agency, leadName: e.groupName,
        rooms, pax: e.totalPax, status: 'won', currency: o.currency, sellMinor: null, costMinor: o.costTotalMinor, ourMinor: null, collection: 'group',
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.hotelName.localeCompare(b.hotelName));
}

export type HotelAccount = { hotelId: string; currency: string; weOweMinor: number; theyOweMinor: number };

/** Open balances with each hotel, per currency, from the ledger. */
export async function hotelAccounts(db: DB, hotelId?: string): Promise<HotelAccount[]> {
  const res = await db.execute(sql`
    select coalesce(l.hotel_id, b.hotel_id) as hotel_id, l.currency,
      coalesce(sum(l.amount_minor) filter (where l.account = 'supplier'), 0) as we_owe,
      coalesce(sum(l.amount_minor) filter (where l.account = 'commission'), 0) as they_owe
    from ledger_entries l left join bookings b on b.id = l.booking_id
    where l.account in ('supplier', 'commission') and coalesce(l.hotel_id, b.hotel_id) is not null
      ${hotelId ? sql`and coalesce(l.hotel_id, b.hotel_id) = ${hotelId}` : sql``}
    group by 1, 2`);
  const rows = (res as unknown as { rows?: Record<string, unknown>[] }).rows ?? (res as unknown as Record<string, unknown>[]);
  return rows.map((r) => ({ hotelId: String(r.hotel_id), currency: String(r.currency), weOweMinor: Number(r.we_owe), theyOweMinor: Number(r.they_owe) }))
    .filter((a) => a.weOweMinor !== 0 || a.theyOweMinor !== 0);
}

export type HotelVolume = { hotelId: string; currency: string; bookings: number; roomNights: number; sellMinor: number; costMinor: number; ourMinor: number };

/** Volume per hotel for stays starting in a period (live and completed bookings, not cancelled). */
export async function hotelVolume(db: DB, range: { from: string; to: string; hotelId?: string }): Promise<HotelVolume[]> {
  const res = await db.execute(sql`
    select hotel_id, currency, count(*)::int as n,
      coalesce(sum(jsonb_array_length(rooms) * (check_out - check_in)), 0)::int as room_nights,
      coalesce(sum(sell_minor), 0) as sell, coalesce(sum(supplier_cost_minor), 0) as cost, coalesce(sum(net_revenue_minor), 0) as ours
    from bookings
    where check_in between ${range.from} and ${range.to}
      and status in ('confirmed', 'amendment_requested', 'cancellation_requested', 'awaiting_payment', 'pending_confirmation')
      ${range.hotelId ? sql`and hotel_id = ${range.hotelId}` : sql``}
    group by 1, 2`);
  const rows = (res as unknown as { rows?: Record<string, unknown>[] }).rows ?? (res as unknown as Record<string, unknown>[]);
  return rows.map((r) => ({
    hotelId: String(r.hotel_id), currency: String(r.currency), bookings: Number(r.n), roomNights: Number(r.room_nights),
    sellMinor: Number(r.sell), costMinor: Number(r.cost), ourMinor: Number(r.ours),
  }));
}

export const settlementSchema = z.object({
  hotelId: z.string().uuid(),
  direction: z.enum(['paid_hotel', 'commission_received']),
  currency: z.string().min(3).max(3),
  amountMinor: z.number().int().positive('Enter the amount'),
  reference: z.string().trim().min(2, 'Bank reference is required').max(120),
});

/** Finance records money moving between HotelBridge and a hotel. */
export async function recordHotelSettlement(db: DB, actor: Actor, input: z.input<typeof settlementSchema>) {
  requireStaff(actor, ['admin', 'finance']);
  const s = settlementSchema.parse(input);
  const acc = (await hotelAccounts(db, s.hotelId)).find((a) => a.currency === s.currency);
  const open = s.direction === 'paid_hotel' ? acc?.weOweMinor ?? 0 : acc?.theyOweMinor ?? 0;
  if (s.amountMinor > open) throw new AppError(s.direction === 'paid_hotel' ? 'That is more than we owe this hotel' : 'That is more commission than this hotel owes');
  await post(db, actor, [{
    hotelId: s.hotelId, bookingId: null, agencyId: null,
    kind: s.direction === 'paid_hotel' ? 'supplier_payment' : 'commission_received',
    account: s.direction === 'paid_hotel' ? 'supplier' : 'commission',
    amountMinor: -s.amountMinor, currency: s.currency, reference: s.reference,
    memo: s.direction === 'paid_hotel' ? 'Paid to hotel' : 'Commission received from hotel',
  }]);
  await audit(db, actor, `hotel.${s.direction}`, 'hotel', s.hotelId, { amountMinor: s.amountMinor, currency: s.currency, reference: s.reference });
}

/** Partner users see only their own hotel. */
export function partnerHotel(actor: Actor): string {
  if (!actor.partnerHotelId) throw new ForbiddenError();
  return actor.partnerHotelId;
}

export const windowFor = (key: string, today: string) => {
  switch (key) {
    case 'today': return { from: today, to: today };
    case 'tomorrow': return { from: addDays(today, 1), to: addDays(today, 1) };
    case '30': return { from: today, to: addDays(today, 30) };
    default: return { from: today, to: addDays(today, 7) };
  }
};
