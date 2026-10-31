import { afterEach, describe, expect, it } from 'vitest';
import { createBooking, recordPayment } from '@/lib/services/bookings';
import { createQuote, searchHotels, type QuoteSnapshot } from '@/lib/services/search';
import { arrivals, hotelAccounts, hotelVolume, recordHotelSettlement } from '@/lib/services/tracker';
import { key, setup, stay, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

async function bookOne(fx: Fixture, from: number) {
  const s = stay(fx.today, from, 2);
  const rooms = [{ adults: 2, childAges: [] as number[] }];
  const { results } = await searchHotels(fx.db, fx.A, { city: 'Paris', ...s, rooms }, { log: false });
  const offer = results[0].offers.find((o) => o.supplier === 'contracted')!;
  const q = await createQuote(fx.db, fx.A, { offerKey: offer.offerKey, hotelId: fx.hotel.id, ...s, rooms });
  const r = await createBooking(fx.db, fx.A, { quoteId: q.id, idempotencyKey: key(), acceptedSellMinor: (q.snapshot as QuoteSnapshot).priced.price.sellMinor, leadGuest: 'Ravi', guestNames: [['Ravi']] });
  if (r.kind !== 'created') throw new Error(r.kind);
  return r.booking;
}

describe('hotel tracker', () => {
  it('lists arrivals and what we owe each hotel; settlements reduce it, never below zero', async () => {
    f = await setup();
    const b = await bookOne(f, 3);
    await recordPayment(f.db, f.ADMIN, b.id, { amountMinor: b.sellMinor, reference: 'BANK' });
    const day = await arrivals(f.db, { from: b.checkIn, to: b.checkIn });
    expect(day.map((a) => [a.type, a.reference, a.rooms])).toEqual([['fit', b.reference, 1]]);
    expect(await arrivals(f.db, { from: b.checkIn, to: b.checkIn, hotelId: '00000000-0000-0000-0000-000000000000' })).toEqual([]);

    const [acc] = await hotelAccounts(f.db, f.hotel.id);
    expect(acc.weOweMinor).toBe(b.supplierCostMinor);
    const [vol] = await hotelVolume(f.db, { from: f.today, to: b.checkIn, hotelId: f.hotel.id });
    expect(vol).toMatchObject({ bookings: 1, roomNights: 2, sellMinor: b.sellMinor });

    await expect(recordHotelSettlement(f.db, f.A, { hotelId: f.hotel.id, direction: 'paid_hotel', currency: 'EUR', amountMinor: 100, reference: 'X1' })).rejects.toThrow();
    await expect(recordHotelSettlement(f.db, f.ADMIN, { hotelId: f.hotel.id, direction: 'paid_hotel', currency: 'EUR', amountMinor: b.supplierCostMinor + 1, reference: 'X1' })).rejects.toThrow(/more than we owe/);
    await recordHotelSettlement(f.db, f.ADMIN, { hotelId: f.hotel.id, direction: 'paid_hotel', currency: 'EUR', amountMinor: b.supplierCostMinor, reference: 'NEFT-9' });
    expect(await hotelAccounts(f.db, f.hotel.id)).toEqual([]);
  });

  it('tracks commission a pay-at-hotel property owes us', async () => {
    f = await setup({ rateBasis: 'commissionable', collection: 'pay_direct_to_hotel' });
    const b = await bookOne(f, 5);
    expect(b.status).toBe('confirmed');
    const [acc] = await hotelAccounts(f.db, f.hotel.id);
    expect(acc.theyOweMinor).toBe(b.commissionReceivableMinor);
    expect(acc.theyOweMinor).toBeGreaterThan(0);
    await recordHotelSettlement(f.db, f.ADMIN, { hotelId: f.hotel.id, direction: 'commission_received', currency: 'EUR', amountMinor: acc.theyOweMinor, reference: 'COMM-1' });
    expect(await hotelAccounts(f.db, f.hotel.id)).toEqual([]);
  });
});
