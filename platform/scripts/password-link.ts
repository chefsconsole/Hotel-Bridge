import './env';
import { closeDb, getDb } from '@/lib/db';
import { createPasswordLink } from '@/lib/services/auth';

/* npm run password-link -- <email>
 * Prints a one-time link (valid 1 hour) where the user sets their own password. */
(async () => {
  const { token, expiresAt } = await createPasswordLink(await getDb(), process.argv[2] ?? '');
  const base = (process.env.APP_URL || 'http://localhost:3050').replace(/\/$/, '');
  console.log(`${base}/set-password/${token}`);
  console.log(`Valid until ${expiresAt.toISOString()} — one use only.`);
  await closeDb();
})().catch(async (e) => { console.error(e.message); await closeDb(); process.exit(1); });
