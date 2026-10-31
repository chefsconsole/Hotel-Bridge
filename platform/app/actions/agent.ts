'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { attempt, bool, file, int, optStr, str, type ActionResult } from '@/lib/action';
import { updateTaxIds, uploadAgencyDocument, type DocumentKind } from '@/lib/services/kyc';
import { decodeRooms } from '@/lib/domain/occupancy';
import { formatMoney, parseMoney } from '@/lib/domain/money';
import { requireAgent } from '@/lib/session';
import { createQuote } from '@/lib/services/search';
import { createBooking, payFromWallet, requestAmendment, requestCancellation } from '@/lib/services/bookings';
import { walletBalance } from '@/lib/services/ledger';
import { addMessage, createEnquiry, decideProposal } from '@/lib/services/groups';
import { addAgencyUser, changePassword } from '@/lib/services/auth';
import { AppError } from '@/lib/services/errors';

export async function quoteAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const q = await createQuote(await getDb(), actor, {
      offerKey: str(fd, 'offerKey'), hotelId: str(fd, 'hotelId'), checkIn: str(fd, 'checkIn'), checkOut: str(fd, 'checkOut'), rooms: decodeRooms(str(fd, 'rooms')),
    });
    id = q.id;
    return { ok: true };
  });
  if (r.ok) redirect(`/agent/checkout/${id}`);
  return r;
}

export async function bookAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let dest = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const rooms = Number(str(fd, 'roomCount'));
    const guestNames = Array.from({ length: rooms }, (_, i) => [str(fd, `guest_${i}_1`), str(fd, `guest_${i}_2`), str(fd, `guest_${i}_3`)].filter(Boolean));
    const res = await createBooking(await getDb(), actor, {
      quoteId: str(fd, 'quoteId'), idempotencyKey: str(fd, 'idempotencyKey'), acceptedSellMinor: Number(str(fd, 'acceptedSellMinor')),
      leadGuest: str(fd, 'leadGuest'), guestNames, agentReference: optStr(fd, 'agentReference'), specialRequests: optStr(fd, 'specialRequests'),
    });
    if (res.kind === 'created' || res.kind === 'existing') {
      dest = `/agent/bookings/${res.booking.id}?new=1`;
      return { ok: true };
    }
    if (res.kind === 'price_changed') {
      return {
        ok: false,
        message: `The hotel's price has changed from ${formatMoney(res.oldSellMinor, res.currency)} to ${formatMoney(res.newSellMinor, res.currency)}. Nothing has been booked. Review the new price to continue.`,
        data: { newQuoteId: res.quoteId },
      };
    }
    const reason = res.kind === 'unavailable' ? res.reason : 'unknown';
    return { ok: false, message: `This room is no longer available: ${reason}. Nothing has been booked.`, data: { unavailable: true } };
  });
  if (dest) redirect(dest);
  return r;
}

export async function cancelBookingAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const b = await requestCancellation(await getDb(), actor, str(fd, 'bookingId'), str(fd, 'reason'));
    revalidatePath(`/agent/bookings/${b.id}`);
    return b.status === 'cancelled' ? 'Cancelled. A credit note has been issued where applicable.' : 'Cancellation requested. Our operations team will confirm with the hotel.';
  });
}

export async function amendBookingAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const b = await requestAmendment(await getDb(), actor, str(fd, 'bookingId'), str(fd, 'details'));
    revalidatePath(`/agent/bookings/${b.id}`);
    return 'Amendment requested. The original booking stands until we confirm the change.';
  });
}

export async function toggleSavedAction(fd: FormData) {
  const { actor } = await requireAgent();
  const db = await getDb();
  const hotelId = str(fd, 'hotelId');
  const t = schema.savedHotels;
  const [existing] = await db.select().from(t).where(and(eq(t.userId, actor.userId), eq(t.hotelId, hotelId)));
  if (existing) await db.delete(t).where(and(eq(t.userId, actor.userId), eq(t.hotelId, hotelId)));
  else await db.insert(t).values({ userId: actor.userId, hotelId }).onConflictDoNothing();
  revalidatePath('/agent', 'layout');
}

export async function createGroupAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    const legs = [0, 1, 2, 3].map((i) => ({ city: str(fd, `leg_${i}_city`), checkIn: str(fd, `leg_${i}_in`), checkOut: str(fd, `leg_${i}_out`) }))
      .filter((l) => l.city || l.checkIn || l.checkOut);
    const currency = str(fd, 'currency') as 'EUR';
    const budget = str(fd, 'budget');
    let budgetMinor: number | null = null;
    if (budget) {
      try { budgetMinor = parseMoney(budget, currency); } catch { throw new AppError('Budget must be an amount, e.g. 120 or 120.50'); }
    }
    const e = await createEnquiry(await getDb(), actor, {
      groupName: str(fd, 'groupName'), groupType: str(fd, 'groupType') as 'leisure', legs,
      totalPax: int(fd, 'totalPax') ?? 0,
      rooms: { single: int(fd, 'single') ?? 0, double: int(fd, 'double') ?? 0, twin: int(fd, 'twin') ?? 0, triple: int(fd, 'triple') ?? 0 },
      category: (optStr(fd, 'category') as '4') ?? undefined, mealPlan: (optStr(fd, 'mealPlan') as 'BB') ?? undefined,
      budgetMinor, budgetBasis: (optStr(fd, 'budgetBasis') as 'total') ?? null, currency,
      coachParking: bool(fd, 'coachParking'), accessibility: optStr(fd, 'accessibility'), specialRequests: optStr(fd, 'specialRequests'),
      quoteNeededBy: str(fd, 'quoteNeededBy'),
    });
    id = e.id;
    return { ok: true };
  });
  if (id) redirect(`/agent/groups/${id}?new=1`);
  return r;
}

