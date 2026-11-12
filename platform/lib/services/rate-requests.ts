/* ------------------------------------------------------------------ *
 * Best rate on request — run by the HotelBridge desk.
 *
 * Many hotels won't sign a fixed yearly contract but will beat their public
 * rate for a real enquiry. For those hotels (hotels.bestRateOnRequest):
 *
 *  1. The agent asks for a stay (and may tell us the client's budget, which
 *     is ours: never sent or shown to a hotel). The agent is told only that
 *     the HotelBridge team will send an offer soon — never how we work.
 *  2. The HotelBridge team is emailed at once (the team inbox and the person
 *     assigned). On the request page they tick the suitable hotels — the one
 *     asked for and, if they like, 2–3 similar ones in the city — and email
 *     them all in one click. Each hotel gets a private reply link.
 *  3. Hotel replies wait for the team. The team checks each one, sets the
 *     markup and sends the good ones to the agent, who picks one and accepts.
 *  4. Unanswered hotels lapse (the team is told, not the agent); offers expire
 *     on their valid-until date.
 *
 * Rows: the agent's request is the root; extra hotels the team (or the
 * agent) asks are children (parentId = root). Honesty rule as in the Group
 * Desk: a hotel counts as asked only if the email provider accepted it.
 * ------------------------------------------------------------------ */
import { and, asc, desc, eq, ilike, inArray, isNull, lt, ne, notInArray, or } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { addDays, daysBetween, formatDate, formatDateTime, isIsoDate, todayIso } from '@/lib/domain/dates';
import { CURRENCIES, applyBps, formatMoney, parseMoney, roundUpToWholeUnit, toDecimalString } from '@/lib/domain/money';
import { describeRoom, describeRooms, roomsSchema } from '@/lib/domain/occupancy';
import { TIER_INFO, isTier } from '@/lib/domain/tiers';
import { SYSTEM, agencyOf, isStaff, requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { NOTIFY_EMAIL } from '@/lib/config';
import { nextNumber, randomCode } from './counters';
import { AppError, NotFoundError } from './errors';
import { appUrl, sendEmail } from './email';
import { MEAL_PLANS } from './catalog';
import { searchHotels } from './search';
import { getSetting } from './settings';
import { listStaff } from './staff';

const { rateRequests, hotels, users } = schema;

/** How fast we aim to get agents an offer (hotels are asked for this). */
export const RATE_TARGET_HOURS = 1;
/** How long a request stays open before it lapses. */
export const RATE_REPLY_HOURS = 24;
/** Best-rate requests an agency may send before it is verified. */
export const UNVERIFIED_LIMIT = 3;
/** The hotel can still answer (the team may also type in a reply the hotel gave by phone). */
const HOTEL_OPEN = ['review', 'sent', 'not_emailed'];
/** Still being worked on by HotelBridge — the agent just sees "we're getting your offer". */
export const WORKING = ['review', 'sent', 'not_emailed', 'hotel_quoted'];
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
/** Hotels whose enquiries come to us (we hold the contract and quote from it) — never "email" ourselves. */
export const quotesInHouse = (email: string | null) => !!email && (email.toLowerCase() === NOTIFY_EMAIL.toLowerCase() || /@hotelbridge\.co$/i.test(email));

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

/** The agent asks for a hotel's best rate. Nothing goes to any hotel yet: the HotelBridge team is told and takes it from here. */
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
  const [ag] = await db.select({ status: schema.agencies.status }).from(schema.agencies).where(eq(schema.agencies.id, agencyId));
  if (ag && ag.status !== 'verified') {
    if (ag.status !== 'pending') throw new AppError('Your agency account is not active. Please contact HotelBridge.', 'forbidden');
    const mine = await db.select({ id: rateRequests.id }).from(rateRequests).where(and(eq(rateRequests.agencyId, agencyId), isNull(rateRequests.parentId)));
    if (!opts.parentId && mine.length >= UNVERIFIED_LIMIT) throw new AppError(`While we verify your agency you can send ${UNVERIFIED_LIMIT} best-rate requests. Verification usually takes one working day — we'll email you as soon as you're approved.`, 'not_verified');
  }
  const to = hotelEmailOf(h);

  let budgetMinor: number | null = null;
  if (v.budget) {
    if (!v.budgetCurrency) throw new AppError('Choose the budget currency');
    try { budgetMinor = parseMoney(v.budget, v.budgetCurrency); } catch { throw new AppError('Enter the budget as a number, e.g. 45000'); }
    if (budgetMinor <= 0) throw new AppError('The budget must be more than zero');
  }

  const root = opts.parentId ? (await db.select().from(rateRequests).where(eq(rateRequests.id, opts.parentId)))[0] : undefined;
  const r = await insertRow(db, {
    agencyId, userId: actor.userId, hotel: h, hotelEmail: to, checkIn: v.checkIn, checkOut: v.checkOut, rooms: v.rooms,
    mealPlan: v.mealPlan ?? null, notes: v.notes || null, budgetMinor, budgetCurrency: budgetMinor != null ? v.budgetCurrency! : null,
    parentId: root?.id ?? null, assignedTo: root?.assignedTo ?? (await defaultAssignee(db)),
  });
  await audit(db, actor, 'rate_request.created', 'rate_request', r.id, { hotel: h.name }, agencyId);
  await tellDesk(db, root ?? r, root ? `The agent also wants ${h.name}` : 'New best-rate enquiry', [
    root ? `The agent asked us to also check ${h.name} for ${root.reference}.` : `{agency} asked for the best rate at ${h.name}, ${h.city}.`,
  ]);
  return r;
}

