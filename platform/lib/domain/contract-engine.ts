/* ------------------------------------------------------------------ *
 * The contracted-rate engine: given a contract's rate sheet, restrictions
 * and allotment, can these rooms be sold for these nights, how, and at what
 * contract amount?  Pure — the caller loads the rows.
 *
 * Rules, in the order a revenue manager would apply them:
 *  1. Contract must be active, distribution permitted, and cover every night.
 *  2. Every night needs an active rate period for the room type + meal plan
 *     whose weekday mask covers that night.
 *  3. The occupancy must fit the room type and have a price.
 *  4. Blackout or stop-sell on any night -> not sellable.
 *  5. Minimum stay is taken from the ARRIVAL night's period.
 *  6. Inside the release period, allotment can't be used -> on request.
 *  7. Instant confirmation only with allotment left on every night.
 *  8. A lead-time ("Early Bird") discount comes off the ROOM rate only, never
 *     off a supplement, and only the best qualifying tier is applied.
 * ------------------------------------------------------------------ */
import { ALL_DAYS, dayAllowed, daysBetween, nightsOf, within } from './dates';
import { applyBps } from './money';
import { fits, type RoomCapacity } from './occupancy';
import type { RoomRequest } from '@/lib/db/schema';

export type ContractRow = {
  id: string; status: string; distributionPermitted: boolean;
  validFrom: string; validTo: string; confirmationMode: string; inventoryModel: string;
};
export type RatePeriodRow = {
  roomTypeId: string; mealPlan: string; dateFrom: string; dateTo: string; active: boolean;
  price1Minor: number | null; price2Minor: number | null; price3Minor: number | null;
  /** Four adults. Optional so a caller that predates quad rates still compiles. */
  price4Minor?: number | null;
  childMinor: number | null;
  /** Weekday mask (bit 0 Monday … bit 6 Sunday). Absent means every night. */
  daysOfWeek?: number;
  minStay: number; releaseDays: number;
};
export type RestrictionRow = {
  roomTypeId: string | null; kind: string; dateFrom: string; dateTo: string; amountMinor: number | null; note: string | null;
  /** Supplements: 'per_room' (the default) or 'per_person'. */
  basis?: string;
  /** Per-person supplements: the charge for one child. Null means children are not priced. */
  childAmountMinor?: number | null;
};
/** A lead-time discount tier. Its dates are the STAY nights it covers. */
export type DiscountRow = {
  roomTypeId: string | null; kind: string; dateFrom: string; dateTo: string;
  minLeadDays: number; discountBps: number; active?: boolean;
};
export type AllocationRow = { roomTypeId: string; night: string; total: number; sold: number };
export type RoomTypeRow = RoomCapacity & { id: string; name: string; active: boolean };

export type StayRequest = { checkIn: string; checkOut: string; rooms: RoomRequest[]; today: string };

export type RoomPrice = {
  roomIndex: number;
  /** amountMinor is what the night costs AFTER any discount. */
  nightly: { night: string; amountMinor: number; discountMinor: number }[];
  totalMinor: number;
  /** What the lead-time discount took off this room, for the audit trail. */
  discountMinor: number;
};

export type EngineResult =
  | {
    ok: true; availability: 'instant' | 'on_request'; rooms: RoomPrice[]; contractAmountMinor: number;
    roomNights: number; personNights: number; notes: string[];
    /** Total taken off by lead-time discounts. Already out of contractAmountMinor. */
    discountMinor: number;
  }
  | { ok: false; reason: string };

/** What tonight's supplements add to one room. Null when a per-person
 *  supplement applies to a room with children it has no price for. */
export function supplementFor(tonight: RestrictionRow[], room: RoomRequest): number | null {
  let total = 0;
  for (const r of tonight) {
    // Defensive: a blackout or stop-sell carries no money, and must not add any
    // if it ever reaches here through a caller that forgot to filter.
    if (r.kind !== 'supplement') continue;
    const amount = r.amountMinor ?? 0;
    if ((r.basis ?? 'per_room') !== 'per_person') { total += amount; continue; }
    if (room.childAges.length > 0 && r.childAmountMinor == null) return null;
    total += amount * room.adults + (r.childAmountMinor ?? 0) * room.childAges.length;
  }
  return total;
}

/* The best tier a booking qualifies for on one night. Tiers never stack: a
 * booking 70 days out gets 15%, not 10% + 15%. Rows the booking is too late
 * for, and nights no row covers, simply yield nothing. */
export function bestDiscountBps(rows: DiscountRow[], night: string, leadDays: number): number {
  let best = 0;
  for (const d of rows) {
    if (d.active === false) continue;
    if (leadDays < d.minLeadDays) continue;
    if (!within(night, d.dateFrom, d.dateTo)) continue;
    if (d.discountBps > best) best = d.discountBps;
  }
  return best;
}

