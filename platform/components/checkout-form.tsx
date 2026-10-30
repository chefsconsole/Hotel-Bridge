'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { bookAction } from '@/app/actions/agent';
import { Field, SubmitButton } from './forms';
import { buttonClass } from './ui';
import type { RoomRequest } from '@/lib/db/schema';

export function CheckoutForm({ quoteId, idempotencyKey, sellMinor, rooms, roomName, cta, searchHref, children }: {
  quoteId: string; idempotencyKey: string; sellMinor: number; rooms: RoomRequest[]; roomName: string; cta: string; searchHref: string; children?: React.ReactNode;
}) {
  const [state, run] = useActionState(bookAction, null);
  const newQuote = state?.data?.newQuoteId as string | undefined;
  const unavailable = !!state?.data?.unavailable;
  return (
    <form action={run} className="space-y-6" noValidate>
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="acceptedSellMinor" value={sellMinor} />
      <input type="hidden" name="roomCount" value={rooms.length} />

      <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <h2 className="font-semibold">Guests</h2>
        <p className="mt-1 text-[0.85rem] text-muted">Names exactly as on passports. The lead guest&apos;s name appears on the voucher.</p>
        <Field label="Lead guest (full name)" className="mt-4"><input name="leadGuest" required className="field" autoComplete="off" /></Field>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {rooms.map((r, i) => (
            <fieldset key={i} className="rounded-[var(--radius-md)] border border-line bg-paper/50 p-4">
              <legend className="px-1 text-[0.82rem] font-semibold">Room {i + 1} · {roomName} · {r.adults} adult{r.adults === 1 ? '' : 's'}{r.childAges.length ? `, children ${r.childAges.join(', ')}` : ''}</legend>
              <div className="space-y-2">
                {Array.from({ length: Math.min(3, r.adults + r.childAges.length) }, (_, k) => (
                  <input key={k} name={`guest_${i}_${k + 1}`} className="field" placeholder={k === 0 ? 'Guest name' : 'Additional guest (optional)'} autoComplete="off" />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <h2 className="font-semibold">For your records</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Your reference" hint="Your file number — shown on vouchers and invoices"><input name="agentReference" className="field" maxLength={60} /></Field>
          <Field label="Requests to the hotel" hint="Not guaranteed — the hotel will try to accommodate"><textarea name="specialRequests" rows={2} className="field" maxLength={500} /></Field>
        </div>
      </section>

      {children}

      {state && !state.ok && (
        <div role="alert" className="rounded-[var(--radius-md)] border border-[#f0caca] bg-negative-bg px-4 py-3 text-[0.9rem] text-negative">
          <p className="whitespace-pre-line">{state.message}</p>
          {newQuote && <Link href={`/agent/checkout/${newQuote}`} className={buttonClass('primary', 'sm', 'mt-3')}>Review the new price</Link>}
          {unavailable && <Link href={searchHref} className={buttonClass('secondary', 'sm', 'mt-3')}>Choose another option</Link>}
        </div>
      )}
      {!newQuote && !unavailable && (
        <SubmitButton size="lg" className="w-full" pendingLabel="Re-checking price and booking…">{cta}</SubmitButton>
      )}
    </form>
  );
}
