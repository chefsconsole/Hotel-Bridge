/* ------------------------------------------------------------------ *
 * The ledger. Append-only (a database trigger refuses UPDATE/DELETE).
 * Sign convention per account:
 *   agent:      + the agent owes us      - the agent paid / was credited
 *   supplier:   + we owe the supplier    - we paid the supplier
 *   commission: + a hotel owes us        - the hotel paid
 *
 * The agency WALLET is the agent account's rows with no booking:
 *   wallet_credit  -  money moved in (e.g. a cancelled booking's refund)
 *   wallet_debit   +  wallet used to pay a booking
 *   wallet_payout  +  wallet paid out to the agency's bank
 * so wallet balance = -(sum of those rows), per currency. A booking that
 * hands its credit to the wallet gets a matching wallet_transfer (+) row,
 * keeping booking and wallet in balance.
 * ------------------------------------------------------------------ */
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { schema, type Executor } from '@/lib/db';
import { actorId, type Actor } from './actor';
import { nextNumber } from './counters';

const { ledgerEntries, invoices } = schema;

export type Entry = {
  bookingId?: string | null; agencyId?: string | null; hotelId?: string | null;
  kind: string; account: 'agent' | 'supplier' | 'commission';
  amountMinor: number; currency: string; reference?: string | null; memo?: string | null;
};

export async function post(db: Executor, actor: Actor, entries: Entry[]) {
  if (!entries.length) return;
  for (const e of entries) {
    if (!Number.isSafeInteger(e.amountMinor)) throw new Error('Ledger amounts must be integer minor units');
  }
  await db.insert(ledgerEntries).values(entries.map((e) => ({ ...e, createdBy: actorId(actor) })));
}

export async function balances(db: Executor, bookingId: string) {
  const rows = await db.select({
    account: ledgerEntries.account, kind: ledgerEntries.kind, currency: ledgerEntries.currency,
    total: sql<string>`sum(${ledgerEntries.amountMinor})`,
  }).from(ledgerEntries).where(eq(ledgerEntries.bookingId, bookingId)).groupBy(ledgerEntries.account, ledgerEntries.kind, ledgerEntries.currency);
  const sum = (pred: (r: typeof rows[number]) => boolean) => rows.filter(pred).reduce((s, r) => s + Number(r.total), 0);
  return {
    agentBalance: sum((r) => r.account === 'agent'),
    agentPaid: -sum((r) => r.account === 'agent' && r.kind === 'agent_payment') || 0,
    agentRefunded: sum((r) => r.account === 'agent' && r.kind === 'agent_refund'),
    walletCredited: sum((r) => r.account === 'agent' && r.kind === 'wallet_transfer'),
    agentCharged: sum((r) => r.account === 'agent' && ['agent_charge', 'reversal', 'cancellation_fee', 'adjustment'].includes(r.kind)),
    supplierBalance: sum((r) => r.account === 'supplier'),
    commissionBalance: sum((r) => r.account === 'commission'),
    hasCharge: rows.some((r) => r.kind === 'agent_charge'),
    hasSupplierPayable: rows.some((r) => r.kind === 'supplier_payable'),
    hasCommission: rows.some((r) => r.kind === 'commission_receivable'),
  };
}

/** What an agency owes across all its bookings, per currency (for credit checks). */
export async function agencyOutstanding(db: Executor, agencyId: string, currency: string): Promise<number> {
  const [r] = await db.select({ total: sql<string>`coalesce(sum(${ledgerEntries.amountMinor}), 0)` }).from(ledgerEntries)
    .where(and(eq(ledgerEntries.agencyId, agencyId), eq(ledgerEntries.account, 'agent'), eq(ledgerEntries.currency, currency)));
  return Number(r.total);
}

export async function issueInvoice(db: Executor, args: {
  agencyId: string; bookingId: string; kind: 'invoice' | 'credit_note'; currency: string;
  totalMinor: number; taxMinor: number; lines: { label: string; amountMinor: number }[]; dueAt?: Date | null;
}) {
  const year = new Date().getUTCFullYear();
  const prefix = args.kind === 'invoice' ? 'HB-INV' : 'HB-CN';
  const n = await nextNumber(db, `${prefix}-${year}`);
  const [inv] = await db.insert(invoices).values({
    number: `${prefix}-${year}-${String(n).padStart(5, '0')}`,
    agencyId: args.agencyId, bookingId: args.bookingId, kind: args.kind, currency: args.currency,
    totalMinor: args.totalMinor, taxMinor: args.taxMinor, lines: args.lines, dueAt: args.dueAt ?? null,
  }).returning();
  return inv;
}

/* ------------------------------ wallet ------------------------------ */

/** Credit available in the agency's wallet, per currency (positive = theirs to use). */
export async function walletBalances(db: Executor, agencyId: string): Promise<{ currency: string; minor: number }[]> {
  const rows = await db.select({ currency: ledgerEntries.currency, total: sql<string>`coalesce(sum(${ledgerEntries.amountMinor}), 0)` })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.agencyId, agencyId), eq(ledgerEntries.account, 'agent'), isNull(ledgerEntries.bookingId)))
    .groupBy(ledgerEntries.currency);
  return rows.map((r) => ({ currency: r.currency, minor: -Number(r.total) })).filter((r) => r.minor !== 0);
}

export async function walletBalance(db: Executor, agencyId: string, currency: string): Promise<number> {
  return (await walletBalances(db, agencyId)).find((w) => w.currency === currency)?.minor ?? 0;
}

export async function walletHistory(db: Executor, agencyId: string, limit = 50) {
  return db.select().from(ledgerEntries)
    .where(and(eq(ledgerEntries.agencyId, agencyId), eq(ledgerEntries.account, 'agent'), isNull(ledgerEntries.bookingId)))
    .orderBy(desc(ledgerEntries.createdAt)).limit(limit);
}

