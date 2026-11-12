/* ------------------------------------------------------------------ *
 * Best rate on request.
 *
 * Many hotels won't sign a fixed yearly contract but will beat their public
 * rate for a real enquiry. For those hotels (hotels.bestRateOnRequest):
 *
 *  1. The agent picks the hotel, dates and rooms, and may tell us the
 *     client's budget. The budget is ours: it is never sent or shown to
 *     the hotel.
 *  2. The hotel is emailed a private link and asked to answer within
 *     1 hour (the request stays open for 24 hours):
 *     a rate per room per night, or "not available".
 *  3. The agent sees the price with our markup and can accept it. If the
 *     quote is above the budget, or the hotel can't help, we show other
 *     hotels in the same city that fit — and the agent can ask them in one
 *     click.
 *  4. Unanswered requests lapse; quotes expire on their valid-until date.
 *
 * Honesty rules as in the Group Desk: a request counts as sent only if the
 * email provider accepted it.
 * ------------------------------------------------------------------ */
import { and, asc, desc, eq, ilike, inArray, lt, ne, notInArray } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { addDays, daysBetween, formatDate, formatDateTime, isIsoDate, todayIso } from '@/lib/domain/dates';
import { CURRENCIES, applyBps, formatMoney, parseMoney, roundUpToWholeUnit, toDecimalString } from '@/lib/domain/money';
import { describeRoom, describeRooms, roomsSchema } from '@/lib/domain/occupancy';
import { TIER_INFO, isTier } from '@/lib/domain/tiers';
import { SYSTEM, agencyOf, isStaff, type Actor } from './actor';
import { audit } from './audit';
import { rateRequestOpened } from './notify';
import { NOTIFY_EMAIL } from '@/lib/config';
import { nextNumber, randomCode } from './counters';
import { AppError, NotFoundError } from './errors';
import { appUrl, sendEmail } from './email';
import { MEAL_PLANS } from './catalog';
import { searchHotels } from './search';
import { getSetting } from './settings';

const { rateRequests, hotels, users } = schema;

/** How fast we aim to get agents an offer (hotels are asked for this). */
export const RATE_TARGET_HOURS = 1;
/** How long a request stays open before it lapses. */
export const RATE_REPLY_HOURS = 24;
/** Best-rate requests an agency may send before it is verified. */
export const UNVERIFIED_LIMIT = 3;
const OPEN = ['sent', 'not_emailed'];
const MAX_NIGHTS = 30;

type RateRequest = typeof rateRequests.$inferSelect;
type Hotel = typeof hotels.$inferSelect;

export const rateRequestSchema = z.object({
  hotelId: z.string().uuid(),
  checkIn: z.string().refine(isIsoDate, 'Choose the arrival date'),
  checkOut: z.string().refine(isIsoDate, 'Choose the departure date'),
  rooms: roomsSchema,
  mealPlan: z.enum(Object.keys(MEAL_PLANS) as [keyof typeof MEAL_PLANS, ...(keyof typeof MEAL_PLANS)[]]).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  // Private: for us and the agent only.
  budget: z.string().trim().max(20).optional().nullable(),
  budgetCurrency: z.enum(CURRENCIES).optional().nullable(),
});

const hotelEmailOf = (h: Hotel) => h.rateRequestEmail ?? h.reservationsEmail ?? h.contactEmail ?? null;

/** Hotels in a city that quote on request, for search and alternatives. */
export async function onRequestHotels(db: DB, city: string, opts: { tiers?: string[]; exclude?: string[] } = {}) {
  const rows = await db.select().from(hotels).where(and(
    eq(hotels.status, 'active'), eq(hotels.bestRateOnRequest, true), ilike(hotels.city, city.trim()),
    opts.exclude?.length ? notInArray(hotels.id, opts.exclude) : undefined,
    opts.tiers?.length ? inArray(hotels.tier, opts.tiers) : undefined,
  )).orderBy(asc(hotels.name));
  return rows.filter((h) => hotelEmailOf(h));
}

