import { sql } from 'drizzle-orm';
import type { Executor } from '@/lib/db';

/** Gap-tolerant, collision-free sequence (atomic upsert). */
export async function nextNumber(db: Executor, name: string): Promise<number> {
  const res = await db.execute(sql`
    insert into counters (name, value) values (${name}, 1)
    on conflict (name) do update set value = counters.value + 1
    returning value`);
  const rows = (res as unknown as { rows?: { value: number }[] }).rows ?? (res as unknown as { value: number }[]);
  return Number(rows[0].value);
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
