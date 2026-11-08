/* ------------------------------------------------------------------ *
 * Outbound email. Every message is recorded with what really happened:
 *   sent            — the provider accepted it
 *   failed          — the provider refused it (error kept)
 *   not_configured  — no provider, or not allowed from this environment
 * Nothing is ever reported as sent unless the provider accepted it.
 *
 * Provider: Resend (https://resend.com) via its HTTP API, enabled by
 * RESEND_API_KEY and EMAIL_FROM. Outside production, real sending also
 * needs EMAIL_ALLOW_NONPROD=1, so test data never emails real hotels.
 * ------------------------------------------------------------------ */
import { desc } from 'drizzle-orm';
import { schema, type Executor } from '@/lib/db';
import { isProduction } from '@/lib/config';

export type EmailInput = { to: string; toName?: string | null; subject: string; body: string; kind: string; relatedId?: string | null; replyTo?: string | null };
export type EmailStatus = 'sent' | 'failed' | 'not_configured';

export function emailConfigured(): { ok: boolean; reason: string | null } {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { ok: false, reason: 'No email provider configured (RESEND_API_KEY and EMAIL_FROM)' };
  if (!isProduction && process.env.EMAIL_ALLOW_NONPROD !== '1') return { ok: false, reason: 'Sending is off outside production (set EMAIL_ALLOW_NONPROD=1 to allow)' };
  return { ok: true, reason: null };
}

export async function sendEmail(db: Executor, e: EmailInput): Promise<{ status: EmailStatus; id: string }> {
  const cfg = emailConfigured();
  let status: EmailStatus = 'not_configured';
  let providerId: string | null = null;
  let error: string | null = cfg.reason;
  if (cfg.ok) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM, to: [e.to], subject: e.subject, text: e.body, html: toHtml(e.body),
          ...(e.replyTo || process.env.EMAIL_REPLY_TO ? { reply_to: e.replyTo || process.env.EMAIL_REPLY_TO } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.ok && json.id) { status = 'sent'; providerId = json.id; error = null; }
      else { status = 'failed'; error = json.message ?? `HTTP ${res.status}`; }
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : 'Network error';
    }
  }
  const [row] = await db.insert(schema.outboundEmails).values({
    toEmail: e.to, toName: e.toName ?? null, subject: e.subject, body: e.body, kind: e.kind, relatedId: e.relatedId ?? null,
    status, provider: cfg.ok ? 'resend' : null, providerId, error, sentAt: status === 'sent' ? new Date() : null,
  }).returning();
  return { status, id: row.id };
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The HTML version of a plain-text email: house style is Verdana. Blank
 * lines become paragraphs, line breaks are kept, and links are clickable. */
/** Button label for a link to our own portal, by path. */
function buttonLabel(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const map: [RegExp, string][] = [
    [/^\/set-password\//, 'Set your password'],
    [/^\/login/, 'Sign in to HotelBridge'],
    [/^\/r\//, 'Send your best rate'],
    [/^\/g\//, 'Open the group request'],
    [/^\/admin\/agencies\//, 'Review the agency'],
    [/^\/admin/, 'Open in admin'],
    [/^\/agent\/groups\/new/, 'Paste a group enquiry'],
    [/^\/agent\/rate-requests\//, 'View the offer'],
    [/^\/agent/, 'Open HotelBridge'],
    [/^\/t\//, 'View your proposal'],
  ];
  return map.find(([re]) => re.test(path))?.[1] ?? 'Open';
}

const NAVY = '#0b1730';
const GOLD = '#b8862e';
const FONT = 'Verdana,Geneva,sans-serif';

/** HotelBridge-branded HTML for every email: logo header, buttons for portal links, footer. */
export function toHtml(text: string): string {
  const base = (process.env.APP_URL || 'https://portal.hotelbridge.co').replace(/\/$/, '');
  const ownLink = (u: string) => u.startsWith(base);
  const linkify = (h: string) => h.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#1a4f8b;word-break:break-all;">${url}</a>`);
  const button = (url: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;"><tr><td style="background:${NAVY};border-radius:24px;"><a href="${url}" style="display:inline-block;padding:12px 26px;font-family:${FONT};font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">${buttonLabel(url)} &rarr;</a></td></tr></table>`;

  const blocks = text.trim().split(/\n{2,}/).map((p) => {
    const lines = p.split('\n');
    const out: string[] = [];
    let para: string[] = [];
    const flush = () => { if (para.length) { out.push(`<p style="margin:0 0 14px;">${para.join('<br>')}</p>`); para = []; } };
    for (const raw of lines) {
      const line = raw.trimEnd();
      const only = line.trim();
      if (/^https?:\/\/\S+$/.test(only) && ownLink(only)) { flush(); out.push(button(only)); continue; }
      if (/^\s{2,}\S/.test(raw)) { flush(); out.push(`<div style="margin:0 0 6px;padding:6px 12px;border-left:3px solid ${GOLD};background:#faf6ee;">${linkify(escapeHtml(only))}</div>`); continue; }
      para.push(linkify(escapeHtml(line)));
    }
    flush();
    return out.join('');
  });

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3efe6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6dfd0;">
<tr><td style="background:${NAVY};padding:22px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;padding-right:12px;"><img src="${base}/hotelbridge-mark-inverse.png" width="64" height="39" alt="HotelBridge" style="display:block;border:0;"></td>
    <td style="vertical-align:middle;font-family:${FONT};font-size:20px;font-weight:bold;letter-spacing:-0.3px;"><span style="color:#ffffff;">Hotel</span><span style="color:#d9b56f;">Bridge</span></td>
  </tr></table>
</td></tr>
<tr><td style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 14px;font-family:${FONT};font-size:14px;line-height:1.6;color:#222222;">${blocks.join('')}</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #eee7d8;font-family:${FONT};font-size:11.5px;line-height:1.6;color:#7a7365;">
  <strong style="color:${NAVY};">HotelBridge</strong> &middot; Hotels direct. No middleman.<br>
  <a href="mailto:info@hotelbridge.co" style="color:#7a7365;">info@hotelbridge.co</a> &middot; +91 70216 20577 &middot; <a href="${base}" style="color:#7a7365;">portal.hotelbridge.co</a><br>
  Sunrise, Charkop, Kandivali West, Mumbai 400067
</td></tr>
</table></td></tr></table></body></html>`;
}

export async function recentEmails(db: Executor, limit = 100) {
  return db.select().from(schema.outboundEmails).orderBy(desc(schema.outboundEmails.createdAt)).limit(limit);
}

/** Absolute links in emails (hotel reply pages). */
export function appUrl(path: string) {
  const base = (process.env.APP_URL || 'http://localhost:3050').replace(/\/$/, '');
  return base + path;
}
