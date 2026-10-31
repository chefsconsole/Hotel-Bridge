import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, LinkButton, Money, PageHeader, Panel, Pill } from '@/components/ui';
import { saveClientAction } from '@/app/actions/trips';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { totalsByCurrency } from '@/lib/domain/money';
import { whatsappNumber } from '@/lib/domain/trip';
import { NotFoundError } from '@/lib/services/errors';
import { requireAgent } from '@/lib/session';
import { TRIP_STATUS_LABEL, TRIP_STATUS_TONE, getClient, listTrips } from '@/lib/services/trips';

export const metadata = { title: 'Client' };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor } = await requireAgent();
  const { id } = await params;
  const db = await getDb();
  let c;
  try { c = await getClient(db, actor, id); } catch (e) { if (e instanceof NotFoundError) notFound(); throw e; }
  const trips = await listTrips(db, actor, { clientId: c.id });
  const live = trips.filter((t) => t.trip.status !== 'cancelled');
  const spent = totalsByCurrency(live.map((t) => ({ minor: t.totals.receivedMinor, currency: t.trip.currency }))).filter((m) => m.minor > 0);
  const owed = totalsByCurrency(live.filter((t) => t.totals.pendingMinor > 0).map((t) => ({ minor: t.totals.pendingMinor, currency: t.trip.currency })));
  const wa = whatsappNumber(c.phone);
  return (
    <>
      <div className="mb-4 text-[0.85rem]"><Link href="/agent/clients" className="text-muted hover:text-ink">← Clients</Link></div>
      <PageHeader eyebrow="Client" title={c.name} description={[c.city, c.phone, c.email].filter(Boolean).join(' · ') || undefined}
        actions={<>
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-[#1f8f4e] px-5 text-[0.9rem] font-medium text-white hover:bg-[#187a41]">WhatsApp</a>}
          <LinkButton href={`/agent/trips/new?client=${c.id}`}>New trip</LinkButton>
        </>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Box label="Trips" value={String(trips.length)} hint={trips.length > 1 ? 'Repeat client' : undefined} />
        <Box label="Paid you" value={spent.length ? spent.map((m) => <Money key={m.currency} minor={m.minor} currency={m.currency} compact />) : '—'} />
        <Box label="Owes you" value={owed.length ? owed.map((m) => <Money key={m.currency} minor={m.minor} currency={m.currency} compact />) : '—'} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Trips" padded={false}>
          {trips.length === 0 ? <Empty title="No trips yet" action={<LinkButton href={`/agent/trips/new?client=${c.id}`} size="sm">New trip</LinkButton>} /> : (
            <ul className="divide-y divide-line">
              {trips.map(({ trip: t, totals }) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <Link href={`/agent/trips/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                    <p className="num text-[0.78rem] text-faint">{t.reference}{t.startDate ? ` · ${formatDate(t.startDate)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Pill tone={TRIP_STATUS_TONE[t.status]}>{TRIP_STATUS_LABEL[t.status]}</Pill>
                    <div className="text-right text-[0.85rem]"><Money minor={totals.totalMinor} currency={t.currency} compact />{totals.pendingMinor > 0 && t.status !== 'cancelled' && <p className="text-[0.75rem] text-attention">owes <Money minor={totals.pendingMinor} currency={t.currency} compact /></p>}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Details">
          <ActionForm action={saveClientAction} className="space-y-3">
            <input type="hidden" name="clientId" value={c.id} />
            <Field label="Name"><input name="name" defaultValue={c.name} className="field" /></Field>
            <Field label="Mobile (WhatsApp)"><input name="phone" defaultValue={c.phone ?? ''} className="field" inputMode="tel" /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={c.email ?? ''} className="field" /></Field>
            <Field label="City"><input name="city" defaultValue={c.city ?? ''} className="field" /></Field>
            <Field label="Notes" hint="Preferences, passport expiry, anniversaries…"><textarea name="notes" defaultValue={c.notes ?? ''} rows={4} className="field" /></Field>
            <SubmitButton size="sm" pendingLabel="Saving…">Save</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}

function Box({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)]">
      <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{label}</p>
      <div className="num mt-3 flex flex-col font-[family-name:var(--font-display)] text-[1.6rem] leading-tight font-light">{value}</div>
      {hint && <p className="mt-1 text-[0.78rem] text-positive">{hint}</p>}
    </div>
  );
}
