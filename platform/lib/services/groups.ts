/* ------------------------------------------------------------------ *
 * Group Desk. Negotiation stays human; the administration around it —
 * structure, deadlines, hotel enquiries, offer comparison, proposals,
 * margins, history — is the system's job.
 * ------------------------------------------------------------------ */
import { and, asc, desc, eq, inArray, max } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import type { GroupOfferLine } from '@/lib/db/schema';
import { GROUP_FIRST_RESPONSE_HOURS } from '@/lib/config';
import { addDays, daysBetween, formatDate, isIsoDate, todayIso } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { priceGroupProposal } from '@/lib/domain/pricing';
import { agencyOf, isStaff, requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { nextNumber } from './counters';
import { AppError, NotFoundError } from './errors';

const { groupEnquiries, groupHotelRequests, groupOffers, groupProposals, groupMessages, agencies, hotels } = schema;

export const GROUP_STAGES = ['new', 'under_review', 'sent_to_hotels', 'offers_received', 'proposal_prepared', 'sent_to_agent', 'negotiation', 'won', 'lost', 'cancelled'] as const;
export type GroupStage = typeof GROUP_STAGES[number];

export const STAGE_LABEL: Record<string, string> = {
  new: 'New', under_review: 'Under review', sent_to_hotels: 'Sent to hotels', offers_received: 'Offers received',
  proposal_prepared: 'Proposal prepared', sent_to_agent: 'Proposal sent', negotiation: 'Negotiation', won: 'Won', lost: 'Lost', cancelled: 'Cancelled',
};

const legSchema = z.object({
  city: z.string().trim().min(2, 'City is required').max(80),
  checkIn: z.string().refine(isIsoDate, 'Arrival date is required'),
  checkOut: z.string().refine(isIsoDate, 'Departure date is required'),
});

export const enquirySchema = z.object({
  groupName: z.string().trim().min(2, 'Name the group (e.g. "Sharma family wedding")').max(120),
  groupType: z.enum(['leisure', 'corporate', 'mice', 'wedding', 'education', 'sports', 'other']),
  legs: z.array(legSchema).min(1, 'Add at least one destination').max(8),
  totalPax: z.number().int().min(2, 'Groups start at 2 travellers').max(2000),
  rooms: z.object({ single: z.number().int().min(0), double: z.number().int().min(0), twin: z.number().int().min(0), triple: z.number().int().min(0) }),
  category: z.enum(['3', '4', '5', 'any']).optional(),
  mealPlan: z.enum(['RO', 'BB', 'HB', 'FB']).optional(),
  budgetMinor: z.number().int().positive().optional().nullable(),
  budgetBasis: z.enum(['per_room_night', 'per_person_total', 'total']).optional().nullable(),
  currency: z.enum(['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED']),
  coachParking: z.boolean(),
  accessibility: z.string().trim().max(500).optional().nullable(),
  specialRequests: z.string().trim().max(2000).optional().nullable(),
  quoteNeededBy: z.string().refine(isIsoDate, 'When do you need the quotation?'),
}).superRefine((v, ctx) => {
  const today = todayIso();
  v.legs.forEach((l, i) => {
    if (daysBetween(l.checkIn, l.checkOut) < 1) ctx.addIssue({ code: 'custom', path: ['legs', i, 'checkOut'], message: 'Departure must be after arrival' });
    if (l.checkIn < today) ctx.addIssue({ code: 'custom', path: ['legs', i, 'checkIn'], message: 'Arrival is in the past' });
    if (i > 0 && l.checkIn < v.legs[i - 1].checkOut) ctx.addIssue({ code: 'custom', path: ['legs', i, 'checkIn'], message: 'Legs overlap the previous stop' });
  });
  const r = v.rooms;
  const totalRooms = r.single + r.double + r.twin + r.triple;
  const capacity = r.single + 2 * (r.double + r.twin) + 3 * r.triple;
  if (totalRooms === 0) ctx.addIssue({ code: 'custom', path: ['rooms'], message: 'Add the rooms you need' });
  else if (capacity < v.totalPax) ctx.addIssue({ code: 'custom', path: ['rooms'], message: `These rooms sleep ${capacity}, but the group has ${v.totalPax} travellers` });
  else if (totalRooms > v.totalPax) ctx.addIssue({ code: 'custom', path: ['rooms'], message: 'More rooms than travellers — check the room split' });
  if (v.quoteNeededBy < today) ctx.addIssue({ code: 'custom', path: ['quoteNeededBy'], message: 'Deadline is in the past' });
  if (v.legs[0] && v.quoteNeededBy > v.legs[0].checkIn) ctx.addIssue({ code: 'custom', path: ['quoteNeededBy'], message: 'Deadline is after arrival' });
  if (v.budgetMinor && !v.budgetBasis) ctx.addIssue({ code: 'custom', path: ['budgetBasis'], message: 'Say what the budget covers' });
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export async function createEnquiry(db: DB, actor: Actor, input: EnquiryInput) {
  const agencyId = agencyOf(actor);
  const data = enquirySchema.parse(input);
  const year = new Date().getUTCFullYear();
  const n = await nextNumber(db, `GRP-${year}`);
  const [agency] = await db.select({ isSample: agencies.isSample }).from(agencies).where(eq(agencies.id, agencyId));
  const [e] = await db.insert(groupEnquiries).values({
    reference: `GRP-${year}-${String(n).padStart(4, '0')}`,
    agencyId, createdBy: actor.userId, status: 'new',
    groupName: data.groupName, groupType: data.groupType, legs: data.legs, totalPax: data.totalPax, rooms: data.rooms,
    category: data.category ?? null, mealPlan: data.mealPlan ?? null, budgetMinor: data.budgetMinor ?? null, budgetBasis: data.budgetBasis ?? null,
    currency: data.currency, coachParking: data.coachParking, accessibility: data.accessibility || null, specialRequests: data.specialRequests || null,
    quoteNeededBy: data.quoteNeededBy, respondBy: new Date(Date.now() + GROUP_FIRST_RESPONSE_HOURS * 3_600_000),
    isSample: agency?.isSample ?? false,
  }).returning();
  await db.insert(groupMessages).values({
    enquiryId: e.id, authorLabel: 'HotelBridge', visibility: 'shared',
    body: `Thank you — we've received ${e.reference}. A Group Desk specialist will review it and reply within ${GROUP_FIRST_RESPONSE_HOURS} hours. We'll approach suitable hotels and send you a written proposal before ${formatDate(e.quoteNeededBy)}.`,
  });
  await audit(db, actor, 'group.created', 'group_enquiry', e.id, { reference: e.reference }, agencyId);
  return e;
}

async function load(db: DB, actor: Actor, id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Enquiry');
  const [e] = await db.select().from(groupEnquiries).where(eq(groupEnquiries.id, id));
  if (!e || (!isStaff(actor) && e.agencyId !== actor.agencyId)) throw new NotFoundError('Enquiry');
  return e;
}

/** Everything about one enquiry the actor may see. Agents never see internal notes, hotel costs or margins. */
export async function getEnquiry(db: DB, actor: Actor, id: string) {
  const e = await load(db, actor, id);
  const staff = isStaff(actor);
  const [messages, proposals, requests, offers] = await Promise.all([
    db.select().from(groupMessages).where(and(eq(groupMessages.enquiryId, id), staff ? undefined : eq(groupMessages.visibility, 'shared'))).orderBy(asc(groupMessages.createdAt)),
    db.select().from(groupProposals).where(and(eq(groupProposals.enquiryId, id), staff ? undefined : inArray(groupProposals.status, ['sent', 'accepted', 'declined', 'superseded']))).orderBy(desc(groupProposals.version)),
    staff ? db.select().from(groupHotelRequests).where(eq(groupHotelRequests.enquiryId, id)).orderBy(asc(groupHotelRequests.createdAt)) : Promise.resolve([]),
    db.select().from(groupOffers).where(eq(groupOffers.enquiryId, id)).orderBy(asc(groupOffers.createdAt)),
  ]);
  const visibleOffers = staff ? offers : offers.filter((o) => proposals.some((p) => p.offerIds.includes(o.id)));
  const [agency] = await db.select({ name: agencies.name, country: agencies.country }).from(agencies).where(eq(agencies.id, e.agencyId));
  return {
    enquiry: e,
    agency,
    messages,
    proposals: staff ? proposals : proposals.map((p) => ({ ...p, costTotalMinor: 0, markupBps: 0 })),
    requests,
    offers: staff ? visibleOffers : visibleOffers.map((o) => ({ ...o, costTotalMinor: 0, lines: [] as GroupOfferLine[] })),
  };
}

export async function listEnquiries(db: DB, actor: Actor) {
  if (isStaff(actor)) {
    return db.select({ e: groupEnquiries, agencyName: agencies.name }).from(groupEnquiries)
      .innerJoin(agencies, eq(agencies.id, groupEnquiries.agencyId)).orderBy(desc(groupEnquiries.createdAt));
  }
  const agencyId = agencyOf(actor);
  return db.select({ e: groupEnquiries, agencyName: agencies.name }).from(groupEnquiries)
    .innerJoin(agencies, eq(agencies.id, groupEnquiries.agencyId))
    .where(eq(groupEnquiries.agencyId, agencyId)).orderBy(desc(groupEnquiries.createdAt));
}

export async function setStage(db: DB, actor: Actor, id: string, status: GroupStage, note?: string) {
  requireStaff(actor, ['admin', 'ops']);
  const e = await load(db, actor, id);
  if (['won', 'lost', 'cancelled'].includes(e.status) && status !== e.status) throw new AppError('This enquiry is closed');
  await db.update(groupEnquiries).set({ status, outcomeNote: note ?? e.outcomeNote, updatedAt: new Date(), assignedTo: e.assignedTo ?? actor.userId }).where(eq(groupEnquiries.id, id));
  await db.insert(groupMessages).values({ enquiryId: id, authorId: actor.userId, authorLabel: actor.label, visibility: 'internal', body: `Stage → ${STAGE_LABEL[status]}${note ? `: ${note}` : ''}` });
  await audit(db, actor, 'group.stage', 'group_enquiry', id, { from: e.status, to: status }, e.agencyId);
}

export async function addMessage(db: DB, actor: Actor, id: string, body: string, visibility: 'shared' | 'internal') {
  const e = await load(db, actor, id);
  const text = z.string().trim().min(1).max(4000).parse(body);
  const vis = isStaff(actor) ? visibility : 'shared';
  await db.insert(groupMessages).values({ enquiryId: e.id, authorId: actor.userId, authorLabel: isStaff(actor) ? `${actor.label.split(' (')[0]} · HotelBridge` : actor.label.split(' (')[0], visibility: vis, body: text });
  if (!isStaff(actor) && e.status === 'sent_to_agent') await db.update(groupEnquiries).set({ status: 'negotiation', updatedAt: new Date() }).where(eq(groupEnquiries.id, e.id));
}

/* ------------------------- hotel enquiries ------------------------- */

export function enquiryEmail(e: typeof groupEnquiries.$inferSelect, leg: { city: string; checkIn: string; checkOut: string }, hotelName: string, respondBy: string) {
  const r = e.rooms;
  const rooms = [r.single && `${r.single} single`, r.double && `${r.double} double`, r.twin && `${r.twin} twin`, r.triple && `${r.triple} triple`].filter(Boolean).join(', ');
  const nights = daysBetween(leg.checkIn, leg.checkOut);
  const subject = `Group rate request ${e.reference} · ${formatDate(leg.checkIn)} · ${e.totalPax} pax`;
  const body = [
    `Dear ${hotelName} reservations team,`,
    '',
    `HotelBridge would like to request a group rate for the following B2B group:`,
    '',
    `Reference: ${e.reference}`,
    `Group type: ${e.groupType}`,
    `Arrival: ${formatDate(leg.checkIn)}   Departure: ${formatDate(leg.checkOut)}   (${nights} night${nights === 1 ? '' : 's'})`,
    `Travellers: ${e.totalPax}`,
    `Rooms: ${rooms}`,
    `Meal plan: ${e.mealPlan ?? 'Please quote room only and breakfast'}`,
    e.coachParking ? 'Coach parking: required — please confirm availability and any charge.' : null,
    e.accessibility ? `Accessibility: ${e.accessibility}` : null,
    e.specialRequests ? `Other requirements: ${e.specialRequests}` : null,
    '',
    'Please include in your offer:',
    '  • Net rate per room per night, by room type, and the currency',
    '  • Whether VAT is included, and the city tax per person per night',
    '  • Free-of-charge / tour-leader policy, if any',
    '  • Cancellation and attrition terms, deposit and payment schedule',
    '  • Option / validity date of the offer',
    '',
    `We would be grateful for your reply by ${formatDate(respondBy)}.`,
    '',
    'Kind regards,',
    'Group Desk — HotelBridge',
  ].filter((l) => l !== null).join('\n');
  return { subject, body };
}

export async function generateHotelRequests(db: DB, actor: Actor, id: string, input: { hotelIds: string[]; manual?: { name: string; email?: string; city: string }[]; respondBy: string }) {
  requireStaff(actor, ['admin', 'ops']);
  const e = await load(db, actor, id);
  if (!isIsoDate(input.respondBy)) throw new AppError('Set a reply-by date for the hotels');
  if (input.respondBy > e.quoteNeededBy) throw new AppError('Hotels must reply before the agent\'s quotation deadline');
  const picked = input.hotelIds.length ? await db.select().from(hotels).where(inArray(hotels.id, input.hotelIds)) : [];
  const targets = [
    ...picked.map((h) => ({ hotelId: h.id as string | null, name: h.name, email: h.reservationsEmail ?? h.contactEmail, city: h.city })),
    ...(input.manual ?? []).filter((m) => m.name.trim()).map((m) => ({ hotelId: null, name: m.name.trim(), email: m.email?.trim() || null, city: m.city.trim() })),
  ];
  if (!targets.length) throw new AppError('Choose at least one hotel');
  const rows = targets.map((t) => {
    const leg = e.legs.find((l) => l.city.toLowerCase() === t.city.toLowerCase()) ?? e.legs[0];
    const { subject, body } = enquiryEmail(e, leg, t.name, input.respondBy);
    return { enquiryId: e.id, hotelId: t.hotelId, hotelName: t.name, hotelEmail: t.email, city: t.city, subject, body, respondBy: input.respondBy, status: 'generated' };
  });
  await db.insert(groupHotelRequests).values(rows);
  if (e.status === 'new') await db.update(groupEnquiries).set({ status: 'under_review', updatedAt: new Date(), assignedTo: e.assignedTo ?? actor.userId }).where(eq(groupEnquiries.id, e.id));
  await audit(db, actor, 'group.requests_generated', 'group_enquiry', e.id, { count: rows.length }, e.agencyId);
  return rows.length;
}

/** A human confirms the email actually went out. We never claim "sent" for "generated". */
export async function markRequestSent(db: DB, actor: Actor, requestId: string) {
  requireStaff(actor, ['admin', 'ops']);
  const [r] = await db.select().from(groupHotelRequests).where(eq(groupHotelRequests.id, requestId));
  if (!r) throw new NotFoundError('Hotel request');
  await db.update(groupHotelRequests).set({ status: 'sent', sentAt: new Date(), sentBy: actor.userId }).where(eq(groupHotelRequests.id, requestId));
  const [e] = await db.select().from(groupEnquiries).where(eq(groupEnquiries.id, r.enquiryId));
  if (['new', 'under_review'].includes(e.status)) await db.update(groupEnquiries).set({ status: 'sent_to_hotels', updatedAt: new Date() }).where(eq(groupEnquiries.id, e.id));
}

export async function setRequestStatus(db: DB, actor: Actor, requestId: string, status: 'declined' | 'no_response') {
  requireStaff(actor, ['admin', 'ops']);
  await db.update(groupHotelRequests).set({ status }).where(eq(groupHotelRequests.id, requestId));
}

/* ------------------------------ offers ------------------------------ */

export const offerSchema = z.object({
  requestId: z.string().uuid().optional().nullable(),
  hotelName: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(80),
  currency: z.enum(['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED']),
  lines: z.array(z.object({ roomType: z.string().trim().min(1).max(60), rooms: z.number().int().positive(), nights: z.number().int().positive(), rateMinor: z.number().int().positive() })).min(1, 'Add at least one rate line'),
  mealPlan: z.string().trim().max(10).optional().nullable(),
  taxesNote: z.string().trim().max(300).optional().nullable(),
  cityTaxMinor: z.number().int().min(0).optional().nullable(),
  cancellationTerms: z.string().trim().max(1000).optional().nullable(),
  paymentTerms: z.string().trim().max(1000).optional().nullable(),
  validUntil: z.string().refine(isIsoDate, 'Offer validity date is required'),
});

export async function recordOffer(db: DB, actor: Actor, enquiryId: string, input: z.infer<typeof offerSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const e = await load(db, actor, enquiryId);
  const data = offerSchema.parse(input);
  const cost = data.lines.reduce((s, l) => s + l.rooms * l.nights * l.rateMinor, 0);
  const [o] = await db.insert(groupOffers).values({ ...data, enquiryId: e.id, costTotalMinor: cost, createdBy: actor.userId }).returning();
  if (data.requestId) await db.update(groupHotelRequests).set({ status: 'responded' }).where(eq(groupHotelRequests.id, data.requestId));
  if (['new', 'under_review', 'sent_to_hotels'].includes(e.status)) await db.update(groupEnquiries).set({ status: 'offers_received', updatedAt: new Date() }).where(eq(groupEnquiries.id, e.id));
  await audit(db, actor, 'group.offer_recorded', 'group_enquiry', e.id, { hotel: o.hotelName, cost, currency: o.currency }, e.agencyId);
  return o;
}

/* ----------------------------- proposals ----------------------------- */

export async function buildProposal(db: DB, actor: Actor, enquiryId: string, input: { offerIds: string[]; markupBps: number; validUntil: string; inclusions?: string; exclusions?: string }) {
  requireStaff(actor, ['admin', 'ops']);
  const e = await load(db, actor, enquiryId);
  const markupBps = z.number().int().min(0).max(5000).parse(input.markupBps);
  if (!isIsoDate(input.validUntil) || input.validUntil < todayIso()) throw new AppError('Proposal validity must be a future date');
  const offers = input.offerIds.length ? await db.select().from(groupOffers).where(and(eq(groupOffers.enquiryId, e.id), inArray(groupOffers.id, input.offerIds))) : [];
  if (!offers.length) throw new AppError('Select the hotel offers to include');
  const currencies = new Set(offers.map((o) => o.currency));
  if (currencies.size > 1) throw new AppError('Offers in different currencies need a recorded FX rate — quote them separately for now');
  const latestValidity = offers.map((o) => o.validUntil).filter(Boolean).sort()[0];
  if (latestValidity && input.validUntil > latestValidity) throw new AppError(`A hotel offer expires on ${formatDate(latestValidity)} — the proposal cannot be valid for longer`);
  const currency = offers[0].currency;
  const cost = offers.reduce((s, o) => s + o.costTotalMinor, 0);
  const p = priceGroupProposal(cost, markupBps, currency);
  const [{ v }] = await db.select({ v: max(groupProposals.version) }).from(groupProposals).where(eq(groupProposals.enquiryId, e.id));
  const [row] = await db.insert(groupProposals).values({
    enquiryId: e.id, version: (v ?? 0) + 1, offerIds: offers.map((o) => o.id), markupBps, currency,
    costTotalMinor: cost, sellTotalMinor: p.sellMinor, validUntil: input.validUntil,
    inclusions: input.inclusions?.trim() || null, exclusions: input.exclusions?.trim() || null, createdBy: actor.userId,
  }).returning();
  await db.update(groupEnquiries).set({ status: 'proposal_prepared', updatedAt: new Date() }).where(eq(groupEnquiries.id, e.id));
  await audit(db, actor, 'group.proposal_built', 'group_enquiry', e.id, { version: row.version, cost, sell: p.sellMinor, marginBps: p.marginBps }, e.agencyId);
  return { proposal: row, ...p };
}

export async function sendProposal(db: DB, actor: Actor, proposalId: string) {
  requireStaff(actor, ['admin', 'ops']);
  const [p] = await db.select().from(groupProposals).where(eq(groupProposals.id, proposalId));
  if (!p || p.status !== 'draft') throw new AppError('Only draft proposals can be sent');
  await db.update(groupProposals).set({ status: 'superseded' }).where(and(eq(groupProposals.enquiryId, p.enquiryId), eq(groupProposals.status, 'sent')));
  await db.update(groupProposals).set({ status: 'sent', sentAt: new Date() }).where(eq(groupProposals.id, p.id));
  await db.update(groupEnquiries).set({ status: 'sent_to_agent', updatedAt: new Date() }).where(eq(groupEnquiries.id, p.enquiryId));
  await db.insert(groupMessages).values({
    enquiryId: p.enquiryId, authorId: actor.userId, authorLabel: 'HotelBridge Group Desk', visibility: 'shared',
    body: `Proposal v${p.version} is ready: ${formatMoney(p.sellTotalMinor, p.currency)} in total, valid until ${formatDate(p.validUntil)}. Open it below to review and accept.`,
  });
}

export async function decideProposal(db: DB, actor: Actor, proposalId: string, accept: boolean, note?: string) {
  const [p] = await db.select().from(groupProposals).where(eq(groupProposals.id, proposalId));
  if (!p) throw new NotFoundError('Proposal');
  const e = await load(db, actor, p.enquiryId);
  if (isStaff(actor)) throw new AppError('The agent accepts or declines a proposal');
  if (p.status !== 'sent') throw new AppError('This proposal is no longer open');
  if (p.validUntil < todayIso()) throw new AppError('This proposal has expired — ask the Group Desk to revalidate it');
  await db.update(groupProposals).set({ status: accept ? 'accepted' : 'declined', decidedAt: new Date() }).where(eq(groupProposals.id, p.id));
  await db.update(groupEnquiries).set({ status: accept ? 'won' : 'negotiation', updatedAt: new Date() }).where(eq(groupEnquiries.id, e.id));
  await db.insert(groupMessages).values({
    enquiryId: e.id, authorId: actor.userId, authorLabel: actor.label.split(' (')[0], visibility: 'shared',
    body: accept
      ? `Accepted proposal v${p.version}.${note ? ' ' + note : ''} Next: HotelBridge confirms with the hotels and sends the contract and payment schedule.`
      : `Declined proposal v${p.version}.${note ? ' ' + note : ''}`,
  });
  await audit(db, actor, accept ? 'group.proposal_accepted' : 'group.proposal_declined', 'group_enquiry', e.id, { version: p.version }, e.agencyId);
}

export function suggestedRespondBy(quoteNeededBy: string) {
  const d = addDays(quoteNeededBy, -2);
  return d < todayIso() ? quoteNeededBy : d;
}
