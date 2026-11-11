/* The agent's Today page: ranked inbox from real records, agency isolation,
 * pulse numbers from real requests, and a greeting in the agent's own time. */
import { afterEach, describe, expect, it } from 'vitest';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import { agentActivity, agentInbox, agentPulse, ago, greetingFor, median, rankInbox, type InboxItem } from '@/lib/services/agent-today';
import { createRateRequest, hotelQuote } from '@/lib/services/rate-requests';
import { setup, type Fixture } from './helpers';

let f: Fixture | undefined;
afterEach(async () => { await f?.close(); f = undefined; });

const item = (key: string, urgency: InboxItem['urgency'], at: number): InboxItem => ({ key, urgency, at, kind: 'offer', title: key, detail: '', href: '#', cta: '' });

describe('ranking and helpers', () => {
  it('puts act-now first, then this week, then waiting — soonest deadline first within each', () => {
    const ranked = rankInbox([item('wait', 'waiting', 1), item('soon-late', 'soon', 50), item('now-late', 'now', 90), item('soon-early', 'soon', 10), item('now-early', 'now', 5)]);
    expect(ranked.map((i) => i.key)).toEqual(['now-early', 'now-late', 'soon-early', 'soon-late', 'wait']);
  });

  it('greets in Indian time, not server time', () => {
    // 12:30 UTC is 18:00 in India.
    const t = new Date('2026-11-11T12:30:00Z');
    expect(greetingFor('India', t)).toBe('evening');
    expect(greetingFor('Germany', t)).toBe('afternoon');
    expect(greetingFor('India', new Date('2026-11-11T02:00:00Z'))).toBe('morning');
  });

  it('computes medians and relative times', () => {
    expect(median([])).toBeNull();
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
    const now = new Date('2026-11-11T12:00:00Z');
    expect(ago(new Date('2026-11-11T11:59:40Z'), now)).toBe('just now');
    expect(ago(new Date('2026-11-11T11:48:00Z'), now)).toBe('12 min ago');
    expect(ago(new Date('2026-11-11T09:00:00Z'), now)).toBe('3 h ago');
  });
});

describe('agent inbox, pulse and activity', () => {
  it('shows the hotel offer as act-now work, keeps open requests as waiting, and never shows another agency’s records', async () => {
    const fx = await setup();
    f = fx;
    const [h] = await fx.db.insert(schema.hotels).values({
      name: 'Today Resort', slug: 'today-resort', city: 'Phuket', country: 'Thailand', status: 'active', tier: 'premium',
      bestRateOnRequest: true, rateRequestEmail: 'sales@today.test',
    }).returning();
    const body = { hotelId: h.id, checkIn: addDays(fx.today, 20), checkOut: addDays(fx.today, 23), rooms: [{ adults: 2, childAges: [] }] };
    const quoted = await createRateRequest(fx.db, fx.A, body);
    await createRateRequest(fx.db, fx.A, body);
    await hotelQuote(fx.db, quoted.token, { decline: false, currency: 'THB', roomType: 'Deluxe', rate: '4000', mealPlan: 'BB', cancellation: 'Free until 7 days', validUntil: addDays(fx.today, 1) });

    const inbox = await agentInbox(fx.db, fx.A);
    expect(inbox[0]).toMatchObject({ kind: 'offer', urgency: 'now', href: `/agent/rate-requests/${quoted.id}` });
    expect(inbox[0].title).toContain('Today Resort');
    expect(inbox.filter((i) => i.kind === 'asked')).toHaveLength(1);
    expect(inbox.at(-1)?.urgency).toBe('waiting');

    // Agency B sees none of A's work.
    expect(await agentInbox(fx.db, fx.B)).toEqual([]);
    expect(await agentActivity(fx.db, fx.B)).toEqual([]);

    const pulse = await agentPulse(fx.db, fx.A);
    expect(pulse).toMatchObject({ requests: 2, offers: 1 });
    expect(pulse.medianReplyMinutes).toBeGreaterThanOrEqual(1);
    expect(pulse.weekly).toHaveLength(8);
    expect(pulse.weekly.at(-1)?.n).toBe(2);

    const activity = await agentActivity(fx.db, fx.A);
    expect(activity.some((a) => a.text.includes('sent its best rate') && a.tone === 'positive')).toBe(true);
  });

  it('is for agents only', async () => {
    const fx = await setup();
    f = fx;
    await expect(agentInbox(fx.db, fx.ADMIN)).rejects.toThrow();
  });
});
