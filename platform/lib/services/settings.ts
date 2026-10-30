import { eq } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { requireStaff, type Actor } from './actor';
import { audit } from './audit';

export const SETTING_DEFAULTS = {
  'payment.instructions': '',
  'support.hours': '',
} as const;
export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(db: DB, key: SettingKey): Promise<string> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return typeof row?.value === 'string' ? row.value : SETTING_DEFAULTS[key];
}

export async function setSetting(db: DB, actor: Actor, key: SettingKey, value: string) {
  requireStaff(actor, ['admin', 'finance']);
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  await audit(db, actor, 'settings.updated', 'settings', key);
}
