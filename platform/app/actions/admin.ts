'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { getDb, schema } from '@/lib/db';
import { attempt, bool, bps, file, int, optStr, str, type ActionResult } from '@/lib/action';
import { updateTaxIds, uploadAgencyDocument, type DocumentKind } from '@/lib/services/kyc';
import { recordHotelSettlement } from '@/lib/services/tracker';
import { addStaff, updateStaff } from '@/lib/services/staff';
import type { StaffRole } from '@/lib/services/actor';
import { parseMoney } from '@/lib/domain/money';
import { requireStaff } from '@/lib/session';
import {
  hotelRespond, processCancellation, reconcileBooking, recordPayment, recordRefund, resolveAmendment, expireUnpaidHolds, lapseUnansweredRequests, recordWalletPayout,
} from '@/lib/services/bookings';
import {
  addPricingRule, addRatePeriod, addRestriction, addRoomType, contractSchema, createContract, createHotel, createPartnerUser,
  deactivateRatePeriod, importRateSheet, parseRateSheet, removeRestriction, setAgencyCredit, setAgencyStatus, setAllocation,
  setContractStatus, setHotelImages, setHotelStatus, updateContract, updateHotel,
} from '@/lib/services/catalog';
import {
  addMessage, buildProposal, generateHotelRequests, markRequestSent, recordOffer, sendProposal, setRequestStatus, setStage, type GroupStage,
} from '@/lib/services/groups';
import { setSetting } from '@/lib/services/settings';
import { AppError } from '@/lib/services/errors';
import { audit } from '@/lib/services/audit';

const staff = async () => (await requireStaff()).actor;
const money = (fd: FormData, k: string, currency: string): number | null => {
  const v = str(fd, k);
  if (!v) return null;
  try { return parseMoney(v, currency); } catch { throw new AppError(`"${v}" is not a valid ${currency} amount`); }
};

/* ------------------------------ bookings ------------------------------ */

export async function bookingOpsAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const db = await getDb();
    const id = str(fd, 'bookingId');
    const op = str(fd, 'op');
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
    if (!b) throw new AppError('Booking not found');
    let msg = 'Done.';
    if (op === 'reconcile') { const r = await reconcileBooking(db, actor, id); msg = `Reconciled: now ${r.status}.`; }
    else if (op === 'payment') { const r = await recordPayment(db, actor, id, { amountMinor: money(fd, 'amount', b.currency) ?? 0, reference: str(fd, 'reference') }); msg = `Payment recorded. Booking ${r.status}, payment ${r.paymentStatus}.`; }
    else if (op === 'refund') { await recordRefund(db, actor, id, { amountMinor: money(fd, 'amount', b.currency) ?? 0, reference: str(fd, 'reference') }); msg = 'Refund recorded.'; }
    else if (op === 'confirm') { await hotelRespond(db, actor, id, { accept: true, confirmation: str(fd, 'confirmation') }); msg = 'Hotel confirmation recorded.'; }
    else if (op === 'decline') { await hotelRespond(db, actor, id, { accept: false, note: str(fd, 'note') }); msg = 'Marked as declined by the hotel.'; }
    else if (op === 'cancel') { await processCancellation(db, actor, id); msg = 'Cancelled with the supplier; ledger updated.'; }
    else if (op === 'amend') { await resolveAmendment(db, actor, id, str(fd, 'note')); msg = 'Amendment resolved.'; }
    else throw new AppError('Unknown operation');
    revalidatePath(`/admin/bookings/${id}`);
    return msg;
  });
}

export async function expireHoldsAction(): Promise<void> {
  await staff();
  const db = await getDb();
  await expireUnpaidHolds(db);
  await lapseUnansweredRequests(db);
  revalidatePath('/admin');
}

/* ------------------------------ hotels ------------------------------ */

