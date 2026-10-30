import { describe, expect, it } from 'vitest';
import { applyBps, convert, formatMoney, mulDiv, parseMoney, roundUpToWholeUnit, sumSameCurrency, totalsByCurrency } from '@/lib/domain/money';
import { priceOffer, priceGroupProposal, taxPortion, validateTerms, DEFAULT_RULE, type PricingTerms } from '@/lib/domain/pricing';
import { evaluateStay, type ContractRow, type RatePeriodRow, type RoomTypeRow } from '@/lib/domain/contract-engine';
import { cancellationPenalty, freeCancelUntil } from '@/lib/domain/cancellation';
import { canTransition } from '@/lib/domain/booking-state';
import { compareOffers, type ComparableOffer } from '@/lib/domain/comparison';
import { runScenario } from '@/lib/domain/scenario';
import { decodeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { nightsOf } from '@/lib/domain/dates';

describe('money', () => {
  it('rounds with integer arithmetic, never floats', () => {
    expect(applyBps(1001, 1000)).toBe(100); // 100.1 -> 100
    expect(applyBps(1005, 1000)).toBe(101); // 100.5 -> 101 (half up)
    expect(applyBps(1001, 1000, 'up')).toBe(101);
    expect(mulDiv(Number.MAX_SAFE_INTEGER - 1, 1, 1)).toBe(Number.MAX_SAFE_INTEGER - 1);
    // 0.1 + 0.2 problem cannot occur
    expect(parseMoney('0.10', 'EUR') + parseMoney('0.20', 'EUR')).toBe(30);
  });
  it('parses and rejects amounts per currency', () => {
    expect(parseMoney('1,234.50', 'EUR')).toBe(123_450);
    expect(parseMoney('1500', 'JPY')).toBe(1500);
    expect(() => parseMoney('12.345', 'EUR')).toThrow();
    expect(() => parseMoney('abc', 'EUR')).toThrow();
  });
  it('rounds selling prices up to whole units', () => {
    expect(roundUpToWholeUnit(10_001, 'EUR')).toBe(10_100);
    expect(roundUpToWholeUnit(10_000, 'EUR')).toBe(10_000);
  });
  it('refuses to add different currencies', () => {
    expect(() => sumSameCurrency([{ minor: 1, currency: 'EUR' }, { minor: 1, currency: 'INR' }])).toThrow();
    expect(totalsByCurrency([{ minor: 5, currency: 'EUR' }, { minor: 7, currency: 'INR' }, { minor: 5, currency: 'EUR' }])).toEqual([
      { currency: 'EUR', minor: 10 }, { currency: 'INR', minor: 7 }]);
  });
  it('converts only with a recorded rate', () => {
    const fx = { base: 'EUR', quote: 'INR', rateE8: 9_000_000_000, source: 'test', asOf: new Date() }; // 1 EUR = 90 INR
    expect(convert(10_000, fx, 'EUR', 'INR')).toBe(900_000);
    expect(convert(900_000, fx, 'INR', 'EUR')).toBe(10_000);
    expect(convert(10_000, { ...fx, base: 'EUR', quote: 'JPY', rateE8: 16_000_000_000 }, 'EUR', 'JPY')).toBe(16_000);
    expect(() => convert(1, fx, 'USD', 'INR')).toThrow();
    expect(formatMoney(123_450, 'EUR')).toBe('€1,234.50');
  });
});

const net: PricingTerms = { currency: 'EUR', rateBasis: 'net', collectionModel: 'prepaid_to_hb', taxMode: 'included', taxBps: 1000, commissionBps: 0, localTaxMinor: 300 };

describe('pricing engine', () => {
  it('net + percentage markup: markup on cost, margin on sell', () => {
    const p = priceOffer({ terms: net, contractAmountMinor: 20_000, roomNights: 2, personNights: 4, rule: { ...DEFAULT_RULE, valueBps: 1500 } });
    expect(p.supplierCostMinor).toBe(20_000);
    expect(p.sellMinor).toBe(23_000);
    expect(p.netRevenueMinor).toBe(3_000);
    expect(p.markupBps).toBe(1500); // 15% markup
    expect(p.marginBps).toBe(1304); // 13.04% margin — not the same thing
    expect(p.taxMinor).toBe(1_818); // VAT carved out of an inclusive rate
    expect(p.localTaxMinor).toBe(1_200); // payable at hotel, not in sell
  });
  it('fixed markup per room night, rounded up', () => {
    const p = priceOffer({ terms: net, contractAmountMinor: 20_050, roomNights: 2, personNights: 4, rule: { kind: 'fixed', fixedMinor: 500, rounding: 'whole_unit', source: 't' } });
    expect(p.sellMinor).toBe(21_100);
    expect(p.netRevenueMinor).toBe(1_050);
  });
  it('excluded tax is added to cost', () => {
    const p = priceOffer({ terms: { ...net, taxMode: 'excluded' }, contractAmountMinor: 10_000, roomNights: 1, personNights: 2, rule: { ...DEFAULT_RULE, valueBps: 0 } });
    expect(p.taxMinor).toBe(1_000);
    expect(p.supplierCostMinor).toBe(11_000);
    expect(taxPortion(11_000, 'included', 1000)).toBe(1_000);
  });
  it('commissionable prepaid: commission on pre-tax, agent share passed through', () => {
    const terms: PricingTerms = { ...net, rateBasis: 'commissionable', commissionBps: 1500 };
    const p = priceOffer({ terms, contractAmountMinor: 22_000, roomNights: 2, personNights: 4, rule: { ...DEFAULT_RULE, agentCommissionShareBps: 5000 } });
    expect(p.hotelCommissionMinor).toBe(3_000); // 15% of 20,000 pre-tax
    expect(p.agentCommissionMinor).toBe(1_500);
    expect(p.supplierCostMinor).toBe(19_000);
    expect(p.sellMinor).toBe(20_500);
    expect(p.netRevenueMinor).toBe(1_500);
  });
  it('commissionable pay-direct: no supplier cost, commission receivable', () => {
    const terms: PricingTerms = { ...net, rateBasis: 'commissionable', commissionBps: 1000, collectionModel: 'pay_direct_to_hotel' };
    const p = priceOffer({ terms, contractAmountMinor: 11_000, roomNights: 1, personNights: 2, rule: DEFAULT_RULE });
    expect(p.supplierCostMinor).toBe(0);
    expect(p.commissionReceivableMinor).toBe(1_000);
    expect(p.sellMinor).toBe(11_000);
  });
  it('refuses unsafe term combinations', () => {
    expect(() => validateTerms({ ...net, collectionModel: 'pay_direct_to_hotel' })).toThrow(/Net-rate/);
    expect(() => validateTerms({ ...net, rateBasis: 'commissionable', commissionBps: 0 })).toThrow();
  });
  it('group proposals: markup on cost, rounded up', () => {
    expect(priceGroupProposal(100_000, 1200, 'EUR')).toEqual({ sellMinor: 112_000, netRevenueMinor: 12_000, marginBps: 1071 });
  });
});

const contract: ContractRow = { id: 'c', status: 'active', distributionPermitted: true, validFrom: '2030-01-01', validTo: '2030-12-31', confirmationMode: 'instant_allocation', inventoryModel: 'direct_net' };
const rt: RoomTypeRow = { id: 'r', name: 'Double', active: true, maxAdults: 2, maxChildren: 1, maxOccupancy: 3 };
const period: RatePeriodRow = { roomTypeId: 'r', mealPlan: 'BB', dateFrom: '2030-01-01', dateTo: '2030-06-30', active: true, price1Minor: 9_000, price2Minor: 11_000, price3Minor: null, childMinor: 2_000, minStay: 2, releaseDays: 7 };
const summer: RatePeriodRow = { ...period, dateFrom: '2030-07-01', dateTo: '2030-12-31', price2Minor: 15_000, minStay: 1 };
const allot = (n: number) => nightsOf('2030-06-01', '2030-07-31').map((night) => ({ roomTypeId: 'r', night, total: n, sold: 0 }));
const base = { contract, roomType: rt, mealPlan: 'BB', periods: [period, summer], restrictions: [], allocations: allot(3) };

describe('contract engine', () => {
  const s = (checkIn: string, checkOut: string, rooms = [{ adults: 2, childAges: [] as number[] }], today = '2030-05-01') => ({ checkIn, checkOut, rooms, today });

  it('prices mixed occupancies per room and across seasons', () => {
    const r = evaluateStay({ ...base, stay: s('2030-06-29', '2030-07-02', [{ adults: 2, childAges: [] }, { adults: 1, childAges: [] }, { adults: 2, childAges: [6] }]) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rooms[0].totalMinor).toBe(11_000 * 2 + 15_000); // two spring nights, one summer
    expect(r.rooms[1].totalMinor).toBe(9_000 * 2 + 9_000); // single occupancy
    expect(r.rooms[2].totalMinor).toBe(13_000 * 2 + 17_000);
    expect(r.availability).toBe('instant');
    expect(r.roomNights).toBe(9);
  });
  it('enforces min stay from the arrival night', () => {
    expect(evaluateStay({ ...base, stay: s('2030-06-10', '2030-06-11') })).toMatchObject({ ok: false, reason: 'Minimum stay is 2 nights' });
    expect(evaluateStay({ ...base, stay: s('2030-07-10', '2030-07-11') }).ok).toBe(true);
  });
  it('blocks blackout and stop-sell, adds supplements', () => {
    const black = evaluateStay({ ...base, restrictions: [{ roomTypeId: null, kind: 'blackout', dateFrom: '2030-06-11', dateTo: '2030-06-11', amountMinor: null, note: null }], stay: s('2030-06-10', '2030-06-13') });
    expect(black.ok).toBe(false);
    const stop = evaluateStay({ ...base, restrictions: [{ roomTypeId: 'r', kind: 'stop_sell', dateFrom: '2030-06-12', dateTo: '2030-06-12', amountMinor: null, note: null }], stay: s('2030-06-10', '2030-06-13') });
    expect(stop.ok).toBe(false);
    const sup = evaluateStay({ ...base, restrictions: [{ roomTypeId: null, kind: 'supplement', dateFrom: '2030-06-10', dateTo: '2030-06-10', amountMinor: 5_000, note: 'Fair' }], stay: s('2030-06-10', '2030-06-12') });
    expect(sup.ok && sup.contractAmountMinor).toBe(11_000 * 2 + 5_000);
  });
  it('falls back to on request inside release or without allotment', () => {
    const inRelease = evaluateStay({ ...base, stay: s('2030-06-10', '2030-06-12', undefined, '2030-06-05') });
    expect(inRelease.ok && inRelease.availability).toBe('on_request');
    const noAllot = evaluateStay({ ...base, allocations: allot(1), stay: s('2030-06-10', '2030-06-12', [{ adults: 2, childAges: [] }, { adults: 2, childAges: [] }]) });
    expect(noAllot.ok && noAllot.availability).toBe('on_request');
  });
  it('rejects what the contract does not allow', () => {
    expect(evaluateStay({ ...base, contract: { ...contract, distributionPermitted: false }, stay: s('2030-06-10', '2030-06-12') }).ok).toBe(false);
    expect(evaluateStay({ ...base, contract: { ...contract, status: 'draft' }, stay: s('2030-06-10', '2030-06-12') }).ok).toBe(false);
    expect(evaluateStay({ ...base, stay: s('2030-12-30', '2031-01-02') }).ok).toBe(false); // past validity
    expect(evaluateStay({ ...base, stay: s('2030-06-10', '2030-06-12', [{ adults: 3, childAges: [] }]) }).ok).toBe(false); // doesn't fit
    expect(evaluateStay({ ...base, stay: s('2030-06-10', '2030-06-12', [{ adults: 2, childAges: [4] }]), periods: [{ ...period, childMinor: null }] }).ok).toBe(false);
  });
});

describe('cancellation', () => {
  const policy = { nonRefundable: false, freeCancelDays: 3, latePenaltyType: 'first_night' as const, latePenaltyBps: 0 };
  it('free until the deadline, then first night, no-show full', () => {
    expect(freeCancelUntil(policy, '2030-06-10')).toBe('2030-06-07');
    const args = { policy, checkIn: '2030-06-10', sellMinor: 30_000, costMinor: 24_000, firstNightContractMinor: 8_000, contractAmountMinor: 24_000 };
    expect(cancellationPenalty({ ...args, today: '2030-06-07' }).sellPenaltyMinor).toBe(0);
    expect(cancellationPenalty({ ...args, today: '2030-06-08' })).toMatchObject({ sellPenaltyMinor: 10_000, costPenaltyMinor: 8_000 });
    expect(cancellationPenalty({ ...args, today: '2030-06-10' }).sellPenaltyMinor).toBe(30_000);
    expect(cancellationPenalty({ ...args, policy: { ...policy, nonRefundable: true }, today: '2030-01-01' }).sellPenaltyMinor).toBe(30_000);
  });
});

describe('booking state machine', () => {
  it('allows only real transitions', () => {
    expect(canTransition('submitting', 'confirmed')).toBe(true);
    expect(canTransition('outcome_unknown', 'confirmed')).toBe(true);
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
    expect(canTransition('failed', 'submitting')).toBe(false);
    expect(canTransition('pending_confirmation', 'declined')).toBe(true);
    expect(canTransition('confirmed', 'pending_confirmation')).toBe(false);
  });
});

describe('rate comparison', () => {
  const a: ComparableOffer = { supplier: 'contracted', hotelId: 'h', roomTypeId: 'r', roomName: 'Double', mealPlan: 'BB', currency: 'EUR', sellMinor: 20_000, freeCancelUntil: '2030-06-07', nonRefundable: false, taxesIncluded: true, localTaxMinor: 0, collectionModel: 'prepaid_to_hb', availability: 'instant' };
  it('compares like with like only', () => {
    expect(compareOffers(a, { ...a, supplier: 'x', sellMinor: 21_000 })).toEqual({ comparable: true, differences: [], deltaMinor: -1_000 });
    const c = compareOffers(a, { ...a, roomTypeId: null, mealPlan: 'RO', nonRefundable: true, currency: 'USD' });
    expect(c.comparable).toBe(false);
    expect(c.deltaMinor).toBeNull();
    expect(c.differences.length).toBeGreaterThanOrEqual(4);
  });
});

describe('scenario model', () => {
  it('separates GBV, net revenue, gross profit and contribution, with stepped support cost', () => {
    const r = runScenario({ activeAgencies: 100, bookingsPerAgencyPerMonth: 2, avgBookingValueMinor: 50_000, takeRateBps: 800, cancellationRateBps: 1000, prepaidShareBps: 10_000, paymentCostBps: 200, bookingsPerSupportPerson: 150, supportPersonMonthlyMinor: 300_000, accountCostPerAgencyMonthlyMinor: 1_000 });
    expect(r.bookingsCreated).toBe(200);
    expect(r.bookingsRealised).toBe(180);
    expect(r.gbvMinor).toBe(9_000_000);
    expect(r.netRevenueMinor).toBe(720_000);
    expect(r.paymentCostMinor).toBe(180_000);
    expect(r.grossProfitMinor).toBe(540_000);
    expect(r.supportPeople).toBe(2);
    expect(r.contributionMinor).toBe(540_000 - 600_000 - 100_000);
  });
});

describe('room encoding', () => {
  it('round-trips mixed rooms', () => {
    const rooms = [{ adults: 2, childAges: [] }, { adults: 2, childAges: [5, 9] }, { adults: 1, childAges: [] }];
    expect(decodeRooms(encodeRooms(rooms))).toEqual(rooms);
    expect(decodeRooms('9-99')).toEqual([{ adults: 2, childAges: [] }]); // invalid falls back safely
  });
});
