/* ------------------------------------------------------------------ *
 * The supplier boundary. Every inventory source — our own contracts, a
 * channel manager, a B2B wholesaler — is an adapter that declares what it
 * can actually do. Nothing above this layer knows a supplier's wire format.
 * ------------------------------------------------------------------ */
import type { DB } from '@/lib/db';
import type { RoomRequest } from '@/lib/db/schema';
import type { CancelPolicy } from '@/lib/domain/cancellation';
import type { PricingTerms } from '@/lib/domain/pricing';
import type { RoomPrice } from '@/lib/domain/contract-engine';

export type Capabilities = {
  search: boolean;
  revalidate: boolean;
  book: boolean;
  /** Can place a reservation that is held pending payment. */
  hold: boolean;
  /** Can look a booking up by OUR reference — required to recover from timeouts. */
  retrieve: boolean;
  cancel: boolean;
  amend: boolean;
  /** Supports an idempotency key / client reference on create. */
  idempotentCreate: boolean;
};

export type SearchRequest = { city: string; checkIn: string; checkOut: string; rooms: RoomRequest[]; today: string; hotelId?: string };

/** A supplier's offer BEFORE our pricing is applied. */
export type SupplierOffer = {
  supplier: string;
  offerKey: string;
  hotelId: string;
  contractId: string | null;
  roomTypeId: string | null;
  roomName: string;
  mealPlan: string;
  availability: 'instant' | 'on_request';
  terms: PricingTerms;
  rooms: RoomPrice[];
  contractAmountMinor: number;
  firstNightContractMinor: number;
  roomNights: number;
  personNights: number;
  cancelPolicy: CancelPolicy;
  notes: string[];
};

export type BookRequest = {
  clientReference: string; // our booking reference — doubles as idempotency key
  offer: SupplierOffer;
  checkIn: string;
  checkOut: string;
  leadGuest: string;
  guestNames: string[][];
  specialRequests?: string | null;
  hold: boolean;
};

/** confirmed: the room is ours. held: ours until payment deadline. pending: hotel must confirm. */
export type BookResult = { state: 'confirmed' | 'held' | 'pending'; supplierRef: string; hotelConfirmation?: string | null };

export type RetrieveResult = { state: 'confirmed' | 'held' | 'pending' | 'cancelled' | 'not_found'; supplierRef?: string };

export type SupplierContext = { db: DB };

export interface SupplierAdapter {
  id: string;
  label: string;
  /** production: real inventory. sandbox: the supplier's test system. development: simulated. */
  environment: 'production' | 'sandbox' | 'development';
  capabilities: Capabilities;
  search(ctx: SupplierContext, req: SearchRequest): Promise<SupplierOffer[]>;
  revalidate(ctx: SupplierContext, offerKey: string, req: SearchRequest): Promise<SupplierOffer | { unavailable: string }>;
  book(ctx: SupplierContext, req: BookRequest): Promise<BookResult>;
  retrieve(ctx: SupplierContext, ref: { clientReference: string; supplierRef?: string | null }): Promise<RetrieveResult>;
  cancel(ctx: SupplierContext, ref: { clientReference: string; supplierRef: string }): Promise<{ cancelled: boolean }>;
}

/* ------------------------------ Errors ------------------------------ */

/** The request may have reached the supplier. Outcome unknown — never retry a create. */
export class SupplierTimeoutError extends Error { readonly kind = 'timeout'; }
/** The supplier answered no (sold out, price gone, invalid). Safe to report. */
export class SupplierRejectedError extends Error { readonly kind = 'rejected'; }
/** We could not reach the supplier at all (not configured, circuit open, DNS). Nothing was sent. */
export class SupplierUnavailableError extends Error { readonly kind = 'unavailable'; }

export function classify(e: unknown): 'timeout' | 'rejected' | 'unavailable' | 'error' {
  if (e instanceof SupplierTimeoutError) return 'timeout';
  if (e instanceof SupplierRejectedError) return 'rejected';
  if (e instanceof SupplierUnavailableError) return 'unavailable';
  return 'error';
}
