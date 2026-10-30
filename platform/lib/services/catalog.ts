/* ------------------------------------------------------------------ *
 * Administration of hotels, contracts, rates, allotment, pricing rules,
 * agencies and partner access. Every change is audited; a rate is never
 * bookable until its contract is active and permits distribution.
 * ------------------------------------------------------------------ */
import { and, asc, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { addDays, daysBetween, isIsoDate, nightsOf } from '@/lib/domain/dates';
import { parseMoney } from '@/lib/domain/money';
import { validateTerms, PricingError } from '@/lib/domain/pricing';
import { requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { emailSchema, hashPassword, passwordSchema } from './auth';
import { AppError, NotFoundError, isUniqueViolation } from './errors';

const { hotels, roomTypes, contracts, ratePeriods, restrictions, allocations, pricingRules, agencies, users, partnerApplications } = schema;

export const COLLECTIONS = [
  ['city_centre', 'City centre'], ['station', 'Near the station'], ['airport', 'Airport'], ['business', 'Business'],
  ['premium', 'Premium leisure'], ['group_friendly', 'Groups'], ['value', 'Value'],
] as const;
export const MEAL_PLANS = { RO: 'Room only', BB: 'Breakfast', HB: 'Half board', FB: 'Full board' } as const;

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

export const hotelSchema = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  address: optText(300),
  starRating: z.number().int().min(1).max(5).nullable().optional(),
  starRatingVerified: z.boolean().default(false),
  collections: z.array(z.string()).default([]),
  summary: optText(240),
  description: optText(4000),
  facilities: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  transport: optText(1000),
  checkInTime: optText(10),
  checkOutTime: optText(10),
  groupNotes: optText(1000),
  contactName: optText(120),
  contactEmail: z.string().trim().max(200).optional().transform((v) => v || null),
  reservationsEmail: z.string().trim().max(200).optional().transform((v) => v || null),
});

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export async function createHotel(db: DB, actor: Actor, input: z.input<typeof hotelSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const data = hotelSchema.parse(input);
  const base = slugify(`${data.name}-${data.city}`);
  for (let i = 0; i < 20; i++) {
    try {
      const [h] = await db.insert(hotels).values({ ...data, starRating: data.starRating ?? null, slug: i ? `${base}-${i + 1}` : base, status: 'draft' }).returning();
      await audit(db, actor, 'hotel.created', 'hotel', h.id, { name: h.name, city: h.city });
      return h;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new AppError('Could not create a unique hotel address');
}

export async function updateHotel(db: DB, actor: Actor, id: string, input: z.input<typeof hotelSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const data = hotelSchema.parse(input);
  const [before] = await db.select().from(hotels).where(eq(hotels.id, id));
  if (!before) throw new NotFoundError('Hotel');
  await db.update(hotels).set({ ...data, starRating: data.starRating ?? null, updatedAt: new Date() }).where(eq(hotels.id, id));
  await audit(db, actor, 'hotel.updated', 'hotel', id, { changed: Object.keys(data).filter((k) => JSON.stringify((before as Record<string, unknown>)[k]) !== JSON.stringify((data as Record<string, unknown>)[k])) });
}

export async function setHotelStatus(db: DB, actor: Actor, id: string, status: 'draft' | 'active' | 'inactive') {
  requireStaff(actor, ['admin']);
  if (status === 'active') {
    const [h] = await db.select().from(hotels).where(eq(hotels.id, id));
    if (!h) throw new NotFoundError('Hotel');
    const missing = [!h.description && 'description', !h.address && 'address', !h.facilities.length && 'facilities'].filter(Boolean);
    if (missing.length) throw new AppError(`Complete the hotel profile before publishing: ${missing.join(', ')}`);
  }
  await db.update(hotels).set({ status, updatedAt: new Date() }).where(eq(hotels.id, id));
  await audit(db, actor, `hotel.${status}`, 'hotel', id);
}

export async function setHotelImages(db: DB, actor: Actor, id: string, images: { url: string; alt: string; credit?: string; license?: string }[]) {
  requireStaff(actor, ['admin', 'ops']);
  const parsed = z.array(z.object({
    url: z.string().url().refine((u) => u.startsWith('https://'), 'Images must be https'),
    alt: z.string().trim().min(3, 'Describe the image').max(160),
    credit: z.string().trim().max(160).optional(),
    license: z.string().trim().min(3, 'State the licence or permission').max(200),
  })).max(12).parse(images);
  await db.update(hotels).set({ images: parsed, updatedAt: new Date() }).where(eq(hotels.id, id));
  await audit(db, actor, 'hotel.images', 'hotel', id, { count: parsed.length });
}

export const roomTypeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: optText(500),
  maxAdults: z.number().int().min(1).max(4),
  maxChildren: z.number().int().min(0).max(3),
  maxOccupancy: z.number().int().min(1).max(6),
  bedding: optText(80),
  sizeSqm: z.number().int().min(5).max(500).nullable().optional(),
}).refine((v) => v.maxOccupancy >= v.maxAdults, { message: 'Max occupancy must be at least max adults', path: ['maxOccupancy'] });

