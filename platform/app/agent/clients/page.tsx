import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, LinkButton, Money, PageHeader, Panel } from '@/components/ui';
import { saveClientAction } from '@/app/actions/trips';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { totalsByCurrency } from '@/lib/domain/money';
import { requireAgent } from '@/lib/session';
import { listClients, listTrips } from '@/lib/services/trips';

export const metadata = { title: 'Clients' };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { actor } = await requireAgent();
  const { q = '' } = await searchParams;
  const db = await getDb();
  const [clients, trips] = await Promise.all([listClients(db, actor, q), listTrips(db, actor)]);
  const byClient = new Map<string, typeof trips>();
  for (const t of trips) byClient.set(t.client.id, [...(byClient.get(t.client.id) ?? []), t]);
  return (
    <>
      <PageHeader eyebrow="Sell" title="Clients" description="Your travellers, their trips and what they owe you. Repeat clients are your best business — everything about them lives here."
        actions={<LinkButton href="/agent/trips/new">New trip</LinkButton>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <form className="mb-4 sm:w-80"><input name="q" defaultValue={q} placeholder="Name, phone or email" className="field" /></form>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
            {clients.length === 0 ? (
              <Empty title={q ? 'No client matches' : 'No clients yet'}>{q ? 'Try another name or number.' : 'Clients are added when you create a trip, or with the form on the right.'}</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Client</th><th>Contact</th><th className="text-right">Trips</th><th className="text-right">Owes you</th><th>Last trip</th></tr></thead>
                  <tbody>
                    {clients.map((c) => {
                      const ts = byClient.get(c.id) ?? [];
                      const owed = totalsByCurrency(ts.filter((t) => t.trip.status !== 'cancelled' && t.totals.pendingMinor > 0).map((t) => ({ minor: t.totals.pendingMinor, currency: t.trip.currency })));
                      return (
                        <tr key={c.id}>
                          <td><Link href={`/agent/clients/${c.id}`} className="font-medium underline-offset-4 hover:underline">{c.name}</Link>{c.city && <p className="text-[0.75rem] text-faint">{c.city}</p>}</td>
                          <td className="text-[0.85rem]">{c.phone ?? <span className="text-faint">—</span>}{c.email && <p className="text-[0.75rem] text-faint">{c.email}</p>}</td>
                          <td className="num text-right">{ts.length}</td>
                          <td className="text-right">{owed.length ? owed.map((o) => <p key={o.currency}><Money minor={o.minor} currency={o.currency} compact /></p>) : <span className="text-faint">—</span>}</td>
                          <td className="text-[0.85rem]">{ts[0] ? <Link href={`/agent/trips/${ts[0].trip.id}`} className="hover:underline">{ts[0].trip.title}</Link> : <span className="text-faint">—</span>}{ts[0] && <p className="text-[0.75rem] text-faint">{formatDate(ts[0].trip.createdAt)}</p>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <Panel title="Add a client">
          <ActionForm action={saveClientAction} className="space-y-3">
            <Field label="Name"><input name="name" className="field" /></Field>
            <Field label="Mobile (WhatsApp)"><input name="phone" className="field" inputMode="tel" placeholder="+91 98200 12345" /></Field>
            <Field label="Email"><input name="email" type="email" className="field" /></Field>
            <Field label="City"><input name="city" className="field" /></Field>
            <SubmitButton size="sm" pendingLabel="Saving…">Add client</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
