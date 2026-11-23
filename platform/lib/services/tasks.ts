/* ------------------------------------------------------------------ *
 * The team's task queue.
 *
 * What belongs here: work a person decided to do, by a date, that no
 * record implies on its own. What does not: anything the system can work
 * out for itself. A hotel that has not confirmed, a prospect due, a
 * commission overdue — those are derived in metrics.ts and appear on the
 * Overview. Typing them in here too would give the team two lists that
 * disagree, and then neither gets trusted.
 *
 * Tasks are the team's, not an agency's: every member sees all of them and
 * can pick up an unassigned one. Nothing here is ever shown to an agent.
 * ------------------------------------------------------------------ */
import { and, desc, eq, isNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema, type DB } from '@/lib/db';
import { TASK_ENTITIES, TASK_PRIORITIES } from '@/lib/db/schema';
import { addDays, isIsoDate, todayIso } from '@/lib/domain/dates';
import { requireStaff, type Actor } from './actor';
import { audit } from './audit';
import { NotFoundError } from './errors';

const { staffTasks } = schema;
/** Everyone on the team keeps a to-do list, so every staff role may use it. */
const ANY_STAFF = ['admin', 'ops', 'sales', 'finance'] as const;

export type Task = typeof staffTasks.$inferSelect;
export type TaskWithNames = Task & { assigneeName: string | null; createdByName: string | null };

export const PRIORITY_LABEL: Record<string, string> = { high: 'High', normal: 'Normal', low: 'Low' };
/** Where a task's record lives, so the task can link to what it is about. */
export const ENTITY_HREF: Record<string, (id: string) => string> = {
  booking: (id) => `/admin/bookings/${id}`,
  group: (id) => `/admin/groups/${id}`,
  hotel: (id) => `/admin/hotels/${id}`,
  contract: (id) => `/admin/contracts/${id}`,
  prospect: (id) => `/admin/prospects/${id}`,
  agency: (id) => `/admin/agencies/${id}`,
  rate_request: (id) => `/admin/rate-requests/${id}`,
};
export const ENTITY_LABEL: Record<string, string> = {
  booking: 'Booking', group: 'Group', hotel: 'Hotel', contract: 'Contract',
  prospect: 'Prospect', agency: 'Agency', rate_request: 'Rate request',
};

const dateField = z.string().trim().refine((v) => v === '' || isIsoDate(v), 'Due date must be a real date (YYYY-MM-DD)')
  .transform((v) => (v === '' ? null : v)).nullable();

export const taskSchema = z.object({
  title: z.string().trim().min(3, 'A task needs a title of at least 3 characters').max(200),
  detail: z.string().trim().max(2000).optional().transform((v) => v || null),
  assignedTo: z.string().uuid('Assignee is not a valid user').nullable().optional().transform((v) => v || null),
  dueOn: dateField.optional().transform((v) => v ?? null),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
  entity: z.enum(TASK_ENTITIES).nullable().optional().transform((v) => v || null),
  entityId: z.string().uuid().nullable().optional().transform((v) => v || null),
})
  // A link to a record is only meaningful with both halves, and a dangling
  // half would render a link to /admin/bookings/undefined.
  .refine((v) => (v.entity == null) === (v.entityId == null), {
    message: 'Link a task to a record by naming both the kind and its id', path: ['entityId'],
  });

export type TaskInput = z.input<typeof taskSchema>;

export async function createTask(db: DB, actor: Actor, input: TaskInput) {
  requireStaff(actor, [...ANY_STAFF]);
  const v = taskSchema.parse(input);
  const [t] = await db.insert(staffTasks).values({ ...v, createdBy: actor.userId }).returning();
  await audit(db, actor, 'task.created', 'staff_task', t.id, { title: t.title, dueOn: t.dueOn, assignedTo: t.assignedTo });
  return t;
}

export async function updateTask(db: DB, actor: Actor, id: string, input: TaskInput) {
  requireStaff(actor, [...ANY_STAFF]);
  const v = taskSchema.parse(input);
  const [t] = await db.update(staffTasks).set({ ...v, updatedAt: new Date() })
    .where(eq(staffTasks.id, id)).returning();
  if (!t) throw new NotFoundError('Task not found');
  await audit(db, actor, 'task.updated', 'staff_task', id, { title: t.title, dueOn: t.dueOn, assignedTo: t.assignedTo });
  return t;
}