export async function addRoomType(db: DB, actor: Actor, hotelId: string, input: z.input<typeof roomTypeSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const data = roomTypeSchema.parse(input);
  const [r] = await db.insert(roomTypes).values({ ...data, sizeSqm: data.sizeSqm ?? null, hotelId }).returning();
  await audit(db, actor, 'room_type.created', 'hotel', hotelId, { name: r.name });
  return r;
}

/* ------------------------------ contracts ------------------------------ */

export const contractSchema = z.object({
  reference: z.string().trim().min(2).max(60),
  inventoryModel: z.enum(['direct_net', 'direct_commissionable', 'request_only']),
  rateBasis: z.enum(['net', 'commissionable']),
  collectionModel: z.enum(['prepaid_to_hb', 'pay_direct_to_hotel']),
  currency: z.enum(['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED', 'THB', 'SGD']),
  validFrom: z.string().refine(isIsoDate, 'Start date required'),
  validTo: z.string().refine(isIsoDate, 'End date required'),
  commissionBps: z.number().int().min(0).max(5000),
  taxMode: z.enum(['included', 'excluded']),
  taxBps: z.number().int().min(0).max(5000),
  localTaxMinor: z.number().int().min(0),
  confirmationMode: z.enum(['instant_allocation', 'on_request']),
  freeCancelDays: z.number().int().min(0).max(365).nullable(),
  latePenaltyType: z.enum(['first_night', 'percent', 'full']),
  latePenaltyBps: z.number().int().min(0).max(10_000),
  nonRefundable: z.boolean(),
  paymentTerms: optText(1000),
  distributionPermitted: z.boolean(),
  documentUrl: z.string().trim().max(500).optional().transform((v) => v || null),
  internalNotes: optText(4000),
}).superRefine((v, ctx) => {
  if (v.validTo < v.validFrom) ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'End must be after start' });
  if (v.inventoryModel === 'direct_net' && v.rateBasis !== 'net') ctx.addIssue({ code: 'custom', path: ['rateBasis'], message: 'Direct net contracts use net rates' });
  if (v.inventoryModel === 'direct_commissionable' && v.rateBasis !== 'commissionable') ctx.addIssue({ code: 'custom', path: ['rateBasis'], message: 'Commissionable contracts use commissionable rates' });
  if (v.inventoryModel === 'request_only' && v.confirmationMode !== 'on_request') ctx.addIssue({ code: 'custom', path: ['confirmationMode'], message: 'Request-only contracts confirm on request' });
  if (v.latePenaltyType === 'percent' && v.latePenaltyBps === 0) ctx.addIssue({ code: 'custom', path: ['latePenaltyBps'], message: 'Set the late cancellation percentage' });
  try {
    validateTerms({ currency: v.currency, rateBasis: v.rateBasis, collectionModel: v.collectionModel, taxMode: v.taxMode, taxBps: v.taxBps, commissionBps: v.commissionBps, localTaxMinor: v.localTaxMinor });
  } catch (e) {
    if (e instanceof PricingError) ctx.addIssue({ code: 'custom', path: ['rateBasis'], message: e.message });
  }
});

