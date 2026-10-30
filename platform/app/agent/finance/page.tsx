import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { Empty, Money, PageHeader, Panel, Stat } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { requireAgent } from '@/lib/session';

export const metadata = { title: 'Invoices & payments' };

export default async function FinancePage() {
  const { agency } = await requireAgent();
  const db = await getDb();
  const l = schema.ledgerEntries;
  const [invoices, balances, entries] = await Promise.all([
    db.select({ inv: schema.invoices, ref: schema.bookings.reference }).from(schema.invoices)
      .leftJoin(schema.bookings, eq(schema.bookings.id, schema.invoices.bookingId))
      .where(eq(schema.invoices.agencyId, agency.id)).orderBy(desc(schema.invoices.issuedAt)),
    db.select({ currency: l.currency, total: sql<string>`sum(${l.amountMinor})` }).from(l)
      .where(sql`${l.agencyId} = ${agency.id} and ${l.account} = 'agent'`).groupBy(l.currency),
    db.select({ e: l, ref: schema.bookings.reference }).from(l).leftJoin(schema.bookings, eq(schema.bookings.id, l.bookingId))
      .where(sql`${l.agencyId} = ${agency.id} and ${l.account} = 'agent'`).orderBy(desc(l.createdAt)).limit(100),
  ]);
  return (
    <>
      <PageHeader eyebrow="Finance" title="Invoices & payments" description="Everything HotelBridge has charged, received and credited — straight from our ledger." />
      <div className="mb-6 grid gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:grid-cols-3">
        <Stat label="Balance" value={balances.length ? balances.map((b) => formatMoney(Number(b.total), b.currency)).join(' · ') : formatMoney(0, agency.billingCurrency)} hint="Positive = you owe us; negative = we owe you" />
        <Stat label="Payment terms" value={agency.creditEnabled ? `${agency.paymentTermsDays} days` : 'Prepay'} hint={agency.creditEnabled ? `Credit limit ${formatMoney(agency.creditLimitMinor, agency.billingCurrency)}` : 'Credit available after review'} />
        <Stat label="Billing currency" value={agency.billingCurrency} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Invoices and credit notes" padded={false}>
          {invoices.length === 0 ? <Empty title="No invoices yet" /> : (
            <table className="table"><thead><tr><th>Number</th><th>Booking</th><th>Issued</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{invoices.map(({ inv, ref }) => (
                <tr key={inv.id}><td><Link href={`/agent/invoices/${inv.id}`} className="num font-medium hover:underline">{inv.number}</Link></td><td className="num">{ref ?? '—'}</td><td>{formatDate(inv.issuedAt)}</td><td className="text-right"><Money minor={inv.totalMinor} currency={inv.currency} /></td></tr>
              ))}</tbody></table>
          )}
        </Panel>
        <Panel title="Account activity" padded={false}>
          {entries.length === 0 ? <Empty title="No activity yet" /> : (
            <table className="table"><thead><tr><th>Date</th><th>Entry</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{entries.map(({ e, ref }) => (
                <tr key={e.id}><td className="whitespace-nowrap">{formatDate(e.createdAt)}</td><td>{e.memo ?? e.kind}<p className="num text-[0.75rem] text-faint">{ref ?? e.reference}</p></td><td className="text-right"><Money minor={e.amountMinor} currency={e.currency} /></td></tr>
              ))}</tbody></table>
          )}
        </Panel>
      </div>
    </>
  );
}
