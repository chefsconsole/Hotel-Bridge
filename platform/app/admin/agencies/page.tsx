import Link from 'next/link';
import { Empty, PageHeader, Pill, SampleTag } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { isIndia, isPan } from '@/lib/domain/india';
import { requireStaff } from '@/lib/session';
import { listAgencies } from '@/lib/services/catalog';

export const metadata = { title: 'Agencies' };

const TABS: Record<string, { label: string; statuses?: string[] }> = {
  pending: { label: 'Waiting for approval', statuses: ['pending'] },
  verified: { label: 'Approved', statuses: ['verified'] },
  closed: { label: 'Declined & suspended', statuses: ['rejected', 'suspended'] },
  all: { label: 'All' },
};
const STATUS: Record<string, [string, 'positive' | 'attention' | 'negative']> = {
  verified: ['Approved', 'positive'], pending: ['Waiting', 'attention'], rejected: ['Declined', 'negative'], suspended: ['Suspended', 'negative'],
};

export default async function Agencies({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await requireStaff();
  const { tab = 'pending', q = '' } = await searchParams;
  const all = await listAgencies(await getDb());
  const t = TABS[tab] ?? TABS.pending;
  let rows = t.statuses ? all.filter(({ a }) => t.statuses!.includes(a.status)) : all;
  const needle = q.trim().toLowerCase();
  if (needle) rows = rows.filter(({ a }) => [a.name, a.legalName ?? '', a.city ?? '', a.pan ?? '', a.gstin ?? ''].some((x) => x.toLowerCase().includes(needle)));
  const destCounts = new Map<string, number>();
  for (const { a } of all) for (const d of (a.topDestinations ?? '').split(',').map((x) => x.trim()).filter(Boolean)) destCounts.set(d, (destCounts.get(d) ?? 0) + 1);
  const topDest = [...destCounts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12);
  const count = (k: string) => (TABS[k].statuses ? all.filter(({ a }) => TABS[k].statuses!.includes(a.status)).length : all.length);
  return (
    <>
      <PageHeader eyebrow="Distribution" title="Agencies" description="Every agency registers, uploads its PAN card (India) and waits for approval. Only approved agencies can book. Credit stays off unless finance approves it." />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(TABS).map(([k, v]) => (
            <Link key={k} href={`/admin/agencies?tab=${k}`} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] ${k === tab ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>
              {v.label}<span className={`num text-[0.72rem] ${k === tab ? 'text-paper/60' : 'text-faint'}`}>{count(k)}</span>
            </Link>
          ))}
        </div>
        <form className="md:w-72"><input type="hidden" name="tab" value={tab} /><input name="q" defaultValue={q} placeholder="Name, city, PAN or GSTIN" className="field" /></form>
      </div>
      {topDest.length > 0 && (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
          <p className="text-[0.85rem] font-medium">What our agencies sell most <span className="font-normal text-muted">· from registrations</span></p>
          <div className="mt-2 flex flex-wrap gap-2">{topDest.map(([d, n]) => <span key={d} className="rounded-full bg-mist px-3 py-1 text-[0.82rem]">{d} <span className="num text-muted">{n}</span></span>)}</div>
        </div>
      )}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title={tab === 'pending' ? 'No agencies waiting for approval' : 'No agencies here'} /> : (
          <table className="table"><thead><tr><th>Agency</th><th>City</th><th>Registered</th><th>KYC</th><th>Status</th><th>Credit</th><th className="text-right">Users</th><th className="text-right">Bookings</th></tr></thead>
            <tbody>{rows.map(({ a, users, bookings, documents, panCard }) => {
              const india = isIndia(a.country);
              const kycOk = india ? !!a.pan && isPan(a.pan) && panCard : documents > 0;
              return (
                <tr key={a.id}>
                  <td><Link href={`/admin/agencies/${a.id}`} className="font-medium hover:underline">{a.name}</Link> {a.isSample && <SampleTag />}{a.legalName && <p className="text-[0.75rem] text-faint">{a.legalName}</p>}</td>
                  <td>{a.city ?? '—'}<p className="text-[0.75rem] text-faint">{[a.state, a.country].filter(Boolean).join(', ')}</p>{a.topDestinations && <p className="max-w-[16rem] truncate text-[0.72rem] text-muted" title={a.topDestinations}>Sells: {a.topDestinations}</p>}</td>
                  <td className="num whitespace-nowrap">{formatDate(a.createdAt)}</td>
                  <td>
                    <Pill tone={kycOk ? 'positive' : 'attention'} dot={false}>{kycOk ? 'Complete' : 'Incomplete'}</Pill>
                    <p className="num mt-1 text-[0.72rem] text-faint">{india ? `PAN ${a.pan ? '✓' : '—'} · card ${panCard ? '✓' : '—'}${a.gstin ? ' · GST ✓' : ''}` : `${documents} document${documents === 1 ? '' : 's'}`}</p>
                  </td>
                  <td><Pill tone={STATUS[a.status]?.[1] ?? 'neutral'}>{STATUS[a.status]?.[0] ?? a.status}</Pill></td>
                  <td>{a.creditEnabled ? 'On' : 'Off'}</td><td className="num text-right">{users}</td><td className="num text-right">{bookings}</td>
                </tr>
              );
            })}</tbody></table>
        )}
      </div>
    </>
  );
}
