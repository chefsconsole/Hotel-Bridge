import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { gstinMatchesPan, gstinState, isGstin, isPan, sniffDocument } from '@/lib/domain/india';
import { registerAgency } from '@/lib/services/auth';
import { setAgencyStatus } from '@/lib/services/catalog';
import { kycStatus, readAgencyDocument, updateTaxIds, uploadAgencyDocument } from '@/lib/services/kyc';
import { actorFor } from '@/lib/services/auth';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

const enc = (s: string) => new TextEncoder().encode(s);
const PDF = { name: 'pan card.pdf', type: 'application/pdf', bytes: enc('%PDF-1.7 sample') };
const PNG = { name: 'gst.png', type: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]) };
const base = { agencyName: 'Mumbai Trips', country: 'India', billingCurrency: 'INR' as const, name: 'Meera', password: 'long enough pw' };

describe('Indian tax identifiers', () => {
  it('checks PAN and GSTIN format, check digit and PAN match', () => {
    expect(isPan('aaapz1234c')).toBe(true);
    expect(isPan('AAAPZ1234')).toBe(false);
    expect(isGstin('27AAPFU0939F1ZV')).toBe(true); // the GST portal's published example
    expect(isGstin('27AAPFU0939F1ZW')).toBe(false); // wrong check character
    expect(gstinMatchesPan('27AAPFU0939F1ZV', 'AAPFU0939F')).toBe(true);
    expect(gstinMatchesPan('27AAPFU0939F1ZV', 'AAAPZ1234C')).toBe(false);
    expect(gstinState('27AAPFU0939F1ZV')).toBe('Maharashtra');
    expect(sniffDocument(PDF.bytes)).toBe('application/pdf');
    expect(sniffDocument(enc('<script>'))).toBeNull();
  });
});

describe('agency verification', () => {
  it('requires PAN and a PAN card from Indian agencies, and cannot approve without them', async () => {
    f = await setup();
    await expect(registerAgency(f.db, { ...base, email: 'm1@x.test' })).rejects.toThrow(/PAN is required/);
    await expect(registerAgency(f.db, { ...base, email: 'm2@x.test', pan: 'AAPFU0939F' })).rejects.toThrow(/Upload your PAN card/);
    await expect(registerAgency(f.db, { ...base, email: 'm3@x.test', pan: 'AAPFU0939F', gstin: '27AAAPZ1234C1Z0' }, { panCard: PDF })).rejects.toThrow(/different PAN/);
    await expect(registerAgency(f.db, { ...base, email: 'm4@x.test', pan: 'AAPFU0939F' }, { panCard: { ...PDF, bytes: enc('MZ executable') } })).rejects.toThrow(/PDF, JPG or PNG/);
    // Nothing half-created by the failures above.
    expect((await f.db.select().from(schema.agencies).where(eq(schema.agencies.name, 'Mumbai Trips'))).length).toBe(0);

    const { agency, user } = await registerAgency(f.db, { ...base, email: 'm@x.test', pan: 'AAPFU0939F', gstin: '27aapfu0939f1zv' }, { panCard: PDF });
    let k = await kycStatus(f.db, agency);
    expect(k.pan.valid).toBe(true);
    expect(k.gstin.state).toBe('Maharashtra');
    expect(k.missing).toEqual(['GST certificate upload (GSTIN given)']);
    await expect(setAgencyStatus(f.db, f.ADMIN, agency.id, 'verified')).rejects.toThrow(/missing: GST certificate/);

    const owner = actorFor(user);
    await uploadAgencyDocument(f.db, owner, agency.id, 'gst_certificate', PNG);
    const [fresh] = await f.db.select().from(schema.agencies).where(eq(schema.agencies.id, agency.id));
    k = await kycStatus(f.db, fresh);
    expect(k.ready).toBe(true);
    await expect(setAgencyStatus(f.db, f.ADMIN, agency.id, 'rejected')).rejects.toThrow(/reason/);
    await setAgencyStatus(f.db, f.ADMIN, agency.id, 'verified', 'PAN card checked against registration');
    const [ok] = await f.db.select().from(schema.agencies).where(eq(schema.agencies.id, agency.id));
    expect(ok.status).toBe('verified');
    // Once approved, the agency can't change its own tax identity.
    await expect(updateTaxIds(f.db, owner, agency.id, { pan: 'AAAPZ1234C' })).rejects.toThrow(/Contact HotelBridge/);
  });

  it('lets only staff and the agency itself read a document', async () => {
    f = await setup();
    const { agency, user } = await registerAgency(f.db, { ...base, email: 'r@x.test', pan: 'AAPFU0939F' }, { panCard: PDF });
    const k = await kycStatus(f.db, agency);
    const docId = k.documents[0].id;
    expect((await readAgencyDocument(f.db, actorFor(user), docId)).mimeType).toBe('application/pdf');
    expect((await readAgencyDocument(f.db, f.ADMIN, docId)).sizeBytes).toBe(PDF.bytes.length);
    await expect(readAgencyDocument(f.db, f.A, docId)).rejects.toThrow(/not found/);
    await expect(readAgencyDocument(f.db, f.PARTNER, docId)).rejects.toThrow(/not found/);
    await expect(uploadAgencyDocument(f.db, f.A, agency.id, 'other', PDF)).rejects.toThrow(/access/);
  });
});
