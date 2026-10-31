/* ------------------------------------------------------------------ *
 * HotelBridge's own team. Only admins add people or change access, and
 * the business can never be left without an active admin.
 * ------------------------------------------------------------------ */
import { and, asc, eq, isNotNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { STAFF_ROLES, requireStaff, type Actor, type StaffRole } from './actor';
import { audit } from './audit';
import { emailSchema, hashPassword, passwordSchema } from './auth';
import { AppError, NotFoundError, isUniqueViolation } from './errors';

const { users, sessions } = schema;

export async function listStaff(db: DB) {
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.platformRole, status: users.status, createdAt: users.createdAt })
    .from(users).where(isNotNull(users.platformRole)).orderBy(asc(users.name));
}

export async function addStaff(db: DB, actor: Actor, input: { name: string; email: string; role: string; password: string }) {
  requireStaff(actor, ['admin']);
  const name = z.string().trim().min(2, 'Name is required').max(120).parse(input.name);
  const email = emailSchema.parse(input.email);
  const role = z.enum(STAFF_ROLES).parse(input.role);
  const password = passwordSchema.parse(input.password);
  try {
    const [u] = await db.insert(users).values({ name, email, platformRole: role, passwordHash: await hashPassword(password) }).returning();
    await audit(db, actor, 'staff.added', 'user', u.id, { email, role });
    return u;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError('That email already has an account.');
    throw e;
  }
}

async function otherActiveAdmins(db: DB, userId: string) {
  return (await db.select({ id: users.id }).from(users).where(and(eq(users.platformRole, 'admin'), eq(users.status, 'active'), ne(users.id, userId)))).length;
}

export async function updateStaff(db: DB, actor: Actor, userId: string, change: { role?: StaffRole; status?: 'active' | 'disabled' }) {
  requireStaff(actor, ['admin']);
  if (!z.string().uuid().safeParse(userId).success) throw new NotFoundError('Team member');
  const [u] = await db.select().from(users).where(and(eq(users.id, userId), isNotNull(users.platformRole)));
  if (!u) throw new NotFoundError('Team member');
  if (change.role) z.enum(STAFF_ROLES).parse(change.role);
  const losingAdmin = u.platformRole === 'admin' && u.status === 'active' && ((change.role && change.role !== 'admin') || change.status === 'disabled');
  if (losingAdmin && (await otherActiveAdmins(db, u.id)) === 0) throw new AppError('Keep at least one active admin — add another admin first.');
  if (u.id === actor.userId && change.status === 'disabled') throw new AppError("You can't disable your own account.");
  await db.update(users).set({ platformRole: change.role ?? u.platformRole, status: change.status ?? u.status }).where(eq(users.id, u.id));
  // A change of access takes effect now: sign them out everywhere.
  await db.delete(sessions).where(eq(sessions.userId, u.id));
  await audit(db, actor, 'staff.updated', 'user', u.id, { from: { role: u.platformRole, status: u.status }, to: change });
}
