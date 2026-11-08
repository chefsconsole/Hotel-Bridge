import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import type { GroupDraftT } from '@/lib/ai/tools';
import { sendPastedGroupEnquiry } from '@/lib/services/quick-group';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

const TEXT = 'Hi, 40 pax wedding group to Phuket 12-15 Feb, 18 doubles 2 triples, breakfast, 5 star please, need quote by Friday';

function draft(over: Partial<GroupDraftT> = {}): GroupDraftT {
  return {
    groupName: 'Mehta wedding', groupType: 'wedding',
    legs: [{ city: 'Phuket', checkIn: addDays(f.today, 90), checkOut: addDays(f.today, 93) }],
    totalPax: 40, rooms: { single: 0, double: 18, twin: 0, triple: 2 },
    category: '5', mealPlan: 'BB', budget: null, budgetBasis: null, currency: null,
    coachParking: false, accessibility: null, specialRequests: null,
    quoteNeededBy: addDays(f.today, 3), tiers: [], missing: [], ...over,
  };
}

describe('paste any group enquiry', () => {
  it('creates the group request when the AI finds everything', async () => {
    f = await setup();
    const r = await sendPastedGroupEnquiry(f.db, f.A, f.agencyA, TEXT, async () => draft());
    expect(r.kind).toBe('enquiry');
    const [e] = await f.db.select().from(schema.groupEnquiries).where(eq(schema.groupEnquiries.id, r.id));
    expect(e.totalPax).toBe(40);
  });

  it('still sends the message to the Group Desk when something is missing — and never invents it', async () => {
    f = await setup();
    const r = await sendPastedGroupEnquiry(f.db, f.A, f.agencyA, TEXT, async () => draft({ quoteNeededBy: null, missing: ['quote deadline'] }));
    expect(r).toMatchObject({ kind: 'ticket', missing: ['quote deadline'] });
    const [t] = await f.db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, r.id));
    expect(t.body).toBe(TEXT);
    const mail = (await f.db.select().from(schema.outboundEmails).where(eq(schema.outboundEmails.relatedId, r.id)))[0];
    expect(mail.kind).toBe('group_pasted');
    expect(mail.body).toContain('quote deadline');
  });

  it('works without the AI reader, and refuses an empty paste', async () => {
    f = await setup();
    expect((await sendPastedGroupEnquiry(f.db, f.A, f.agencyA, TEXT, null)).kind).toBe('ticket');
    await expect(sendPastedGroupEnquiry(f.db, f.A, f.agencyA, 'hi', null)).rejects.toThrow(/Paste the group enquiry/);
  });
});
