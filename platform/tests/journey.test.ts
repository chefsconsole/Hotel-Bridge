/* The whole agent journey, checking that every step reaches a person by email.
 * If a change stops a notification, this test fails — no lead goes unseen. */
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import { actorFor, registerAgency } from '@/lib/services/auth';
import { setAgencyStatus, submitPartnerApplication } from '@/lib/services/catalog';
import { createRateRequest, hotelQuote } from '@/lib/services/rate-requests';
import { createEnquiry } from '@/lib/services/groups';
import { supportReplied, supportTicketOpened } from '@/lib/services/notify';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

const HB = 'info@hotelbridge.co';
const PDF = { name: 'pan.pdf', type: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7 x') };

async function mails(to: string) {
  return f.db.select().from(schema.outboundEmails).where(eq(schema.outboundEmails.toEmail, to));
}
const kinds = async (to: string) => (await mails(to)).map((m) => m.kind).sort();

describe('agent journey — every step emails the right person', () => {
  it('register → approve → best rate → group → support, and hotel applications', async () => {
    f = await setup();
    const db = f.db;

    // 1. Registration: the agent is welcomed, HotelBridge is told.
    const { agency, user } = await registerAgency(db, {
      agencyName: 'Journey Travels', country: 'India', city: 'Pune', state: 'Maharashtra', address: '12 FC Road', phone: '+91 90000 00000',
      billingCurrency: 'INR', name: 'Jaya', email: 'jaya@journey.test', password: 'long enough pw', pan: 'AAPFU0939F',
      topDestinations: 'Thailand, Vietnam',
    }, { panCard: PDF });
    expect(await kinds('jaya@journey.test')).toEqual(['agency_welcome']);
    expect(await kinds(HB)).toContain('agency_registered');
    const welcome = (await mails('jaya@journey.test'))[0];
    expect(welcome.body).toContain('/login');

    // 2. Approval: the agent is told; a second "approve" sends nothing new.
    await setAgencyStatus(db, f.ADMIN, agency.id, 'verified', 'PAN checked');
    await setAgencyStatus(db, f.ADMIN, agency.id, 'verified', 'again');
    expect(await kinds('jaya@journey.test')).toEqual(['agency_verified', 'agency_welcome']);

    // 3. Best-rate request: the hotel is asked, HotelBridge is alerted to chase within the hour, the agent hears the quote.
    const actor = actorFor(user);
    const [h] = await db.insert(schema.hotels).values({
      name: 'Journey Resort', slug: 'journey-resort', city: 'Phuket', country: 'Thailand', status: 'active', tier: 'premium',
      bestRateOnRequest: true, rateRequestEmail: 'sales@journeyresort.test',
    }).returning();
    const rr = await createRateRequest(db, actor, { hotelId: h.id, checkIn: addDays(f.today, 30), checkOut: addDays(f.today, 33), rooms: [{ adults: 2, childAges: [] }], mealPlan: 'BB' });
    expect(await kinds('sales@journeyresort.test')).toEqual(['rate_request']);
    expect(await kinds(HB)).toContain('ops_rate_request');
    await hotelQuote(db, rr.token, { decline: false, currency: 'THB', roomType: 'Deluxe', rate: '4200', mealPlan: 'BB', cancellation: 'Free until 7 days before', validUntil: addDays(f.today, 5) });
    expect(await kinds('jaya@journey.test')).toContain('rate_request_agent');

    // 4. Group enquiry: HotelBridge's Group Desk is alerted.
    await createEnquiry(db, actor, {
      groupName: 'Iyer wedding', groupType: 'wedding', legs: [{ city: 'Phuket', checkIn: addDays(f.today, 60), checkOut: addDays(f.today, 63) }],
      totalPax: 40, rooms: { single: 0, double: 18, twin: 0, triple: 2 }, currency: 'INR', coachParking: false, quoteNeededBy: addDays(f.today, 5), tiers: [],
    });
    expect(await kinds(HB)).toContain('ops_group');

    // 5. Support: HotelBridge is told about the ticket, the agent gets the reply.
    const [t] = await db.insert(schema.supportTickets).values({ agencyId: agency.id, userId: user.id, subject: 'Invoice copy', body: 'Please resend the invoice for my last booking.' }).returning();
    await supportTicketOpened(db, t, agency.name, { email: user.email, name: user.name });
    await supportReplied(db, { id: t.id, subject: t.subject, reply: 'Sent again — check your inbox.', userId: user.id });
    expect(await kinds(HB)).toContain('support_ticket');
    expect(await kinds('jaya@journey.test')).toContain('support_reply');

    // 6. A hotel applies on /partners: HotelBridge is told.
    await submitPartnerApplication(db, { kind: 'hotel', organisation: 'Sea Breeze Hotel', contactName: 'Mai', email: 'mai@seabreeze.test', city: 'Da Nang', country: 'Vietnam', rooms: 180 });
    expect(await kinds(HB)).toContain('partner_application');

    // Nothing pretends to be sent without a provider.
    const all = await db.select().from(schema.outboundEmails);
    expect(all.every((m) => m.status === 'not_configured')).toBe(true);
  });

  it('tells the agency when it is declined, without exposing internal notes', async () => {
    f = await setup();
    const { agency } = await registerAgency(f.db, {
      agencyName: 'Decline Co', country: 'India', city: 'Delhi', state: 'Delhi', address: '1 Janpath', phone: '+91 90000 00001',
      billingCurrency: 'INR', name: 'Dev', email: 'dev@decline.test', password: 'long enough pw', pan: 'AAPFU0939F',
    }, { panCard: PDF });
    await setAgencyStatus(f.db, f.ADMIN, agency.id, 'rejected', 'PAN name does not match — suspicious');
    const [m] = await f.db.select().from(schema.outboundEmails).where(and(eq(schema.outboundEmails.toEmail, 'dev@decline.test'), eq(schema.outboundEmails.kind, 'agency_rejected')));
    expect(m.body).not.toContain('suspicious');
  });
});

describe('forgot password', () => {
  it('emails a one-time link to real accounts only, and caps requests', async () => {
    const { sendPasswordLink } = await import('@/lib/services/notify');
    f = await setup();
    await sendPasswordLink(f.db, 'nobody@nowhere.test');
    expect(await f.db.select().from(schema.outboundEmails).where(eq(schema.outboundEmails.toEmail, 'nobody@nowhere.test'))).toHaveLength(0);
    for (let i = 0; i < 5; i++) await sendPasswordLink(f.db, 'a@alpha.test');
    const sent = await f.db.select().from(schema.outboundEmails).where(and(eq(schema.outboundEmails.toEmail, 'a@alpha.test'), eq(schema.outboundEmails.kind, 'password_link')));
    expect(sent).toHaveLength(3);
    expect(sent[0].body).toContain('/set-password/');
  });
});

describe('best-rate safeguards', () => {
  it('tells the agent and HotelBridge when a hotel never replies, and caps unverified agencies', async () => {
    const { createRateRequest: ask, lapseRateRequests } = await import('@/lib/services/rate-requests');
    f = await setup();
    const [h] = await f.db.insert(schema.hotels).values({
      name: 'Quiet Hotel', slug: 'quiet-hotel', city: 'Hanoi', country: 'Vietnam', status: 'active', tier: 'premium',
      bestRateOnRequest: true, rateRequestEmail: 'sales@quiet.test',
    }).returning();
    const body = { hotelId: h.id, checkIn: addDays(f.today, 30), checkOut: addDays(f.today, 32), rooms: [{ adults: 2, childAges: [] }] };
    const rr = await ask(f.db, f.A, body);
    await lapseRateRequests(f.db, new Date(Date.now() + 25 * 3_600_000));
    const agentMail = await f.db.select().from(schema.outboundEmails).where(and(eq(schema.outboundEmails.relatedId, rr.id), eq(schema.outboundEmails.kind, 'rate_request_agent')));
    expect(agentMail[0].subject).toContain('did not reply in time');
    expect((await f.db.select().from(schema.outboundEmails).where(eq(schema.outboundEmails.kind, 'ops_rate_lapsed')))).toHaveLength(1);

    // A pending (unverified) agency gets 3 requests, then must wait for approval.
    const pend = actorFor((await f.db.select().from(schema.users).where(eq(schema.users.agencyId, f.pending.id)))[0]);
    for (let i = 0; i < 3; i++) await ask(f.db, pend, body);
    await expect(ask(f.db, pend, body)).rejects.toThrow(/While we verify your agency/);
  });
});
