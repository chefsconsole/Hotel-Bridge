/* ------------------------------------------------------------------ *
 * Insights computed from real records only. Money stays per currency;
 * sample (demo) records are excluded unless asked for.
 * ------------------------------------------------------------------ */
import { sql } from 'drizzle-orm';
import type { DB } from '@/lib/db';

const REALISED = sql`('confirmed','amendment_requested','cancellation_requested')`;

type Row = Record<string, unknown>;
async function rows<T extends Row>(db: DB, q: ReturnType<typeof sql>): Promise<T[]> {
  const r = await db.execute(q);
  return ((r as unknown as { rows?: T[] }).rows ?? (r as unknown as T[])).map((x) => x);
}
const n = (v: unknown) => Number(v ?? 0);

/* ------------------------------- agency ------------------------------- */

export async function agencyInsights(db: DB, agencyId: string, days: number) {
  const since = sql`now() - make_interval(days => ${days})`;
  const [totals] = await rows<Row>(db, sql`
    select count(*) as created,
      count(*) filter (where status in ${REALISED}) as confirmed,
      count(*) filter (where status = 'cancelled') as cancelled,
      coalesce(sum(jsonb_array_length(rooms) * (check_out - check_in)) filter (where status in ${REALISED}), 0) as room_nights,
      avg(check_in - created_at::date) filter (where status in ${REALISED}) as lead_days,
      avg(check_out - check_in) filter (where status in ${REALISED}) as avg_nights
    from bookings where agency_id = ${agencyId} and created_at >= ${since}`);
  const value = await rows<Row>(db, sql`
    select currency, sum(sell_minor) as total, count(*) as n from bookings
    where agency_id = ${agencyId} and created_at >= ${since} and status in ${REALISED} group by currency order by 2 desc`);
  const byCity = await rows<Row>(db, sql`
    select h.city, count(*) as bookings, sum(jsonb_array_length(b.rooms) * (b.check_out - b.check_in)) as room_nights
    from bookings b join hotels h on h.id = b.hotel_id
    where b.agency_id = ${agencyId} and b.created_at >= ${since} and b.status in ${REALISED} group by h.city order by 2 desc limit 8`);
  const byHotel = await rows<Row>(db, sql`
    select h.name, h.city, count(*) as bookings from bookings b join hotels h on h.id = b.hotel_id
    where b.agency_id = ${agencyId} and b.created_at >= ${since} and b.status in ${REALISED} group by h.name, h.city order by 3 desc limit 6`);
  const monthly = await rows<Row>(db, sql`
    select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*) as created,
      count(*) filter (where status in ${REALISED}) as confirmed
    from bookings where agency_id = ${agencyId} and created_at >= now() - interval '6 months' group by 1 order by 1`);
  const searches = await rows<Row>(db, sql`
    select city, count(*) as n from search_log where agency_id = ${agencyId} and created_at >= ${since} group by city order by 2 desc limit 6`);
  return {
    created: n(totals.created), confirmed: n(totals.confirmed), cancelled: n(totals.cancelled), roomNights: n(totals.room_nights),
    leadDays: totals.lead_days == null ? null : Math.round(n(totals.lead_days)), avgNights: totals.avg_nights == null ? null : Math.round(n(totals.avg_nights) * 10) / 10,
    value: value.map((r) => ({ currency: String(r.currency), total: n(r.total), n: n(r.n) })),
    byCity: byCity.map((r) => ({ city: String(r.city), bookings: n(r.bookings), roomNights: n(r.room_nights) })),
    byHotel: byHotel.map((r) => ({ name: String(r.name), city: String(r.city), bookings: n(r.bookings) })),
    monthly: monthly.map((r) => ({ month: String(r.month), created: n(r.created), confirmed: n(r.confirmed) })),
    searches: searches.map((r) => ({ city: String(r.city), n: n(r.n) })),
  };
}

/* ------------------------------- platform ------------------------------- */

