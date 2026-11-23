import Link from 'next/link';
import { Empty, Money, PageHeader, Panel, Pill, cx } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { invoiceTotals, listInvoices, type InvoiceRow } from '@/lib/services/ledger';

export const metadata = { title: 'Invoices' };

type SP = { kind?: string; agency?: string; q?: string; unpaid?: string };

export default async function AdminInvoicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const sp = await searchParams;
  const kind = sp.kind ?? 'all';
  const db = await getDb();
  const [rows, agencies] = await Promise.all([
    listInvoices(db, { kind, agencyId: sp.agency || undefined, q: sp.q, unpaid: !!sp.unpaid }),
    db.select({ id: schema.agencies.id, name: schema.agencies.name }).from(schema.agencies)
      .where(eq(schema.agencies.status, 'active')).orderBy(asc(schema.agencies.name)),
  ]);
  const totals = invoiceTotals(rows);
  const today = todayIso();
  const qs = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return '/admin/invoices' + (q ? `?${q}` : '');
  };

  return (
    <>
      <PageHeader eyebrow="Commercial" title="Invoices"
        description="Every invoice and credit note we have issued, across all agencies. Raised automatically when a booking is made, and as a credit note when one is cancelled — nothing here is typed in by hand. “Still owed” is the booking’s balance in the ledger, not a field on the document." />

      {totals.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {totals.map((t) => (
            <Panel key={t.currency} title={t.currency} description={`${t.count} document${t.count === 1 ? '' : 's'}`}>
              <dl className="grid grid-cols-2 gap-y-2 text-[0.85rem]">
                <dt className="text-muted">Invoiced</dt>
                <dd className="text-right"><Money minor={t.invoiced} currency={t.currency} /></dd>
                {t.credited > 0 && (<><dt className="text-muted">Credited back</dt><dd className="text-right text-muted">−<Money minor={t.credited} currency={t.currency} /></dd></>)}
                <dt className="text-muted">Of which tax</dt>
                <dd className="text-right text-muted"><Money minor={t.tax} currency={t.currency} /></dd>
                <dt className="font-medium">Still owed</dt>
                <dd className={cx('text-right font-medium', t.outstanding > 0 && 'text-attention')}><Money minor={t.outstanding} currency={t.currency} /></dd>
              </dl>
            </Panel>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[['all', 'All'], ['invoice', 'Invoices'], ['credit_note', 'Credit notes']].map(([k, l]) => (
            <Link key={k} href={qs({ kind: k })} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${kind === k ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>{l}</Link>
          ))}
          <Link href={qs({ unpaid: sp.unpaid ? '' : '1' })} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${sp.unpaid ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>Still owed</Link>
        </div>
        <form className="flex flex-wrap gap-2">
          {kind !== 'all' && <input type="hidden" name="kind" value={kind} />}
          {sp.unpaid && <input type="hidden" name="unpaid" value="1" />}
          <select name="agency" defaultValue={sp.agency ?? ''} className="field !w-auto max-w-56 py-2 text-[0.85rem]"><option value="">All agencies</option>{agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <input name="q" defaultValue={sp.q} placeholder="Number or booking" className="field !w-44 py-2 text-[0.85rem]" />
          <button className="rounded-[var(--radius-sm)] bg-ink px-4 text-[0.85rem] text-paper">Filter</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? (
          <Empty title="No invoices yet">An invoice is raised when a booking is confirmed, so the first one appears with the first confirmed booking.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Number</th><th>Agency</th><th>Booking</th><th>Issued</th><th>Due</th><th className="text-right">Total</th><th className="text-right">Still owed</th></tr></thead>
              <tbody>{rows.map((inv) => <Row key={inv.id} inv={inv} today={today} />)}</tbody>
            </table>
          </div>
        )}
      </div>
      {rows.length >= 300 && <p className="mt-3 text-[0.78rem] text-faint">Showing the 300 most recent. Narrow it with the filters above.</p>}
    </>
  );
}

function Row({ inv, today }: { inv: InvoiceRow; today: string }) {
  const credit = inv.kind === 'credit_note';
  const owed = inv.outstandingMinor ?? 0;
  const overdue = !credit && owed > 0 && inv.dueAt != null && inv.dueAt < new Date(today + 'T00:00:00Z');
  return (
    <tr>
      <td className="min-w-48">
        <p className="num font-medium">{inv.number}</p>
        {credit && <Pill tone="neutral">Credit note</Pill>}
        {inv.lines.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-[0.72rem] text-faint">{inv.lines.length} line{inv.lines.length === 1 ? '' : 's'}</summary>
            <ul className="mt-1 space-y-0.5">
              {inv.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-4 text-[0.76rem] text-muted"><span>{l.label}</span><span className="num"><Money minor={l.amountMinor} currency={inv.currency} /></span></li>
              ))}
            </ul>
          </details>
        )}
      </td>
      <td className="text-[0.85rem]">
        <Link href={`/admin/agencies/${inv.agencyId}`} className="hover:underline">{inv.agencyName}</Link>
        {inv.agencyCode && <p className="num text-[0.72rem] text-faint">{inv.agencyCode}</p>}
      </td>
      <td className="text-[0.85rem]">
        {inv.bookingId && inv.bookingRef
          ? <Link href={`/admin/bookings/${inv.bookingId}`} className="num hover:underline">{inv.bookingRef}</Link>
          : <span className="text-faint">—</span>}
      </td>
      <td className="whitespace-nowrap text-[0.82rem]">{formatDate(inv.issuedAt)}</td>
      <td className="whitespace-nowrap text-[0.82rem]">
        {inv.dueAt
          ? <span className={overdue ? 'font-medium text-negative' : 'text-muted'}>{overdue ? 'Overdue · ' : ''}{formatDate(inv.dueAt)}</span>
          : <span className="text-faint">—</span>}
      </td>
      <td className="text-right whitespace-nowrap">
        <Money minor={inv.totalMinor} currency={inv.currency} className={credit ? 'text-muted' : 'font-medium'} />
        {inv.taxMinor > 0 && <p className="text-[0.72rem] text-faint">incl. tax <Money minor={inv.taxMinor} currency={inv.currency} /></p>}
      </td>
      <td className="text-right whitespace-nowrap">
        {inv.outstandingMinor == null
          ? <span className="text-faint">—</span>
          : owed > 0
            ? <Money minor={owed} currency={inv.currency} className="font-medium text-attention" />
            : <span className="text-[0.8rem] text-positive">Settled</span>}
      </td>
    </tr>
  );
}
