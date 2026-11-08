import './env';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, schema } from '@/lib/db';
import { emailSchema, hashPassword, passwordSchema } from '@/lib/services/auth';

/* npm run reset-password -- <email>
 * Sets a new password for an existing user and signs them out everywhere.
 * The password is read from HB_NEW_PASSWORD so it never appears in shell history. */
(async () => {
  const email = emailSchema.parse(process.argv[2] ?? '');
  const pw = passwordSchema.parse(process.env.HB_NEW_PASSWORD ?? '');
  const db = await getDb();
  const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (!u) throw new Error(`No user ${email}`);
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw), status: 'active' }).where(eq(schema.users.id, u.id));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.key, email));
  console.log(`Password updated for ${email}. Sign in with the new password.`);
  await closeDb();
})().catch(async (e) => { console.error(e.message); await closeDb(); process.exit(1); });
