import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import {
  acceptRateQuote, askAlternative, createRateRequest, getRateRequest, hotelQuote, lapseRateRequests, listRateRequests, rateRequestByToken,
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

describe('best rate on request', () => {
  it('asks the hotel without revealing the budget or the agency, prices the quote with our markup, and the agent accepts', async () => {
    f = await setup();
    const h = await onRequestHotel(f, 'Seine View');
    const r = await ask(f, h.id);
    expect(r).toMatchObject({ status: 'not_emailed', hotelEmail: 'sales@seineview.test', budgetMinor: 90_000, budgetCurrency: 'EUR' });
    expect(r.token).toMatch(/^[A-Z2-9]{24}$/);
    expect(Math.round((r.respondByAt.getTime() - Date.now()) / 3_600_000)).toBe(24);

    // The email to the hotel: link yes; budget and agency name no.
    const [mail] = await f.db.select().from(schema.outboundEmails).where(eq(schema.outboundEmails.relatedId, r.id));
    expect(mail.status).toBe('not_configured');
    expect(mail.body).toContain(`/r/${r.token}`);
    expect(mail.body).not.toMatch(/900|budget|Alpha Travels/i);
    const seen = await rateRequestByToken(f.db, r.token);
    expect(seen?.open).toBe(true);
    expect(JSON.stringify(seen)).not.toMatch(/90000|budget|Alpha Travels|agencyId/i);

    await expect(hotelQuote(f.db, r.token, quote('120', f.today))).rejects.toThrow(/valid until at least/);
    await hotelQuote(f.db, r.token, quote('120', addDays(f.today, 5)));
    await expect(hotelQuote(f.db, r.token, quote('110', addDays(f.today, 5)))).rejects.toThrow(/already been answered/);

    // 120 x 2 rooms x 3 nights = 720 net; +8% = 777.60 -> rounded up to 778.
    const view = await getRateRequest(f.db, f.A, r.id);
    expect(view.request).toMatchObject({ status: 'quoted', quoteNetMinor: 72_000, sellMinor: 77_800, markupBps: 800 });
    expect(view.fit).toBe('within');
    expect(view.alternatives.onRequest).toEqual([]); // within budget: no need to look elsewhere

    // Other agencies can't see it.
    await expect(getRateRequest(f.db, f.B, r.id)).rejects.toThrow(/not found/i);
    expect(await listRateRequests(f.db, f.B)).toEqual([]);

    await acceptRateQuote(f.db, f.A, r.id);
    expect((await getRateRequest(f.db, f.A, r.id)).request.status).toBe('accepted');
    const hotelMails = await f.db.select().from(schema.outboundEmails).where(eq(schema.outboundEmails.toEmail, 'sales@seineview.test'));
    expect(hotelMails.map((m) => m.kind)).toEqual(['rate_request', 'rate_request_accepted']);
  });

  it('over budget: suggests similar on-request hotels and contracted ones that fit, and asks another hotel in one click', async () => {
    f = await setup();
    const h = await onRequestHotel(f, 'Seine View', 'luxury');
    const near = await onRequestHotel(f, 'Marais Boutique', 'premium');
    await onRequestHotel(f, 'Louvre Grand', 'ultra');
    const r = await ask(f, h.id, { budget: '950' });
    await hotelQuote(f.db, r.token, quote('160', addDays(f.today, 5))); // 960 net -> 1,037 sell, above 950

    const view = await getRateRequest(f.db, f.A, r.id);
    expect(view.fit).toBe('over');
    expect(view.alternatives.onRequest.map((x) => x.name)).toEqual(['Marais Boutique', 'Louvre Grand']); // nearest tier first
    // The contracted test hotel prices this stay within the budget.
    expect(view.alternatives.priced.map((x) => x.hotel.name)).toEqual(['Hotel Test Centre']);
    expect(view.alternatives.priced[0].fromMinor).toBeLessThanOrEqual(95_000);

    const next = await askAlternative(f.db, f.A, r.id, near.id);
    expect(next).toMatchObject({ hotelId: near.id, parentId: r.id, budgetMinor: 95_000, budgetCurrency: 'EUR', checkIn: r.checkIn });
    // Already asked hotels drop out of the suggestions.
    expect((await getRateRequest(f.db, f.A, r.id)).alternatives.onRequest.map((x) => x.name)).toEqual(['Louvre Grand']);
  });

  it('declines, lapses after 24 hours, and refuses hotels on contracted rates', async () => {
    f = await setup();
    await expect(ask(f, f.hotel.id)).rejects.toThrow(/contracted rates/);
    const h = await onRequestHotel(f, 'Seine View');
    const a = await ask(f, h.id);
    await hotelQuote(f.db, a.token, { decline: true, reason: 'Fully booked' });
    expect((await getRateRequest(f.db, f.A, a.id)).request).toMatchObject({ status: 'declined', declineReason: 'Fully booked' });

    const b = await ask(f, h.id);
    expect(await lapseRateRequests(f.db, new Date(Date.now() + 25 * 3_600_000))).toBe(1);
    expect((await getRateRequest(f.db, f.A, b.id)).request.status).toBe('no_response');
    await expect(hotelQuote(f.db, b.token, quote('120', addDays(f.today, 5)))).rejects.toThrow(/already been answered or closed/);
  });
});