function hotelInput(fd: FormData) {
  return {
    name: str(fd, 'name'), city: str(fd, 'city'), country: str(fd, 'country'), address: optStr(fd, 'address'),
    starRating: int(fd, 'starRating'), starRatingVerified: bool(fd, 'starRatingVerified'),
    collections: fd.getAll('collections').map(String), summary: optStr(fd, 'summary'), description: optStr(fd, 'description'),
    facilities: str(fd, 'facilities').split(/\n|,/).map((s) => s.trim()).filter(Boolean),
    transport: optStr(fd, 'transport'), checkInTime: optStr(fd, 'checkInTime'), checkOutTime: optStr(fd, 'checkOutTime'),
    groupNotes: optStr(fd, 'groupNotes'), contactName: optStr(fd, 'contactName'), contactEmail: optStr(fd, 'contactEmail'),
    reservationsEmail: optStr(fd, 'reservationsEmail'),
  };
}

export async function createHotelAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => { id = (await createHotel(await getDb(), await staff(), hotelInput(fd))).id; return { ok: true }; });
  if (id) redirect(`/admin/hotels/${id}`);
  return r;
}

export async function updateHotelAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await updateHotel(await getDb(), await staff(), str(fd, 'hotelId'), hotelInput(fd));
    revalidatePath(`/admin/hotels/${str(fd, 'hotelId')}`);
    return 'Hotel profile saved.';
  });
}

export async function hotelStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await setHotelStatus(await getDb(), await staff(), str(fd, 'hotelId'), str(fd, 'status') as 'active');
    revalidatePath(`/admin/hotels/${str(fd, 'hotelId')}`);
    return str(fd, 'status') === 'active' ? 'Published to agents.' : 'Status updated.';
  });
}

export async function hotelImageAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const db = await getDb();
    const hotelId = str(fd, 'hotelId');
    const [h] = await db.select().from(schema.hotels).where(eq(schema.hotels.id, hotelId));
    const remove = str(fd, 'remove');
    const images = remove !== '' ? h.images.filter((_, i) => String(i) !== remove)
      : [...h.images, { url: str(fd, 'url'), alt: str(fd, 'alt'), credit: optStr(fd, 'credit'), license: str(fd, 'license') }];
    await setHotelImages(db, await staff(), hotelId, images);
    revalidatePath(`/admin/hotels/${hotelId}`);
    return 'Images updated.';
  });
}

export async function addRoomTypeAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await addRoomType(await getDb(), await staff(), str(fd, 'hotelId'), {
      name: str(fd, 'name'), description: optStr(fd, 'description'), maxAdults: int(fd, 'maxAdults') ?? 2,
      maxChildren: int(fd, 'maxChildren') ?? 0, maxOccupancy: int(fd, 'maxOccupancy') ?? 2, bedding: optStr(fd, 'bedding'), sizeSqm: int(fd, 'sizeSqm'),
    });
    revalidatePath(`/admin/hotels/${str(fd, 'hotelId')}`);
    return 'Room type added.';
  });
}

export async function partnerUserAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await createPartnerUser(await getDb(), await staff(), { hotelId: str(fd, 'hotelId'), name: str(fd, 'name'), email: str(fd, 'email'), password: str(fd, 'password') });
    return 'Partner login created. Share the first password privately with the hotel.';
  });
}

/* ------------------------------ contracts ------------------------------ */

function contractInput(fd: FormData) {
  const currency = str(fd, 'currency') || 'EUR';
  const free = str(fd, 'freeCancelDays');
  const hours = str(fd, 'responseHours');
  return ({
    reference: str(fd, 'reference'), inventoryModel: str(fd, 'inventoryModel'), rateBasis: str(fd, 'rateBasis'),
    collectionModel: str(fd, 'collectionModel'), currency, validFrom: str(fd, 'validFrom'), validTo: str(fd, 'validTo'),
    commissionBps: bps(fd, 'commissionPct'), taxMode: str(fd, 'taxMode'), taxBps: bps(fd, 'taxPct'),
    localTaxMinor: money(fd, 'localTax', currency) ?? 0, confirmationMode: str(fd, 'confirmationMode'),
    responseHours: hours === '' ? 48 : Number(hours),
    freeCancelDays: free === '' ? null : Number(free), latePenaltyType: str(fd, 'latePenaltyType'), latePenaltyBps: bps(fd, 'latePenaltyPct'),
    nonRefundable: bool(fd, 'nonRefundable'), paymentTerms: optStr(fd, 'paymentTerms'), distributionPermitted: bool(fd, 'distributionPermitted'),
    documentUrl: optStr(fd, 'documentUrl'), internalNotes: optStr(fd, 'internalNotes'),
  }) as unknown as z.input<typeof contractSchema>;
}

