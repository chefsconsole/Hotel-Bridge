import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { contactAction } from '@/app/actions/auth';
import { PageHero, Section } from '@/components/site/page-bits';
import { OFFICE_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, whatsappUrl } from '@/lib/config';

/* Contact. The quickest route is listed first because it is genuinely the
 * quickest; the form is for anything that needs a record. Messages land in the
 * same queue as partner applications, which someone reads every working day. */

export const metadata = {
  title: 'Contact HotelBridge',
  description: 'WhatsApp, email or write to us. HotelBridge, Kandivali West, Mumbai.',
};

const WA_TEXT = 'Hello HotelBridge — I have a question.';

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to a person."
        lead="Agency, hotel or neither — pick whichever way is easiest. WhatsApp reaches us fastest; anything you would rather have in writing can go in the form below."
      />

      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <a href={whatsappUrl(WA_TEXT)} target="_blank" rel="noreferrer"
            className="group rounded-[var(--radius-lg)] border border-line bg-paper p-7 transition-colors hover:border-champagne">
            <span className="flex size-10 items-center justify-center rounded-full bg-ink text-paper">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.13 15.07l-.3-.18-3.1.82.83-3.02-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm4.66 10.2c-.25-.13-1.47-.73-1.7-.81-.23-.09-.4-.13-.56.12s-.64.8-.79.97c-.14.17-.29.19-.54.06a6.63 6.63 0 0 1-3.3-2.88c-.25-.43.25-.4.71-1.33.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.4-.42-.56-.42h-.47c-.17 0-.44.06-.67.31s-.88.86-.88 2.1.9 2.43 1.03 2.6c.12.16 1.77 2.7 4.28 3.78 1.6.69 2.22.75 3.02.63.49-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.23-.17-.48-.3Z" /></svg>
            </span>
            <p className="mt-5 font-semibold">WhatsApp</p>
            <p className="num mt-1 text-[0.95rem] group-hover:underline">{SUPPORT_PHONE_DISPLAY}</p>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">The fastest way to reach us, and the one most agents use.</p>
          </a>

          <a href={`mailto:${SUPPORT_EMAIL}`}
            className="group rounded-[var(--radius-lg)] border border-line bg-paper p-7 transition-colors hover:border-champagne">
            <span className="flex size-10 items-center justify-center rounded-full bg-ink text-paper">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="m3 6 9 6.5L21 6" /></svg>
            </span>
            <p className="mt-5 font-semibold">Email</p>
            <p className="mt-1 text-[0.95rem] group-hover:underline">{SUPPORT_EMAIL}</p>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">Best for contracts, rate sheets and anything with an attachment.</p>
          </a>

          <div className="rounded-[var(--radius-lg)] border border-line bg-paper p-7">
            <span className="flex size-10 items-center justify-center rounded-full bg-ink text-paper">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>
            </span>
            <p className="mt-5 font-semibold">Office</p>
            <address className="mt-1 text-[0.95rem] leading-relaxed text-muted not-italic">
              {OFFICE_ADDRESS.map((l) => <span key={l} className="block">{l}</span>)}
            </address>
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid gap-12 md:grid-cols-[1fr_1.25fr]">
          <div>
            <p className="eyebrow">Already know what you need?</p>
            <h2 className="mt-4 text-[1.8rem] leading-tight font-semibold tracking-[-0.03em]">Skip the form.</h2>
            <div className="prose-hb mt-6">
              <p>
                <strong>A travel agency wanting access?</strong>{' '}
                <Link href="/register" className="underline underline-offset-4">Register your agency</Link> — it takes a
                few minutes, and verification is usually done within one working day.
              </p>
              <p>
                <strong>A hotel, hotel group, or a distribution or technology partner?</strong>{' '}
                <Link href="/partners" className="underline underline-offset-4">Use the partnership form</Link>, which
                asks the things our partnerships team needs to know up front.
              </p>
              <p>
                <strong>Already registered and stuck?</strong>{' '}
                <Link href="/login" className="underline underline-offset-4">Sign in</Link> and raise it from inside the
                portal, so it arrives attached to your agency and your booking.
              </p>
            </div>
          </div>

          <ActionForm action={contactAction} resetOnSuccess
            className="rounded-[var(--radius-lg)] border border-line bg-paper p-6 shadow-[var(--shadow-soft)] md:p-8">
            <p className="text-[1.05rem] font-semibold">Send us a message</p>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-muted">We reply personally, usually the same working day.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Your name"><input name="contactName" required className="field" autoComplete="name" /></Field>
              <Field label="Agency or hotel name"><input name="organisation" required className="field" autoComplete="organization" /></Field>
              <Field label="Email"><input name="email" type="email" required className="field" autoComplete="email" /></Field>
              <Field label="Phone or WhatsApp"><input name="phone" className="field" autoComplete="tel" /></Field>
              <Field label="City" className="sm:col-span-2"><input name="city" className="field" /></Field>
              <Field label="How can we help?" className="sm:col-span-2">
                <textarea name="message" rows={5} required className="field" placeholder="Tell us what you need — a destination, a group enquiry, a question about the portal." />
              </Field>
            </div>
            <SubmitButton className="mt-6 w-full" size="lg" pendingLabel="Sending…">Send message</SubmitButton>
            <p className="mt-3 text-[0.78rem] text-faint">We use these details only to reply to you.</p>
          </ActionForm>
        </div>
      </Section>
    </>
  );
}
