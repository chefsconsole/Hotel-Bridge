/* ------------------------------------------------------------------ *
 * "Paste any group enquiry" — one step for the agent.
 *
 * The agent pastes a WhatsApp message, an email or notes. If the AI reader
 * is on and it finds everything a group request needs (city, dates,
 * travellers, quote deadline), we create the request straight away and the
 * Group Desk starts on it. If anything is missing — or the AI is off — the
 * message is still sent: it becomes a support ticket for the Group Desk and
 * HotelBridge is emailed. Nothing the agent pastes is ever lost, and we never
 * invent a missing date or room count.
 * ------------------------------------------------------------------ */
import { schema, type DB } from '@/lib/db';
import { NOTIFY_EMAIL } from '@/lib/config';
import type { GroupDraftT } from '@/lib/ai/tools';
import { parseMoney } from '@/lib/domain/money';
import type { Actor } from './actor';
import { AppError } from './errors';
import { appUrl, sendEmail } from './email';
import { createEnquiry, enquirySchema, type EnquiryInput } from './groups';

type Agency = { id: string; name: string; billingCurrency: string };
export type PastedResult = { kind: 'enquiry'; id: string } | { kind: 'ticket'; id: string; missing: string[] };

/** Turn an AI draft into a complete enquiry, or null if something required is missing. */
export function draftToEnquiry(d: GroupDraftT, brief: string, agency: Agency): EnquiryInput | null {
  const currency = (d.currency ?? agency.billingCurrency) as EnquiryInput['currency'];
  let budgetMinor: number | null = null;
  if (d.budget) { try { budgetMinor = parseMoney(d.budget, currency); } catch { budgetMinor = null; } }
  const legs = d.legs.filter((l) => l.city && l.checkIn && l.checkOut).map((l) => ({ city: l.city, checkIn: l.checkIn!, checkOut: l.checkOut! }));
  const input: EnquiryInput = {
    groupName: d.groupName || (legs[0] ? `${legs[0].city} group` : ''),
    groupType: d.groupType ?? 'leisure',
    legs, totalPax: d.totalPax ?? 0, rooms: d.rooms,
    category: d.category ?? undefined, mealPlan: d.mealPlan ?? undefined,
    budgetMinor, budgetBasis: budgetMinor ? d.budgetBasis : null, currency,
    coachParking: d.coachParking, accessibility: d.accessibility, specialRequests: d.specialRequests,
    quoteNeededBy: d.quoteNeededBy ?? '', tiers: d.tiers, clientBrief: brief.slice(0, 4000),
  };
  return enquirySchema.safeParse(input).success ? input : null;
}

export async function sendPastedGroupEnquiry(
  db: DB, actor: Actor, agency: Agency, text: string,
  read: ((text: string) => Promise<GroupDraftT>) | null,
): Promise<PastedResult> {
  const brief = text.trim();
  if (brief.length < 20) throw new AppError('Paste the group enquiry — a WhatsApp message, an email or your notes.');
  let missing: string[] = ['AI reader not connected'];
  if (read) {
    try {
      const d = await read(brief);
      const input = draftToEnquiry(d, brief, agency);
      if (input) {
        const e = await createEnquiry(db, actor, input);
        return { kind: 'enquiry', id: e.id };
      }
      missing = d.missing.length ? d.missing : ['some details'];
    } catch (err) {
      if (err instanceof AppError && err.code === 'forbidden') throw err;
      missing = ['could not read it automatically'];
    }
  }
  const [t] = await db.insert(schema.supportTickets).values({
    agencyId: agency.id, userId: actor.userId, bookingId: null,
    subject: 'Group enquiry (pasted)', body: brief.slice(0, 8000), urgency: 'normal',
  }).returning();
  try {
    await sendEmail(db, {
      to: NOTIFY_EMAIL, toName: 'HotelBridge Group Desk', kind: 'group_pasted', relatedId: t.id,
      subject: `Group enquiry from ${agency.name} — needs a look`,
      body: [
        `${agency.name} pasted a group enquiry. Still needed: ${missing.join(', ')}.`,
        '',
        brief.slice(0, 8000),
        '',
        'Open it in Support:',
        appUrl('/admin/support'),
      ].join('\n'),
    });
  } catch { /* the ticket is saved; sendEmail records failures itself */ }
  return { kind: 'ticket', id: t.id, missing };
}
