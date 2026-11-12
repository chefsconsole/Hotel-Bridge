import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { DateField, StayDatesField } from '@/components/date-fields';
import { Notice, PageHeader } from '@/components/ui';
import type { GroupDraftT } from '@/lib/ai/tools';
import { createGroupAction } from '@/app/actions/agent';
import { quickGroupAction } from '@/app/actions/ai';
import { aiConfigured } from '@/lib/ai/client';
import { TIERS, TIER_INFO } from '@/lib/domain/tiers';
import { requireAgent } from '@/lib/session';

export const metadata = { title: 'New group request' };

function readDraft(raw?: string): Partial<GroupDraftT> | null {
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')); } catch { return null; }
}

export default async function NewGroupPage({ searchParams }: { searchParams: Promise<{ prefill?: string }> }) {
  const { agency } = await requireAgent();
  const aiOn = aiConfigured();
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
      {!d && (
        <div className="mb-6 max-w-4xl rounded-[var(--radius-lg)] border border-champagne/40 bg-champagne-soft p-5">
          <p className="font-semibold">Got a group enquiry? Just paste it.</p>
          <p className="mt-1 text-[0.86rem] text-muted">WhatsApp message, client email, your notes — in any format. {aiOn ? 'Our AI sorts it into a group request and sends it to our Group Desk. If something is missing, we still get your message and come back to you.' : 'It goes straight to our Group Desk, who will come back to you.'}</p>
          <ActionForm action={quickGroupAction} className="mt-4 space-y-3">
            <textarea name="brief" rows={6} className="field" placeholder="e.g. 40 pax wedding group, Phuket 12–15 Feb, 18 doubles 2 triples, breakfast, 5-star, need quote by Friday" />
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton size="sm" pendingLabel="Sending…">Send to Group Desk</SubmitButton>
              {aiOn && <SubmitButton size="sm" variant="secondary" name="mode" value="review" pendingLabel="Reading…">Fill the form first, I’ll check it</SubmitButton>}
            </div>
          </ActionForm>
          <p className="mt-4 text-[0.82rem] text-muted">Prefer to type it yourself? Use the form below.</p>
        </div>
      )}
      <ActionForm action={createGroupAction} className="max-w-4xl space-y-6">
        <section className={section}>
          <h2 className="font-semibold">The group</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Group name" className="sm:col-span-2"><input name="groupName" required defaultValue={d?.groupName ?? ''} className="field" placeholder="e.g. Mehta family wedding" /></Field>
            <Field label="Type"><select name="groupType" defaultValue={d?.groupType ?? 'leisure'} className="field">
              {[['leisure', 'Leisure tour'], ['corporate', 'Corporate'], ['mice', 'Incentive / MICE'], ['wedding', 'Wedding'], ['education', 'Education'], ['sports', 'Sports'], ['other', 'Other']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></Field>
            <Field label="Total travellers"><input name="totalPax" required type="number" min={2} defaultValue={d?.totalPax ?? ''} className="field num" /></Field>
          </div>
        </section>
        <section className={section}>
          <h2 className="font-semibold">Itinerary</h2>
          <p className="mt-1 text-[0.85rem] text-muted">One line per stop, in order. Leave unused lines empty.</p>
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                <Field label={`Stop ${i + 1} — city`}><input name={`leg_${i}_city`} required={i === 0} data-field={i === 0 ? 'legs' : undefined} defaultValue={leg(i)?.city ?? ''} className="field" /></Field>
                <StayDatesField label={`Stop ${i + 1} — dates`} nameIn={`leg_${i}_in`} nameOut={`leg_${i}_out`} defaultIn={leg(i)?.checkIn ?? ''} defaultOut={leg(i)?.checkOut ?? ''} className="sm:col-span-2" required={i === 0} />
              </div>
            ))}
          </div>
        </section>
        <section className={section}>
          <h2 className="font-semibold">Hotel level</h2>
          <p className="mt-1 text-[0.85rem] text-muted">Which of our hotels should we ask? Pick one or more — or none for the best fit at any level.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {TIERS.map((t) => (
              <label key={t} className="flex cursor-pointer gap-3 rounded-[var(--radius-md)] border border-line p-3 has-[:checked]:border-champagne has-[:checked]:bg-champagne-soft">
                <input type="checkbox" name="tiers" value={t} defaultChecked={d?.tiers?.includes(t)} className="mt-1 size-4 accent-[var(--color-champagne)]" />
                <span><span className="block font-medium">{TIER_INFO[t].label}</span><span className="block text-[0.75rem] text-muted">{TIER_INFO[t].stars}</span></span>
              </label>
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
            <DateField required label="Quotation needed by" name="quoteNeededBy" defaultValue={d?.quoteNeededBy ?? ''} title="When do you need the quotation?" />
          </div>
        </section>
        <section className={section}>
          <Field label="Client's message" hint="Optional — the brief in the client's own words; the Group Desk sees it"><textarea name="clientBrief" rows={4} defaultValue={d?.brief ?? ''} className="field" /></Field>
        </section>
        <p className="max-w-4xl text-[0.85rem] text-muted">When you submit, we ask our contracted group hotels in each city straight away. Hotels reply within 48 hours; your offer then appears here, held for 48 hours.</p>
        <SubmitButton size="lg" pendingLabel="Submitting…">Submit group request</SubmitButton>
      </ActionForm>
    </>
  );
}
