import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { DateField, StayDatesField } from '@/components/date-fields';
import { ClientPicker } from '@/components/trip-form';
import { PageHeader } from '@/components/ui';
import { createTripAction } from '@/app/actions/trips';
import { getDb } from '@/lib/db';
import { CURRENCIES } from '@/lib/domain/money';
import { requireAgent } from '@/lib/session';
import { LEAD_SOURCES, listClients } from '@/lib/services/trips';

export const metadata = { title: 'New trip' };

const section = 'rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]';

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { actor, agency } = await requireAgent();
  const { client } = await searchParams;
  const clients = await listClients(await getDb(), actor);
  const currency = agency.country.toLowerCase() === 'india' ? 'INR' : agency.billingCurrency;
  return (
    <>
      <PageHeader eyebrow="Client trips" title="New trip" description="Capture the enquiry in a few seconds. Hotels, flights and everything else are added on the next screen." />
      <ActionForm action={createTripAction} className="max-w-3xl space-y-6">
        <section className={section}>
          <h2 className="mb-4 font-semibold">Client</h2>
          <ClientPicker clients={clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))} initial={clients.some((c) => c.id === client) ? client : undefined} />
        </section>
        <section className={section}>
          <h2 className="mb-4 font-semibold">Trip</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Trip name" className="sm:col-span-3"><input name="title" className="field" placeholder="e.g. Mehta family · Phuket & Bangkok" /></Field>
            <Field label="Client pays in"><select name="currency" defaultValue={currency} className="field">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <StayDatesField label="Travel dates" nameIn="startDate" nameOut="endDate" className="sm:col-span-2" />
            <Field label="Adults"><input name="adults" type="number" min={1} defaultValue={2} className="field num" /></Field>
            <Field label="Children"><input name="children" type="number" min={0} defaultValue={0} className="field num" /></Field>
            <Field label="Lead came from" className="sm:col-span-2"><select name="source" defaultValue="" className="field"><option value="">—</option>{Object.entries(LEAD_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <DateField label="Follow up on" name="followUpOn" title="When will you follow up?" className="sm:col-span-2" />
            <Field label="What the client asked for" hint="Internal — the client never sees this" className="sm:col-span-4"><textarea name="notes" rows={3} className="field" placeholder="Budget, hotel style, honeymoon, veg food, sea view…" /></Field>
          </div>
        </section>
        <SubmitButton size="lg" pendingLabel="Creating…">Create trip</SubmitButton>
      </ActionForm>
    </>
  );
}
