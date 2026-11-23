import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Empty, PageHeader, Panel, Pill, cx } from '@/components/ui';
import { createTaskAction, taskOpsAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { TASK_PRIORITIES } from '@/lib/db/schema';
import { formatDate, todayIso } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { listStaff } from '@/lib/services/staff';
import { ENTITY_HREF, ENTITY_LABEL, PRIORITY_LABEL, listTasks, taskStats, type TaskWithNames } from '@/lib/services/tasks';

export const metadata = { title: 'Tasks' };

type SP = { status?: string; mine?: string; due?: string; un?: string; p?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { actor, user } = await requireStaff();
  const sp = await searchParams;
  const status = sp.status ?? 'open';
  const db = await getDb();
  const [rows, stats, staff] = await Promise.all([
    listTasks(db, {
      status,
      ownerId: sp.mine ? actor.userId : undefined,
      unassigned: !!sp.un,
      due: !!sp.due,
      priority: sp.p || undefined,
    }),
    taskStats(db, actor.userId),
    listStaff(db),
  ]);
  const today = todayIso();
  const qs = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return '/admin/tasks' + (q ? `?${q}` : '');
  };

  return (
    <>
      <PageHeader eyebrow="Operations" title="Tasks"
        description="What the team owes, by a date. Only work someone decided to do — anything the portal can work out for itself (a hotel that has not confirmed, a follow-up due, a commission overdue) stays on the Overview, so the two lists never disagree." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Link href={qs({ status: 'open', due: '1', mine: '', un: '' })}
          className={cx('rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-soft)]', stats.overdue ? 'border-[#e8c4c4] bg-negative-bg text-negative' : 'border-line bg-surface', sp.due && 'ring-2 ring-ink')}>
          <p className="text-[0.66rem] font-medium tracking-[0.14em] uppercase opacity-80">Due or overdue</p>
          <p className="num mt-2 font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light">{stats.overdue + stats.today}</p>
        </Link>
        <Link href={qs({ status: 'open', mine: '1', due: '', un: '' })}
          className={cx('rounded-[var(--radius-lg)] border bg-surface p-4 shadow-[var(--shadow-soft)]', sp.mine ? 'border-ink ring-2 ring-ink' : 'border-line')}>
          <p className="text-[0.66rem] font-medium tracking-[0.14em] text-faint uppercase">Mine</p>
          <p className="num mt-2 font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light">{stats.mine}</p>
          <p className="mt-1 text-[0.72rem] text-faint">{stats.mineOverdue} due now</p>
        </Link>
        <Link href={qs({ status: 'open', un: '1', mine: '', due: '' })}
          className={cx('rounded-[var(--radius-lg)] border bg-surface p-4 shadow-[var(--shadow-soft)]', sp.un ? 'border-ink ring-2 ring-ink' : 'border-line')}>
          <p className="text-[0.66rem] font-medium tracking-[0.14em] text-faint uppercase">Nobody&rsquo;s</p>
          <p className="num mt-2 font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light">{stats.unassigned}</p>
        </Link>
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
          <p className="text-[0.66rem] font-medium tracking-[0.14em] text-faint uppercase">Open in all</p>
          <p className="num mt-2 font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light">{stats.open}</p>
          <p className="mt-1 text-[0.72rem] text-faint">{stats.undated} with no date</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)]">
          <p className="text-[0.66rem] font-medium tracking-[0.14em] text-faint uppercase">Done this week</p>
          <p className="num mt-2 font-[family-name:var(--font-display)] text-[1.8rem] leading-none font-light text-positive">{stats.doneThisWeek}</p>
        </div>
      </div>

      <Panel title="Add a task" description="Leave it unassigned to put it in the queue for whoever picks it up first." className="mb-6">
        <ActionForm action={createTaskAction} resetOnSuccess className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-5"><Field label="What needs doing" required><input name="title" required maxLength={200} placeholder="Call Piyarat about VAT on the Patong rates" className="field" /></Field></div>
          <div className="md:col-span-2"><Field label="Due"><input name="dueOn" type="date" className="field" /></Field></div>
          <div className="md:col-span-2"><Field label="Priority"><select name="priority" defaultValue="normal" className="field">{TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field></div>
          <div className="md:col-span-3"><Field label="Who"><select name="assignedTo" defaultValue="" className="field"><option value="">Nobody yet</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.id === user.id ? `${s.name} (me)` : s.name}</option>)}</select></Field></div>
          <div className="md:col-span-10"><Field label="Detail" hint="Optional — what good looks like, or what was agreed."><input name="detail" maxLength={2000} className="field" /></Field></div>
          <div className="flex items-end md:col-span-2"><SubmitButton pendingLabel="Adding…" className="w-full">Add task</SubmitButton></div>
        </ActionForm>
      </Panel>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[['open', `Open · ${stats.open}`], ['done', 'Done'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([k, l]) => (
          <Link key={k} href={qs({ status: k, due: '', mine: '', un: '' })} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${status === k ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>{l}</Link>
        ))}
        {TASK_PRIORITIES.map((p) => (
          <Link key={p} href={qs({ p: sp.p === p ? '' : p })} className={`rounded-full px-3 py-1.5 text-[0.82rem] ${sp.p === p ? 'bg-champagne text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}>{PRIORITY_LABEL[p]}</Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? (
          <Empty title={status === 'open' ? 'Nothing on the list' : 'No tasks match'}>
            {status === 'open' ? 'Add the next thing above, or check the Overview for work the portal has spotted on its own.' : undefined}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Task</th><th>Due</th><th>Priority</th><th>Who</th><th>About</th><th className="text-right">Act</th></tr></thead>
              <tbody>{rows.map((t) => <Row key={t.id} t={t} today={today} meId={user.id} />)}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ t, today, meId }: { t: TaskWithNames; today: string; meId: string }) {
  const open = t.status === 'open';
  const overdue = open && t.dueOn != null && t.dueOn < today;
  const dueToday = open && t.dueOn === today;
  const href = t.entity && t.entityId ? ENTITY_HREF[t.entity]?.(t.entityId) : null;
  return (
    <tr className={cx(!open && 'opacity-60')}>
      <td className="min-w-64">
        <p className={cx('font-medium', !open && 'line-through')}>{t.title}</p>
        {t.detail && <p className="mt-0.5 max-w-prose text-[0.78rem] text-muted">{t.detail}</p>}
        <p className="mt-0.5 text-[0.72rem] text-faint">
          {t.createdByName ? `Added by ${t.createdByName}` : 'Added'} · {formatDate(t.createdAt, { day: 'numeric', month: 'short' })}
          {t.status === 'done' && t.completedAt ? ` · done ${formatDate(t.completedAt, { day: 'numeric', month: 'short' })}` : ''}
        </p>
      </td>
      <td className="whitespace-nowrap text-[0.85rem]">
        {t.dueOn
          ? <span className={overdue ? 'font-medium text-negative' : dueToday ? 'font-medium text-attention' : 'text-muted'}>
            {overdue ? 'Overdue · ' : dueToday ? 'Today' : ''}{dueToday ? '' : formatDate(t.dueOn, { day: 'numeric', month: 'short' })}
          </span>
          : <span className="text-faint">No date</span>}
      </td>
      <td><Pill tone={t.priority === 'high' ? 'negative' : t.priority === 'low' ? 'neutral' : 'info'}>{PRIORITY_LABEL[t.priority]}</Pill></td>
      <td className="text-[0.82rem]">
        {t.assignedTo
          ? <span className={t.assignedTo === meId ? 'font-medium' : ''}>{t.assigneeName ?? '—'}{t.assignedTo === meId ? ' (me)' : ''}</span>
          : <span className="text-faint">Nobody</span>}
      </td>
      <td className="text-[0.82rem]">
        {href && t.entity ? <Link href={href} className="hover:underline">{ENTITY_LABEL[t.entity]}</Link> : <span className="text-faint">—</span>}
      </td>
      <td className="text-right whitespace-nowrap">
        <div className="inline-flex gap-1.5">
          {open && t.assignedTo !== meId && (
            <ActionForm action={taskOpsAction} showMessage={false} className="inline">
              <input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="op" value="take" />
              <SubmitButton size="sm" variant="secondary" pendingLabel="…">Take</SubmitButton>
            </ActionForm>
          )}
          {open ? (
            <>
              <ActionForm action={taskOpsAction} showMessage={false} className="inline">
                <input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="op" value="done" />
                <SubmitButton size="sm" pendingLabel="…">Done</SubmitButton>
              </ActionForm>
              <ActionForm action={taskOpsAction} showMessage={false} className="inline">
                <input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="op" value="cancel" />
                <SubmitButton size="sm" variant="secondary" pendingLabel="…" confirm="Cancel this task? It stays on the record but leaves the queue.">Cancel</SubmitButton>
              </ActionForm>
            </>
          ) : (
            <ActionForm action={taskOpsAction} showMessage={false} className="inline">
              <input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="op" value="reopen" />
              <SubmitButton size="sm" variant="secondary" pendingLabel="…">Reopen</SubmitButton>
            </ActionForm>
          )}
        </div>
      </td>
    </tr>
  );
}
