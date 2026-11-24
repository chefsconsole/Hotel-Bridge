/* Lead-time ("Early Bird") discounts.
 *
 * Patong Resort's contract: 10% off for booking 30+ days ahead, 15% for 60+,
 * valid for stays 1 Nov 2026 – 31 Oct 2027, blacked out 20 Dec – 20 Jan, and
 * never applied to meal or gala supplements.
 *
 * Three things here are easy to get wrong and cost real money:
 *  - the tiers must not stack (70 days out is 15%, not 25%);
 *  - the discount must come off the ROOM rate only, never the compulsory gala,
 *    which is money the hotel passes through rather than our margin;
 *  - the blackout is a GAP between tier rows, so a stay straddling it gets the
 *    discount on the nights outside and full rate on the nights inside.
 *
 * Lead time is measured to ARRIVAL, which is what a hotel means by booking
 * ahead and the same figure the release period uses.
 */
import { describe, expect, it } from 'vitest';
import { bestDiscountBps, evaluateStay, type DiscountRow, type RestrictionRow } from '@/lib/domain/contract-engine';

const contract = {
  id: 'c1', status: 'active', distributionPermitted: true,
  validFrom: '2026-11-01', validTo: '2027-10-31',
  confirmationMode: 'on_request', inventoryModel: 'direct_net',
};
const roomType = { id: 'r1', name: 'Superior', active: true, maxAdults: 3, maxChildren: 2, maxOccupancy: 3 };

/** Patong's Period B twin rate: THB 3,700. */
const period = {
  roomTypeId: 'r1', mealPlan: 'BB', dateFrom: '2026-11-01', dateTo: '2027-10-31', active: true,
  price1Minor: 340_000, price2Minor: 370_000, price3Minor: 470_000, childMinor: 90_000,
  minStay: 1, releaseDays: 0,
};

/* The contract's two tiers, with the 20 Dec – 20 Jan blackout expressed as the
 * gap between each tier's two rows. */
const TIERS: DiscountRow[] = [
  { roomTypeId: null, kind: 'early_bird', dateFrom: '2026-11-01', dateTo: '2026-12-19', minLeadDays: 30, discountBps: 1000 },
  { roomTypeId: null, kind: 'early_bird', dateFrom: '2027-01-21', dateTo: '2027-10-31', minLeadDays: 30, discountBps: 1000 },
  { roomTypeId: null, kind: 'early_bird', dateFrom: '2026-11-01', dateTo: '2026-12-19', minLeadDays: 60, discountBps: 1500 },
  { roomTypeId: null, kind: 'early_bird', dateFrom: '2027-01-21', dateTo: '2027-10-31', minLeadDays: 60, discountBps: 1500 },
];

const GALA: RestrictionRow = {
  roomTypeId: null, kind: 'supplement', dateFrom: '2026-12-31', dateTo: '2026-12-31',
  basis: 'per_person', amountMinor: 430_000, childAmountMinor: 280_000,
  note: 'Compulsory New Year’s Eve gala dinner',
};

const run = (args: {
  checkIn: string; checkOut: string; today: string;
  rooms?: { adults: number; childAges: number[] }[];
  discounts?: DiscountRow[]; restrictions?: RestrictionRow[];
}) => evaluateStay({
  contract, roomType, mealPlan: 'BB', periods: [period],
  restrictions: args.restrictions ?? [],
  discounts: args.discounts ?? TIERS,
  allocations: [],
  stay: {
    checkIn: args.checkIn, checkOut: args.checkOut, today: args.today,
    rooms: args.rooms ?? [{ adults: 2, childAges: [] }],
  },
});

describe('early bird tier selection', () => {
  const night = '2027-03-01';

  it('gives nothing when the booking is too late to qualify', () => {
    expect(bestDiscountBps(TIERS, night, 29)).toBe(0);
  });

  it('qualifies exactly on the boundary day, not a day later', () => {
    expect(bestDiscountBps(TIERS, night, 30)).toBe(1000);
    expect(bestDiscountBps(TIERS, night, 59)).toBe(1000);
    expect(bestDiscountBps(TIERS, night, 60)).toBe(1500);
  });

  it('never stacks the tiers — 70 days ahead is 15%, not 25%', () => {
    expect(bestDiscountBps(TIERS, night, 70)).toBe(1500);
  });

  it('gives nothing on a night inside the blackout, however early the booking', () => {
    expect(bestDiscountBps(TIERS, '2026-12-25', 300)).toBe(0);
    expect(bestDiscountBps(TIERS, '2027-01-10', 300)).toBe(0);
  });

  it('ignores a tier switched off', () => {
    const off = TIERS.map((t) => ({ ...t, active: false }));
    expect(bestDiscountBps(off, night, 300)).toBe(0);
  });
});