async function insertRow(db: DB, x: {
  agencyId: string; userId: string; hotel: Hotel; hotelEmail: string | null; checkIn: string; checkOut: string; rooms: RateRequest['rooms'];
  mealPlan: string | null; notes: string | null; budgetMinor: number | null; budgetCurrency: string | null; parentId: string | null; assignedTo: string | null;
}) {
  const year = todayIso().slice(0, 4);
  const n = await nextNumber(db, `RR-${year}`);
  const [r] = await db.insert(rateRequests).values({
    reference: `RR-${year}-${String(n).padStart(4, '0')}`, agencyId: x.agencyId, userId: x.userId, hotelId: x.hotel.id, hotelName: x.hotel.name,
    hotelEmail: x.hotelEmail, city: x.hotel.city, checkIn: x.checkIn, checkOut: x.checkOut, rooms: x.rooms, mealPlan: x.mealPlan, notes: x.notes,
    budgetMinor: x.budgetMinor, budgetCurrency: x.budgetCurrency, status: 'review', token: randomCode(24),
    respondByAt: new Date(Date.now() + RATE_REPLY_HOURS * 3_600_000), parentId: x.parentId, assignedTo: x.assignedTo,
  }).returning();
  return r;
}

/** The team member who handles new enquiries by default (Admin → Pricing & settings), if still active staff. */
async function defaultAssignee(db: DB): Promise<string | null> {
  const id = await getSetting(db, 'desk.assignee');
  if (!id) return null;
  const staff = await listStaff(db);
  return staff.find((u) => u.id === id && u.status === 'active')?.id ?? null;
}

/** Email the HotelBridge team inbox and the assigned person about a request. Never throws. */
async function tellDesk(db: DB, root: RateRequest, subject: string, lines: string[]) {
  try {
    const [a] = await db.select({ name: schema.agencies.name, isSample: schema.agencies.isSample }).from(schema.agencies).where(eq(schema.agencies.id, root.agencyId));
    const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, root.userId));
    const assignee = root.assignedTo ? (await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, root.assignedTo)))[0] : undefined;
    const nights = daysBetween(root.checkIn, root.checkOut);
    const body = [
      ...lines.map((l) => l.replace('{agency}', a?.name ?? 'An agency')),
      '',
      `  Hotel:     ${root.hotelName}, ${root.city}`,
      `  Stay:      ${formatDate(root.checkIn)} – ${formatDate(root.checkOut)} (${nights} night${nights === 1 ? '' : 's'})`,
      `  Rooms:     ${describeRooms(root.rooms)}`,
      `  Meals:     ${root.mealPlan ? MEAL_PLANS[root.mealPlan as keyof typeof MEAL_PLANS] ?? root.mealPlan : 'Not specified'}`,
      ...(root.budgetMinor != null && root.budgetCurrency ? [`  Budget:    ${formatMoney(root.budgetMinor, root.budgetCurrency)} (private — never tell the hotel)`] : []),
      ...(root.notes ? [`  Notes:     ${root.notes}`] : []),
      `  Agency:    ${a?.name ?? '—'}${u ? ` · ${u.name} (${u.email})` : ''}`,
      `  Handled by: ${assignee ? assignee.name : 'Not assigned yet'}`,
      '',
      'Open it, tick the suitable hotels and email them in one click:',
      appUrl(`/admin/rate-requests/${root.id}`),
    ].join('\n');
    const tag = a?.isSample ? 'DEMO · ' : '';
    const subj = `${tag}${subject} · ${root.reference} · ${root.hotelName} · ${a?.name ?? ''}`;
    const to = new Set([NOTIFY_EMAIL.toLowerCase()]);
    await sendEmail(db, { to: NOTIFY_EMAIL, toName: 'HotelBridge', kind: 'ops_rate_request', relatedId: root.id, subject: subj, body });
    if (assignee && !to.has(assignee.email.toLowerCase())) await sendEmail(db, { to: assignee.email, toName: assignee.name, kind: 'ops_rate_request', relatedId: root.id, subject: subj, body });
  } catch (e) { console.error('[rate-requests] desk notice failed', e); }
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
  return { request: visible, open: HOTEL_OPEN.includes(r.status) && r.respondByAt > new Date() };
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

