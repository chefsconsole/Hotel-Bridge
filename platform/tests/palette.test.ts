import { afterEach, describe, expect, it } from 'vitest';
import { schema } from '@/lib/db';
import { paletteSearch } from '@/lib/services/palette';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

describe('Cmd+K search', () => {
  it('shows an agent only their own clients and groups, but every active partner hotel', async () => {
    f = await setup();
    await f.db.insert(schema.clients).values([
      { agencyId: f.agencyA.id, name: 'Mehta Family', createdBy: f.A.userId },
      { agencyId: f.agencyB.id, name: 'Mehta Corporate', createdBy: f.B.userId },
    ]);
    const a = await paletteSearch(f.db, f.A, 'mehta');
    expect(a.filter((h) => h.kind === 'Client').map((h) => h.title)).toEqual(['Mehta Family']);
    const b = await paletteSearch(f.db, f.B, 'mehta');
    expect(b.filter((h) => h.kind === 'Client').map((h) => h.title)).toEqual(['Mehta Corporate']);
    const hotel = await paletteSearch(f.db, f.A, f.hotel.name.slice(0, 5));
    expect(hotel.some((h) => h.kind === 'Hotel' && h.href === `/agent/hotels/${f.hotel.id}`)).toBe(true);
  });

  it('gives staff admin links, treats % and _ as plain text, and ignores 1-letter searches', async () => {
    f = await setup();
    const hits = await paletteSearch(f.db, f.ADMIN, f.agencyA.name);
    expect(hits.some((h) => h.kind === 'Agency' && h.href === `/admin/agencies/${f.agencyA.id}`)).toBe(true);
    expect(await paletteSearch(f.db, f.ADMIN, '%%')).toEqual([]);
    expect(await paletteSearch(f.db, f.ADMIN, '__')).toEqual([]);
    expect(await paletteSearch(f.db, f.ADMIN, 'a')).toEqual([]);
    expect(await paletteSearch(f.db, f.PARTNER, 'mehta')).toEqual([]);
  });
});
