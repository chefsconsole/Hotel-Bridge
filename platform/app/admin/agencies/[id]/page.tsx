import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { RuleForm } from '@/components/rule-form';
import { DL, Money, PageHeader, Panel, Pill } from '@/components/ui';
import { agencyCreditAction, agencyStatusAction } from '@/app/actions/admin';
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
  return (
    <>
      <Link href="/admin/agencies" className="text-[0.85rem] text-muted hover:text-ink">← Agencies</Link>
      <PageHeader eyebrow={a.country} title={a.name} actions={<Pill tone={a.status === 'verified' ? 'positive' : 'attention'}>{a.status}</Pill>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Registration">
          <DL items={[['Legal name', a.legalName], ['Tax / registration', a.taxId], ['City', a.city], ['Website', a.website], ['Phone', a.phone], ['Registered', formatDate(a.createdAt)], ['Verified', a.verifiedAt ? formatDate(a.verifiedAt) : null], ['Billing currency', a.billingCurrency]]} />
          <ul className="mt-5 border-t border-line pt-4 text-[0.88rem]">{users.map((u) => <li key={u.id}>{u.name} · <span className="text-muted">{u.email} · {u.agencyRole}</span></li>)}</ul>
          {a.internalNotes && <p className="mt-4 text-[0.82rem] whitespace-pre-line text-muted">{a.internalNotes}</p>}
        </Panel>
        <Panel title="Verification">
          <ActionForm action={agencyStatusAction} className="space-y-3">
            <input type="hidden" name="agencyId" value={a.id} />
            <Field label="Note" hint="What was checked — licence, references, call"><input name="note" className="field" /></Field>
            <div className="flex flex-wrap gap-2">
              {a.status !== 'verified' && <SubmitButton size="sm" name="status" value="verified">Verify agency</SubmitButton>}
              {a.status === 'pending' && <SubmitButton size="sm" variant="danger" name="status" value="rejected">Reject</SubmitButton>}
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
