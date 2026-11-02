'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { attempt, int, optStr, str, type ActionResult } from '@/lib/action';
import { decodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { acceptRateQuote, askAlternative, cancelRateRequest, createRateRequest, hotelQuote } from '@/lib/services/rate-requests';

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
  let dest = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const db = await getDb();
    const id = str(fd, 'id');
    const intent = str(fd, 'intent');
    if (intent === 'accept') { await acceptRateQuote(db, actor, id); revalidatePath(`/agent/rate-requests/${id}`); return 'Accepted — the hotel is asked to hold the rooms, and our team confirms the booking with you.'; }
    if (intent === 'cancel') { await cancelRateRequest(db, actor, id); revalidatePath(`/agent/rate-requests/${id}`); return 'Request cancelled.'; }
    if (intent === 'alternative') { const next = await askAlternative(db, actor, id, str(fd, 'hotelId')); dest = `/agent/rate-requests/${next.id}`; return { ok: true }; }
    return 'Nothing to do';
  });
  if (r.ok && dest) redirect(dest);
  return r;
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
