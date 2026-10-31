import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { HotelDeadline, PaymentPill, StatusPill, Timeline } from '@/components/booking-bits';
import { DL, Money, Notice, Panel, SampleTag } from '@/components/ui';
import { bookingOpsAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { STATUS_EXPLAINER } from '@/lib/domain/booking-state';
import { describePolicy, type CancelPolicy } from '@/lib/domain/cancellation';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { toDecimalString } from '@/lib/domain/money';
import { describeRoom } from '@/lib/domain/occupancy';
import type { PriceBreakdown } from '@/lib/domain/pricing';
import { requireStaff } from '@/lib/session';
import { bookingTimeline, getBookingForActor, penaltyFor } from '@/lib/services/bookings';
import { balances } from '@/lib/services/ledger';
import { NotFoundError } from '@/lib/services/errors';

function Op({ op, id, label, children, variant = 'secondary', confirm }: { op: string; id: string; label: string; children?: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger'; confirm?: string }) {
  return (
    <ActionForm action={bookingOpsAction} className="rounded-[var(--radius-md)] border border-line p-4">
      <input type="hidden" name="op" value={op} /><input type="hidden" name="bookingId" value={id} />
      {children}
      <SubmitButton size="sm" variant={variant} className="mt-3" confirm={confirm}>{label}</SubmitButton>
    </ActionForm>
  );
}

export default async function AdminBooking({ params }: { params: Promise<{ id: string }> }) {
  const { actor } = await requireStaff();
  const { id } = await params;
  const db = await getDb();
  const b = await getBookingForActor(db, actor, id).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  const [[hotel], [agency], events, bal, ledger, calls] = await Promise.all([
    db.select().from(schema.hotels).where(eq(schema.hotels.id, b.hotelId)),
    db.select().from(schema.agencies).where(eq(schema.agencies.id, b.agencyId)),
    bookingTimeline(db, b.id), balances(db, b.id),
    db.select().from(schema.ledgerEntries).where(eq(schema.ledgerEntries.bookingId, b.id)).orderBy(schema.ledgerEntries.createdAt),
    db.select().from(schema.supplierCalls).where(eq(schema.supplierCalls.bookingId, b.id)).orderBy(desc(schema.supplierCalls.createdAt)),
  ]);
  const p = b.pricing as PriceBreakdown;
  const pen = penaltyFor(b);
  return (
    <>
      <Link href="/admin/bookings" className="text-[0.85rem] text-muted hover:text-ink">← Bookings</Link>
      <header className="mt-4 mb-6">
        <p className="eyebrow">{agency.name}</p>
        <h1 className="num mt-1 text-[2rem] font-semibold">{b.reference}</h1>
        <div className="mt-2 flex flex-wrap gap-2"><StatusPill status={b.status} /><PaymentPill status={b.paymentStatus} />{b.isSample && <SampleTag />}</div>
        <p className="mt-3 max-w-3xl text-[0.9rem] text-muted">{STATUS_EXPLAINER[b.status]}</p>
        <div className="mt-3"><HotelDeadline status={b.status} respondBy={b.hotelRespondBy} /></div>
      </header>
      {b.status === 'outcome_unknown' && <div className="mb-6"><Notice tone="error" title="Do not rebook">The supplier may hold this reservation. Reconcile — we look it up by our reference and never create a second booking.</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          <Panel title="Actions">
            <div className="grid gap-3 md:grid-cols-2">
              {(b.status === 'outcome_unknown' || b.status === 'submitting') && <Op op="reconcile" id={b.id} label="Reconcile with supplier" variant="primary"><p className="text-[0.85rem] text-muted">Look the reservation up at {b.supplier}.</p></Op>}
              {b.status === 'pending_confirmation' && <>
                <Op op="confirm" id={b.id} label="Record hotel confirmation" variant="primary"><Field label="Hotel confirmation number"><input name="confirmation" className="field" /></Field></Op>
                <Op op="decline" id={b.id} label="Hotel declined" variant="danger"><Field label="Reason"><input name="note" className="field" /></Field></Op>
              </>}
              {b.paymentArrangement !== 'direct' && bal.agentBalance > 0 && (
                <Op op="payment" id={b.id} label="Record payment received" variant="primary">
                  <p className="text-[0.85rem] text-muted">Outstanding <Money minor={bal.agentBalance} currency={b.currency} /></p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2"><Field label={`Amount (${b.currency})`}><input name="amount" defaultValue={toDecimalString(bal.agentBalance, b.currency)} className="field num" /></Field><Field label="Bank / payment reference"><input name="reference" className="field" /></Field></div>
                </Op>
              )}
              {bal.agentBalance < 0 && (
                <Op op="refund" id={b.id} label="Record refund paid">
                  <p className="text-[0.85rem] text-muted">Owed to agent <Money minor={-bal.agentBalance} currency={b.currency} /></p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2"><Field label="Amount"><input name="amount" defaultValue={toDecimalString(-bal.agentBalance, b.currency)} className="field num" /></Field><Field label="Reference"><input name="reference" className="field" /></Field></div>
                </Op>
              )}
              {b.status === 'amendment_requested' && <Op op="amend" id={b.id} label="Resolve amendment"><Field label="What was agreed"><textarea name="note" rows={2} className="field" /></Field></Op>}
              {['cancellation_requested', 'confirmed', 'amendment_requested', 'awaiting_payment', 'pending_confirmation'].includes(b.status) && (
                <Op op="cancel" id={b.id} label="Cancel with supplier" variant="danger" confirm="Cancel this booking with the supplier and post the ledger entries?">
                  <p className="text-[0.85rem] text-muted">Charge if cancelled today: <Money minor={pen.sellPenaltyMinor} currency={b.currency} /> to agent, <Money minor={pen.costPenaltyMinor} currency={b.currency} /> from supplier. {pen.reason}.</p>
                </Op>
              )}
            </div>
          </Panel>
          <Panel title={hotel.name} description={`${formatDate(b.checkIn)} – ${formatDate(b.checkOut)} · lead guest ${b.leadGuest}`}>
            <ul className="space-y-1 text-[0.88rem]">{b.rooms.map((r, i) => <li key={i}>Room {i + 1}: {r.roomName} ({r.mealPlan}) · {describeRoom(r)}{r.guestNames.length ? ` — ${r.guestNames.join(', ')}` : ''}</li>)}</ul>
            <div className="mt-4"><DL items={[['Supplier', b.supplier], ['Supplier ref', b.supplierRef], ['Hotel confirmation', b.hotelConfirmation], ['Agent ref', b.agentReference], ['Cancellation', describePolicy(b.cancelPolicy as CancelPolicy, b.checkIn)], ['Payment due', b.paymentDueAt ? formatDateTime(b.paymentDueAt) : null]]} /></div>
          </Panel>
          <Panel title="Ledger" padded={false}>
            <table className="table"><thead><tr><th>When</th><th>Account</th><th>Kind</th><th>Memo</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{ledger.map((e) => <tr key={e.id}><td className="text-[0.8rem]">{formatDateTime(e.createdAt)}</td><td>{e.account}</td><td>{e.kind}</td><td className="text-[0.85rem]">{e.memo}{e.reference ? ` · ${e.reference}` : ''}</td><td className="text-right"><Money minor={e.amountMinor} currency={e.currency} /></td></tr>)}</tbody></table>
          </Panel>
          <Panel title="Supplier calls" description="Request/response log, guest data redacted" padded={false}>
            <table className="table"><thead><tr><th>When</th><th>Operation</th><th>Outcome</th><th className="text-right">ms</th></tr></thead>
              <tbody>{calls.map((c) => <tr key={c.id}><td className="text-[0.8rem]">{formatDateTime(c.createdAt)}</td><td>{c.operation}</td><td>{c.outcome}</td><td className="num text-right">{c.durationMs}</td></tr>)}</tbody></table>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Economics" description="Frozen at booking time">
            <dl className="space-y-2 text-[0.88rem]">
              {[
                ['Contract amount', p.contractAmountMinor], ['Taxes inside price', b.taxMinor], ['Supplier cost', b.supplierCostMinor], ['Markup', p.markupMinor],
                ['Hotel commission', p.hotelCommissionMinor], ['Agent commission share', p.agentCommissionMinor], ['Agent pays (sell)', b.sellMinor],
                ['Net revenue', b.netRevenueMinor], ['Commission receivable', b.commissionReceivableMinor], ['City tax at hotel', b.localTaxMinor],
              ].map(([k, v]) => <div key={String(k)} className="flex justify-between"><dt className="text-muted">{k}</dt><dd><Money minor={Number(v ?? 0)} currency={b.currency} /></dd></div>)}
              <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Margin / markup</dt><dd className="num">{(p.marginBps / 100).toFixed(2)}% / {(p.markupBps / 100).toFixed(2)}%</dd></div>
              <p className="pt-1 text-[0.75rem] text-faint">{b.paymentArrangement} · {b.collectionModel} · {p.rateBasis} · {p.rule}</p>
            </dl>
          </Panel>
          <Panel title="History"><Timeline events={events} /></Panel>
        </div>
      </div>
    </>
  );
}

export const metadata = { title: 'Booking' };
