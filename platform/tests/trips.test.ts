import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { clientMoney, hotelShare, reminderMessage, tripTotals, whatsappNumber } from '@/lib/domain/trip';
import { searchHotels } from '@/lib/services/search';
import {
  addExtra, addHotelToTrip, approveSharedTrip, bookTripHotels, createTrip, deleteClientPayment, dueFollowUps, duplicateTrip, getTrip, listTrips, priceItem,
  receivables, recordClientPayment, removeItem, setSharing, sharedTrip, updateBranding,
} from '@/lib/services/trips';
import { setup, stay, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

async function offerFor(fx: Fixture, from = 10, nights = 2) {
  const s = stay(fx.today, from, nights);
  const rooms = [{ adults: 2, childAges: [] as number[] }];
  const { results } = await searchHotels(fx.db, fx.A, { city: 'Paris', ...s, rooms }, { log: false });
  const offer = results[0].offers.find((o) => o.supplier === 'contracted')!;
  return { offerKey: offer.offerKey, hotelId: fx.hotel.id, ...s, rooms, sell: offer.price.sellMinor };
}

describe('trip domain', () => {
  it('totals a mixed package without mixing currencies', () => {
    const t = tripTotals('INR', [
      { kind: 'hotel', clientPriceMinor: 6_000_000, costMinor: 5_000_000, costCurrency: 'INR' },
      { kind: 'flight', clientPriceMinor: 3_000_000, costMinor: 2_800_000, costCurrency: 'INR' },
      { kind: 'visa', clientPriceMinor: 1_000_000, costMinor: 5_000, costCurrency: 'EUR' },
      { kind: 'hotel', clientPriceMinor: null, costMinor: 20_000, costCurrency: 'EUR' },
    ], 2_500_000);
    expect(t.totalMinor).toBe(10_000_000);
    expect(t.hotelsMinor).toBe(6_000_000);
    expect(t.extrasMinor).toBe(4_000_000);
    expect(hotelShare(t)).toBe(60);
    expect(t.pendingMinor).toBe(7_500_000);
    expect(t.unpricedLines).toBe(1);
    expect(t.marginMinor).toBe(1_200_000); // only the INR-cost lines
    expect(t.otherCurrencyCosts).toEqual([{ currency: 'EUR', minor: 5_000 }]);
  });
  it('writes reminders clients can read', () => {
    expect(clientMoney(10_000_000, 'INR')).toBe('₹1,00,000');
    const m = reminderMessage({ clientName: 'Ravi Mehta', agencyName: 'Demo Travels', tripTitle: 'Thailand', amountMinor: 4_000_000, currency: 'INR', dueOn: '2026-12-01' });
    expect(m).toContain('Dear Ravi,');
    expect(m).toContain('₹40,000 by 1 December');
    expect(whatsappNumber('98200 12345')).toBe('919820012345');
    expect(whatsappNumber('+66 81 234 5678')).toBe('66812345678');
    expect(whatsappNumber('abc')).toBeNull();
  });
});

describe('client trips', () => {
  it('builds a package, books every hotel once, and tracks what the client owes', async () => {
    f = await setup();
    const trip = await createTrip(f.db, f.A, { title: 'Mehta family · Paris', currency: 'EUR', newClient: { name: 'Ravi Mehta', phone: '9820012345' } });
    expect(trip.reference).toMatch(/^TR-/);

    const o1 = await offerFor(f, 10);
    const o2 = await offerFor(f, 14);
    const h1 = await addHotelToTrip(f.db, f.A, trip.id, o1);
    await addHotelToTrip(f.db, f.A, trip.id, o2);
    expect(h1.netMinor).toBe(o1.sell);
    expect(h1.clientPriceMinor).toBe(o1.sell); // same currency: starts at our price
    await priceItem(f.db, f.A, h1.id, { clientPrice: String((o1.sell + 5_000) / 100) });
    await addExtra(f.db, f.A, trip.id, { kind: 'flight', title: 'BOM–CDG return', clientPrice: '900', cost: '820' });

    const results = await bookTripHotels(f.db, f.A, trip.id);
    expect(results.map((r) => r.outcome)).toEqual(['booked', 'booked']);
    // A second click books nothing new.
    const again = await bookTripHotels(f.db, f.A, trip.id);
    expect(again.map((r) => r.outcome)).toEqual(['already_booked', 'already_booked']);
    expect((await f.db.select().from(schema.bookings)).length).toBe(2);

    let view = await getTrip(f.db, f.A, trip.id);
    expect(view.trip.status).toBe('booked');
    expect(view.items.filter((i) => i.booking).length).toBe(2);
    const total = o1.sell + 5_000 + o2.sell + 90_000;
    expect(view.totals.totalMinor).toBe(total);
    expect(view.totals.marginMinor).toBe(5_000 + 8_000);

    await recordClientPayment(f.db, f.A, trip.id, { amount: '500', method: 'upi', receivedOn: f.today });
    view = await getTrip(f.db, f.A, trip.id);
    expect(view.totals.pendingMinor).toBe(total - 50_000);
    const owed = receivables(await listTrips(f.db, f.A));
    expect(owed).toEqual([{ currency: 'EUR', pendingMinor: total - 50_000, overdueMinor: 0, trips: 1 }]);

    // A booked hotel can't silently disappear from the package.
    await expect(removeItem(f.db, f.A, h1.id)).rejects.toThrow(/Cancel the booking first/);
    await deleteClientPayment(f.db, f.A, view.payments[0].id);
    expect((await getTrip(f.db, f.A, trip.id)).totals.receivedMinor).toBe(0);
  });

  it('never accepts a changed price silently', async () => {
    f = await setup();
    const trip = await createTrip(f.db, f.A, { title: 'Paris', currency: 'EUR', newClient: { name: 'Ravi' } });
    const o = await offerFor(f);
    const item = await addHotelToTrip(f.db, f.A, trip.id, o);
    await f.db.update(schema.ratePeriods).set({ price2Minor: 15_000 });
    const [r] = await bookTripHotels(f.db, f.A, trip.id);
    expect(r.outcome).toBe('price_changed');
    expect((await f.db.select().from(schema.bookings)).length).toBe(0);
    const [updated] = await f.db.select().from(schema.tripItems).where(eq(schema.tripItems.id, item.id));
    expect(updated.netMinor).toBeGreaterThan(o.sell);
    expect(updated.lastIssue).toMatch(/Price changed/);
    // Booking again accepts the price now shown.
    const [r2] = await bookTripHotels(f.db, f.A, trip.id);
    expect(r2.outcome).toBe('booked');
  });

  it('keeps each agency to its own clients and shows clients only their side', async () => {
    f = await setup();
    await updateBranding(f.db, f.A, { brandName: 'Alpha Holidays', brandPhone: '+91 98200 00000' });
    const trip = await createTrip(f.db, f.A, { title: 'Paris', currency: 'EUR', newClient: { name: 'Ravi' } });
    await addHotelToTrip(f.db, f.A, trip.id, await offerFor(f));
    await expect(getTrip(f.db, f.B, trip.id)).rejects.toThrow(/not found/);
    expect(await listTrips(f.db, f.B)).toEqual([]);
    await expect(createTrip(f.db, f.A, { title: 'Bad', currency: 'EUR', clientId: '00000000-0000-0000-0000-000000000000' })).rejects.toThrow(/not found/);

    const shared = await sharedTrip(f.db, trip.shareToken);
    expect(shared?.agency.name).toBe('Alpha Holidays');
    const json = JSON.stringify(shared);
    expect(json).not.toMatch(/netMinor|costMinor|HB-|HotelBridge/);
    expect(await sharedTrip(f.db, 'NOTAREALTOKEN00000000000')).toBeNull();

    // The client approves from the link; turning sharing off kills the link.
    expect((await approveSharedTrip(f.db, trip.shareToken))?.clientApprovedAt).toBeTruthy();
    await setSharing(f.db, f.A, trip.id, { enabled: false });
    expect(await sharedTrip(f.db, trip.shareToken)).toBeNull();
  });

  it('copies a trip as a fresh quote and lists due follow-ups', async () => {
    f = await setup();
    const trip = await createTrip(f.db, f.A, { title: 'Paris', currency: 'EUR', newClient: { name: 'Ravi' }, source: 'instagram', followUpOn: f.today, followUpNote: 'Call back' });
    await addExtra(f.db, f.A, trip.id, { kind: 'visa', title: 'Schengen visa', clientPrice: '120' });
    await recordClientPayment(f.db, f.A, trip.id, { amount: '50', method: 'cash', receivedOn: f.today });
    expect((await dueFollowUps(f.db, f.A)).map((r) => r.trip.id)).toEqual([trip.id]);
    expect(await dueFollowUps(f.db, f.B)).toEqual([]);
    const copy = await duplicateTrip(f.db, f.A, trip.id);
    const v = await getTrip(f.db, f.A, copy.id);
    expect(v.trip.clientId).toBe(trip.clientId);
    expect(v.totals.totalMinor).toBe(12_000);
    expect(v.totals.receivedMinor).toBe(0);
  });

  it('refuses booking for agencies awaiting verification', async () => {
    f = await setup();
    const trip = await createTrip(f.db, f.P, { title: 'Paris', currency: 'EUR', newClient: { name: 'Ravi' } });
    const s = stay(f.today);
    const rooms = [{ adults: 2, childAges: [] as number[] }];
    const { results } = await searchHotels(f.db, f.P, { city: 'Paris', ...s, rooms }, { log: false });
    const offer = results[0].offers.find((x) => x.supplier === 'contracted')!;
    await addHotelToTrip(f.db, f.P, trip.id, { offerKey: offer.offerKey, hotelId: f.hotel.id, ...s, rooms });
    await expect(bookTripHotels(f.db, f.P, trip.id)).rejects.toThrow(/awaiting verification/);
  });
});