export async function createContractAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id = '';
  const r = await attempt(async () => { id = (await createContract(await getDb(), await staff(), str(fd, 'hotelId'), contractInput(fd))).id; return { ok: true }; });
  if (id) redirect(`/admin/contracts/${id}`);
  return r;
}

export async function updateContractAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await updateContract(await getDb(), await staff(), str(fd, 'contractId'), contractInput(fd));
    revalidatePath(`/admin/contracts/${str(fd, 'contractId')}`);
    return 'Contract saved. Commercial changes to an active contract return it to draft for re-approval.';
  });
}

export async function contractStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await setContractStatus(await getDb(), await staff(), str(fd, 'contractId'), str(fd, 'status') as 'active');
    revalidatePath(`/admin/contracts/${str(fd, 'contractId')}`);
    return str(fd, 'status') === 'active' ? 'Activated — these rates are now bookable.' : 'Status updated.';
  });
}

export async function addRateAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const c = str(fd, 'currency');
    await addRatePeriod(await getDb(), await staff(), str(fd, 'contractId'), {
      roomTypeId: str(fd, 'roomTypeId'), mealPlan: str(fd, 'mealPlan') as 'BB', dateFrom: str(fd, 'dateFrom'), dateTo: str(fd, 'dateTo'),
      price1Minor: money(fd, 'p1', c), price2Minor: money(fd, 'p2', c), price3Minor: money(fd, 'p3', c), childMinor: money(fd, 'child', c),
      minStay: int(fd, 'minStay') ?? 1, releaseDays: int(fd, 'releaseDays') ?? 0,
    });
    revalidatePath(`/admin/contracts/${str(fd, 'contractId')}`);
    return 'Rate period added.';
  });
}

export async function deactivateRateAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await deactivateRatePeriod(await getDb(), await staff(), str(fd, 'rateId'));
    revalidatePath(`/admin/contracts/${str(fd, 'contractId')}`);
    return 'Rate deactivated.';
  });
}

export async function importRatesAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const db = await getDb();
    const actor = await staff();
    const csv = str(fd, 'csv');
    if (str(fd, 'mode') === 'preview') {
      const { rows, errors } = await parseRateSheet(db, str(fd, 'contractId'), csv);
      return { ok: errors.length === 0, message: `${rows.length} valid line(s).${errors.length ? `\n${errors.join('\n')}` : ' Ready to import.'}` };
    }
    const n = await importRateSheet(db, actor, str(fd, 'contractId'), csv);
    revalidatePath(`/admin/contracts/${str(fd, 'contractId')}`);
    return `Imported ${n} rate period(s).`;
  });
}

export async function restrictionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const db = await getDb();
    const actor = await staff();
    if (str(fd, 'remove')) await removeRestriction(db, actor, str(fd, 'remove'));
    else await addRestriction(db, actor, str(fd, 'contractId'), {
      roomTypeId: str(fd, 'roomTypeId') || null, kind: str(fd, 'kind') as 'blackout', dateFrom: str(fd, 'dateFrom'), dateTo: str(fd, 'dateTo'),
      amountMinor: money(fd, 'amount', str(fd, 'currency')), note: optStr(fd, 'note'),
    });
    revalidatePath(`/admin/contracts/${str(fd, 'contractId')}`);
    return 'Restrictions updated.';
  });
}

export async function allocationAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await setAllocation(await getDb(), await staff(), str(fd, 'contractId'), { roomTypeId: str(fd, 'roomTypeId'), dateFrom: str(fd, 'dateFrom'), dateTo: str(fd, 'dateTo'), rooms: int(fd, 'rooms') ?? 0 });
    revalidatePath(`/admin/contracts/${str(fd, 'contractId')}`);
    return 'Allotment set.';
  });
}

/* ------------------------------ agencies & pricing ------------------------------ */

export async function agencyStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await setAgencyStatus(await getDb(), await staff(), str(fd, 'agencyId'), str(fd, 'status') as 'verified', optStr(fd, 'note'));
    revalidatePath(`/admin/agencies/${str(fd, 'agencyId')}`);
    return `Agency ${str(fd, 'status')}.`;
  });
}

