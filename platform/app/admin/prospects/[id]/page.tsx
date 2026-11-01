import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { DateField } from '@/components/date-fields';
import { LinkButton, PageHeader, Panel, Pill } from '@/components/ui';
import { logProspectContactAction, updateProspectAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { PROSPECT_STAGES } from '@/lib/db/schema';
import { formatDate } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { NotFoundError } from '@/lib/services/errors';
import { STAGE_LABEL, getProspect } from '@/lib/services/prospects';
import { listStaff } from '@/lib/services/staff';

export const metadata = { title: 'Hotel outreach' };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const db = await getDb();
  let p;
  try { p = await getProspect(db, id); } catch (e) { if (e instanceof NotFoundError) notFound(); throw e; }
  const staff = (await listStaff(db)).filter((s) => s.status === 'active');
  const search = encodeURIComponent(`${p.name} official website`);
  return (
    <>
      <div className="mb-4 text-[0.85rem]"><Link href="/admin/prospects" className="text-muted hover:text-ink">← Hotel outreach</Link></div>
      <PageHeader eyebrow={`${p.priority} · ${p.destination}`} title={p.name}
        description={<>{p.tier}{p.bestFor ? ` · best for ${p.bestFor}` : ''}{!p.nameChecked && <> · <span className="text-attention">confirm the exact name and brand before writing</span></>}</>}
        actions={<>
          <a href={`https://www.google.com/search?q=${search}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong bg-surface px-5 text-[0.9rem] font-medium hover:border-ink">Find official site</a>
          {p.hotelId ? <LinkButton href={`/admin/hotels/${p.hotelId}`}>Open hotel</LinkButton> : <LinkButton href={`/admin/hotels/new?prospect=${p.id}`} variant="secondary">Signed? Create hotel</LinkButton>}
        </>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Outreach record">
          <ActionForm action={updateProspectAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="prospectId" value={p.id} />
            <Field label="Stage"><select name="stage" defaultValue={p.stage} className="field">{PROSPECT_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></Field>
            <Field label="Priority"><select name="priority" defaultValue={p.priority} className="field">{['P1', 'P2', 'P3'].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Owner"><select name="ownerId" defaultValue={p.ownerId ?? ''} className="field"><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Rate model they prefer"><select name="rateType" defaultValue={p.rateType ?? ''} className="field"><option value="">Not discussed</option><option value="net">Net rates</option><option value="commissionable">Commissionable</option><option value="either">Either</option></select></Field>
            <Field label="Contact person"><input name="contactName" defaultValue={p.contactName ?? ''} className="field" /></Field>
            <Field label="Role"><input name="contactRole" defaultValue={p.contactRole ?? ''} className="field" placeholder="Director of Sales" /></Field>
            <Field label="Email"><input name="contactEmail" type="email" defaultValue={p.contactEmail ?? ''} className="field" /></Field>
            <Field label="Phone / WhatsApp"><input name="contactPhone" defaultValue={p.contactPhone ?? ''} className="field" /></Field>
            <Field label="Where the contact came from" hint="Official website, brand sales office, trade show, referral…" className="sm:col-span-2"><input name="contactSource" defaultValue={p.contactSource ?? ''} className="field" /></Field>
            <Field label="Next step" className="sm:col-span-2"><input name="nextStep" defaultValue={p.nextStep ?? ''} className="field" placeholder="Send rate agreement and rate sheet" /></Field>
            <DateField label="Next step on" name="nextStepOn" defaultValue={p.nextStepOn ?? ''} />
            <Field label="Last contact"><input name="lastContactOn" type="date" defaultValue={p.lastContactOn ?? ''} className="field num" /></Field>
            <Field label="Notes" className="sm:col-span-2"><textarea name="notes" rows={6} defaultValue={p.notes ?? ''} className="field" /></Field>
            <div className="sm:col-span-2"><SubmitButton pendingLabel="Saving…">Save</SubmitButton></div>
          </ActionForm>
        </Panel>

        <aside className="space-y-6">
          <Panel title="Log a contact" description="Call, email or meeting today — moves a new hotel to Contacted.">
            <ActionForm action={logProspectContactAction} resetOnSuccess className="space-y-3">
              <input type="hidden" name="prospectId" value={p.id} />
              <Field label="What happened"><textarea name="note" rows={3} className="field" placeholder="Spoke to DOS, interested in commissionable rates for Dec–Mar" /></Field>
              <Field label="Next step"><input name="nextStep" className="field" /></Field>
              <DateField label="When" name="nextStepOn" />
              <SubmitButton size="sm" pendingLabel="Logging…">Log contact</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Status">
            <dl className="space-y-2 text-[0.88rem]">
              <div className="flex justify-between"><dt className="text-muted">Stage</dt><dd><Pill tone={p.stage === 'signed' ? 'positive' : 'neutral'}>{STAGE_LABEL[p.stage]}</Pill></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Last contact</dt><dd>{p.lastContactOn ? formatDate(p.lastContactOn) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Added</dt><dd>{formatDate(p.createdAt)}</dd></div>
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[0.78rem] text-faint">Templates: <code>docs/outreach/EMAILS.md</code> (§4 premium, §5 volume, §7 fixed-rate on request) and <code>docs/contracts/</code>.</p>
          </Panel>
        </aside>
      </div>
    </>
  );
}
