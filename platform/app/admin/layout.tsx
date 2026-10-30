import { AppShell, type NavItem } from '@/components/shell';
import { EnvBanner } from '@/components/env-banner';
import { SignOut } from '@/components/sign-out';
import { getDb } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { operationalIssues } from '@/lib/services/metrics';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaff();
  const issues = await operationalIssues(await getDb());
  const nav: NavItem[] = [
    { href: '/admin', label: 'Overview', icon: 'chart', badge: issues.filter((i) => i.severity === 'urgent').length },
    { href: '/admin/bookings', label: 'Bookings', icon: 'bookings' },
    { href: '/admin/groups', label: 'Group Desk', icon: 'groups' },
    { href: '/admin/hotels', label: 'Hotels & contracts', icon: 'hotels' },
    { href: '/admin/agencies', label: 'Agencies', icon: 'agencies' },
    { href: '/admin/pricing', label: 'Pricing & settings', icon: 'pricing' },
    { href: '/admin/rate-check', label: 'Rate comparison', icon: 'compare' },
    { href: '/admin/suppliers', label: 'Suppliers', icon: 'plug' },
    { href: '/admin/scenarios', label: 'Scenario model', icon: 'overview' },
    { href: '/admin/partners', label: 'Partner applications', icon: 'inbox' },
    { href: '/admin/support', label: 'Support', icon: 'support' },
    { href: '/admin/audit', label: 'Audit log', icon: 'audit' },
  ];
  return (
    <AppShell nav={nav} banner={<EnvBanner />}
      context={<><p className="font-medium text-paper">HotelBridge operations</p><p className="mt-0.5 capitalize">{user.platformRole} access</p></>}
      user={<><p className="truncate text-paper/80">{user.name}</p><p className="truncate">{user.email}</p></>}
      signOut={<SignOut />}>
      {children}
    </AppShell>
  );
}
