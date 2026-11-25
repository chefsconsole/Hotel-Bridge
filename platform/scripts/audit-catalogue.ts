/* npx tsx scripts/audit-catalogue.ts
 *
 * Read-only health check of the catalogue and the outreach register. Reports
 * only — it never writes. Run it after loading contracts, or whenever the
 * portal's numbers look wrong.
 *
 * It exists because a contract can be perfectly loaded and still be unsellable:
 * in November 2026 nine hotels held active contracts with rates loaded but
 * were still flagged "best rate on request", and searchHotels drops those
 * hotels from results — so the rates we had negotiated were invisible to every
 * agent. Nothing in the UI showed that. Check 3 is that bug.
 */
import './env';
import { sql } from 'drizzle-orm';
import { closeDb, getDb } from '@/lib/db';

const q = async (db: Awaited<ReturnType<typeof getDb>>, s: ReturnType<typeof sql>) => {
  const r = await db.execute(s);
  return ((r as unknown as { rows?: Record<string, unknown>[] }).rows ?? r) as Record<string, unknown>[];
};

async function main() {
  const db = await getDb();
  const section = (t: string) => console.log(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`);
  const show = (rows: Record<string, unknown>[], empty = 'none') => {
    if (!rows.length) { console.log(`  ${empty}`); return; }
    for (const r of rows) console.log('  ' + Object.entries(r).map(([k, v]) => `${k}=${v ?? '∅'}`).join('  '));
  };

  section('1. Contracts that are active + distributable but have NO rates (unsellable)');
  show(await q(db, sql`
    select c.reference, h.name as hotel, c.valid_from, c.valid_to
    from contracts c join hotels h on h.id = c.hotel_id
    where c.status = 'active' and c.distribution_permitted
      and not exists (select 1 from rate_periods r where r.contract_id = c.id and r.active)`));

  section('2. Contracts already expired or expiring within 60 days');
  show(await q(db, sql`
    select c.reference, h.name as hotel, c.valid_to, c.status,
           (c.valid_to - current_date) as days_left
    from contracts c join hotels h on h.id = c.hotel_id
    where c.valid_to < current_date + 60 order by c.valid_to`));

  /* Only a SELLABLE contract makes the on-request flag wrong. A hotel whose
   * contract is still draft is correctly sold on request until it activates,
   * so those are not findings. */
  section('3. Hotels on "best rate on request" despite a sellable contract (rates hidden from agents)');
  show(await q(db, sql`
    select h.name, h.city, c.reference, c.status
    from hotels h join contracts c on c.hotel_id = h.id
    where h.best_rate_on_request
      and c.status = 'active' and c.distribution_permitted
      and exists (select 1 from rate_periods r
                  where r.contract_id = c.id and r.active and r.date_to >= current_date)`));

  /* A hotel is invisible when it can neither be priced nor asked: no active
   * distributable contract, and not flagged on-request. A hotel whose only
   * contract is still a draft counts as having none — the draft prices
   * nothing. This is how a newly loaded hotel disappears. */
  section('4. Active hotels an agent can neither price nor ask about (invisible)');
  show(await q(db, sql`
    select h.name, h.city, h.country,
           (select count(*)::int from contracts c where c.hotel_id = h.id) as contracts_any
    from hotels h
    where h.status = 'active' and not h.best_rate_on_request and not h.is_sample
      and cardinality(h.collection_hotels) = 0
      and not exists (
        select 1 from contracts c
        where c.hotel_id = h.id and c.status = 'active' and c.distribution_permitted)
    order by h.country, h.city limit 40`));

  section('5. Prospects at "signed" with no hotel in the catalogue');
  const signed = await q(db, sql`
    select count(*)::int as n from hotel_prospects where stage = 'signed' and hotel_id is null`);
  console.log(`  ${signed[0].n} signed prospects are not linked to any hotel record`);
  show(await q(db, sql`
    select name, destination from hotel_prospects
    where stage = 'signed' and hotel_id is null order by name limit 12`));

  section('6. Prospects at "signed" linked to a hotel that has NO contract');
  show(await q(db, sql`
    select p.name, h.name as hotel
    from hotel_prospects p join hotels h on h.id = p.hotel_id
    where p.stage = 'signed'
      and not exists (select 1 from contracts c where c.hotel_id = h.id)
    order by p.name limit 15`));
  const n6 = await q(db, sql`
    select count(*)::int as n from hotel_prospects p join hotels h on h.id = p.hotel_id
    where p.stage = 'signed' and not exists (select 1 from contracts c where c.hotel_id = h.id)`);
  console.log(`  total: ${n6[0].n}`);

  section('7. Contracted hotels whose prospect row is still unlinked');
  show(await q(db, sql`
    select p.name as prospect, p.stage, h.name as hotel, c.reference
    from hotel_prospects p
    join hotels h on lower(h.name) = lower(p.name)
    join contracts c on c.hotel_id = h.id
    where p.hotel_id is null`));

  section('8. Duplicate hotel names in the catalogue');
  show(await q(db, sql`
    select name, count(*)::int as copies from hotels group by name having count(*) > 1`));

  section('9. Duplicate prospects (same name, different destination)');
  show(await q(db, sql`
    select name, count(*)::int as rows from hotel_prospects group by name having count(*) > 1 limit 15`));

  section('10. Agencies / agents still without a trading code');
  show(await q(db, sql`
    select (select count(*)::int from agencies where code is null) as agencies_without_code,
           (select count(*)::int from users where code is null and agency_id is not null) as agents_without_code`));

  section('11. Rate coverage holes: contract nights with no rate loaded');
  show(await q(db, sql`
    select c.reference, h.name as hotel, rt.name as room, rp.meal_plan,
           c.valid_from, min(rp.date_from) as first_rate, max(rp.date_to) as last_rate, c.valid_to
    from contracts c
    join hotels h on h.id = c.hotel_id
    join rate_periods rp on rp.contract_id = c.id and rp.active
    join room_types rt on rt.id = rp.room_type_id
    where c.status = 'active'
    group by c.reference, h.name, rt.name, rp.meal_plan, c.valid_from, c.valid_to
    having min(rp.date_from) > c.valid_from or max(rp.date_to) < c.valid_to
    order by h.name limit 20`));

  section('12. Room types with no price at any occupancy');
  show(await q(db, sql`
    select h.name as hotel, rt.name as room, count(*)::int as bad_periods
    from rate_periods rp join room_types rt on rt.id = rp.room_type_id
    join hotels h on h.id = rt.hotel_id
    where rp.active and rp.price1_minor is null and rp.price2_minor is null and rp.price3_minor is null and rp.price4_minor is null
    group by h.name, rt.name`));

  section('13. Hotels with no room types');
  show(await q(db, sql`
    select h.name, h.city from hotels h
    where h.status = 'active' and not h.is_sample
      and not exists (select 1 from room_types rt where rt.hotel_id = h.id)
      and exists (select 1 from contracts c where c.hotel_id = h.id)`));

  section('14. Outreach register: stage totals');
  show(await q(db, sql`select stage, count(*)::int as n from hotel_prospects group by stage order by n desc`));

  section('15. Prospects with a next step already overdue');
  show(await q(db, sql`
    select count(*)::int as overdue from hotel_prospects
    where next_step_on < current_date and stage in ('to_contact','contacted','in_talks','rates_received')`));

  await closeDb();
  process.exit(0);
}
main();
