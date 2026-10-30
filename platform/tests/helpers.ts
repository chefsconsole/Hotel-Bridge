import { createMemoryDb, schema, type DB } from '@/lib/db';
import { addDays, todayIso } from '@/lib/domain/dates';
import { actorFor, hashPassword } from '@/lib/services/auth';
import type { Actor } from '@/lib/services/actor';

export type Fixture = Awaited<ReturnType<typeof setup>>;

/** A fresh database with two agencies, staff, and one contracted hotel. */
export async function setup(opts: { confirmationMode?: 'instant_allocation' | 'on_request'; rateBasis?: 'net' | 'commissionable'; collection?: 'prepaid_to_hb' | 'pay_direct_to_hotel'; allotment?: number } = {}) {
  const { db, close } = await createMemoryDb();
  const pw = await hashPassword('correct horse battery');
  const today = todayIso();

  const [agencyA] = await db.insert(schema.agencies).values({ name: 'Alpha Travels', country: 'India', status: 'verified', billingCurrency: 'EUR' }).returning();
  const [agencyB] = await db.insert(schema.agencies).values({ name: 'Beta Tours', country: 'India', status: 'verified', billingCurrency: 'EUR' }).returning();
  const [pending] = await db.insert(schema.agencies).values({ name: 'Pending Co', country: 'UAE', status: 'pending' }).returning();
  const [ua] = await db.insert(schema.users).values({ email: 'a@alpha.test', name: 'Asha', passwordHash: pw, agencyId: agencyA.id, agencyRole: 'owner' }).returning();
  const [ub] = await db.insert(schema.users).values({ email: 'b@beta.test', name: 'Bilal', passwordHash: pw, agencyId: agencyB.id, agencyRole: 'owner' }).returning();
  const [up] = await db.insert(schema.users).values({ email: 'p@pending.test', name: 'Priya', passwordHash: pw, agencyId: pending.id, agencyRole: 'owner' }).returning();
  const [admin] = await db.insert(schema.users).values({ email: 'admin@hb.test', name: 'Admin', passwordHash: pw, platformRole: 'admin' }).returning();

  const [hotel] = await db.insert(schema.hotels).values({
    name: 'Hotel Test Centre', slug: 'hotel-test-centre', city: 'Paris', country: 'France', status: 'active',
    description: 'Test', address: '1 Rue Test', facilities: ['Wi-Fi'],
  }).returning();
  const [dbl] = await db.insert(schema.roomTypes).values({ hotelId: hotel.id, name: 'Double', maxAdults: 2, maxChildren: 1, maxOccupancy: 3 }).returning();
  const [tpl] = await db.insert(schema.roomTypes).values({ hotelId: hotel.id, name: 'Triple', maxAdults: 3, maxChildren: 1, maxOccupancy: 4 }).returning();
  const [partner] = await db.insert(schema.users).values({ email: 'res@hotel.test', name: 'Front Office', passwordHash: pw, partnerHotelId: hotel.id }).returning();

  const rateBasis = opts.rateBasis ?? 'net';
  const [contract] = await db.insert(schema.contracts).values({
    hotelId: hotel.id, reference: 'C-1', inventoryModel: rateBasis === 'net' ? 'direct_net' : 'direct_commissionable', rateBasis,
    collectionModel: opts.collection ?? 'prepaid_to_hb', currency: 'EUR',
    validFrom: today, validTo: addDays(today, 365), commissionBps: rateBasis === 'commissionable' ? 1500 : 0,
    taxMode: 'included', taxBps: 1000, localTaxMinor: 288, confirmationMode: opts.confirmationMode ?? 'instant_allocation',
    freeCancelDays: 3, latePenaltyType: 'first_night', latePenaltyBps: 0, nonRefundable: false, distributionPermitted: true, status: 'active',
  }).returning();
  await db.insert(schema.ratePeriods).values([
    { contractId: contract.id, roomTypeId: dbl.id, mealPlan: 'BB', dateFrom: today, dateTo: addDays(today, 365), price1Minor: 10_000, price2Minor: 12_000, price3Minor: null, childMinor: 2_000, minStay: 1, releaseDays: 2 },
    { contractId: contract.id, roomTypeId: tpl.id, mealPlan: 'BB', dateFrom: today, dateTo: addDays(today, 365), price1Minor: null, price2Minor: 14_000, price3Minor: 16_000, childMinor: 2_000, minStay: 1, releaseDays: 2 },
  ]);
  const allot = opts.allotment ?? 5;
  const nights = Array.from({ length: 60 }, (_, i) => addDays(today, i));
  await db.insert(schema.allocations).values(nights.flatMap((night) => [
    { contractId: contract.id, roomTypeId: dbl.id, night, total: allot, sold: 0 },
    { contractId: contract.id, roomTypeId: tpl.id, night, total: allot, sold: 0 },
  ]));

  const A: Actor = actorFor({ ...ua });
  const B: Actor = actorFor({ ...ub });
  const P: Actor = actorFor({ ...up });
  const ADMIN: Actor = actorFor({ ...admin });
  const PARTNER: Actor = actorFor({ ...partner });
  return { db: db as DB, close, today, agencyA, agencyB, pending, hotel, dbl, tpl, contract, A, B, P, ADMIN, PARTNER };
}

export const stay = (today: string, from = 10, nights = 2) => ({ checkIn: addDays(today, from), checkOut: addDays(today, from + nights) });

export function key() {
  return 'k-' + crypto.randomUUID();
}
