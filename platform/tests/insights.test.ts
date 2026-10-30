import { afterEach, describe, expect, it } from 'vitest';
import { createQuote, searchHotels, type QuoteSnapshot } from '@/lib/services/search';
import { createBooking, recordPayment } from '@/lib/services/bookings';
import { agencyInsights, platformInsights } from '@/lib/services/insights';
import { audit } from '@/lib/services/audit';
import { key, setup, stay, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

describe('insights', () => {
  it('are empty with no data, then count real activity only', async () => {
    f = await setup();
    expect((await agencyInsights(f.db, f.agencyA.id, 30)).created).toBe(0);
    const s = stay(f.today);
    const rooms = [{ adults: 2, childAges: [] }, { adults: 1, childAges: [] }];
    const { results } = await searchHotels(f.db, f.A, { city: 'Paris', ...s, rooms });
    const o = results[0].offers.find((x) => x.supplier === 'contracted')!;
    const q = await createQuote(f.db, f.A, { offerKey: o.offerKey, hotelId: f.hotel.id, ...s, rooms });
    const r = await createBooking(f.db, f.A, { quoteId: q.id, idempotencyKey: key(), acceptedSellMinor: (q.snapshot as QuoteSnapshot).priced.price.sellMinor, leadGuest: 'Ravi', guestNames: [['Ravi'], ['Meera']] });
    if (r.kind !== 'created') throw new Error(r.kind);
    await recordPayment(f.db, f.ADMIN, r.booking.id, { amountMinor: r.booking.sellMinor, reference: 'BANK-9' });
    await audit(f.db, f.A, 'demand.unserved_destination', 'destination', 'Phuket');

    const a = await agencyInsights(f.db, f.agencyA.id, 30);
    expect(a).toMatchObject({ created: 1, confirmed: 1, roomNights: 4 });
    expect(a.value[0]).toMatchObject({ currency: 'EUR', total: r.booking.sellMinor });
    expect(a.byCity[0]).toMatchObject({ city: 'Paris', bookings: 1 });
    expect((await agencyInsights(f.db, f.agencyB.id, 30)).created).toBe(0);

    const p = await platformInsights(f.db, 30, true);
    expect(p.demand[0]).toMatchObject({ city: 'Paris', searches: 1, bookings: 1, confirmed: 1 });
    expect(p.unserved[0]).toMatchObject({ place: 'Phuket', n: 1 });
    expect(p.hotels[0]).toMatchObject({ name: 'Hotel Test Centre', confirmed: 1, roomNights: 4 });
    expect(p.agencies[0]).toMatchObject({ name: 'Alpha Travels', confirmed: 1 });
    expect(p.lead.length).toBe(1);
  });
});
