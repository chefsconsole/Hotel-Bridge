import { afterEach, describe, expect, it } from 'vitest';
import { schema } from '@/lib/db';
import { extraSellMinor, extrasForAgent } from '@/lib/services/extras';
import { setSetting } from '@/lib/services/settings';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

describe('hotel extras', () => {
  it('sell = net + extras markup, rounded up to a whole unit', () => {
    expect(extraSellMinor(350_000, 'THB', 2000)).toBe(420_000); // 3,500 THB + 20%
    expect(extraSellMinor(49_900, 'THB', 2000)).toBe(59_900); // 598.80 → 599
    expect(extraSellMinor(1_850_000, 'VND', 1500)).toBe(2_127_500);
  });

  it('agents see the selling price with the extras markup — never the net price', async () => {
    f = await setup();
    await f.db.insert(schema.hotelExtras).values({ hotelId: f.hotel.id, name: 'Candle-light dinner', category: 'dining', unit: 'per_couple', priceMinor: 350_000, childPriceMinor: null, currency: 'THB' });
    await f.db.insert(schema.hotelExtras).values({ hotelId: f.hotel.id, name: 'Zipline', category: 'activity', unit: 'per_person', priceMinor: 175_000, childPriceMinor: 87_500, currency: 'THB', active: false });

    let [x, ...rest] = await extrasForAgent(f.db, f.hotel.id);
    expect(rest).toHaveLength(0); // inactive extras are hidden
    expect(x.sellMinor).toBe(420_000); // default extras markup 20%
    expect(x).not.toHaveProperty('priceMinor');

    await setSetting(f.db, f.ADMIN, 'extras.markupPct', '30');
    [x] = await extrasForAgent(f.db, f.hotel.id);
    expect(x.sellMinor).toBe(455_000);
    await expect(setSetting(f.db, f.ADMIN, 'extras.markupPct', '80')).rejects.toThrow(/between 0 and 50/);
  });
});
