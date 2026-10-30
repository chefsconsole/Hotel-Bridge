/* ------------------------------------------------------------------ *
 * Booking lifecycle. Reservation state and payment state are separate:
 * "is the room ours?" and "has the money moved?" are different questions.
 *
 * No "draft" row exists: an un-submitted booking is a quote. Price changes
 * are handled at checkout (the agent re-confirms against a new quote)
 * before any booking row is written.
 * ------------------------------------------------------------------ */

export const BOOKING_STATUSES = [
  'awaiting_payment', 'submitting', 'outcome_unknown', 'pending_confirmation', 'confirmed',
  'amendment_requested', 'cancellation_requested', 'cancelled', 'declined', 'failed',
] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  // Prepay: rooms held (or not yet submitted) until the agent pays.
  awaiting_payment: ['confirmed', 'submitting', 'cancelled', 'failed'],
  // The supplier call is in flight.
  submitting: ['confirmed', 'awaiting_payment', 'pending_confirmation', 'failed', 'outcome_unknown'],
  // A timeout: the reservation may exist. Only reconciliation may move it.
  outcome_unknown: ['confirmed', 'awaiting_payment', 'pending_confirmation', 'failed'],
  // On-request: the hotel must answer.
  pending_confirmation: ['confirmed', 'awaiting_payment', 'declined', 'cancelled'],
  confirmed: ['amendment_requested', 'cancellation_requested', 'cancelled'],
  amendment_requested: ['confirmed', 'cancellation_requested', 'cancelled'],
  cancellation_requested: ['cancelled', 'confirmed'],
  cancelled: [],
  declined: [],
  failed: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class TransitionError extends Error {}

export function assertTransition(from: string, to: string) {
  if (!canTransition(from as BookingStatus, to as BookingStatus)) {
    throw new TransitionError(`A booking cannot move from "${from}" to "${to}"`);
  }
}

export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  submitting: 'Submitting',
  outcome_unknown: 'Being verified',
  pending_confirmation: 'Pending hotel confirmation',
  confirmed: 'Confirmed',
  amendment_requested: 'Amendment requested',
  cancellation_requested: 'Cancellation requested',
  cancelled: 'Cancelled',
  declined: 'Declined by hotel',
  failed: 'Not booked',
};

export const STATUS_EXPLAINER: Record<string, string> = {
  awaiting_payment: 'Rooms are held until the payment deadline. The booking is not confirmed until payment is received.',
  submitting: 'We are placing the reservation with the hotel or supplier.',
  outcome_unknown: 'The supplier did not answer in time. The reservation may or may not exist — we are checking with the supplier and will not book twice.',
  pending_confirmation: 'This is a request. The hotel has not confirmed it yet. Do not issue documents to your client.',
  confirmed: 'The hotel has confirmed this reservation.',
  amendment_requested: 'Your amendment is with our operations team. The original reservation stands until we confirm the change.',
  cancellation_requested: 'Your cancellation request is with our operations team. Penalties are calculated from the time of the request.',
  cancelled: 'This reservation has been cancelled.',
  declined: 'The hotel could not accommodate this request. No charge applies.',
  failed: 'The reservation was not made. No charge applies.',
};

export type Tone = 'positive' | 'pending' | 'attention' | 'neutral' | 'negative';

export const STATUS_TONE: Record<string, Tone> = {
  confirmed: 'positive',
  awaiting_payment: 'attention',
  submitting: 'pending',
  outcome_unknown: 'attention',
  pending_confirmation: 'pending',
  amendment_requested: 'pending',
  cancellation_requested: 'pending',
  cancelled: 'neutral',
  declined: 'negative',
  failed: 'negative',
};

export const PAYMENT_LABEL: Record<string, string> = {
  not_due: 'Nothing due',
  due: 'Payment due',
  paid: 'Paid',
  refund_due: 'Refund due',
  refunded: 'Refunded',
  direct: 'Pay at hotel',
};

/** States where the room is (or may be) ours and still live. */
export const LIVE_STATUSES: BookingStatus[] = ['awaiting_payment', 'confirmed', 'amendment_requested', 'cancellation_requested', 'pending_confirmation', 'outcome_unknown', 'submitting'];
