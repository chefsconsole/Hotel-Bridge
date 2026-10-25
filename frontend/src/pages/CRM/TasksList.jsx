import { useState, useEffect } from 'react';
import {
  CheckCircle2, Circle, Plus, Trash2, AlertCircle, ListTodo,
  Calendar, Flame, Clock, Sparkles, ChevronDown, Sun, Inbox,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  getTasks, saveTask, updateTask, deleteTask,
  PRIORITIES, isOverdue, isDueToday,
} from '../../lib/tasksStore';

const formatDue = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const isFuture = (t) => {
  if (!t.dueDate || t.completed) return false;
  return !isOverdue(t) && !isDueToday(t);
};
const priorityOrder = { high: 0, medium: 1, low: 2 };
const sortTasks = (list) => [...list].sort((a, b) => {
  const p = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (p !== 0) return p;
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
});

function TaskRow({ task, onToggle, onRemove }) {
  const p = PRIORITIES[task.priority] || PRIORITIES.medium;
  const overdue = isOverdue(task);
  const today = isDueToday(task);
  return (
    <div className={`group flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 transition-colors ${task.completed ? 'bg-gray-50/40' : 'hover:bg-secondary/5'}`}>
      <button onClick={() => onToggle(task)} className="shrink-0 mt-0.5 active:scale-90 transition-transform" aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}>
        {task.completed
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5 text-gray-300 hover:text-secondary transition-colors" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-primary'}`}>{task.title}</div>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.color}`}>
            {task.priority === 'high' && <Flame className="w-2.5 h-2.5" />}{p.label}
          </span>
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              overdue ? 'bg-red-50 text-red-700 border-red-200' : today ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              <Calendar className="w-2.5 h-2.5" />{overdue ? 'Overdue · ' : ''}{formatDue(task.dueDate)}
            </span>
          )}
          {task.relatedTo && <span className="text-xs text-gray-500 truncate">· {task.relatedTo}</span>}
        </div>
      </div>
      <button onClick={() => onRemove(task.id)} className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-red-600 flex items-center justify-center transition-all shrink-0" aria-label="Delete">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Section({ title, icon: Icon, accent, tone, tasks, onToggle, onRemove, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!tasks.length) return null;
  return (
    <div className="card-lux overflow-hidden lux-rise">
      <button
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-5 py-3 ${collapsible ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'} transition-colors`}
      >
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shrink-0 shadow ring-1 ring-white/30`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className={`font-serif font-bold ${tone || 'text-primary'}`}>{title}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tasks.length}</span>
        {collapsible && <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (
        <div className="border-t border-gray-100">
          {sortTasks(tasks).map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onRemove={onRemove} />)}
        </div>
      )}
    </div>
  );
}

export const TasksList = () => {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [relatedTo, setRelatedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState('all'); // all | today | overdue | open | done

  const refresh = () => setTasks(getTasks());
  useEffect(() => { refresh(); }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveTask({ title: title.trim(), relatedTo: relatedTo.trim(), priority, dueDate: dueDate || null });
    setTitle(''); setRelatedTo(''); setDueDate(''); setPriority('medium');
    refresh();
    toast.success('Task added');
  };
  const toggle = (task) => {
    updateTask(task.id, { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null });
    refresh();
    if (!task.completed) toast.success('Done ✓');
  };
  const remove = (id) => { deleteTask(id); refresh(); toast.success('Task deleted'); };

  const groups = {
    overdue: tasks.filter(isOverdue),
    today: tasks.filter(isDueToday),
    upcoming: tasks.filter(isFuture),
    someday: tasks.filter((t) => !t.completed && !t.dueDate),
    done: tasks.filter((t) => t.completed),
  };
  const counts = {
    all: tasks.length,
    today: groups.today.length,
    overdue: groups.overdue.length,
    open: tasks.filter((t) => !t.completed).length,
    done: groups.done.length,
  };
  const needToday = groups.overdue.length + groups.today.length;
  const doneToday = groups.done.filter((t) => t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length;

  // Specific filter → flat list; otherwise grouped daily-driver view
  const flat = filter === 'today' ? groups.today
    : filter === 'overdue' ? groups.overdue
    : filter === 'open' ? tasks.filter((t) => !t.completed)
    : filter === 'done' ? groups.done
    : null;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="eyebrow mb-2">Daily Driver</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">Tasks</h1>
          <p className="text-sm text-gray-500 mt-2">
            {needToday > 0
              ? <>You have <span className="font-semibold text-primary">{needToday}</span> task{needToday > 1 ? 's' : ''} that need you today.</>
              : <>Nothing pressing today — you're ahead. 🎯</>}
            {doneToday > 0 && <> · <span className="font-semibold text-green-600">{doneToday} done</span> today.</>}
          </p>
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-primary">{counts.open}</span> open · <span className="font-semibold text-primary">{counts.done}</span> done
        </div>
      </div>

      {/* Quick add */}
      <form onSubmit={handleAdd} className="card-lux p-5 space-y-3">
        <div className="eyebrow flex items-center gap-1.5 text-gray-400"><Plus className="w-3 h-3" /> Add a task</div>
        <Input placeholder="What needs doing? (e.g. Follow up with Grand Hotel Europa)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl border-gray-200 focus:border-secondary text-sm bg-white" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Related to (optional)" value={relatedTo} onChange={(e) => setRelatedTo(e.target.value)} className="h-11 rounded-xl border-gray-200 focus:border-secondary text-sm bg-white" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-11 rounded-xl border border-gray-200 focus:border-secondary bg-white text-sm px-3 outline-none">
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11 rounded-xl border border-gray-200 focus:border-secondary bg-white text-sm px-3 outline-none" />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={!title.trim()} className="px-5 py-2.5 rounded-xl btn-gold border-0 text-white font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40">
            <Plus className="w-4 h-4" /> Add task
          </button>
        </div>
      </form>

      {/* Stat tiles / filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lux-stagger">
        {[
          { key: 'all',     label: 'All',     icon: ListTodo,     accent: 'from-gray-500 to-gray-700' },
          { key: 'today',   label: 'Today',   icon: Calendar,     accent: 'from-blue-500 to-indigo-600' },
          { key: 'overdue', label: 'Overdue', icon: AlertCircle,  accent: 'from-red-500 to-orange-600' },
          { key: 'open',    label: 'Open',    icon: Clock,        accent: 'from-purple-500 to-pink-500' },
          { key: 'done',    label: 'Done',    icon: CheckCircle2, accent: 'from-green-500 to-emerald-600' },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`card-lux ${filter === f.key ? 'card-lux-hover ring-2 ring-secondary/40' : 'card-lux-hover'} p-4 flex items-center gap-3 text-left`}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center shrink-0 shadow ring-1 ring-white/30`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{f.label}</div>
                <div className="text-xl font-serif font-bold text-primary tabular-nums">{counts[f.key]}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Body */}
      {tasks.length === 0 ? (
        <div className="card-lux p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <ListTodo className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No tasks yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Add follow-ups, renewals, and reminders above to build your daily driver list.</p>
        </div>
      ) : flat ? (
        flat.length === 0 ? (
          <div className="card-lux p-12 text-center"><p className="text-sm text-gray-500">Nothing here — nice.</p></div>
        ) : (
          <div className="card-lux overflow-hidden">
            {sortTasks(flat).map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />)}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <Section title="Overdue"  icon={AlertCircle} accent="from-red-500 to-orange-600"   tone="text-red-600" tasks={groups.overdue} onToggle={toggle} onRemove={remove} />
          <Section title="Today"    icon={Sun}         accent="from-amber-500 to-yellow-500" tasks={groups.today} onToggle={toggle} onRemove={remove} />
          <Section title="Upcoming" icon={Calendar}    accent="from-blue-500 to-indigo-600"  tasks={groups.upcoming} onToggle={toggle} onRemove={remove} />
          <Section title="Someday"  icon={Inbox}       accent="from-gray-400 to-gray-600"    tasks={groups.someday} onToggle={toggle} onRemove={remove} />
          <Section title="Completed" icon={CheckCircle2} accent="from-green-500 to-emerald-600" tasks={groups.done} onToggle={toggle} onRemove={remove} collapsible defaultOpen={false} />
          {needToday === 0 && groups.upcoming.length === 0 && groups.someday.length === 0 && groups.done.length > 0 && (
            <div className="card-lux p-10 text-center">
              <Sparkles className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="font-serif font-bold text-primary">Inbox zero. Beautifully done.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TasksList;
