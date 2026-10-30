import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { StagePill, roomsText } from '@/components/group-bits';
import { DL, Money, Notice, Panel, Pill } from '@/components/ui';
import { groupMessageAction, proposalDecisionAction } from '@/app/actions/agent';
import { getDb } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { requireAgent } from '@/lib/session';
import { getEnquiry } from '@/lib/services/groups';
import { NotFoundError } from '@/lib/services/errors';

export default async function GroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { actor } = await requireAgent();
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const d = await getEnquiry(await getDb(), actor, id).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  const e = d.enquiry;
  return (
    <>
      <Link href="/agent/groups" className="text-[0.85rem] text-muted hover:text-ink">← Group requests</Link>
      <header className="mt-4 mb-6">
        <p className="eyebrow num">{e.reference}</p>
        <h1 className="mt-1 text-[2rem] font-semibold">{e.groupName}</h1>
        <div className="mt-2"><StagePill status={e.status} /></div>
      </header>
      {isNew && <div className="mb-6"><Notice tone="success" title="Request received">We&apos;ll review it and reply by {formatDateTime(e.respondBy)}.</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          {d.proposals.map((p) => (
            <Panel key={p.id} title={`Proposal v${p.version}`} description={`Valid until ${formatDate(p.validUntil)}`} actions={<Pill tone={p.status === 'sent' ? 'attention' : p.status === 'accepted' ? 'positive' : 'neutral'}>{p.status === 'sent' ? 'Awaiting your decision' : p.status}</Pill>}>
              <ul className="divide-y divide-line">
                {d.offers.filter((o) => p.offerIds.includes(o.id)).map((o) => (
                  <li key={o.id} className="py-3 text-[0.88rem]">
                    <p className="font-medium">{o.hotelName} · {o.city}</p>
                    <p className="text-muted">{o.mealPlan ? `${o.mealPlan} · ` : ''}{o.taxesNote}</p>
                    {o.cityTaxMinor ? <p className="text-muted">City tax {formatMoney(o.cityTaxMinor, o.currency)} per person per night, payable locally</p> : null}
                    {o.cancellationTerms && <p className="mt-1 text-muted"><span className="text-ink">Cancellation:</span> {o.cancellationTerms}</p>}
                    {o.paymentTerms && <p className="text-muted"><span className="text-ink">Payment:</span> {o.paymentTerms}</p>}
                  </li>
                ))}
              </ul>
              {(p.inclusions || p.exclusions) && <div className="mt-3 grid gap-3 text-[0.85rem] sm:grid-cols-2">{p.inclusions && <p><span className="font-medium">Includes:</span> {p.inclusions}</p>}{p.exclusions && <p><span className="font-medium">Excludes:</span> {p.exclusions}</p>}</div>}
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4"><span className="font-semibold">Total for the group</span><Money minor={p.sellTotalMinor} currency={p.currency} className="text-[1.3rem] font-semibold" /></div>
              {p.status === 'sent' && (
                <ActionForm action={proposalDecisionAction} className="mt-4">
                  <input type="hidden" name="proposalId" value={p.id} /><input type="hidden" name="enquiryId" value={e.id} />
                  <Field label="Note to the Group Desk (optional)"><input name="note" className="field" /></Field>
                  <div className="mt-3 flex gap-2">
                    <SubmitButton name="decision" value="accept" confirm="Accept this proposal?">Accept proposal</SubmitButton>
                    <SubmitButton name="decision" value="decline" variant="secondary">Decline</SubmitButton>
                  </div>
                </ActionForm>
              )}
            </Panel>
          ))}
          <Panel title="Conversation">
            <ul className="space-y-4">
              {d.messages.map((m) => (
                <li key={m.id} className="rounded-[var(--radius-md)] bg-mist/60 p-3.5">
                  <p className="text-[0.78rem] text-faint">{m.authorLabel} · {formatDateTime(m.createdAt)}</p>
                  <p className="mt-1 text-[0.9rem] whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ul>
            {!['won', 'lost', 'cancelled'].includes(e.status) && (
              <ActionForm action={groupMessageAction} resetOnSuccess className="mt-4">
                <input type="hidden" name="enquiryId" value={e.id} />
                <textarea name="body" rows={3} className="field" placeholder="Write to the Group Desk…" />
                <SubmitButton size="sm" className="mt-2">Send</SubmitButton>
              </ActionForm>
            )}
          </Panel>
        </div>
        <Panel title="Request">
          <DL cols={1} items={[
            ['Itinerary', <ul key="l">{e.legs.map((l, i) => <li key={i}>{l.city}: {formatDate(l.checkIn)} – {formatDate(l.checkOut)}</li>)}</ul>],
            ['Travellers', `${e.totalPax} · ${e.groupType}`],
            ['Rooms', roomsText(e.rooms)],
            ['Category / meals', `${e.category ? `${e.category}-star` : 'Any'} · ${e.mealPlan ?? 'to advise'}`],
            ['Coach parking', e.coachParking ? 'Required' : 'Not needed'],
            ['Accessibility', e.accessibility],
            ['Other', e.specialRequests],
            ['Budget', e.budgetMinor ? `${formatMoney(e.budgetMinor, e.currency)} (${e.budgetBasis?.replace(/_/g, ' ')})` : null],
            ['Quotation needed by', formatDate(e.quoteNeededBy)],
          ]} />
        </Panel>
      </div>
    </>
  );
}

export const metadata = { title: 'Group request' };
