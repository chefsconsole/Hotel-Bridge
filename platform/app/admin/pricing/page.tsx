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
      </div>
    </>
  );
}