function hotelEmail(r: RateRequest, h: Hotel) {
  const nights = daysBetween(r.checkIn, r.checkOut);
  const link = appUrl(`/r/${r.token}`);
  const subject = `Best rate request · ${h.name} · ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)} · ${r.rooms.length} room${r.rooms.length === 1 ? '' : 's'} · reply within ${RATE_TARGET_HOURS}h`;
  const body = [
    `Dear ${h.name} team,`,
    '',
    `HotelBridge has a confirmed client enquiry for your hotel and would like your best B2B rate:`,
    '',
    `  Arrival:    ${formatDate(r.checkIn, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`,
    `  Departure:  ${formatDate(r.checkOut, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} (${nights} night${nights === 1 ? '' : 's'})`,
    ...r.rooms.map((room, i) => `  Room ${i + 1}:     ${describeRoom(room)}`),
    `  Meals:      ${r.mealPlan ? MEAL_PLANS[r.mealPlan as keyof typeof MEAL_PLANS] : 'Best option — room only or with breakfast'}`,
    ...(r.notes ? [`  Notes:      ${r.notes}`] : []),
    '',
    `The travel agent is waiting: please reply within ${RATE_TARGET_HOURS} hour if you can (the request closes ${formatDateTime(r.respondByAt)}) with your best rate — one click, no login:`,
    link,
    '',
    'The best rate wins the booking. Booking, payment and guest arrangements stay directly between your hotel and the travel agency.',
    '',
    `Reference: ${r.reference}`,
  ].join('\n');
  return { subject, body };
}

/** The agent asks a hotel for its best rate. */
export async function createRateRequest(db: DB, actor: Actor, input: z.input<typeof rateRequestSchema>, opts: { parentId?: string } = {}) {
  const agencyId = agencyOf(actor);
  const v = rateRequestSchema.parse(input);
  const today = todayIso();
  if (v.checkIn < today) throw new AppError('Arrival can’t be in the past');
  const nights = daysBetween(v.checkIn, v.checkOut);
  if (nights < 1) throw new AppError('Departure must be after arrival');
  if (nights > MAX_NIGHTS) throw new AppError(`At most ${MAX_NIGHTS} nights per request`);
  const [h] = await db.select().from(hotels).where(and(eq(hotels.id, v.hotelId), eq(hotels.status, 'active')));
  if (!h) throw new NotFoundError('Hotel');
  if (!h.bestRateOnRequest) throw new AppError('This hotel is booked at contracted rates — search your dates to see them');
  // Protect partner hotels from unverified sign-ups: a few requests while we verify, then wait for approval.
  const [ag] = await db.select({ status: schema.agencies.status, isSample: schema.agencies.isSample }).from(schema.agencies).where(eq(schema.agencies.id, agencyId));
  if (ag && ag.status !== 'verified') {
    if (ag.status !== 'pending') throw new AppError('Your agency account is not active. Please contact HotelBridge.', 'forbidden');
    const open = await db.select({ id: rateRequests.id }).from(rateRequests).where(eq(rateRequests.agencyId, agencyId));
    if (open.length >= UNVERIFIED_LIMIT) throw new AppError(`While we verify your agency you can send ${UNVERIFIED_LIMIT} best-rate requests. Verification usually takes one working day — we'll email you as soon as you're approved.`, 'not_verified');
  }
  const to = hotelEmailOf(h);
  if (!to) throw new AppError('We have no email for this hotel yet — ask HotelBridge support');

  let budgetMinor: number | null = null;
  if (v.budget) {
    if (!v.budgetCurrency) throw new AppError('Choose the budget currency');
    try { budgetMinor = parseMoney(v.budget, v.budgetCurrency); } catch { throw new AppError('Enter the budget as a number, e.g. 45000'); }
    if (budgetMinor <= 0) throw new AppError('The budget must be more than zero');
  }

  const year = today.slice(0, 4);
  const n = await nextNumber(db, `RR-${year}`);
  const respondByAt = new Date(Date.now() + RATE_REPLY_HOURS * 3_600_000);
  const [r] = await db.insert(rateRequests).values({
    reference: `RR-${year}-${String(n).padStart(4, '0')}`, agencyId, userId: actor.userId, hotelId: h.id, hotelName: h.name, hotelEmail: to, city: h.city,
    checkIn: v.checkIn, checkOut: v.checkOut, rooms: v.rooms, mealPlan: v.mealPlan ?? null, notes: v.notes || null,
    budgetMinor, budgetCurrency: budgetMinor != null ? v.budgetCurrency! : null,
    status: 'not_emailed', token: randomCode(24), respondByAt, parentId: opts.parentId ?? null,
  }).returning();

  const { subject, body } = hotelEmail(r, h);
  const mail = await sendEmail(db, { to, toName: h.name, subject, body, kind: 'rate_request', relatedId: r.id, demo: ag?.isSample });
  const status = mail.status === 'sent' ? 'sent' : 'not_emailed';
  if (status !== r.status) await db.update(rateRequests).set({ status }).where(eq(rateRequests.id, r.id));
  await audit(db, actor, 'rate_request.created', 'rate_request', r.id, { hotel: h.name, emailed: status === 'sent' }, agencyId);
  await rateRequestOpened(db, { ...r, status });
  return { ...r, status };
}