export async function createContract(db: DB, actor: Actor, hotelId: string, input: z.input<typeof contractSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const data = contractSchema.parse(input);
  const [c] = await db.insert(contracts).values({ ...data, hotelId, status: 'draft' }).returning();
  await audit(db, actor, 'contract.created', 'contract', c.id, { reference: c.reference, hotelId });
  return c;
}

export async function updateContract(db: DB, actor: Actor, id: string, input: z.input<typeof contractSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const data = contractSchema.parse(input);
  const [before] = await db.select().from(contracts).where(eq(contracts.id, id));
  if (!before) throw new NotFoundError('Contract');
  const changed = Object.keys(data).filter((k) => (before as Record<string, unknown>)[k] !== (data as Record<string, unknown>)[k]);
  // Changing a live contract's commercial terms sends it back for approval.
  const commercial = changed.filter((k) => !['internalNotes', 'documentUrl', 'paymentTerms'].includes(k));
  const status = before.status === 'active' && commercial.length ? 'draft' : before.status;
  await db.update(contracts).set({ ...data, status, version: before.version + (changed.length ? 1 : 0), updatedAt: new Date() }).where(eq(contracts.id, id));
  await audit(db, actor, 'contract.updated', 'contract', id, {
    version: before.version + 1, changed: Object.fromEntries(changed.map((k) => [k, { from: (before as Record<string, unknown>)[k], to: (data as Record<string, unknown>)[k] }])),
    reapprovalRequired: status !== before.status,
  });
}

export async function setContractStatus(db: DB, actor: Actor, id: string, status: 'active' | 'suspended' | 'draft') {
  requireStaff(actor, status === 'active' ? ['admin'] : ['admin', 'ops']);
  const [c] = await db.select().from(contracts).where(eq(contracts.id, id));
  if (!c) throw new NotFoundError('Contract');
  if (status === 'active') {
    const problems: string[] = [];
    if (!c.distributionPermitted) problems.push('distribution to B2B agents is not confirmed as permitted');
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(ratePeriods).where(and(eq(ratePeriods.contractId, id), eq(ratePeriods.active, true)));
    if (n === 0) problems.push('no rates are loaded');
    const [h] = await db.select().from(hotels).where(eq(hotels.id, c.hotelId));
    if (h?.status !== 'active') problems.push('the hotel profile is not published');
    if (problems.length) throw new AppError(`Cannot activate: ${problems.join('; ')}.`);
  }
  await db.update(contracts).set({
    status, updatedAt: new Date(),
    ...(status === 'active' ? { approvedBy: actor.userId, approvedAt: new Date() } : {}),
  }).where(eq(contracts.id, id));
  await audit(db, actor, `contract.${status}`, 'contract', id, { version: c.version });
}

export const ratePeriodSchema = z.object({
  roomTypeId: z.string().uuid(),
  mealPlan: z.enum(['RO', 'BB', 'HB', 'FB']),
  dateFrom: z.string().refine(isIsoDate),
  dateTo: z.string().refine(isIsoDate),
  price1Minor: z.number().int().positive().nullable(),
  price2Minor: z.number().int().positive().nullable(),
  price3Minor: z.number().int().positive().nullable(),
  childMinor: z.number().int().min(0).nullable(),
  minStay: z.number().int().min(1).max(30),
  releaseDays: z.number().int().min(0).max(90),
}).refine((v) => v.dateTo >= v.dateFrom, { message: 'End must be after start', path: ['dateTo'] })
  .refine((v) => v.price1Minor != null || v.price2Minor != null || v.price3Minor != null, { message: 'Enter at least one occupancy price', path: ['price2Minor'] });

