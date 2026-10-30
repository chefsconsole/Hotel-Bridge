/* ------------------------------------------------------------------ *
 * The AI toolbox. Each tool is grounded in HotelBridge's own records and
 * is told plainly not to invent facts. Outputs are drafts for a person to
 * review — none of these functions save anything.
 * ------------------------------------------------------------------ */
import { and, eq } from 'drizzle-orm';
import { z } from 'zod/v4';
import { schema, type DB } from '@/lib/db';
import { describePolicy, type CancelPolicy } from '@/lib/domain/cancellation';
import { daysBetween, isIsoDate, todayIso } from '@/lib/domain/dates';
import { describeRoom } from '@/lib/domain/occupancy';
import { STATUS_LABEL } from '@/lib/domain/booking-state';
import { getBookingForActor } from '@/lib/services/bookings';
import { destinations } from '@/lib/services/search';
import { AppError, NotFoundError } from '@/lib/services/errors';
import { requireStaff, type Actor } from '@/lib/services/actor';
import { extract, write } from './client';

const GROUND = 'Use only the facts provided. Never invent hotels, prices, amenities, availability, policies or dates. If something needed is missing, say so plainly.';

/* --------------------------- 1. Smart search --------------------------- */

const SearchIntent = z.object({
  city: z.string().nullable().describe('One of the listed destinations, or null if none matches'),
  requestedPlace: z.string().nullable().describe('The place the person asked for, in their words'),
  checkIn: z.string().nullable().describe('YYYY-MM-DD'),
  checkOut: z.string().nullable().describe('YYYY-MM-DD'),
  rooms: z.array(z.object({ adults: z.number().int(), childAges: z.array(z.number().int()) })),
  missing: z.array(z.string()).describe('What the person still needs to tell us, e.g. "dates"'),
});

export async function smartSearch(db: DB, actor: Actor, text: string) {
  const q = text.trim();
  if (q.length < 5) throw new AppError('Describe the stay, e.g. "2 rooms in Phuket 12–16 Dec, 2 adults each"');
  const dests = await destinations(db);
  const today = todayIso();
  const r = await extract(db, actor, 'smart_search', {
    format: SearchIntent,
    system: `You turn a travel agent's request into a hotel search. Today is ${today}. Destinations we currently sell: ${dests.map((d) => `${d.city} (${d.country})`).join(', ') || 'none'}.
Rules: map the request to one listed destination only if it clearly refers to it (a neighbourhood or beach inside that city counts); otherwise city = null. Interpret relative dates from today; a stay with only a number of nights needs a start date to be complete. Default to 2 adults per room only when the person gives a total number of travellers without a room split, and say so in "missing". Children must have ages; if ages are not given, add "children's ages" to missing and leave childAges empty. Never exceed 4 adults or 3 children per room.`,
    user: q.slice(0, 2000),
  });
  const city = r.city ? dests.find((d) => d.city.toLowerCase() === r.city!.toLowerCase())?.city ?? null : null;
  const rooms = r.rooms.filter((x) => x.adults >= 1 && x.adults <= 4).map((x) => ({ adults: x.adults, childAges: x.childAges.filter((a) => a >= 0 && a <= 17).slice(0, 3) }));
  const datesOk = !!(r.checkIn && r.checkOut && isIsoDate(r.checkIn) && isIsoDate(r.checkOut) && r.checkIn >= today && daysBetween(r.checkIn, r.checkOut) >= 1);
  return { city, requestedPlace: r.requestedPlace, checkIn: datesOk ? r.checkIn : null, checkOut: datesOk ? r.checkOut : null, rooms: rooms.length ? rooms.slice(0, 9) : [{ adults: 2, childAges: [] }], missing: r.missing };
}

/* ------------------------- 2. Client message ------------------------- */

