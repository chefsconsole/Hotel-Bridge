/* ------------------------------------------------------------------ *
 * Who hears about what. Every lead and every decision reaches a person:
 *  - the agency on registration, approval, decline, suspension and
 *    support replies;
 *  - HotelBridge (HB_NOTIFY_EMAIL) on new hotel applications and support
 *    tickets.
 * A failed email never undoes the action: sendEmail records what really
 * happened (Admin → Emails), and these helpers never throw.
 * ------------------------------------------------------------------ */
import { eq } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { NOTIFY_EMAIL, SUPPORT_EMAIL } from '@/lib/config';
import { appUrl, sendEmail } from './email';

const SIGN_OFF = ['', 'Warm regards,', 'HotelBridge', `${SUPPORT_EMAIL} · +91 70216 20577`];

async function safe(fn: () => Promise<unknown>) {
  try { await fn(); } catch (e) { console.error('[notify]', e); }
}

async function agencyOwners(db: DB, agencyId: string) {
  return db.select({ email: schema.users.email, name: schema.users.name, role: schema.users.agencyRole, status: schema.users.status })
    .from(schema.users).where(eq(schema.users.agencyId, agencyId))
    .then((us) => us.filter((u) => u.status === 'active' && u.role === 'owner'));
}

export function welcomeAgency(db: DB, a: { id: string; name: string }, u: { email: string; name: string }) {
  return safe(() => sendEmail(db, {
    to: u.email, toName: u.name, kind: 'agency_welcome', relatedId: a.id, replyTo: SUPPORT_EMAIL,
    subject: `Welcome to HotelBridge — ${a.name} is registered`,
    body: [
      `Dear ${u.name},`,
      '',
      `Thank you for registering ${a.name} on HotelBridge.`,
      '',
      'What happens next:',
      '  1. Our team verifies your agency — usually within one working day. We may call you on the number you gave us.',
      '  2. You get an email the moment you are approved.',
      '  3. Meanwhile you can already sign in, search hotels, send group enquiries and ask for up to 3 best rates.',
      '',
      'Sign in:',
      appUrl('/login'),
      '',
      'Got a group enquiry already? Paste it here in any format — our Group Desk takes it from there:',
      appUrl('/agent/groups/new'),
      ...SIGN_OFF,
    ].join('\n'),
  }));
}

export function agencyStatusChanged(db: DB, a: { id: string; name: string }, status: string) {
  return safe(async () => {
    const owners = await agencyOwners(db, a.id);
    const text: Record<string, { subject: string; lines: string[] } | undefined> = {
      verified: {
        subject: `${a.name} is approved — you can book on HotelBridge`,
        lines: [
          `Good news: ${a.name} is now verified on HotelBridge.`,
          '',
          'You can now:',
          '  • book partner hotels and ask for best rates (we aim to get you the hotel’s offer within an hour)',
          '  • paste group, MICE and wedding enquiries for our Group Desk',
          '  • build client quotes with your own price and profit',
          '',
          'Start here:',
          appUrl('/agent'),
        ],
      },
      rejected: {
        subject: `About your HotelBridge registration — ${a.name}`,
        lines: [
          `Thank you for registering ${a.name}. We could not approve the account at this time.`,
          '',
          `If something can be corrected, simply reply to this email or write to ${SUPPORT_EMAIL}.`,
        ],
      },
      suspended: {
        subject: `${a.name}: booking paused on HotelBridge`,
        lines: [
          `Booking is paused for ${a.name}. Your existing bookings and documents are unaffected.`,
          '',
          `Please reply to this email or write to ${SUPPORT_EMAIL} so we can resolve it.`,
        ],
      },
    };
    const t = text[status];
    if (!t) return;
    for (const o of owners) {
      await sendEmail(db, {
        to: o.email, toName: o.name, kind: `agency_${status}`, relatedId: a.id, replyTo: SUPPORT_EMAIL,
        subject: t.subject, body: [`Dear ${o.name},`, '', ...t.lines, ...SIGN_OFF].join('\n'),
      });
    }
  });
}

