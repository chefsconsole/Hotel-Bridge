/* ------------------------------------------------------------------ *
 * Group Desk board. One card per enquiry, grouped by stage, each with
 * the single next thing the team has to do — worked out from the real
 * hotel requests, offers and proposals, never guessed.
 * Staff only: cards show hotel progress that agents never see.
 * ------------------------------------------------------------------ */
import { and, desc, gte, inArray, or, sql } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { formatDate, formatDateTime, todayIso } from '@/lib/domain/dates';
import { requireStaff, type Actor } from './actor';
import type { GroupStage } from './groups';

const { groupEnquiries, groupHotelRequests, groupOffers, groupProposals, agencies } = schema;

/** Stages a card can be dragged between. Won / lost / cancelled are set on the enquiry page, with a note. */
export const BOARD_STAGES = ['new', 'under_review', 'sent_to_hotels', 'offers_received', 'proposal_prepared', 'sent_to_agent', 'negotiation'] as const satisfies readonly GroupStage[];
export const CLOSED_STAGES = ['won', 'lost', 'cancelled'] as const;
/** Closed enquiries stay on the board this long. */
export const CLOSED_VISIBLE_DAYS = 30;

export type Tone = 'urgent' | 'action' | 'waiting' | 'done';
export type NextAction = { label: string; tone: Tone };

export type CardFacts = {
  status: string;
  respondBy: Date;
  quoteNeededBy: string;
  requests: { generated: number; sent: number; responded: number; declined: number; noResponse: number; dueAt: Date | null };
  offers: number;
  proposal: { status: string } | null;
};

/** The one next step for an enquiry, and how urgent it is. Pure — tested directly. */
export function nextAction(c: CardFacts, now = new Date(), today = todayIso()): NextAction {
  const r = c.requests;
  const asked = r.generated + r.sent + r.responded + r.declined + r.noResponse;
  const waiting = r.sent;
  if (c.status === 'won') return { label: 'Won — confirm the bookings with the hotel', tone: 'done' };
  if (c.status === 'lost' || c.status === 'cancelled') return { label: c.status === 'lost' ? 'Lost' : 'Cancelled', tone: 'done' };

  const quoteLate = c.quoteNeededBy < today;
  const quoteToday = c.quoteNeededBy === today;
  const quoteFlag = quoteLate ? ' · quote overdue' : quoteToday ? ' · quote due today' : '';
  const pressing = quoteLate || quoteToday;

  if (c.status === 'sent_to_agent') return { label: `Waiting for the agent's answer${quoteFlag}`, tone: 'waiting' };
  if (c.status === 'negotiation') return { label: 'Agent replied — answer and revise the proposal', tone: 'action' };
  if (c.proposal?.status === 'draft') return { label: 'Send the draft proposal to the agent', tone: pressing ? 'urgent' : 'action' };
  if (c.offers > 0 && waiting === 0) return { label: `Build a proposal from ${c.offers} offer${c.offers > 1 ? 's' : ''}${quoteFlag}`, tone: pressing ? 'urgent' : 'action' };
  if (r.generated > 0) return { label: `Send ${r.generated} hotel email${r.generated > 1 ? 's' : ''}${quoteFlag}`, tone: 'urgent' };
  if (waiting > 0) {
    const late = r.dueAt && r.dueAt < now;
    const got = c.offers ? `${c.offers} offer${c.offers > 1 ? 's' : ''} in · ` : '';
    return { label: `${got}${waiting} hotel${waiting > 1 ? 's' : ''} yet to reply${r.dueAt ? `${late ? ' — overdue since' : ' · due'} ${formatDateTime(r.dueAt)}` : ''}`, tone: late || pressing ? 'urgent' : 'waiting' };
  }
  if (asked > 0 && c.offers === 0) return { label: 'No hotel offered — ask more hotels', tone: 'urgent' };
  const firstReplyLate = c.respondBy < now;
  return { label: `Ask hotels for rates${firstReplyLate ? ' — first reply to the agent is overdue' : ` · reply to agent by ${formatDateTime(c.respondBy)}`}`, tone: firstReplyLate || pressing ? 'urgent' : 'action' };
}

export type BoardCard = {
  id: string; reference: string; groupName: string; agencyName: string; status: string; isSample: boolean;
  cities: string; arrival: string; pax: number; rooms: number; quoteNeededBy: string; quoteDue: string;
  offers: number; asked: number; next: NextAction; updatedAt: string;
};

export async function groupBoard(db: DB, actor: Actor): Promise<BoardCard[]> {
  requireStaff(actor);
  const since = new Date(Date.now() - CLOSED_VISIBLE_DAYS * 86_400_000);
  const rows = await db.select({ e: groupEnquiries, agencyName: agencies.name }).from(groupEnquiries)
    .innerJoin(agencies, sql`${agencies.id} = ${groupEnquiries.agencyId}`)
    .where(or(inArray(groupEnquiries.status, [...BOARD_STAGES]), and(inArray(groupEnquiries.status, [...CLOSED_STAGES]), gte(groupEnquiries.updatedAt, since))))
    .orderBy(desc(groupEnquiries.updatedAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.e.id);

  // Three grouped queries for the whole board, not three per card.
  const [reqs, offers, proposals] = await Promise.all([
    db.select({ id: groupHotelRequests.enquiryId, status: groupHotelRequests.status, n: sql<number>`count(*)::int`, due: sql<Date | null>`max(${groupHotelRequests.respondByAt})` })
      .from(groupHotelRequests).where(inArray(groupHotelRequests.enquiryId, ids)).groupBy(groupHotelRequests.enquiryId, groupHotelRequests.status),
    db.select({ id: groupOffers.enquiryId, n: sql<number>`count(*)::int` }).from(groupOffers).where(inArray(groupOffers.enquiryId, ids)).groupBy(groupOffers.enquiryId),
    db.select({ id: groupProposals.enquiryId, status: groupProposals.status, version: groupProposals.version }).from(groupProposals).where(inArray(groupProposals.enquiryId, ids)).orderBy(desc(groupProposals.version)),
  ]);

  const now = new Date();
  const today = todayIso();
  return rows.map(({ e, agencyName }) => {
    const mine = reqs.filter((r) => r.id === e.id);
    const count = (s: string) => mine.find((r) => r.status === s)?.n ?? 0;
    const sentDue = mine.find((r) => r.status === 'sent')?.due;
    const requests = {
      generated: count('generated'), sent: count('sent'), responded: count('responded'), declined: count('declined'), noResponse: count('no_response'),
      dueAt: sentDue ? new Date(sentDue) : null,
    };
    const nOffers = offers.find((o) => o.id === e.id)?.n ?? 0;
    const proposal = proposals.find((p) => p.id === e.id) ?? null;
    const r = e.rooms;
    return {
      id: e.id, reference: e.reference, groupName: e.groupName, agencyName, status: e.status, isSample: e.isSample,
      cities: e.legs.map((l) => l.city).join(' → '), arrival: formatDate(e.legs[0].checkIn), pax: e.totalPax,
      rooms: r.single + r.double + r.twin + r.triple, quoteNeededBy: e.quoteNeededBy, quoteDue: formatDate(e.quoteNeededBy),
      offers: nOffers, asked: mine.reduce((s, x) => s + x.n, 0),
      next: nextAction({ status: e.status, respondBy: e.respondBy, quoteNeededBy: e.quoteNeededBy, requests, offers: nOffers, proposal }, now, today),
      updatedAt: e.updatedAt.toISOString(),
    };
  });
}
