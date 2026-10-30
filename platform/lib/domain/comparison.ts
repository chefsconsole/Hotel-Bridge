/* Two prices are only "the same product" when every condition that changes
 * what the client actually gets is the same. Otherwise we say what differs
 * and decline to call one cheaper. */

export type ComparableOffer = {
  supplier: string;
  hotelId: string;
  roomTypeId: string | null; // null when the supplier's room is not mapped to ours
  roomName: string;
  mealPlan: string;
  currency: string;
  sellMinor: number;
  freeCancelUntil: string | null;
  nonRefundable: boolean;
  taxesIncluded: boolean;
  localTaxMinor: number;
  collectionModel: string;
  availability: string;
};

export type Comparison = { comparable: boolean; differences: string[]; deltaMinor: number | null };

export function compareOffers(a: ComparableOffer, b: ComparableOffer): Comparison {
  const d: string[] = [];
  if (a.hotelId !== b.hotelId) d.push('Different hotels');
  if (!a.roomTypeId || !b.roomTypeId) d.push(`Room "${!a.roomTypeId ? a.roomName : b.roomName}" is not mapped to our room catalogue`);
  else if (a.roomTypeId !== b.roomTypeId) d.push('Different room types');
  if (a.mealPlan !== b.mealPlan) d.push(`Meal plan ${a.mealPlan} vs ${b.mealPlan}`);
  if (a.nonRefundable !== b.nonRefundable) d.push('One rate is non-refundable');
  else if (a.freeCancelUntil !== b.freeCancelUntil) d.push(`Free cancellation until ${a.freeCancelUntil ?? '—'} vs ${b.freeCancelUntil ?? '—'}`);
  if (a.taxesIncluded !== b.taxesIncluded) d.push('Taxes treated differently');
  if (a.localTaxMinor !== b.localTaxMinor) d.push('Different local taxes payable at the hotel');
  if (a.collectionModel !== b.collectionModel) d.push('Different payment arrangement (prepaid vs pay at hotel)');
  if (a.currency !== b.currency) d.push(`Different currencies (${a.currency} / ${b.currency}) — no FX comparison made`);
  if (a.availability !== b.availability) d.push('One is instant, the other on request');
  const comparable = d.length === 0;
  return { comparable, differences: d, deltaMinor: comparable ? a.sellMinor - b.sellMinor : null };
}