export function partnerApplicationReceived(db: DB, p: { id: string; kind: string; organisation: string; contactName: string; email: string; phone?: string | null; city?: string | null; country?: string | null; website?: string | null; rooms?: number | null; message?: string | null }) {
  return safe(() => sendEmail(db, {
    to: NOTIFY_EMAIL, toName: 'HotelBridge', kind: 'partner_application', relatedId: p.id, replyTo: p.email,
    subject: `New ${p.kind} partner application · ${p.organisation}${p.city ? ` · ${p.city}` : ''}`,
    body: [
      `${p.organisation} applied to partner with HotelBridge (${p.kind}).`,
      '',
      `  Contact   ${p.contactName} <${p.email}>`,
      `  Phone     ${p.phone || '—'}`,
      `  Where     ${[p.city, p.country].filter(Boolean).join(', ') || '—'}`,
      `  Website   ${p.website || '—'}`,
      `  Rooms     ${p.rooms ?? '—'}`,
      '',
      p.message || '(no message)',
      '',
      'All applications:',
      appUrl('/admin/partners'),
      '',
      'Reply to this email to write to them directly.',
    ].join('\n'),
  }));
}

export function supportTicketOpened(db: DB, t: { id: string; subject: string; body: string; urgency: string }, agencyName: string, from: { email: string; name: string }) {
  return safe(() => sendEmail(db, {
    to: NOTIFY_EMAIL, toName: 'HotelBridge', kind: 'support_ticket', relatedId: t.id, replyTo: from.email,
    subject: `${t.urgency === 'urgent' ? 'URGENT · ' : ''}Support · ${agencyName} · ${t.subject}`,
    body: [`${from.name} (${from.email}) at ${agencyName} wrote:`, '', t.body, '', 'Answer it in the portal:', appUrl('/admin/support')].join('\n'),
  }));
}

export function supportReplied(db: DB, t: { id: string; subject: string; reply: string; userId: string }) {
  return safe(async () => {
    const [u] = await db.select({ email: schema.users.email, name: schema.users.name }).from(schema.users).where(eq(schema.users.id, t.userId));
    if (!u) return;
    await sendEmail(db, {
      to: u.email, toName: u.name, kind: 'support_reply', relatedId: t.id, replyTo: SUPPORT_EMAIL,
      subject: `Re: ${t.subject}`,
      body: [`Dear ${u.name},`, '', t.reply, '', 'See the full conversation:', appUrl('/agent/support'), ...SIGN_OFF].join('\n'),
    });
  });
}

/* ---------------------- alerts to HotelBridge ops ---------------------- */

async function agencyName(db: DB, agencyId: string) {
  const [a] = await db.select({ name: schema.agencies.name, isSample: schema.agencies.isSample }).from(schema.agencies).where(eq(schema.agencies.id, agencyId));
  return a;
}

/** A best-rate request: we promise an offer within the hour, so someone must chase the hotel. */
export function rateRequestOpened(db: DB, r: { id: string; reference: string; agencyId: string; hotelName: string; hotelEmail: string | null; city: string; checkIn: string; checkOut: string; status: string }) {
  return safe(async () => {
    const a = await agencyName(db, r.agencyId);
    if (!a || a.isSample) return;
    await sendEmail(db, {
      to: NOTIFY_EMAIL, toName: 'HotelBridge', kind: 'ops_rate_request', relatedId: r.id,
      subject: `Best-rate request ${r.reference} · ${r.hotelName} · ${a.name}${r.status === 'sent' ? '' : ' · HOTEL NOT EMAILED'}`,
      body: [
        `${a.name} asked ${r.hotelName} (${r.city}) for its best rate, ${r.checkIn} → ${r.checkOut}.`,
        r.status === 'sent' ? `The hotel was emailed at ${r.hotelEmail}.` : `The hotel could NOT be emailed (${r.hotelEmail || 'no address'}) — please contact it directly.`,
        '',
        'We aim to get the agent an offer within 1 hour. If the hotel has not answered in ~45 minutes, call or WhatsApp them.',
        '',
        appUrl('/admin/rate-requests'),
      ].join('\n'),
    });
  });
}

