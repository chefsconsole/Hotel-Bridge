/* Housekeeping that pages trigger must not slow every click. Each job runs at
 * most once per interval per server instance; the daily cron is the backstop.
 * Memo keeps a cheap read (like the admin issues banner) for a few seconds. */
const lastRun = new Map<string, number>();

export async function atMostEvery(key: string, ms: number, job: () => Promise<unknown>): Promise<void> {
  const now = Date.now();
  if (now - (lastRun.get(key) ?? 0) < ms) return;
  lastRun.set(key, now);
  try { await job(); } catch (e) { lastRun.delete(key); console.error(`[housekeeping] ${key} failed`, e); }
}

const memoStore = new Map<string, { at: number; value: unknown }>();

export async function memo<T>(key: string, ms: number, read: () => Promise<T>): Promise<T> {
  const hit = memoStore.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value as T;
  const value = await read();
  memoStore.set(key, { at: Date.now(), value });
  return value;
}
