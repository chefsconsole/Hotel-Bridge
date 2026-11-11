/* ------------------------------------------------------------------ *
 * Group offer comparison. Lines up the hotel offers recorded for one
 * enquiry, city by city, on the same basis: cost per room-night, rooms
 * covered against what the group asked for, budget fit, city tax,
 * terms and validity. Only the offers' own numbers — nothing estimated
 * except city tax, which is labelled as an estimate.
 * ------------------------------------------------------------------ */
import { daysBetween } from './dates';

export type OfferIn = {
  id: string; hotelName: string; city: string; currency: string;
  lines: { roomType: string; rooms: number; nights: number; rateMinor: number }[];
  mealPlan: string | null; taxesNote: string | null; cityTaxMinor: number | null;
  cancellationTerms: string | null; paymentTerms: string | null; validUntil: string | null; costTotalMinor: number;
};
export type EnquiryIn = {
  legs: { city: string; checkIn: string; checkOut: string }[];
  rooms: { single: number; double: number; twin: number; triple: number };
  totalPax: number; currency: string; mealPlan: string | null;
  budgetMinor: number | null; budgetBasis: string | null;
};

export type OfferColumn = {
  offer: OfferIn;
  roomNights: number;
  perRoomNightMinor: number;
  /** Room-nights offered against room-nights the group needs in this city; null when the city isn't on the itinerary. */
  coverage: { offered: number; needed: number } | null;
  /** Estimate: city tax per person per night × travellers × nights. Paid at the hotel. */
  cityTaxEstimateMinor: number | null;
  /** Within budget, over budget, or not comparable (no budget, other currency, or other basis). */
  budget: 'within' | 'over' | null;
  boardMatches: boolean | null;
  expired: boolean;
  lowest: boolean;
};
export type CityComparison = { city: string; nights: number | null; columns: OfferColumn[]; mixedCurrency: boolean };

const norm = (s: string) => s.trim().toLowerCase();

export function compareOffers(offers: OfferIn[], e: EnquiryIn, today: string): CityComparison[] {
  const neededRooms = e.rooms.single + e.rooms.double + e.rooms.twin + e.rooms.triple;
  const byCity = new Map<string, OfferIn[]>();
  for (const o of offers) {
    const k = norm(o.city);
    byCity.set(k, [...(byCity.get(k) ?? []), o]);
  }
  return [...byCity.values()].map((group) => {
    const leg = e.legs.find((l) => norm(l.city) === norm(group[0].city));
    const nights = leg ? daysBetween(leg.checkIn, leg.checkOut) : null;
    const columns: OfferColumn[] = group.map((o) => {
      const roomNights = o.lines.reduce((s, l) => s + l.rooms * l.nights, 0);
      const perRoomNightMinor = roomNights ? Math.round(o.costTotalMinor / roomNights) : 0;
      const sameCurrency = o.currency === e.currency;
      let budget: OfferColumn['budget'] = null;
      if (e.budgetMinor && sameCurrency) {
        const measure = e.budgetBasis === 'per_room_night' ? perRoomNightMinor
          : e.budgetBasis === 'per_person_total' ? Math.round(o.costTotalMinor / e.totalPax)
          : e.budgetBasis === 'total' ? o.costTotalMinor : null;
        if (measure != null) budget = measure <= e.budgetMinor ? 'within' : 'over';
      }
      return {
        offer: o, roomNights, perRoomNightMinor,
        coverage: nights != null ? { offered: roomNights, needed: neededRooms * nights } : null,
        cityTaxEstimateMinor: o.cityTaxMinor && nights != null ? o.cityTaxMinor * e.totalPax * nights : null,
        budget,
        boardMatches: e.mealPlan && o.mealPlan ? norm(o.mealPlan) === norm(e.mealPlan) : null,
        expired: !!o.validUntil && o.validUntil < today,
        lowest: false,
      };
    });
    // "Lowest" only means something between live offers in the same currency.
    const currencies = new Set(columns.map((c) => c.offer.currency));
    const live = columns.filter((c) => !c.expired && c.roomNights > 0);
    if (currencies.size === 1 && live.length > 1) {
      const min = Math.min(...live.map((c) => c.perRoomNightMinor));
      for (const c of live) if (c.perRoomNightMinor === min) c.lowest = true;
    }
    columns.sort((a, b) => Number(a.expired) - Number(b.expired) || a.perRoomNightMinor - b.perRoomNightMinor);
    return { city: leg?.city ?? group[0].city, nights, columns, mixedCurrency: currencies.size > 1 };
  });
}
