import { and, desc, eq, inArray } from 'drizzle-orm';
import { AiForm, AiOffNotice, Sparkle } from '@/components/ai-bits';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { SmartSearch } from '@/components/smart-search';
import { PageHeader, Panel } from '@/components/ui';
import { clientMessageAction, groupBriefAction, helpAction } from '@/app/actions/ai';
import { aiConfigured } from '@/lib/ai/client';
import { getDb, schema } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { requireAgent } from '@/lib/session';

export const metadata = { title: 'AI assistant' };

export default async function AgentAi() {
  const { agency } = await requireAgent();
  const on = aiConfigured();
  const db = await getDb();
  const recent = await db.select({ id: schema.bookings.id, reference: schema.bookings.reference, leadGuest: schema.bookings.leadGuest, checkIn: schema.bookings.checkIn, hotel: schema.hotels.name })
    .from(schema.bookings).innerJoin(schema.hotels, eq(schema.hotels.id, schema.bookings.hotelId))
    .where(and(eq(schema.bookings.agencyId, agency.id), inArray(schema.bookings.status, ['confirmed', 'awaiting_payment', 'pending_confirmation', 'amendment_requested'])))
    .orderBy(desc(schema.bookings.createdAt)).limit(30);
  return (
    <>
      <PageHeader eyebrow="AI assistant" title="Work faster, with your own data"
        description="Every tool here reads only HotelBridge records and what you paste in. It drafts and suggests — you review before anything is sent or saved." />
      {!on && <div className="mb-8"><AiOffNotice /></div>}

      <section className="relative mb-8 overflow-hidden rounded-[var(--radius-lg)] bg-ink px-6 py-8 text-paper md:px-10 md:py-10">
        <p className="eyebrow">Describe the stay</p>
        <h2 className="mt-3 max-w-xl text-[1.6rem] leading-tight font-light tracking-[-0.03em] md:text-[2rem]">Type it the way your client said it.</h2>
        <div className="mt-6 max-w-3xl"><SmartSearch enabled={on} /></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Message for your client" description="A ready-to-send WhatsApp or email about a booking. Never mentions HotelBridge or net rates.">
          {recent.length === 0 ? <p className="text-[0.9rem] text-muted">Make a booking first — then draft the client message here.</p> : (
            <AiForm action={clientMessageAction} submit="Draft message" disabled={!on} outputLabel="Client message">
              <Field label="Booking"><select name="bookingId" className="field">{recent.map((b) => <option key={b.id} value={b.id}>{b.reference} · {b.hotel} · {b.leadGuest} · {formatDate(b.checkIn)}</option>)}</select></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Channel"><select name="channel" className="field"><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></Field>
                <Field label="Language"><select name="language" className="field">{['English', 'Hindi', 'Hinglish', 'Gujarati', 'Marathi', 'Tamil', 'Arabic', 'French', 'German'].map((l) => <option key={l}>{l}</option>)}</select></Field>
              </div>
              <Field label="Your price to the client" hint="Optional — included exactly as you type it"><input name="clientPrice" className="field" placeholder="e.g. ₹1,85,000 for the package" /></Field>
              <Field label="Anything to add"><input name="note" className="field" placeholder="e.g. airport transfer is arranged separately" /></Field>
            </AiForm>
          )}
        </Panel>

        <Panel title="Turn a client brief into a group request" description="Paste the client's email or WhatsApp. We fill the Group Desk form for you to check and submit.">
          <ActionForm action={groupBriefAction}>
            <Field label="Client brief"><textarea name="brief" rows={9} className="field" placeholder="Hi, we are 42 people for a wedding in Bangkok and Pattaya, 14–19 Feb…" disabled={!on} /></Field>
            <SubmitButton className="mt-4" pendingLabel="Reading the brief…"><Sparkle /> Prepare group request</SubmitButton>
          </ActionForm>
        </Panel>

        <Panel title="Ask how something works" description="Quick answers about booking, payment, cancellations and the Group Desk." className="lg:col-span-2">
          <AiForm action={helpAction} submit="Ask" disabled={!on} outputLabel="Answer">
            <Field label="Your question"><input name="question" className="field" placeholder="Can I cancel a booking that is still on request?" /></Field>
          </AiForm>
        </Panel>
      </div>
    </>
  );
}