async function defaultMarkupBps(db: DB) {
  const pct = Number(await getSetting(db, 'rateRequests.markupPct'));
  return Number.isFinite(pct) ? Math.round(Math.min(Math.max(pct, 0), 50) * 100) : 800;
}
const sellFor = (net: number, markupBps: number, currency: string) => roundUpToWholeUnit(net + applyBps(net, markupBps, 'up'), currency);

/** The hotel answers. Its rate waits for the HotelBridge team — the agent sees nothing until we send it. */
export async function hotelQuote(db: DB, token: string, answer: { decline: true; reason?: string | null } | ({ decline: false } & z.input<typeof hotelQuoteSchema>)) {
  const found = await rateRequestByToken(db, token);
  if (!found) throw new NotFoundError('Request');
  const [r] = await db.select().from(rateRequests).where(eq(rateRequests.token, token));
  if (!HOTEL_OPEN.includes(r.status)) throw new AppError('This request has already been answered or closed. Thank you!');
  if (r.respondByAt < new Date()) throw new AppError('The time to answer has passed. Reply to the email if you can still help.');
  const now = new Date();
  const root = await rootOf(db, r);

  if (answer.decline) {
    const reason = answer.reason?.trim().slice(0, 500) || null;
    await db.update(rateRequests).set({ status: 'declined', answeredAt: now, declineReason: reason, updatedAt: now }).where(eq(rateRequests.id, r.id));
    await audit(db, SYSTEM, 'rate_request.declined', 'rate_request', r.id, { reason }, r.agencyId);
    await tellDesk(db, root, `${r.hotelName} can’t offer`, [`${r.hotelName} answered “not available”${reason ? ` (${reason})` : ''}. Ask another hotel if the agent has no offer yet.`]);
    return { declined: true as const };
  }

  const q = hotelQuoteSchema.parse(answer);
  if (q.validUntil < addDays(todayIso(), 1)) throw new AppError(`Keep the rate valid until at least ${formatDate(addDays(todayIso(), 1))} so the agent can confirm it`);
  let rateMinor: number;
  try { rateMinor = parseMoney(q.rate, q.currency); } catch { throw new AppError('Enter the rate as a number, e.g. 4500'); }
  if (rateMinor <= 0) throw new AppError('The rate must be more than zero');
  const nights = daysBetween(r.checkIn, r.checkOut);
  const net = rateMinor * r.rooms.length * nights;
  const markupBps = await defaultMarkupBps(db);
  const sell = sellFor(net, markupBps, q.currency);

  await db.update(rateRequests).set({
    status: 'hotel_quoted', answeredAt: now, updatedAt: now, quoteCurrency: q.currency, quoteRoomType: q.roomType, quoteRateMinor: rateMinor,
    quoteNetMinor: net, sellMinor: sell, markupBps, quoteMealPlan: q.mealPlan || null, quoteCancellation: q.cancellation,
    quoteNotes: q.notes || null, quoteValidUntil: q.validUntil,
  }).where(eq(rateRequests.id, r.id));
  await audit(db, SYSTEM, 'rate_request.hotel_quoted', 'rate_request', r.id, { net, currency: q.currency }, r.agencyId);
  await tellDesk(db, root, `${r.hotelName} replied — check and send`, [
    `${r.hotelName} quoted ${formatMoney(rateMinor, q.currency)} per room per night (${q.roomType}) — ${formatMoney(net, q.currency)} net for the stay, valid until ${formatDate(q.validUntil)}.`,
    `With ${markupBps / 100}% markup the agent would pay ${formatMoney(sell, q.currency)}. Check it and send it to the agent in one click.`,
  ]);
  return { declined: false as const, sellMinor: sell };
}

