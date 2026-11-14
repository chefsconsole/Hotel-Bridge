import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { StayDatesField } from '@/components/date-fields';
import { PageHeader } from '@/components/ui';
import { createRequestAction } from '@/app/actions/agent';
import { TIERS, TIER_INFO } from '@/lib/domain/tiers';
import { requireAgent } from '@/lib/session';

export const metadata = { title: 'Request a hotel' };

/** Anything we don't already sell: a destination we have no partner in yet, or a
 *  particular hotel the client has asked for. One room or forty — the desk sources it. */
export default async function RequestHotelPage({ searchParams }: {
  searchParams: Promise<{ city?: string; in?: string; out?: string; adults?: string; rooms?: string; hotel?: string }>;
}) {
  await requireAgent();
  const sp = await searchParams;
  const section = 'rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]';
  const n = (v: string | undefined, fallback: number) => {
    const x = Number(v);
    return Number.isInteger(x) && x > 0 && x < 100 ? x : fallback;
  };
  return (
    <>
      <PageHeader
        eyebrow="Hotel request"
        title="Tell us what you need"
        description="Somewhere we don't list yet, or a particular hotel your client has asked for. We go to the hotels, negotiate, and come back with a rate — usually within 24 hours."
      />
      <ActionForm action={createRequestAction} className="max-w-3xl space-y-6">
        <section className={section}>
          <h2 className="font-semibold">Where and when</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Destination" required hint="City, area or region — anywhere in the world.">
              <input name="city" required defaultValue={sp.city ?? ''} className="field" placeholder="e.g. Jaipur" autoFocus={!sp.city} />
            </Field>
            <StayDatesField label="Dates" nameIn="checkIn" nameOut="checkOut" required defaultIn={sp.in ?? ''} defaultOut={sp.out ?? ''} />
            <Field label="Rooms"><input name="rooms" type="number" min={1} max={99} required defaultValue={n(sp.rooms, 1)} className="field num" /></Field>
            <Field label="Guests" hint="Adults in total, across all rooms.">
              <input name="totalPax" type="number" min={1} max={999} required defaultValue={n(sp.adults, 2)} className="field num" />
            </Field>
          </div>
        </section>

        <section className={section}>
          <h2 className="font-semibold">What standard?</h2>
          <p className="mt-1 text-[0.85rem] text-muted">Pick any that would suit the client. Leave all unticked and we&rsquo;ll quote the best value we can find.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TIERS.map((t) => (
              <label key={t} className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line p-3">
                <input type="checkbox" name="tiers" value={t} className="mt-1 size-4 accent-[var(--color-champagne)]" />
                <span>
                  <span className="block text-[0.9rem] font-medium">{TIER_INFO[t].label} <span className="text-faint">· {TIER_INFO[t].stars}</span></span>
                  <span className="block text-[0.8rem] text-muted">{TIER_INFO[t].client}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className={section}>
          <h2 className="font-semibold">Anything specific?</h2>
          <div className="mt-4 space-y-4">
            <Field label="A particular hotel" hint="If your client has named one, we'll go to that hotel first.">
              <input name="wantedHotel" defaultValue={sp.hotel ?? ''} className="field" placeholder="e.g. Rambagh Palace" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Meal plan"><select name="mealPlan" defaultValue="" className="field">
                {[['', 'No preference'], ['RO', 'Room only'], ['BB', 'Breakfast'], ['HB', 'Half board'], ['FB', 'Full board']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></Field>
              <Field label="Budget per room, per night" hint="Optional — it helps us aim right.">
                <input name="budget" className="field num" placeholder="e.g. 6000" inputMode="decimal" />
              </Field>
              <Field label="Currency"><select name="currency" defaultValue="INR" className="field">
                {['INR', 'USD', 'EUR', 'GBP', 'AED', 'THB', 'SGD', 'CHF'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select></Field>
            </div>
            <Field label="Notes for the desk" hint="Honeymoon, pool view, close to the station, the client's own words — whatever helps.">
              <textarea name="specialRequests" rows={4} className="field" placeholder="e.g. Honeymoon couple, would love a Taj view, flexible by a day either side." />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton pendingLabel="Sending…">Send the request</SubmitButton>
          <p className="text-[0.82rem] text-muted">We acknowledge every request and reply within 24 hours.</p>
        </div>
      </ActionForm>
    </>
  );
}