export async function clientMessage(db: DB, actor: Actor, input: { bookingId: string; channel: 'whatsapp' | 'email'; language: string; clientPrice?: string; note?: string }) {
  const b = await getBookingForActor(db, actor, input.bookingId);
  const [hotel] = await db.select().from(schema.hotels).where(eq(schema.hotels.id, b.hotelId));
  if (!hotel) throw new NotFoundError('Hotel');
  const facts = {
    bookingStatus: STATUS_LABEL[b.status] ?? b.status,
    isConfirmed: ['confirmed', 'amendment_requested', 'cancellation_requested'].includes(b.status),
    hotel: { name: hotel.name, city: hotel.city, country: hotel.country, address: hotel.address, checkIn: hotel.checkInTime, checkOut: hotel.checkOutTime, facilities: hotel.facilities, gettingThere: hotel.transport },
    stay: { arrival: b.checkIn, departure: b.checkOut, nights: daysBetween(b.checkIn, b.checkOut) },
    leadGuest: b.leadGuest,
    rooms: b.rooms.map((r) => ({ room: r.roomName, board: r.mealPlan, occupancy: describeRoom(r) })),
    cancellation: describePolicy(b.cancelPolicy as CancelPolicy, b.checkIn),
    cityTaxPayableAtHotel: b.localTaxMinor > 0,
    priceForClient: input.clientPrice?.trim() || null,
    agentNote: input.note?.trim() || null,
  };
  return write(db, actor, 'client_message', {
    effort: 'low',
    system: `You write messages from a travel agent to their own client about a hotel booking. ${GROUND}
- Never mention HotelBridge, net rates, commissions or supplier references.
- If isConfirmed is false, say clearly that the booking is not yet confirmed and what the status means; never imply it is confirmed.
- Mention a price only if priceForClient is given, exactly as written.
- ${input.channel === 'whatsapp' ? 'WhatsApp style: short lines, warm, a few tasteful emoji at most, no markdown headings.' : 'Email style: a subject line first ("Subject: ..."), then a polished, warm body.'}
- Write in ${input.language || 'English'}.`,
    user: `Booking facts (JSON):\n${JSON.stringify(facts, null, 2)}`,
  });
}

/* ---------------------- 3. Group brief -> enquiry ---------------------- */

const GroupDraft = z.object({
  groupName: z.string().nullable(),
  groupType: z.enum(['leisure', 'corporate', 'mice', 'wedding', 'education', 'sports', 'other']).nullable(),
  legs: z.array(z.object({ city: z.string(), checkIn: z.string().nullable(), checkOut: z.string().nullable() })),
  totalPax: z.number().int().nullable(),
  rooms: z.object({ single: z.number().int(), double: z.number().int(), twin: z.number().int(), triple: z.number().int() }),
  category: z.enum(['3', '4', '5', 'any']).nullable(),
  mealPlan: z.enum(['RO', 'BB', 'HB', 'FB']).nullable(),
  budget: z.string().nullable().describe('Amount only, as written, e.g. "120"'),
  budgetBasis: z.enum(['per_room_night', 'per_person_total', 'total']).nullable(),
  currency: z.enum(['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED', 'THB', 'SGD']).nullable(),
  coachParking: z.boolean(),
  accessibility: z.string().nullable(),
  specialRequests: z.string().nullable(),
  quoteNeededBy: z.string().nullable(),
  missing: z.array(z.string()),
});
export type GroupDraftT = z.infer<typeof GroupDraft>;

export async function groupFromBrief(db: DB, actor: Actor, text: string) {
  if (text.trim().length < 20) throw new AppError('Paste the client’s brief — an email, WhatsApp message or notes.');
  return extract(db, actor, 'group_brief', {
    format: GroupDraft,
    system: `You read a client's group travel brief and fill a hotel group-enquiry form. Today is ${todayIso()}. ${GROUND}
Leave a field null (or 0 for room counts) when the brief does not say it, and list it in "missing". Dates as YYYY-MM-DD. Do not guess a room split from the number of travellers; if only travellers are given, set rooms to 0 and add "room split" to missing.`,
    user: text.slice(0, 8000),
  });
}

/* ------------------------ 4. Rate sheet reader ------------------------ */

const RateLines = z.object({
  lines: z.array(z.object({
    roomType: z.string().describe('Exactly one of the provided room type names'),
    mealPlan: z.enum(['RO', 'BB', 'HB', 'FB']),
    from: z.string(), to: z.string().describe('Last night the rate applies, YYYY-MM-DD'),
    single: z.string().nullable(), double: z.string().nullable(), triple: z.string().nullable(), child: z.string().nullable(),
    minStay: z.number().int(), release: z.number().int(),
  })),
  unmatched: z.array(z.string()).describe('Rates or rooms in the text that could not be mapped, quoted briefly'),
  warnings: z.array(z.string()),
});

