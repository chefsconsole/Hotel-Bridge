import { and, eq, isNull } from 'drizzle-orm';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { RuleForm } from '@/components/rule-form';
import { PageHeader, Panel } from '@/components/ui';
import { settingAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { DEFAULT_RULE } from '@/lib/domain/pricing';
import { requireStaff } from '@/lib/session';
import { getSetting } from '@/lib/services/settings';

export const metadata = { title: 'Pricing & settings' };

export default async function PricingPage() {
  await requireStaff();
  const db = await getDb();
  const [autoDispatch, autoProposal, groupMarkup, extrasMarkup] = await Promise.all([getSetting(db, 'groups.autoDispatch'), getSetting(db, 'groups.autoProposal'), getSetting(db, 'groups.markupPct'), getSetting(db, 'extras.markupPct')]);
  const [rules, hotels, instructions] = await Promise.all([
    db.select().from(schema.pricingRules).where(and(isNull(schema.pricingRules.agencyId), eq(schema.pricingRules.active, true))),
    db.select({ id: schema.hotels.id, name: schema.hotels.name }).from(schema.hotels),
    getSetting(db, 'payment.instructions'),
  ]);
  return (
    <>
      <PageHeader eyebrow="Commercial" title="Pricing & settings" description="One pricing engine for every booking. Most specific rule wins: agency + hotel, agency, hotel, then default." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Default rules (all agencies)">
          <ul className="mb-4 text-[0.88rem]">
            {rules.length === 0 && <li className="text-muted">No rule set — the built-in fallback applies: {DEFAULT_RULE.source}.</li>}
            {rules.map((r) => <li key={r.id}>{r.kind === 'percent' ? `${(r.valueBps ?? 0) / 100}% markup on cost` : `${r.fixedMinor} ${r.currency} per room-night`} · {r.hotelId ? hotels.find((h) => h.id === r.hotelId)?.name : 'all hotels'} · rounding {r.rounding}</li>)}
          </ul>
          <RuleForm hotels={hotels} />
        </Panel>
        <Panel title="Payment instructions" description="Shown on invoices and unpaid bookings. Enter only verified bank details.">
          <ActionForm action={settingAction} className="space-y-3">
            <input type="hidden" name="key" value="payment.instructions" />
            <Field label="Instructions"><textarea name="value" rows={6} defaultValue={instructions} className="field" placeholder="Beneficiary, IBAN/account, SWIFT, bank, reference format…" /></Field>
            <SubmitButton size="sm">Save</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="Group Desk automation" description="What happens when an agent sends a group request." className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            {([['groups.autoDispatch', autoDispatch, 'Ask hotels automatically', 'Contracted group hotels in the city (up to 4), or up to 15 outreach hotels with an email; 48h reply link.'],
              ['groups.autoProposal', autoProposal, 'Send the offer automatically', 'When every city has an offer: best offer per city + group markup, held 48h for the agent.']] as const).map(([key, val, label, hint]) => (
              <ActionForm key={key} action={settingAction} className="rounded-[var(--radius-md)] border border-line p-4">
                <input type="hidden" name="key" value={key} />
                <p className="font-medium">{label}</p>
                <p className="mt-1 text-[0.8rem] text-muted">{hint}</p>
                <div className="mt-3 flex items-center gap-2">
                  <select name="value" defaultValue={val} className="field !w-auto py-1.5"><option value="1">On</option><option value="0">Off — a person does it</option></select>
                  <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                </div>
              </ActionForm>
            ))}
            <ActionForm action={settingAction} className="rounded-[var(--radius-md)] border border-line p-4">
              <input type="hidden" name="key" value="groups.markupPct" />
              <p className="font-medium">Group markup</p>
              <p className="mt-1 text-[0.8rem] text-muted">Added to the hotel&apos;s net group rate in automatic offers.</p>
              <div className="mt-3 flex items-center gap-2"><input name="value" defaultValue={groupMarkup} inputMode="decimal" className="field num !w-24 py-1.5" /><span className="text-[0.85rem]">%</span><SubmitButton size="sm" variant="secondary">Save</SubmitButton></div>
            </ActionForm>
          </div>
        </Panel>
        <Panel title="Hotel extras" description="Candle-light dinners, activities, spa and meal plans from the hotel's rate sheet." className="lg:col-span-2">
          <ActionForm action={settingAction} className="max-w-md rounded-[var(--radius-md)] border border-line p-4">
            <input type="hidden" name="key" value="extras.markupPct" />
            <p className="font-medium">Extras markup</p>
            <p className="mt-1 text-[0.8rem] text-muted">Added to the hotel&apos;s net price for every extra. Kept separate from the room markup. Agents only see the selling price.</p>
            <div className="mt-3 flex items-center gap-2"><input name="value" defaultValue={extrasMarkup} inputMode="decimal" className="field num !w-24 py-1.5" /><span className="text-[0.85rem]">%</span><SubmitButton size="sm" variant="secondary">Save</SubmitButton></div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