export function occupancyPrice(p: RatePeriodRow, room: RoomRequest): number | null {
  const byAdults = [null, p.price1Minor, p.price2Minor, p.price3Minor, p.price4Minor ?? null][room.adults] ?? null;
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
  discounts?: DiscountRow[];
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
  // A night may fall inside two periods that split the week between them, so
  // the weekday mask decides which one prices it.
  const periodFor = (night: string) =>
    periods.find((p) => within(night, p.dateFrom, p.dateTo) && dayAllowed(p.daysOfWeek ?? ALL_DAYS, night));

  const restr = args.restrictions.filter((r) => r.roomTypeId == null || r.roomTypeId === roomType.id);
  const discounts = (args.discounts ?? []).filter((d) => d.roomTypeId == null || d.roomTypeId === roomType.id);
  for (const d of discounts) {
    // A mis-loaded tier would otherwise discount a room past zero and we would
    // owe the hotel more than the agent paid. Refuse the offer instead.
    if (!Number.isInteger(d.discountBps) || d.discountBps < 0 || d.discountBps > 10_000) {
      return { ok: false, reason: `Discount of ${d.discountBps} bps on this contract is not a usable percentage — fix the rate load` };
    }
    if (!Number.isInteger(d.minLeadDays) || d.minLeadDays < 0) {
      return { ok: false, reason: 'A discount tier has no usable lead time — fix the rate load' };
    }
  }
  // Lead time is measured to ARRIVAL, which is what hotels mean by booking
  // ahead, and is the same figure the release period already uses below.
  const leadDays = daysBetween(stay.today, stay.checkIn);
  const notes: string[] = [];
  const roomPrices: RoomPrice[] = stay.rooms.map((_, i) => ({ roomIndex: i, nightly: [], totalMinor: 0, discountMinor: 0 }));
  let bestApplied = 0;

  for (const night of nights) {
    const p = periodFor(night);
    if (!p) return { ok: false, reason: `No rate loaded for ${night}` };
    const closed = restr.find((r) => (r.kind === 'blackout' || r.kind === 'stop_sell') && within(night, r.dateFrom, r.dateTo));
    if (closed) return { ok: false, reason: closed.kind === 'blackout' ? `Blackout date (${night})` : `Stop-sell in place (${night})` };
    const tonight = restr.filter((r) => r.kind === 'supplement' && within(night, r.dateFrom, r.dateTo));
    const discountBps = bestDiscountBps(discounts, night, leadDays);
    if (discountBps > bestApplied) bestApplied = discountBps;
    for (let i = 0; i < stay.rooms.length; i++) {
      const base = occupancyPrice(p, stay.rooms[i]);
      if (base == null) return { ok: false, reason: `No price for this occupancy in ${roomType.name}` };
      const supplement = supplementFor(tonight, stay.rooms[i]);
      // A compulsory per-person charge we cannot work out is never guessed:
      // quoting the room alone would under-charge the stay by the whole gala.
      if (supplement == null) return { ok: false, reason: `A compulsory supplement on ${night} is not priced for children — quote this stay by hand` };
      /* Rounded DOWN, so a half-unit never turns into a discount we did not
       * earn: the hotel is paid at least the exact discounted rate, never less. */
      const off = discountBps > 0 ? applyBps(base, discountBps, 'down') : 0;
      const amount = base - off + supplement;
      roomPrices[i].nightly.push({ night, amountMinor: amount, discountMinor: off });
      roomPrices[i].totalMinor += amount;
      roomPrices[i].discountMinor += off;
    }
  }
  const applied = restr.filter((r) => r.kind === 'supplement' && nights.some((n) => within(n, r.dateFrom, r.dateTo)));
  if (applied.length) {
    // The restriction's own note is staff-written and stays internal; the agent
    // is told that a supplement is in the price and how it is charged.
    notes.push(applied.some((r) => r.basis === 'per_person')
      ? 'Includes a compulsory supplement on some nights, charged per person.'
      : 'Includes a high-demand supplement on some nights.');
  }

  const arrival = periodFor(nights[0])!;
  if (nights.length < arrival.minStay) return { ok: false, reason: `Minimum stay is ${arrival.minStay} nights` };

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

  const discountMinor = roomPrices.reduce((s, r) => s + r.discountMinor, 0);
  if (discountMinor > 0) {
    notes.push(`Early Bird: ${(bestApplied / 100).toFixed(bestApplied % 100 === 0 ? 0 : 1)}% off the room rate for booking ${leadDays} days ahead.`);
  }
  const contractAmountMinor = roomPrices.reduce((s, r) => s + r.totalMinor, 0);
  const personNights = stay.rooms.reduce((s, r) => s + r.adults + r.childAges.length, 0) * nights.length;
  return { ok: true, availability, rooms: roomPrices, contractAmountMinor, roomNights: nights.length * stay.rooms.length, personNights, notes, discountMinor };
}