async function assertNoOverlap(db: DB, contractId: string, r: { roomTypeId: string; mealPlan: string; dateFrom: string; dateTo: string }, exceptId?: string) {
  const clash = await db.select({ id: ratePeriods.id }).from(ratePeriods).where(and(
    eq(ratePeriods.contractId, contractId), eq(ratePeriods.roomTypeId, r.roomTypeId), eq(ratePeriods.mealPlan, r.mealPlan), eq(ratePeriods.active, true),
    lte(ratePeriods.dateFrom, r.dateTo), gte(ratePeriods.dateTo, r.dateFrom), exceptId ? ne(ratePeriods.id, exceptId) : undefined,
  ));
  if (clash.length) throw new AppError(`Rates for this room and meal plan already cover part of ${r.dateFrom} – ${r.dateTo}. Deactivate the old period first.`);
}

export async function addRatePeriod(db: DB, actor: Actor, contractId: string, input: z.infer<typeof ratePeriodSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const data = ratePeriodSchema.parse(input);
  const [c] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!c) throw new NotFoundError('Contract');
  if (data.dateFrom < c.validFrom || data.dateTo > c.validTo) throw new AppError('Rate dates must fall inside the contract validity');
  const [rt] = await db.select().from(roomTypes).where(and(eq(roomTypes.id, data.roomTypeId), eq(roomTypes.hotelId, c.hotelId)));
  if (!rt) throw new AppError('Room type does not belong to this hotel');
  await assertNoOverlap(db, contractId, data);
  const [r] = await db.insert(ratePeriods).values({ ...data, contractId }).returning();
  await db.update(contracts).set({ version: c.version + 1, updatedAt: new Date() }).where(eq(contracts.id, contractId));
  await audit(db, actor, 'rate.added', 'contract', contractId, { ...data, version: c.version + 1 });
  return r;
}

export async function deactivateRatePeriod(db: DB, actor: Actor, id: string) {
  requireStaff(actor, ['admin', 'ops']);
  const [r] = await db.update(ratePeriods).set({ active: false }).where(eq(ratePeriods.id, id)).returning();
  if (!r) throw new NotFoundError('Rate');
  await audit(db, actor, 'rate.deactivated', 'contract', r.contractId, { rate: r });
}

/* Rate sheet import: one line per period.
 * room_type,meal_plan,from,to,single,double,triple,child,min_stay,release */
export type ImportRow = z.infer<typeof ratePeriodSchema> & { line: number; roomName: string };

export async function parseRateSheet(db: DB, contractId: string, csv: string): Promise<{ rows: ImportRow[]; errors: string[] }> {
  const [c] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!c) throw new NotFoundError('Contract');
  const rts = await db.select().from(roomTypes).where(eq(roomTypes.hotelId, c.hotelId));
  const errors: string[] = [];
  const rows: ImportRow[] = [];
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines[0]?.toLowerCase().startsWith('room_type')) lines.shift();
  const price = (v: string | undefined, line: number, label: string) => {
    if (!v) return null;
    try { return parseMoney(v, c.currency); } catch { errors.push(`Line ${line}: ${label} "${v}" is not an amount`); return null; }
  };
  lines.forEach((l, idx) => {
    const line = idx + 1;
    const cells = l.split(/[,;\t]/).map((x) => x.trim());
    const [room, meal, from, to, p1, p2, p3, child, minStay, release] = cells;
    const rt = rts.find((r) => r.name.toLowerCase() === (room ?? '').toLowerCase());
    if (!rt) { errors.push(`Line ${line}: unknown room type "${room}". Known: ${rts.map((r) => r.name).join(', ') || 'none — add room types first'}`); return; }
    const candidate = {
      roomTypeId: rt.id, mealPlan: (meal ?? '').toUpperCase(), dateFrom: from, dateTo: to,
      price1Minor: price(p1, line, 'single'), price2Minor: price(p2, line, 'double'), price3Minor: price(p3, line, 'triple'),
      childMinor: price(child, line, 'child'), minStay: Number(minStay || 1), releaseDays: Number(release || 0),
    };
    const parsed = ratePeriodSchema.safeParse(candidate);
    if (!parsed.success) { errors.push(`Line ${line}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`); return; }
    if (parsed.data.dateFrom < c.validFrom || parsed.data.dateTo > c.validTo) { errors.push(`Line ${line}: outside contract validity ${c.validFrom} – ${c.validTo}`); return; }
    const dupe = rows.find((r) => r.roomTypeId === parsed.data.roomTypeId && r.mealPlan === parsed.data.mealPlan && r.dateFrom <= parsed.data.dateTo && r.dateTo >= parsed.data.dateFrom);
    if (dupe) { errors.push(`Line ${line}: overlaps line ${dupe.line}`); return; }
    rows.push({ ...parsed.data, line, roomName: rt.name });
  });
  return { rows, errors };
}

