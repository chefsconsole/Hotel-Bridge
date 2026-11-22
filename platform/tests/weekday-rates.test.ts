/* Weekday rate bands.
 *
 * Airport and business hotels price Monday–Thursday apart from Friday–Sunday —
 * Mövenpick Zürich-Airport's 2027 FIT sheet does exactly that. Before rate
 * periods carried a weekday mask, the only way to load such a sheet was to
 * pick one band and quote it all week, which is wrong every other night.
 */
import { describe, expect, it } from 'vitest';
import { ALL_DAYS, dayAllowed, dayOfWeek, describeDays, daysOverlap } from '@/lib/domain/dates';
import { evaluateStay, type RatePeriodRow } from '@/lib/domain/contract-engine';

const MON_THU = 0b0001111; // bits 0–3
const FRI_SUN = 0b1110000; // bits 4–6

const contract = {
  id: 'c1', status: 'active', distributionPermitted: true,
  validFrom: '2027-01-01', validTo: '2027-12-31',
  confirmationMode: 'on_request', inventoryModel: 'direct_net',
};
const roomType = { id: 'r1', name: 'Queen', active: true, maxAdults: 3, maxChildren: 0, maxOccupancy: 3 };

const period = (days: number, price2: number): RatePeriodRow => ({
  roomTypeId: 'r1', mealPlan: 'BB', dateFrom: '2027-01-01', dateTo: '2027-12-31', active: true,
  price1Minor: price2 - 1_500, price2Minor: price2, price3Minor: null, childMinor: null,
  daysOfWeek: days, minStay: 1, releaseDays: 0,
});

const stay = (checkIn: string, checkOut: string) => ({
  checkIn, checkOut, rooms: [{ adults: 2, childAges: [] }], today: '2027-01-01',
});

describe('weekday rate bands', () => {
  it('knows which weekday a night falls on', () => {
    // 2027-06-07 is a Monday.
    expect(dayOfWeek('2027-06-07')).toBe(0);
    expect(dayOfWeek('2027-06-10')).toBe(3); // Thursday
    expect(dayOfWeek('2027-06-11')).toBe(4); // Friday
    expect(dayOfWeek('2027-06-13')).toBe(6); // Sunday

    expect(dayAllowed(MON_THU, '2027-06-10')).toBe(true);
    expect(dayAllowed(MON_THU, '2027-06-11')).toBe(false);
    expect(dayAllowed(FRI_SUN, '2027-06-11')).toBe(true);
    expect(dayAllowed(ALL_DAYS, '2027-06-11')).toBe(true);

    // The two bands between them cover the week exactly once.
    expect(MON_THU | FRI_SUN).toBe(ALL_DAYS);
    expect(daysOverlap(MON_THU, FRI_SUN)).toBe(false);
    expect(daysOverlap(MON_THU, ALL_DAYS)).toBe(true);
  });

  it('reads a mask back in words', () => {
    expect(describeDays(ALL_DAYS)).toBe('Every night');
    expect(describeDays(MON_THU)).toBe('Mon–Thu');
    expect(describeDays(FRI_SUN)).toBe('Fri–Sun');
    expect(describeDays(0b0000001)).toBe('Mon');
    expect(describeDays(0b0010101)).toBe('Mon, Wed, Fri');
  });

  it('prices each night from the band that owns that weekday', () => {
    // Mövenpick Zürich-Airport's own shape: weekdays dearer than weekends.
    const periods = [period(MON_THU, 16_800), period(FRI_SUN, 15_600)];

    // Thu 10 → Sat 12 June 2027: one Thursday night, one Friday night.
    const res = evaluateStay({
      contract, roomType, mealPlan: 'BB', periods, restrictions: [], allocations: [],
      stay: stay('2027-06-10', '2027-06-12'),
    });
    if (!res.ok) throw new Error(res.reason);
    expect(res.rooms[0].nightly).toEqual([
      { night: '2027-06-10', amountMinor: 16_800 }, // Thursday — weekday band
      { night: '2027-06-11', amountMinor: 15_600 }, // Friday — weekend band
    ]);
    expect(res.contractAmountMinor).toBe(32_400);
  });

  it('prices a full week at the right rate on every single night', () => {
    const periods = [period(MON_THU, 16_800), period(FRI_SUN, 15_600)];
    const res = evaluateStay({
      contract, roomType, mealPlan: 'BB', periods, restrictions: [], allocations: [],
      stay: stay('2027-06-07', '2027-06-14'), // Mon → Mon, seven nights
    });
    if (!res.ok) throw new Error(res.reason);
    expect(res.rooms[0].nightly.map((n) => n.amountMinor)).toEqual([
      16_800, 16_800, 16_800, 16_800, // Mon Tue Wed Thu
      15_600, 15_600, 15_600, //          Fri Sat Sun
    ]);
    // Four weekday nights plus three weekend nights, and nothing double-counted.
    expect(res.contractAmountMinor).toBe(4 * 16_800 + 3 * 15_600);
    expect(res.roomNights).toBe(7);
  });

  it('refuses the stay when a band leaves a night unpriced', () => {
    // Only the weekday band is loaded: a Friday night has no rate at all.
    const res = evaluateStay({
      contract, roomType, mealPlan: 'BB', periods: [period(MON_THU, 16_800)], restrictions: [], allocations: [],
      stay: stay('2027-06-10', '2027-06-12'),
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected refusal');
    expect(res.reason).toMatch(/No rate loaded for 2027-06-11/);
  });

  it('treats a period with no mask as every night, so old contracts are untouched', () => {
    // No daysOfWeek at all — exactly how every period loaded before this existed.
    const legacy: RatePeriodRow = {
      roomTypeId: 'r1', mealPlan: 'BB', dateFrom: '2027-01-01', dateTo: '2027-12-31', active: true,
      price1Minor: 9_000, price2Minor: 10_000, price3Minor: null, childMinor: null,
      minStay: 1, releaseDays: 0,
    };
    const res = evaluateStay({
      contract, roomType, mealPlan: 'BB', periods: [legacy], restrictions: [], allocations: [],
      stay: stay('2027-06-10', '2027-06-14'), // crosses Thu, Fri, Sat, Sun
    });
    if (!res.ok) throw new Error(res.reason);
    expect(res.rooms[0].nightly.map((n) => n.amountMinor)).toEqual([10_000, 10_000, 10_000, 10_000]);
  });

  it('takes the minimum stay from the band that owns the arrival night', () => {
    const weekday = { ...period(MON_THU, 16_800), minStay: 3 };
    const weekend = { ...period(FRI_SUN, 15_600), minStay: 1 };

    // Arriving on a Friday: the weekend band's 1-night minimum applies.
    const fri = evaluateStay({
      contract, roomType, mealPlan: 'BB', periods: [weekday, weekend], restrictions: [], allocations: [],
      stay: stay('2027-06-11', '2027-06-12'),
    });
    expect(fri.ok).toBe(true);

    // Arriving on a Monday: the weekday band's 3-night minimum bites.
    const mon = evaluateStay({
      contract, roomType, mealPlan: 'BB', periods: [weekday, weekend], restrictions: [], allocations: [],
      stay: stay('2027-06-07', '2027-06-08'),
    });
    expect(mon.ok).toBe(false);
    if (mon.ok) throw new Error('expected refusal');
    expect(mon.reason).toMatch(/Minimum stay is 3 nights/);
  });
});
