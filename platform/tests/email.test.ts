import { describe, expect, it } from 'vitest';
import { toHtml } from '@/lib/services/email';

describe('email HTML version', () => {
  it('is branded and Verdana, keeps paragraphs and line breaks, links URLs and escapes markup', () => {
    const html = toHtml('Dear Team,\n\nArrival: 10 Dec\nRooms: 2 <double>\n\nReply here: https://portal.hotelbridge.co/r/ABC');
    expect(html).toContain('hotelbridge-mark-inverse.png');
    expect(html).toContain('Hotels direct. No middleman.');
    expect(html).toContain('font-family:Verdana,Geneva,sans-serif');
    expect(html).toContain('Arrival: 10 Dec<br>Rooms: 2 &lt;double&gt;');
    expect(html).toContain('<a href="https://portal.hotelbridge.co/r/ABC"');
  });

  it('turns a portal link on its own line into a labelled button', () => {
    const html = toHtml('Use this link:\nhttps://portal.hotelbridge.co/set-password/abc');
    expect(html).toContain('Set your password');
    expect(html).toContain('href="https://portal.hotelbridge.co/set-password/abc"');
  });
});

describe('demo accounts', () => {
  it('records the email but never sends it, even with a provider configured', async () => {
    const { sendEmail } = await import('@/lib/services/email');
    const rows: Record<string, unknown>[] = [];
    const db = { insert: () => ({ values: (v: Record<string, unknown>) => ({ returning: async () => { rows.push(v); return [{ id: 'x' }]; } }) }) };
    const env = { ...process.env };
    Object.assign(process.env, { RESEND_API_KEY: 'test', EMAIL_FROM: 'a@b.test', EMAIL_ALLOW_NONPROD: '1' });
    const fetchSpy = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => { called = true; throw new Error('must not send'); }) as typeof fetch;
    try {
      const r = await sendEmail(db as never, { to: 'hotel@example.test', subject: 's', body: 'b', kind: 'rate_request', demo: true });
      expect(r.status).toBe('not_configured');
      expect(called).toBe(false);
      expect(rows[0]).toMatchObject({ status: 'not_configured', error: 'Demo account — recorded, not sent' });
    } finally { globalThis.fetch = fetchSpy; process.env = env; }
  });
});