/* ----------------------- the hotel's private link ----------------------- */

/** What the hotel sees: the stay — never the agency, never the budget. */
export async function rateRequestByToken(db: DB, token: string) {
  if (!/^[A-Z2-9]{24}$/.test(token)) return null;
  const [r] = await db.select().from(rateRequests).where(eq(rateRequests.token, token));
  if (!r) return null;
  // An allowlist, so a new column never leaks to the hotel by accident.
  const visible = {
    reference: r.reference, hotelName: r.hotelName, checkIn: r.checkIn, checkOut: r.checkOut, rooms: r.rooms,
    mealPlan: r.mealPlan, notes: r.notes, status: r.status, respondByAt: r.respondByAt, answeredAt: r.answeredAt,
  };
  return { request: visible, open: OPEN.includes(r.status) && r.respondByAt > new Date() };
}

export const hotelQuoteSchema = z.object({
  currency: z.enum(CURRENCIES),
  roomType: z.string().trim().min(1, 'Name the room type').max(80),
  rate: z.string().trim().min(1, 'Enter your rate'),
  mealPlan: z.string().trim().max(10).optional().nullable(),
  cancellation: z.string().trim().min(3, 'Add your cancellation terms').max(800),
  notes: z.string().trim().max(800).optional().nullable(),
  validUntil: z.string().refine(isIsoDate, 'Say until when the rate is valid'),
});

