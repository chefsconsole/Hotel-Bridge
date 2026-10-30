import { desc, gte, sql } from 'drizzle-orm';
import { Notice, PageHeader, Panel, Pill } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { HB_ENV } from '@/lib/config';
import { requireStaff } from '@/lib/session';
import { SUPPLIER_CANDIDATES, adapters, breakerState } from '@/lib/suppliers/registry';

export const metadata = { title: 'Suppliers' };

export default async function Suppliers() {
  await requireStaff();
  const db = await getDb();
  const s = schema.supplierCalls;
  const stats = await db.select({ supplier: s.supplier, operation: s.operation, outcome: s.outcome, n: sql<number>`count(*)::int`, avg: sql<number>`avg(${s.durationMs})::int` })
    .from(s).where(gte(s.createdAt, sql`now() - interval '7 days'`)).groupBy(s.supplier, s.operation, s.outcome).orderBy(desc(sql`count(*)`));
  return (
    <>
      <PageHeader eyebrow={`Environment: ${HB_ENV}`} title="Supplier connections" description="Each source declares what it can actually do. Booking calls are never retried; timeouts go to reconciliation." />
      <div className="grid gap-6 lg:grid-cols-2">
        {adapters().map((a) => (
          <Panel key={a.id} title={a.label} actions={<div className="flex gap-2"><Pill tone={a.environment === 'production' ? 'positive' : 'attention'}>{a.environment === 'development' ? 'Simulated' : a.environment}</Pill><Pill tone={breakerState(a.id) === 'open' ? 'negative' : 'neutral'}>{breakerState(a.id) === 'open' ? 'Paused' : 'Healthy'}</Pill></div>}>
            <div className="flex flex-wrap gap-1.5">{Object.entries(a.capabilities).map(([k, v]) => <span key={k} className={`rounded-full px-2 py-0.5 text-[0.75rem] ${v ? 'bg-positive-bg text-positive' : 'bg-neutral-bg text-faint line-through'}`}>{k}</span>)}</div>
          </Panel>
        ))}
      </div>
      <Panel title="Third-party suppliers — not connected" className="mt-6" padded={false}>
        <table className="table"><thead><tr><th>Candidate</th><th>Where it is strong (to verify commercially)</th><th>Needed before integration</th></tr></thead>
          <tbody>{SUPPLIER_CANDIDATES.map((c) => <tr key={c.id}><td className="font-medium">{c.label}</td><td className="text-muted">{c.strength}</td><td className="text-muted">{c.needs}</td></tr>)}</tbody></table>
        <div className="p-5"><Notice>Each needs a commercial agreement and confirmation that onward B2B distribution is permitted. Adding one means writing an adapter in <code>lib/suppliers/</code> that implements the same interface.</Notice></div>
      </Panel>
      <Panel title="Calls in the last 7 days" className="mt-6" padded={false}>
        <table className="table"><thead><tr><th>Supplier</th><th>Operation</th><th>Outcome</th><th className="text-right">Calls</th><th className="text-right">Avg ms</th></tr></thead>
          <tbody>{stats.map((r, i) => <tr key={i}><td>{r.supplier}</td><td>{r.operation}</td><td>{r.outcome}</td><td className="num text-right">{r.n}</td><td className="num text-right">{r.avg}</td></tr>)}</tbody></table>
      </Panel>
    </>
  );
}
