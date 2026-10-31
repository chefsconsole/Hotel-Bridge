import { lapseUnansweredRequests } from '@/lib/services/bookings';
import { AppShell, type NavItem } from '@/components/shell';
import { EnvBanner } from '@/components/env-banner';
import { SignOut } from '@/components/sign-out';
import { getDb } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { ROLE_LABEL, type StaffRole } from '@/lib/services/actor';
import { operationalIssues } from '@/lib/services/metrics';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaff();
  // No scheduler yet: lapse unanswered hotel requests whenever the console loads.
  await lapseUnansweredRequests(await getDb());
  const issues = await operationalIssues(await getDb());
  const role = user.platformRole as StaffRole;
  // Each role sees its own work; admin sees everything.
  const ROLES: Record<string, StaffRole[]> = {
    '/admin/scenarios': ['admin', 'finance'],
    '/admin/ai': ['admin', 'ops', 'sales'],
    '/admin/tracker': ['admin', 'ops', 'finance'],
    '/admin/bookings': ['admin', 'ops', 'finance'],
    '/admin/groups': ['admin', 'ops', 'sales'],
    '/admin/support': ['admin', 'ops'],
    '/admin/hotels': ['admin', 'ops', 'sales'],
    '/admin/rate-check': ['admin', 'sales'],
    '/admin/suppliers': ['admin', 'ops'],
    '/admin/agencies': ['admin', 'ops', 'sales', 'finance'],
    '/admin/pricing': ['admin', 'finance'],
    '/admin/partners': ['admin', 'sales'],
    '/admin/audit': ['admin', 'finance'],
  };
  const all: NavItem[] = [
    { href: '/admin', label: 'Overview', icon: 'chart', badge: issues.filter((i) => i.severity === 'urgent').length, section: 'Business' },
    { href: '/admin/insights', label: 'Insights', icon: 'insights', section: 'Business' },
    { href: '/admin/ai', label: 'AI tools', icon: 'spark', section: 'Business' },
    { href: '/admin/scenarios', label: 'Scenario model', icon: 'overview', section: 'Business' },
    { href: '/admin/tracker', label: 'Arrivals & hotels', icon: 'compare', section: 'Operations' },
    { href: '/admin/bookings', label: 'Bookings', icon: 'bookings', section: 'Operations' },
    { href: '/admin/groups', label: 'Group Desk', icon: 'groups', section: 'Operations' },
    { href: '/admin/support', label: 'Support', icon: 'support', section: 'Operations' },
    { href: '/admin/hotels', label: 'Hotels & contracts', icon: 'hotels', section: 'Portfolio' },
    { href: '/admin/rate-check', label: 'Rate comparison', icon: 'compare', section: 'Portfolio' },
    { href: '/admin/suppliers', label: 'Suppliers', icon: 'plug', section: 'Portfolio' },
    { href: '/admin/agencies', label: 'Agencies', icon: 'agencies', section: 'Commercial' },
    { href: '/admin/pricing', label: 'Pricing & settings', icon: 'pricing', section: 'Commercial' },
    { href: '/admin/partners', label: 'Partner applications', icon: 'inbox', section: 'Commercial' },
    { href: '/admin/team', label: 'Team', icon: 'agencies', section: 'Governance' },
    { href: '/admin/audit', label: 'Audit log', icon: 'audit', section: 'Governance' },
  ];
  const nav = all.filter((n) => !ROLES[n.href] || ROLES[n.href].includes(role));
  return (
    <AppShell nav={nav} banner={<EnvBanner />}
      context={<><p className="font-medium text-paper">HotelBridge</p><p className="mt-0.5">{ROLE_LABEL[role] ?? role}</p></>}
      user={<><p className="truncate text-paper/80">{user.name}</p><p className="truncate">{user.email}</p></>}
      signOut={<SignOut />}>
      {children}
    </AppShell>
  );
}
