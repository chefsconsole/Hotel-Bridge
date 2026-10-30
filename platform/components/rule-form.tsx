import { ActionForm, Field, SubmitButton } from './forms';
import { pricingRuleAction } from '@/app/actions/admin';

export function RuleForm({ agencyId, hotels }: { agencyId?: string; hotels: { id: string; name: string }[] }) {
  return (
    <ActionForm action={pricingRuleAction} className="grid gap-3 sm:grid-cols-3">
      {agencyId && <input type="hidden" name="agencyId" value={agencyId} />}
      <Field label="Applies to hotel"><select name="hotelId" className="field"><option value="">All hotels</option>{hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
      <Field label="Markup type"><select name="kind" className="field"><option value="percent">Percentage of cost</option><option value="fixed">Fixed per room-night</option></select></Field>
      <Field label="Markup %" hint="Percentage type"><input name="markupPct" defaultValue="10" className="field num" /></Field>
      <Field label="Fixed amount" hint="Fixed type"><input name="fixed" className="field num" /></Field>
      <Field label="Fixed currency"><select name="currency" className="field"><option value="">—</option>{['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED'].map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Agent share of commission %" hint="Commissionable rates"><input name="sharePct" defaultValue="0" className="field num" /></Field>
      <Field label="Rounding"><select name="rounding" className="field"><option value="whole_unit">Round sell price up to whole unit</option><option value="none">No rounding</option></select></Field>
      <Field label="Note" className="sm:col-span-2"><input name="note" className="field" placeholder="Agreed with … on …" /></Field>
      <div className="sm:col-span-3"><SubmitButton size="sm">Save rule</SubmitButton></div>
    </ActionForm>
  );
}
