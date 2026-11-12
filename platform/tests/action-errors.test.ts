/* Form errors name the fields to fix, so the form can highlight them
 * (and keep everything the user already typed). */
import { describe, expect, it } from 'vitest';
import { attempt } from '@/lib/action';
import { registrationSchema } from '@/lib/services/auth';

describe('action errors', () => {
  it('returns the invalid field names with the message', async () => {
    const r = await attempt(async () => { registrationSchema.parse({ agencyName: 'Ok Travels', country: 'India', city: 'Pune', address: '12 FC Road', state: 'MH', billingCurrency: 'INR', phone: '', name: '', email: 'x', password: 'long enough pw' }); });
    expect(r.ok).toBe(false);
    expect((r.data as { fields: string[] }).fields).toEqual(expect.arrayContaining(['phone', 'name', 'email']));
    expect(r.message).toContain('Phone number is required');
  });
  it('plain business errors carry no field list', async () => {
    const { AppError } = await import('@/lib/services/errors');
    const r = await attempt(async () => { throw new AppError('PAN is required for agencies in India'); });
    expect(r).toEqual({ ok: false, message: 'PAN is required for agencies in India' });
  });
});
