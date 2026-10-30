/* ------------------------------------------------------------------ *
 * The ledger. Append-only (a database trigger refuses UPDATE/DELETE).
 * Sign convention per account:
 *   agent:      + the agent owes us      - the agent paid / was credited
 *   supplier:   + we owe the supplier    - we paid the supplier
 *   commission: + a hotel owes us        - the hotel paid
 * ------------------------------------------------------------------ */
import { and, eq, sql } from 'drizzle-orm';
import { schema, type Executor } from '@/lib/db';
import { actorId, type Actor } from './actor';
import { nextNumber } from './counters';

const { ledgerEntries, invoices } = schema;

export type Entry = {
  bookingId?: string | null; agencyId?: string | null;
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
