import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getDb } from '@/lib/db';
import { isProduction } from '@/lib/config';
import { actorFor, userForToken, type SessionUser } from '@/lib/services/auth';
import type { Actor } from '@/lib/services/actor';

export const SESSION_COOKIE = 'hb_session';

export type Session = { user: SessionUser; actor: Actor };

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const user = await userForToken(db, token);
  if (!user) return null;
  return { user, actor: actorFor(user) };
});

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/', expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export function homeFor(u: Pick<SessionUser, 'platformRole' | 'agencyId' | 'partnerHotelId'>) {
  if (u.platformRole) return '/admin';
  if (u.partnerHotelId) return '/partner';
  return '/agent';
}

export async function requireAgent(): Promise<Session & { agency: NonNullable<SessionUser['agency']> }> {
  const s = await getSession();
  if (!s) redirect('/login');
  if (!s.user.agencyId || !s.user.agency) redirect(homeFor(s.user));
  return { ...s, agency: s.user.agency };
}

export async function requireStaff(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/login');
  if (!s.user.platformRole) redirect(homeFor(s.user));
  return s;
}

export async function requirePartner(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/login');
  if (!s.user.partnerHotelId) redirect(homeFor(s.user));
  return s;
}
