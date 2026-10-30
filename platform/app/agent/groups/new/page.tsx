import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Notice, PageHeader } from '@/components/ui';
import type { GroupDraftT } from '@/lib/ai/tools';
import { createGroupAction } from '@/app/actions/agent';
import { requireAgent } from '@/lib/session';

export const metadata = { title: 'New group request' };

function readDraft(raw?: string): Partial<GroupDraftT> | null {
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')); } catch { return null; }
}

export default async function NewGroupPage({ searchParams }: { searchParams: Promise<{ prefill?: string }> }) {
  const { agency } = await requireAgent();
  const d = readDraft((await searchParams).prefill);
  const leg = (i: number) => d?.legs?.[i];
  const section = 'rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]';
  return (
    <>
      <PageHeader eyebrow="Group Desk" title="New group request" description="The more precise the request, the better the offers. We acknowledge every request and reply within 24 hours." />
      {d && (
        <div className="mb-6 max-w-4xl"><Notice tone="warning" title="Prepared by AI from your client's brief — check every field before submitting">
          {d.missing?.length ? <>Still needed: {d.missing.join(', ')}.</> : 'Nothing obviously missing, but please verify dates and room split.'}
        </Notice></div>
      )}
      <ActionForm action={createGroupAction} className="max-w-4xl space-y-6">
        <section className={section}>
          <h2 className="font-semibold">The group</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Group name" className="sm:col-span-2"><input name="groupName" defaultValue={d?.groupName ?? ''} className="field" placeholder="e.g. Mehta family wedding" /></Field>
            <Field label="Type"><select name="groupType" defaultValue={d?.groupType ?? 'leisure'} className="field">
              {[['leisure', 'Leisure tour'], ['corporate', 'Corporate'], ['mice', 'Incentive / MICE'], ['wedding', 'Wedding'], ['education', 'Education'], ['sports', 'Sports'], ['other', 'Other']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></Field>
            <Field label="Total travellers"><input name="totalPax" type="number" min={2} defaultValue={d?.totalPax ?? ''} className="field num" /></Field>
          </div>
        </section>
        <section className={section}>
          <h2 className="font-semibold">Itinerary</h2>
          <p className="mt-1 text-[0.85rem] text-muted">One line per stop, in order. Leave unused lines empty.</p>
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                <Field label={`Stop ${i + 1} — city`}><input name={`leg_${i}_city`} defaultValue={leg(i)?.city ?? ''} className="field" /></Field>
                <Field label="Arrival"><input type="date" name={`leg_${i}_in`} defaultValue={leg(i)?.checkIn ?? ''} className="field num" /></Field>
                <Field label="Departure"><input type="date" name={`leg_${i}_out`} defaultValue={leg(i)?.checkOut ?? ''} className="field num" /></Field>
              </div>
            ))}
          </div>
        </section>
        <section className={section}>
          <h2 className="font-semibold">Rooms and requirements</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {['single', 'double', 'twin', 'triple'].map((r) => <Field key={r} label={`${r[0].toUpperCase()}${r.slice(1)} rooms`}><input name={r} type="number" min={0} defaultValue={d?.rooms?.[r as 'single'] ?? 0} className="field num" /></Field>)}
            <Field label="Hotel category"><select name="category" defaultValue={d?.category ?? ''} className="field"><option value="">No preference</option><option value="3">3-star</option><option value="4">4-star</option><option value="5">5-star</option></select></Field>
            <Field label="Meals"><select name="mealPlan" defaultValue={d?.mealPlan ?? ''} className="field"><option value="">Please advise</option><option value="RO">Room only</option><option value="BB">Breakfast</option><option value="HB">Half board</option><option value="FB">Full board</option></select></Field>
            <label className="flex items-center gap-2 self-end pb-3 text-[0.88rem] sm:col-span-2"><input type="checkbox" name="coachParking" defaultChecked={d?.coachParking ?? false} className="size-4 accent-[var(--color-ink)]" /> Coach access / parking needed</label>
            <Field label="Accessibility needs" className="sm:col-span-2"><input name="accessibility" defaultValue={d?.accessibility ?? ''} className="field" /></Field>
            <Field label="Other requirements" className="sm:col-span-2"><input name="specialRequests" defaultValue={d?.specialRequests ?? ''} className="field" placeholder="Meeting room, adjoining rooms, dietary…" /></Field>
          </div>
        </section>
        <section className={section}>
          <h2 className="font-semibold">Budget and deadline</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Field label="Currency"><select name="currency" defaultValue={d?.currency ?? agency.billingCurrency} className="field">{['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED', 'THB', 'SGD'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Target budget" hint="Optional"><input name="budget" defaultValue={d?.budget ?? ''} className="field num" inputMode="decimal" /></Field>
            <Field label="Budget covers"><select name="budgetBasis" defaultValue={d?.budgetBasis ?? ''} className="field"><option value="">—</option><option value="per_room_night">Per room per night</option><option value="per_person_total">Per person, whole trip</option><option value="total">Whole group</option></select></Field>
            <Field label="Quotation needed by"><input type="date" name="quoteNeededBy" defaultValue={d?.quoteNeededBy ?? ''} className="field num" /></Field>
          </div>
        </section>
        <SubmitButton size="lg" pendingLabel="Submitting…">Submit group request</SubmitButton>
      </ActionForm>
    </>
  );
}
