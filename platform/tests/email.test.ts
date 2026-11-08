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
