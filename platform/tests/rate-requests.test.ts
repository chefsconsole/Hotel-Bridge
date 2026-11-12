import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import {
  acceptRateQuote, askAlternative, askHotels, assignRateRequest, closeWithoutOffer, createRateRequest, deskRequest, getRateRequest, holdBackOffer,
  hotelQuote, lapseRateRequests, listRateRequests, rateRequestByToken, releaseOffer,
} from '@/lib/services/rate-requests';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

async function onRequestHotel(fx: Fixture, name: string, tier = 'premium') {
  const [h] = await fx.db.insert(schema.hotels).values({
    name, slug: name.toLowerCase().replace(/\W+/g, '-'), city: 'Paris', country: 'France', status: 'active', tier,
    bestRateOnRequest: true, rateRequestEmail: `sales@${name.toLowerCase().replace(/\W+/g, '')}.test`,
  }).returning();
  return h;
}

const ask = (fx: Fixture, hotelId: string, extra: Record<string, unknown> = {}) => createRateRequest(fx.db, fx.A, {
  hotelId, checkIn: addDays(fx.today, 20), checkOut: addDays(fx.today, 23), rooms: [{ adults: 2, childAges: [] }, { adults: 2, childAges: [5] }],
  mealPlan: 'BB', notes: 'Honeymoon couple in room 1', budget: '900', budgetCurrency: 'EUR', ...extra,
});

const quote = (rate: string, validUntil: string) => ({
  decline: false as const, currency: 'EUR' as const, roomType: 'Deluxe', rate, mealPlan: 'BB', cancellation: 'Free until 7 days before arrival', validUntil,
});

const mails = (fx: Fixture) => fx.db.select().from(schema.outboundEmails);
const tokenOf = async (fx: Fixture, id: string) => (await fx.db.select().from(schema.rateRequests).where(eq(schema.rateRequests.id, id)))[0].token;

