import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { DateField, StayDatesField } from '@/components/date-fields';
import { StatusPill } from '@/components/booking-bits';
import { ReminderComposer, ShareProposal } from '@/components/trip-bits';
import { LinkButton, Money, Notice, PageHeader, Panel, Pill, cx } from '@/components/ui';
import {
  addExtraAction, bookTripHotelsAction, clientPaymentAction, deleteClientPaymentAction, duplicateTripAction, followUpAction,
  priceItemAction, removeItemAction, sharingAction, tripStatusAction, updateTripAction,
} from '@/app/actions/trips';
import { getDb } from '@/lib/db';
import { TRIP_ITEM_KINDS } from '@/lib/db/schema';
import { daysBetween, formatDate, todayIso } from '@/lib/domain/dates';
import { CURRENCIES, toDecimalString } from '@/lib/domain/money';
import { encodeRooms, describeRooms } from '@/lib/domain/occupancy';
import { hotelShare } from '@/lib/domain/trip';
import { NotFoundError } from '@/lib/services/errors';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { requireAgent } from '@/lib/session';
import {
  ITEM_KIND_LABEL, LEAD_SOURCES, PAYMENT_METHODS, TRIP_STATUSES, TRIP_STATUS_LABEL, getTrip, type TripItemView,
} from '@/lib/services/trips';

export const metadata = { title: 'Trip' };

