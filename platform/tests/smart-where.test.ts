/* The "Where to" box understands cities, hotels, regions, areas, airport codes and typos. */
import { describe, expect, it } from 'vitest';
import { smartWhere, type WhereDest, type WhereHotel } from '@/lib/domain/smart-where';

const dests: WhereDest[] = [
  { city: 'Phuket', country: 'Thailand', n: 15 }, { city: 'Bangkok', country: 'Thailand', n: 6 }, { city: 'Pattaya', country: 'Thailand', n: 4 },
  { city: 'Bali', country: 'Indonesia', n: 5 }, { city: 'Rishikesh', country: 'India', n: 7 }, { city: 'Haridwar', country: 'India', n: 8 },
  { city: 'Mussoorie', country: 'India', n: 7 }, { city: 'Srinagar', country: 'India', n: 1 }, { city: 'Interlaken', country: 'Switzerland', n: 2 },
  { city: 'Geneva', country: 'Switzerland', n: 1 }, { city: 'Dubai', country: 'United Arab Emirates', n: 2 },
];
const hotels: WhereHotel[] = [
  { id: 'h1', name: 'Royal Cliff Beach Hotel', city: 'Pattaya', country: 'Thailand', onRequest: true },
  { id: 'h2', name: 'Mercure Phuket Patong JourneyHub', city: 'Phuket', country: 'Thailand', onRequest: true },
  { id: 'h3', name: 'Alaya Resort Ubud', city: 'Bali', country: 'Indonesia', onRequest: true },
];
const first = (q: string) => smartWhere(q, dests, hotels)[0];
const cities = (q: string) => smartWhere(q, dests, hotels).filter((s) => s.kind === 'city').map((s) => (s as { city: string }).city);

describe('smart Where to', () => {
  it('finds cities, with typos', () => {
    expect(first('phuket')).toMatchObject({ kind: 'city', city: 'Phuket' });
    expect(first('puket')).toMatchObject({ city: 'Phuket' });
    expect(first('patya')).toMatchObject({ city: 'Pattaya' });
    expect(first('banglok')).toMatchObject({ city: 'Bangkok' });
  });
  it('finds hotels by name and goes straight to them', () => {
    expect(first('royal cliff')).toMatchObject({ kind: 'hotel', id: 'h1', city: 'Pattaya' });
    expect(first('mercure phuket')).toMatchObject({ kind: 'hotel', id: 'h2' });
  });
  it('expands regions, areas and airport codes into real destinations', () => {
    expect(cities('uttarakhand')).toEqual(expect.arrayContaining(['Rishikesh', 'Haridwar', 'Mussoorie']));
    expect(cities('kashmir')).toEqual(['Srinagar']);
    expect(cities('swiss')).toEqual(expect.arrayContaining(['Interlaken', 'Geneva']));
    expect(first('patong')).toMatchObject({ city: 'Phuket' });
    expect(cities('ubud')).toContain('Bali');
    expect(first('bkk')).toMatchObject({ city: 'Bangkok', why: 'BKK airport' });
    expect(first('dxb')).toMatchObject({ city: 'Dubai' });
  });
  it('finds countries, and never invents a destination', () => {
    expect(cities('thailand')).toEqual(expect.arrayContaining(['Phuket', 'Bangkok', 'Pattaya']));
    expect(smartWhere('tokyo', dests, hotels)).toEqual([]);
    expect(cities('europe')).toEqual(expect.arrayContaining(['Interlaken', 'Geneva']));
  });
  it('shows the busiest destinations first when empty', () => {
    expect(smartWhere('', dests, hotels)[0]).toMatchObject({ city: 'Phuket' });
  });
});
