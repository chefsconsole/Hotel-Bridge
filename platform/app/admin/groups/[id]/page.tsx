import Link from 'next/link';
import { notFound } from 'next/navigation';
import { inArray, sql } from 'drizzle-orm';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { StagePill, roomsText } from '@/components/group-bits';
import { DL, Empty, Money, PageHeader, Panel, Pill } from '@/components/ui';
import { groupOpsAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { addDays, formatDate, formatDateTime, todayIso } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { requireStaff } from '@/lib/session';
import { getEnquiry, GROUP_STAGES, STAGE_LABEL, suggestedRespondBy } from '@/lib/services/groups';
import { NotFoundError } from '@/lib/services/errors';

const Hidden = ({ id, op }: { id: string; op: string }) => <><input type="hidden" name="enquiryId" value={id} /><input type="hidden" name="op" value={op} /></>;

export default async function AdminGroup({ params }: { params: Promise<{ id: string }> }) {
  const { actor } = await requireStaff();
  const { id } = await params;
  const db = await getDb();
  const d = await getEnquiry(db, actor, id).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  const e = d.enquiry;
  const cities = e.legs.map((l) => l.city.toLowerCase());
  const candidates = await db.select().from(schema.hotels).where(inArray(sql`lower(${schema.hotels.city})`, cities));
  const closed = ['won', 'lost', 'cancelled'].includes(e.status);
  return (
    <>
      <Link href="/admin/groups" className="text-[0.85rem] text-muted hover:text-ink">← Pipeline</Link>
      <PageHeader eyebrow={`${e.reference} · ${d.agency.name}`} title={e.groupName}
        actions={<ActionForm action={groupOpsAction} className="flex items-center gap-2"><Hidden id={e.id} op="stage" /><StagePill status={e.status} />
          <select name="status" defaultValue={e.status} className="field !w-auto !py-1.5 text-[0.85rem]">{GROUP_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
          <SubmitButton size="sm" variant="secondary">Set stage</SubmitButton></ActionForm>} />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          <Panel title="1 · Hotel enquiries" description="Generated emails are not sent automatically — email delivery is not connected. Copy, send, then mark as sent." padded={false}>
            {d.requests.length === 0 ? <Empty title="No hotels approached yet" /> : (
              <ul className="divide-y divide-line">{d.requests.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{r.hotelName} <span className="text-[0.82rem] text-muted">· {r.city}{r.hotelEmail ? ` · ${r.hotelEmail}` : ' · no email on file'}</span></p>
                    <Pill tone={r.status === 'responded' ? 'positive' : r.status === 'sent' ? 'pending' : r.status === 'generated' ? 'attention' : 'neutral'}>{r.status === 'generated' ? 'Generated — not sent' : r.status}</Pill>
                  </div>
                  <p className="text-[0.78rem] text-faint">Reply due {r.respondBy ? formatDate(r.respondBy) : '—'}{r.sentAt ? ` · sent ${formatDateTime(r.sentAt)}` : ''}</p>
                  <details className="mt-2"><summary className="cursor-pointer text-[0.82rem] text-muted">Email text</summary>
                    <p className="mt-2 text-[0.82rem] font-medium">{r.subject}</p>
                    <textarea readOnly rows={12} defaultValue={r.body} className="field mt-1 font-mono text-[0.75rem]" />
                    {r.hotelEmail && <a href={`mailto:${r.hotelEmail}?subject=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body)}`} className="mt-2 inline-block text-[0.82rem] underline">Open in mail app</a>}
                  </details>
                  {r.status === 'generated' && <ActionForm action={groupOpsAction} className="mt-2"><Hidden id={e.id} op="sent" /><input type="hidden" name="requestId" value={r.id} /><SubmitButton size="sm" variant="secondary">I have sent this</SubmitButton></ActionForm>}
                  {r.status === 'sent' && <ActionForm action={groupOpsAction} className="mt-2 flex gap-2"><Hidden id={e.id} op="request_status" /><input type="hidden" name="requestId" value={r.id} /><SubmitButton size="sm" variant="ghost" name="status" value="declined">Hotel declined</SubmitButton><SubmitButton size="sm" variant="ghost" name="status" value="no_response">No response</SubmitButton></ActionForm>}
                </li>
              ))}</ul>
            )}
            {!closed && (
              <ActionForm action={groupOpsAction} className="space-y-3 border-t border-line p-5">
                <Hidden id={e.id} op="requests" />
                <p className="text-[0.9rem] font-semibold">Approach hotels</p>
                {candidates.length > 0 && <div className="flex flex-wrap gap-3">{candidates.map((h) => <label key={h.id} className="flex items-center gap-1.5 text-[0.85rem]"><input type="checkbox" name="hotelIds" value={h.id} className="size-4" />{h.name} <span className="text-faint">({h.city})</span></label>)}</div>}
                <Field label="Other hotels" hint="One per line: name, city, email"><textarea name="manual" rows={2} className="field" /></Field>
                <Field label="Hotels reply by"><input type="date" name="respondBy" defaultValue={suggestedRespondBy(e.quoteNeededBy)} max={e.quoteNeededBy} className="field num !w-auto" /></Field>
                <SubmitButton size="sm">Generate enquiry emails</SubmitButton>
              </ActionForm>
            )}
          </Panel>

          <Panel title="2 · Offers received" padded={false}>
            {d.offers.length === 0 ? <Empty title="No offers recorded" /> : (
              <table className="table"><thead><tr><th>Hotel</th><th>Lines</th><th>Terms</th><th>Valid until</th><th className="text-right">Cost total</th></tr></thead>
                <tbody>{d.offers.map((o) => (
                  <tr key={o.id}><td className="font-medium">{o.hotelName}<p className="text-[0.75rem] text-faint">{o.city} · {o.mealPlan ?? '—'}</p></td>
                    <td className="text-[0.82rem]">{o.lines.map((l, i) => <p key={i}>{l.rooms}× {l.roomType} × {l.nights}n @ {formatMoney(l.rateMinor, o.currency)}</p>)}</td>
                    <td className="max-w-56 text-[0.78rem] text-muted">{o.taxesNote}{o.cityTaxMinor ? ` · city tax ${formatMoney(o.cityTaxMinor, o.currency)} pppn` : ''}<br />{o.cancellationTerms}</td>
                    <td className="num">{o.validUntil ? formatDate(o.validUntil) : '—'}</td><td className="text-right"><Money minor={o.costTotalMinor} currency={o.currency} /></td></tr>
                ))}</tbody></table>
            )}
            {!closed && (
              <details className="border-t border-line p-5"><summary className="cursor-pointer text-[0.9rem] font-semibold">Record a hotel offer</summary>
                <ActionForm action={groupOpsAction} resetOnSuccess className="mt-4 space-y-3">
                  <Hidden id={e.id} op="offer" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="From enquiry"><select name="requestId" className="field"><option value="">— none —</option>{d.requests.map((r) => <option key={r.id} value={r.id}>{r.hotelName}</option>)}</select></Field>
                    <Field label="Hotel name"><input name="hotelName" className="field" /></Field>
                    <Field label="City"><input name="city" defaultValue={e.legs[0].city} className="field" /></Field>
                    <Field label="Currency"><select name="currency" defaultValue={e.currency} className="field">{['EUR', 'GBP', 'CHF', 'USD', 'INR', 'AED', 'THB', 'SGD'].map((c) => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Board"><input name="mealPlan" defaultValue={e.mealPlan ?? ''} className="field" /></Field>
                    <Field label="Offer valid until"><input type="date" name="validUntil" className="field num" /></Field>
                  </div>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-4 gap-2">
                      <input name={`rt_${i}`} placeholder="Room type" className="field" /><input name={`rooms_${i}`} placeholder="Rooms" className="field num" />
                      <input name={`nights_${i}`} placeholder="Nights" className="field num" /><input name={`rate_${i}`} placeholder="Net rate / room / night" className="field num" />
                    </div>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Taxes"><input name="taxesNote" className="field" placeholder="VAT included" /></Field>
                    <Field label="City tax per person/night"><input name="cityTax" className="field num" /></Field>
                    <Field label="Cancellation / attrition"><textarea name="cancellationTerms" rows={2} className="field" /></Field>
                    <Field label="Deposit & payment"><textarea name="paymentTerms" rows={2} className="field" /></Field>
                  </div>
                  <SubmitButton size="sm">Record offer</SubmitButton>
                </ActionForm>
              </details>
            )}
          </Panel>

          <Panel title="3 · Proposals" padded={false}>
            {d.proposals.length === 0 ? <Empty title="No proposal yet" /> : (
              <table className="table"><thead><tr><th>Version</th><th>Status</th><th className="text-right">Cost</th><th className="text-right">Sell</th><th className="text-right">Margin</th><th /></tr></thead>
                <tbody>{d.proposals.map((p) => (
                  <tr key={p.id}><td>v{p.version}<p className="text-[0.75rem] text-faint">valid until {formatDate(p.validUntil)}</p></td><td><Pill tone={p.status === 'accepted' ? 'positive' : p.status === 'sent' ? 'attention' : 'neutral'}>{p.status}</Pill></td>
                    <td className="text-right"><Money minor={p.costTotalMinor} currency={p.currency} /></td><td className="text-right font-medium"><Money minor={p.sellTotalMinor} currency={p.currency} /></td>
                    <td className="num text-right">{p.sellTotalMinor ? (((p.sellTotalMinor - p.costTotalMinor) / p.sellTotalMinor) * 100).toFixed(1) : 0}%</td>
                    <td>{p.status === 'draft' && <ActionForm action={groupOpsAction}><Hidden id={e.id} op="send_proposal" /><input type="hidden" name="proposalId" value={p.id} /><SubmitButton size="sm" confirm="Send this proposal to the agent?">Send to agent</SubmitButton></ActionForm>}</td></tr>
                ))}</tbody></table>
            )}
            {!closed && d.offers.length > 0 && (
              <ActionForm action={groupOpsAction} className="space-y-3 border-t border-line p-5">
                <Hidden id={e.id} op="proposal" />
                <p className="text-[0.9rem] font-semibold">Build a proposal from recorded offers</p>
                <div className="flex flex-wrap gap-3">{d.offers.map((o) => <label key={o.id} className="flex items-center gap-1.5 text-[0.85rem]"><input type="checkbox" name="offerIds" value={o.id} className="size-4" />{o.hotelName} ({formatMoney(o.costTotalMinor, o.currency)})</label>)}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Markup on cost %"><input name="markupPct" defaultValue="10" className="field num" /></Field>
                  <Field label="Valid until"><input type="date" name="validUntil" defaultValue={addDays(todayIso(), 7)} className="field num" /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2"><Field label="Includes"><textarea name="inclusions" rows={2} className="field" /></Field><Field label="Excludes"><textarea name="exclusions" rows={2} className="field" /></Field></div>
                <SubmitButton size="sm">Draft proposal</SubmitButton>
              </ActionForm>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Requirements">
            <DL cols={1} items={[
              ['Itinerary', <ul key="l">{e.legs.map((l, i) => <li key={i}>{l.city}: {formatDate(l.checkIn)} – {formatDate(l.checkOut)}</li>)}</ul>],
              ['Travellers', `${e.totalPax} · ${e.groupType}`], ['Rooms', roomsText(e.rooms)],
              ['Category / board', `${e.category ?? 'any'} · ${e.mealPlan ?? 'to advise'}`], ['Coach parking', e.coachParking ? 'Required' : 'No'],
              ['Accessibility', e.accessibility], ['Other', e.specialRequests],
              ['Budget', e.budgetMinor ? `${formatMoney(e.budgetMinor, e.currency)} ${e.budgetBasis?.replace(/_/g, ' ')}` : null],
              ['First reply due', formatDateTime(e.respondBy)], ['Quote due', formatDate(e.quoteNeededBy)],
            ]} />
          </Panel>
          <Panel title="Conversation" description="Internal notes are never shown to the agent.">
            <ul className="space-y-3">{d.messages.map((m) => (
              <li key={m.id} className={`rounded-[var(--radius-md)] p-3 ${m.visibility === 'internal' ? 'border border-dashed border-line-strong' : 'bg-mist/60'}`}>
                <p className="text-[0.75rem] text-faint">{m.visibility === 'internal' ? 'Internal · ' : ''}{m.authorLabel} · {formatDateTime(m.createdAt)}</p>
                <p className="mt-1 text-[0.88rem] whitespace-pre-line">{m.body}</p>
              </li>
            ))}</ul>
            <ActionForm action={groupOpsAction} resetOnSuccess className="mt-4 space-y-2">
              <Hidden id={e.id} op="message" />
              <textarea name="body" rows={3} className="field" />
              <div className="flex items-center gap-3"><select name="visibility" className="field !w-auto"><option value="internal">Internal note</option><option value="shared">Message to agent</option></select><SubmitButton size="sm">Add</SubmitButton></div>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}

export const metadata = { title: 'Group enquiry' };
