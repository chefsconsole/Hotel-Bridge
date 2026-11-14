/* ------------------------------------------------------------------ *
 * The desk "supplier": a rate our own team agreed with a hotel by email,
 * off the back of a best-rate request or a group enquiry.
 *
 * There is no API here and there never will be — a human negotiated it.
 * The adapter exists so a desk-agreed booking is a FIRST-CLASS booking:
 * same reference, same invoice, same wallet, same voucher, same ledger as
 * one made from a live search. Before this, a confirmed best-rate lead was
 * only a status on the lead, so it never produced an invoice at all.
 *
 * It declares honestly what it cannot do: it cannot be searched, it cannot
 * be re-priced, and it cannot be cancelled by machine. Cancelling means a
 * person emails the hotel, so `cancel` reports success without pretending
 * anything was sent — the team records the outcome on the booking.
 * ------------------------------------------------------------------ */
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import {
  SupplierRejectedError, type BookResult, type RetrieveResult, type SupplierAdapter,
} from './types';

export const DESK_SUPPLIER = 'desk';

/** Offer key for a desk rate: which lead it came from. */
export function deskOfferKey(kind: 'rate_request' | 'group', id: string) {
  return `${DESK_SUPPLIER}:${kind}:${id}`;
}

export function parseDeskOfferKey(key: string) {
  const [src, kind, id] = key.split(':');
  if (src !== DESK_SUPPLIER || !kind || !id) throw new SupplierRejectedError('Not a desk offer');
  return { kind: kind as 'rate_request' | 'group', id };
}

export const deskAdapter: SupplierAdapter = {
  id: DESK_SUPPLIER,
  label: 'HotelBridge desk',
  environment: 'production',
  // Search and revalidate are false on purpose: a desk rate is not live
  // inventory and must never appear in, or be re-priced by, a search.
  capabilities: { search: false, revalidate: false, book: false, hold: true, retrieve: true, cancel: true, amend: false, idempotentCreate: true },

  // A desk rate is not live inventory. These exist to satisfy the boundary and
  // to fail loudly if anything ever tries to treat one as searchable.
  async search() { return []; },
  async revalidate() { return { unavailable: 'A desk-agreed rate cannot be re-priced automatically' }; },
  async book(_ctx, req): Promise<BookResult> {
    // The hotel already agreed this rate by email before the booking was made.
    return { state: 'pending', supplierRef: `HBD-${req.clientReference}` };
  },

  async retrieve({ db }, ref): Promise<RetrieveResult> {
    const [b] = await db.select({ status: schema.bookings.status, supplierRef: schema.bookings.supplierRef })
      .from(schema.bookings).where(eq(schema.bookings.reference, ref.clientReference));
    if (!b || !b.supplierRef) return { state: 'not_found' };
    if (b.status === 'cancelled' || b.status === 'declined') return { state: 'cancelled', supplierRef: b.supplierRef };
    if (b.status === 'pending_confirmation' || b.status === 'awaiting_payment') return { state: 'pending', supplierRef: b.supplierRef };
    return { state: 'confirmed', supplierRef: b.supplierRef };
  },

  async cancel() {
    // Nothing is sent anywhere. The team cancels with the hotel by email and
    // the booking's own history records who did it and when.
    return { cancelled: true };
  },
};
