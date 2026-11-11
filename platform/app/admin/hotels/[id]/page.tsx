import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, isNotNull, and, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { ContractForm, HotelForm } from '@/components/admin-forms';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { DL, Empty, HotelVisual, Money, Panel, Pill, SampleTag, cx } from '@/components/ui';
import { addRoomTypeAction, createContractAction, hotelImageAction, hotelStatusAction, partnerUserAction, updateHotelAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { TIER_INFO, isTier } from '@/lib/domain/tiers';
import { requireStaff } from '@/lib/session';
import { ExtrasList } from '@/components/extras';
import { extraSellMinor, extrasMarkupBps, listHotelExtras } from '@/lib/services/extras';

const TABS = [
  ['overview', 'Overview'], ['rates', 'Rates & contracts'], ['bookings', 'Bookings'], ['requests', 'Requests'], ['outreach', 'Outreach'], ['activity', 'Activity'],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function AdminHotel({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const tabParam = (await searchParams).tab;
  const tab: Tab = (TABS.find(([k]) => k === tabParam)?.[0]) ?? 'overview';
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = await getDb();
  const [h] = await db.select().from(schema.hotels).where(eq(schema.hotels.id, id));
  if (!h) notFound();
  const [rooms, contracts, partners, extras, extrasBps, bookings, rateReqs, groupReqs, prospects] = await Promise.all([
    db.select().from(schema.roomTypes).where(eq(schema.roomTypes.hotelId, id)),
    db.select().from(schema.contracts).where(eq(schema.contracts.hotelId, id)).orderBy(desc(schema.contracts.validFrom)),
    db.select().from(schema.users).where(and(isNotNull(schema.users.partnerHotelId), eq(schema.users.partnerHotelId, id))),
    listHotelExtras(db, id),
    extrasMarkupBps(db),
    db.select({ b: schema.bookings, agency: schema.agencies.name }).from(schema.bookings).leftJoin(schema.agencies, eq(schema.agencies.id, schema.bookings.agencyId))
      .where(or(eq(schema.bookings.hotelId, id), eq(schema.bookings.assignedHotel, id))).orderBy(desc(schema.bookings.createdAt)).limit(50),
    db.select({ r: schema.rateRequests, agency: schema.agencies.name }).from(schema.rateRequests).leftJoin(schema.agencies, eq(schema.agencies.id, schema.rateRequests.agencyId))
      .where(eq(schema.rateRequests.hotelId, id)).orderBy(desc(schema.rateRequests.createdAt)).limit(50),
    db.select().from(schema.groupHotelRequests).where(eq(schema.groupHotelRequests.hotelId, id)).orderBy(desc(schema.groupHotelRequests.respondByAt)).limit(50),
    db.select().from(schema.hotelProspects).where(eq(schema.hotelProspects.hotelId, id)),
  ]);
  const contractIds = contracts.map((c) => c.id);
  const activity = tab === 'activity' ? await db.select().from(schema.auditLog)
    .where(or(and(eq(schema.auditLog.entity, 'hotel'), eq(schema.auditLog.entityId, id)), contractIds.length ? and(eq(schema.auditLog.entity, 'contract'), inArray(schema.auditLog.entityId, contractIds)) : undefined))
    .orderBy(desc(schema.auditLog.createdAt)).limit(60) : [];
  const active = contracts.find((c) => c.status === 'active');
  const counts: Record<Tab, number | null> = { overview: null, rates: contracts.length, bookings: bookings.length, requests: rateReqs.length + groupReqs.length, outreach: prospects.length, activity: null };
  return (
    <>
      <Link href="/admin/hotels" className="text-[0.85rem] text-muted hover:text-ink">← Hotels</Link>
      <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        <div className="relative">
          {/* A licensed photo when we have one; otherwise a clean navy banner (the placeholder's own lettering would clash with the title). */}
          {h.images.length > 0
            ? <HotelVisual hotel={h} size="lg" className="h-44 md:h-56" />
            : <div className="h-36 bg-[radial-gradient(ellipse_60%_120%_at_85%_0%,rgba(199,154,74,0.28),transparent_60%)] bg-ink md:h-44" aria-hidden />}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent px-5 pt-16 pb-4 text-paper md:px-7">
            <p className="text-[0.72rem] tracking-[0.18em] text-paper/70 uppercase">{h.city}, {h.country}{isTier(h.tier) ? ` · ${TIER_INFO[h.tier].label} ${TIER_INFO[h.tier].stars}` : ''}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-[1.7rem] leading-tight font-semibold md:text-[2.1rem]">{h.name} {h.isSample && <SampleTag />}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-7">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[0.84rem] text-muted">
            <span>{h.bestRateOnRequest ? <span className="font-medium text-champagne">Best rate on request</span> : active ? <>Contract <span className="font-medium text-ink">{active.reference}</span> to {formatDate(active.validTo)}</> : 'No active contract'}</span>
            {h.totalRooms ? <span>{h.totalRooms} rooms</span> : null}
            {h.contactName || h.contactEmail ? <span>Sales: {h.contactName ?? ''} {h.contactEmail ? <a href={`mailto:${h.contactEmail}`} className="underline">{h.contactEmail}</a> : null}</span> : null}
            {h.acceptsGroups && <span>Takes groups</span>}
          </div>
          <ActionForm action={hotelStatusAction} className="flex gap-2">
            <input type="hidden" name="hotelId" value={h.id} />
            <Pill tone={h.status === 'active' ? 'positive' : 'pending'}>{h.status === 'active' ? 'Published' : h.status}</Pill>
            {h.status !== 'active' ? <SubmitButton size="sm" name="status" value="active">Publish to agents</SubmitButton> : <SubmitButton size="sm" variant="secondary" name="status" value="inactive">Unpublish</SubmitButton>}
          </ActionForm>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 md:px-5" aria-label="Hotel sections">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/admin/hotels/${h.id}?tab=${k}`} scroll={false} aria-current={tab === k ? 'page' : undefined}
              className={cx('relative shrink-0 px-3 py-3 text-[0.86rem] whitespace-nowrap', tab === k ? 'font-medium text-ink' : 'text-muted hover:text-ink')}>
              {label}{counts[k] ? <span className="num ml-1.5 text-[0.75rem] text-faint">{counts[k]}</span> : null}
              {tab === k && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-champagne" aria-hidden />}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-6" />
      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
          <div className="space-y-6">
            <Panel title="At a glance">
              <DL items={[['Address', h.address], ['Check-in / out', [h.checkInTime, h.checkOutTime].filter(Boolean).join(' / ') || null], ['Best-rate requests go to', h.bestRateOnRequest ? (h.rateRequestEmail ?? h.reservationsEmail) : null], ['Reservations', h.reservationsEmail], ['Groups', h.acceptsGroups ? (h.groupsEmail ?? 'Yes') : 'No'], ['Facilities', h.facilities.length ? h.facilities.join(', ') : null], ['Getting there', h.transport]]} />
            </Panel>
            <Panel title="Profile"><HotelForm action={updateHotelAction} hotel={h} submit="Save profile" /></Panel>
          </div>
          <div className="space-y-6">
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
      )}
      {tab === 'rates' && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
          <div className="space-y-6">
          <Panel title="Contracts" padded={false}>
            {contracts.length === 0 ? <Empty title="No contracts yet">Add the agreed terms below. Rates stay unbookable until the contract is activated by an admin.</Empty> : (
              <div className="overflow-x-auto"><table className="table"><thead><tr><th>Reference</th><th>Validity</th><th>Model</th><th>Status</th></tr></thead>
                <tbody>{contracts.map((c) => (
                  <tr key={c.id}><td><Link href={`/admin/contracts/${c.id}`} className="font-medium hover:underline">{c.reference}</Link> <span className="text-[0.75rem] text-faint">v{c.version}</span></td>
                    <td className="num">{formatDate(c.validFrom)} – {formatDate(c.validTo)}</td><td className="text-[0.85rem]">{c.rateBasis} · {c.confirmationMode === 'instant_allocation' ? 'allotment' : 'on request'} · {c.currency}</td>
                    <td><Pill tone={c.status === 'active' ? 'positive' : c.status === 'draft' ? 'pending' : 'neutral'}>{c.status}</Pill>{!c.distributionPermitted && <p className="mt-1 text-[0.72rem] text-attention">No distribution permission</p>}</td></tr>
                ))}</tbody></table></div>
            )}
            <details className="border-t border-line p-5">
              <summary className="cursor-pointer text-[0.9rem] font-medium">New contract</summary>
              <div className="mt-4"><ContractForm action={createContractAction} hotelId={h.id} submit="Create draft contract" /></div>
            </details>
          </Panel>
          {extras.length > 0 && (
            <Panel title="Extras from the hotel" description={`Net price from the hotel, and what agents pay with the ${extrasBps / 100}% extras markup (Pricing → Extras markup).`}>
              <ExtrasList staff rows={extras.map((x) => ({ ...x, sellMinor: extraSellMinor(x.priceMinor, x.currency, extrasBps), childSellMinor: x.childPriceMinor == null ? null : extraSellMinor(x.childPriceMinor, x.currency, extrasBps), netMinor: x.priceMinor, childNetMinor: x.childPriceMinor }))} />
            </Panel>
          )}
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
          </div>
        </div>
      )}
      {tab === 'bookings' && (
        <Panel title="Bookings at this hotel" description="Latest 50. Booking value is what agents pay — not HotelBridge revenue." padded={false}>
          {bookings.length === 0 ? <Empty title="No bookings yet" /> : (
            <div className="overflow-x-auto"><table className="table"><thead><tr><th>Reference</th><th>Agency</th><th>Stay</th><th>Status</th><th className="text-right">Value</th></tr></thead>
              <tbody>{bookings.map(({ b, agency }) => (
                <tr key={b.id}><td><Link href={`/admin/bookings/${b.id}`} className="font-medium hover:underline">{b.reference}</Link>{b.isSample && <> <SampleTag /></>}<p className="text-[0.75rem] text-faint">{b.leadGuest}</p></td>
                  <td>{agency ?? '—'}</td><td className="num whitespace-nowrap">{formatDate(b.checkIn)} – {formatDate(b.checkOut)}</td>
                  <td><Pill tone={b.status === 'confirmed' ? 'positive' : ['cancelled', 'failed', 'rejected'].includes(b.status) ? 'neutral' : 'pending'}>{b.status.replace(/_/g, ' ')}</Pill></td>
                  <td className="text-right"><Money minor={b.sellMinor} currency={b.currency} /></td></tr>
              ))}</tbody></table></div>
          )}
        </Panel>
      )}
      {tab === 'requests' && (
        <div className="space-y-6">
          <Panel title="Best-rate requests" padded={false}>
            {rateReqs.length === 0 ? <Empty title="No best-rate requests yet" /> : (
              <div className="overflow-x-auto"><table className="table"><thead><tr><th>Reference</th><th>Agency</th><th>Stay</th><th>Status</th><th>Asked</th></tr></thead>
                <tbody>{rateReqs.map(({ r, agency }) => (
                  <tr key={r.id}><td className="font-medium">{r.reference}</td><td>{agency ?? '—'}</td><td className="num whitespace-nowrap">{formatDate(r.checkIn)} – {formatDate(r.checkOut)}</td>
                    <td><Pill tone={r.status === 'quoted' || r.status === 'accepted' ? 'positive' : r.status === 'sent' ? 'pending' : 'neutral'}>{r.status.replace(/_/g, ' ')}</Pill></td><td className="text-[0.8rem] whitespace-nowrap">{formatDateTime(r.createdAt)}</td></tr>
                ))}</tbody></table></div>
            )}
          </Panel>
          <Panel title="Group Desk requests to this hotel" padded={false}>
            {groupReqs.length === 0 ? <Empty title="No group requests yet" /> : (
              <ul className="divide-y divide-line">{groupReqs.map((g) => (
                <li key={g.id}><Link href={`/admin/groups/${g.enquiryId}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-mist/50"><span className="font-medium">{g.subject}</span><Pill tone={g.status === 'responded' ? 'positive' : g.status === 'declined' || g.status === 'no_response' ? 'neutral' : 'pending'}>{g.status.replace(/_/g, ' ')}</Pill></Link></li>
              ))}</ul>
            )}
          </Panel>
        </div>
      )}
      {tab === 'outreach' && (
        <Panel title="Sales outreach" description="Contacts, stage and next step from Hotel outreach." padded={false}>
          {prospects.length === 0 ? <Empty title="Not linked to an outreach record">Link it from Hotel outreach to keep contacts and negotiation notes here.</Empty> : (
            <ul className="divide-y divide-line">{prospects.map((p) => (
              <li key={p.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/admin/prospects/${p.id}`} className="font-medium hover:underline">{p.name}</Link><Pill tone="neutral">{p.stage}</Pill></div>
                <DL cols={3} items={[['Contact', [p.contactName, p.contactRole].filter(Boolean).join(', ') || null], ['Email', p.contactEmail], ['Phone', p.contactPhone], ['Next step', p.nextStep ? `${p.nextStep}${p.nextStepOn ? ` · ${formatDate(p.nextStepOn)}` : ''}` : null], ['Last contact', p.lastContactOn ? formatDate(p.lastContactOn) : null], ['Rate type', p.rateType]]} />
                {p.notes && <p className="mt-3 text-[0.84rem] whitespace-pre-line text-muted">{p.notes}</p>}
              </li>
            ))}</ul>
          )}
        </Panel>
      )}
      {tab === 'activity' && (
        <Panel title="Activity" description="Every change to this hotel and its contracts, newest first." padded={false}>
          {activity.length === 0 ? <Empty title="No recorded changes yet" /> : (
            <ul className="divide-y divide-line">{activity.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-[0.86rem]"><span><span className="font-medium">{a.action.replace(/[._]/g, ' ')}</span> <span className="text-muted">· {a.actorLabel}</span></span><span className="text-[0.78rem] text-faint">{formatDateTime(a.createdAt)}</span></li>
            ))}</ul>
          )}
        </Panel>
      )}
    </>
  );
}

export const metadata = { title: 'Hotel' };
