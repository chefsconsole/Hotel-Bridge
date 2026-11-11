'use server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { paletteSearch, type PaletteHit } from '@/lib/services/palette';

export async function paletteSearchAction(q: string): Promise<PaletteHit[]> {
  const s = await getSession();
  if (!s) return [];
  try { return await paletteSearch(await getDb(), s.actor, String(q ?? '')); } catch (e) { console.error('[palette]', e); return []; }
}
