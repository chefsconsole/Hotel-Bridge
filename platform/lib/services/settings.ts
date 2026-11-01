import { eq } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { AppError } from './errors';

export const SETTING_DEFAULTS = {
  'payment.instructions': '',
  'support.hours': '',
  // Group Desk automation: '1' on, '0' off.
  'groups.autoDispatch': '1',
  'groups.autoProposal': '1',
  'groups.markupPct': '8',
} as const;
export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(db: DB, key: SettingKey): Promise<string> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return typeof row?.value === 'string' ? row.value : SETTING_DEFAULTS[key];
}

export async function setSetting(db: DB, actor: Actor, key: SettingKey, value: string) {
  requireStaff(actor, ['admin', 'finance']);
  if (!(key in SETTING_DEFAULTS)) throw new AppError('Unknown setting');
  if ((key === 'groups.autoDispatch' || key === 'groups.autoProposal') && !['0', '1'].includes(value)) throw new AppError('Choose on or off');
  if (key === 'groups.markupPct' && !(Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 50)) throw new AppError('Group markup must be between 0 and 50%');
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  await audit(db, actor, 'settings.updated', 'settings', key);
}