const KIND_ICON: Record<string, string> = {
  hotel: 'M4 21V5l8-2v18M12 7l8 2v12M8 9h.01M8 13h.01M8 17h.01M16 13h.01M16 17h.01M2 21h20',
  flight: 'M3 14l7-2 4-8 2 1-2 7 6 1 1 2-7 1-3 6-2-1 1-5-6 1z',
  visa: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h3',
  transfer: 'M5 16V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8M3 16h18v2H3zM7 19v2M17 19v2M5 11h14',
  activity: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z',
  insurance: 'M12 3l8 3v6c0 4.4-3.4 8.2-8 9-4.6-.8-8-4.6-8-9V6z',
  other: 'M12 5v14M5 12h14',
};
const Glyph = ({ d, className = 'size-[18px]' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={cx('shrink-0', className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

function defaultRooms(adults: number) {
  const n = Math.min(9, Math.max(1, Math.ceil(adults / 2)));
  return Array.from({ length: n }, (_, i) => ({ adults: i === n - 1 && adults % 2 === 1 && adults > 1 ? 1 : Math.min(2, adults), childAges: [] as number[] }));
}

export default async function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; added?: string; copied?: string }> }) {
  const { actor, agency } = await requireAgent();
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  let data;
  try { data = await getTrip(db, actor, id); } catch (e) { if (e instanceof NotFoundError) notFound(); throw e; }
  const { trip: t, client, items, payments, totals } = data;
  const today = todayIso();
  const hotels = items.filter((i) => i.kind === 'hotel');
  const toBook = hotels.filter((i) => !i.booking || ['cancelled', 'declined', 'failed'].includes(i.booking.status));
  const searchHref = `/agent/search?${new URLSearchParams({
    trip: t.id, ...(t.startDate ? { in: t.startDate } : {}), ...(t.endDate ? { out: t.endDate } : {}), rooms: encodeRooms(defaultRooms(t.adults)),
  })}`;
  const who = { clientName: client.name, phone: client.phone, email: client.email, agencyName: agency.brandName || agency.name, signOff: agency.brandName || agency.name, title: t.title };
  const sharePath = `/t/${t.shareToken}`;
  const overdue = !!t.balanceDueOn && t.balanceDueOn < today && totals.pendingMinor > 0;
  const nights = t.startDate && t.endDate ? daysBetween(t.startDate, t.endDate) : 0;
  const share = hotelShare(totals);

  return (
    <>
      <div className="mb-4 text-[0.85rem]"><Link href="/agent/trips" className="text-muted hover:text-ink">← Client trips</Link></div>
      <PageHeader
        eyebrow={`${t.reference}${t.source ? ` · ${LEAD_SOURCES[t.source as keyof typeof LEAD_SOURCES]}` : ''}`}
        title={t.title}
        description={<>
          <Link href={`/agent/clients/${client.id}`} className="font-medium text-ink underline-offset-4 hover:underline">{client.name}</Link>
          {client.phone && <> · <a href={`tel:${client.phone}`} className="hover:text-ink">{client.phone}</a></>}
          {' · '}{t.startDate ? <>{formatDate(t.startDate, { day: 'numeric', month: 'short' })}{t.endDate && <> – {formatDate(t.endDate)} · {nights} night{nights === 1 ? '' : 's'}</>}</> : 'Dates open'}
          {' · '}{t.adults} adult{t.adults === 1 ? '' : 's'}{t.children ? `, ${t.children} child${t.children === 1 ? '' : 'ren'}` : ''}
        </>}
        actions={<>
          <ActionForm action={duplicateTripAction}><input type="hidden" name="tripId" value={t.id} /><SubmitButton variant="secondary" pendingLabel="Copying…">Duplicate</SubmitButton></ActionForm>
          <LinkButton href={sharePath} target="_blank" variant="secondary">Client view</LinkButton>
        </>}
      />

      {sp.new && <div className="mb-6"><Notice tone="success" title="Trip created">Next: add hotels from search, then flights, visa or anything else you are selling. Share the plan when it looks right.</Notice></div>}
      {sp.added && <div className="mb-6"><Notice tone="success" title="Hotel added">Its price was re-checked just now. Set what your client pays, then add the next hotel or book them all at once.</Notice></div>}
      {sp.copied && <div className="mb-6"><Notice title="This is a copy">Same client, lines and prices — no bookings or payments. Change dates and hotels as needed; prices are re-checked when you book.</Notice></div>}
      {t.clientApprovedAt && t.status !== 'booked' && t.status !== 'completed' && (
        <div className="mb-6"><Notice tone="success" title={`${client.name} approved this plan on ${formatDate(t.clientApprovedAt)}`}>Book the hotels below and collect the advance.</Notice></div>
      )}

      {/* Pipeline stage */}
      <ActionForm action={tripStatusAction} className="mb-8">
        <input type="hidden" name="tripId" value={t.id} />
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-soft)] sm:inline-flex">
          {TRIP_STATUSES.map((s, i) => {
            const active = t.status === s;
            const past = TRIP_STATUSES.indexOf(t.status as typeof s) > i && t.status !== 'cancelled' && s !== 'cancelled';
            return (
              <button key={s} type="submit" name="status" value={s} disabled={active}
                className={cx('flex items-center gap-2 rounded-full px-4 py-2 text-[0.84rem] transition-colors',
                  active ? (s === 'cancelled' ? 'bg-negative text-white' : 'bg-ink text-paper') : past ? 'text-ink hover:bg-mist' : 'text-muted hover:bg-mist hover:text-ink')}>
                {s !== 'cancelled' && <span className={cx('num flex size-5 items-center justify-center rounded-full text-[0.7rem]', active ? 'bg-paper/15' : past ? 'bg-champagne-soft text-champagne' : 'bg-mist')}>{past ? '✓' : i + 1}</span>}
                {TRIP_STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
      </ActionForm>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {/* The package */}
          <Panel title="The package" description="Hotels are booked through HotelBridge. Everything else is what you sell yourself — add it so the client sees one complete price."
            actions={<LinkButton href={searchHref} size="sm">Add hotel</LinkButton>} padded={false}>
            {items.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-medium">Nothing on this trip yet</p>
                <p className="mx-auto mt-1 max-w-md text-[0.9rem] text-muted">Search hotels for these dates and press “Add to trip” on the room you want. Add flights, visa and transfers below.</p>
                <LinkButton href={searchHref} size="sm" className="mt-5">Search hotels for this trip</LinkButton>
              </div>
            ) : (
              <ol className="divide-y divide-line">
                {items.map((i) => <ItemRow key={i.id} item={i} currency={t.currency} tripId={t.id} highlight={sp.added === i.id} />)}
              </ol>
            )}
            <details className="group border-t border-line" open={items.length > 0 && items.every((i) => i.kind === 'hotel')}>
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-[0.92rem] font-medium hover:bg-mist/50">
                <span className="flex items-center gap-2"><Glyph d={KIND_ICON.other} className="size-4 text-champagne" />Add flights, visa, transfers, tours…</span>
                <span className="text-muted transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <ActionForm action={addExtraAction} resetOnSuccess className="grid gap-4 px-6 pb-6 sm:grid-cols-6">
                <input type="hidden" name="tripId" value={t.id} />
                <Field label="Type" className="sm:col-span-2"><select name="kind" className="field">{TRIP_ITEM_KINDS.filter((k) => k !== 'hotel').map((k) => <option key={k} value={k}>{ITEM_KIND_LABEL[k]}</option>)}</select></Field>
                <Field label="What" className="sm:col-span-4"><input name="title" className="field" placeholder="e.g. Mumbai–Phuket return, IndiGo · 4 pax" /></Field>
                <Field label="Details for the client" className="sm:col-span-4" hint="Optional — times, inclusions, PNR once issued"><input name="details" className="field" /></Field>
                <DateField label="Date" name="startDate" className="sm:col-span-2" />
                <Field label={`Client pays (${t.currency})`} className="sm:col-span-2"><input name="clientPrice" inputMode="decimal" className="field num" placeholder="40000" /></Field>
                <Field label="Your cost" className="sm:col-span-2" hint="Optional — for your profit"><input name="cost" inputMode="decimal" className="field num" /></Field>
                <Field label="Cost in" className="sm:col-span-1"><select name="costCurrency" defaultValue={t.currency} className="field">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Supplier" className="sm:col-span-1" hint="Optional"><input name="supplierName" className="field" /></Field>
                <div className="sm:col-span-6"><SubmitButton size="sm" pendingLabel="Adding…">Add to trip</SubmitButton></div>
              </ActionForm>
            </details>
          </Panel>

          {/* One click, every hotel */}
          {hotels.length > 0 && (
            <Panel title={toBook.length ? `Book ${toBook.length === hotels.length && hotels.length > 1 ? 'all ' : ''}${toBook.length} hotel${toBook.length === 1 ? '' : 's'}` : 'All hotels booked'}
              description={toBook.length ? 'Each hotel is re-checked and booked in turn. A changed price is never accepted for you — that hotel is held back so you can review it. Pressing twice never books twice.' : 'Track confirmations and payments to HotelBridge in My bookings.'}>
              {toBook.length > 0 ? (
                <ActionForm action={bookTripHotelsAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <input type="hidden" name="tripId" value={t.id} />
                  <Field label="Lead guest name (as on passport)" className="flex-1"><input name="leadGuest" defaultValue={client.name} className="field" /></Field>
                  <SubmitButton size="lg" pendingLabel="Booking hotels…" confirm={`Book ${toBook.length} hotel${toBook.length === 1 ? '' : 's'} for ${client.name} now?`}>
                    Book {toBook.length > 1 ? 'all ' : ''}{toBook.length} hotel{toBook.length === 1 ? '' : 's'}
                  </SubmitButton>
                </ActionForm>
              ) : (
                <ul className="space-y-2 text-[0.88rem]">
                  {hotels.map((h) => h.booking && <li key={h.id} className="flex items-center justify-between gap-3"><Link href={`/agent/bookings/${h.booking.id}`} className="num font-medium hover:underline">{h.booking.reference}</Link><span className="flex-1 truncate text-muted">{h.title}</span><StatusPill status={h.booking.status} /></li>)}
                </ul>
              )}
            </Panel>
          )}

          {/* Payments from the client */}
          <Panel title="Payments from the client" description="Your own record of what the client has paid you — for the whole package, not only hotels." padded={false}>
            {payments.length > 0 && (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="flex size-9 items-center justify-center rounded-full bg-positive-bg text-positive"><Glyph d="M5 12l5 5L20 7" className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium"><Money minor={p.amountMinor} currency={p.currency} compact={p.amountMinor % 100 === 0} /> <span className="text-[0.82rem] font-normal text-muted">· {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method}{p.reference ? ` · ${p.reference}` : ''}</span></p>
                      <p className="text-[0.78rem] text-faint">{formatDate(p.receivedOn)}{p.note ? ` · ${p.note}` : ''}</p>
                    </div>
                    <ActionForm action={deleteClientPaymentAction}><input type="hidden" name="paymentId" value={p.id} /><SubmitButton size="sm" variant="ghost" confirm="Remove this payment record?">Remove</SubmitButton></ActionForm>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={clientPaymentAction} resetOnSuccess className={cx('grid gap-3 px-6 py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_1fr_auto]', payments.length > 0 && 'border-t border-line')}>
              <input type="hidden" name="tripId" value={t.id} />
              <Field label={`Received (${t.currency})`}><input name="amount" inputMode="decimal" className="field num" placeholder={totals.pendingMinor > 0 ? toDecimalString(totals.pendingMinor, t.currency).replace(/\.00$/, '') : ''} /></Field>
              <Field label="Via"><select name="method" className="field">{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="On"><input name="receivedOn" type="date" defaultValue={today} max={today} className="field num" /></Field>
              <Field label="Reference" hint="UTR / receipt no."><input name="reference" className="field" /></Field>
              <div className="flex items-start lg:pt-[1.6rem]"><SubmitButton pendingLabel="Saving…" className="w-full">Record</SubmitButton></div>
            </ActionForm>
          </Panel>

          {/* Details */}
          <details className="group rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-soft)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 font-medium">Trip details & notes <span className="text-muted transition-transform group-open:rotate-180">⌄</span></summary>
            <ActionForm action={updateTripAction} className="grid gap-4 border-t border-line p-6 sm:grid-cols-4">
              <input type="hidden" name="tripId" value={t.id} />
              <input type="hidden" name="followUpOn" value={t.followUpOn ?? ''} /><input type="hidden" name="followUpNote" value={t.followUpNote ?? ''} />
              <Field label="Trip name" className="sm:col-span-3"><input name="title" defaultValue={t.title} className="field" /></Field>
              <Field label="Currency"><select name="currency" defaultValue={t.currency} className="field">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <StayDatesField label="Travel dates" nameIn="startDate" nameOut="endDate" defaultIn={t.startDate ?? ''} defaultOut={t.endDate ?? ''} className="sm:col-span-2" />
              <Field label="Adults"><input name="adults" type="number" min={1} defaultValue={t.adults} className="field num" /></Field>
              <Field label="Children"><input name="children" type="number" min={0} defaultValue={t.children} className="field num" /></Field>
              <DateField label="Balance due by" name="balanceDueOn" defaultValue={t.balanceDueOn ?? ''} className="sm:col-span-2" />
              <Field label="Lead came from" className="sm:col-span-2"><select name="source" defaultValue={t.source ?? ''} className="field"><option value="">—</option>{Object.entries(LEAD_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Note to the client" hint="Printed on the plan and PDF" className="sm:col-span-4"><textarea name="clientNote" defaultValue={t.clientNote ?? ''} rows={3} className="field" placeholder="Inclusions, payment terms, what to carry…" /></Field>
              <Field label="Internal notes" hint="Only your team sees this" className="sm:col-span-4"><textarea name="notes" defaultValue={t.notes ?? ''} rows={3} className="field" /></Field>
              <div className="sm:col-span-4"><SubmitButton size="sm" pendingLabel="Saving…">Save details</SubmitButton></div>
            </ActionForm>
          </details>
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-[var(--radius-lg)] bg-ink text-paper shadow-[var(--shadow-lift)]">
            <div className="p-6">
              <p className="text-[0.68rem] font-medium tracking-[0.18em] text-paper/50 uppercase">Package total</p>
              <p className="num mt-2 font-[family-name:var(--font-display)] text-[2.4rem] leading-none font-light tracking-[-0.03em]"><Money minor={totals.totalMinor} currency={t.currency} compact={totals.totalMinor % 100 === 0} /></p>
              {totals.totalMinor > 0 && (
                <div className="mt-5">
                  <div className="flex h-2 overflow-hidden rounded-full bg-paper/10">
                    <span className="bg-champagne" style={{ width: `${share}%` }} />
                    <span className="ml-0.5 flex-1 bg-paper/35" />
                  </div>
                  <div className="mt-2 flex justify-between text-[0.75rem] text-paper/65">
                    <span><span className="mr-1.5 inline-block size-2 rounded-full bg-champagne" />Hotels {share}% · <Money minor={totals.hotelsMinor} currency={t.currency} compact /></span>
                    <span>Other <Money minor={totals.extrasMinor} currency={t.currency} compact /></span>
                  </div>
                </div>
              )}
              {totals.unpricedLines > 0 && <p className="mt-4 rounded-[var(--radius-sm)] bg-pending-bg px-3 py-2 text-[0.8rem] text-pending">{totals.unpricedLines} line{totals.unpricedLines === 1 ? ' has' : 's have'} no client price yet and {totals.unpricedLines === 1 ? 'is' : 'are'} not in the total.</p>}
            </div>
            <dl className="grid grid-cols-2 border-t border-paper/10 text-[0.85rem]">
              <div className="border-r border-paper/10 p-5"><dt className="text-paper/50">Received</dt><dd className="num mt-1 text-[1.1rem]"><Money minor={totals.receivedMinor} currency={t.currency} compact /></dd></div>
              <div className="p-5">
                <dt className="text-paper/50">{totals.pendingMinor < 0 ? 'Overpaid' : 'Client owes'}</dt>
                <dd className={cx('num mt-1 text-[1.1rem]', overdue ? 'text-[#f3a4a4]' : totals.pendingMinor > 0 ? 'text-champagne' : 'text-[#8fd1aa]')}><Money minor={Math.abs(totals.pendingMinor)} currency={t.currency} compact /></dd>
                {t.balanceDueOn && totals.pendingMinor > 0 && <p className={cx('mt-0.5 text-[0.72rem]', overdue ? 'text-[#f3a4a4]' : 'text-paper/50')}>{overdue ? 'Overdue since' : 'Due'} {formatDate(t.balanceDueOn, { day: 'numeric', month: 'short' })}</p>}
              </div>
            </dl>
            {(totals.marginLines > 0 || totals.otherCurrencyCosts.length > 0) && (
              <div className="border-t border-paper/10 px-6 py-4 text-[0.82rem] text-paper/70">
                {totals.marginLines > 0 && <p>Your profit <span className="num ml-1 font-medium text-paper"><Money minor={totals.marginMinor} currency={t.currency} compact /></span> <span className="text-paper/45">on {totals.marginLines} line{totals.marginLines === 1 ? '' : 's'}</span></p>}
                {totals.otherCurrencyCosts.length > 0 && <p className="mt-1 text-paper/45">Costs in {totals.otherCurrencyCosts.map((c) => c.currency).join(', ')} aren’t netted off — no exchange rate is assumed.</p>}
              </div>
            )}
          </section>

          <Panel title="Follow-up" description={t.followUpOn ? undefined : 'Never lose a lead: set your next step.'}>
            {t.followUpOn && (
              <div className={cx('mb-4 rounded-[var(--radius-sm)] px-3 py-2.5 text-[0.88rem]', t.followUpOn <= today ? 'bg-attention-bg text-attention' : 'bg-mist')}>
                <p className="font-medium">{t.followUpOn < today ? 'Overdue — ' : t.followUpOn === today ? 'Today — ' : `${formatDate(t.followUpOn)} — `}{t.followUpNote ?? 'Follow up'}</p>
              </div>
            )}
            <ActionForm action={followUpAction} className="space-y-3">
              <input type="hidden" name="tripId" value={t.id} />
              <DateField label={t.followUpOn ? 'Move to' : 'When'} name="followUpOn" defaultValue={t.followUpOn ?? ''} title="When will you follow up?" />
              <Field label="What to do"><input name="followUpNote" defaultValue={t.followUpNote ?? ''} className="field" placeholder="Call about the advance" /></Field>
              <div className="flex gap-2">
                <SubmitButton size="sm" pendingLabel="Saving…">Save</SubmitButton>
                {t.followUpOn && <SubmitButton size="sm" variant="secondary" name="intent" value="done">Mark done</SubmitButton>}
              </div>
            </ActionForm>
          </Panel>

          <Panel title="Send the plan" description={`A page and PDF with ${agency.brandName || agency.name}'s name — never ours, and never your net rates.`}>
            <ShareProposal path={sharePath} enabled={t.shareEnabled} who={who} />
            <ActionForm action={sharingAction} className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[0.8rem]">
              <input type="hidden" name="tripId" value={t.id} />
              <button name="intent" value={t.showItemPrices ? 'prices_off' : 'prices_on'} className="text-muted underline-offset-2 hover:text-ink hover:underline">{t.showItemPrices ? 'Show total only' : 'Show line prices'}</button>
              <button name="intent" value={t.shareEnabled ? 'disable' : 'enable'} className="text-muted underline-offset-2 hover:text-ink hover:underline">{t.shareEnabled ? 'Turn link off' : 'Turn link on'}</button>
              {t.shareEnabled && <button name="intent" value="rotate" className="text-muted underline-offset-2 hover:text-ink hover:underline">New link</button>}
            </ActionForm>
            {!agency.brandName && !agency.logoUrl && <p className="mt-3 text-[0.78rem] text-faint">Add your logo and contact details in <Link href="/agent/profile#branding" className="underline">Agency profile</Link>.</p>}
          </Panel>

          <Panel title="Payment reminder" description="Edit the amount — the message updates. It opens in your WhatsApp or email; nothing is sent until you press send there.">
            <ReminderComposer key={`${totals.pendingMinor}:${t.balanceDueOn}`} who={who} currency={t.currency} pendingMinor={totals.pendingMinor} totalMinor={totals.totalMinor} receivedMinor={totals.receivedMinor}
              dueOn={t.balanceDueOn} sharePath={t.shareEnabled ? sharePath : null} />
          </Panel>

          {t.notes && <Panel title="Internal notes"><p className="text-[0.88rem] whitespace-pre-line text-muted">{t.notes}</p></Panel>}
        </aside>
      </div>
    </>
  );
}

function ItemRow({ item: i, currency, tripId, highlight }: { item: TripItemView; currency: string; tripId: string; highlight: boolean }) {
  const nights = i.startDate && i.endDate ? daysBetween(i.startDate, i.endDate) : 0;
  const booked = i.booking && !['cancelled', 'declined', 'failed'].includes(i.booking.status);
  const sameCcy = i.netCurrency === currency;
  const profit = i.clientPriceMinor != null && i.costMinor != null && i.costCurrency === currency ? i.clientPriceMinor - i.costMinor : null;
  return (
    <li className={cx('grid gap-4 px-6 py-5 transition-colors lg:grid-cols-[minmax(0,1fr)_260px]', highlight && 'bg-champagne-soft/50')}>
      <div className="flex min-w-0 gap-4">
        <div className={cx('flex size-11 shrink-0 items-center justify-center rounded-full', i.kind === 'hotel' ? 'bg-ink text-champagne' : 'bg-mist text-ink')}><Glyph d={KIND_ICON[i.kind] ?? KIND_ICON.other} /></div>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{ITEM_KIND_LABEL[i.kind] ?? i.kind}{i.kind === 'hotel' && i.details ? ` · ${i.details}` : ''}</p>
          <p className="mt-0.5 font-medium">{i.title}</p>
          <p className="mt-0.5 text-[0.84rem] text-muted">
            {i.startDate && <span className="num">{formatDate(i.startDate, { day: 'numeric', month: 'short' })}{i.endDate && i.endDate !== i.startDate ? ` – ${formatDate(i.endDate, { day: 'numeric', month: 'short' })}` : ''}{nights > 0 ? ` · ${nights}N` : ''}</span>}
            {i.kind === 'hotel'
              ? <>{' · '}{i.roomName}{i.mealPlan ? `, ${MEAL_PLANS[i.mealPlan as keyof typeof MEAL_PLANS] ?? i.mealPlan}` : ''}{i.rooms ? ` · ${describeRooms(i.rooms)}` : ''}</>
              : i.details ? <>{i.startDate ? ' · ' : ''}{i.details}</> : null}
          </p>
          {i.kind === 'hotel' && i.cancellation && <p className="mt-1 text-[0.78rem] text-faint">{i.cancellation}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {i.booking ? <Link href={`/agent/bookings/${i.booking.id}`} className="flex items-center gap-2"><StatusPill status={i.booking.status} /><span className="num text-[0.78rem] text-muted hover:underline">{i.booking.reference}</span></Link>
              : i.kind === 'hotel' ? <Pill tone="neutral" dot={false}>Not booked yet</Pill> : null}
            {i.kind !== 'hotel' && i.supplierName && <span className="text-[0.78rem] text-faint">via {i.supplierName}</span>}
          </div>
          {i.lastIssue && !booked && <p className="mt-2 rounded-[var(--radius-sm)] bg-pending-bg px-3 py-2 text-[0.8rem] text-pending">{i.lastIssue}</p>}
        </div>
      </div>
      <div className="lg:text-right">
        <ActionForm action={priceItemAction}>
          <input type="hidden" name="itemId" value={i.id} />
          <div className="flex items-end gap-2 lg:justify-end">
            <label className="block w-full max-w-40">
              <span className="mb-1 block text-[0.7rem] font-medium tracking-[0.08em] text-faint uppercase lg:text-right">Client pays · {currency}</span>
              <input name="clientPrice" inputMode="decimal" defaultValue={i.clientPriceMinor != null ? toDecimalString(i.clientPriceMinor, currency).replace(/\.00$/, '') : ''}
                placeholder="Set price" className={cx('field num py-2 text-right', i.clientPriceMinor == null && 'border-pending bg-pending-bg/40')} />
            </label>
            <SubmitButton size="sm" variant="secondary" pendingLabel="…" className="h-[2.55rem]">Save</SubmitButton>
          </div>
        </ActionForm>
        <div className="mt-2 space-y-0.5 text-[0.78rem] text-muted">
          {i.kind === 'hotel' && i.netMinor != null && i.netCurrency && (
            <p>Our price to you <Money minor={i.booking?.sellMinor ?? i.netMinor} currency={i.booking?.currency ?? i.netCurrency} />{!sameCcy && <span className="text-faint"> · client priced in {currency}</span>}</p>
          )}
          {i.kind !== 'hotel' && i.costMinor != null && i.costCurrency && <p>Your cost <Money minor={i.costMinor} currency={i.costCurrency} /></p>}
          {profit != null && <p className={profit < 0 ? 'text-negative' : 'text-positive'}>{profit < 0 ? 'Loss' : 'Profit'} <Money minor={Math.abs(profit)} currency={currency} /></p>}
        </div>
        {!booked && (
          <ActionForm action={removeItemAction} className="mt-1 lg:text-right">
            <input type="hidden" name="itemId" value={i.id} /><input type="hidden" name="tripId" value={tripId} />
            <SubmitButton size="sm" variant="ghost" confirm={`Remove ${i.title} from this trip?`} className="!px-0 text-muted">Remove</SubmitButton>
          </ActionForm>
        )}
      </div>
    </li>
  );
}