export async function agencyCreditAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await setAgencyCredit(await getDb(), await staff(), str(fd, 'agencyId'), {
      enabled: bool(fd, 'enabled'), limitMinor: money(fd, 'limit', str(fd, 'currency')) ?? 0, termsDays: int(fd, 'termsDays') ?? 0, note: str(fd, 'note'),
    });
    revalidatePath(`/admin/agencies/${str(fd, 'agencyId')}`);
    return 'Credit terms saved.';
  });
}

export async function pricingRuleAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const kind = str(fd, 'kind') as 'percent' | 'fixed';
    const currency = optStr(fd, 'currency') ?? null;
    await addPricingRule(await getDb(), await staff(), {
      agencyId: optStr(fd, 'agencyId') ?? null, hotelId: optStr(fd, 'hotelId') ?? null, kind,
      valueBps: kind === 'percent' ? bps(fd, 'markupPct') : null,
      fixedMinor: kind === 'fixed' && currency ? money(fd, 'fixed', currency) : null, currency,
      agentCommissionShareBps: bps(fd, 'sharePct'), rounding: str(fd, 'rounding') as 'whole_unit', note: optStr(fd, 'note'),
    });
    revalidatePath('/admin/pricing');
    if (optStr(fd, 'agencyId')) revalidatePath(`/admin/agencies/${str(fd, 'agencyId')}`);
    return 'Pricing rule saved. It replaces the previous rule for the same scope.';
  });
}

export async function settingAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    await setSetting(await getDb(), await staff(), str(fd, 'key') as 'payment.instructions', str(fd, 'value'));
    return 'Saved.';
  });
}

/* ------------------------------ group desk ------------------------------ */

export async function groupOpsAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const db = await getDb();
    const id = str(fd, 'enquiryId');
    const op = str(fd, 'op');
    let msg = 'Saved.';
    if (op === 'stage') await setStage(db, actor, id, str(fd, 'status') as GroupStage, optStr(fd, 'note'));
    else if (op === 'message') { await addMessage(db, actor, id, str(fd, 'body'), str(fd, 'visibility') === 'shared' ? 'shared' : 'internal'); msg = 'Message added.'; }
    else if (op === 'requests') {
      const manual = str(fd, 'manual').split('\n').map((l) => l.split(',').map((x) => x.trim())).filter((p) => p[0]).map(([name, city, email]) => ({ name, city: city || '', email }));
      const n = await generateHotelRequests(db, actor, id, { hotelIds: fd.getAll('hotelIds').map(String), manual, respondBy: str(fd, 'respondBy') });
      msg = `${n} enquiry email(s) generated. Copy and send each one, then mark it as sent.`;
    }
    else if (op === 'sent') { await markRequestSent(db, actor, str(fd, 'requestId')); msg = 'Marked as sent.'; }
    else if (op === 'request_status') await setRequestStatus(db, actor, str(fd, 'requestId'), str(fd, 'status') as 'declined');
    else if (op === 'offer') {
      const currency = str(fd, 'currency');
      const lines = [0, 1, 2, 3].map((i) => ({ roomType: str(fd, `rt_${i}`), rooms: int(fd, `rooms_${i}`) ?? 0, nights: int(fd, `nights_${i}`) ?? 0, rateMinor: money(fd, `rate_${i}`, currency) ?? 0 }))
        .filter((l) => l.roomType);
      await recordOffer(db, actor, id, {
        requestId: optStr(fd, 'requestId') ?? null, hotelName: str(fd, 'hotelName'), city: str(fd, 'city'), currency: currency as 'EUR', lines,
        mealPlan: optStr(fd, 'mealPlan'), taxesNote: optStr(fd, 'taxesNote'), cityTaxMinor: money(fd, 'cityTax', currency),
        cancellationTerms: optStr(fd, 'cancellationTerms'), paymentTerms: optStr(fd, 'paymentTerms'), validUntil: str(fd, 'validUntil'),
      });
      msg = 'Offer recorded.';
    }
    else if (op === 'proposal') {
      const r = await buildProposal(db, actor, id, { offerIds: fd.getAll('offerIds').map(String), markupBps: bps(fd, 'markupPct'), validUntil: str(fd, 'validUntil'), inclusions: optStr(fd, 'inclusions'), exclusions: optStr(fd, 'exclusions') });
      msg = `Proposal v${r.proposal.version} drafted: margin ${(r.marginBps / 100).toFixed(2)}%. Review it, then send.`;
    }
    else if (op === 'send_proposal') { await sendProposal(db, actor, str(fd, 'proposalId')); msg = 'Proposal sent to the agent.'; }
    else throw new AppError('Unknown operation');
    revalidatePath(`/admin/groups/${id}`);
    return msg;
  });
}