describe('early bird in a quote', () => {
  it('takes 10% off a room booked 30 days ahead', () => {
    const r = run({ checkIn: '2027-03-01', checkOut: '2027-03-03', today: '2027-01-30' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 3,700 - 370 = 3,330 a night, twice.
    expect(r.rooms[0].nightly).toEqual([
      { night: '2027-03-01', amountMinor: 333_000, discountMinor: 37_000 },
      { night: '2027-03-02', amountMinor: 333_000, discountMinor: 37_000 },
    ]);
    expect(r.contractAmountMinor).toBe(666_000);
    expect(r.discountMinor).toBe(74_000);
  });

  it('takes 15% off at 60 days and reports it to the agent', () => {
    const r = run({ checkIn: '2027-03-01', checkOut: '2027-03-02', today: '2026-12-01' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(370_000 - 55_500);
    expect(r.discountMinor).toBe(55_500);
    expect(r.notes.some((n) => n.includes('15% off the room rate'))).toBe(true);
  });

  it('charges the full rate, and says nothing, when the booking is late', () => {
    const r = run({ checkIn: '2027-03-01', checkOut: '2027-03-02', today: '2027-02-20' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(370_000);
    expect(r.discountMinor).toBe(0);
    expect(r.notes.some((n) => n.includes('Early Bird'))).toBe(false);
  });

  it('discounts every room in a multi-room stay', () => {
    const r = run({
      checkIn: '2027-03-01', checkOut: '2027-03-02', today: '2026-12-01',
      rooms: [{ adults: 2, childAges: [] }, { adults: 2, childAges: [] }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.discountMinor).toBe(2 * 55_500);
    expect(r.contractAmountMinor).toBe(2 * (370_000 - 55_500));
  });

  it('discounts the room but NOT the compulsory gala', () => {
    /* 31 Dec is inside the blackout, so that night is full rate plus the full
     * gala. If the blackout were ever lifted the gala must still be untouched,
     * which the next test pins down. */
    const r = run({
      checkIn: '2026-12-31', checkOut: '2027-01-01', today: '2026-10-01',
      restrictions: [GALA],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(370_000 + 2 * 430_000);
    expect(r.discountMinor).toBe(0);
  });

  it('leaves a supplement at face value even when the night IS discounted', () => {
    const open: DiscountRow[] = [
      { roomTypeId: null, kind: 'early_bird', dateFrom: '2026-11-01', dateTo: '2027-10-31', minLeadDays: 60, discountBps: 1500 },
    ];
    const r = run({
      checkIn: '2026-12-31', checkOut: '2027-01-01', today: '2026-10-01',
      restrictions: [GALA], discounts: open,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Room discounted by 15%; the gala's 2 x 4,300 is whole.
    expect(r.discountMinor).toBe(55_500);
    expect(r.contractAmountMinor).toBe(370_000 - 55_500 + 2 * 430_000);
  });

  it('splits a stay that straddles the blackout', () => {
    // 18, 19 Dec discounted; 20, 21 Dec at full rate.
    const r = run({ checkIn: '2026-12-18', checkOut: '2026-12-22', today: '2026-09-01' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rooms[0].nightly.map((n) => n.discountMinor)).toEqual([55_500, 55_500, 0, 0]);
    expect(r.contractAmountMinor).toBe(4 * 370_000 - 2 * 55_500);
  });

  it('applies a tier limited to one room type only to that room type', () => {
    const other: DiscountRow[] = [
      { roomTypeId: 'r2', kind: 'early_bird', dateFrom: '2026-11-01', dateTo: '2027-10-31', minLeadDays: 30, discountBps: 1500 },
    ];
    const r = run({ checkIn: '2027-03-01', checkOut: '2027-03-02', today: '2026-12-01', discounts: other });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.discountMinor).toBe(0);
  });

  it('rounds the discount down, so it is never more than the contract gives', () => {
    const odd = { ...period, price2Minor: 333_333 };
    const r = evaluateStay({
      contract, roomType, mealPlan: 'BB', periods: [odd], restrictions: [],
      discounts: [{ roomTypeId: null, kind: 'early_bird', dateFrom: '2026-11-01', dateTo: '2027-10-31', minLeadDays: 30, discountBps: 1000 }],
      allocations: [],
      stay: { checkIn: '2027-03-01', checkOut: '2027-03-02', today: '2026-12-01', rooms: [{ adults: 2, childAges: [] }] },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 10% of 333,333 is 33,333.3 — the agent gets 33,333, not 33,334.
    expect(r.discountMinor).toBe(33_333);
    expect(r.contractAmountMinor).toBe(333_333 - 33_333);
  });

  it('refuses a tier loaded above 100% rather than selling below zero', () => {
    const broken: DiscountRow[] = [
      { roomTypeId: null, kind: 'early_bird', dateFrom: '2026-11-01', dateTo: '2027-10-31', minLeadDays: 30, discountBps: 20_000 },
    ];
    const r = run({ checkIn: '2027-03-01', checkOut: '2027-03-02', today: '2026-12-01', discounts: broken });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain('not a usable percentage');
  });

  it('prices exactly as before when a contract has no discounts at all', () => {
    const r = run({ checkIn: '2027-03-01', checkOut: '2027-03-03', today: '2026-12-01', discounts: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractAmountMinor).toBe(2 * 370_000);
    expect(r.discountMinor).toBe(0);
  });
});