export async function platformInsights(db: DB, days: number, includeSample: boolean) {
  const since = sql`now() - make_interval(days => ${days})`;
  const sampleB = includeSample ? sql`` : sql`and b.is_sample = false`;
  const sampleA = includeSample ? sql`` : sql`and a.is_sample = false`;

  const demand = await rows<Row>(db, sql`
    with s as (
      select s.city, count(*) as searches, count(distinct s.agency_id) as agencies,
        count(*) filter (where s.result_count = 0) as empty,
        avg(jsonb_array_length(s.rooms)) as avg_rooms, avg(s.check_in - s.created_at::date) as lead_days
      from search_log s join agencies a on a.id = s.agency_id
      where s.created_at >= ${since} ${sampleA} group by s.city),
    bk as (
      select h.city, count(*) as bookings, count(*) filter (where b.status in ${REALISED}) as confirmed
      from bookings b join hotels h on h.id = b.hotel_id where b.created_at >= ${since} ${sampleB} group by h.city)
    select coalesce(s.city, bk.city) as city, coalesce(s.searches,0) as searches, coalesce(s.agencies,0) as agencies, coalesce(s.empty,0) as empty,
      s.avg_rooms, s.lead_days, coalesce(bk.bookings,0) as bookings, coalesce(bk.confirmed,0) as confirmed
    from s full outer join bk on bk.city = s.city order by 2 desc, 7 desc limit 20`);

  const unserved = await rows<Row>(db, sql`
    select entity_id as place, count(*) as n, max(created_at) as last from audit_log
    where action = 'demand.unserved_destination' and created_at >= ${since} group by entity_id order by 2 desc limit 12`);

  const hotels = await rows<Row>(db, sql`
    select h.name, h.city, b.currency, count(*) as bookings,
      count(*) filter (where b.status in ${REALISED}) as confirmed,
      count(*) filter (where b.status = 'cancelled') as cancelled,
      count(*) filter (where b.status = 'declined') as declined,
      coalesce(sum(jsonb_array_length(b.rooms) * (b.check_out - b.check_in)) filter (where b.status in ${REALISED}), 0) as room_nights,
      coalesce(sum(b.sell_minor) filter (where b.status in ${REALISED}), 0) as gbv,
      coalesce(sum(b.net_revenue_minor) filter (where b.status in ${REALISED}), 0) as net,
      (select avg(extract(epoch from (e2.created_at - e1.created_at)) / 3600) from booking_events e1
         join booking_events e2 on e2.booking_id = e1.booking_id and e2.from_status = 'pending_confirmation'
         join bookings bb on bb.id = e1.booking_id
        where e1.to_status = 'pending_confirmation' and bb.hotel_id = h.id) as response_hours
    from bookings b join hotels h on h.id = b.hotel_id where b.created_at >= ${since} ${sampleB}
    group by h.id, h.name, h.city, b.currency order by gbv desc limit 20`);

  const agencies = await rows<Row>(db, sql`
    select a.name, a.country, b.currency, count(*) as bookings,
      count(*) filter (where b.status in ${REALISED}) as confirmed,
      coalesce(sum(b.sell_minor) filter (where b.status in ${REALISED}), 0) as gbv,
      max(b.created_at) as last_booking
    from bookings b join agencies a on a.id = b.agency_id where b.created_at >= ${since} ${sampleB}
    group by a.id, a.name, a.country, b.currency order by gbv desc limit 15`);

  const dormant = await rows<Row>(db, sql`
    select a.name, a.country, max(b.created_at) as last_booking from agencies a join bookings b on b.agency_id = a.id
    where a.status = 'verified' ${sampleA} group by a.id, a.name, a.country
    having max(b.created_at) < now() - interval '45 days' order by 3 desc limit 10`);

  const lead = await rows<Row>(db, sql`
    select case when d < 7 then '0–6 days' when d < 21 then '7–20 days' when d < 60 then '21–59 days' else '60+ days' end as bucket, count(*) as n
    from (select check_in - created_at::date as d from bookings b where b.created_at >= ${since} ${sampleB}) t group by 1 order by min(d)`);

  return {
    demand: demand.map((r) => ({
      city: String(r.city), searches: n(r.searches), agencies: n(r.agencies), empty: n(r.empty),
      avgRooms: r.avg_rooms == null ? null : Math.round(n(r.avg_rooms) * 10) / 10, leadDays: r.lead_days == null ? null : Math.round(n(r.lead_days)),
      bookings: n(r.bookings), confirmed: n(r.confirmed),
    })),
    unserved: unserved.map((r) => ({ place: String(r.place), n: n(r.n), last: new Date(String(r.last)) })),
    hotels: hotels.map((r) => ({
      name: String(r.name), city: String(r.city), currency: String(r.currency), bookings: n(r.bookings), confirmed: n(r.confirmed),
      cancelled: n(r.cancelled), declined: n(r.declined), roomNights: n(r.room_nights), gbv: n(r.gbv), net: n(r.net),
      responseHours: r.response_hours == null ? null : Math.round(n(r.response_hours) * 10) / 10,
    })),
    agencies: agencies.map((r) => ({ name: String(r.name), country: String(r.country), currency: String(r.currency), bookings: n(r.bookings), confirmed: n(r.confirmed), gbv: n(r.gbv), last: new Date(String(r.last_booking)) })),
    dormant: dormant.map((r) => ({ name: String(r.name), country: String(r.country), last: new Date(String(r.last_booking)) })),
    lead: lead.map((r) => ({ bucket: String(r.bucket), n: n(r.n) })),
  };
}
