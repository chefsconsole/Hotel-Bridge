import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { createBooking, hotelRespond } from '@/lib/services/bookings';
import { createContract, updateContract, updateHotel } from '@/lib/services/catalog';
import { createQuote, searchHotels, type QuoteSnapshot } from '@/lib/services/search';
import { key, setup, stay, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

const GROUP = ['Deevana Plaza Phuket Patong', 'Deevana Patong Resort & Spa', 'Ramada by Wyndham Phuket Deevana'];

async function bookCollection(fx: Fixture) {
  await fx.db.update(schema.hotels).set({ collectionHotels: GROUP }).where(eq(schema.hotels.id, fx.hotel.id));
  const s = stay(fx.today, 10, 2);
  const rooms = [{ adults: 2, childAges: [] as number[] }];
  const { results } = await searchHotels(fx.db, fx.A, { city: 'Paris', ...s, rooms });
  const offer = results[0].offers.find((o) => o.supplier === 'contracted')!;
  const q = await createQuote(fx.db, fx.A, { offerKey: offer.offerKey, hotelId: fx.hotel.id, ...s, rooms });
  const r = await createBooking(fx.db, fx.A, {
    quoteId: q.id, idempotencyKey: key(), acceptedSellMinor: (q.snapshot as QuoteSnapshot).priced.price.sellMinor, leadGuest: 'Ravi Kumar', guestNames: [['Ravi Kumar']],
  });
  if (r.kind !== 'created') throw new Error(r.kind);
  return r.booking;
}

describe('hotel collections', () => {
  it('one rate across a group’s hotels: the group picks the hotel when it confirms', async () => {
    f = await setup({ confirmationMode: 'on_request' });
    const b = await bookCollection(f);
    expect(b.status).toBe('pending_confirmation');
    expect(b.assignedHotel).toBeNull();

    await expect(hotelRespond(f.db, f.PARTNER, b.id, { accept: true, confirmation: 'DV-1' })).rejects.toThrow(/Choose which hotel/);
    await expect(hotelRespond(f.db, f.PARTNER, b.id, { accept: true, confirmation: 'DV-1', assignedHotel: 'Some Other Hotel' })).rejects.toThrow(/Choose which hotel/);
    const c = await hotelRespond(f.db, f.PARTNER, b.id, { accept: true, confirmation: 'DV-1', assignedHotel: 'Deevana Patong Resort & Spa' });
    expect(c).toMatchObject({ status: 'awaiting_payment', hotelConfirmation: 'DV-1', assignedHotel: 'Deevana Patong Resort & Spa' });
    const [ev] = await f.db.select().from(schema.bookingEvents).where(eq(schema.bookingEvents.toStatus, 'awaiting_payment'));
    expect(ev.note).toContain('at Deevana Patong Resort & Spa');
  });

  it('a collection always confirms on request, and needs two or more hotels', async () => {
    f = await setup(); // instant-allocation contract
    const profile = { name: f.hotel.name, city: f.hotel.city, country: f.hotel.country, address: '1 Rue Test', description: 'Test', facilities: ['Wi-Fi'] };
    await expect(updateHotel(f.db, f.ADMIN, f.hotel.id, { ...profile, collectionHotels: ['Only One'] })).rejects.toThrow(/at least two hotels/);
    await expect(updateHotel(f.db, f.ADMIN, f.hotel.id, { ...profile, collectionHotels: GROUP })).rejects.toThrow(/on request/);

    await f.db.update(schema.contracts).set({ confirmationMode: 'on_request' });
    await updateHotel(f.db, f.ADMIN, f.hotel.id, { ...profile, collectionHotels: GROUP });
    const [c] = await f.db.select().from(schema.contracts);
    const terms = {
      reference: 'C-2', inventoryModel: c.inventoryModel as 'direct_net', rateBasis: 'net' as const, collectionModel: 'prepaid_to_hb' as const, currency: 'EUR' as const,
      validFrom: f.today, validTo: c.validTo, commissionBps: 0, taxMode: 'included' as const, taxBps: 1000, localTaxMinor: 0,
      confirmationMode: 'instant_allocation' as const, freeCancelDays: 3, latePenaltyType: 'first_night' as const, latePenaltyBps: 0, nonRefundable: false, distributionPermitted: true,
    };
    await expect(createContract(f.db, f.ADMIN, f.hotel.id, terms)).rejects.toThrow(/confirms on request/);
    await expect(updateContract(f.db, f.ADMIN, c.id, terms)).rejects.toThrow(/confirms on request/);
  });
});
