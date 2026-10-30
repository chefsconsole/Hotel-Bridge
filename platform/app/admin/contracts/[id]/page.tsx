import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ContractForm } from '@/components/admin-forms';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, Money, Notice, PageHeader, Panel, Pill } from '@/components/ui';
import { addRateAction, allocationAction, contractStatusAction, deactivateRateAction, importRatesAction, restrictionAction, updateContractAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { DEFAULT_RULE, priceOffer } from '@/lib/domain/pricing';
import { requireStaff } from '@/lib/session';
import { contractDetail, MEAL_PLANS } from '@/lib/services/catalog';
import { termsOf } from '@/lib/suppliers/contracted';

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const d = await contractDetail(await getDb(), id).catch(() => notFound());
  const { contract: c, hotel, roomTypes, rates, restrictions, allocations } = d;
  const rtName = (rid: string | null) => roomTypes.find((r) => r.id === rid)?.name ?? 'All rooms';
  const terms = termsOf(c);
  const preview = (minor: number | null) => {
    if (minor == null) return null;
    try { return priceOffer({ terms, contractAmountMinor: minor, roomNights: 1, personNights: 2, rule: DEFAULT_RULE }); } catch { return null; }
  };
  return (
    <>
      <Link href={`/admin/hotels/${hotel.id}`} className="text-[0.85rem] text-muted hover:text-ink">← {hotel.name}</Link>
      <PageHeader eyebrow={`Contract · version ${c.version}`} title={c.reference}
        description={`${formatDate(c.validFrom)} – ${formatDate(c.validTo)} · ${c.currency} · ${c.rateBasis} · ${c.confirmationMode === 'instant_allocation' ? 'instant from allotment' : 'on request'}`}
        actions={
          <ActionForm action={contractStatusAction} className="flex items-center gap-2">
            <input type="hidden" name="contractId" value={c.id} />
            <Pill tone={c.status === 'active' ? 'positive' : c.status === 'draft' ? 'pending' : 'neutral'}>{c.status}</Pill>
            {c.status !== 'active' ? <SubmitButton size="sm" name="status" value="active">Approve &amp; activate</SubmitButton> : <SubmitButton size="sm" variant="danger" name="status" value="suspended" confirm="Suspend? Agents will no longer see these rates.">Suspend</SubmitButton>}
          </ActionForm>
        } />
      {!c.distributionPermitted && <div className="mb-6"><Notice tone="warning" title="Not distributable">This contract is not marked as permitting resale to B2B agents. It cannot be activated until that is confirmed in writing with the hotel.</Notice></div>}
      {roomTypes.length === 0 && <div className="mb-6"><Notice tone="warning">Add room types on the hotel page before loading rates.</Notice></div>}

      <div className="space-y-6">
        <Panel title="Rates" description="Per room per night, by adult occupancy. Agent price preview uses the default rule for 1 night, 2 adults." padded={false}>
          {rates.length === 0 ? <Empty title="No rates loaded" /> : (
            <div className="overflow-x-auto"><table className="table">
              <thead><tr><th>Room</th><th>Board</th><th>Period</th><th className="text-right">1 ad.</th><th className="text-right">2 ad.</th><th className="text-right">3 ad.</th><th className="text-right">Child</th><th>Min / release</th><th className="text-right">Agent sees (2 ad.)</th><th /></tr></thead>
              <tbody>{rates.map((r) => {
                const pv = preview(r.price2Minor);
                return (
                  <tr key={r.id} className={r.active ? '' : 'opacity-40'}>
                    <td>{rtName(r.roomTypeId)}</td><td>{r.mealPlan}</td><td className="num whitespace-nowrap">{formatDate(r.dateFrom)} – {formatDate(r.dateTo)}</td>
                    {[r.price1Minor, r.price2Minor, r.price3Minor, r.childMinor].map((v, i) => <td key={i} className="text-right">{v == null ? '—' : <Money minor={v} currency={c.currency} />}</td>)}
                    <td className="num">{r.minStay}n / {r.releaseDays}d</td>
                    <td className="text-right">{pv ? <><Money minor={pv.sellMinor} currency={c.currency} /><p className="text-[0.72rem] text-faint">net rev. <Money minor={pv.netRevenueMinor} currency={c.currency} /></p></> : '—'}</td>
                    <td>{r.active && <ActionForm action={deactivateRateAction}><input type="hidden" name="rateId" value={r.id} /><input type="hidden" name="contractId" value={c.id} /><SubmitButton size="sm" variant="ghost" confirm="Deactivate this rate period?">Deactivate</SubmitButton></ActionForm>}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
          <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-2">
            <ActionForm action={addRateAction} resetOnSuccess>
              <p className="mb-3 text-[0.9rem] font-semibold">Add a rate period</p>
              <input type="hidden" name="contractId" value={c.id} /><input type="hidden" name="currency" value={c.currency} />
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Room type" className="sm:col-span-2"><select name="roomTypeId" className="field">{roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
                <Field label="Board" className="sm:col-span-2"><select name="mealPlan" className="field">{Object.entries(MEAL_PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                <Field label="From" className="sm:col-span-2"><input type="date" name="dateFrom" min={c.validFrom} max={c.validTo} className="field num" /></Field>
                <Field label="To (last night)" className="sm:col-span-2"><input type="date" name="dateTo" min={c.validFrom} max={c.validTo} className="field num" /></Field>
                <Field label="1 adult"><input name="p1" className="field num" inputMode="decimal" /></Field>
                <Field label="2 adults"><input name="p2" className="field num" inputMode="decimal" /></Field>
                <Field label="3 adults"><input name="p3" className="field num" inputMode="decimal" /></Field>
                <Field label="Per child"><input name="child" className="field num" inputMode="decimal" /></Field>
                <Field label="Min stay"><input name="minStay" defaultValue={1} className="field num" /></Field>
                <Field label="Release days"><input name="releaseDays" defaultValue={0} className="field num" /></Field>
              </div>
              <SubmitButton size="sm" className="mt-3">Add rates</SubmitButton>
            </ActionForm>
            <ActionForm action={importRatesAction}>
              <p className="mb-1 text-[0.9rem] font-semibold">Import a rate sheet</p>
              <p className="mb-3 text-[0.8rem] text-muted">One period per line: <code className="text-[0.75rem]">room_type,meal_plan,from,to,single,double,triple,child,min_stay,release</code>. Room types must match by name. Nothing imports unless every line is valid.</p>
              <input type="hidden" name="contractId" value={c.id} />
              <textarea name="csv" rows={7} className="field font-mono text-[0.8rem]" placeholder={`Double,BB,${c.validFrom},${c.validTo},110,130,,25,1,7`} />
              <div className="mt-3 flex gap-2"><SubmitButton size="sm" variant="secondary" name="mode" value="preview">Validate</SubmitButton><SubmitButton size="sm" name="mode" value="import">Import</SubmitButton></div>
            </ActionForm>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Restrictions" description="Blackouts and stop-sells close dates; supplements add per room per night.">
            <ul className="mb-4 divide-y divide-line text-[0.88rem]">
              {restrictions.length === 0 && <li className="py-2 text-muted">None</li>}
              {restrictions.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span><Pill tone={r.kind === 'supplement' ? 'info' : 'negative'} dot={false}>{r.kind.replace('_', '-')}</Pill> <span className="num">{formatDate(r.dateFrom)} – {formatDate(r.dateTo)}</span> · {rtName(r.roomTypeId)}{r.amountMinor ? <> · +<Money minor={r.amountMinor} currency={c.currency} /></> : null}{r.note ? ` · ${r.note}` : ''}</span>
                  <ActionForm action={restrictionAction}><input type="hidden" name="contractId" value={c.id} /><input type="hidden" name="remove" value={r.id} /><SubmitButton size="sm" variant="ghost">Remove</SubmitButton></ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm action={restrictionAction} resetOnSuccess className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <input type="hidden" name="contractId" value={c.id} /><input type="hidden" name="currency" value={c.currency} /><input type="hidden" name="remove" value="" />
              <Field label="Type"><select name="kind" className="field"><option value="stop_sell">Stop-sell</option><option value="blackout">Blackout</option><option value="supplement">Supplement</option></select></Field>
              <Field label="Room"><select name="roomTypeId" className="field"><option value="">All rooms</option>{roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
              <Field label="From"><input type="date" name="dateFrom" className="field num" /></Field>
              <Field label="To"><input type="date" name="dateTo" className="field num" /></Field>
              <Field label="Supplement amount"><input name="amount" className="field num" /></Field>
              <Field label="Note"><input name="note" className="field" placeholder="Trade fair" /></Field>
              <div><SubmitButton size="sm" variant="secondary">Add restriction</SubmitButton></div>
            </ActionForm>
          </Panel>
          <Panel title="Allotment" description="Rooms the hotel guarantees for instant confirmation. Inside the release period, bookings go on request.">
            <ul className="mb-4 divide-y divide-line text-[0.88rem]">
              {allocations.length === 0 && <li className="py-2 text-muted">No allotment — every booking goes on request.</li>}
              {allocations.map((a) => <li key={a.roomTypeId} className="py-2">{rtName(a.roomTypeId)} · <span className="num">{formatDate(a.from)} – {formatDate(a.to)}</span> · {a.nights} nights · <span className="num">{a.sold}</span> of <span className="num">{a.total}</span> room-nights sold</li>)}
            </ul>
            <ActionForm action={allocationAction} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <input type="hidden" name="contractId" value={c.id} />
              <Field label="Room"><select name="roomTypeId" className="field">{roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
              <Field label="Rooms per night"><input name="rooms" className="field num" /></Field>
              <Field label="From"><input type="date" name="dateFrom" className="field num" /></Field>
              <Field label="To"><input type="date" name="dateTo" className="field num" /></Field>
              <div><SubmitButton size="sm" variant="secondary">Set allotment</SubmitButton></div>
            </ActionForm>
          </Panel>
        </div>

        <Panel title="Commercial terms" description="Changing commercial terms on an active contract returns it to draft for re-approval. Every change is in the audit log.">
          <ContractForm action={updateContractAction} hotelId={hotel.id} contract={c} submit="Save terms" />
        </Panel>
      </div>
    </>
  );
}

export const metadata = { title: 'Contract' };
