/* Stopping ONE hotel on a best-rate request.
 *
 * cancelRateRequest closes the whole family — the agent's request and every
 * hotel asked for it. That is the only cancel the desk had, so "stop asking
 * this one hotel" meant closing all of them or editing the row by hand. A
 * duplicate hotel record made us do exactly that: one hotel was asked twice
 * from two records and one of the two had to be closed on its own.
 *
 * What must stay true:
 *  - closing one hotel leaves every other hotel, and the request, alone;
 *  - a hotel that has already replied is NOT cancellable — its rate is worth
 *    keeping, and "set aside" is the action that keeps it;
 *  - the last open hotel is NOT cancellable, because the agent is owed an
 *    outcome and closing it silently would strand them;
 *  - agents cannot do any of this.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { eq, or } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import {
  agentState, askHotels, cancelHotelAsk, closeWithoutOffer, createRateRequest, getRateRequest, holdBackOffer, hotelQuote, rateRequestByToken,
} from '@/lib/services/rate-requests';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

async function onRequestHotel(fx: Fixture, name: string) {
  const [h] = await fx.db.insert(schema.hotels).values({
    name, slug: name.toLowerCase().replace(/\W+/g, '-'), city: 'Paris', country: 'France', status: 'active', tier: 'premium',
    bestRateOnRequest: true, rateRequestEmail: `sales@${name.toLowerCase().replace(/\W+/g, '')}.test`,
  }).returning();
  return h;
}

const ask = (fx: Fixture, hotelId: string) => createRateRequest(fx.db, fx.A, {
  hotelId, checkIn: addDays(fx.today, 20), checkOut: addDays(fx.today, 23), rooms: [{ adults: 2, childAges: [] }],
});

/* Every row on the request INCLUDING the root. The hotel the agent originally
 * asked for is the root row itself, not a child, so a children-only query
 * silently loses it. */
const rowsOf = async (fx: Fixture, rootId: string) =>
  fx.db.select().from(schema.rateRequests)
    .where(or(eq(schema.rateRequests.id, rootId), eq(schema.rateRequests.parentId, rootId)));

