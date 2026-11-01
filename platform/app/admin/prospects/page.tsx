import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Empty, PageHeader, Panel, Pill, cx } from '@/components/ui';
import { importProspectsAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { listStaff } from '@/lib/services/staff';
import { OPEN_STAGES, STAGE_LABEL, listProspects, prospectDestinations, prospectStats } from '@/lib/services/prospects';

export const metadata = { title: 'Hotel outreach' };

const STAGE_TONE: Record<string, 'neutral' | 'info' | 'pending' | 'positive' | 'negative'> = {
  to_contact: 'neutral', contacted: 'pending', in_talks: 'info', rates_received: 'info', signed: 'positive', declined: 'negative', not_now: 'neutral',
};
const FUNNEL = ['to_contact', 'contacted', 'in_talks', 'rates_received', 'signed'] as const;

type SP = { stage?: string; p?: string; d?: string; q?: string; due?: string; mine?: string };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { actor } = await requireStaff();
  const sp = await searchParams;
  const stage = sp.stage ?? 'open';
  const db = await getDb();
  const [rows, stats, dests, staff] = await Promise.all([
    listProspects(db, { stage, priority: sp.p || undefined, destination: sp.d || undefined, q: sp.q, due: !!sp.due, ownerId: sp.mine ? actor.userId : undefined }),
    prospectStats(db), prospectDestinations(db), listStaff(db),
  ]);
  const owner = new Map(staff.map((s) => [s.id, s.name]));
  const today = todayIso();
  const qs = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    return '/admin/prospects?' + new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
  };
  const open = OPEN_STAGES.reduce((s, k) => s + (stats.by[k] ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Sales" title="Hotel outreach"
        description="The hotels we want to sign, from first contact to a signed rate agreement. Prospects are never shown to agents — a hotel becomes sellable only once it is created with an active contract." />

      {stats.total === 0 ? (
        <Panel title="Start with the research list" description="Import docs/hotel-targets.csv from the repository — 270 hotels in 32 destinations, with priority, tier and who each suits.">
          <ImportForm />
        </Panel>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
            {FUNNEL.map((k, i) => (
              <Link key={k} href={qs({ stage: k })} className={cx('relative rounded-[var(--radius-lg)] border bg-surface p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]', stage === k ? 'border-ink' : 'border-line')}>
                <p className="text-[0.66rem] font-medium tracking-[0.14em] text-faint uppercase">{i + 1}. {STAGE_LABEL[k]}</p>
                <p className={cx('num mt-2 font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light', k === 'signed' && 'text-positive')}>{stats.by[k] ?? 0}</p>
              </Link>
            ))}
            <Link href={qs({ due: sp.due ? '' : '1', stage: 'open' })} className={cx('rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-soft)]', stats.due ? 'border-[#ecd9b5] bg-attention-bg text-attention' : 'border-line bg-surface', sp.due && 'ring-2 ring-ink')}>
              <p className="text-[0.66rem] font-medium tracking-[0.14em] uppercase opacity-80">Follow-ups due</p>
              <p className="num mt-2 font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light">{stats.due}</p>
            </Link>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {[['open', `Open · ${open}`], ['all', `All · ${stats.total}`], ['declined', 'Declined'], ['not_now', 'Not now']].map(([k, l]) => (
                <Link key={k} href={qs({ stage: k })} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${stage === k ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>{l}</Link>
              ))}
              {['P1', 'P2'].map((p) => <Link key={p} href={qs({ p: sp.p === p ? '' : p })} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${sp.p === p ? 'bg-champagne text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>{p}</Link>)}
              <Link href={qs({ mine: sp.mine ? '' : '1' })} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${sp.mine ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>Mine</Link>
            </div>
            <form className="flex flex-wrap gap-2">
              <input type="hidden" name="stage" value={stage} />
              {sp.p && <input type="hidden" name="p" value={sp.p} />}
              <select name="d" defaultValue={sp.d ?? ''} className="field !w-auto max-w-56 py-2 text-[0.85rem]"><option value="">All destinations</option>{dests.map((d) => <option key={d}>{d}</option>)}</select>
              <input name="q" defaultValue={sp.q} placeholder="Hotel or contact" className="field !w-44 py-2 text-[0.85rem]" />
              <button className="rounded-[var(--radius-sm)] bg-ink px-4 text-[0.85rem] text-paper">Filter</button>
            </form>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
            {rows.length === 0 ? <Empty title="No hotels match" /> : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Hotel</th><th>Destination</th><th>Tier</th><th>Stage</th><th>Contact</th><th>Next step</th><th>Owner</th></tr></thead>
                  <tbody>{rows.map((p) => (
                    <tr key={p.id}>
                      <td className="min-w-56">
                        <Link href={`/admin/prospects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                        <p className="mt-0.5 text-[0.72rem] text-faint"><span className={p.priority === 'P1' ? 'font-semibold text-champagne' : ''}>{p.priority}</span>{p.bestFor ? ` · ${p.bestFor}` : ''}{!p.nameChecked && ' · verify name'}</p>
                      </td>
                      <td className="text-[0.85rem]">{p.destination}<p className="text-[0.72rem] text-faint">{p.region}</p></td>
                      <td className="text-[0.82rem] whitespace-nowrap">{p.tier ?? '—'}{p.totalRooms ? <p className="num text-[0.72rem] text-faint">{p.totalRooms} rooms</p> : null}</td>
                      <td><Pill tone={STAGE_TONE[p.stage]}>{STAGE_LABEL[p.stage]}</Pill></td>
                      <td className="text-[0.82rem]">{p.contactName ?? <span className="text-faint">—</span>}{p.contactRole && <p className="text-[0.72rem] text-faint">{p.contactRole}</p>}</td>
                      <td className="max-w-60 text-[0.82rem]">
                        {p.nextStepOn
                          ? <span className={p.nextStepOn <= today ? 'font-medium text-attention' : 'text-muted'}>{p.nextStepOn < today ? 'Overdue · ' : p.nextStepOn === today ? 'Today · ' : `${formatDate(p.nextStepOn, { day: 'numeric', month: 'short' })} · `}{p.nextStep ?? 'Follow up'}</span>
                          : p.nextStep ?? <span className="text-faint">—</span>}
                      </td>
                      <td className="text-[0.82rem]">{p.ownerId ? owner.get(p.ownerId) ?? '—' : <span className="text-faint">—</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          <details className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <summary className="cursor-pointer text-[0.9rem] font-medium">Import more hotels (CSV)</summary>
            <div className="mt-4"><ImportForm /></div>
          </details>
        </>
      )}
    </>
  );
}

function ImportForm() {
  return (
    <ActionForm action={importProspectsAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input name="csv" type="file" accept=".csv,text/csv" className="field sm:max-w-md file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-3 file:py-1 file:text-[0.8rem]" />
      <SubmitButton size="sm" pendingLabel="Importing…">Import</SubmitButton>
      <p className="text-[0.78rem] text-faint">Hotels already in the list (same name and destination) are skipped.</p>
    </ActionForm>
  );
}