export async function importRateSheet(db: DB, actor: Actor, contractId: string, csv: string) {
  requireStaff(actor, ['admin', 'ops']);
  const { rows, errors } = await parseRateSheet(db, contractId, csv);
  if (errors.length) throw new AppError(`Nothing imported. Fix these first:\n${errors.join('\n')}`);
  if (!rows.length) throw new AppError('The sheet has no rate lines');
  await db.transaction(async (tx) => {
    for (const r of rows) {
      await assertNoOverlap(tx as unknown as DB, contractId, r);
      const { line: _line, roomName: _name, ...data } = r;
      void _line; void _name;
      await tx.insert(ratePeriods).values({ ...data, contractId });
    }
    await tx.update(contracts).set({ version: sql`${contracts.version} + 1`, updatedAt: new Date() }).where(eq(contracts.id, contractId));
  });
  await audit(db, actor, 'rate.imported', 'contract', contractId, { lines: rows.length });
  return rows.length;
}

export const restrictionSchema = z.object({
  roomTypeId: z.string().uuid().nullable(),
  kind: z.enum(['blackout', 'stop_sell', 'supplement']),
  dateFrom: z.string().refine(isIsoDate),
  dateTo: z.string().refine(isIsoDate),
  amountMinor: z.number().int().positive().nullable(),
  note: optText(300),
}).refine((v) => v.dateTo >= v.dateFrom, { message: 'End must be after start', path: ['dateTo'] })
  .refine((v) => v.kind !== 'supplement' || v.amountMinor != null, { message: 'Supplements need an amount', path: ['amountMinor'] });

export async function addRestriction(db: DB, actor: Actor, contractId: string, input: z.input<typeof restrictionSchema>) {
  requireStaff(actor, ['admin', 'ops']);
  const data = restrictionSchema.parse(input);
  const [r] = await db.insert(restrictions).values({ ...data, contractId }).returning();
  await audit(db, actor, `restriction.${data.kind}`, 'contract', contractId, data);
  return r;
}

export async function removeRestriction(db: DB, actor: Actor, id: string) {
  requireStaff(actor, ['admin', 'ops']);
  const [r] = await db.delete(restrictions).where(eq(restrictions.id, id)).returning();
  if (r) await audit(db, actor, 'restriction.removed', 'contract', r.contractId, r);
}

/** Set allotment for every night in a range. Never below what is already sold. */
export async function setAllocation(db: DB, actor: Actor, contractId: string, input: { roomTypeId: string; dateFrom: string; dateTo: string; rooms: number }) {
  requireStaff(actor, ['admin', 'ops']);
  if (!isIsoDate(input.dateFrom) || !isIsoDate(input.dateTo) || input.dateTo < input.dateFrom) throw new AppError('Choose a valid date range');
  if (daysBetween(input.dateFrom, input.dateTo) > 400) throw new AppError('Set allotment at most ~13 months at a time');
  const rooms = z.number().int().min(0).max(500).parse(input.rooms);
  const nights = nightsOf(input.dateFrom, addDays(input.dateTo, 1));
  const existing = await db.select().from(allocations).where(and(eq(allocations.contractId, contractId), eq(allocations.roomTypeId, input.roomTypeId), gte(allocations.night, input.dateFrom), lte(allocations.night, input.dateTo)));
  const oversold = existing.filter((a) => a.sold > rooms);
  if (oversold.length) throw new AppError(`Already sold more than ${rooms} on ${oversold.slice(0, 3).map((a) => a.night).join(', ')}`);
  await db.transaction(async (tx) => {
    for (const night of nights) {
      await tx.insert(allocations).values({ contractId, roomTypeId: input.roomTypeId, night, total: rooms, sold: 0 })
        .onConflictDoUpdate({ target: [allocations.contractId, allocations.roomTypeId, allocations.night], set: { total: rooms } });
    }
  });
  await audit(db, actor, 'allocation.set', 'contract', contractId, input);
}