/** Close a task, or put it back on the list. Done and cancelled both leave the queue. */
export async function setTaskStatus(db: DB, actor: Actor, id: string, status: 'open' | 'done' | 'cancelled') {
  requireStaff(actor, [...ANY_STAFF]);
  const done = status !== 'open';
  const [t] = await db.update(staffTasks).set({
    status,
    completedBy: done ? actor.userId : null,
    completedAt: done ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(staffTasks.id, id)).returning();
  if (!t) throw new NotFoundError('Task not found');
  await audit(db, actor, `task.${status}`, 'staff_task', id, { title: t.title });
  return t;
}

/** Take an unassigned task, or hand one to someone else. */
export async function assignTask(db: DB, actor: Actor, id: string, userId: string | null) {
  requireStaff(actor, [...ANY_STAFF]);
  const [t] = await db.update(staffTasks).set({ assignedTo: userId, updatedAt: new Date() })
    .where(eq(staffTasks.id, id)).returning();
  if (!t) throw new NotFoundError('Task not found');
  await audit(db, actor, 'task.assigned', 'staff_task', id, { assignedTo: userId });
  return t;
}

export type TaskFilter = {
  /** open (the default), done, cancelled, or all. */
  status?: string;
  ownerId?: string;
  /** Only tasks nobody has picked up. */
  unassigned?: boolean;
  /** Only tasks due today or earlier. */
  due?: boolean;
  priority?: string;
};

export async function listTasks(db: DB, filter: TaskFilter = {}): Promise<TaskWithNames[]> {
  const status = filter.status ?? 'open';
  const assignee = schema.users;
  const rows = await db.select({
    t: staffTasks,
    assigneeName: assignee.name,
    createdByName: sql<string | null>`(select u2.name from users u2 where u2.id = ${staffTasks.createdBy})`,
  }).from(staffTasks)
    .leftJoin(assignee, eq(assignee.id, staffTasks.assignedTo))
    .where(and(
      status === 'all' ? undefined : eq(staffTasks.status, status),
      filter.ownerId ? eq(staffTasks.assignedTo, filter.ownerId) : undefined,
      filter.unassigned ? isNull(staffTasks.assignedTo) : undefined,
      filter.priority ? eq(staffTasks.priority, filter.priority) : undefined,
      filter.due ? lte(staffTasks.dueOn, todayIso()) : undefined,
    ))
    // Dated work first, oldest due date at the top; undated tasks sit below it,
    // newest first. High priority breaks ties within the same day.
    .orderBy(sql`${staffTasks.dueOn} asc nulls last`, sql`case ${staffTasks.priority} when 'high' then 0 when 'normal' then 1 else 2 end`, desc(staffTasks.createdAt));
  return rows.map((r) => ({ ...r.t, assigneeName: r.assigneeName, createdByName: r.createdByName }));
}

export type TaskStats = {
  open: number; overdue: number; today: number; soon: number; unassigned: number; undated: number;
  mine: number; mineOverdue: number; doneThisWeek: number;
};

export async function taskStats(db: DB, userId: string): Promise<TaskStats> {
  const today = todayIso();
  const weekAgo = addDays(today, -7);
  const [r] = await db.select({
    open: sql<number>`count(*) filter (where status = 'open')::int`,
    overdue: sql<number>`count(*) filter (where status = 'open' and due_on < ${today})::int`,
    today: sql<number>`count(*) filter (where status = 'open' and due_on = ${today})::int`,
    soon: sql<number>`count(*) filter (where status = 'open' and due_on > ${today} and due_on <= ${addDays(today, 7)})::int`,
    unassigned: sql<number>`count(*) filter (where status = 'open' and assigned_to is null)::int`,
    undated: sql<number>`count(*) filter (where status = 'open' and due_on is null)::int`,
    mine: sql<number>`count(*) filter (where status = 'open' and assigned_to = ${userId})::int`,
    mineOverdue: sql<number>`count(*) filter (where status = 'open' and assigned_to = ${userId} and due_on <= ${today})::int`,
    doneThisWeek: sql<number>`count(*) filter (where status = 'done' and completed_at >= ${weekAgo})::int`,
  }).from(staffTasks);
  return r;
}

/* How many open tasks are due today or earlier — for the nav badge and the
 * Overview feed.
 *
 * Returns 0 rather than throwing when the table is not there yet. This is
 * deliberate and narrow: both callers render on EVERY admin page, so a deploy
 * that reaches production before the migration would otherwise take down the
 * whole console over a badge. The Tasks page itself does not swallow this —
 * it fails loudly, which is what tells you the migration has not run. */
export async function overdueTaskCount(db: DB): Promise<number> {
  try {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(staffTasks)
      .where(and(eq(staffTasks.status, 'open'), lte(staffTasks.dueOn, todayIso())));
    return r.n;
  } catch {
    return 0;
  }
}

/** Open tasks pinned to one record, for showing on that record's page. */
export async function tasksFor(db: DB, entity: string, entityId: string) {
  return db.select().from(staffTasks)
    .where(and(eq(staffTasks.entity, entity), eq(staffTasks.entityId, entityId), eq(staffTasks.status, 'open')))
    .orderBy(sql`${staffTasks.dueOn} asc nulls last`);
}
