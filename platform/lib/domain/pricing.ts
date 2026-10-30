/* ------------------------------------------------------------------ *
 * The pricing engine. The ONLY place a selling price is calculated.
 *
 * Vocabulary (kept deliberately distinct):
 *  - contract amount   what the rate sheet says for these rooms and nights
 *  - supplier cost     what HotelBridge owes the hotel / supplier
 *  - selling price     what the agent pays (for pay-direct: what the hotel
 *                      charges at the desk — gross booking value, not ours)
 *  - markup            sell - cost, as a % of COST
 *  - margin            net revenue as a % of SELL. Never confuse the two.
 *  - net revenue       what HotelBridge keeps: sell - cost (merchant), or
 *                      commission minus any share passed to the agent
 *  - local tax         city/tourist tax payable at the hotel; never in sell
 * ------------------------------------------------------------------ */
import { applyBps, assertMinor, mulDiv, roundUpToWholeUnit } from './money';

export type RateBasis = 'net' | 'commissionable';
export type CollectionModel = 'prepaid_to_hb' | 'pay_direct_to_hotel';
export type TaxMode = 'included' | 'excluded';

export type PricingTerms = {
  currency: string;
  rateBasis: RateBasis;
  collectionModel: CollectionModel;
  taxMode: TaxMode;
  taxBps: number;
  commissionBps: number;
  localTaxMinor: number; // per person per night
};

export type PricingRule = {
  kind: 'percent' | 'fixed';
  valueBps?: number | null; // percent markup on cost
  fixedMinor?: number | null; // per room per night
  agentCommissionShareBps?: number | null; // commissionable: share of commission given to the agent
  rounding: 'none' | 'whole_unit';
  source: string; // e.g. "Default rule" / "Agency rule" — shown in the audit breakdown
};

export const DEFAULT_RULE: PricingRule = {
  kind: 'percent', valueBps: 1000, agentCommissionShareBps: 0, rounding: 'whole_unit', source: 'Platform default (10% markup)',
};

export type PricingInput = {
  terms: PricingTerms;
  contractAmountMinor: number; // all rooms, all nights, incl. supplements
  roomNights: number;
  personNights: number;
  rule: PricingRule;
};

export type PriceBreakdown = {
  currency: string;
  rateBasis: RateBasis;
  collectionModel: CollectionModel;
  contractAmountMinor: number;
  taxMinor: number; // VAT contained in the selling price
  supplierCostMinor: number;
  markupMinor: number;
  hotelCommissionMinor: number;
  agentCommissionMinor: number;
  commissionReceivableMinor: number; // pay-direct: hotel owes us this
  sellMinor: number;
  netRevenueMinor: number;
  marginBps: number; // netRevenue / sell
  markupBps: number; // markup / cost (net basis only)
  localTaxMinor: number; // payable at the hotel, NOT in sellMinor
  rule: string;
  notes: string[];
};

export class PricingError extends Error {}

export function validateTerms(t: PricingTerms) {
  if (t.rateBasis === 'net' && t.collectionModel === 'pay_direct_to_hotel') {
    // The guest would pay the hotel our confidential net rate at the desk.
    throw new PricingError('Net-rate contracts must be prepaid to HotelBridge; pay-direct needs a commissionable rate.');
  }
  if (t.rateBasis === 'commissionable' && t.commissionBps <= 0) {
    throw new PricingError('A commissionable contract needs a commission percentage.');
  }
  for (const [k, v] of Object.entries({ taxBps: t.taxBps, commissionBps: t.commissionBps })) {
    if (!Number.isInteger(v) || v < 0 || v > 10_000) throw new PricingError(`${k} must be between 0 and 10000 bps`);
  }
}

/** VAT portion of an amount. included: carve it out; excluded: add on top. */
export function taxPortion(amountMinor: number, taxMode: TaxMode, taxBps: number): number {
  if (taxBps === 0) return 0;
  return taxMode === 'included'
    ? mulDiv(amountMinor, taxBps, 10_000 + taxBps)
    : applyBps(amountMinor, taxBps);
}

export function priceOffer(input: PricingInput): PriceBreakdown {
  const { terms, rule } = input;
  validateTerms(terms);
  assertMinor(input.contractAmountMinor, 'contract amount');
  const notes: string[] = [];

  const vat = taxPortion(input.contractAmountMinor, terms.taxMode, terms.taxBps);
  // Gross = what the hotel charges for the rooms, VAT included.
  const gross = terms.taxMode === 'excluded' ? input.contractAmountMinor + vat : input.contractAmountMinor;
  const preTax = gross - vat;
  const localTaxMinor = terms.localTaxMinor * input.personNights;
  if (localTaxMinor > 0) notes.push('City / tourist tax is payable directly at the hotel.');

  let supplierCost = 0;
  let sell = 0;
  let markup = 0;
  let hotelCommission = 0;
  let agentCommission = 0;
  let commissionReceivable = 0;

  if (terms.rateBasis === 'net') {
    supplierCost = gross;
    if (rule.kind === 'percent') markup = applyBps(supplierCost, rule.valueBps ?? 0, 'up');
    else markup = (rule.fixedMinor ?? 0) * input.roomNights;
    sell = supplierCost + markup;
    if (rule.rounding === 'whole_unit') sell = roundUpToWholeUnit(sell, terms.currency);
    markup = sell - supplierCost;
  } else {
    // Commission is earned on the room revenue excluding VAT.
    hotelCommission = applyBps(preTax, terms.commissionBps, 'down');
    agentCommission = applyBps(hotelCommission, rule.agentCommissionShareBps ?? 0, 'down');
    if (terms.collectionModel === 'prepaid_to_hb') {
      supplierCost = gross - hotelCommission;
      sell = gross - agentCommission;
    } else {
      // Guest pays the hotel the gross; the hotel pays us commission later.
      supplierCost = 0;
      sell = gross;
      commissionReceivable = hotelCommission;
      notes.push('Payable at the hotel. HotelBridge earns commission from the hotel after the stay.');
    }
  }

  const netRevenue = terms.rateBasis === 'net'
    ? sell - supplierCost
    : hotelCommission - agentCommission;

  return {
    currency: terms.currency,
    rateBasis: terms.rateBasis,
    collectionModel: terms.collectionModel,
    contractAmountMinor: input.contractAmountMinor,
    taxMinor: vat,
    supplierCostMinor: supplierCost,
    markupMinor: markup,
    hotelCommissionMinor: hotelCommission,
    agentCommissionMinor: agentCommission,
    commissionReceivableMinor: commissionReceivable,
    sellMinor: sell,
    netRevenueMinor: netRevenue,
    marginBps: sell > 0 ? mulDiv(netRevenue, 10_000, sell) : 0,
    markupBps: supplierCost > 0 && terms.rateBasis === 'net' ? mulDiv(markup, 10_000, supplierCost) : 0,
    localTaxMinor,
    rule: rule.source,
    notes,
  };
}

/** Group Desk: a cost total plus a percentage markup, rounded up. */
export function priceGroupProposal(costTotalMinor: number, markupBps: number, currency: string) {
  const sell = roundUpToWholeUnit(costTotalMinor + applyBps(costTotalMinor, markupBps, 'up'), currency);
  const net = sell - costTotalMinor;
  return { sellMinor: sell, netRevenueMinor: net, marginBps: sell > 0 ? mulDiv(net, 10_000, sell) : 0 };
}
