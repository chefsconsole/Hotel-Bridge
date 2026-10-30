import { addDays } from './dates';
import { applyBps, mulDiv } from './money';

export type CancelPolicy = {
  nonRefundable: boolean;
  freeCancelDays: number | null; // null = no free cancellation
  latePenaltyType: 'first_night' | 'percent' | 'full';
  latePenaltyBps: number;
};

export function freeCancelUntil(policy: CancelPolicy, checkIn: string): string | null {
  if (policy.nonRefundable || policy.freeCancelDays == null) return null;
  return addDays(checkIn, -policy.freeCancelDays);
}

export function describePolicy(policy: CancelPolicy, checkIn: string): string {
  if (policy.nonRefundable) return 'Non-refundable. The full amount is charged on cancellation.';
  const until = freeCancelUntil(policy, checkIn);
  const late = policy.latePenaltyType === 'first_night'
    ? 'the first night'
    : policy.latePenaltyType === 'full' ? 'the full stay' : `${policy.latePenaltyBps / 100}% of the stay`;
  if (!until) return `Cancellation charge: ${late}.`;
  return `Free cancellation until ${until} (23:59 hotel time). After that, ${late} is charged. No-shows are charged in full.`;
}

/**
 * Penalty if cancelled on `today`. The same fraction applies to what the
 * agent paid (sell) and what we owe the hotel (cost), so the two sides of
 * the ledger stay proportional.
 */
export function cancellationPenalty(args: {
  policy: CancelPolicy; checkIn: string; today: string;
  sellMinor: number; costMinor: number; firstNightContractMinor: number; contractAmountMinor: number;
}): { sellPenaltyMinor: number; costPenaltyMinor: number; free: boolean; reason: string } {
  const { policy, checkIn, today, sellMinor, costMinor } = args;
  const full = { sellPenaltyMinor: sellMinor, costPenaltyMinor: costMinor, free: false };
  if (policy.nonRefundable) return { ...full, reason: 'Non-refundable rate' };
  if (today >= checkIn) return { ...full, reason: 'On or after arrival — charged as no-show' };
  const until = freeCancelUntil(policy, checkIn);
  if (until && today <= until) return { sellPenaltyMinor: 0, costPenaltyMinor: 0, free: true, reason: `Inside free cancellation (until ${until})` };
  if (policy.latePenaltyType === 'full') return { ...full, reason: 'Late cancellation — full stay' };
  if (policy.latePenaltyType === 'percent') {
    return {
      sellPenaltyMinor: applyBps(sellMinor, policy.latePenaltyBps),
      costPenaltyMinor: applyBps(costMinor, policy.latePenaltyBps),
      free: false,
      reason: `Late cancellation — ${policy.latePenaltyBps / 100}%`,
    };
  }
  const share = args.contractAmountMinor > 0 ? args.firstNightContractMinor : 0;
  return {
    sellPenaltyMinor: share ? mulDiv(sellMinor, share, args.contractAmountMinor) : 0,
    costPenaltyMinor: share ? mulDiv(costMinor, share, args.contractAmountMinor) : 0,
    free: false,
    reason: 'Late cancellation — first night',
  };
}