export function groupEnquiryOpened(db: DB, e: { id: string; reference: string; agencyId: string; groupName: string; totalPax: number; legs: { city: string; checkIn: string; checkOut: string }[]; quoteNeededBy: string; isSample?: boolean }) {
  return safe(async () => {
    const a = await agencyName(db, e.agencyId);
    if (!a || a.isSample || e.isSample) return;
    await sendEmail(db, {
      to: NOTIFY_EMAIL, toName: 'HotelBridge Group Desk', kind: 'ops_group', relatedId: e.id,
      subject: `New group ${e.reference} · ${a.name} · ${e.totalPax} pax · ${e.legs.map((l) => l.city).join(' + ')}`,
      body: [
        `${a.name} sent a group enquiry: ${e.groupName}, ${e.totalPax} travellers.`,
        ...e.legs.map((l) => `  ${l.city}: ${l.checkIn} → ${l.checkOut}`),
        `Quote needed by ${e.quoteNeededBy}. We promised a first reply within 24 hours.`,
        '',
        appUrl(`/admin/groups/${e.id}`),
      ].join('\n'),
    });
  });
}

export function bookingCreated(db: DB, b: { id: string; reference: string; agencyId: string; checkIn: string; checkOut: string; status: string; currency: string; sellMinor: number; isSample?: boolean }) {
  return safe(async () => {
    const a = await agencyName(db, b.agencyId);
    if (!a || a.isSample || b.isSample) return;
    await sendEmail(db, {
      to: NOTIFY_EMAIL, toName: 'HotelBridge', kind: 'ops_booking', relatedId: b.id,
      subject: `New booking ${b.reference} · ${a.name} · ${b.status.replace(/_/g, ' ')}`,
      body: [
        `${a.name} made booking ${b.reference}: ${b.checkIn} → ${b.checkOut}, status ${b.status.replace(/_/g, ' ')}.`,
        `Total ${(b.sellMinor / 100).toFixed(2)} ${b.currency}.`,
        '',
        appUrl(`/admin/bookings/${b.id}`),
      ].join('\n'),
    });
  });
}

/* --------------------------- forgotten password --------------------------- */

/** Always behaves the same whether or not the email has an account, so it reveals nothing. */
export async function sendPasswordLink(db: DB, emailRaw: string) {
  const { createPasswordLink, emailSchema } = await import('./auth');
  const email = emailSchema.parse(emailRaw);
  const [u] = await db.select({ id: schema.users.id, name: schema.users.name, status: schema.users.status }).from(schema.users).where(eq(schema.users.email, email));
  if (!u || u.status !== 'active') return;
  // At most 3 links an hour per account.
  const recent = await db.select({ id: schema.passwordLinks.id, at: schema.passwordLinks.createdAt }).from(schema.passwordLinks).where(eq(schema.passwordLinks.userId, u.id));
  if (recent.filter((r) => r.at > new Date(Date.now() - 3_600_000)).length >= 3) return;
  const { token } = await createPasswordLink(db, email, 1);
  await safe(() => sendEmail(db, {
    to: email, toName: u.name, kind: 'password_link', relatedId: u.id, replyTo: SUPPORT_EMAIL,
    subject: 'Set your HotelBridge password',
    body: [
      `Dear ${u.name},`,
      '',
      'Use this link to set a new password. It works once and expires in 1 hour:',
      appUrl(`/set-password/${token}`),
      '',
      'If you did not ask for this, ignore this email — your password stays the same.',
      ...SIGN_OFF,
    ].join('\n'),
  }));
}
