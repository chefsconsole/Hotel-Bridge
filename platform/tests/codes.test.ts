import { afterEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { agencyCode, agentCode, cleanTags, gradeOf, isGrade } from '@/lib/domain/grades';
import { addAgencyUser, actorFor, registerAgency } from '@/lib/services/auth';
import { setAgencyGrade } from '@/lib/services/catalog';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); f = undefined as unknown as Fixture; });

const enc = (s: string) => new TextEncoder().encode(s);
const PDF = { name: 'pan card.pdf', type: 'application/pdf', bytes: enc('%PDF-1.7 sample') };
const base = {
  country: 'India', city: 'Mumbai', state: 'Maharashtra', address: '1 Marine Drive',
  phone: '+91 98200 00000', billingCurrency: 'INR' as const, password: 'long enough pw', pan: 'AAPFU0939F',
};

describe('trading codes', () => {
  it('issues one permanent code per agency and a numbered seat per agent, and never reuses either', async () => {
    f = await setup();

    const first = await registerAgency(f.db, { ...base, agencyName: 'Mumbai Trips', name: 'Meera', email: 'meera@mumbaitrips.test' }, { panCard: PDF });
    const second = await registerAgency(f.db, { ...base, agencyName: 'Delhi Voyages', name: 'Arun', email: 'arun@delhivoyages.test' }, { panCard: PDF });

    // Codes are sequential, padded, and readable.
    expect(first.agency.code).toMatch(/^HB-A\d{4}$/);
    expect(second.agency.code).not.toBe(first.agency.code);
    expect(Number(second.agency.code!.slice(4))).toBe(Number(first.agency.code!.slice(4)) + 1);

    // The person who registers always takes seat 01 of their own agency.
    expect(first.user.code).toBe(`${first.agency.code}-01`);
    expect(second.user.code).toBe(`${second.agency.code}-01`);

    // A colleague takes the next seat, under the same agency.
    const owner = actorFor(first.user);
    const colleague = await addAgencyUser(f.db, owner, { name: 'Sana', email: 'sana@mumbaitrips.test', password: 'long enough pw', role: 'agent' });
    expect(colleague.code).toBe(`${first.agency.code}-02`);

    // A code belongs to exactly one record, enforced by the database.
    await expect(
      f.db.update(schema.agencies).set({ code: first.agency.code }).where(eq(schema.agencies.id, second.agency.id)),
    ).rejects.toThrow();

    // Every code that has been issued is distinct. (Agencies that pre-date
    // codes keep none until `npm run backfill:codes` issues theirs.)
    const agencies = await f.db.select().from(schema.agencies).orderBy(asc(schema.agencies.createdAt));
    const issued = agencies.map((a) => a.code).filter(Boolean);
    expect(new Set(issued).size).toBe(issued.length);
    expect(issued).toContain(first.agency.code);
    expect(issued).toContain(second.agency.code);
  });

  it('formats codes predictably and keeps tags tidy', () => {
    expect(agencyCode(1)).toBe('HB-A0001');
    expect(agencyCode(42)).toBe('HB-A0042');
    expect(agencyCode(12345)).toBe('HB-A12345'); // never truncated
    expect(agentCode('HB-A0042', 2)).toBe('HB-A0042-02');

    // Tags are trimmed, lower-cased, de-duplicated and capped.
    expect(cleanTags(' Kerala Specialist , MICE,  kerala specialist ')).toEqual(['kerala specialist', 'mice']);
    expect(cleanTags('')).toEqual([]);
    expect(cleanTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(20);
  });

  it('grades an agency for the desk only, without touching what they are quoted', async () => {
    f = await setup();
    const [before] = await f.db.select().from(schema.agencies).where(eq(schema.agencies.id, f.A.agencyId!));
    expect(before.grade).toBe('standard'); // everyone starts here
    expect(gradeOf(null)).toBe('standard');
    expect(isGrade('nonsense')).toBe(false);

    await setAgencyGrade(f.db, f.ADMIN, f.A.agencyId!, { grade: 'key', tags: 'Kerala specialist, MICE' });
    const [after] = await f.db.select().from(schema.agencies).where(eq(schema.agencies.id, f.A.agencyId!));
    expect(after.grade).toBe('key');
    expect(after.tags).toEqual(['kerala specialist', 'mice']);
    // Grading must not quietly become a pricing lever.
    expect(after.creditEnabled).toBe(before.creditEnabled);
    expect(after.creditLimitMinor).toBe(before.creditLimitMinor);
    expect(after.billingCurrency).toBe(before.billingCurrency);

    await expect(setAgencyGrade(f.db, f.ADMIN, f.A.agencyId!, { grade: 'platinum', tags: '' })).rejects.toThrow(/grade/i);
    // Agents cannot grade themselves.
    await expect(setAgencyGrade(f.db, f.A, f.A.agencyId!, { grade: 'key', tags: '' })).rejects.toThrow();
  });
});