async function notifyAgent(db: DB, r: RateRequest, subject: string, lines: string[]) {
  const [u] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, r.userId));
  if (!u) return;
  await sendEmail(db, {
    to: u.email, toName: u.name, kind: 'rate_request_agent', relatedId: r.id, subject: `${subject} · ${r.reference}`,
    body: [`Hi ${u.name},`, '', ...lines, appUrl(`/agent/rate-requests/${r.id}`), '', 'Warm regards,', 'Team HotelBridge'].join('\n'),
  });
}

/* ----------------------------- shared ----------------------------- */

async function rootOf(db: DB, r: RateRequest): Promise<RateRequest> {
  if (!r.parentId) return r;
  const [root] = await db.select().from(rateRequests).where(eq(rateRequests.id, r.parentId));
  return root ?? r;
}

/** The agent's request and every hotel asked for it. */
async function family(db: DB, rootId: string) {
  return db.select().from(rateRequests).where(or(eq(rateRequests.id, rootId), eq(rateRequests.parentId, rootId))).orderBy(asc(rateRequests.createdAt));
}

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

/** What the agent sees for a whole request — never the hotel side of it. */
export type AgentState = 'working' | 'offers' | 'accepted' | 'booked' | 'expired' | 'no_offer' | 'cancelled';
/** Hotels declining or not replying is our problem, not the agent's: the request stays "working"
 *  until we send an offer or the team closes it with a note ('closed'). */