/** Moves whatever a booking owes back to the agent into the agency wallet. */
export async function creditBookingToWallet(db: Executor, actor: Actor, b: { id: string; agencyId: string; reference: string; currency: string }, memo: string) {
  const bal = await balances(db, b.id);
  if (bal.agentBalance >= 0) return 0;
  const amount = -bal.agentBalance;
  await post(db, actor, [
    { bookingId: b.id, agencyId: b.agencyId, kind: 'wallet_transfer', account: 'agent', amountMinor: amount, currency: b.currency, reference: b.reference, memo: 'Moved to wallet' },
    { bookingId: null, agencyId: b.agencyId, kind: 'wallet_credit', account: 'agent', amountMinor: -amount, currency: b.currency, reference: b.reference, memo },
  ]);
  return amount;
}

/** Serialises wallet spending per agency inside a transaction. */
export async function lockWallet(db: Executor, agencyId: string) {
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${'wallet:' + agencyId}))`);
}

/* --------------------------- invoices, for staff --------------------------- */

export type InvoiceRow = {
  id: string; number: string; kind: string; currency: string;
  totalMinor: number; taxMinor: number; issuedAt: Date; dueAt: Date | null;
  lines: { label: string; amountMinor: number }[];
  agencyId: string; agencyName: string; agencyCode: string | null;
  bookingId: string | null; bookingRef: string | null;
  /** What is still unsettled on the invoice's booking, from the ledger. Null
   *  for an invoice with no booking, where there is no balance to read. */
  outstandingMinor: number | null;
};

export type InvoiceFilter = { kind?: string; agencyId?: string; q?: string; unpaid?: boolean; limit?: number };

/* Every invoice we have issued, across agencies — the staff-side counterpart
 * of /agent/finance, which shows one agency its own.
 *
 * "Outstanding" is the booking's agent-account balance in the ledger, not a
 * field on the invoice: an invoice is a document, and what is owed is decided
 * by the money that has moved since. A credit note is shown at its face value
 * and never netted off here — netting is the ledger's job, and doing it twice
 * would understate what an agency owes. */
export async function listInvoices(db: Executor, filter: InvoiceFilter = {}): Promise<InvoiceRow[]> {
  const term = filter.q?.trim();
  const rows = await db.select({
    inv: invoices,
    agencyName: schema.agencies.name,
    agencyCode: schema.agencies.code,
    bookingRef: schema.bookings.reference,
    outstanding: sql<string | null>`(
      select sum(l.amount_minor) from ledger_entries l
      where l.booking_id = ${invoices.bookingId} and l.account = 'agent' and l.currency = ${invoices.currency}
    )`,
  }).from(invoices)
    .innerJoin(schema.agencies, eq(schema.agencies.id, invoices.agencyId))
    .leftJoin(schema.bookings, eq(schema.bookings.id, invoices.bookingId))
    .where(and(
      filter.kind && filter.kind !== 'all' ? eq(invoices.kind, filter.kind) : undefined,
      filter.agencyId ? eq(invoices.agencyId, filter.agencyId) : undefined,
      term ? sql`(${invoices.number} ilike ${'%' + term + '%'} or ${schema.agencies.name} ilike ${'%' + term + '%'} or coalesce(${schema.bookings.reference}, '') ilike ${'%' + term + '%'})` : undefined,
    ))
    /* Number breaks the tie: two invoices raised in the same instant (a
     * booking and its amendment, or a cancellation credit note) share an
     * issuedAt, and without this the list reorders itself between loads. The
     * numbers are sequential per year, so the highest really is the newest. */
    .orderBy(desc(invoices.issuedAt), desc(invoices.number)).limit(filter.limit ?? 300);
  const mapped: InvoiceRow[] = rows.map((r) => ({
    id: r.inv.id, number: r.inv.number, kind: r.inv.kind, currency: r.inv.currency,
    totalMinor: r.inv.totalMinor, taxMinor: r.inv.taxMinor, issuedAt: r.inv.issuedAt, dueAt: r.inv.dueAt,
    lines: r.inv.lines, agencyId: r.inv.agencyId, agencyName: r.agencyName, agencyCode: r.agencyCode,
    bookingId: r.inv.bookingId, bookingRef: r.bookingRef,
    outstandingMinor: r.outstanding == null ? null : Number(r.outstanding),
  }));
  // Filtered after the query because "unpaid" is a property of the ledger
  // balance above, not a column we could index on.
  return filter.unpaid ? mapped.filter((i) => (i.outstandingMinor ?? 0) > 0) : mapped;
}

/** Totals per currency over the invoices given — never added across currencies. */
export function invoiceTotals(rows: InvoiceRow[]) {
  const by = new Map<string, { currency: string; invoiced: number; credited: number; tax: number; outstanding: number; count: number }>();
  // Outstanding belongs to the BOOKING, so two invoices on one booking report
  // the same balance. Counting each booking once stops that being doubled.
  const seenBooking = new Set<string>();
  for (const r of rows) {
    const t = by.get(r.currency) ?? { currency: r.currency, invoiced: 0, credited: 0, tax: 0, outstanding: 0, count: 0 };
    if (r.kind === 'credit_note') t.credited += r.totalMinor; else t.invoiced += r.totalMinor;
    t.tax += r.taxMinor;
    const key = r.bookingId ?? `inv:${r.id}`;
    if (!seenBooking.has(key)) {
      seenBooking.add(key);
      t.outstanding += Math.max(0, r.outstandingMinor ?? 0);
    }
    t.count++;
    by.set(r.currency, t);
  }
  return [...by.values()].sort((a, b) => b.invoiced - a.invoiced);
}
