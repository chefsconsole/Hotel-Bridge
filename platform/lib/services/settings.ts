import { eq } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { AppError } from './errors';

export const SETTING_DEFAULTS = {
  'payment.instructions': '',
  'support.hours': '',
  // Group Desk automation: '1' on, '0' off. Off by default: the team picks the hotels and approves every offer.
  'groups.autoDispatch': '0',
  'groups.autoProposal': '0',
  'groups.markupPct': '8',
  // Best rate on request: our margin on top of the hotel's net quote.
  'rateRequests.markupPct': '8',
  // Hotel extras (dinners, activities, spa): our margin on the hotel's net price.
  'extras.markupPct': '20',
  // Who handles new best-rate and group enquiries by default: a team member's user id ('' = the team inbox only).
  'desk.assignee': '',
} as const;
export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(db: DB, key: SettingKey): Promise<string> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  // jsonb may hand a numeric string back as a number — keep it, don't fall back to the default.
  const v = row?.value;
  return typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : SETTING_DEFAULTS[key];
}

export async function setSetting(db: DB, actor: Actor, key: SettingKey, value: string) {
  requireStaff(actor, ['admin', 'finance']);
  if (!(key in SETTING_DEFAULTS)) throw new AppError('Unknown setting');
  if ((key === 'groups.autoDispatch' || key === 'groups.autoProposal') && !['0', '1'].includes(value)) throw new AppError('Choose on or off');
  if ((key === 'groups.markupPct' || key === 'rateRequests.markupPct' || key === 'extras.markupPct') && !(Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 50)) throw new AppError('Markup must be between 0 and 50%');
  if (key === 'desk.assignee' && value) {
    const [u] = await db.select({ role: schema.users.platformRole, status: schema.users.status }).from(schema.users).where(eq(schema.users.id, value));
    if (!u?.role || u.status !== 'active') throw new AppError('Choose an active team member');
  }
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  await audit(db, actor, 'settings.updated', 'settings', key);
}
