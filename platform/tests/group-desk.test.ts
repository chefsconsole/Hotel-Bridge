import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import { SYSTEM } from '@/lib/services/actor';
import { createEnquiry, decideProposal, getEnquiry } from '@/lib/services/groups';
import { dispatchToHotels, hotelAnswer, lapseGroupRequests, requestByToken } from '@/lib/services/group-desk';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; });

async function enquiry(fx: Fixture, extra: Record<string, unknown> = {}) {
  return createEnquiry(fx.db, fx.A, {
    groupName: 'Mehta wedding', groupType: 'wedding', totalPax: 40, rooms: { single: 0, double: 20, twin: 0, triple: 0 },
    legs: [{ city: 'Paris', checkIn: addDays(fx.today, 60), checkOut: addDays(fx.today, 63) }],
    currency: 'EUR', coachParking: false, mealPlan: 'BB', quoteNeededBy: addDays(fx.today, 10), ...extra,
  });
}

const offer = (validUntil: string, rate = '110') => ({
  decline: false as const, currency: 'EUR' as const, lines: [{ roomType: 'Double', rooms: 20, nights: 3, rate }],
  mealPlan: 'BB', cancellationTerms: 'Free until 30 days before arrival', validUntil,
});

describe('group desk automation', () => {
  it('asks contracted group hotels with a 48h link; the hotel answers; the agent gets a 48h offer', async () => {
    f = await setup();
    // Automation is off by default (the team picks hotels and approves offers); this test switches it on.
    await f.db.insert(schema.settings).values([{ key: 'groups.autoDispatch', value: '1' }, { key: 'groups.autoProposal', value: '1' }]);
    await f.db.update(schema.hotels).set({ acceptsGroups: true, groupsEmail: 'groups@hotel.test', tier: 'premium', totalRooms: 320 });
    const e = await enquiry(f, { tiers: ['premium'] });

    const r = await dispatchToHotels(f.db, SYSTEM, e.id);
    expect(r).toMatchObject({ asked: 1, emailed: 0, notEmailed: 1, noHotels: [] }); // no email provider in tests
    const [req] = await f.db.select().from(schema.groupHotelRequests).where(eq(schema.groupHotelRequests.enquiryId, e.id));
    expect(req).toMatchObject({ source: 'contracted', status: 'generated', hotelEmail: 'groups@hotel.test' });
    expect(req.token).toMatch(/^[A-Z2-9]{24}$/);
    expect(Math.round((req.respondByAt!.getTime() - Date.now()) / 3_600_000)).toBe(48);
    expect(req.body).toContain(`/g/${req.token}`);
    const [mail] = await f.db.select().from(schema.outboundEmails);
    expect(mail.status).toBe('not_configured'); // recorded honestly, never "sent"
    // Asking again doesn't ask the same hotel twice.
    expect((await dispatchToHotels(f.db, SYSTEM, e.id)).alreadyAsked).toBe(1);
    // The agent is not told hotels were emailed when they weren't.
    const agent = await getEnquiry(f.db, f.A, e.id);
    expect(agent.messages.some((m) => /We've sent your request/.test(m.body))).toBe(false);
    expect(agent.requests).toEqual([]);

    // The hotel's link shows the group, not the agency.
    const found = await requestByToken(f.db, req.token!);
    expect(found?.open).toBe(true);
    expect(JSON.stringify(found)).not.toContain('Alpha Travels');
    await expect(hotelAnswer(f.db, req.token!, offer(addDays(f.today, 1)))).rejects.toThrow(/at least 48 hours/);
    const ans = await hotelAnswer(f.db, req.token!, offer(addDays(f.today, 10)));
    expect(ans.declined).toBe(false);
    await expect(hotelAnswer(f.db, req.token!, offer(addDays(f.today, 10)))).rejects.toThrow(/already been answered/);

    // Every city has an offer -> automatic proposal: 8% default markup, held 48h, sent to the agent.
    const view = await getEnquiry(f.db, f.A, e.id);
    const p = view.proposals[0];
    expect(p.status).toBe('sent');
    expect(p.sellTotalMinor).toBe(Math.round(660_000 * 1.08));
    expect(Math.round((p.expiresAt!.getTime() - Date.now()) / 3_600_000)).toBe(48);
    expect(view.progress).toMatchObject({ offers: 1, answered: 1 });

    // After 48 hours the offer can't be accepted.
    await f.db.update(schema.groupProposals).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.groupProposals.id, p.id));
    await expect(decideProposal(f.db, f.A, p.id, true)).rejects.toThrow(/expired/);
  });

  it('falls back to outreach hotels in the city, respects tiers, and lapses unanswered requests', async () => {
    f = await setup();
    await f.db.insert(schema.hotelProspects).values([
      { name: 'Paris Palace (Paris)', destination: 'Paris · London', tier: 'Ultra-premium', priority: 'P1', contactEmail: 'dos@palace.test' },
      { name: 'Paris Value Hotel (Paris)', destination: 'Paris · London', tier: 'Premium 4–5★', priority: 'P2', contactEmail: 'sales@value.test' },
      { name: 'No Email Hotel (Paris)', destination: 'Paris · London', tier: 'Premium 4–5★', priority: 'P1' },
      { name: 'Declined Hotel (Paris)', destination: 'Paris · London', tier: 'Premium 4–5★', priority: 'P1', contactEmail: 'x@declined.test', stage: 'declined' },
    ]);
    const e = await enquiry(f, { tiers: ['premium'] });
    const r = await dispatchToHotels(f.db, SYSTEM, e.id);
    expect(r.asked).toBe(1);
    const reqs = await f.db.select().from(schema.groupHotelRequests).where(eq(schema.groupHotelRequests.enquiryId, e.id));
    expect(reqs.map((x) => [x.hotelName, x.source])).toEqual([['Paris Value Hotel (Paris)', 'outreach']]);

    const declined = await enquiry(f);
    await dispatchToHotels(f.db, SYSTEM, declined.id);
    const d = await f.db.select().from(schema.groupHotelRequests).where(eq(schema.groupHotelRequests.enquiryId, declined.id));
    expect(d.map((x) => x.hotelName).sort()).toEqual(['Paris Palace (Paris)', 'Paris Value Hotel (Paris)']);
    await hotelAnswer(f.db, d[0].token!, { decline: true, reason: 'Fully booked' });

    expect(await lapseGroupRequests(f.db, new Date(Date.now() + 49 * 3_600_000))).toBe(2);
    const after = await f.db.select().from(schema.groupHotelRequests);
    expect(after.filter((x) => x.status === 'no_response')).toHaveLength(2);
    await expect(hotelAnswer(f.db, d[1].token!, { decline: true })).rejects.toThrow(/already been answered/);

    const nowhere = await enquiry(f, { legs: [{ city: 'Reykjavik', checkIn: addDays(f.today, 60), checkOut: addDays(f.today, 62) }] });
    expect((await dispatchToHotels(f.db, SYSTEM, nowhere.id)).noHotels).toEqual(['Reykjavik']);
  });
});
