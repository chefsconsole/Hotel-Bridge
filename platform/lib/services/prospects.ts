/* ------------------------------------------------------------------ *
 * Hotel outreach: the hotels we want to sign, worked like a sales
 * pipeline. Imported from the research tracker CSV, then updated by sales
 * as conversations happen. Prospects are never shown to agents — only a
 * signed contract in the catalogue makes a hotel sellable.
 * ------------------------------------------------------------------ */
import { and, asc, eq, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { PROSPECT_STAGES } from '@/lib/db/schema';
import { isIsoDate, todayIso } from '@/lib/domain/dates';
import { requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { AppError, NotFoundError } from './errors';

const { hotelProspects } = schema;
const SALES = ['admin', 'sales', 'ops'] as const;

export const STAGE_LABEL: Record<string, string> = {
  to_contact: 'To contact', contacted: 'Contacted', in_talks: 'In talks', rates_received: 'Rates received',
  signed: 'Signed', declined: 'Declined', not_now: 'Not now',
};
export const OPEN_STAGES = ['to_contact', 'contacted', 'in_talks', 'rates_received'];

/** Minimal RFC-4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const STATUS_FROM_CSV: Record<string, string> = {
  'to contact': 'to_contact', contacted: 'contacted', 'in talks': 'in_talks', 'rates received': 'rates_received',
  signed: 'signed', declined: 'declined', 'not now': 'not_now',
};

/** Imports the research tracker (docs/hotel-targets.csv). Existing hotels (same name and destination) are left as they are. */
export async function importProspects(db: DB, actor: Actor, csv: string) {
  requireStaff(actor, [...SALES]);
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new AppError('The file has no rows');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const need = ['hotel', 'destination'];
  for (const n of need) if (col(n) < 0) throw new AppError(`Missing column "${n}". Use the hotel-targets.csv layout.`);
  const get = (r: string[], name: string) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '');
  const values = rows.slice(1).map((r) => ({
    name: get(r, 'hotel'), destination: get(r, 'destination'), region: get(r, 'region') || null,
    tier: get(r, 'tier') || null, bestFor: get(r, 'best_for') || null,
    totalRooms: /^\d{1,5}$/.test(get(r, 'total_rooms')) ? Number(get(r, 'total_rooms')) : null,
    priority: /^P[123]$/.test(get(r, 'priority')) ? get(r, 'priority') : 'P2',
    nameChecked: get(r, 'name_checked').toLowerCase() === 'yes',
    stage: STATUS_FROM_CSV[get(r, 'status').toLowerCase()] ?? 'to_contact',
    contactName: get(r, 'contact_person') || null, contactSource: get(r, 'contact_found_on') || null,
    nextStep: get(r, 'next_step') || null, rateType: get(r, 'rate_type') || null, notes: get(r, 'notes') || null,
  })).filter((v) => v.name.length >= 2 && v.destination.length >= 2);
  if (!values.length) throw new AppError('No hotels found in the file');
  let added = 0;
  for (let i = 0; i < values.length; i += 100) {
    const res = await db.insert(hotelProspects).values(values.slice(i, i + 100)).onConflictDoNothing().returning();
    added += res.length;
  }
  // Fill in room counts the research has added since the last import (never overwrites what sales typed).
  for (const v of values.filter((x) => x.totalRooms)) {
    await db.update(hotelProspects).set({ totalRooms: v.totalRooms }).where(and(eq(hotelProspects.name, v.name), eq(hotelProspects.destination, v.destination), isNull(hotelProspects.totalRooms)));
  }
  await audit(db, actor, 'prospects.imported', 'hotel_prospect', null, { rows: values.length, added });
  return { rows: values.length, added, skipped: values.length - added };
}

export async function listProspects(db: DB, filter: { stage?: string; priority?: string; destination?: string; q?: string; due?: boolean; ownerId?: string } = {}) {
  const term = filter.q?.trim();
  const stages = filter.stage === 'open' ? OPEN_STAGES : filter.stage && filter.stage !== 'all' ? [filter.stage] : null;
  return db.select().from(hotelProspects).where(and(
    stages ? inArray(hotelProspects.stage, stages) : undefined,
    filter.priority ? eq(hotelProspects.priority, filter.priority) : undefined,
    filter.destination ? eq(hotelProspects.destination, filter.destination) : undefined,
    filter.ownerId ? eq(hotelProspects.ownerId, filter.ownerId) : undefined,
    filter.due ? and(lte(hotelProspects.nextStepOn, todayIso()), inArray(hotelProspects.stage, OPEN_STAGES)) : undefined,
    term ? or(ilike(hotelProspects.name, `%${term}%`), ilike(hotelProspects.destination, `%${term}%`), ilike(hotelProspects.contactName, `%${term}%`)) : undefined,
  )).orderBy(asc(hotelProspects.priority), asc(hotelProspects.destination), asc(hotelProspects.name));
}

export async function prospectStats(db: DB) {
  const rows = await db.select({ stage: hotelProspects.stage, n: sql<number>`count(*)::int` }).from(hotelProspects).groupBy(hotelProspects.stage);
  const [due] = await db.select({ n: sql<number>`count(*)::int` }).from(hotelProspects)
    .where(and(lte(hotelProspects.nextStepOn, todayIso()), inArray(hotelProspects.stage, OPEN_STAGES)));
  const by = Object.fromEntries(rows.map((r) => [r.stage, r.n])) as Record<string, number>;
  return { by, total: rows.reduce((s, r) => s + r.n, 0), due: due?.n ?? 0 };
}

export async function prospectDestinations(db: DB) {
  return (await db.selectDistinct({ d: hotelProspects.destination }).from(hotelProspects).orderBy(asc(hotelProspects.destination))).map((r) => r.d);
}

export async function getProspect(db: DB, id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new NotFoundError('Hotel');
  const [p] = await db.select().from(hotelProspects).where(eq(hotelProspects.id, id));
  if (!p) throw new NotFoundError('Hotel');
  return p;
}

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
export const prospectUpdateSchema = z.object({
  stage: z.enum(PROSPECT_STAGES),
  priority: z.enum(['P1', 'P2', 'P3']),
  ownerId: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => v || null),
  contactName: opt(120), contactRole: opt(120),
  contactEmail: opt(160).refine((v) => v == null || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
  contactPhone: opt(40), contactSource: opt(200),
  rateType: z.enum(['net', 'commissionable', 'either']).optional().nullable().or(z.literal('')).transform((v) => v || null),
  nextStep: opt(200),
  nextStepOn: z.string().optional().nullable().transform((v) => v || null).refine((v) => v == null || isIsoDate(v), 'Use a valid date'),
  lastContactOn: z.string().optional().nullable().transform((v) => v || null).refine((v) => v == null || isIsoDate(v), 'Use a valid date'),
  notes: opt(4000),
});

export async function updateProspect(db: DB, actor: Actor, id: string, input: z.input<typeof prospectUpdateSchema>) {
  requireStaff(actor, [...SALES]);
  const before = await getProspect(db, id);
  const data = prospectUpdateSchema.parse(input);
  if (data.lastContactOn && data.lastContactOn > todayIso()) throw new AppError('Last contact cannot be in the future');
  const [p] = await db.update(hotelProspects).set({ ...data, updatedAt: new Date() }).where(eq(hotelProspects.id, before.id)).returning();
  if (before.stage !== p.stage) await audit(db, actor, 'prospect.stage', 'hotel_prospect', p.id, { name: p.name, from: before.stage, to: p.stage });
  return p;
}

/** Quick log from the list: "contacted today, next step X on Y". */
export async function logContact(db: DB, actor: Actor, id: string, input: { note?: string | null; nextStep?: string | null; nextStepOn?: string | null }) {
  requireStaff(actor, [...SALES]);
  const p = await getProspect(db, id);
  const today = todayIso();
  if (input.nextStepOn && (!isIsoDate(input.nextStepOn) || input.nextStepOn < today)) throw new AppError('Next step date must be today or later');
  const note = input.note?.trim();
  const [u] = await db.update(hotelProspects).set({
    lastContactOn: today,
    stage: p.stage === 'to_contact' ? 'contacted' : p.stage,
    nextStep: input.nextStep?.trim() || p.nextStep,
    nextStepOn: input.nextStepOn || null,
    notes: note ? `${today} — ${note}${p.notes ? '\n' + p.notes : ''}`.slice(0, 4000) : p.notes,
    ownerId: p.ownerId ?? actor.userId,
    updatedAt: new Date(),
  }).where(eq(hotelProspects.id, p.id)).returning();
  return u;
}

export async function linkProspectToHotel(db: DB, actor: Actor, id: string, hotelId: string) {
  requireStaff(actor, [...SALES]);
  const p = await getProspect(db, id);
  if (!z.string().uuid().safeParse(hotelId).success) throw new NotFoundError('Hotel');
  const [h] = await db.select({ id: schema.hotels.id }).from(schema.hotels).where(eq(schema.hotels.id, hotelId));
  if (!h) throw new NotFoundError('Hotel');
  await db.update(hotelProspects).set({ hotelId, stage: 'signed', updatedAt: new Date() }).where(eq(hotelProspects.id, p.id));
  await audit(db, actor, 'prospect.signed', 'hotel_prospect', p.id, { name: p.name, hotelId });
}