/* ------------------------------ partners & support ------------------------------ */

export async function applicationStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const db = await getDb();
    await db.update(schema.partnerApplications).set({ status: str(fd, 'status') }).where(eq(schema.partnerApplications.id, str(fd, 'id')));
    await audit(db, actor, 'partner_application.status', 'partner_application', str(fd, 'id'), { status: str(fd, 'status') });
    revalidatePath('/admin/partners');
    return 'Updated.';
  });
}

export async function supportReplyAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const db = await getDb();
    await db.update(schema.supportTickets).set({ reply: str(fd, 'reply'), status: bool(fd, 'close') ? 'closed' : 'answered', updatedAt: new Date() }).where(eq(schema.supportTickets.id, str(fd, 'id')));
    await audit(db, actor, 'support.replied', 'support_ticket', str(fd, 'id'));
    revalidatePath('/admin/support');
    return 'Reply saved. (Email delivery is not connected yet — the agent sees it in their Support page.)';
  });
}

export async function adminUploadKycAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const f = await file(fd, 'document');
    if (!f) throw new AppError('Choose a file to upload');
    const agencyId = str(fd, 'agencyId');
    await uploadAgencyDocument(await getDb(), actor, agencyId, str(fd, 'kind') as DocumentKind, f);
    revalidatePath(`/admin/agencies/${agencyId}`);
    return 'Document added.';
  });
}

export async function adminTaxIdsAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const agencyId = str(fd, 'agencyId');
    await updateTaxIds(await getDb(), actor, agencyId, { pan: optStr(fd, 'pan') ?? null, gstin: optStr(fd, 'gstin') ?? null });
    revalidatePath(`/admin/agencies/${agencyId}`);
    return 'Tax details saved.';
  });
}

export async function walletPayoutAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const agencyId = str(fd, 'agencyId');
    const currency = str(fd, 'currency');
    let amountMinor: number;
    try { amountMinor = parseMoney(str(fd, 'amount'), currency); } catch { throw new AppError('Enter the amount paid out'); }
    await recordWalletPayout(await getDb(), actor, agencyId, { amountMinor, currency, reference: str(fd, 'reference') });
    revalidatePath(`/admin/agencies/${agencyId}`);
    return 'Payout recorded. The agency sees it in its wallet history.';
  });
}

export async function hotelSettlementAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const currency = str(fd, 'currency');
    let amountMinor: number;
    try { amountMinor = parseMoney(str(fd, 'amount'), currency); } catch { throw new AppError('Enter the amount'); }
    await recordHotelSettlement(await getDb(), actor, { hotelId: str(fd, 'hotelId'), direction: str(fd, 'direction') as 'paid_hotel', currency, amountMinor, reference: str(fd, 'reference') });
    revalidatePath('/admin/tracker');
    return 'Settlement recorded.';
  });
}

export async function addStaffAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    await addStaff(await getDb(), actor, { name: str(fd, 'name'), email: str(fd, 'email'), role: str(fd, 'role'), password: str(fd, 'password') });
    revalidatePath('/admin/team');
    return 'Added. Share the first password privately.';
  });
}

export async function updateStaffAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const actor = await staff();
    const intent = str(fd, 'intent');
    await updateStaff(await getDb(), actor, str(fd, 'userId'),
      intent === 'disable' ? { status: 'disabled' } : intent === 'enable' ? { status: 'active' } : { role: str(fd, 'role') as StaffRole });
    revalidatePath('/admin/team');
    return intent === 'role' ? 'Role updated — they have been signed out to pick it up.' : intent === 'disable' ? 'Disabled and signed out.' : 'Enabled.';
  });
}
