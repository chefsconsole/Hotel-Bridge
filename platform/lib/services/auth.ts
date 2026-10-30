/* ------------------------------------------------------------------ *
 * Accounts and sessions. Framework-free so it can be tested directly;
 * cookie handling lives in lib/session.ts.
 *  - Passwords: scrypt with a per-user salt (node:crypto), constant-time compare.
 *  - Sessions: random 32-byte token in an httpOnly cookie; only its SHA-256
 *    is stored, so a database leak does not leak live sessions.
 *  - Login throttling: 5 failures per account per 15 minutes.
 * ------------------------------------------------------------------ */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { SESSION_DAYS } from '@/lib/config';
import { AppError, isUniqueViolation } from './errors';
import type { Actor } from './actor';
import { audit } from './audit';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const { users, sessions, loginAttempts, agencies } = schema;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(pw, Buffer.from(saltB64, 'base64'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const passwordSchema = z.string().min(10, 'Use at least 10 characters').max(200);
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(200);

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createSession(db: DB, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function destroySession(db: DB, token: string) {
  await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

export type SessionUser = typeof users.$inferSelect & { agency: typeof agencies.$inferSelect | null };

export async function userForToken(db: DB, token: string): Promise<SessionUser | null> {
  const [row] = await db.select({ u: users, s: sessions }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())));
  if (!row || row.u.status !== 'active') return null;
  let agency = null;
  if (row.u.agencyId) [agency] = await db.select().from(agencies).where(eq(agencies.id, row.u.agencyId));
  return { ...row.u, agency: agency ?? null };
}

export function actorFor(u: Pick<SessionUser, 'id' | 'name' | 'email' | 'platformRole' | 'agencyId' | 'agencyRole' | 'partnerHotelId'>): Actor {
  return {
    userId: u.id,
    label: `${u.name} (${u.email})`,
    platformRole: (u.platformRole as Actor['platformRole']) ?? null,
    agencyId: u.agencyId ?? null,
    agencyRole: (u.agencyRole as Actor['agencyRole']) ?? null,
    partnerHotelId: u.partnerHotelId ?? null,
  };
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

export async function login(db: DB, emailRaw: string, password: string): Promise<{ token: string; expiresAt: Date; user: typeof users.$inferSelect }> {
  const email = emailRaw.trim().toLowerCase();
  const since = new Date(Date.now() - WINDOW_MS);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(loginAttempts)
    .where(and(eq(loginAttempts.key, email), eq(loginAttempts.succeeded, false), gt(loginAttempts.createdAt, since)));
  if (n >= MAX_FAILURES) throw new AppError('Too many attempts. Try again in 15 minutes.', 'rate_limited');

  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Hash even when the user doesn't exist, so timing doesn't reveal accounts.
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  await db.insert(loginAttempts).values({ key: email, succeeded: ok });
  if (!ok || !user) throw new AppError('Email or password is incorrect.', 'bad_credentials');
  if (user.status !== 'active') throw new AppError('This account is disabled. Contact HotelBridge.', 'disabled');
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const s = await createSession(db, user.id);
  return { ...s, user };
}

/* -------------------------- agency registration -------------------------- */

export const registrationSchema = z.object({
  agencyName: z.string().trim().min(2, 'Agency name is required').max(160),
  legalName: z.string().trim().max(200).optional(),
  country: z.string().trim().min(2, 'Country is required').max(80),
  city: z.string().trim().max(80).optional(),
  website: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(40).optional(),
  billingCurrency: z.enum(['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED']),
  name: z.string().trim().min(2, 'Your name is required').max(120),
  email: emailSchema,
  password: passwordSchema,
});

export async function registerAgency(db: DB, input: z.infer<typeof registrationSchema>) {
  const data = registrationSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  try {
    return await db.transaction(async (tx) => {
      const [agency] = await tx.insert(agencies).values({
        name: data.agencyName, legalName: data.legalName || null, country: data.country, city: data.city || null,
        website: data.website || null, taxId: data.taxId || null, phone: data.phone || null,
        billingCurrency: data.billingCurrency, status: 'pending',
      }).returning();
      const [user] = await tx.insert(users).values({
        email: data.email, name: data.name, passwordHash, agencyId: agency.id, agencyRole: 'owner',
      }).returning();
      await audit(tx as unknown as DB, { userId: user.id, label: `${user.name} (${user.email})`, platformRole: null, agencyId: agency.id, agencyRole: 'owner', partnerHotelId: null },
        'agency.registered', 'agency', agency.id, { name: agency.name, country: agency.country });
      return { agency, user };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError('An account with this email already exists. Sign in instead.', 'exists');
    throw e;
  }
}

/** Agency owners add colleagues. The owner sets a first password and shares it privately. */
export async function addAgencyUser(db: DB, actor: Actor, input: { name: string; email: string; password: string; role: 'owner' | 'agent' }) {
  if (!actor.agencyId || actor.agencyRole !== 'owner') throw new AppError('Only the agency owner can add team members', 'forbidden');
  const email = emailSchema.parse(input.email);
  const password = passwordSchema.parse(input.password);
  const name = z.string().trim().min(2).max(120).parse(input.name);
  try {
    const [u] = await db.insert(users).values({
      email, name, passwordHash: await hashPassword(password), agencyId: actor.agencyId, agencyRole: input.role === 'owner' ? 'owner' : 'agent',
    }).returning();
    await audit(db, actor, 'agency.user_added', 'user', u.id, { email, role: u.agencyRole });
    return u;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError('That email already has an account.', 'exists');
    throw e;
  }
}

export async function changePassword(db: DB, actor: Actor, current: string, next: string) {
  const [u] = await db.select().from(users).where(eq(users.id, actor.userId));
  if (!u || !(await verifyPassword(current, u.passwordHash))) throw new AppError('Current password is incorrect.');
  await db.update(users).set({ passwordHash: await hashPassword(passwordSchema.parse(next)) }).where(eq(users.id, u.id));
  // Sign out every other session.
  await db.delete(sessions).where(eq(sessions.userId, u.id));
  await audit(db, actor, 'user.password_changed', 'user', u.id);
}
