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
export function toHtml(text: string): string {
  const paragraphs = text.trim().split(/\n{2,}/).map((p) => {
    const html = escapeHtml(p)
      .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#1a4f8b;">${url}</a>`)
      .replace(/\n/g, '<br>');
    return `<p style="margin:0 0 14px;">${html}</p>`;
  });
  return `<div style="font-family:Verdana,Geneva,sans-serif;font-size:13px;line-height:1.55;color:#222;">${paragraphs.join('')}</div>`;
}

export async function recentEmails(db: Executor, limit = 100) {
  return db.select().from(schema.outboundEmails).orderBy(desc(schema.outboundEmails.createdAt)).limit(limit);
}

/** Absolute links in emails (hotel reply pages). */
export function appUrl(path: string) {
  const base = (process.env.APP_URL || 'http://localhost:3050').replace(/\/$/, '');
  return base + path;
}