export async function contractDetail(db: DB, id: string) {
  const [c] = await db.select().from(contracts).where(eq(contracts.id, id));
  if (!c) throw new NotFoundError('Contract');
  const [hotel] = await db.select().from(hotels).where(eq(hotels.id, c.hotelId));
  const [rts, rates, restr, allots] = await Promise.all([
    db.select().from(roomTypes).where(eq(roomTypes.hotelId, c.hotelId)).orderBy(asc(roomTypes.name)),
    db.select().from(ratePeriods).where(eq(ratePeriods.contractId, id)).orderBy(asc(ratePeriods.dateFrom)),
    db.select().from(restrictions).where(eq(restrictions.contractId, id)).orderBy(asc(restrictions.dateFrom)),
    db.select({
      roomTypeId: allocations.roomTypeId, from: sql<string>`min(${allocations.night})::text`, to: sql<string>`max(${allocations.night})::text`,
      total: sql<number>`sum(${allocations.total})::int`, sold: sql<number>`sum(${allocations.sold})::int`, nights: sql<number>`count(*)::int`,
    }).from(allocations).where(eq(allocations.contractId, id)).groupBy(allocations.roomTypeId),
  ]);
  return { contract: c, hotel, roomTypes: rts, rates, restrictions: restr, allocations: allots };
}

/* ---------------------------- pricing rules ---------------------------- */

export const ruleSchema = z.object({
  agencyId: z.string().uuid().nullable(),
  hotelId: z.string().uuid().nullable(),
  kind: z.enum(['percent', 'fixed']),
  valueBps: z.number().int().min(0).max(5000).nullable(),
  fixedMinor: z.number().int().min(0).nullable(),
  currency: z.string().length(3).nullable(),
  agentCommissionShareBps: z.number().int().min(0).max(10_000).nullable(),
  rounding: z.enum(['none', 'whole_unit']),
  note: optText(300),
}).refine((v) => v.kind !== 'percent' || v.valueBps != null, { message: 'Set the markup percentage', path: ['valueBps'] })
  .refine((v) => v.kind !== 'fixed' || (v.fixedMinor != null && v.currency), { message: 'Fixed markups need an amount and currency', path: ['fixedMinor'] });

export async function addPricingRule(db: DB, actor: Actor, input: z.input<typeof ruleSchema>) {
  requireStaff(actor, ['admin', 'finance']);
  const data = ruleSchema.parse(input);
  // One active rule per scope: the new one replaces the old.
  await db.update(pricingRules).set({ active: false }).where(and(
    eq(pricingRules.active, true),
    data.agencyId ? eq(pricingRules.agencyId, data.agencyId) : sql`${pricingRules.agencyId} is null`,
    data.hotelId ? eq(pricingRules.hotelId, data.hotelId) : sql`${pricingRules.hotelId} is null`,
  ));
  const [r] = await db.insert(pricingRules).values(data).returning();
  await audit(db, actor, 'pricing_rule.set', 'pricing_rule', r.id, data, data.agencyId);
  return r;
}

/* ------------------------------ agencies ------------------------------ */

