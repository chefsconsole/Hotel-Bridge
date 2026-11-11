/* Phase 3: the Group Desk board (next action per card, staff only, real counts)
 * and the side-by-side group offer comparison. */
import { afterEach, describe, expect, it } from 'vitest';
import { addDays, todayIso } from '@/lib/domain/dates';
import { compareOffers, type EnquiryIn, type OfferIn } from '@/lib/domain/offer-compare';
import { BOARD_STAGES, groupBoard, nextAction, type CardFacts } from '@/lib/services/group-board';
import { createEnquiry, generateHotelRequests, recordOffer, setStage } from '@/lib/services/groups';
import { setup, type Fixture } from './helpers';

let f: Fixture | undefined;
afterEach(async () => { await f?.close(); f = undefined; });

const today = todayIso();
const now = new Date();
const base: CardFacts = {
  status: 'new', respondBy: new Date(now.getTime() + 3_600_000), quoteNeededBy: addDays(today, 5),
  requests: { generated: 0, sent: 0, responded: 0, declined: 0, noResponse: 0, dueAt: null }, offers: 0, proposal: null,
};
const at = (p: Partial<CardFacts>, r: Partial<CardFacts['requests']> = {}) => nextAction({ ...base, ...p, requests: { ...base.requests, ...r } }, now, today);

describe('next action on each card', () => {
  it('walks the enquiry from "ask hotels" to "send the proposal"', () => {
    expect(at({})).toMatchObject({ tone: 'action', label: expect.stringMatching(/^Ask hotels for rates/) });
    expect(at({}, { generated: 3 })).toMatchObject({ tone: 'urgent', label: 'Send 3 hotel emails' });
    expect(at({ status: 'sent_to_hotels' }, { sent: 2, dueAt: new Date(now.getTime() + 3_600_000) })).toMatchObject({ tone: 'waiting', label: expect.stringMatching(/^2 hotels yet to reply · due/) });
    expect(at({ status: 'offers_received', offers: 2 }, { responded: 2 })).toMatchObject({ tone: 'action', label: 'Build a proposal from 2 offers' });
    expect(at({ status: 'proposal_prepared', offers: 2, proposal: { status: 'draft' } })).toMatchObject({ label: 'Send the draft proposal to the agent' });
    expect(at({ status: 'sent_to_agent' })).toMatchObject({ tone: 'waiting' });
    expect(at({ status: 'negotiation' })).toMatchObject({ tone: 'action' });
  });

  it('raises urgency for late hotels, overdue quotes and hotels that all declined', () => {
    expect(at({ status: 'sent_to_hotels' }, { sent: 1, dueAt: new Date(now.getTime() - 60_000) }).tone).toBe('urgent');
    expect(at({ status: 'offers_received', offers: 1, quoteNeededBy: addDays(today, -1) })).toMatchObject({ tone: 'urgent', label: expect.stringContaining('quote overdue') });
    expect(at({ status: 'sent_to_hotels' }, { declined: 3 })).toMatchObject({ tone: 'urgent', label: 'No hotel offered — ask more hotels' });
    expect(at({ respondBy: new Date(now.getTime() - 60_000) }).label).toContain('first reply to the agent is overdue');
  });

  it('never offers won, lost or cancelled as drag targets', () => {
    expect(BOARD_STAGES).not.toContain('won');
    expect(BOARD_STAGES).not.toContain('lost');
    expect(BOARD_STAGES).not.toContain('cancelled');
  });
});

