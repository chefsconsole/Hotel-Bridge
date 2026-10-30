import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { partnerApplyAction } from '@/app/actions/auth';

export const metadata = { title: 'Partner with HotelBridge' };

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const k = kind === 'distribution' ? 'distribution' : 'hotel';
  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 md:grid-cols-[1fr_1.3fr] md:px-6 md:py-24">
      <div>
        <p className="eyebrow">Partnerships</p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold">Join the HotelBridge network</h1>
        <div className="prose-hb mt-6">
          <p>We keep each destination&apos;s collection deliberately small, so we add hotels where there is a clear commercial and guest-experience reason to.</p>
          <p>Tell us about your property. If there is a fit, we&apos;ll discuss contract terms — net or commissionable rates, allotment or on-request, cancellation and payment terms — and agree in writing which B2B channels we may distribute to.</p>
          <p>Distribution and technology partners: use the same form and tell us what you have in mind.</p>
        </div>
      </div>
      <ActionForm action={partnerApplyAction} resetOnSuccess className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="I represent" className="sm:col-span-2">
            <select name="kind" defaultValue={k} className="field">
              <option value="hotel">A hotel or hotel group</option>
              <option value="distribution">A distribution / technology partner</option>
            </select>
          </Field>
          <Field label="Organisation or hotel name" className="sm:col-span-2"><input name="organisation" required className="field" /></Field>
          <Field label="Your name"><input name="contactName" required className="field" autoComplete="name" /></Field>
          <Field label="Email"><input name="email" type="email" required className="field" autoComplete="email" /></Field>
          <Field label="Phone"><input name="phone" className="field" autoComplete="tel" /></Field>
          <Field label="Website"><input name="website" className="field" placeholder="https://" /></Field>
          <Field label="City"><input name="city" className="field" /></Field>
          <Field label="Country"><input name="country" className="field" /></Field>
          <Field label="Number of rooms" hint="Hotels only"><input name="rooms" type="number" min={1} className="field" /></Field>
          <Field label="Anything we should know" className="sm:col-span-2"><textarea name="message" rows={4} className="field" /></Field>
        </div>
        <SubmitButton className="mt-6 w-full" size="lg" pendingLabel="Sending…">Send application</SubmitButton>
        <p className="mt-3 text-[0.78rem] text-faint">We use these details only to respond to your application.</p>
      </ActionForm>
    </div>
  );
}
