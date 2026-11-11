import { afterEach, describe, expect, it } from 'vitest';
import { schema } from '@/lib/db';
import { addDays } from '@/lib/domain/dates';
import { compareHotels } from '@/lib/services/compare';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

async function extraHotels(fx: Fixture) {
  const [ask] = await fx.db.insert(schema.hotels).values({ name: 'Ask Me Hotel', slug: 'ask-me', city: 'Paris', country: 'France', status: 'active', bestRateOnRequest: true, rateRequestEmail: 'sales@askme.test' }).returning();
  const [hidden] = await fx.db.insert(schema.hotels).values({ name: 'Draft Hotel', slug: 'draft-hotel', city: 'Paris', country: 'France', status: 'draft' }).returning();
  return { ask, hidden };
}

describe('hotel comparison', () => {
  it('needs two published hotels and never shows unpublished ones', async () => {
    f = await setup();
    const { hidden } = await extraHotels(f);
    await expect(compareHotels(f.db, f.A, [f.hotel.id])).rejects.toThrow(/at least two/);
    const { columns } = await compareHotels(f.db, f.A, [f.hotel.id, hidden.id]);
    expect(columns.map((c) => c.hotel.id)).toEqual([f.hotel.id]);
  });

  it('prices a contracted hotel from the live search and marks best-rate hotels as ask-the-hotel', async () => {
    f = await setup();
    const { ask } = await extraHotels(f);
    const noDates = await compareHotels(f.db, f.A, [f.hotel.id, ask.id]);
    expect(noDates.columns.map((c) => c.status)).toEqual(['no_dates', 'on_request']);

    const stay = { checkIn: addDays(f.today, 30), checkOut: addDays(f.today, 33), rooms: [{ adults: 2, childAges: [] }] };
    const { columns, error } = await compareHotels(f.db, f.A, [ask.id, f.hotel.id], stay);
    expect(error).toBeUndefined();
    expect(columns[0].status).toBe('on_request');
    expect(columns[1].status).toBe('priced');
    expect(columns[1].nights).toBe(3);
    expect(columns[1].cheapest!.price.sellMinor).toBeGreaterThan(0);
  });

  it('reports a bad stay instead of guessing', async () => {
    f = await setup();
    const { ask } = await extraHotels(f);
    const { columns, error } = await compareHotels(f.db, f.A, [f.hotel.id, ask.id], { checkIn: addDays(f.today, 10), checkOut: addDays(f.today, 10), rooms: [{ adults: 2, childAges: [] }] });
    expect(error).toMatch(/after check-in/);
    expect(columns[0].status).toBe('no_dates');
  });
});
