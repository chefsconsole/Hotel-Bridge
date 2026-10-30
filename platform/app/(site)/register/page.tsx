import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { registerAction } from '@/app/actions/auth';

export const metadata = { title: 'Register your agency' };

export default function RegisterPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 md:grid-cols-[1fr_1.4fr] md:px-6 md:py-24">
      <div>
        <p className="eyebrow">For travel professionals</p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold">Register your agency</h1>
        <div className="prose-hb mt-6">
          <p>HotelBridge works only with travel businesses. Once you register you can search and quote straight away.</p>
          <p>Our team verifies every agency before its first booking — usually within one working day. We may ask for your trade licence or registration documents.</p>
          <p>New accounts prepay bookings. Credit terms are available after review.</p>
        </div>
      </div>
      <ActionForm action={registerAction} className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] md:p-8">
        <h2 className="font-semibold">Agency</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Trading name" className="sm:col-span-2"><input name="agencyName" required className="field" autoComplete="organization" /></Field>
          <Field label="Registered legal name" hint="If different"><input name="legalName" className="field" /></Field>
          <Field label="Tax / registration number" hint="GSTIN, VAT, trade licence…"><input name="taxId" className="field" /></Field>
          <Field label="Country"><input name="country" required className="field" autoComplete="country-name" /></Field>
          <Field label="City"><input name="city" className="field" autoComplete="address-level2" /></Field>
          <Field label="Website"><input name="website" className="field" placeholder="https://" /></Field>
          <Field label="Phone"><input name="phone" className="field" autoComplete="tel" /></Field>
          <Field label="Billing currency">
            <select name="billingCurrency" className="field" defaultValue="EUR">
              {['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <h2 className="mt-8 font-semibold">Your login</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input name="name" required className="field" autoComplete="name" /></Field>
          <Field label="Work email"><input name="email" type="email" required className="field" autoComplete="email" /></Field>
          <Field label="Password" hint="At least 10 characters" className="sm:col-span-2"><input name="password" type="password" required minLength={10} className="field" autoComplete="new-password" /></Field>
        </div>
        <label className="mt-6 flex items-start gap-3 text-[0.88rem] text-muted">
          <input type="checkbox" name="terms" className="mt-1 size-4 accent-[var(--color-ink)]" />
          <span>I am authorised to register this business and accept the <Link href="/legal/terms" className="text-ink underline">terms of business</Link> and <Link href="/legal/privacy" className="text-ink underline">privacy notice</Link>.</span>
        </label>
        <SubmitButton className="mt-6 w-full" size="lg" pendingLabel="Creating your account…">Create agency account</SubmitButton>
      </ActionForm>
    </div>
  );
}
