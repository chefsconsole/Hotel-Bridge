'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { attempt, file, int, optStr, str, type ActionResult } from '@/lib/action';
import { destroySession, login, registerAgency, createSession, usePasswordLink } from '@/lib/services/auth';
import { submitPartnerApplication } from '@/lib/services/catalog';
import { AppError } from '@/lib/services/errors';
import { SESSION_COOKIE, clearSessionCookie, homeFor, setSessionCookie } from '@/lib/session';

function safeNext(next: string, fallback: string) {
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export async function loginAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let dest = '/';
  const r = await attempt(async () => {
    const db = await getDb();
    const { token, expiresAt, user } = await login(db, str(fd, 'email'), str(fd, 'password'));
    await setSessionCookie(token, expiresAt);
    dest = safeNext(str(fd, 'next'), homeFor(user));
    return { ok: true };
  });
  if (r.ok) redirect(dest);
  return r;
}

export async function logoutAction() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await destroySession(await getDb(), token);
  await clearSessionCookie();
  redirect('/login');
}

export async function registerAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const r = await attempt(async () => {
    if (!fd.get('terms')) throw new AppError('Please accept the terms of business to continue.');
    const db = await getDb();
    const { user } = await registerAgency(db, {
      agencyName: str(fd, 'agencyName'), legalName: optStr(fd, 'legalName'), country: str(fd, 'country'), city: str(fd, 'city'),
      website: optStr(fd, 'website'), taxId: optStr(fd, 'taxId'), phone: str(fd, 'phone'),
      address: str(fd, 'address'), state: str(fd, 'state'), pincode: optStr(fd, 'pincode'),
      topDestinations: [...fd.getAll('destinations').map(String), optStr(fd, 'otherDestinations') ?? ''].filter(Boolean).join(', ') || undefined,
      segments: fd.getAll('segments').map(String).join(', ') || undefined,
      monthlyBookings: optStr(fd, 'monthlyBookings'), heardFrom: optStr(fd, 'heardFrom'),
      pan: optStr(fd, 'pan'), gstin: optStr(fd, 'gstin'),
      billingCurrency: str(fd, 'billingCurrency') as 'EUR', name: str(fd, 'name'), email: str(fd, 'email'), password: str(fd, 'password'),
    }, { panCard: await file(fd, 'panCard'), gstCertificate: await file(fd, 'gstCertificate') });
    const s = await createSession(db, user.id);
    await setSessionCookie(s.token, s.expiresAt);
    return { ok: true };
  });
  if (r.ok) redirect('/agent?welcome=1');
  return r;
}

export async function partnerApplyAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const db = await getDb();
    await submitPartnerApplication(db, {
      kind: str(fd, 'kind') as 'hotel', organisation: str(fd, 'organisation'), contactName: str(fd, 'contactName'), email: str(fd, 'email'),
      phone: optStr(fd, 'phone'), city: optStr(fd, 'city'), country: optStr(fd, 'country'), website: optStr(fd, 'website'),
      rooms: int(fd, 'rooms'), message: optStr(fd, 'message'),
    });
    return 'Thank you. Your application is with our partnerships team — we reply personally, usually within two working days.';
  });
}

export async function setPasswordAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let done = false;
  const r = await attempt(async () => {
    await usePasswordLink(await getDb(), str(fd, 'token'), str(fd, 'password'), str(fd, 'confirm'));
    done = true;
    return { ok: true };
  });
  if (done) redirect('/login?password=1');
  return r;
}