describe('stop asking one hotel', () => {
  it('closes that hotel and leaves the request and the others working', async () => {
    f = await setup();
    const a = await onRequestHotel(f, 'Seine View');
    const b = await onRequestHotel(f, 'Marais Boutique');
    const c = await onRequestHotel(f, 'Louvre Garden');
    const root = await ask(f, a.id);
    await askHotels(f.db, f.ADMIN, root.id, [a.id, b.id, c.id]);

    const before = await rowsOf(f, root.id);
    const marais = before.find((x) => x.hotelId === b.id)!;
    // 'not_emailed' here rather than 'sent' only because the tests have no mail
    // provider; both mean the same thing — asked, no reply yet.
    expect(['sent', 'not_emailed']).toContain(marais.status);

    const done = await cancelHotelAsk(f.db, f.ADMIN, marais.id);
    expect(done.status).toBe('cancelled');

    const after = await rowsOf(f, root.id);
    expect(after.find((x) => x.hotelId === b.id)!.status).toBe('cancelled');
    expect(['sent', 'not_emailed']).toContain(after.find((x) => x.hotelId === c.id)!.status);
    // The request itself is untouched and the agent still sees it working.
    expect(agentState(after)).toBe('working');
    const seen = await getRateRequest(f.db, f.A, root.id);
    expect(seen.request.status).not.toBe('cancelled');
  });

  it('kills that hotel’s reply link and nobody else’s', async () => {
    f = await setup();
    const a = await onRequestHotel(f, 'Seine View');
    const b = await onRequestHotel(f, 'Marais Boutique');
    const root = await ask(f, a.id);
    await askHotels(f.db, f.ADMIN, root.id, [a.id, b.id]);
    const rows = await rowsOf(f, root.id);
    const dropped = rows.find((x) => x.hotelId === b.id)!;
    const kept = rows.find((x) => x.hotelId === a.id)!;

    await cancelHotelAsk(f.db, f.ADMIN, dropped.id);

    expect((await rateRequestByToken(f.db, dropped.token))!.open).toBe(false);
    expect((await rateRequestByToken(f.db, kept.token))!.open).toBe(true);
    // And the hotel cannot sneak a rate in through the dead link.
    await expect(hotelQuote(f.db, dropped.token, {
      decline: false, currency: 'EUR', roomType: 'Deluxe', rate: '200', cancellation: 'Free until 7 days', validUntil: addDays(f.today, 10),
    })).rejects.toThrow(/already been answered or closed/);
  });

  it('refuses a hotel that has already replied, so its rate is not thrown away', async () => {
    f = await setup();
    const a = await onRequestHotel(f, 'Seine View');
    const b = await onRequestHotel(f, 'Marais Boutique');
    const root = await ask(f, a.id);
    await askHotels(f.db, f.ADMIN, root.id, [a.id, b.id]);
    const rows = await rowsOf(f, root.id);
    const replied = rows.find((x) => x.hotelId === b.id)!;
    await hotelQuote(f.db, replied.token, {
      decline: false, currency: 'EUR', roomType: 'Deluxe', rate: '200', cancellation: 'Free until 7 days', validUntil: addDays(f.today, 10),
    });

    await expect(cancelHotelAsk(f.db, f.ADMIN, replied.id)).rejects.toThrow(/already replied/);
    // Setting it aside is the action that keeps the rate on file.
    await holdBackOffer(f.db, f.ADMIN, replied.id);
    const after = await rowsOf(f, root.id);
    expect(after.find((x) => x.id === replied.id)!.quoteNetMinor).not.toBeNull();
  });

  it('refuses the last open hotel rather than stranding the agent', async () => {
    f = await setup();
    const a = await onRequestHotel(f, 'Seine View');
    const b = await onRequestHotel(f, 'Marais Boutique');
    const root = await ask(f, a.id);
    await askHotels(f.db, f.ADMIN, root.id, [a.id, b.id]);
    const rows = await rowsOf(f, root.id);

    await cancelHotelAsk(f.db, f.ADMIN, rows.find((x) => x.hotelId === b.id)!.id);
    // One left: closing it would leave a request that answers nobody.
    await expect(cancelHotelAsk(f.db, f.ADMIN, rows.find((x) => x.hotelId === a.id)!.id))
      .rejects.toThrow(/only hotel still open/);

    // The way to end it properly tells the agent.
    await closeWithoutOffer(f.db, f.ADMIN, root.id, 'Paris is full for these dates — shall we try nearby?');
    expect(agentState(await rowsOf(f, root.id))).toBe('no_offer');
  });

  it('refuses a hotel already closed', async () => {
    f = await setup();
    const a = await onRequestHotel(f, 'Seine View');
    const b = await onRequestHotel(f, 'Marais Boutique');
    const c = await onRequestHotel(f, 'Louvre Garden');
    const root = await ask(f, a.id);
    await askHotels(f.db, f.ADMIN, root.id, [a.id, b.id, c.id]);
    const rows = await rowsOf(f, root.id);
    const one = rows.find((x) => x.hotelId === b.id)!;
    await cancelHotelAsk(f.db, f.ADMIN, one.id);
    await expect(cancelHotelAsk(f.db, f.ADMIN, one.id)).rejects.toThrow(/already closed/);
  });

  it('is staff only — an agent cannot close a hotel on their own request', async () => {
    f = await setup();
    const a = await onRequestHotel(f, 'Seine View');
    const b = await onRequestHotel(f, 'Marais Boutique');
    const root = await ask(f, a.id);
    await askHotels(f.db, f.ADMIN, root.id, [a.id, b.id]);
    const rows = await rowsOf(f, root.id);
    await expect(cancelHotelAsk(f.db, f.A, rows.find((x) => x.hotelId === b.id)!.id)).rejects.toThrow();
  });
});
