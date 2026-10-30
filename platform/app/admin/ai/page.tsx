import { asc, eq, gte, sql } from 'drizzle-orm';
import { AiForm, AiOffNotice } from '@/components/ai-bits';
import { PageHeader, Panel, Stat } from '@/components/ui';
import { founderBriefAction } from '@/app/actions/ai';
import { AI_MODEL, aiConfigured } from '@/lib/ai/client';
import { getDb, schema } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import Link from 'next/link';

export const metadata = { title: 'AI tools' };

export default async function AdminAi() {
  await requireStaff();
  const on = aiConfigured();
  const db = await getDb();
  const contracts = await db.select({ id: schema.contracts.id, reference: schema.contracts.reference, hotel: schema.hotels.name, currency: schema.contracts.currency })
    .from(schema.contracts).innerJoin(schema.hotels, eq(schema.hotels.id, schema.contracts.hotelId)).orderBy(asc(schema.hotels.name));
  const [usage] = await db.select({
    calls: sql<number>`count(*)::int`, failed: sql<number>`count(*) filter (where not ${schema.aiUsage.ok})::int`,
    input: sql<number>`coalesce(sum(${schema.aiUsage.inputTokens}),0)::int`, output: sql<number>`coalesce(sum(${schema.aiUsage.outputTokens}),0)::int`,
  }).from(schema.aiUsage).where(gte(schema.aiUsage.createdAt, sql`now() - interval '30 days'`));
  return (
    <>
      <PageHeader eyebrow="AI tools" title="Let the paperwork write itself"
        description={`Drafts and extractions from your own records, reviewed by a person before anything is saved. Model: ${AI_MODEL}.`} />
      {!on && <div className="mb-8"><AiOffNotice /></div>}
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Founder brief" description="This week's numbers and open issues, written up in plain language. Uses only the figures on the Overview page.">
          <AiForm action={founderBriefAction} submit="Write this week's brief" disabled={!on} outputLabel="Brief"><span /></AiForm>
        </Panel>
        <Panel title="Read a hotel's rate offer" description="Paste a hotel's rate email on its contract page and get import-ready rate lines mapped to the room types. Pick a contract:">
          {contracts.length === 0 ? <p className="text-[0.9rem] text-muted">Create a hotel contract first.</p> : (
            <ul className="divide-y divide-line">{contracts.map((c) => (
              <li key={c.id}><Link href={`/admin/contracts/${c.id}#ai-rates`} className="flex justify-between py-2.5 text-[0.9rem] hover:text-champagne"><span>{c.hotel}</span><span className="text-muted">{c.reference} · {c.currency} →</span></Link></li>
            ))}</ul>
          )}
        </Panel>
        <Panel title="AI usage" description="Last 30 days" className="lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-4">
            <Stat label="Requests" value={usage.calls} />
            <Stat label="Failed / declined" value={usage.failed} />
            <Stat label="Input tokens" value={usage.input.toLocaleString()} />
            <Stat label="Output tokens" value={usage.output.toLocaleString()} />
          </div>
        </Panel>
      </div>
    </>
  );
}
