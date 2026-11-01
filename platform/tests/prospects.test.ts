import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { importProspects, listProspects, logContact, parseCsv, prospectStats, updateProspect } from '@/lib/services/prospects';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

describe('hotel outreach', () => {
  it('parses quoted CSV fields', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\r\n\n1,2')).toEqual([['a', 'b'], ['x, y', 'say "hi"'], ['1', '2']]);
  });

  it('imports the research tracker once, then tracks contacts and stages', async () => {
    f = await setup();
    const csv = readFileSync(process.cwd() + '/docs/hotel-targets.csv', 'utf8');
    const first = await importProspects(f.db, f.ADMIN, csv);
    expect(first.added).toBeGreaterThanOrEqual(200);
    expect((await importProspects(f.db, f.ADMIN, csv)).added).toBe(0); // idempotent
    await expect(importProspects(f.db, f.A, csv)).rejects.toThrow(); // agents can't

    const [khyber] = await listProspects(f.db, { q: 'Khyber' });
    expect(khyber).toMatchObject({ priority: 'P1', stage: 'to_contact', nameChecked: true });
    const logged = await logContact(f.db, f.ADMIN, khyber.id, { note: 'Called DOS', nextStep: 'Send agreement', nextStepOn: f.today });
    expect(logged.stage).toBe('contacted');
    expect(logged.notes).toContain('Called DOS');
    expect((await prospectStats(f.db)).due).toBe(1);

    await updateProspect(f.db, f.ADMIN, khyber.id, { stage: 'rates_received', priority: 'P1', contactEmail: 'not-an-email' }).then(() => { throw new Error('should fail'); }, (e) => expect(String(e)).toMatch(/valid email/));
    await updateProspect(f.db, f.ADMIN, khyber.id, { stage: 'rates_received', priority: 'P1', rateType: 'commissionable' });
    expect((await listProspects(f.db, { stage: 'rates_received' })).map((p) => p.id)).toEqual([khyber.id]);
  });
});
