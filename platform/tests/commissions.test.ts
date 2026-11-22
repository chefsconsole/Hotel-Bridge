import { afterEach, describe, expect, it } from 'vitest';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import {
  COMMISSION_TERMS_DAYS, collectionRate, commissionTotals, hotelCommissions,
} from '@/lib/services/commissions';
import { recordHotelSettlement } from '@/lib/services/tracker';
import { post } from '@/lib/services/ledger';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); f = undefined as unknown as Fixture; });

/** A confirmed pay-direct stay that earned us commission, finished `endedDaysAgo` ago. */
async function earned(fx: Fixture, amountMinor: number, endedDaysAgo: number, currency = 'EUR') {
  const checkOut = addDays(fx.today, -endedDaysAgo);
  const [b] = await fx.db.insert(schema.bookings).values({
    reference: 'HB-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    agencyId: fx.A.agencyId!, createdBy: fx.A.userId, idempotencyKey: Math.random().toString(36),
    supplier: 'contracted', hotelId: fx.hotel.id, offerKey: 'x', checkIn: addDays(fx.today, -endedDaysAgo - 2),
    checkOut, rooms: [], leadGuest: 'Guest', status: 'confirmed', paymentStatus: 'direct',
    paymentArrangement: 'direct', currency, sellMinor: amountMinor * 10, supplierCostMinor: 0,
    netRevenueMinor: amountMinor, commissionReceivableMinor: amountMinor,
    collectionModel: 'pay_direct_to_hotel', pricing: {}, cancelPolicy: {},
  }).returning();
  await post(fx.db, fx.ADMIN, [{
    bookingId: b.id, agencyId: fx.A.agencyId!, kind: 'commission_receivable', account: 'commission',
    amountMinor, currency, reference: b.reference, memo: 'Hotel commission',
  }]);
  return b;
}

describe('commission tracker', () => {
  it('reports what each hotel owes, what arrived, and what is overdue — from the ledger, never estimated', async () => {
    f = await setup();
    await earned(f, 10_000, 60);   // finished two months ago
    await earned(f, 5_000, 3);     // finished three days ago

    let rows = await hotelCommissions(f.db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      hotelName: f.hotel.name, currency: 'EUR',
      earnedMinor: 15_000, receivedMinor: 0, outstandingMinor: 15_000,
    });
    // Overdue is measured from check-out, so the 60-day-old stay drives it.
    expect(rows[0].daysOverdue).toBeGreaterThan(COMMISSION_TERMS_DAYS);

    let totals = commissionTotals(rows);
    expect(totals).toHaveLength(1);
    expect(totals[0]).toMatchObject({ currency: 'EUR', earnedMinor: 15_000, receivedMinor: 0, outstandingMinor: 15_000 });
    expect(collectionRate(totals[0])).toBe(0);

    // The hotel pays part of it.
    await recordHotelSettlement(f.db, f.ADMIN, {
      hotelId: f.hotel.id, direction: 'commission_received', currency: 'EUR',
      amountMinor: 9_000, reference: 'NEFT-55512',
    });

    rows = await hotelCommissions(f.db);
    expect(rows[0]).toMatchObject({ earnedMinor: 15_000, receivedMinor: 9_000, outstandingMinor: 6_000 });
    totals = commissionTotals(rows);
    expect(collectionRate(totals[0])).toBe(60); // 9,000 of 15,000

    // Paid in full: nothing outstanding, nothing overdue.
    await recordHotelSettlement(f.db, f.ADMIN, {
      hotelId: f.hotel.id, direction: 'commission_received', currency: 'EUR',
      amountMinor: 6_000, reference: 'NEFT-55513',
    });
    rows = await hotelCommissions(f.db);
    expect(rows[0].outstandingMinor).toBe(0);
    expect(rows[0].daysOverdue).toBe(0);
    expect(rows[0].oldestUnpaidCheckOut).toBeNull();
    expect(collectionRate(commissionTotals(rows)[0])).toBe(100);
  });

  it('keeps currencies apart and never adds them together', async () => {
    f = await setup();
    await earned(f, 10_000, 50, 'EUR');
    await earned(f, 70_000, 50, 'THB');

    const totals = commissionTotals(await hotelCommissions(f.db));
    expect(totals.map((t) => t.currency).sort()).toEqual(['EUR', 'THB']);
    expect(totals.find((t) => t.currency === 'EUR')!.outstandingMinor).toBe(10_000);
    expect(totals.find((t) => t.currency === 'THB')!.outstandingMinor).toBe(70_000);
  });

  it('shows nothing when no commission has been earned', async () => {
    f = await setup();
    expect(await hotelCommissions(f.db)).toEqual([]);
    expect(commissionTotals([])).toEqual([]);
  });
});
