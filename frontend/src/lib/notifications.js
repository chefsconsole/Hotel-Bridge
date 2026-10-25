// One live "needs attention" feed, aggregated across the CRM.
// Powers the top-bar bell, the sidebar badges, and the dashboard.
import { getInvoices, daysOverdue } from './invoicesStore';
import { getTasks, isOverdue as taskOverdue, isDueToday } from './tasksStore';
import { getRequirements } from './requirementsStore';
import { getLeads } from './leadsStore';

const STALE_DAYS = 3;
const SEEN_KEY = 'hotelbridge.notif.seenAt';

const balanceOf = (inv) =>
  Math.max(0, (inv.total || 0) - (inv.status === 'paid' ? (inv.total || 0) : (Number(inv.amountPaid) || 0)));

// → [{ id, kind, urgent, title, sub, link, ts }]  (urgent first, then newest)
export function getNotifications() {
  const items = [];

  getInvoices().forEach((inv) => {
    const d = daysOverdue(inv);
    const bal = balanceOf(inv);
    if (d > 0 && bal > 0) {
      items.push({
        id: `inv-${inv.id}`, kind: 'invoice', urgent: true,
        title: `Invoice ${inv.number} overdue`,
        sub: `${inv.billTo?.company || inv.billTo?.name || 'Hotel'} · ${d} day${d > 1 ? 's' : ''} · ${inv.currency || '€'}${(bal).toLocaleString()}`,
        link: '/crm/invoices', ts: inv.dueDate || inv.createdAt,
      });
    }
  });

  getTasks().forEach((t) => {
    if (t.completed) return;
    const over = taskOverdue(t);
    const today = isDueToday(t);
    if (over || today) {
      items.push({
        id: `task-${t.id}`, kind: 'task', urgent: over,
        title: t.title,
        sub: over ? 'Task overdue' : 'Due today',
        link: '/crm/tasks', ts: t.dueDate || t.createdAt,
      });
    }
  });

  getRequirements().forEach((r) => {
    const active = ['new', 'sourcing'].includes(r.status);
    const noOffers = !((r.offers || []).length);
    const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 864e5;
    if (active && (noOffers || ageDays > STALE_DAYS)) {
      items.push({
        id: `rfq-${r.id}`, kind: 'rfq', urgent: false,
        title: `${r.ref || 'RFQ'} needs sourcing`,
        sub: [r.groupName, r.destination].filter(Boolean).join(' · ') || 'Awaiting hotel offers',
        link: '/crm/requirements', ts: r.createdAt,
      });
    }
  });

  getLeads().forEach((l) => {
    if (l.status === 'new') {
      items.push({
        id: `lead-${l.id}`, kind: 'lead', urgent: false,
        title: `New lead — ${l.name || l.company || 'Enquiry'}`,
        sub: [l.company, l.reason].filter(Boolean).join(' · ') || l.email || 'Contact form',
        link: '/crm/leads', ts: l.createdAt,
      });
    }
  });

  items.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || new Date(b.ts || 0) - new Date(a.ts || 0));
  return items;
}

export function notificationCount() {
  return getNotifications().length;
}

// "unseen" = items newer than the last time the bell was opened
export function getSeenAt() {
  try { return localStorage.getItem(SEEN_KEY) || ''; } catch { return ''; }
}
export function markSeen() {
  try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* ignore */ }
}
export function unseenCount() {
  const s = getSeenAt();
  const t = s ? new Date(s).getTime() : 0;
  return getNotifications().filter((n) => new Date(n.ts || 0).getTime() > t).length;
}

export function relTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export const NOTIF_KIND = {
  invoice: { label: 'Invoice', icon: 'Receipt', tint: 'bg-red-50 text-red-600',    ring: 'ring-red-100' },
  task:    { label: 'Task',    icon: 'ListTodo', tint: 'bg-blue-50 text-blue-600',  ring: 'ring-blue-100' },
  rfq:     { label: 'RFQ',     icon: 'ClipboardList', tint: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
  lead:    { label: 'Lead',    icon: 'Inbox',   tint: 'bg-green-50 text-green-600', ring: 'ring-green-100' },
};
