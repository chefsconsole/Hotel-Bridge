'use server';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { attempt, optStr, str, type ActionResult } from '@/lib/action';
import { encodeRooms } from '@/lib/domain/occupancy';
import { clientMessage, founderBrief, groupFromBrief, helpAnswer, readRateSheet, smartSearch } from '@/lib/ai/tools';
import { audit } from '@/lib/services/audit';
import { founderMetrics, operationalIssues } from '@/lib/services/metrics';
import { getSession, requireAgent } from '@/lib/session';
import { aiConfigured } from '@/lib/ai/client';
import { sendPastedGroupEnquiry } from '@/lib/services/quick-group';
import { getSetting } from '@/lib/services/settings';
import { dispatchToHotels } from '@/lib/services/group-desk';
import { SYSTEM } from '@/lib/services/actor';
import { AppError, ForbiddenError } from '@/lib/services/errors';
import { demoMode } from '@/lib/config';

async function actor() {
  const s = await getSession();
  if (!s) throw new ForbiddenError('Please sign in again.');
  return s.actor;
}

export async function smartSearchAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let dest = '';
  const r = await attempt(async () => {
    const a = await actor();
    if (!a.agencyId) throw new ForbiddenError();
    const db = await getDb();
    const res = await smartSearch(db, a, str(fd, 'q'));
    if (!res.city) {
      if (res.requestedPlace) {
        await audit(db, a, 'demand.unserved_destination', 'destination', res.requestedPlace.trim().slice(0, 80));
        return { ok: false, message: `We don't offer hotels in ${res.requestedPlace} yet. We've recorded the request so our team can see the demand — the Group Desk can still help.` };
      }
      return { ok: false, message: 'Which destination? Mention one of the cities we cover.' };
    }
    if (!res.checkIn || !res.checkOut) {
      return { ok: false, message: `Got it — ${res.city}. I still need ${res.missing.length ? res.missing.join(', ') : 'check-in and check-out dates'}.` };
    }
    dest = `/agent/search?${new URLSearchParams({ city: res.city, in: res.checkIn, out: res.checkOut, rooms: encodeRooms(res.rooms) })}`;
    return { ok: true };
  });
  if (dest) redirect(dest);
  return r;
}

export async function clientMessageAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const output = await clientMessage(await getDb(), await actor(), {
      bookingId: str(fd, 'bookingId'), channel: str(fd, 'channel') === 'email' ? 'email' : 'whatsapp',
      language: str(fd, 'language') || 'English', clientPrice: optStr(fd, 'clientPrice'), note: optStr(fd, 'note'),
    });
    return { ok: true, data: { output } };
  });
}

export async function groupBriefAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let dest = '';
  const r = await attempt(async () => {
    const brief = str(fd, 'brief');
    const draft = await groupFromBrief(await getDb(), await actor(), brief);
    // The client's own words travel with the form (trimmed to keep the link short).
    dest = `/agent/groups/new?prefill=${Buffer.from(JSON.stringify({ ...draft, brief: brief.slice(0, 1500) })).toString('base64url')}`;
    return { ok: true };
  });
  if (dest) redirect(dest);
  return r;
}

export async function rateSheetAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const r = await readRateSheet(await getDb(), await actor(), str(fd, 'contractId'), str(fd, 'text'));
    const notes = [...r.warnings, ...r.unmatched.map((u) => `Not mapped: ${u}`)];
    return { ok: true, data: { output: r.csv, notes: notes.join('\n'), lines: r.lines } };
  });
}

export async function founderBriefAction(_: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  void _fd;
  return attempt(async () => {
    const a = await actor();
    if (!a.platformRole) throw new ForbiddenError();
    const db = await getDb();
    const [m, issues] = await Promise.all([founderMetrics(db, { days: 7, includeSample: demoMode }), operationalIssues(db)]);
    const output = await founderBrief(db, a, m, issues.slice(0, 15).map((i) => ({ severity: i.severity, title: i.title, detail: i.detail })));
    return { ok: true, data: { output } };
  });
}

export async function helpAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const q = str(fd, 'question');
    if (!q) throw new AppError('Type a question first.');
    return { ok: true, data: { output: await helpAnswer(await getDb(), await actor(), q) } };
  });
}

/** One step: paste any group enquiry. AI makes the request if it can; otherwise the Group Desk gets the message. */
export async function quickGroupAction(prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (fd.get('mode') === 'review') return groupBriefAction(prev, fd);
  let dest = '';
  const r = await attempt(async () => {
    const { actor: a, agency } = await requireAgent();
    const db = await getDb();
    const res = await sendPastedGroupEnquiry(db, a, agency, str(fd, 'brief'), aiConfigured() ? (t) => groupFromBrief(db, a, t) : null);
    if (res.kind === 'enquiry') {
      if ((await getSetting(db, 'groups.autoDispatch')) === '1') {
        try { await dispatchToHotels(db, SYSTEM, res.id); } catch (err) { console.error('[groups] auto-dispatch failed', err); }
      }
      dest = `/agent/groups/${res.id}?new=1`;
      return { ok: true };
    }
    return 'Sent to our Group Desk. We will read your message and reply within 24 hours — you will see the reply under Support.';
  });
  if (dest) redirect(dest);
  return r;
}