export async function groupMessageAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    await addMessage(await getDb(), actor, str(fd, 'enquiryId'), str(fd, 'body'), 'shared');
    revalidatePath(`/agent/groups/${str(fd, 'enquiryId')}`);
    return 'Message sent to the Group Desk.';
  });
}

export async function proposalDecisionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const accept = str(fd, 'decision') === 'accept';
    await decideProposal(await getDb(), actor, str(fd, 'proposalId'), accept, optStr(fd, 'note'));
    revalidatePath(`/agent/groups/${str(fd, 'enquiryId')}`);
    return accept ? 'Accepted. The Group Desk will confirm with the hotels and send the contract and payment schedule.' : 'Declined. Tell the Group Desk what would work better.';
  });
}

export async function addTeamMemberAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    await addAgencyUser(await getDb(), actor, { name: str(fd, 'name'), email: str(fd, 'email'), password: str(fd, 'password'), role: str(fd, 'role') === 'owner' ? 'owner' : 'agent' });
    revalidatePath('/agent/profile');
    return 'Team member added. Share their first password privately; they can change it after signing in.';
  });
}

export async function changePasswordAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const r = await attempt(async () => {
    const { actor } = await requireAgent();
    await changePassword(await getDb(), actor, str(fd, 'current'), str(fd, 'next'));
    return { ok: true };
  });
  if (r.ok) redirect('/login');
  return r;
}

export async function supportAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const subject = str(fd, 'subject');
    const body = str(fd, 'body');
    if (subject.length < 3 || body.length < 10) throw new AppError('Add a subject and describe what you need');
    const bookingRef = optStr(fd, 'bookingRef');
    const db = await getDb();
    let bookingId: string | null = null;
    if (bookingRef) {
      const [b] = await db.select({ id: schema.bookings.id }).from(schema.bookings).where(and(eq(schema.bookings.reference, bookingRef.toUpperCase()), eq(schema.bookings.agencyId, actor.agencyId!)));
      if (!b) throw new AppError(`We can't find booking ${bookingRef} in your agency`);
      bookingId = b.id;
    }
    await db.insert(schema.supportTickets).values({ agencyId: actor.agencyId!, userId: actor.userId, bookingId, subject, body, urgency: bool(fd, 'urgent') ? 'urgent' : 'normal' });
    revalidatePath('/agent/support');
    return 'Received. Our team will reply here and by email.';
  });
}

export async function uploadKycAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const f = await file(fd, 'document');
    if (!f) throw new AppError('Choose a file to upload');
    await uploadAgencyDocument(await getDb(), actor, actor.agencyId!, str(fd, 'kind') as DocumentKind, f);
    revalidatePath('/agent/profile');
    revalidatePath('/agent', 'layout');
    return 'Uploaded. Our team will review it — usually within one working day.';
  });
}

export async function taxIdsAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    await updateTaxIds(await getDb(), actor, actor.agencyId!, { pan: optStr(fd, 'pan') ?? null, gstin: optStr(fd, 'gstin') ?? null });
    revalidatePath('/agent/profile');
    return 'Tax details saved.';
  });
}

export async function payFromWalletAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const { booking, paid } = await payFromWallet(await getDb(), actor, str(fd, 'bookingId'));
    revalidatePath(`/agent/bookings/${booking.id}`);
    revalidatePath('/agent', 'layout');
    return `${formatMoney(paid, booking.currency)} paid from your wallet.${booking.status === 'confirmed' ? ' The booking is confirmed.' : ''}`;
  });
}

export async function walletPayoutRequestAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { actor } = await requireAgent();
    const currency = str(fd, 'currency');
    const db = await getDb();
    const available = await walletBalance(db, actor.agencyId!, currency);
    if (available <= 0) throw new AppError('There is nothing in your wallet to withdraw');
    await db.insert(schema.supportTickets).values({
      agencyId: actor.agencyId!, userId: actor.userId, subject: `Wallet withdrawal: ${formatMoney(available, currency)}`,
      body: `Please pay out our wallet balance of ${formatMoney(available, currency)} to our registered bank account.${optStr(fd, 'note') ? '\n\n' + optStr(fd, 'note') : ''}`,
    });
    revalidatePath('/agent/finance');
    return 'Withdrawal requested. Finance pays to your registered bank account and records it here.';
  });
}
