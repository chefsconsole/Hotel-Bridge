/* ------------------------------------------------------------------ *
 * Commercial scenario model. These are SCENARIOS, not forecasts: the
 * founder types assumptions, the model shows what they imply.
 *
 * Deliberately non-linear where reality is: support cost steps up in whole
 * people, and every booking does not carry the same margin (take rate is a
 * blended input the user must justify).
 * ------------------------------------------------------------------ */
import { applyBps } from './money';

export type ScenarioInput = {
  activeAgencies: number;
  bookingsPerAgencyPerMonth: number; // e.g. 1.5
  avgBookingValueMinor: number; // gross booking value per booking
  takeRateBps: number; // blended net revenue / GBV
  cancellationRateBps: number; // share of created bookings that cancel
  prepaidShareBps: number; // share of GBV collected by HotelBridge
  paymentCostBps: number; // processing + FX cost on collected GBV
  bookingsPerSupportPerson: number; // monthly bookings one ops person can handle
  supportPersonMonthlyMinor: number;
  accountCostPerAgencyMonthlyMinor: number; // account management, onboarding amortised
};

export type ScenarioResult = {
  bookingsCreated: number;
  bookingsRealised: number;
  gbvMinor: number;
  netRevenueMinor: number;
  paymentCostMinor: number;
  grossProfitMinor: number;
  supportPeople: number;
  supportCostMinor: number;
  accountCostMinor: number;
  contributionMinor: number;
  contributionMarginBps: number; // contribution / net revenue
};

/** Monthly figures. Multiply by 12 for a run-rate — the UI says so explicitly. */
export function runScenario(i: ScenarioInput): ScenarioResult {
  const bookingsCreated = Math.round(i.activeAgencies * i.bookingsPerAgencyPerMonth);
  const bookingsRealised = bookingsCreated - Math.round(bookingsCreated * i.cancellationRateBps / 10_000);
  const gbvMinor = bookingsRealised * i.avgBookingValueMinor;
  const netRevenueMinor = applyBps(gbvMinor, i.takeRateBps);
  const paymentCostMinor = applyBps(applyBps(gbvMinor, i.prepaidShareBps), i.paymentCostBps);
  const grossProfitMinor = netRevenueMinor - paymentCostMinor;
  // Cancelled bookings still cost support time.
  const supportPeople = bookingsCreated === 0 ? 0 : Math.ceil(bookingsCreated / Math.max(1, i.bookingsPerSupportPerson));
  const supportCostMinor = supportPeople * i.supportPersonMonthlyMinor;
  const accountCostMinor = i.activeAgencies * i.accountCostPerAgencyMonthlyMinor;
  const contributionMinor = grossProfitMinor - supportCostMinor - accountCostMinor;
  return {
    bookingsCreated, bookingsRealised, gbvMinor, netRevenueMinor, paymentCostMinor, grossProfitMinor,
    supportPeople, supportCostMinor, accountCostMinor, contributionMinor,
    contributionMarginBps: netRevenueMinor > 0 ? Math.round((contributionMinor / netRevenueMinor) * 10_000) : 0,
  };
}
