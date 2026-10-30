import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, isNotNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { ContractForm, HotelForm } from '@/components/admin-forms';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, HotelVisual, PageHeader, Panel, Pill, SampleTag } from '@/components/ui';
import { addRoomTypeAction, createContractAction, hotelImageAction, hotelStatusAction, partnerUserAction, updateHotelAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';

export default async function AdminHotel({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = await getDb();
  const [h] = await db.select().from(schema.hotels).where(eq(schema.hotels.id, id));
  if (!h) notFound();
  const [rooms, contracts, partners] = await Promise.all([
    db.select().from(schema.roomTypes).where(eq(schema.roomTypes.hotelId, id)),
    db.select().from(schema.contracts).where(eq(schema.contracts.hotelId, id)).orderBy(desc(schema.contracts.validFrom)),
    db.select().from(schema.users).where(and(isNotNull(schema.users.partnerHotelId), eq(schema.users.partnerHotelId, id))),
  ]);
  return (
    <>
      <Link href="/admin/hotels" className="text-[0.85rem] text-muted hover:text-ink">← Hotels</Link>
      <PageHeader eyebrow={`${h.city}, ${h.country}`} title={<span className="flex items-center gap-3">{h.name} {h.isSample && <SampleTag />}</span>}
        actions={
          <ActionForm action={hotelStatusAction} className="flex gap-2">
            <input type="hidden" name="hotelId" value={h.id} />
            <Pill tone={h.status === 'active' ? 'positive' : 'pending'}>{h.status === 'active' ? 'Published' : h.status}</Pill>
            {h.status !== 'active' ? <SubmitButton size="sm" name="status" value="active">Publish to agents</SubmitButton> : <SubmitButton size="sm" variant="secondary" name="status" value="inactive">Unpublish</SubmitButton>}
          </ActionForm>
        } />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          <Panel title="Contracts" padded={false}>
            {contracts.length === 0 ? <Empty title="No contracts yet">Add the agreed terms below. Rates stay unbookable until the contract is activated by an admin.</Empty> : (
              <table className="table"><thead><tr><th>Reference</th><th>Validity</th><th>Model</th><th>Status</th></tr></thead>
                <tbody>{contracts.map((c) => (
                  <tr key={c.id}><td><Link href={`/admin/contracts/${c.id}`} className="font-medium hover:underline">{c.reference}</Link> <span className="text-[0.75rem] text-faint">v{c.version}</span></td>
                    <td className="num">{formatDate(c.validFrom)} – {formatDate(c.validTo)}</td><td className="text-[0.85rem]">{c.rateBasis} · {c.confirmationMode === 'instant_allocation' ? 'allotment' : 'on request'} · {c.currency}</td>
                    <td><Pill tone={c.status === 'active' ? 'positive' : c.status === 'draft' ? 'pending' : 'neutral'}>{c.status}</Pill>{!c.distributionPermitted && <p className="mt-1 text-[0.72rem] text-attention">No distribution permission</p>}</td></tr>
                ))}</tbody></table>
            )}
            <details className="border-t border-line p-5">
              <summary className="cursor-pointer text-[0.9rem] font-medium">New contract</summary>
              <div className="mt-4"><ContractForm action={createContractAction} hotelId={h.id} submit="Create draft contract" /></div>
            </details>
          </Panel>
          <Panel title="Profile"><HotelForm action={updateHotelAction} hotel={h} submit="Save profile" /></Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Room types">
            <ul className="mb-4 space-y-2 text-[0.88rem]">{rooms.map((r) => <li key={r.id}><span className="font-medium">{r.name}</span> <span className="text-muted">· {r.maxAdults} adults, {r.maxChildren} children, max {r.maxOccupancy}</span></li>)}</ul>
            <ActionForm action={addRoomTypeAction} resetOnSuccess className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <input type="hidden" name="hotelId" value={h.id} />
              <Field label="Name" className="sm:col-span-3"><input name="name" className="field" placeholder="Superior Double" /></Field>
              <Field label="Max adults"><input name="maxAdults" defaultValue={2} className="field num" /></Field>
              <Field label="Max children"><input name="maxChildren" defaultValue={1} className="field num" /></Field>
              <Field label="Max total"><input name="maxOccupancy" defaultValue={3} className="field num" /></Field>
              <Field label="Bedding" className="sm:col-span-2"><input name="bedding" className="field" /></Field>
              <Field label="m²"><input name="sizeSqm" className="field num" /></Field>
              <div className="sm:col-span-3"><SubmitButton size="sm" variant="secondary">Add room type</SubmitButton></div>
            </ActionForm>
          </Panel>
          <Panel title="Photography" description="Only images the hotel has licensed or permitted us to use.">
            <div className="grid grid-cols-2 gap-2">
              <HotelVisual hotel={h} size="sm" className="col-span-2 h-36 rounded-[var(--radius-sm)]" />
              {h.images.map((img, i) => (
                <ActionForm key={i} action={hotelImageAction} className="text-[0.75rem] text-muted">
                  <input type="hidden" name="hotelId" value={h.id} /><input type="hidden" name="remove" value={i} />
                  <p className="truncate">{img.alt}</p><p className="truncate">{img.license}</p><SubmitButton size="sm" variant="ghost">Remove</SubmitButton>
                </ActionForm>
              ))}
            </div>
            <ActionForm action={hotelImageAction} resetOnSuccess className="mt-4 space-y-3 border-t border-line pt-4">
              <input type="hidden" name="hotelId" value={h.id} /><input type="hidden" name="remove" value="" />
              <Field label="Image URL (https)"><input name="url" className="field" /></Field>
              <Field label="Description"><input name="alt" className="field" /></Field>
              <Field label="Credit"><input name="credit" className="field" /></Field>
              <Field label="Licence / permission" hint="e.g. Supplied by hotel, permission email 12 Mar 2026"><input name="license" className="field" /></Field>
              <SubmitButton size="sm" variant="secondary">Add image</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Hotel partner access" description="The hotel can confirm requests and see its reservations — never our selling prices or margins.">
            <ul className="mb-3 text-[0.88rem]">{partners.map((u) => <li key={u.id}>{u.name} · <span className="text-muted">{u.email}</span></li>)}</ul>
            <ActionForm action={partnerUserAction} resetOnSuccess className="space-y-3">
              <input type="hidden" name="hotelId" value={h.id} />
              <Field label="Name"><input name="name" className="field" /></Field>
              <Field label="Email"><input name="email" className="field" /></Field>
              <Field label="First password"><input name="password" type="password" className="field" autoComplete="new-password" /></Field>
              <SubmitButton size="sm" variant="secondary">Create partner login</SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}

export const metadata = { title: 'Hotel' };
