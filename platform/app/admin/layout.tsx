import { atMostEvery, memo } from '@/lib/services/throttle';
import { lapseUnansweredRequests } from '@/lib/services/bookings';
import { lapseGroupRequests } from '@/lib/services/group-desk';
import { lapseRateRequests } from '@/lib/services/rate-requests';
import { AppShell, type NavItem } from '@/components/shell';
import { EnvBanner } from '@/components/env-banner';
import { SignOut } from '@/components/sign-out';
import { getDb, schema } from '@/lib/db';
import { inArray } from 'drizzle-orm';
import { requireStaff } from '@/lib/session';
import { ROLE_LABEL, type StaffRole } from '@/lib/services/actor';
import { operationalIssues } from '@/lib/services/metrics';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaff();
  // No scheduler yet: lapse unanswered hotel requests whenever the console loads.
  const db = await getDb();
  await atMostEvery('lapse-requests', 60_000, () => Promise.all([lapseUnansweredRequests(db), lapseGroupRequests(db), lapseRateRequests(db)]));
  const issues = await memo('admin-issues', 20_000, () => operationalIssues(db));
  // Best-rate requests waiting on us: new ones to ask hotels for, and hotel replies to check and send.
  const deskTodo = await memo('desk-todo', 15_000, async () => {
    const rows = await db.select({ id: schema.rateRequests.id, parentId: schema.rateRequests.parentId }).from(schema.rateRequests)
      .where(inArray(schema.rateRequests.status, ['review', 'hotel_quoted']));
    return new Set(rows.map((x) => x.parentId ?? x.id)).size;
  });
  const role = user.platformRole as StaffRole;
  // Each role sees its own work; admin sees everything.
  const ROLES: Record<string, StaffRole[]> = {
    '/admin/scenarios': ['admin', 'finance'],
    '/admin/ai': ['admin', 'ops', 'sales'],
    '/admin/tracker': ['admin', 'ops', 'finance'],
    '/admin/bookings': ['admin', 'ops', 'finance'],
    '/admin/groups': ['admin', 'ops', 'sales'],
    '/admin/rate-requests': ['admin', 'ops', 'sales'],
    '/admin/support': ['admin', 'ops'],
    '/admin/hotels': ['admin', 'ops', 'sales'],
    '/admin/rate-check': ['admin', 'sales'],
    '/admin/prospects': ['admin', 'sales', 'ops'],
    '/admin/suppliers': ['admin', 'ops'],
    '/admin/agencies': ['admin', 'ops', 'sales', 'finance'],
    '/admin/pricing': ['admin', 'finance'],
    '/admin/partners': ['admin', 'sales'],
    '/admin/audit': ['admin', 'finance'],
    '/admin/emails': ['admin', 'ops', 'sales'],
  };
  const all: NavItem[] = [
    { href: '/admin', label: 'Overview', icon: 'chart', badge: issues.filter((i) => i.severity === 'urgent').length, section: 'Business' },
    { href: '/admin/insights', label: 'Insights', icon: 'insights', section: 'Business' },
    { href: '/admin/ai', label: 'AI tools', icon: 'spark', section: 'Business' },
    { href: '/admin/scenarios', label: 'Scenario model', icon: 'overview', section: 'Business' },
    { href: '/admin/tracker', label: 'Arrivals & hotels', icon: 'compare', section: 'Operations' },
    { href: '/admin/bookings', label: 'Bookings', icon: 'bookings', section: 'Operations' },
    { href: '/admin/groups', label: 'Group Desk', icon: 'groups', section: 'Operations' },
    { href: '/admin/rate-requests', label: 'Best-rate requests', icon: 'spark', badge: deskTodo, section: 'Operations' },
    { href: '/admin/support', label: 'Support', icon: 'support', section: 'Operations' },
    { href: '/admin/prospects', label: 'Hotel outreach', icon: 'inbox', section: 'Portfolio' },
    { href: '/admin/hotels', label: 'Hotels & contracts', icon: 'hotels', section: 'Portfolio' },
    { href: '/admin/rate-check', label: 'Rate comparison', icon: 'compare', section: 'Portfolio' },
    { href: '/admin/suppliers', label: 'Suppliers', icon: 'plug', section: 'Portfolio' },
    { href: '/admin/agencies', label: 'Agencies', icon: 'agencies', section: 'Commercial' },
    { href: '/admin/pricing', label: 'Pricing & settings', icon: 'pricing', section: 'Commercial' },
    { href: '/admin/partners', label: 'Partner applications', icon: 'inbox', section: 'Commercial' },
    { href: '/admin/team', label: 'Team', icon: 'agencies', section: 'Governance' },
    { href: '/admin/emails', label: 'Emails', icon: 'inbox', section: 'Governance' },
    { href: '/admin/audit', label: 'Audit log', icon: 'audit', section: 'Governance' },
  ];
  const nav = all.filter((n) => !ROLES[n.href] || ROLES[n.href].includes(role));
  return (
    <AppShell nav={nav} banner={<EnvBanner />}
      actions={[
        { label: 'Agencies waiting for approval', href: '/admin/agencies?tab=pending', hint: 'approve verify kyc' },
        { label: 'Open Group Desk', href: '/admin/groups', hint: 'rfq enquiries' },
        { label: 'Hotels & contracts', href: '/admin/hotels', hint: 'add hotel rates' },
      ].filter((a) => nav.some((n) => n.href !== '/admin' && a.href.startsWith(n.href)))}
      context={<><p className="font-medium text-paper">HotelBridge</p><p className="mt-0.5">{ROLE_LABEL[role] ?? role}</p></>}
      user={<><p className="truncate text-paper/80">{user.name}</p><p className="truncate">{user.email}</p></>}
      signOut={<SignOut />}>
      {children}
    </AppShell>
  );
}
