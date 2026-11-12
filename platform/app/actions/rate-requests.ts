'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { attempt, bps, int, optStr, str, type ActionResult } from '@/lib/action';
import { decodeRooms } from '@/lib/domain/occupancy';
import { requireAgent, requireStaff } from '@/lib/session';
import { acceptRateQuote, askAlternative, askHotels, assignRateRequest, cancelRateRequest, closeWithoutOffer, createRateRequest, holdBackOffer, hotelQuote, markBooked, releaseOffer } from '@/lib/services/rate-requests';

/** Rooms come either from the search (encoded) or from the simple room picker. */
function roomsFrom(fd: FormData) {
  const encoded = str(fd, 'roomsEncoded');
  if (encoded) return decodeRooms(encoded);
  const count = Math.min(Math.max(int(fd, 'roomCount') ?? 1, 1), 9);
  const adults = Math.min(Math.max(int(fd, 'adults') ?? 2, 1), 4);
  return Array.from({ length: count }, () => ({ adults, childAges: [] as number[] }));
}

export async function createRateRequestAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const req = await createRateRequest(await getDb(), actor, {
      hotelId: str(fd, 'hotelId'), checkIn: str(fd, 'checkIn'), checkOut: str(fd, 'checkOut'), rooms: roomsFrom(fd),
      mealPlan: (optStr(fd, 'mealPlan') as 'BB') ?? null, notes: optStr(fd, 'notes'),
      budget: optStr(fd, 'budget'), budgetCurrency: (optStr(fd, 'budgetCurrency') as 'EUR') ?? null,
    });
    id = req.id;
    return { ok: true };
  });
  if (r.ok) redirect(`/agent/rate-requests/${id}`);
  return r;
}

export async function rateRequestDecisionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const db = await getDb();
    const id = str(fd, 'id');
    const intent = str(fd, 'intent');
    if (intent === 'accept') { await acceptRateQuote(db, actor, id); revalidatePath(`/agent/rate-requests/${id}`); return 'Accepted — our reservations team will contact you to confirm the booking.'; }
    if (intent === 'cancel') { await cancelRateRequest(db, actor, id); revalidatePath(`/agent/rate-requests/${id}`); return 'Request cancelled.'; }
    if (intent === 'alternative') { const next = await askAlternative(db, actor, id, str(fd, 'hotelId')); revalidatePath(`/agent/rate-requests/${next.parentId ?? next.id}`); return 'Added — we’ll include it in your offers.'; }
    return 'Nothing to do';
  });
}

/** Public: a hotel answers from its private link. */
export async function hotelQuoteAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const token = str(fd, 'token');
    const db = await getDb();
    if (str(fd, 'intent') === 'decline') {
      await hotelQuote(db, token, { decline: true, reason: optStr(fd, 'reason') });
      revalidatePath(`/r/${token}`);
      return 'Thank you — we have recorded that you are not available.';
    }
    await hotelQuote(db, token, {
      decline: false, currency: str(fd, 'currency') as 'THB', roomType: str(fd, 'roomType'), rate: str(fd, 'rate'),
      mealPlan: optStr(fd, 'mealPlan'), cancellation: str(fd, 'cancellation'), notes: optStr(fd, 'notes'), validUntil: str(fd, 'validUntil'),
    });
    revalidatePath(`/r/${token}`);
    return 'Thank you — your rate has reached HotelBridge.';
  });
}

/** The HotelBridge desk: ask hotels, send offers, assign, close. */
export async function deskAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireStaff();
    const db = await getDb();
    const id = str(fd, 'id');
    const intent = str(fd, 'intent');
    const done = (msg: string) => { revalidatePath(`/admin/rate-requests/${str(fd, 'rootId') || id}`); revalidatePath('/admin/rate-requests'); return msg; };
    if (intent === 'ask') {
      const r = await askHotels(db, actor, id, fd.getAll('hotelIds').map(String));
      const parts = [
        r.emailed.length ? `Emailed ${r.emailed.length} hotel${r.emailed.length === 1 ? '' : 's'}: ${r.emailed.join(', ')}.` : '',
        r.failed.length ? (r.demo ? `Demo: recorded for ${r.failed.join(', ')} — not sent. Use each hotel reply link to play the hotel.` : `Could not email ${r.failed.join(', ')} — call them, or enter their reply from the hotel link.`) : '',
        r.inHouse.length ? `${r.inHouse.join(', ')}: we hold the contract — enter the rate from it with the “Enter our rate” link below.` : '',
        r.skipped.length ? `Skipped ${r.skipped.join(', ')}.` : '',
      ].filter(Boolean);
      return { ok: r.emailed.length + r.failed.length + r.inHouse.length > 0, message: done(parts.join(' ') || 'Nothing to send.') };
    }
    if (intent === 'release') {
      const r = await releaseOffer(db, actor, id, bps(fd, 'markupPct'));
      void r; return done('Sent to the agent — they have an email now and can accept it on the portal.');
    }
    if (intent === 'booked') { await markBooked(db, actor, id, optStr(fd, 'confirmation') ?? null); return done('Marked as booked — the agent has the confirmation by email.'); }
    if (intent === 'holdback') { await holdBackOffer(db, actor, id); return done('Set aside — the agent won’t see this reply.'); }
    if (intent === 'close') { await closeWithoutOffer(db, actor, id, str(fd, 'message')); return done('Closed — the agent has your note.'); }
    if (intent === 'assign') { await assignRateRequest(db, actor, id, optStr(fd, 'userId') ?? null); return done('Assigned — they have the details by email.'); }
    return 'Nothing to do';
  });
}
