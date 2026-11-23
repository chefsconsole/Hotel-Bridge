/* The team's task queue.
 *
 * The queue exists so the work a person decided to do has somewhere to live.
 * The rule that matters most is the one these tests guard: a task is the
 * team's, not an agency's, and an agent must never be able to touch one.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { assignTask, createTask, listTasks, overdueTaskCount, setTaskStatus, taskStats, tasksFor, updateTask } from '@/lib/services/tasks';
import { addDays } from '@/lib/domain/dates';
import { setup, type Fixture } from './helpers';

let f: Fixture;
afterEach(async () => { await f?.close(); });

describe('staff tasks', () => {
  it('adds a task, assigns it, closes it and reopens it', async () => {
    f = await setup();
    const t = await createTask(f.db, f.ADMIN, { title: 'Call Piyarat about VAT on the Patong rates', dueOn: f.today, priority: 'high' });
    expect(t.status).toBe('open');
    expect(t.assignedTo).toBeNull();
    expect(t.createdBy).toBe(f.ADMIN.userId);

    const taken = await assignTask(f.db, f.ADMIN, t.id, f.ADMIN.userId);
    expect(taken.assignedTo).toBe(f.ADMIN.userId);

    const done = await setTaskStatus(f.db, f.ADMIN, t.id, 'done');
    expect(done.status).toBe('done');
    expect(done.completedBy).toBe(f.ADMIN.userId);
    expect(done.completedAt).toBeInstanceOf(Date);
    // Closed work leaves the open queue.
    expect(await listTasks(f.db, { status: 'open' })).toHaveLength(0);

    const again = await setTaskStatus(f.db, f.ADMIN, t.id, 'open');
    expect(again.status).toBe('open');
    // Reopening clears the completion, or the row would claim to be both.
    expect(again.completedAt).toBeNull();
    expect(again.completedBy).toBeNull();
  });

  it('never lets an agent read or write the team’s tasks', async () => {
    f = await setup();
    await expect(createTask(f.db, f.A, { title: 'Agent should not be able to do this' })).rejects.toThrow();
    const t = await createTask(f.db, f.ADMIN, { title: 'Internal: chase Mercure registration number' });
    await expect(setTaskStatus(f.db, f.A, t.id, 'done')).rejects.toThrow();
    await expect(assignTask(f.db, f.A, t.id, f.A.userId)).rejects.toThrow();
    await expect(updateTask(f.db, f.A, t.id, { title: 'Renamed by an agent' })).rejects.toThrow();
  });

  it('refuses a task with no real title', async () => {
    f = await setup();
    await expect(createTask(f.db, f.ADMIN, { title: 'ok' })).rejects.toThrow(/at least 3/);
    await expect(createTask(f.db, f.ADMIN, { title: '   ' })).rejects.toThrow();
  });

  it('refuses a bad due date rather than silently dropping it', async () => {
    f = await setup();
    await expect(createTask(f.db, f.ADMIN, { title: 'Send the Patong countersignature', dueOn: '31/12/2026' })).rejects.toThrow(/real date/);
    await expect(createTask(f.db, f.ADMIN, { title: 'Send the Patong countersignature', dueOn: '2026-02-30' })).rejects.toThrow(/real date/);
  });

  it('refuses half a link to a record', async () => {
    f = await setup();
    // A task pinned to "booking" with no id would render a link to nowhere.
    await expect(createTask(f.db, f.ADMIN, { title: 'Chase this booking', entity: 'booking' })).rejects.toThrow(/both the kind and its id/);
    await expect(createTask(f.db, f.ADMIN, { title: 'Chase this booking', entityId: f.hotel.id })).rejects.toThrow(/both the kind and its id/);
  });

  it('pins a task to the record it is about', async () => {
    f = await setup();
    await createTask(f.db, f.ADMIN, { title: 'Confirm VAT treatment before countersigning', entity: 'hotel', entityId: f.hotel.id });
    const pinned = await tasksFor(f.db, 'hotel', f.hotel.id);
    expect(pinned.map((x) => x.title)).toEqual(['Confirm VAT treatment before countersigning']);
    // Another record's page must not show it.
    expect(await tasksFor(f.db, 'hotel', f.agencyA.id)).toHaveLength(0);
  });

  it('counts what is due without counting what is closed', async () => {
    f = await setup();
    const yesterday = addDays(f.today, -1);
    const nextWeek = addDays(f.today, 3);
    await createTask(f.db, f.ADMIN, { title: 'Overdue: send the rate sheet', dueOn: yesterday, assignedTo: f.ADMIN.userId });
    await createTask(f.db, f.ADMIN, { title: 'Due today: call the hotel', dueOn: f.today });
    await createTask(f.db, f.ADMIN, { title: 'Soon: prepare the proposal', dueOn: nextWeek });
    await createTask(f.db, f.ADMIN, { title: 'No date: tidy the contract folder' });
    const closed = await createTask(f.db, f.ADMIN, { title: 'Already handled, due yesterday', dueOn: yesterday });
    await setTaskStatus(f.db, f.ADMIN, closed.id, 'done');

    const s = await taskStats(f.db, f.ADMIN.userId);
    expect(s).toMatchObject({ open: 4, overdue: 1, today: 1, soon: 1, undated: 1, unassigned: 3, mine: 1, mineOverdue: 1, doneThisWeek: 1 });
    // The Overview badge: due today or earlier, open only. The done one is excluded.
    expect(await overdueTaskCount(f.db)).toBe(2);
  });

  it('a cancelled task leaves the queue but is not counted as done', async () => {
    f = await setup();
    const t = await createTask(f.db, f.ADMIN, { title: 'Chase the SureStay promo rates', dueOn: f.today });
    await setTaskStatus(f.db, f.ADMIN, t.id, 'cancelled');
    expect(await overdueTaskCount(f.db)).toBe(0);
    const s = await taskStats(f.db, f.ADMIN.userId);
    expect(s.open).toBe(0);
    expect(s.doneThisWeek).toBe(0);
    expect((await listTasks(f.db, { status: 'cancelled' })).map((x) => x.id)).toEqual([t.id]);
  });

  it('orders dated work first, oldest due date at the top, undated below', async () => {
    f = await setup();
    await createTask(f.db, f.ADMIN, { title: 'Undated' });
    await createTask(f.db, f.ADMIN, { title: 'In three days', dueOn: addDays(f.today, 3) });
    await createTask(f.db, f.ADMIN, { title: 'Yesterday', dueOn: addDays(f.today, -1) });
    await createTask(f.db, f.ADMIN, { title: 'Today, low', dueOn: f.today, priority: 'low' });
    await createTask(f.db, f.ADMIN, { title: 'Today, high', dueOn: f.today, priority: 'high' });
    const titles = (await listTasks(f.db)).map((t) => t.title);
    expect(titles).toEqual(['Yesterday', 'Today, high', 'Today, low', 'In three days', 'Undated']);
  });

  it('filters by owner, by unassigned and by what is due', async () => {
    f = await setup();
    const mine = await createTask(f.db, f.ADMIN, { title: 'Mine and overdue', dueOn: addDays(f.today, -2), assignedTo: f.ADMIN.userId });
    await createTask(f.db, f.ADMIN, { title: 'Nobody’s, not yet due', dueOn: addDays(f.today, 10) });
    expect((await listTasks(f.db, { ownerId: f.ADMIN.userId })).map((t) => t.id)).toEqual([mine.id]);
    expect((await listTasks(f.db, { unassigned: true })).map((t) => t.title)).toEqual(['Nobody’s, not yet due']);
    expect((await listTasks(f.db, { due: true })).map((t) => t.id)).toEqual([mine.id]);
    // An undated task is never "due" — it has no date to be past.
    await createTask(f.db, f.ADMIN, { title: 'Undated, so never due' });
    expect((await listTasks(f.db, { due: true })).map((t) => t.id)).toEqual([mine.id]);
  });

  it('shows who a task belongs to and who added it', async () => {
    f = await setup();
    await createTask(f.db, f.ADMIN, { title: 'Reconcile the November commissions', assignedTo: f.ADMIN.userId });
    const [t] = await listTasks(f.db);
    expect(t.assigneeName).toBe('Admin');
    expect(t.createdByName).toBe('Admin');
  });

  it('hands a task back to the queue', async () => {
    f = await setup();
    const t = await createTask(f.db, f.ADMIN, { title: 'Whoever gets to it first', assignedTo: f.ADMIN.userId });
    const back = await assignTask(f.db, f.ADMIN, t.id, null);
    expect(back.assignedTo).toBeNull();
    expect((await listTasks(f.db, { unassigned: true })).map((x) => x.id)).toEqual([t.id]);
  });
});