export function agentState(rows: Pick<RateRequest, 'status'>[]): AgentState {
  if (rows.some((x) => x.status === 'booked')) return 'booked';
  if (rows.some((x) => x.status === 'accepted')) return 'accepted';
  if (rows.some((x) => x.status === 'quoted')) return 'offers';
  if (rows.some((x) => x.status === 'closed')) return 'no_offer';
  if (rows.every((x) => x.status === 'cancelled')) return 'cancelled';
  if (rows.some((x) => x.status === 'expired') && !rows.some((x) => WORKING.includes(x.status))) return 'expired';
  return 'working';
}
export const AGENT_STATE: Record<AgentState, { label: string; tone: 'pending' | 'positive' | 'attention' | 'neutral' }> = {
  working: { label: 'Getting your best rate', tone: 'pending' },
  offers: { label: 'Offer ready', tone: 'positive' },
  accepted: { label: 'Accepted — confirming with the hotel', tone: 'positive' },
  booked: { label: 'Booked', tone: 'positive' },
  expired: { label: 'Offer expired', tone: 'neutral' },
  no_offer: { label: 'No offer this time', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

/* ----------------------------- the HotelBridge desk ----------------------------- */

/** Hotels the team can ask for this stay: the one requested first, then similar ones in the city (closest tier first). */
export async function deskCandidates(db: DB, rootId: string) {
  const [root] = await db.select().from(rateRequests).where(eq(rateRequests.id, rootId));
  if (!root) throw new NotFoundError('Request');
  const rows = await family(db, root.id);
  const [self] = await db.select({ tier: hotels.tier }).from(hotels).where(eq(hotels.id, root.hotelId));
  const all = await onRequestHotels(db, root.city);
  all.sort((a, b) => (a.id === root.hotelId ? -1 : b.id === root.hotelId ? 1 : 0)
    || tierDistance(a.tier, self?.tier) - tierDistance(b.tier, self?.tier) || tierIndex(a.tier) - tierIndex(b.tier) || a.name.localeCompare(b.name));
  return all.map((h) => {
    const row = rows.find((x) => x.hotelId === h.id && x.status !== 'cancelled');
    const email = hotelEmailOf(h);
    return { hotel: h, email, inHouse: quotesInHouse(email), requested: h.id === root.hotelId, row: row ?? null, askable: !row || ['review', 'not_emailed'].includes(row.status) };
  });
}

/** One click: email every ticked hotel its private reply link. Extra hotels become part of the same request. */
export async function askHotels(db: DB, actor: Actor, rootId: string, hotelIds: string[]) {
  requireStaff(actor, ['admin', 'ops', 'sales']);
  const ids = [...new Set(hotelIds)].filter((x) => z.string().uuid().safeParse(x).success);
  if (!ids.length) throw new AppError('Tick at least one hotel to ask');
  const root = await load(db, actor, rootId);
  if (root.parentId) throw new AppError('Open the main request to ask hotels');
  if (['accepted', 'booked', 'cancelled', 'no_offer'].includes(agentState(await family(db, root.id)))) throw new AppError('This request is closed — the agent accepted an offer or cancelled');
  const [ag] = await db.select({ isSample: schema.agencies.isSample }).from(schema.agencies).where(eq(schema.agencies.id, root.agencyId));
  const result = { emailed: [] as string[], failed: [] as string[], skipped: [] as string[], inHouse: [] as string[], demo: !!ag?.isSample };
  for (const hotelId of ids) {
    const [h] = await db.select().from(hotels).where(and(eq(hotels.id, hotelId), eq(hotels.status, 'active')));
    if (!h) continue;
    const email = hotelEmailOf(h);
    if (!email) { result.skipped.push(`${h.name} (no email)`); continue; }
    const rows = await family(db, root.id);
    let row = rows.find((x) => x.hotelId === h.id && x.status !== 'cancelled');
    if (row && !['review', 'not_emailed'].includes(row.status)) { result.skipped.push(`${h.name} (already asked)`); continue; }
    if (!row) {
      row = await insertRow(db, {
        agencyId: root.agencyId, userId: root.userId, hotel: h, hotelEmail: email, checkIn: root.checkIn, checkOut: root.checkOut, rooms: root.rooms,
        mealPlan: root.mealPlan, notes: root.notes, budgetMinor: root.budgetMinor, budgetCurrency: root.budgetCurrency, parentId: root.id, assignedTo: root.assignedTo,
      });
    }
    // We hold this hotel's contract: no email — the team enters the rate from the contract with the reply link.
    if (quotesInHouse(email)) { result.inHouse.push(h.name); continue; }
    const respondByAt = new Date(Date.now() + RATE_REPLY_HOURS * 3_600_000);
    const fresh = { ...row, respondByAt, hotelEmail: email };
    const { subject, body } = hotelEmail(fresh, h);
    const mail = await sendEmail(db, { to: email, toName: h.name, subject, body, kind: 'rate_request', relatedId: row.id, demo: ag?.isSample });
    const status = mail.status === 'sent' ? 'sent' : 'not_emailed';
    await db.update(rateRequests).set({ status, respondByAt, hotelEmail: email, updatedAt: new Date() }).where(eq(rateRequests.id, row.id));
    (status === 'sent' ? result.emailed : result.failed).push(h.name);
  }
  if (!root.assignedTo) await db.update(rateRequests).set({ assignedTo: actor.userId }).where(or(eq(rateRequests.id, root.id), eq(rateRequests.parentId, root.id)));
  await audit(db, actor, 'rate_request.hotels_asked', 'rate_request', root.id, result, root.agencyId);
  return result;
}

/** The team checks a hotel's reply and sends it to the agent with our markup. */
export async function releaseOffer(db: DB, actor: Actor, id: string, markupBps: number) {
  requireStaff(actor, ['admin', 'ops', 'sales']);
  const r = await load(db, actor, id);
  if (r.status !== 'hotel_quoted') throw new AppError('Only a hotel reply that hasn’t been sent yet can be sent to the agent');
  const bpsOk = z.number().int().min(0).max(5000).safeParse(markupBps);
  if (!bpsOk.success) throw new AppError('Markup must be between 0 and 50%');
  if (r.quoteValidUntil && r.quoteValidUntil < todayIso()) throw new AppError('This hotel rate has expired — ask the hotel again');
  const sell = sellFor(r.quoteNetMinor!, markupBps, r.quoteCurrency!);
  const now = new Date();
  await db.update(rateRequests).set({ status: 'quoted', markupBps, sellMinor: sell, offeredAt: now, updatedAt: now }).where(eq(rateRequests.id, r.id));
  await audit(db, actor, 'rate_request.offer_sent', 'rate_request', r.id, { net: r.quoteNetMinor, sell, markupBps }, r.agencyId);
  const root = await rootOf(db, r);
  await notifyAgent(db, root, `Your best-rate offer is ready · ${r.hotelName} · ${formatMoney(sell, r.quoteCurrency!)}`, [
    `Good news — here is your offer for ${describeRooms(r.rooms)}, ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)}:`,
    '',
    `  ${r.hotelName} · ${r.quoteRoomType}${r.quoteMealPlan ? ` · ${MEAL_PLANS[r.quoteMealPlan as keyof typeof MEAL_PLANS] ?? r.quoteMealPlan}` : ''}`,
    `  ${formatMoney(sell, r.quoteCurrency!)} for the whole stay · valid until ${formatDate(r.quoteValidUntil!)}`,
    '',
    'Open it to see the terms and accept:',
  ]);
  return { sellMinor: sell };
}

/** The team decides a hotel's reply is not good enough to send. */
export async function holdBackOffer(db: DB, actor: Actor, id: string) {
  requireStaff(actor, ['admin', 'ops', 'sales']);
  const r = await load(db, actor, id);
  if (r.status !== 'hotel_quoted') throw new AppError('Only an unsent hotel reply can be set aside');
  await db.update(rateRequests).set({ status: 'declined', declineReason: 'Set aside by HotelBridge', updatedAt: new Date() }).where(eq(rateRequests.id, r.id));
  await audit(db, actor, 'rate_request.offer_held_back', 'rate_request', r.id, null, r.agencyId);
}

/** No suitable offer: close the request and tell the agent kindly. */
export async function closeWithoutOffer(db: DB, actor: Actor, rootId: string, message: string) {
  requireStaff(actor, ['admin', 'ops', 'sales']);
  const root = await load(db, actor, rootId);
  const note = z.string().trim().min(5, 'Write a short note for the agent').max(600).parse(message);
  const now = new Date();
  if (rowsOpen(await family(db, root.id)).some((x) => x.status === 'quoted')) throw new AppError('An offer is with the agent — let it run, or ask the agent');
  await db.update(rateRequests).set({ status: 'declined', updatedAt: now })
    .where(and(eq(rateRequests.parentId, root.id), inArray(rateRequests.status, [...WORKING])));
  await db.update(rateRequests).set({ status: 'closed', declineReason: note, updatedAt: now }).where(eq(rateRequests.id, root.id));
  await audit(db, actor, 'rate_request.closed_no_offer', 'rate_request', root.id, { note }, root.agencyId);
  await notifyAgent(db, root, `About your best-rate request for ${root.city}`, [note, '', 'Your request:']);
}

const rowsOpen = (rows: RateRequest[]) => rows.filter((x) => ['quoted', ...WORKING].includes(x.status));

/** Hand the request to a team member — they get the details by email. */
export async function assignRateRequest(db: DB, actor: Actor, rootId: string, userId: string | null) {
  requireStaff(actor, ['admin', 'ops', 'sales']);
  const root = await load(db, actor, rootId);
  if (userId) {
    const staff = await listStaff(db);
    if (!staff.some((u) => u.id === userId && u.status === 'active')) throw new AppError('Choose an active team member');
  }
  await db.update(rateRequests).set({ assignedTo: userId, updatedAt: new Date() }).where(or(eq(rateRequests.id, root.id), eq(rateRequests.parentId, root.id)));
  await audit(db, actor, 'rate_request.assigned', 'rate_request', root.id, { userId }, root.agencyId);
  if (userId && userId !== actor.userId) await tellDesk(db, { ...root, assignedTo: userId }, `Assigned to you by ${actor.label.split(' (')[0]}`, ['This best-rate enquiry is now yours.']);
}

/** The desk view: the request, every hotel asked and its reply, and who handles it. */
export async function deskRequest(db: DB, actor: Actor, id: string) {
  requireStaff(actor);
  const r = await load(db, actor, id);
  const root = await rootOf(db, r);
  const rows = await family(db, root.id);
  const [agency] = await db.select().from(schema.agencies).where(eq(schema.agencies.id, root.agencyId));
  const [agent] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, root.userId));
  return { root, rows, agency, agent, state: agentState(rows), candidates: await deskCandidates(db, root.id), staff: (await listStaff(db)).filter((u) => u.status === 'active'), markupPct: (await defaultMarkupBps(db)) / 100 };
}

