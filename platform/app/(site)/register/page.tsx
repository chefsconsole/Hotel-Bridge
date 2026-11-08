import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { registerAction } from '@/app/actions/auth';

export const metadata = { title: 'Register your agency' };

const DESTINATIONS = ['Thailand', 'Dubai / UAE', 'Vietnam', 'Bali', 'Singapore', 'Malaysia', 'Maldives', 'Sri Lanka', 'Europe', 'UK', 'Switzerland', 'Australia / NZ', 'Domestic India'];
const SEGMENTS = ['FIT / couples & families', 'Honeymoons', 'Groups', 'MICE', 'Weddings'];

export default function RegisterPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 md:grid-cols-[1fr_1.4fr] md:px-6 md:py-24">
      <div>
        <p className="eyebrow">For travel professionals</p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold">Register your agency</h1>
        <div className="prose-hb mt-6">
          <p>HotelBridge works only with travel businesses. Once you register you can search and quote straight away.</p>
          <p>Our team verifies every agency before its first booking — usually within one working day. Indian agencies need their <strong>PAN</strong> and a <strong>PAN card</strong> scan; add your <strong>GSTIN</strong> and GST certificate if you are registered.</p>
          <p>New accounts prepay bookings. Credit terms are available after review.</p>
        </div>
      </div>
      <ActionForm action={registerAction} className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] md:p-8">
        <h2 className="font-semibold">Agency</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Trading name" className="sm:col-span-2"><input name="agencyName" required className="field" autoComplete="organization" /></Field>
          <Field label="Registered legal name" hint="If different"><input name="legalName" className="field" /></Field>
          <Field label="Country"><input name="country" required defaultValue="India" className="field" autoComplete="country-name" /></Field>
          <Field label="PAN" hint="Required in India · e.g. ABCDE1234F"><input name="pan" className="field uppercase" maxLength={10} autoComplete="off" /></Field>
          <Field label="GSTIN" hint="If GST-registered · 15 characters"><input name="gstin" className="field uppercase" maxLength={15} autoComplete="off" /></Field>
          <Field label="Other registration number" hint="Outside India: VAT / trade licence"><input name="taxId" className="field" /></Field>
          <Field label="City"><input name="city" required className="field" autoComplete="address-level2" /></Field>
          <Field label="Website"><input name="website" className="field" placeholder="https://" /></Field>
          <Field label="Phone / WhatsApp"><input name="phone" required className="field" autoComplete="tel" /></Field>
          <Field label="Office address" className="sm:col-span-2"><input name="address" required className="field" autoComplete="street-address" /></Field>
          <Field label="State"><input name="state" required className="field" autoComplete="address-level1" /></Field>
          <Field label="PIN code" hint="Optional"><input name="pincode" className="field" autoComplete="postal-code" inputMode="numeric" /></Field>
          <Field label="Billing currency">
            <select name="billingCurrency" className="field" defaultValue="INR">
              {['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED', 'THB', 'SGD'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <h2 className="mt-8 font-semibold">About your business <span className="text-[0.8rem] font-normal text-muted">· optional</span></h2>
        <p className="mt-1 text-[0.85rem] text-muted">Helps us add the hotels your clients actually ask for.</p>
        <fieldset className="mt-4">
          <legend className="text-[0.85rem] font-medium">Destinations you sell most</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DESTINATIONS.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[0.84rem] has-[:checked]:border-ink has-[:checked]:bg-mist">
                <input type="checkbox" name="destinations" value={d} className="size-3.5 accent-[var(--color-ink)]" />{d}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Other destinations" className="sm:col-span-2"><input name="otherDestinations" className="field" placeholder="e.g. Japan, Kenya, Kashmir" /></Field>
          <fieldset className="sm:col-span-2">
            <legend className="text-[0.85rem] font-medium">What you book</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SEGMENTS.map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[0.84rem] has-[:checked]:border-ink has-[:checked]:bg-mist">
                  <input type="checkbox" name="segments" value={d} className="size-3.5 accent-[var(--color-ink)]" />{d}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Hotel bookings per month">
            <select name="monthlyBookings" className="field" defaultValue=""><option value="">Prefer not to say</option>{['1–10', '11–50', '51–200', '200+'].map((v) => <option key={v}>{v}</option>)}</select>
          </Field>
          <Field label="How did you hear about us?"><input name="heardFrom" className="field" placeholder="Email, WhatsApp, a friend…" /></Field>
        </div>
        <h2 className="mt-8 font-semibold">Documents</h2>
        <p className="mt-1 text-[0.85rem] text-muted">PDF, JPG or PNG, up to 4 MB each. Only HotelBridge&apos;s verification team can open them.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="PAN card" hint="Required in India"><input name="panCard" type="file" accept="application/pdf,image/jpeg,image/png" className="field file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-3 file:py-1 file:text-[0.8rem]" /></Field>
          <Field label="GST certificate" hint="If you entered a GSTIN"><input name="gstCertificate" type="file" accept="application/pdf,image/jpeg,image/png" className="field file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-3 file:py-1 file:text-[0.8rem]" /></Field>
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