export async function setAgencyStatus(db: DB, actor: Actor, agencyId: string, status: 'verified' | 'rejected' | 'suspended' | 'pending', note?: string) {
  requireStaff(actor, ['admin', 'ops']);
  const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!a) throw new NotFoundError('Agency');
  await db.update(agencies).set({
    status, updatedAt: new Date(), internalNotes: note ? `${a.internalNotes ? a.internalNotes + '\n' : ''}${new Date().toISOString().slice(0, 10)}: ${note}` : a.internalNotes,
    ...(status === 'verified' ? { verifiedBy: actor.userId, verifiedAt: new Date() } : {}),
  }).where(eq(agencies.id, agencyId));
  await audit(db, actor, `agency.${status}`, 'agency', agencyId, { from: a.status, note }, agencyId);
}

export async function setAgencyCredit(db: DB, actor: Actor, agencyId: string, input: { enabled: boolean; limitMinor: number; termsDays: number; note: string }) {
  requireStaff(actor, ['admin', 'finance']);
  const note = z.string().trim().min(5, 'Record why credit was approved (who approved, on what basis)').max(500).parse(input.note);
  const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!a) throw new NotFoundError('Agency');
  if (input.enabled && a.status !== 'verified') throw new AppError('Only verified agencies can have credit');
  await db.update(agencies).set({
    creditEnabled: input.enabled, creditLimitMinor: z.number().int().min(0).parse(input.limitMinor),
    paymentTermsDays: z.number().int().min(0).max(90).parse(input.termsDays), updatedAt: new Date(),
  }).where(eq(agencies.id, agencyId));
  await audit(db, actor, 'agency.credit', 'agency', agencyId, { ...input, note, previous: { enabled: a.creditEnabled, limit: a.creditLimitMinor } }, agencyId);
}

/* ------------------------------ partners ------------------------------ */

export const partnerApplicationSchema = z.object({
  kind: z.enum(['hotel', 'distribution']),
  organisation: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: optText(40),
  city: optText(80),
  country: optText(80),
  website: optText(200),
  rooms: z.number().int().min(1).max(5000).nullable().optional(),
  message: optText(2000),
});

export async function submitPartnerApplication(db: DB, input: z.input<typeof partnerApplicationSchema>) {
  const data = partnerApplicationSchema.parse(input);
  // Basic flood protection: one application per email per day.
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(partnerApplications)
    .where(and(eq(partnerApplications.email, data.email), gte(partnerApplications.createdAt, new Date(Date.now() - 86_400_000))));
  if (n > 0) throw new AppError('We already have your application from today — we will be in touch.');
  const [a] = await db.insert(partnerApplications).values({ ...data, rooms: data.rooms ?? null }).returning();
  return a;
}

export async function createPartnerUser(db: DB, actor: Actor, input: { hotelId: string; name: string; email: string; password: string }) {
  requireStaff(actor, ['admin']);
  const [h] = await db.select().from(hotels).where(eq(hotels.id, input.hotelId));
  if (!h) throw new NotFoundError('Hotel');
  try {
    const [u] = await db.insert(users).values({
      email: emailSchema.parse(input.email), name: z.string().trim().min(2).parse(input.name),
      passwordHash: await hashPassword(passwordSchema.parse(input.password)), partnerHotelId: h.id,
    }).returning();
    await audit(db, actor, 'partner.user_created', 'hotel', h.id, { email: u.email });
    return u;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError('That email already has an account');
    throw e;
  }
}

export async function listHotelsAdmin(db: DB) {
  return db.select({
    h: hotels,
    contracts: sql<number>`(select count(*)::int from contracts c where c.hotel_id = ${hotels.id})`,
    activeContracts: sql<number>`(select count(*)::int from contracts c where c.hotel_id = ${hotels.id} and c.status = 'active')`,
  }).from(hotels).orderBy(asc(hotels.city), asc(hotels.name));
}

export async function listAgencies(db: DB) {
  return db.select({
    a: agencies,
    users: sql<number>`(select count(*)::int from users u where u.agency_id = ${agencies.id})`,
    bookings: sql<number>`(select count(*)::int from bookings b where b.agency_id = ${agencies.id})`,
  }).from(agencies).orderBy(desc(agencies.createdAt));
}