export async function hotelQuote(db: DB, token: string, answer: { decline: true; reason?: string | null } | ({ decline: false } & z.input<typeof hotelQuoteSchema>)) {
  const found = await rateRequestByToken(db, token);
  if (!found) throw new NotFoundError('Request');
  const [r] = await db.select().from(rateRequests).where(eq(rateRequests.token, token));
  if (!OPEN.includes(r.status)) throw new AppError('This request has already been answered or closed. Thank you!');
  if (r.respondByAt < new Date()) throw new AppError('The time to answer has passed. Reply to the email if you can still help.');
  const now = new Date();

  if (answer.decline) {
    const reason = answer.reason?.trim().slice(0, 500) || null;
    await db.update(rateRequests).set({ status: 'declined', answeredAt: now, declineReason: reason, updatedAt: now }).where(eq(rateRequests.id, r.id));
    await notifyAgent(db, r, `${r.hotelName} can’t offer this stay`, [
      `${r.hotelName} is not available for ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)}${reason ? ` (${reason})` : ''}.`,
      'Open the request to ask similar hotels in one click:',
    ]);
    await audit(db, SYSTEM, 'rate_request.declined', 'rate_request', r.id, { reason }, r.agencyId);
    return { declined: true as const };
  }

  const q = hotelQuoteSchema.parse(answer);
  if (q.validUntil < addDays(todayIso(), 1)) throw new AppError(`Keep the rate valid until at least ${formatDate(addDays(todayIso(), 1))} so the agent can confirm it`);
  let rateMinor: number;
  try { rateMinor = parseMoney(q.rate, q.currency); } catch { throw new AppError('Enter the rate as a number, e.g. 4500'); }
  if (rateMinor <= 0) throw new AppError('The rate must be more than zero');
  const nights = daysBetween(r.checkIn, r.checkOut);
  const net = rateMinor * r.rooms.length * nights;
  const pct = Number(await getSetting(db, 'rateRequests.markupPct'));
  const markupBps = Number.isFinite(pct) ? Math.round(Math.min(Math.max(pct, 0), 50) * 100) : 800;
  const sell = roundUpToWholeUnit(net + applyBps(net, markupBps, 'up'), q.currency);

  await db.update(rateRequests).set({
    status: 'quoted', answeredAt: now, updatedAt: now, quoteCurrency: q.currency, quoteRoomType: q.roomType, quoteRateMinor: rateMinor,
    quoteNetMinor: net, sellMinor: sell, markupBps, quoteMealPlan: q.mealPlan || null, quoteCancellation: q.cancellation,
    quoteNotes: q.notes || null, quoteValidUntil: q.validUntil,
  }).where(eq(rateRequests.id, r.id));
  await notifyAgent(db, r, `Best rate ready · ${r.hotelName} · ${formatMoney(sell, q.currency)}`, [
    `${r.hotelName} has quoted ${formatMoney(sell, q.currency)} for ${describeRooms(r.rooms)}, ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)} (${q.roomType}).`,
    `Valid until ${formatDate(q.validUntil)}. Open the request to accept it:`,
  ]);
  await audit(db, SYSTEM, 'rate_request.quoted', 'rate_request', r.id, { net, sell, currency: q.currency }, r.agencyId);
  return { declined: false as const, sellMinor: sell };
}

async function notifyAgent(db: DB, r: RateRequest, subject: string, lines: string[]) {
  const [u] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, r.userId));
  if (!u) return;
  await sendEmail(db, {
    to: u.email, toName: u.name, kind: 'rate_request_agent', relatedId: r.id, subject: `${subject} · ${r.reference}`,
    body: [`Hi ${u.name},`, '', ...lines, appUrl(`/agent/rate-requests/${r.id}`), '', 'HotelBridge'].join('\n'),
  });
}

/* ----------------------------- the agent ----------------------------- */

async function load(db: DB, actor: Actor, id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Request');
  const [r] = await db.select().from(rateRequests).where(and(
    eq(rateRequests.id, id), isStaff(actor) ? undefined : eq(rateRequests.agencyId, agencyOf(actor)),
  ));
  if (!r) throw new NotFoundError('Request');
  return r;
}

export type BudgetFit = 'within' | 'over' | 'unknown';
export function budgetFit(r: Pick<RateRequest, 'budgetMinor' | 'budgetCurrency' | 'sellMinor' | 'quoteCurrency'>): BudgetFit {
  if (r.budgetMinor == null || r.sellMinor == null || r.budgetCurrency !== r.quoteCurrency) return 'unknown';
  return r.sellMinor <= r.budgetMinor ? 'within' : 'over';
}

/** Other hotels in the city when this one is too expensive or can't help. */
export async function alternatives(db: DB, actor: Actor, r: RateRequest) {
  const asked = await db.select({ hotelId: rateRequests.hotelId }).from(rateRequests)
    .where(and(eq(rateRequests.agencyId, r.agencyId), eq(rateRequests.checkIn, r.checkIn), eq(rateRequests.checkOut, r.checkOut), ne(rateRequests.status, 'cancelled')));
  const exclude = [...new Set([r.hotelId, ...asked.map((a) => a.hotelId)])];
  const [self] = await db.select({ tier: hotels.tier }).from(hotels).where(eq(hotels.id, r.hotelId));
  // Closest tier first; on a tie the lower (usually cheaper) tier, since we are often here because of the budget.
  const onRequest = (await onRequestHotels(db, r.city, { exclude }))
    .sort((a, b) => tierDistance(a.tier, self?.tier) - tierDistance(b.tier, self?.tier) || tierIndex(a.tier) - tierIndex(b.tier))
    .slice(0, 4);
  // Contracted hotels we can price now: within the budget when we know it.
  let priced: { hotel: Hotel; fromMinor: number; currency: string }[] = [];
  if (!isStaff(actor)) {
    try {
      const { results } = await searchHotels(db, actor, { city: r.city, checkIn: r.checkIn, checkOut: r.checkOut, rooms: r.rooms }, { log: false });
      priced = results.filter((x) => x.hotel.id !== r.hotelId)
        .filter((x) => r.budgetMinor == null || (x.currency === r.budgetCurrency && x.fromMinor <= r.budgetMinor))
        .sort((a, b) => a.fromMinor - b.fromMinor).slice(0, 3)
        .map((x) => ({ hotel: x.hotel, fromMinor: x.fromMinor, currency: x.currency }));
    } catch { /* search problems never block the request page */ }
  }
  return { onRequest, priced };
}

