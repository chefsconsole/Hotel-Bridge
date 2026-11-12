/* ------------------------------------------------------------------ *
 * Group Desk automation.
 *
 *  1. An agent submits a group enquiry (city, dates, rooms, meals, tier).
 *  2. dispatchToHotels asks our hotels in that city automatically:
 *     contracted group hotels first (up to 4, in the requested tiers);
 *     if we have none there, up to 15 hotels from our outreach list that
 *     have a contact email. Each hotel gets a private reply link and 48
 *     hours to answer.
 *  3. The hotel answers on that link: an offer (rates per room type) or a
 *     decline. Nothing is typed in by us.
 *  4. Once every city in the trip has an offer, maybeAutoPropose builds a
 *     proposal from the best offer per city with our group markup and sends
 *     it to the agent, valid for 48 hours.
 *  5. Unanswered requests lapse after 48 hours (lapseGroupRequests).
 *
 * Honesty rules: an email counts as sent only if the provider accepted it;
 * the agent is told hotels were asked only when that is true.
 * ------------------------------------------------------------------ */
import { and, asc, desc, eq, ilike, inArray, isNotNull, lt, notInArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { addDays, formatDate, formatDateTime, isIsoDate, todayIso } from '@/lib/domain/dates';
import { CURRENCIES, parseMoney } from '@/lib/domain/money';
import { TIER_INFO, isTier, tierFromLabel, type Tier } from '@/lib/domain/tiers';
import { SYSTEM, type Actor } from './actor';
import { audit } from './audit';
import { randomCode } from './counters';
import { AppError, NotFoundError } from './errors';
import { appUrl, sendEmail } from './email';
import { buildProposal, enquiryEmail, sendProposal } from './groups';
import { getSetting } from './settings';

const { groupEnquiries, groupHotelRequests, groupOffers, groupProposals, groupMessages, hotels, hotelProspects } = schema;

export const HOTEL_REPLY_HOURS = 48;
export const PROPOSAL_HOURS = 48;
const CONTRACTED_MAX = 4;
const OUTREACH_MAX = 15;
const OPEN_REQUEST = ['generated', 'sent'];

type Enquiry = typeof groupEnquiries.$inferSelect;
type Target = { hotelId: string | null; prospectId: string | null; name: string; email: string; city: string; source: 'contracted' | 'outreach' };

const sameCity = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Who we would ask in one city, best first. Pure selection — sends nothing. */
export async function groupTargets(db: DB, e: Enquiry, city: string): Promise<Target[]> {
  const tiers = e.tiers.filter(isTier) as Tier[];
  const contracted = await db.select().from(hotels).where(and(
    eq(hotels.status, 'active'), eq(hotels.acceptsGroups, true), ilike(hotels.city, city.trim()),
    or(isNotNull(hotels.groupsEmail), isNotNull(hotels.reservationsEmail)),
    tiers.length ? inArray(hotels.tier, tiers) : undefined,
  )).orderBy(desc(hotels.totalRooms), asc(hotels.name)).limit(CONTRACTED_MAX);
  if (contracted.length) {
    return contracted.map((h) => ({ hotelId: h.id, prospectId: null, name: h.name, email: (h.groupsEmail ?? h.reservationsEmail)!, city: h.city, source: 'contracted' as const }));
  }
  const like = `%${city.trim()}%`;
  const prospects = await db.select().from(hotelProspects).where(and(
    notInArray(hotelProspects.stage, ['declined', 'not_now']), isNotNull(hotelProspects.contactEmail),
    or(ilike(hotelProspects.destination, like), ilike(hotelProspects.name, like)),
  )).orderBy(asc(hotelProspects.priority), sql`${hotelProspects.totalRooms} desc nulls last`, asc(hotelProspects.name));
  return prospects
    .filter((p) => !tiers.length || tiers.includes(tierFromLabel(p.tier) as Tier))
    .slice(0, OUTREACH_MAX)
    .map((p) => ({ hotelId: null, prospectId: p.id, name: p.name, email: p.contactEmail!, city: city.trim(), source: 'outreach' as const }));
}

function requestEmail(e: Enquiry, leg: { city: string; checkIn: string; checkOut: string }, t: Target, respondByAt: Date, token: string) {
  const base = enquiryEmail(e, leg, t.name, respondByAt.toISOString().slice(0, 10));
  const link = appUrl(`/g/${token}`);
  const tiers = e.tiers.filter(isTier).map((x) => TIER_INFO[x as Tier].label).join(' / ');
  const body = [
    base.body.replace(/\nWe would be grateful for your reply by .*\n/, '\n'),
    '',
    `Please reply within ${HOTEL_REPLY_HOURS} hours — by ${formatDateTime(respondByAt)}.`,
    `Answer in one minute here (rates or "not available"), no login needed:`,
    link,
    tiers ? `\nThe client is looking for: ${tiers}.` : '',
    t.source === 'contracted' ? '\nThis request is under our group rate agreement with your hotel.' : '\nWe would also welcome a conversation about a yearly B2B rate agreement for groups.',
  ].join('\n');
  return { subject: `${base.subject} · reply by ${formatDate(respondByAt)}`, body };
}

export type DispatchResult = { asked: number; emailed: number; notEmailed: number; noHotels: string[]; alreadyAsked: number };

/** Ask hotels for every city in the enquiry. Safe to call again: hotels already asked are skipped. */
export async function dispatchToHotels(db: DB, actor: Actor, enquiryId: string): Promise<DispatchResult> {
  if (!z.string().uuid().safeParse(enquiryId).success) throw new NotFoundError('Enquiry');
  const [e] = await db.select().from(groupEnquiries).where(eq(groupEnquiries.id, enquiryId));
  if (!e) throw new NotFoundError('Enquiry');
  if (['won', 'lost', 'cancelled'].includes(e.status)) throw new AppError('This enquiry is closed');
  const existing = await db.select().from(groupHotelRequests).where(eq(groupHotelRequests.enquiryId, e.id));
  const result: DispatchResult = { asked: 0, emailed: 0, notEmailed: 0, noHotels: [], alreadyAsked: 0 };
  const cities = [...new Map(e.legs.filter((l) => l.city && l.checkIn && l.checkOut).map((l) => [l.city.trim().toLowerCase(), l])).values()];

  for (const leg of cities) {
    const targets = await groupTargets(db, e, leg.city);
    if (!targets.length) { result.noHotels.push(leg.city); continue; }
    for (const t of targets) {
      const asked = existing.some((r) => sameCity(r.city, t.city) && ((t.hotelId && r.hotelId === t.hotelId) || (t.prospectId && r.prospectId === t.prospectId)));
      if (asked) { result.alreadyAsked++; continue; }
      const token = randomCode(24);
      const respondByAt = new Date(Date.now() + HOTEL_REPLY_HOURS * 3_600_000);
      const { subject, body } = requestEmail(e, leg, t, respondByAt, token);
      const [req] = await db.insert(groupHotelRequests).values({
        enquiryId: e.id, hotelId: t.hotelId, prospectId: t.prospectId, hotelName: t.name, hotelEmail: t.email, city: t.city,
        subject, body, respondBy: respondByAt.toISOString().slice(0, 10), respondByAt, token, source: t.source, status: 'generated',
      }).returning();
      const mail = await sendEmail(db, { to: t.email, toName: t.name, subject, body, kind: 'group_request', relatedId: req.id, demo: e.isSample });
      if (mail.status === 'sent') {
        await db.update(groupHotelRequests).set({ status: 'sent', sentAt: new Date() }).where(eq(groupHotelRequests.id, req.id));
        result.emailed++;
      } else result.notEmailed++;
      result.asked++;
    }
  }

  const now = new Date();
  await db.update(groupEnquiries).set({
    dispatchedAt: e.dispatchedAt ?? now, updatedAt: now,
    status: result.emailed > 0 && ['new', 'under_review'].includes(e.status) ? 'sent_to_hotels' : e.status === 'new' && result.asked > 0 ? 'under_review' : e.status,
  }).where(eq(groupEnquiries.id, e.id));

  const internal: string[] = [];
  if (result.asked) internal.push(`Automatic request to ${result.asked} hotel${result.asked === 1 ? '' : 's'} (${result.emailed} emailed${result.notEmailed ? `, ${result.notEmailed} not emailed — email is not connected; send them from this page` : ''}).`);
  if (result.noHotels.length) internal.push(`No contracted group hotels or outreach contacts with an email in ${result.noHotels.join(', ')} — add group contacts in Hotels or Hotel outreach.`);
  if (internal.length) await db.insert(groupMessages).values({ enquiryId: e.id, authorLabel: 'HotelBridge automation', visibility: 'internal', body: internal.join(' ') });
  if (result.emailed > 0 && !e.dispatchedAt) {
    await db.insert(groupMessages).values({
      enquiryId: e.id, authorLabel: 'HotelBridge Group Desk', visibility: 'shared',
      body: 'Our Group Desk is preparing your offer — it will appear here as soon as it is ready, and we’ll email you.',
    });
  }
  await audit(db, actor, 'group.dispatched', 'group_enquiry', e.id, result, e.agencyId);
  return result;
}

/* ----------------------- the hotel's reply link ----------------------- */

export async function requestByToken(db: DB, token: string) {
  if (!/^[A-Z2-9]{24}$/.test(token)) return null;
  const [r] = await db.select().from(groupHotelRequests).where(eq(groupHotelRequests.token, token));
  if (!r) return null;
  const [e] = await db.select().from(groupEnquiries).where(eq(groupEnquiries.id, r.enquiryId));
  // The hotel sees the group, never which agency it is for.
  return { request: r, enquiry: e, open: OPEN_REQUEST.includes(r.status) && !(r.respondByAt && r.respondByAt < new Date()) && !['won', 'lost', 'cancelled'].includes(e.status) };
}

export const hotelOfferSchema = z.object({
  currency: z.enum(CURRENCIES),
  lines: z.array(z.object({ roomType: z.string().trim().min(1).max(60), rooms: z.number().int().positive(), nights: z.number().int().positive(), rate: z.string().trim().min(1) })).min(1, 'Quote at least one room type'),
  mealPlan: z.string().trim().max(10).optional().nullable(),
  taxesNote: z.string().trim().max(300).optional().nullable(),
  cityTax: z.string().trim().max(20).optional().nullable(),
  cancellationTerms: z.string().trim().min(3, 'Add your cancellation terms').max(1000),
  paymentTerms: z.string().trim().max(1000).optional().nullable(),
  validUntil: z.string().refine(isIsoDate, 'Say until when the offer is valid'),
});

export async function hotelAnswer(db: DB, token: string, answer: { decline: true; reason?: string | null } | ({ decline: false } & z.input<typeof hotelOfferSchema>)) {
  const found = await requestByToken(db, token);
  if (!found) throw new NotFoundError('Request');
  const { request: r, enquiry: e } = found;
  if (!OPEN_REQUEST.includes(r.status)) throw new AppError('This request has already been answered. Thank you!');
  if (r.respondByAt && r.respondByAt < new Date()) throw new AppError('The time to answer this request has passed. Contact HotelBridge if you can still help.');
  if (['won', 'lost', 'cancelled'].includes(e.status)) throw new AppError('This group request is closed. Thank you!');
  const now = new Date();

  if (answer.decline) {
    const reason = answer.reason?.trim().slice(0, 500) || null;
    await db.update(groupHotelRequests).set({ status: 'declined', answeredAt: now, declineReason: reason }).where(eq(groupHotelRequests.id, r.id));
    await db.insert(groupMessages).values({ enquiryId: e.id, authorLabel: `${r.hotelName} (via reply link)`, visibility: 'internal', body: `Declined${reason ? `: ${reason}` : ''}.` });
    return { declined: true as const };
  }

  const o = hotelOfferSchema.parse(answer);
  if (o.validUntil < addDays(todayIso(), 2)) throw new AppError(`Keep the offer valid for at least ${PROPOSAL_HOURS} hours (until ${formatDate(addDays(todayIso(), 2))} or later) so the agent can confirm it`);
  const lines = o.lines.map((l, i) => {
    let rateMinor: number;
    try { rateMinor = parseMoney(l.rate, o.currency); } catch { throw new AppError(`Line ${i + 1}: enter the rate as a number, e.g. 4500`); }
    if (rateMinor <= 0) throw new AppError(`Line ${i + 1}: the rate must be more than zero`);
    return { roomType: l.roomType, rooms: l.rooms, nights: l.nights, rateMinor };
  });
  let cityTaxMinor: number | null = null;
  if (o.cityTax) { try { cityTaxMinor = parseMoney(o.cityTax, o.currency); } catch { throw new AppError('City tax must be a number'); } }
  const cost = lines.reduce((s, l) => s + l.rooms * l.nights * l.rateMinor, 0);
  await db.insert(groupOffers).values({
    enquiryId: e.id, requestId: r.id, hotelName: r.hotelName, city: r.city, currency: o.currency, lines, mealPlan: o.mealPlan || null,
    taxesNote: o.taxesNote || null, cityTaxMinor, cancellationTerms: o.cancellationTerms, paymentTerms: o.paymentTerms || null,
    validUntil: o.validUntil, costTotalMinor: cost, createdBy: null,
  });
  await db.update(groupHotelRequests).set({ status: 'responded', answeredAt: now }).where(eq(groupHotelRequests.id, r.id));
  if (['new', 'under_review', 'sent_to_hotels'].includes(e.status)) await db.update(groupEnquiries).set({ status: 'offers_received', updatedAt: now }).where(eq(groupEnquiries.id, e.id));
  await db.insert(groupMessages).values({ enquiryId: e.id, authorLabel: `${r.hotelName} (via reply link)`, visibility: 'internal', body: `Offer received: ${lines.length} room type${lines.length === 1 ? '' : 's'}, valid until ${formatDate(o.validUntil)}.` });
  await audit(db, SYSTEM, 'group.hotel_offer', 'group_enquiry', e.id, { hotel: r.hotelName, cost, currency: o.currency }, e.agencyId);
  const proposal = await maybeAutoPropose(db, e.id);
  return { declined: false as const, proposal };
}

/** Builds and sends the agent's proposal once every city has an offer — best offer per city, our group markup, 48 hours. */
export async function maybeAutoPropose(db: DB, enquiryId: string) {
  if ((await getSetting(db, 'groups.autoProposal')) !== '1') return null;
  const [e] = await db.select().from(groupEnquiries).where(eq(groupEnquiries.id, enquiryId));
  if (!e || ['won', 'lost', 'cancelled'].includes(e.status)) return null;
  const open = await db.select({ id: groupProposals.id }).from(groupProposals)
    .where(and(eq(groupProposals.enquiryId, e.id), inArray(groupProposals.status, ['draft', 'sent', 'accepted'])));
  if (open.length) return null; // a person (or an earlier run) is already on it
  const offers = await db.select().from(groupOffers).where(eq(groupOffers.enquiryId, e.id));
  const cities = [...new Set(e.legs.map((l) => l.city.trim().toLowerCase()).filter(Boolean))];
  const today = todayIso();
  const picked = [];
  for (const c of cities) {
    const usable = offers.filter((o) => o.city.trim().toLowerCase() === c && (!o.validUntil || o.validUntil >= addDays(today, 2)));
    if (!usable.length) return null; // wait for every city
    picked.push(usable.sort((a, b) => a.costTotalMinor - b.costTotalMinor)[0]);
  }
  if (new Set(picked.map((o) => o.currency)).size > 1) return null; // mixed currencies: a person decides
  const markupPct = Number(await getSetting(db, 'groups.markupPct'));
  const markupBps = Number.isFinite(markupPct) ? Math.round(Math.min(Math.max(markupPct, 0), 50) * 100) : 800;
  const expiresAt = new Date(Date.now() + PROPOSAL_HOURS * 3_600_000);
  const { proposal } = await buildProposal(db, SYSTEM, e.id, {
    offerIds: picked.map((o) => o.id), markupBps, validUntil: expiresAt.toISOString().slice(0, 10),
    inclusions: picked.map((o) => `${o.hotelName} (${o.city}) · ${o.mealPlan ?? 'meals as quoted'}`).join('\n'),
  });
  await db.update(groupProposals).set({ expiresAt, automatic: true }).where(eq(groupProposals.id, proposal.id));
  await sendProposal(db, SYSTEM, proposal.id);
  await db.insert(groupMessages).values({ enquiryId: e.id, authorLabel: 'HotelBridge Group Desk', visibility: 'shared', body: `This offer is held for ${PROPOSAL_HOURS} hours — please accept by ${formatDateTime(expiresAt)}.` });
  return proposal.id;
}

/** Requests not answered within 48 hours. Safe to run repeatedly. */
export async function lapseGroupRequests(db: DB, now = new Date()) {
  const due = await db.select({ id: groupHotelRequests.id }).from(groupHotelRequests)
    .where(and(inArray(groupHotelRequests.status, OPEN_REQUEST), lt(groupHotelRequests.respondByAt, now)));
  if (due.length) await db.update(groupHotelRequests).set({ status: 'no_response' }).where(inArray(groupHotelRequests.id, due.map((d) => d.id)));
  return due.length;
}


