/* ------------------------------------------------------------------ *
 * Agency verification (KYC). An agency registers, uploads its documents,
 * and HotelBridge staff approve or decline it. Only approved agencies book.
 *
 *  - Indian agencies need a well-formed PAN and a PAN card on file before
 *    anyone can approve them; GSTIN is checked (format, check digit,
 *    matches the PAN) when given.
 *  - Files are checked by their bytes, not their name: PDF, PNG or JPEG only.
 *  - Only staff and the agency itself can read a document.
 * ------------------------------------------------------------------ */
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { gstinMatchesPan, gstinState, isGstin, isIndia, isPan, normaliseId, sniffDocument } from '@/lib/domain/india';
import { isStaff, type Actor } from './actor';
import { audit } from './audit';
import { AppError, ForbiddenError, NotFoundError } from './errors';

const { agencies, agencyDocuments } = schema;

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_KINDS = { pan_card: 'PAN card', gst_certificate: 'GST certificate', registration: 'Business registration / trade licence', other: 'Other' } as const;
export type DocumentKind = keyof typeof DOCUMENT_KINDS;

/** PAN / GSTIN as typed by the agency → normalised and validated. */
export const taxIdsSchema = z.object({
  pan: z.string().optional().nullable().transform((v) => (v ? normaliseId(v) : null))
    .refine((v) => v == null || isPan(v), 'PAN should look like ABCDE1234F'),
  gstin: z.string().optional().nullable().transform((v) => (v ? normaliseId(v) : null))
    .refine((v) => v == null || isGstin(v), 'GSTIN is not valid — check the 15 characters'),
}).superRefine((v, ctx) => {
  if (v.pan && v.gstin && !gstinMatchesPan(v.gstin, v.pan)) ctx.addIssue({ code: 'custom', path: ['gstin'], message: 'This GSTIN belongs to a different PAN' });
});

export type UploadFile = { name: string; type: string; bytes: Uint8Array };

/** Validates a file before anything is written — call it before creating accounts. */
export function checkDocument(file: UploadFile | null, required: boolean, label: string): UploadFile | null {
  if (!file || file.bytes.length === 0) {
    if (required) throw new AppError(`Upload your ${label} (PDF, JPG or PNG)`);
    return null;
  }
  if (file.bytes.length > MAX_DOCUMENT_BYTES) throw new AppError(`${label}: the file is larger than 4 MB — upload a smaller scan or photo`);
  const real = sniffDocument(file.bytes);
  if (!real) throw new AppError(`${label}: upload a PDF, JPG or PNG file`);
  return { name: file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'document', type: real, bytes: file.bytes };
}

export async function uploadAgencyDocument(db: DB, actor: Actor, agencyId: string, kind: DocumentKind, raw: UploadFile) {
  if (!isStaff(actor) && actor.agencyId !== agencyId) throw new ForbiddenError();
  if (!(kind in DOCUMENT_KINDS)) throw new AppError('Choose what this document is');
  const file = checkDocument(raw, true, DOCUMENT_KINDS[kind])!;
  const [d] = await db.insert(agencyDocuments).values({
    agencyId, kind, fileName: file.name, mimeType: file.type, sizeBytes: file.bytes.length, data: file.bytes, uploadedBy: actor.userId,
  }).returning();
  await audit(db, actor, 'agency.document_uploaded', 'agency', agencyId, { kind, file: file.name, bytes: file.bytes.length }, agencyId);
  return { id: d.id, fileName: d.fileName };
}

/** Metadata only — never the bytes. */
export async function listAgencyDocuments(db: DB, agencyId: string) {
  return db.select({
    id: agencyDocuments.id, kind: agencyDocuments.kind, fileName: agencyDocuments.fileName, mimeType: agencyDocuments.mimeType,
    sizeBytes: agencyDocuments.sizeBytes, createdAt: agencyDocuments.createdAt,
  }).from(agencyDocuments).where(eq(agencyDocuments.agencyId, agencyId)).orderBy(desc(agencyDocuments.createdAt));
}

export async function readAgencyDocument(db: DB, actor: Actor, docId: string) {
  if (!z.string().uuid().safeParse(docId).success) throw new NotFoundError('Document');
  const [d] = await db.select().from(agencyDocuments).where(eq(agencyDocuments.id, docId));
  if (!d || (!isStaff(actor) && actor.agencyId !== d.agencyId)) throw new NotFoundError('Document');
  return d;
}

export async function updateTaxIds(db: DB, actor: Actor, agencyId: string, input: { pan?: string | null; gstin?: string | null }) {
  if (!isStaff(actor) && !(actor.agencyId === agencyId && actor.agencyRole === 'owner')) throw new ForbiddenError('Only the agency owner can change tax details');
  const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!a) throw new NotFoundError('Agency');
  // Tax identity is part of verification: an approved agency asks HotelBridge to change it.
  if (!isStaff(actor) && a.status === 'verified') throw new AppError('Your agency is verified. Contact HotelBridge to change PAN or GSTIN.');
  const data = taxIdsSchema.parse(input);
  await db.update(agencies).set({ ...data, updatedAt: new Date() }).where(eq(agencies.id, agencyId));
  await audit(db, actor, 'agency.tax_ids', 'agency', agencyId, data, agencyId);
}

export type KycStatus = {
  required: boolean; // Indian agency: PAN + PAN card needed
  pan: { value: string | null; valid: boolean };
  gstin: { value: string | null; valid: boolean; state: string | null; matchesPan: boolean | null };
  documents: Awaited<ReturnType<typeof listAgencyDocuments>>;
  hasPanCard: boolean;
  hasGstCertificate: boolean;
  missing: string[];
  ready: boolean;
};

export async function kycStatus(db: DB, agency: typeof agencies.$inferSelect): Promise<KycStatus> {
  const documents = await listAgencyDocuments(db, agency.id);
  const required = isIndia(agency.country);
  const panValid = !!agency.pan && isPan(agency.pan);
  const gstValid = !!agency.gstin && isGstin(agency.gstin);
  const hasPanCard = documents.some((d) => d.kind === 'pan_card');
  const hasGstCertificate = documents.some((d) => d.kind === 'gst_certificate');
  const missing: string[] = [];
  if (required) {
    if (!panValid) missing.push('PAN number');
    if (!hasPanCard) missing.push('PAN card upload');
    if (gstValid && !hasGstCertificate) missing.push('GST certificate upload (GSTIN given)');
  } else if (documents.length === 0) {
    missing.push('a registration document or trade licence');
  }
  return {
    required,
    pan: { value: agency.pan, valid: panValid },
    gstin: { value: agency.gstin, valid: gstValid, state: agency.gstin ? gstinState(agency.gstin) : null, matchesPan: agency.gstin && agency.pan ? gstinMatchesPan(agency.gstin, agency.pan) : null },
    documents, hasPanCard, hasGstCertificate, missing, ready: missing.length === 0,
  };
}

/** Approval gate used by setAgencyStatus. */
export async function assertReadyToVerify(db: DB, agencyId: string) {
  const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!a) throw new NotFoundError('Agency');
  const k = await kycStatus(db, a);
  if (!k.ready) throw new AppError(`Can't approve yet — missing: ${k.missing.join(', ')}.`);
}

export async function hasDocument(db: DB, agencyId: string, kind: DocumentKind) {
  const [d] = await db.select({ id: agencyDocuments.id }).from(agencyDocuments).where(and(eq(agencyDocuments.agencyId, agencyId), eq(agencyDocuments.kind, kind))).limit(1);
  return !!d;
}