/* ----------------------------- the agent ----------------------------- */

/** Other hotels in the city when the agent wants more choice. */
export async function alternatives(db: DB, actor: Actor, r: RateRequest) {
  const asked = await family(db, r.id);
  const exclude = [...new Set([r.hotelId, ...asked.filter((a) => a.status !== 'cancelled').map((a) => a.hotelId)])];
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

/** The agent's view of one request: its state and the offers we sent — nothing about hotels being asked. */
export async function getRateRequest(db: DB, actor: Actor, id: string) {
  const r = await load(db, actor, id);
  const root = await rootOf(db, r);
  const rows = await family(db, root.id);
  const state = agentState(rows);
  const offers = rows.filter((x) => ['quoted', 'accepted', 'booked'].includes(x.status))
    .sort((a, b) => (a.status !== 'quoted' ? -1 : 0) - (b.status !== 'quoted' ? -1 : 0) || (a.sellMinor ?? 0) - (b.sellMinor ?? 0));
  const fit = offers.length ? budgetFit(offers[0]) : 'unknown';
  const wantsMore = state === 'no_offer' || state === 'expired' || (state === 'offers' && offers.every((o) => budgetFit(o) === 'over'));
  const alt = wantsMore && !isStaff(actor) ? await alternatives(db, actor, root) : { onRequest: [], priced: [] };
  return { request: root, state, offers, fit, alternatives: alt, stillWorking: rows.some((x) => WORKING.includes(x.status)) };
}

export async function listRateRequests(db: DB, actor: Actor) {
  const rows = await db.select({ r: rateRequests, agencyName: schema.agencies.name, sample: schema.agencies.isSample }).from(rateRequests)
    .innerJoin(schema.agencies, eq(schema.agencies.id, rateRequests.agencyId))
    .where(isStaff(actor) ? undefined : eq(rateRequests.agencyId, agencyOf(actor)))
    .orderBy(desc(rateRequests.createdAt)).limit(400);
  const all = rows.map(({ r }) => r);
  return rows.filter(({ r }) => !r.parentId).map(({ r, agencyName, sample }) => {
    const fam = [r, ...all.filter((x) => x.parentId === r.id)];
    const offers = fam.filter((x) => ['quoted', 'accepted', 'booked'].includes(x.status));
    const best = offers.sort((a, b) => (a.sellMinor ?? 0) - (b.sellMinor ?? 0))[0];
    return {
      ...r, agencyName, sample, fit: best ? budgetFit(best) : 'unknown' as BudgetFit, state: agentState(fam), offers: offers.length, best: best ?? null,
      hotels: fam.length, asked: fam.filter((x) => !['review', 'cancelled'].includes(x.status)).length,
      toReview: fam.filter((x) => x.status === 'hotel_quoted').length,
      needsAsking: fam.some((x) => x.status === 'review' && !quotesInHouse(x.hotelEmail)),
      toQuoteInHouse: fam.some((x) => x.status === 'review' && quotesInHouse(x.hotelEmail)),
      waiting: fam.filter((x) => x.status === 'sent' || x.status === 'not_emailed').length,
    };
  });
}

/** The agent asks HotelBridge to also check another hotel for the same stay (budget kept private). */
export async function askAlternative(db: DB, actor: Actor, id: string, hotelId: string) {
  const r = await load(db, actor, id);
  const root = await rootOf(db, r);
  return createRateRequest(db, actor, {
    hotelId, checkIn: root.checkIn, checkOut: root.checkOut, rooms: root.rooms, mealPlan: (root.mealPlan as 'BB') ?? null, notes: root.notes,
    budget: root.budgetMinor != null && root.budgetCurrency ? toDecimalString(root.budgetMinor, root.budgetCurrency) : null, budgetCurrency: (root.budgetCurrency as 'EUR') ?? null,
  }, { parentId: root.id });
}

/** The agent accepts one offer. Any other offers for the same request are withdrawn. */
export async function acceptRateQuote(db: DB, actor: Actor, id: string) {
  const r = await load(db, actor, id);
  if (r.status !== 'quoted') throw new AppError('Only an offer we sent you can be accepted');
  if (r.quoteValidUntil && r.quoteValidUntil < todayIso()) throw new AppError('This offer has expired — ask us to refresh it');
  const root = await rootOf(db, r);
  const now = new Date();
  await db.update(rateRequests).set({ status: 'accepted', acceptedAt: now, updatedAt: now }).where(eq(rateRequests.id, r.id));
  await db.update(rateRequests).set({ status: 'cancelled', updatedAt: now })
    .where(and(or(eq(rateRequests.id, root.id), eq(rateRequests.parentId, root.id)), ne(rateRequests.id, r.id), inArray(rateRequests.status, ['quoted', ...WORKING])));
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
  await tellDesk(db, root, `Agent accepted ${r.hotelName} — confirm the booking`, [
    `The agent accepted ${r.hotelName} at ${formatMoney(r.sellMinor!, r.quoteCurrency!)} (net ${formatMoney(r.quoteNetMinor!, r.quoteCurrency!)}). The hotel has been told to hold the rooms — confirm the booking with them.`,
  ]);
}

/** The team has confirmed the accepted offer with the hotel: the request is done, and the agent is told. */
export async function markBooked(db: DB, actor: Actor, id: string, confirmation?: string | null) {
  requireStaff(actor, ['admin', 'ops', 'sales']);
  const r = await load(db, actor, id);
  if (r.status !== 'accepted') throw new AppError('Only an accepted offer can be marked as booked');
  const conf = confirmation?.trim().slice(0, 80) || null;
  const now = new Date();
  await db.update(rateRequests).set({ status: 'booked', updatedAt: now, quoteNotes: conf ? [r.quoteNotes, `Hotel confirmation: ${conf}`].filter(Boolean).join(' · ') : r.quoteNotes })
    .where(eq(rateRequests.id, r.id));
  await audit(db, actor, 'rate_request.booked', 'rate_request', r.id, { confirmation: conf }, r.agencyId);
  const root = await rootOf(db, r);
  await notifyAgent(db, root, `Booked · ${r.hotelName} · ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)}`, [
    `Your stay at ${r.hotelName} is confirmed: ${describeRooms(r.rooms)}, ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)}, ${formatMoney(r.sellMinor!, r.quoteCurrency!)}.`,
    ...(conf ? [`Hotel confirmation number: ${conf}`] : []),
    '',
    'Details:',
  ]);
}

/** What the desk must do next on each open request — for the admin overview. */
export async function deskTodo(db: DB) {
  const rows = await listRateRequests(db, SYSTEM);
  const out: { severity: 'urgent' | 'attention'; title: string; detail: string; href: string; demo: boolean }[] = [];
  const ageMin = (d: Date) => (Date.now() - d.getTime()) / 60_000;
  for (const r of rows) {
    const href = `/admin/rate-requests/${r.id}`;
    const who = `${r.agencyName} · ${r.city} · ${formatDate(r.checkIn)}`;
    const demo = r.sample;
    if (r.state === 'accepted') out.push({ severity: 'urgent', title: `${r.reference}: agent accepted ${r.best?.hotelName ?? 'an offer'} — confirm with the hotel`, detail: who, href, demo });
    else if (r.toReview) out.push({ severity: 'urgent', title: `${r.reference}: ${r.toReview} hotel repl${r.toReview === 1 ? 'y' : 'ies'} to check & send`, detail: who, href, demo });
    else if (r.toQuoteInHouse) out.push({ severity: ageMin(r.createdAt) > 30 ? 'urgent' : 'attention', title: `${r.reference}: enter our contract rate for ${r.hotelName}`, detail: who, href, demo });
    else if (r.needsAsking) out.push({ severity: ageMin(r.createdAt) > 30 ? 'urgent' : 'attention', title: `${r.reference}: new best-rate enquiry — ask hotels`, detail: `${r.hotelName} · ${who}`, href, demo });
    else if (r.state === 'working' && r.waiting === 0) out.push({ severity: 'attention', title: `${r.reference}: no hotel replies left — ask more or close`, detail: who, href, demo });
  }
  return out;
}

/** The agent cancels the whole request. */
export async function cancelRateRequest(db: DB, actor: Actor, id: string) {
  const r = await load(db, actor, id);
  const root = await rootOf(db, r);
  const rows = await family(db, root.id);
  if (!rows.some((x) => ['quoted', ...WORKING].includes(x.status))) throw new AppError('This request is already closed');
  await db.update(rateRequests).set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(or(eq(rateRequests.id, root.id), eq(rateRequests.parentId, root.id)), inArray(rateRequests.status, ['quoted', ...WORKING])));
  await audit(db, actor, 'rate_request.cancelled', 'rate_request', root.id, null, root.agencyId);
}

