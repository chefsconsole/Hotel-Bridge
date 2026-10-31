import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { RuleForm } from '@/components/rule-form';
import { DL, Money, PageHeader, Panel, Pill } from '@/components/ui';
import { adminTaxIdsAction, adminUploadKycAction, agencyCreditAction, agencyStatusAction, walletPayoutAction } from '@/app/actions/admin';
import { walletBalances } from '@/lib/services/ledger';
import { KycPanel } from '@/components/kyc-panel';
import { kycStatus } from '@/lib/services/kyc';
import { getDb, schema } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { toDecimalString } from '@/lib/domain/money';
import { requireStaff } from '@/lib/session';
import { agencyOutstanding } from '@/lib/services/ledger';

export default async function AgencyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = await getDb();
  const [a] = await db.select().from(schema.agencies).where(eq(schema.agencies.id, id));
  if (!a) notFound();
  const [users, rules, hotels, log, outstanding] = await Promise.all([
    db.select().from(schema.users).where(eq(schema.users.agencyId, id)),
    db.select().from(schema.pricingRules).where(and(eq(schema.pricingRules.agencyId, id), eq(schema.pricingRules.active, true))),
    db.select({ id: schema.hotels.id, name: schema.hotels.name }).from(schema.hotels),
    db.select().from(schema.auditLog).where(eq(schema.auditLog.agencyId, id)).orderBy(desc(schema.auditLog.createdAt)).limit(20),
    agencyOutstanding(db, id, a.billingCurrency),
  ]);
  const k = await kycStatus(db, a);
  const wallet = await walletBalances(db, a.id);
  return (
    <>
      <Link href="/admin/agencies" className="text-[0.85rem] text-muted hover:text-ink">← Agencies</Link>
      <PageHeader eyebrow={a.country} title={a.name} actions={<Pill tone={a.status === 'verified' ? 'positive' : 'attention'}>{a.status}</Pill>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Registration">
          <DL items={[['Legal name', a.legalName], ['PAN', a.pan], ['GSTIN', a.gstin], ['Other registration', a.taxId], ['City', a.city], ['Website', a.website], ['Phone', a.phone], ['Registered', formatDate(a.createdAt)], ['Verified', a.verifiedAt ? formatDate(a.verifiedAt) : null], ['Billing currency', a.billingCurrency]]} />
          <ul className="mt-5 border-t border-line pt-4 text-[0.88rem]">{users.map((u) => <li key={u.id}>{u.name} · <span className="text-muted">{u.email} · {u.agencyRole}</span></li>)}</ul>
          {a.internalNotes && <p className="mt-4 text-[0.82rem] whitespace-pre-line text-muted">{a.internalNotes}</p>}
        </Panel>
        <KycPanel k={k} uploadAction={adminUploadKycAction} taxAction={adminTaxIdsAction} agencyId={a.id} editableTax title="KYC documents" />
        <Panel title="Approve or decline" description="Only approved agencies can book. Look at the PAN card, check the name matches the registration, and call if unsure.">
          {a.status !== 'verified' && !k.ready && <p className="mb-3 rounded-[var(--radius-sm)] bg-attention-bg px-3 py-2 text-[0.85rem] text-attention">Can’t approve yet — missing: {k.missing.join(', ')}.</p>}
          <ActionForm action={agencyStatusAction} className="space-y-3">
            <input type="hidden" name="agencyId" value={a.id} />
            <Field label="Note" hint="What was checked — PAN card, GST, references, call. Required to decline."><input name="note" className="field" /></Field>
            <div className="flex flex-wrap gap-2">
              {a.status !== 'verified' && <SubmitButton size="sm" name="status" value="verified">Approve agency</SubmitButton>}
              {a.status === 'pending' && <SubmitButton size="sm" variant="danger" name="status" value="rejected" confirm="Decline this agency?">Decline</SubmitButton>}
              {a.status === 'verified' && <SubmitButton size="sm" variant="danger" name="status" value="suspended" confirm="Suspend? They will not be able to book.">Suspend</SubmitButton>}
            </div>
          </ActionForm>
        </Panel>
        <Panel title="Credit" description={`Outstanding now: `}>
          <p className="mb-3 text-[0.88rem]">Outstanding balance: <Money minor={outstanding} currency={a.billingCurrency} className="font-medium" /></p>
          <ActionForm action={agencyCreditAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="agencyId" value={a.id} /><input type="hidden" name="currency" value={a.billingCurrency} />
            <label className="flex items-center gap-2 text-[0.88rem] sm:col-span-2"><input type="checkbox" name="enabled" defaultChecked={a.creditEnabled} className="size-4" /> Allow bookings on account</label>
            <Field label={`Limit (${a.billingCurrency})`}><input name="limit" defaultValue={toDecimalString(a.creditLimitMinor, a.billingCurrency)} className="field num" /></Field>
            <Field label="Payment terms (days)"><input name="termsDays" defaultValue={a.paymentTermsDays} className="field num" /></Field>
            <Field label="Approval record" className="sm:col-span-2" hint="Required — who approved, on what basis"><input name="note" className="field" /></Field>
            <div><SubmitButton size="sm" variant="secondary">Save credit terms</SubmitButton></div>
          </ActionForm>
        </Panel>
        <Panel title="Wallet" description="Credit from cancellations and failed bookings. The agency can pay bookings with it or ask for a bank payout.">
          <p className="mb-3 text-[0.95rem]">{wallet.length ? wallet.map((w) => <Money key={w.currency} minor={w.minor} currency={w.currency} className="mr-3 font-semibold" />) : <span className="text-muted">Empty</span>}</p>
          {wallet.some((w) => w.minor > 0) && (
            <ActionForm action={walletPayoutAction} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="agencyId" value={a.id} />
              <Field label="Currency"><select name="currency" className="field">{wallet.filter((w) => w.minor > 0).map((w) => <option key={w.currency}>{w.currency}</option>)}</select></Field>
              <Field label="Amount paid out"><input name="amount" className="field num" inputMode="decimal" /></Field>
              <Field label="Bank reference" hint="UTR / NEFT ref"><input name="reference" className="field" /></Field>
              <div className="sm:col-span-3"><SubmitButton size="sm" variant="secondary" confirm="Record this bank payout?">Record payout</SubmitButton></div>
            </ActionForm>
          )}
        </Panel>
        <Panel title="Agency pricing" description="Overrides the default markup for this agency.">
          <ul className="mb-4 text-[0.88rem]">{rules.length === 0 ? <li className="text-muted">Uses the default rule.</li> : rules.map((r) => <li key={r.id}>{r.kind === 'percent' ? `${(r.valueBps ?? 0) / 100}% markup` : `fixed ${r.fixedMinor} ${r.currency}`} · {r.hotelId ? hotels.find((h) => h.id === r.hotelId)?.name : 'all hotels'}{r.agentCommissionShareBps ? ` · ${r.agentCommissionShareBps / 100}% commission share` : ''}</li>)}</ul>
          <RuleForm agencyId={a.id} hotels={hotels} />
        </Panel>
        <Panel title="Account audit" className="lg:col-span-2" padded={false}>
          <table className="table"><tbody>{log.map((l) => <tr key={l.id}><td className="text-[0.8rem] whitespace-nowrap">{formatDateTime(l.createdAt)}</td><td>{l.action}</td><td className="text-[0.85rem] text-muted">{l.actorLabel}</td></tr>)}</tbody></table>
        </Panel>
      </div>
    </>
  );
}

export const metadata = { title: 'Agency' };
