import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { Empty, Money, PageHeader, Panel, Stat } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { requireAgent } from '@/lib/session';
import { walletBalances, walletHistory } from '@/lib/services/ledger';
import { ActionForm, SubmitButton } from '@/components/forms';
import { walletPayoutRequestAction } from '@/app/actions/agent';

export const metadata = { title: 'Invoices & payments' };

export default async function FinancePage() {
  const { agency } = await requireAgent();
  const db = await getDb();
  const l = schema.ledgerEntries;
  const [wallet, walletLog] = await Promise.all([walletBalances(db, agency.id), walletHistory(db, agency.id, 30)]);
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
      <section id="wallet" className="mb-6 grid scroll-mt-6 gap-6 overflow-hidden rounded-[var(--radius-lg)] bg-ink text-paper shadow-[var(--shadow-lift)] lg:grid-cols-[1fr_1.3fr]">
        <div className="p-6 md:p-8">
          <p className="text-[0.68rem] font-medium tracking-[0.18em] text-paper/50 uppercase">Your wallet</p>
          {wallet.length === 0
            ? <p className="num mt-3 font-[family-name:var(--font-display)] text-[2.4rem] leading-none font-light">{formatMoney(0, agency.billingCurrency, { compact: true })}</p>
            : wallet.map((w) => <p key={w.currency} className="num mt-3 font-[family-name:var(--font-display)] text-[2.4rem] leading-none font-light tracking-[-0.03em]">{formatMoney(w.minor, w.currency)}</p>)}
          <p className="mt-4 max-w-sm text-[0.85rem] leading-relaxed text-paper/65">When you cancel inside the free-cancellation window, 100% of what you paid lands here instantly. After the window, everything except the hotel&apos;s charge does. Use it to pay your next booking, or withdraw it to your bank.</p>
          {wallet.filter((w) => w.minor > 0).map((w) => (
            <ActionForm key={w.currency} action={walletPayoutRequestAction} className="mt-4">
              <input type="hidden" name="currency" value={w.currency} />
              <SubmitButton size="sm" variant="inverse" pendingLabel="Requesting…" confirm={`Withdraw ${formatMoney(w.minor, w.currency)} to your bank?`}>Withdraw {w.currency} to bank</SubmitButton>
            </ActionForm>
          ))}
        </div>
        <div className="border-t border-paper/10 lg:border-t-0 lg:border-l">
          {walletLog.length === 0 ? <p className="p-6 text-[0.88rem] text-paper/50 md:p-8">No wallet activity yet.</p> : (
            <ul className="max-h-80 divide-y divide-paper/10 overflow-y-auto">
              {walletLog.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 px-6 py-3 text-[0.86rem]">
                  <span className="min-w-0"><span className="block truncate">{e.memo}</span><span className="text-[0.75rem] text-paper/45">{formatDate(e.createdAt)}{e.kind === 'wallet_payout' ? ` · ${e.reference}` : ''}</span></span>
                  <span className={`num shrink-0 font-medium ${e.amountMinor < 0 ? 'text-[#8fd1aa]' : 'text-paper/80'}`}>{e.amountMinor < 0 ? '+' : '−'}{formatMoney(Math.abs(e.amountMinor), e.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <div className="mb-6 grid gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:grid-cols-3">
        <Stat label="Balance" value={balances.length ? balances.map((b) => formatMoney(Number(b.total), b.currency)).join(' · ') : formatMoney(0, agency.billingCurrency)} hint="Positive = you owe us. Wallet credit counts in your favour." />
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
