import './env';
import { closeDb, getDb, schema } from '@/lib/db';
import { emailSchema, hashPassword, passwordSchema } from '@/lib/services/auth';

/* npm run create-admin -- <email> "<name>" <role admin|ops|finance>
 * The password is read from HB_ADMIN_PASSWORD so it never appears in shell history. */
(async () => {
  const [email, name, role = 'admin'] = process.argv.slice(2);
  const pw = process.env.HB_ADMIN_PASSWORD;
  if (!email || !name || !pw) throw new Error('Usage: HB_ADMIN_PASSWORD=… npm run create-admin -- email "Full Name" [admin|ops|finance]');
  if (!['admin', 'ops', 'finance'].includes(role)) throw new Error('role must be admin, ops or finance');
  const db = await getDb();
  await db.insert(schema.users).values({ email: emailSchema.parse(email), name, platformRole: role, passwordHash: await hashPassword(passwordSchema.parse(pw)) });
  console.log(`Created ${role} ${email}`);
  await closeDb();
})().catch(async (e) => { console.error(e.message); await closeDb(); process.exit(1); });
