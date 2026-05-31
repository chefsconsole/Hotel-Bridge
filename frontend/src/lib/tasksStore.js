// localStorage-backed tasks pipeline — daily follow-ups and reminders

const STORAGE_KEY = 'hotelbridge.tasks';

export function getTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTask(task) {
  const tasks = getTasks();
  const newTask = {
    id: `T-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    completed: false,
    completedAt: null,
    priority: 'medium', // low | medium | high
    dueDate: null,      // ISO date string or null
    relatedTo: '',      // free-text: "Hotel X" or "Operator Y"
    ...task,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newTask, ...tasks]));
  return newTask;
}

export function updateTask(id, patch) {
  const tasks = getTasks().map((t) => (t.id === id ? { ...t, ...patch } : t));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function deleteTask(id) {
  const tasks = getTasks().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export const PRIORITIES = {
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600 border-gray-200',   dot: 'bg-gray-400'  },
  medium: { label: 'Medium', color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500'  },
  high:   { label: 'High',   color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500'   },
};

export function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).setHours(23, 59, 59) < Date.now();
}

export function isDueToday(task) {
  if (!task.dueDate || task.completed) return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  return due.toDateString() === today.toDateString();
}