describe('best rate on request — run by the HotelBridge desk', () => {
  it('the team is told, picks hotels, emails them in one click, checks replies and sends offers; the agent sees only offers and chooses one', async () => {
    f = await setup();
    const h = await onRequestHotel(f, 'Seine View');
    const alt = await onRequestHotel(f, 'Marais Boutique');
    const r = await ask(f, h.id);
    expect(r).toMatchObject({ status: 'review', hotelEmail: 'sales@seineview.test', budgetMinor: 90_000, budgetCurrency: 'EUR', parentId: null });

    // Nothing goes to any hotel yet — only the HotelBridge team inbox hears about it.
    let all = await mails(f);
    expect(all.filter((m) => m.toEmail.endsWith('.test') && m.toEmail.startsWith('sales@'))).toEqual([]);
    const desk = all.find((m) => m.kind === 'ops_rate_request');
    expect(desk?.subject).toContain('New best-rate enquiry');
    expect(desk?.body).toContain(`/admin/rate-requests/${r.id}`);

    // The agent just sees "we're on it" — no hotel side.
    let view = await getRateRequest(f.db, f.A, r.id);
    expect(view).toMatchObject({ state: 'working', offers: [] });

    // Agents can't run the desk.
    await expect(askHotels(f.db, f.A, r.id, [h.id])).rejects.toThrow();
    await expect(askHotels(f.db, f.ADMIN, r.id, [])).rejects.toThrow(/Tick at least one/);

    // One click: the requested hotel and a similar one.
    const desk1 = await deskRequest(f.db, f.ADMIN, r.id);
    expect(desk1.candidates[0]).toMatchObject({ requested: true, askable: true });
    const res = await askHotels(f.db, f.ADMIN, r.id, [h.id, alt.id]);
    expect([...res.emailed, ...res.failed].sort()).toEqual(['Marais Boutique', 'Seine View']); // email isn't connected in tests: recorded, not sent
    const fam = (await deskRequest(f.db, f.ADMIN, r.id)).rows;
    expect(fam).toHaveLength(2);
    const child = fam.find((x) => x.hotelId === alt.id)!;
    expect(child).toMatchObject({ parentId: r.id, budgetMinor: 90_000, checkIn: r.checkIn, assignedTo: f.ADMIN.userId });
    // The hotel email: link yes; budget and agency name no.
    all = await mails(f);
    const toHotel = all.find((m) => m.toEmail === 'sales@seineview.test' && m.kind === 'rate_request')!;
    expect(toHotel.body).toContain(`/r/${r.token}`);
    expect(toHotel.body).not.toMatch(/900|budget|Alpha Travels/i);
    const seen = await rateRequestByToken(f.db, r.token);
    expect(seen?.open).toBe(true);
    expect(JSON.stringify(seen)).not.toMatch(/90000|budget|Alpha Travels|agencyId/i);
    // An email that didn't go out can be retried; a hotel that already answered is skipped (below).
    expect((await askHotels(f.db, f.ADMIN, r.id, [h.id])).failed).toEqual(['Seine View']);

    // Hotels answer. Their rates wait for the team: the agent sees nothing and gets no email.
    await expect(hotelQuote(f.db, r.token, quote('120', f.today))).rejects.toThrow(/valid until at least/);
    await hotelQuote(f.db, r.token, quote('120', addDays(f.today, 5)));
    await expect(hotelQuote(f.db, r.token, quote('110', addDays(f.today, 5)))).rejects.toThrow(/already been answered/);
    await hotelQuote(f.db, child.token, quote('100', addDays(f.today, 5)));
    expect((await askHotels(f.db, f.ADMIN, r.id, [h.id])).skipped).toEqual(['Seine View (already asked)']);
    view = await getRateRequest(f.db, f.A, r.id);
    expect(view).toMatchObject({ state: 'working', offers: [] });
    expect((await mails(f)).filter((m) => m.kind === 'rate_request_agent')).toEqual([]);
    expect((await mails(f)).filter((m) => m.subject.includes('replied — check and send'))).toHaveLength(4); // team inbox + the person handling it, per reply

    // The team sends them. 120 x 2 rooms x 3 nights = 720 net; +8% = 777.60 -> 778. The other at 10%: 600 -> 660.
    await expect(releaseOffer(f.db, f.A, r.id, 800)).rejects.toThrow();
    await releaseOffer(f.db, f.ADMIN, r.id, 800);
    await releaseOffer(f.db, f.ADMIN, child.id, 1000);
    await expect(releaseOffer(f.db, f.ADMIN, child.id, 1000)).rejects.toThrow(/hasn’t been sent yet/);
    view = await getRateRequest(f.db, f.A, r.id);
    expect(view.state).toBe('offers');
    expect(view.offers.map((o) => [o.hotelName, o.sellMinor])).toEqual([['Marais Boutique', 66_000], ['Seine View', 77_800]]);
    expect((await mails(f)).filter((m) => m.kind === 'rate_request_agent')).toHaveLength(2);
    // The agent's list shows one request with its best offer.
    const list = await listRateRequests(f.db, f.A);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ state: 'offers', offers: 2 });
    expect(list[0].best?.sellMinor).toBe(66_000);

    // Other agencies can't see it.
    await expect(getRateRequest(f.db, f.B, r.id)).rejects.toThrow(/not found/i);
    expect(await listRateRequests(f.db, f.B)).toEqual([]);

    // The agent picks the cheaper one; the other offer is withdrawn; the hotel and the team are told.
    await acceptRateQuote(f.db, f.A, child.id);
    view = await getRateRequest(f.db, f.A, r.id);
    expect(view.state).toBe('accepted');
    expect(view.offers.map((o) => [o.hotelName, o.status])).toEqual([['Marais Boutique', 'accepted']]);
    const rows = (await deskRequest(f.db, f.ADMIN, r.id)).rows;
    expect(rows.find((x) => x.id === r.id)?.status).toBe('cancelled');
    expect((await mails(f)).filter((m) => m.toEmail === 'sales@maraisboutique.test').map((m) => m.kind)).toEqual(['rate_request', 'rate_request_accepted']);
    expect((await mails(f)).filter((m) => m.toEmail === 'sales@seineview.test').map((m) => m.kind)).not.toContain('rate_request_accepted');
    await expect(askHotels(f.db, f.ADMIN, r.id, [h.id])).rejects.toThrow(/closed/);
  });

  it('over budget: the agent can ask for more hotels, which go to the team; a reply can be set aside', async () => {
    f = await setup();
    const h = await onRequestHotel(f, 'Seine View', 'luxury');
    const near = await onRequestHotel(f, 'Marais Boutique', 'premium');
    await onRequestHotel(f, 'Louvre Grand', 'ultra');
    const r = await ask(f, h.id, { budget: '950' });
    await askHotels(f.db, f.ADMIN, r.id, [h.id]);
    await hotelQuote(f.db, r.token, quote('160', addDays(f.today, 5))); // 960 net -> 1,037 sell, above 950
    await releaseOffer(f.db, f.ADMIN, r.id, 800);

    const view = await getRateRequest(f.db, f.A, r.id);
    expect(view.fit).toBe('over');
    expect(view.alternatives.onRequest.map((x) => x.name)).toEqual(['Marais Boutique', 'Louvre Grand']); // nearest tier first
    expect(view.alternatives.priced.map((x) => x.hotel.name)).toEqual(['Hotel Test Centre']);
    expect(view.alternatives.priced[0].fromMinor).toBeLessThanOrEqual(95_000);

    const next = await askAlternative(f.db, f.A, r.id, near.id);
    expect(next).toMatchObject({ hotelId: near.id, parentId: r.id, status: 'review', budgetMinor: 95_000, budgetCurrency: 'EUR', checkIn: r.checkIn });
    expect((await mails(f)).some((m) => m.subject.includes('The agent also wants Marais Boutique'))).toBe(true);
    expect((await getRateRequest(f.db, f.A, r.id)).alternatives.onRequest.map((x) => x.name)).toEqual(['Louvre Grand']);

    // The team asks it, the hotel replies, the team decides not to send it.
    await askHotels(f.db, f.ADMIN, r.id, [near.id]);
    await hotelQuote(f.db, await tokenOf(f, next.id), quote('300', addDays(f.today, 5)));
    await holdBackOffer(f.db, f.ADMIN, next.id);
    expect((await getRateRequest(f.db, f.A, r.id)).offers.map((o) => o.hotelName)).toEqual(['Seine View']);
  });

  it('hotel declines and silence stay with the team; the team closes with a note; contracted hotels are refused', async () => {
    f = await setup();
    await expect(ask(f, f.hotel.id)).rejects.toThrow(/contracted rates/);
    const h = await onRequestHotel(f, 'Seine View');
    const b = await onRequestHotel(f, 'Marais Boutique');
    const r = await ask(f, h.id);
    await assignRateRequest(f.db, f.ADMIN, r.id, f.ADMIN.userId);
    await askHotels(f.db, f.ADMIN, r.id, [h.id, b.id]);
    await hotelQuote(f.db, r.token, { decline: true, reason: 'Fully booked' });
    expect((await getRateRequest(f.db, f.A, r.id)).state).toBe('working'); // the agent isn't told about hotels
    const lapsed = await lapseRateRequests(f.db, new Date(Date.now() + 25 * 3_600_000));
    expect(lapsed).toBe(1);
    expect((await getRateRequest(f.db, f.A, r.id)).state).toBe('working');
    expect((await mails(f)).filter((m) => m.kind === 'rate_request_agent')).toEqual([]);
    expect((await mails(f)).some((m) => m.subject.includes('No reply from Marais Boutique'))).toBe(true);
    await expect(hotelQuote(f.db, await tokenOf(f, (await deskRequest(f.db, f.ADMIN, r.id)).rows[1].id), quote('120', addDays(f.today, 5)))).rejects.toThrow(/already been answered or closed/);

    await expect(closeWithoutOffer(f.db, f.ADMIN, r.id, 'no')).rejects.toThrow(/short note/);
    await closeWithoutOffer(f.db, f.ADMIN, r.id, 'Paris is sold out that week — shall we try the week after?');
    const view = await getRateRequest(f.db, f.A, r.id);
    expect(view.state).toBe('no_offer');
    expect(view.request.declineReason).toContain('sold out');
    expect((await mails(f)).filter((m) => m.kind === 'rate_request_agent')).toHaveLength(1);
  });
});
