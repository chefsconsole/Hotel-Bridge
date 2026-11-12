/* Registration helpers: they fill fields from facts the agent already typed. */
import { describe, expect, it } from 'vitest';
import { emailTypoFix, fromGstin, normalisePhone, panHolder, stateForCity } from '@/lib/domain/india';

describe('registration helpers', () => {
  it('reads PAN and state from a real GSTIN, and rejects a bad check character', () => {
    expect(fromGstin('07AAECV0505C1ZX')).toEqual({ pan: 'AAECV0505C', state: 'Delhi' });
    expect(fromGstin('07AAECV0505C1ZA')).toBeNull();
    expect(fromGstin('07AAECV05')).toBeNull();
  });
  it('names the PAN holder type', () => {
    expect(panHolder('AAECV0505C')).toBe('Company PAN');
    expect(panHolder('ABCPE1234F')).toBe('Individual PAN');
    expect(panHolder('ABC')).toBeNull();
  });
  it('fills the state from the city', () => {
    expect(stateForCity('pune')).toBe('Maharashtra');
    expect(stateForCity(' Delhi ')).toBe('Delhi');
    expect(stateForCity('Atlantis')).toBeNull();
  });
  it('catches email domain typos only', () => {
    expect(emailTypoFix('ravi@gmial.com')).toBe('ravi@gmail.com');
    expect(emailTypoFix('ravi@gmail.com')).toBeNull();
    expect(emailTypoFix('ravi@vayudoot.in')).toBeNull();
  });
  it('adds +91 to Indian mobiles typed without it', () => {
    expect(normalisePhone('8447489460', 'India')).toBe('+91 84474 89460');
    expect(normalisePhone('08447489460', 'India')).toBe('+91 84474 89460');
    expect(normalisePhone('+91 84474 89460', 'India')).toBe('+91 84474 89460');
    expect(normalisePhone('0501234567', 'United Arab Emirates')).toBe('0501234567');
  });
});
