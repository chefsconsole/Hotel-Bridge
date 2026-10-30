/* ------------------------------------------------------------------ *
 * The contracted-rate engine: given a contract's rate sheet, restrictions
 * and allotment, can these rooms be sold for these nights, how, and at what
 * contract amount?  Pure — the caller loads the rows.
 *
 * Rules, in the order a revenue manager would apply them:
 *  1. Contract must be active, distribution permitted, and cover every night.
 *  2. Every night needs an active rate period for the room type + meal plan.
 *  3. The occupancy must fit the room type and have a price.
 *  4. Blackout or stop-sell on any night -> not sellable.
 *  5. Minimum stay is taken from the ARRIVAL night's period.
 *  6. Inside the release period, allotment can't be used -> on request.
 *  7. Instant confirmation only with allotment left on every night.
 * ------------------------------------------------------------------ */
import { daysBetween, nightsOf, within } from './dates';
import { fits, type RoomCapacity } from './occupancy';
import type { RoomRequest } from '@/lib/db/schema';

export type ContractRow = {
  id: string; status: string; distributionPermitted: boolean;
  validFrom: string; validTo: string; confirmationMode: string; inventoryModel: string;
};
export type RatePeriodRow = {
  roomTypeId: string; mealPlan: string; dateFrom: string; dateTo: string; active: boolean;
  price1Minor: number | null; price2Minor: number | null; price3Minor: number | null; childMinor: number | null;
  minStay: number; releaseDays: number;
};
export type RestrictionRow = { roomTypeId: string | null; kind: string; dateFrom: string; dateTo: string; amountMinor: number | null; note: string | null };
export type AllocationRow = { roomTypeId: string; night: string; total: number; sold: number };
export type RoomTypeRow = RoomCapacity & { id: string; name: string; active: boolean };

export type StayRequest = { checkIn: string; checkOut: string; rooms: RoomRequest[]; today: string };

export type RoomPrice = { roomIndex: number; nightly: { night: string; amountMinor: number }[]; totalMinor: number };

export type EngineResult =
  | {
    ok: true; availability: 'instant' | 'on_request'; rooms: RoomPrice[]; contractAmountMinor: number;
    roomNights: number; personNights: number; notes: string[];
  }
  | { ok: false; reason: string };

export function occupancyPrice(p: RatePeriodRow, room: RoomRequest): number | null {
  const byAdults = [null, p.price1Minor, p.price2Minor, p.price3Minor][room.adults] ?? null;
  if (byAdults == null) return null;
  if (room.childAges.length === 0) return byAdults;
  if (p.childMinor == null) return null;
  return byAdults + p.childMinor * room.childAges.length;
}

export function evaluateStay(args: {
  contract: ContractRow;
  roomType: RoomTypeRow;
  mealPlan: string;
  periods: RatePeriodRow[];
  restrictions: RestrictionRow[];
  allocations: AllocationRow[];
  stay: StayRequest;
}): EngineResult {
  const { contract, roomType, mealPlan, stay } = args;
  const nights = nightsOf(stay.checkIn, stay.checkOut);
  if (nights.length === 0) return { ok: false, reason: 'Check-out must be after check-in' };
  if (stay.checkIn < stay.today) return { ok: false, reason: 'Check-in is in the past' };
  if (contract.status !== 'active') return { ok: false, reason: 'Contract is not active' };
  if (!contract.distributionPermitted) return { ok: false, reason: 'Contract does not permit B2B distribution' };
  if (!roomType.active) return { ok: false, reason: 'Room type is not on sale' };
  if (nights[0] < contract.validFrom || nights[nights.length - 1] > contract.validTo) {
    return { ok: false, reason: 'Stay falls outside the contract validity' };
  }
  for (const r of stay.rooms) {
    if (!fits(r, roomType)) return { ok: false, reason: `${roomType.name} does not fit ${r.adults} adult(s) and ${r.childAges.length} child(ren)` };
  }

  const periods = args.periods.filter((p) => p.active && p.roomTypeId === roomType.id && p.mealPlan === mealPlan);
  const periodFor = (night: string) => periods.find((p) => within(night, p.dateFrom, p.dateTo));

  const restr = args.restrictions.filter((r) => r.roomTypeId == null || r.roomTypeId === roomType.id);
  const notes: string[] = [];
  const roomPrices: RoomPrice[] = stay.rooms.map((_, i) => ({ roomIndex: i, nightly: [], totalMinor: 0 }));

  for (const night of nights) {
    const p = periodFor(night);
    if (!p) return { ok: false, reason: `No rate loaded for ${night}` };
    const closed = restr.find((r) => (r.kind === 'blackout' || r.kind === 'stop_sell') && within(night, r.dateFrom, r.dateTo));
    if (closed) return { ok: false, reason: closed.kind === 'blackout' ? `Blackout date (${night})` : `Stop-sell in place (${night})` };
    const supplement = restr
      .filter((r) => r.kind === 'supplement' && within(night, r.dateFrom, r.dateTo))
      .reduce((s, r) => s + (r.amountMinor ?? 0), 0);
    for (let i = 0; i < stay.rooms.length; i++) {
      const base = occupancyPrice(p, stay.rooms[i]);
      if (base == null) return { ok: false, reason: `No price for this occupancy in ${roomType.name}` };
      const amount = base + supplement;
      roomPrices[i].nightly.push({ night, amountMinor: amount });
      roomPrices[i].totalMinor += amount;
    }
  }
  if (restr.some((r) => r.kind === 'supplement' && nights.some((n) => within(n, r.dateFrom, r.dateTo)))) {
    notes.push('Includes a high-demand supplement on some nights.');
  }

  const arrival = periodFor(nights[0])!;
  if (nights.length < arrival.minStay) return { ok: false, reason: `Minimum stay is ${arrival.minStay} nights` };

  const leadDays = daysBetween(stay.today, stay.checkIn);
  const insideRelease = leadDays < arrival.releaseDays;

  let availability: 'instant' | 'on_request' = 'on_request';
  if (contract.confirmationMode === 'instant_allocation' && contract.inventoryModel !== 'request_only' && !insideRelease) {
    const need = stay.rooms.length;
    const allotOk = nights.every((n) => {
      const a = args.allocations.find((x) => x.roomTypeId === roomType.id && x.night === n);
      return a != null && a.total - a.sold >= need;
    });
    if (allotOk) availability = 'instant';
    else notes.push('No allotment left on some nights — sent to the hotel as a request.');
  } else if (insideRelease && contract.confirmationMode === 'instant_allocation') {
    notes.push(`Inside the ${arrival.releaseDays}-day release period — the hotel must confirm.`);
  }

  const contractAmountMinor = roomPrices.reduce((s, r) => s + r.totalMinor, 0);
  const personNights = stay.rooms.reduce((s, r) => s + r.adults + r.childAges.length, 0) * nights.length;
  return { ok: true, availability, rooms: roomPrices, contractAmountMinor, roomNights: nights.length * stay.rooms.length, personNights, notes };
}
