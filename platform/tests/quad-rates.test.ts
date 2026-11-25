/* Four adults in one room.
 *
 * The rate sheet carried prices for one, two and three adults, but the search
 * form has always accepted four (roomRequestSchema allows up to 4). So an
 * agent could ask for a quad and the engine would answer "no rate loaded" even
 * where the hotel publishes a quad rate — Centre Point Plus Pratunam's Grand
 * Deluxe is 4,900 net room-only, 5,300 with breakfast.
 *
 * The room's own capacity still decides whether four people fit at all. A quad
 * price on a room that sleeps three is not a licence to sell it.
 */
import { describe, expect, it } from 'vitest';
import { evaluateStay, occupancyPrice, type RatePeriodRow } from '@/lib/domain/contract-engine';
import { ratePeriodSchema } from '@/lib/services/catalog';

const contract = {
  id: 'c1', status: 'active', distributionPermitted: true,
  validFrom: '2026-11-01', validTo: '2027-10-31',
  confirmationMode: 'on_request', inventoryModel: 'direct_net',
};
/** Centre Point's Grand Deluxe: 47 sqm, sleeps four adults plus one child. */
const grandDeluxe = { id: 'r1', name: 'Grand Deluxe', active: true, maxAdults: 4, maxChildren: 1, maxOccupancy: 4 };

/** Winter promotion, room only: 2,900 / 3,900 triple / 4,900 quad. */
const period: RatePeriodRow = {
  roomTypeId: 'r1', mealPlan: 'RO', dateFrom: '2026-11-01', dateTo: '2027-03-31', active: true,
  price1Minor: 290_000, price2Minor: 290_000, price3Minor: 390_000, price4Minor: 490_000,
  childMinor: 0, minStay: 1, releaseDays: 0,
};

const run = (adults: number, roomType = grandDeluxe, p: RatePeriodRow = period) => evaluateStay({
  contract, roomType, mealPlan: 'RO', periods: [p], restrictions: [], allocations: [],
  stay: { checkIn: '2026-12-10', checkOut: '2026-12-11', today: '2026-11-25', rooms: [{ adults, childAges: [] }] },
});

describe('quad occupancy pricing', () => {
  it('prices four adults from the quad rate', () => {
    expect(occupancyPrice(period, { adults: 4, childAges: [] })).toBe(490_000);
  });

  it('still prices one, two and three adults exactly as before', () => {
    expect(occupancyPrice(period, { adults: 1, childAges: [] })).toBe(290_000);
    expect(occupancyPrice(period, { adults: 2, childAges: [] })).toBe(290_000);
    expect(occupancyPrice(period, { adults: 3, childAges: [] })).toBe(390_000);
  });

  it('refuses four adults when the hotel publishes no quad rate', () => {
    // This is the old behaviour, and it must stay: no price means no sale,
    // never the triple rate quietly stretched over a fourth guest.
    const noQuad = { ...period, price4Minor: null };
    expect(occupancyPrice(noQuad, { adults: 4, childAges: [] })).toBeNull();
    expect(run(4, grandDeluxe, noQuad)).toMatchObject({ ok: false });
  });

  it('treats a rate row that predates quad pricing as having no quad rate', () => {
    // price4Minor is optional on the row type, so an older caller omits it.
    const legacy = { ...period } as RatePeriodRow;
    delete legacy.price4Minor;
    expect(occupancyPrice(legacy, { adults: 4, childAges: [] })).toBeNull();
    expect(occupancyPrice(legacy, { adults: 2, childAges: [] })).toBe(290_000);
  });

  it('quotes a four-adult stay end to end', () => {
    const r = run(4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(490_000);
    expect(r.personNights).toBe(4);
  });

  it('refuses four adults in a room that only sleeps three, quad rate or not', () => {
    const triple = { id: 'r1', name: 'Grand Deluxe Executive', active: true, maxAdults: 3, maxChildren: 1, maxOccupancy: 3 };
    const r = run(4, triple);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain('does not fit');
  });

  it('adds the child charge on top of the quad rate', () => {
    const withChild = { ...period, childMinor: 30_000 };
    expect(occupancyPrice(withChild, { adults: 4, childAges: [8] })).toBe(490_000 + 30_000);
  });
});

describe('a quad rate accepts a row with only a quad price', () => {
  it('passes validation when quad is the only occupancy priced', () => {
    const parsed = ratePeriodSchema.safeParse({
      roomTypeId: '11111111-1111-4111-8111-111111111111', mealPlan: 'RO',
      dateFrom: '2026-12-01', dateTo: '2026-12-31',
      price1Minor: null, price2Minor: null, price3Minor: null, price4Minor: 490_000,
      childMinor: null, minStay: 1, releaseDays: 0,
    });
    expect(parsed.success).toBe(true);
  });

  it('defaults quad to null when a caller does not mention it', () => {
    const parsed = ratePeriodSchema.parse({
      roomTypeId: '11111111-1111-4111-8111-111111111111', mealPlan: 'RO',
      dateFrom: '2026-12-01', dateTo: '2026-12-31',
      price1Minor: null, price2Minor: 290_000, price3Minor: null,
      childMinor: null, minStay: 1, releaseDays: 0,
    });
    expect(parsed.price4Minor).toBeNull();
  });
});
