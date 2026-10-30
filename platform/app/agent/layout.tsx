import { and, eq, inArray, sql } from 'drizzle-orm';
import { AppShell, type NavItem } from '@/components/shell';
import { EnvBanner } from '@/components/env-banner';
import { SignOut } from '@/components/sign-out';
import { getDb, schema } from '@/lib/db';
import { requireAgent } from '@/lib/session';

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, agency } = await requireAgent();
  const db = await getDb();
  const [{ n: pending }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings)
    .where(and(eq(schema.bookings.agencyId, agency.id), inArray(schema.bookings.status, ['awaiting_payment', 'pending_confirmation', 'outcome_unknown'])));
  const nav: NavItem[] = [
    { href: '/agent', label: 'Overview', icon: 'overview', section: 'Book' },
    { href: '/agent/search', label: 'Search hotels', icon: 'search', section: 'Book' },
    { href: '/agent/groups', label: 'Group Desk', icon: 'groups', section: 'Book' },
    { href: '/agent/saved', label: 'Saved hotels', icon: 'saved', section: 'Book' },
    { href: '/agent/bookings', label: 'My bookings', icon: 'bookings', badge: pending, section: 'Manage' },
    { href: '/agent/finance', label: 'Invoices & payments', icon: 'finance', section: 'Manage' },
    { href: '/agent/insights', label: 'Insights', icon: 'insights', section: 'Manage' },
    { href: '/agent/ai', label: 'AI assistant', icon: 'spark', section: 'Tools' },
    { href: '/agent/profile', label: 'Agency profile', icon: 'profile', section: 'Account' },
    { href: '/agent/support', label: 'Support', icon: 'support', section: 'Account' },
  ];
  return (
    <AppShell
      nav={nav}
      banner={<EnvBanner />}
      context={<>
        <p className="truncate font-medium text-paper">{agency.name}</p>
        <p className="mt-0.5 capitalize">{agency.status === 'verified' ? 'Verified agency' : agency.status === 'pending' ? 'Verification pending' : agency.status}</p>
      </>}
      user={<><p className="truncate text-paper/80">{user.name}</p><p className="truncate">{user.email}</p></>}
      signOut={<SignOut />}
    >
      {children}
    </AppShell>
  );
}