const TIER_ORDER = ['smart', 'premium', 'luxury', 'ultra'];
const tierIndex = (t: string | null) => (isTier(t) ? TIER_ORDER.indexOf(t) : 9);
function tierDistance(a: string | null, b: string | null | undefined) {
  if (!isTier(a) || !isTier(b)) return 9;
  return Math.abs(TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));
}

export async function getRateRequest(db: DB, actor: Actor, id: string) {
  const r = await load(db, actor, id);
  const fit = budgetFit(r);
  const needsAlternatives = ['declined', 'no_response', 'expired'].includes(r.status) || (r.status === 'quoted' && fit === 'over');
  const alt = needsAlternatives ? await alternatives(db, actor, r) : { onRequest: [], priced: [] };
  const children = await db.select().from(rateRequests).where(eq(rateRequests.parentId, r.id)).orderBy(asc(rateRequests.createdAt));
  return { request: r, fit, alternatives: alt, children };
}

export async function listRateRequests(db: DB, actor: Actor) {
  const rows = await db.select({ r: rateRequests, agencyName: schema.agencies.name }).from(rateRequests)
    .innerJoin(schema.agencies, eq(schema.agencies.id, rateRequests.agencyId))
    .where(isStaff(actor) ? undefined : eq(rateRequests.agencyId, agencyOf(actor)))
    .orderBy(desc(rateRequests.createdAt)).limit(200);
  return rows.map(({ r, agencyName }) => ({ ...r, agencyName, fit: budgetFit(r) }));
}

/** Ask another hotel for the same stay, keeping the private budget. */
export async function askAlternative(db: DB, actor: Actor, id: string, hotelId: string) {
  const r = await load(db, actor, id);
  return createRateRequest(db, actor, {
    hotelId, checkIn: r.checkIn, checkOut: r.checkOut, rooms: r.rooms, mealPlan: (r.mealPlan as 'BB') ?? null, notes: r.notes,
    budget: r.budgetMinor != null && r.budgetCurrency ? toDecimalString(r.budgetMinor, r.budgetCurrency) : null, budgetCurrency: (r.budgetCurrency as 'EUR') ?? null,
  }, { parentId: r.parentId ?? r.id });
}

export async function acceptRateQuote(db: DB, actor: Actor, id: string) {
  const r = await load(db, actor, id);
  if (r.status !== 'quoted') throw new AppError('Only a quoted rate can be accepted');
  if (r.quoteValidUntil && r.quoteValidUntil < todayIso()) throw new AppError('This rate has expired — ask the hotel again');
  const now = new Date();
  await db.update(rateRequests).set({ status: 'accepted', acceptedAt: now, updatedAt: now }).where(eq(rateRequests.id, r.id));
  if (r.hotelEmail) {
    const [ag] = await db.select({ isSample: schema.agencies.isSample }).from(schema.agencies).where(eq(schema.agencies.id, r.agencyId));
    await sendEmail(db, {
      to: r.hotelEmail, toName: r.hotelName, kind: 'rate_request_accepted', relatedId: r.id, demo: ag?.isSample,
      subject: `Accepted · ${r.reference} · ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)}`,
      body: [
        `Dear ${r.hotelName} team,`, '',
        `Thank you — HotelBridge accepts your rate of ${formatMoney(r.quoteRateMinor!, r.quoteCurrency!)} per room per night (${r.quoteRoomType}) for ${describeRooms(r.rooms)}, ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)}.`,
        'Please hold the rooms. Our reservations team will send the guest names and confirm payment shortly.', '',
        `Reference: ${r.reference}`, '', 'HotelBridge',
      ].join('\n'),
    });
  }
  await audit(db, actor, 'rate_request.accepted', 'rate_request', r.id, { sell: r.sellMinor, currency: r.quoteCurrency }, r.agencyId);
}

