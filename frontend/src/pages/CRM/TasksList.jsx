import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, AlertCircle, ListTodo, Calendar, Flame, Clock } from 'lucide-react';
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
    saveTask({
      title: title.trim(),
      relatedTo: relatedTo.trim(),
      priority,
      dueDate: dueDate || null,
    });
    setTitle(''); setRelatedTo(''); setDueDate(''); setPriority('medium');
    refresh();
    toast.success('Task added');
  };

  const toggle = (task) => {
    updateTask(task.id, {
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null,
    });
    refresh();
  };

  const remove = (id) => {
    deleteTask(id);
    refresh();
    toast.success('Task deleted');
  };

  // Counts
  const counts = {
    all: tasks.length,
    today: tasks.filter(isDueToday).length,
    overdue: tasks.filter(isOverdue).length,
    open: tasks.filter((t) => !t.completed).length,
    done: tasks.filter((t) => t.completed).length,
  };

  // Filter
  const filtered = tasks.filter((t) => {
    if (filter === 'today') return isDueToday(t);
    if (filter === 'overdue') return isOverdue(t);
    if (filter === 'open') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  // Sort: incomplete first, then by priority, then by due date
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Daily Driver</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">
            Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Follow-ups, renewals, and reminders — what you owe your hotels and operators.
          </p>
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-primary">{counts.open}</span> open · <span className="font-semibold text-primary">{counts.done}</span> done
        </div>
      </div>

      {/* Add Task form */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Add a task
        </div>
        <Input
          placeholder="What needs doing? (e.g. Follow up with Grand Hotel Europa)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 rounded-xl border-gray-200 focus:border-secondary text-sm"
        />
        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            placeholder="Related to (optional)"
            value={relatedTo}
            onChange={(e) => setRelatedTo(e.target.value)}
            className="h-11 rounded-xl border-gray-200 focus:border-secondary text-sm"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 focus:border-secondary focus:ring-1 focus:ring-secondary/20 bg-white text-sm px-3 outline-none"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 focus:border-secondary focus:ring-1 focus:ring-secondary/20 bg-white text-sm px-3 outline-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-5 py-2.5 rounded-xl btn-gold border-0 text-white font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40"
            data-cursor="link"
          >
            <Plus className="w-4 h-4" /> Add task
          </button>
        </div>
      </form>

      {/* Filter pills */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'all',     label: 'All',     icon: ListTodo,    accent: 'from-gray-500 to-gray-700' },
          { key: 'today',   label: 'Today',   icon: Calendar,    accent: 'from-blue-500 to-indigo-600' },
          { key: 'overdue', label: 'Overdue', icon: AlertCircle, accent: 'from-red-500 to-orange-600' },
          { key: 'open',    label: 'Open',    icon: Clock,       accent: 'from-purple-500 to-pink-500' },
          { key: 'done',    label: 'Done',    icon: CheckCircle2,accent: 'from-green-500 to-emerald-600' },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`bg-white rounded-2xl p-4 border flex items-center gap-3 text-left transition-all ${
                filter === f.key ? 'border-secondary shadow-md' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center shrink-0`}>
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

      {/* List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <ListTodo className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No tasks yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Add follow-ups, renewals, and reminders above to build your daily driver list.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-sm text-gray-500">No tasks match this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {sorted.map((task) => {
            const p = PRIORITIES[task.priority] || PRIORITIES.medium;
            const overdue = isOverdue(task);
            const today = isDueToday(task);
            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 p-4 border-b border-gray-50 last:border-0 transition-colors ${
                  task.completed ? 'bg-gray-50/50' : 'hover:bg-secondary/5'
                }`}
              >
                <button
                  onClick={() => toggle(task)}
                  className="shrink-0 mt-0.5"
                  aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 hover:text-secondary transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-primary'}`}>
                    {task.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.color}`}>
                      {task.priority === 'high' && <Flame className="w-2.5 h-2.5" />}
                      {p.label}
                    </span>
                    {task.dueDate && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        overdue ? 'bg-red-50 text-red-700 border-red-200' :
                        today   ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        <Calendar className="w-2.5 h-2.5" />
                        {overdue ? 'Overdue · ' : ''}{formatDue(task.dueDate)}
                      </span>
                    )}
                    {task.relatedTo && (
                      <span className="text-xs text-gray-500 truncate">
                        · {task.relatedTo}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => remove(task.id)}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-red-600 flex items-center justify-center transition-all shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TasksList;