export async function readRateSheet(db: DB, actor: Actor, contractId: string, text: string) {
  requireStaff(actor, ['admin', 'ops']);
  if (text.trim().length < 20) throw new AppError('Paste the hotel’s rate email or sheet text.');
  const [c] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId));
  if (!c) throw new NotFoundError('Contract');
  const rts = await db.select().from(schema.roomTypes).where(and(eq(schema.roomTypes.hotelId, c.hotelId), eq(schema.roomTypes.active, true)));
  if (!rts.length) throw new AppError('Add room types to this hotel first, so rates can be mapped to them.');
  const r = await extract(db, actor, 'rate_sheet', {
    format: RateLines, maxTokens: 16000,
    system: `You convert a hotel's rate offer into structured rate lines. ${GROUND}
Room types available (use these exact names, never others): ${rts.map((x) => `"${x.name}" (max ${x.maxAdults} adults)`).join(', ')}.
Contract currency: ${c.currency}; validity ${c.validFrom} to ${c.validTo}. Prices are per room per night as plain decimals without currency symbols. single/double/triple = price for 1/2/3 adults; null if not offered. If the text gives a single "room price" for a double room, put it in double. Do not convert currencies — if the text is in another currency, put it in warnings and skip the line. minStay defaults to 1 and release to 0 when not stated.`,
    user: text.slice(0, 20000),
  });
  const names = new Set(rts.map((x) => x.name));
  const ok = r.lines.filter((l) => names.has(l.roomType));
  const dropped = r.lines.length - ok.length;
  const csv = ['room_type,meal_plan,from,to,single,double,triple,child,min_stay,release',
    ...ok.map((l) => [l.roomType, l.mealPlan, l.from, l.to, l.single ?? '', l.double ?? '', l.triple ?? '', l.child ?? '', l.minStay, l.release].join(','))].join('\n');
  return { csv, lines: ok.length, unmatched: [...r.unmatched, ...(dropped ? [`${dropped} line(s) used a room name that isn't set up`] : [])], warnings: r.warnings };
}

/* ------------------------- 5. Founder brief ------------------------- */

export async function founderBrief(db: DB, actor: Actor, metrics: unknown, issues: unknown) {
  requireStaff(actor);
  return write(db, actor, 'founder_brief', {
    effort: 'medium',
    system: `You are the chief of staff of HotelBridge, a B2B hotel distribution company. Write a short weekly brief for the founder from the data provided. ${GROUND}
Structure: "What happened" (3–5 bullets with the actual numbers), "Needs attention" (from the issues list, most urgent first), "Suggested focus" (2–3 concrete actions that follow from the data). Gross booking value is not revenue — never call it revenue. Money is per currency; never add currencies together. If there is little or no activity, say so honestly instead of padding. Plain text with "- " bullets, no markdown headers beyond the three section names.`,
    user: `Metrics (JSON):\n${JSON.stringify(metrics)}\n\nOpen issues (JSON):\n${JSON.stringify(issues)}`,
  });
}

/* ---------------------------- 6. Help ---------------------------- */

const HELP = `HotelBridge help — how the platform works
- Search: choose destination, dates, and each room's occupancy (adults, children with ages). Prices are the total for the stay, all rooms. VAT is included where shown; city tax is paid at the hotel.
- Instant confirmation: we hold allotment with the hotel; the booking is confirmed straight away (or held until payment for prepay accounts). "On request": the hotel must confirm; it is not a reservation until then and no voucher is issued.
- Price re-check: before booking, the price is checked again with the hotel. If it changed, you see the new price and decide; nothing is booked silently.
- Payment: new agencies prepay. Rooms are held until the payment deadline shown on the booking; if unpaid, the hold is released with no charge. Credit terms are available after review by HotelBridge finance.
- Vouchers: available only for confirmed bookings, from the booking page.
- Cancellation: each rate shows a free-cancellation date. On the booking page, the charge (if any) is shown before you confirm. Free cancellations are processed immediately; others are confirmed by operations.
- Amendments: request from a confirmed booking; the original booking stands until HotelBridge confirms the change.
- Group Desk: for larger groups, multi-city tours or special needs. Submit a request; we reply within 24 hours, approach hotels and send a written proposal you can accept online.
- Invoices & payments: all charges, payments and credit notes are under Invoices & payments.
- Team: agency owners can add colleagues under Agency profile.
- Support: use the Support page; mark urgent if a guest is affected within 48 hours.`;

export async function helpAnswer(db: DB, actor: Actor, question: string) {
  const q = question.trim();
  if (q.length < 4) throw new AppError('Ask a question, e.g. "How do I cancel a booking?"');
  return write(db, actor, 'help', {
    effort: 'low', maxTokens: 1500,
    system: `You answer questions from travel agents about using HotelBridge. Answer only from the help text below, briefly and kindly. If the answer is not in it — or the question is about a specific booking, price or availability — say you can't answer that here and suggest the Support page. Never invent policies.\n\n${HELP}`,
    user: q.slice(0, 1000),
  });
}