describe('group board', () => {
  it('is staff only and counts real hotel requests and offers', async () => {
    const fx = await setup();
    f = fx;
    const e = await createEnquiry(fx.db, fx.A, {
      groupName: 'Board test', groupType: 'leisure', legs: [{ city: 'Phuket', checkIn: addDays(fx.today, 40), checkOut: addDays(fx.today, 43) }],
      totalPax: 20, rooms: { single: 0, double: 10, twin: 0, triple: 0 }, currency: 'THB', coachParking: false, quoteNeededBy: addDays(fx.today, 10), tiers: [],
    });
    await expect(groupBoard(fx.db, fx.A)).rejects.toThrow();

    await generateHotelRequests(fx.db, fx.ADMIN, e.id, { hotelIds: [], manual: [{ name: 'Hotel One', city: 'Phuket', email: 'one@h.test' }, { name: 'Hotel Two', city: 'Phuket', email: 'two@h.test' }], respondBy: addDays(fx.today, 5) });
    let card = (await groupBoard(fx.db, fx.ADMIN)).find((c) => c.id === e.id)!;
    expect(card).toMatchObject({ asked: 2, offers: 0, rooms: 10, cities: 'Phuket' });
    expect(card.next.label).toBe('Send 2 hotel emails');

    await recordOffer(fx.db, fx.ADMIN, e.id, { hotelName: 'Hotel One', city: 'Phuket', currency: 'THB', lines: [{ roomType: 'Deluxe', rooms: 10, nights: 3, rateMinor: 200_000 }], validUntil: addDays(fx.today, 7) });
    card = (await groupBoard(fx.db, fx.ADMIN)).find((c) => c.id === e.id)!;
    expect(card.status).toBe('offers_received');
    expect(card.offers).toBe(1);

    // Moving between open stages works; a closed enquiry cannot be dragged back.
    await setStage(fx.db, fx.ADMIN, e.id, 'negotiation');
    await setStage(fx.db, fx.ADMIN, e.id, 'lost', 'Client chose another destination');
    await expect(setStage(fx.db, fx.ADMIN, e.id, 'new')).rejects.toThrow(/closed/);
    expect((await groupBoard(fx.db, fx.ADMIN)).find((c) => c.id === e.id)?.next.tone).toBe('done');
  });
});

describe('group offer comparison', () => {
  const enquiry: EnquiryIn = {
    legs: [{ city: 'Phuket', checkIn: '2027-02-01', checkOut: '2027-02-04' }],
    rooms: { single: 0, double: 10, twin: 0, triple: 0 }, totalPax: 20, currency: 'THB', mealPlan: 'BB',
    budgetMinor: 250_000, budgetBasis: 'per_room_night',
  };
  const offer = (id: string, rate: number, extra: Partial<OfferIn> = {}): OfferIn => {
    const lines = extra.lines ?? [{ roomType: 'Deluxe', rooms: 10, nights: 3, rateMinor: rate }];
    return {
      id, hotelName: id, city: 'phuket', currency: 'THB', lines, mealPlan: 'BB', taxesNote: null, cityTaxMinor: null,
      cancellationTerms: null, paymentTerms: null, validUntil: '2027-01-15', costTotalMinor: lines.reduce((s, l) => s + l.rooms * l.nights * l.rateMinor, 0), ...extra,
    };
  };

  it('compares per room-night, checks budget and coverage, and marks only the lowest live offer', () => {
    const [c] = compareOffers([offer('A', 300_000), offer('B', 200_000), offer('C', 100_000, { validUntil: '2026-01-01' })], enquiry, '2026-11-11');
    expect(c.nights).toBe(3);
    const by = Object.fromEntries(c.columns.map((x) => [x.offer.id, x]));
    expect(by.B).toMatchObject({ perRoomNightMinor: 200_000, budget: 'within', lowest: true, coverage: { offered: 30, needed: 30 } });
    expect(by.A).toMatchObject({ budget: 'over', lowest: false });
    expect(by.C).toMatchObject({ expired: true, lowest: false });
    expect(c.columns.map((x) => x.offer.id)).toEqual(['B', 'A', 'C']);
  });

  it('flags short coverage, the wrong board, city tax, and never ranks mixed currencies', () => {
    const [c] = compareOffers([
      offer('Short', 200_000, { lines: [{ roomType: 'Deluxe', rooms: 8, nights: 3, rateMinor: 200_000 }], mealPlan: 'RO', cityTaxMinor: 5_000 }),
      offer('Euro', 6_000, { currency: 'EUR' }),
    ], enquiry, '2026-11-11');
    const by = Object.fromEntries(c.columns.map((x) => [x.offer.id, x]));
    expect(by.Short.coverage).toEqual({ offered: 24, needed: 30 });
    expect(by.Short.boardMatches).toBe(false);
    expect(by.Short.cityTaxEstimateMinor).toBe(5_000 * 20 * 3);
    expect(by.Euro.budget).toBeNull();
    expect(c.mixedCurrency).toBe(true);
    expect(c.columns.some((x) => x.lowest)).toBe(false);
  });
});