export async function cancelRateRequest(db: DB, actor: Actor, id: string) {
  const r = await load(db, actor, id);
  if (!['sent', 'not_emailed', 'quoted'].includes(r.status)) throw new AppError('This request is already closed');
  await db.update(rateRequests).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(rateRequests.id, r.id));
  await audit(db, actor, 'rate_request.cancelled', 'rate_request', r.id, null, r.agencyId);
}

/** Unanswered requests lapse; quotes past their valid-until date expire. Safe to run repeatedly. */
export async function lapseRateRequests(db: DB, now = new Date()) {
  const late = await db.update(rateRequests).set({ status: 'no_response', updatedAt: now })
    .where(and(inArray(rateRequests.status, OPEN), lt(rateRequests.respondByAt, now))).returning();
  // Nobody is left waiting: the agent is told and offered other hotels; HotelBridge is told.
  for (const r of late) {
    try {
      await notifyAgent(db, r, `${r.hotelName} did not reply in time`, [
        `${r.hotelName} didn't send a rate for ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)} in time. Sorry about that.`,
        '',
        'Open the request to ask another hotel in the same city in one click — or reply to this email and our team will find one for you:',
      ]);
      await sendEmail(db, {
        to: NOTIFY_EMAIL, toName: 'HotelBridge', kind: 'ops_rate_lapsed', relatedId: r.id,
        subject: `No hotel reply · ${r.reference} · ${r.hotelName}`,
        body: `${r.hotelName} (${r.hotelEmail ?? 'no email'}) never answered ${r.reference} (${formatDate(r.checkIn)} → ${formatDate(r.checkOut)}). The agent has been told. Consider calling the hotel or offering another one.

${appUrl('/admin/rate-requests')}`,
      });
    } catch (e) { console.error('[rate-requests] lapse notice failed', e); }
  }
  const stale = await db.update(rateRequests).set({ status: 'expired', updatedAt: now })
    .where(and(eq(rateRequests.status, 'quoted'), lt(rateRequests.quoteValidUntil, todayIso(now)))).returning();
  return late.length + stale.length;
}

export const RATE_STATUS: Record<string, { label: string; tone: 'pending' | 'positive' | 'attention' | 'neutral' }> = {
  sent: { label: 'Asked hotel', tone: 'pending' },
  not_emailed: { label: 'Not emailed yet', tone: 'attention' },
  quoted: { label: 'Rate ready', tone: 'positive' },
  accepted: { label: 'Accepted', tone: 'positive' },
  declined: { label: 'Not available', tone: 'neutral' },
  no_response: { label: 'No reply in time', tone: 'neutral' },
  expired: { label: 'Rate expired', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const tierLabel = (t: string | null) => (isTier(t) ? `${TIER_INFO[t].label} · ${TIER_INFO[t].stars}` : null);

/** The currency a hotel most likely quotes in — the budget default, so the two compare. */
export function localCurrency(country: string): string {
  const c = country.trim().toLowerCase();
  const map: Record<string, string> = { thailand: 'THB', 'united arab emirates': 'AED', uae: 'AED', singapore: 'SGD', india: 'INR', vietnam: 'VND', indonesia: 'IDR', 'hong kong': 'HKD', 'czech republic': 'CZK', czechia: 'CZK', malaysia: 'MYR', 'sri lanka': 'LKR', maldives: 'USD', japan: 'JPY', switzerland: 'CHF', 'united kingdom': 'GBP', uk: 'GBP', 'united states': 'USD', usa: 'USD' };
  return map[c] ?? 'EUR';
}
