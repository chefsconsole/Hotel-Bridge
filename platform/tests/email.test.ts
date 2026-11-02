import { describe, expect, it } from 'vitest';
import { toHtml } from '@/lib/services/email';

describe('email HTML version', () => {
  it('is Verdana, keeps paragraphs and line breaks, links URLs and escapes markup', () => {
    const html = toHtml('Dear Team,\n\nArrival: 10 Dec\nRooms: 2 <double>\n\nReply here: https://portal.hotelbridge.co/r/ABC');
    expect(html).toMatch(/^<div style="font-family:Verdana,Geneva,sans-serif;/);
    expect(html.match(/<p /g)).toHaveLength(3);
    expect(html).toContain('Arrival: 10 Dec<br>Rooms: 2 &lt;double&gt;');
    expect(html).toContain('<a href="https://portal.hotelbridge.co/r/ABC"');
  });
});
