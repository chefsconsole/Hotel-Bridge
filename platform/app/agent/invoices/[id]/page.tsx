import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { PrintButton } from '@/components/print-button';
import { Logo, Money, Notice } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { requireAgent } from '@/lib/session';
import { getSetting } from '@/lib/services/settings';

export const metadata = { title: 'Invoice' };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { agency } = await requireAgent();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = await getDb();
  const [inv] = await db.select().from(schema.invoices).where(and(eq(schema.invoices.id, id), eq(schema.invoices.agencyId, agency.id)));
  if (!inv) notFound();
  const [b] = inv.bookingId ? await db.select().from(schema.bookings).where(eq(schema.bookings.id, inv.bookingId)) : [];
  const instructions = await getSetting(db, 'payment.instructions');
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/agent/finance" className="text-[0.85rem] text-muted hover:text-ink">← Invoices</Link>
        <PrintButton />
      </div>
      <div className="no-print mb-4"><Notice tone="warning" title="Commercial document — tax details pending">Seller legal entity, tax registration and tax treatment must be configured and reviewed by an accountant before invoices are issued in production.</Notice></div>
      <article className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 print:border-0 print:p-0 md:p-12">
        <header className="flex items-start justify-between">
          <Logo />
          <div className="text-right">
            <p className="eyebrow">{inv.kind === 'invoice' ? 'Invoice' : 'Credit note'}</p>
            <p className="num mt-1 text-[1.2rem] font-semibold">{inv.number}</p>
            <p className="text-[0.85rem] text-muted">Issued {formatDate(inv.issuedAt)}</p>
          </div>
        </header>
        <section className="mt-8 grid gap-6 sm:grid-cols-2 text-[0.9rem]">
          <div>
            <p className="text-[0.75rem] tracking-wide text-faint uppercase">Billed to</p>
            <p className="mt-1 font-semibold">{agency.legalName ?? agency.name}</p>
            <p className="text-muted">{[agency.address, agency.city, agency.country].filter(Boolean).join(', ')}</p>
            {agency.taxId && <p className="text-muted">Tax ID {agency.taxId}</p>}
          </div>
          <div className="sm:text-right">
            {b && <><p className="text-[0.75rem] tracking-wide text-faint uppercase">Booking</p><p className="num mt-1 font-semibold">{b.reference}</p>{b.agentReference && <p className="text-muted">Your ref {b.agentReference}</p>}</>}
            {inv.dueAt && inv.kind === 'invoice' && <p className="mt-2 text-muted">Due {formatDateTime(inv.dueAt)}</p>}
          </div>
        </section>
        <table className="table mt-8 border-y border-line">
          <thead><tr><th>Description</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{inv.lines.map((l, i) => <tr key={i}><td>{l.label}</td><td className="text-right"><Money minor={l.amountMinor} currency={inv.currency} /></td></tr>)}</tbody>
        </table>
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-[0.9rem]">
          {inv.taxMinor > 0 && <div className="flex justify-between text-muted"><span>Included taxes (hotel)</span><Money minor={inv.taxMinor} currency={inv.currency} /></div>}
          <div className="flex justify-between text-[1.1rem] font-semibold"><span>Total</span><Money minor={inv.totalMinor} currency={inv.currency} /></div>
        </div>
        {inv.kind === 'invoice' && <p className="mt-8 text-[0.82rem] whitespace-pre-line text-muted">{instructions || 'Payment instructions: to be provided by HotelBridge finance.'}</p>}
      </article>
    </div>
  );
}