/** Hotels that never answered lapse (the team is told, the agent never sees it); offers past their date expire. Safe to run repeatedly. */
export async function lapseRateRequests(db: DB, now = new Date()) {
  const late = await db.update(rateRequests).set({ status: 'no_response', updatedAt: now })
    .where(and(inArray(rateRequests.status, ['sent', 'not_emailed']), lt(rateRequests.respondByAt, now))).returning();
  for (const r of late) {
    const root = await rootOf(db, r);
    await tellDesk(db, root, `No reply from ${r.hotelName}`, [
      `${r.hotelName} (${r.hotelEmail ?? 'no email'}) never answered. Call the hotel, or ask another one — the agent is still waiting for an offer.`,
    ]);
  }
  const stale = await db.update(rateRequests).set({ status: 'expired', updatedAt: now })
    .where(and(eq(rateRequests.status, 'quoted'), lt(rateRequests.quoteValidUntil, todayIso(now)))).returning();
  return late.length + stale.length;
}

/** Staff labels for one hotel row. */
export const RATE_STATUS: Record<string, { label: string; tone: 'pending' | 'positive' | 'attention' | 'neutral' }> = {
  review: { label: 'To ask', tone: 'attention' },
  sent: { label: 'Hotel asked', tone: 'pending' },
  not_emailed: { label: 'Email failed — call the hotel', tone: 'attention' },
  hotel_quoted: { label: 'Hotel replied — check & send', tone: 'attention' },
  quoted: { label: 'Sent to agent', tone: 'positive' },
  booked: { label: 'Booked with the hotel', tone: 'positive' },
  closed: { label: 'Closed — agent told', tone: 'neutral' },
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
