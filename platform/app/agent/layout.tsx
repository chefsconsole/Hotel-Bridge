import { atMostEvery } from '@/lib/services/throttle';
import Link from 'next/link';
import { lapseUnansweredRequests } from '@/lib/services/bookings';
import { lapseRateRequests } from '@/lib/services/rate-requests';
import { and, eq, inArray, lte, notInArray, sql } from 'drizzle-orm';
import { todayIso } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { walletBalances } from '@/lib/services/ledger';
import { AppShell, type NavItem } from '@/components/shell';
import { EnvBanner } from '@/components/env-banner';
import { SignOut } from '@/components/sign-out';
import { getDb, schema } from '@/lib/db';
import { requireAgent } from '@/lib/session';

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, agency } = await requireAgent();
  const db = await getDb();
  // Keeps statuses honest without slowing every click (the daily cron is the backstop).
  await atMostEvery('lapse-requests-agent', 60_000, () => Promise.all([lapseUnansweredRequests(db), lapseRateRequests(db)]));
  const [[{ n: rates }], [{ n: pending }], [{ n: followUps }], balances] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.rateRequests)
      .where(and(eq(schema.rateRequests.agencyId, agency.id), eq(schema.rateRequests.status, 'quoted'))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings)
      .where(and(eq(schema.bookings.agencyId, agency.id), inArray(schema.bookings.status, ['awaiting_payment', 'pending_confirmation', 'outcome_unknown']))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.trips)
      .where(and(eq(schema.trips.agencyId, agency.id), lte(schema.trips.followUpOn, todayIso()), notInArray(schema.trips.status, ['completed', 'cancelled']))),
    walletBalances(db, agency.id),
  ]);
  const wallet = balances.filter((w) => w.minor > 0);
  const nav: NavItem[] = [
    { href: '/agent', label: 'Today', icon: 'overview', section: 'Book' },
    { href: '/agent/search', label: 'Search hotels', icon: 'search', section: 'Book' },
    { href: '/agent/rate-requests', label: 'Best-rate requests', icon: 'spark', badge: rates, section: 'Book' },
    { href: '/agent/groups', label: 'Group Desk', icon: 'groups', section: 'Book' },
    { href: '/agent/saved', label: 'Saved hotels', icon: 'saved', section: 'Book' },
    { href: '/agent/trips', label: 'Client trips', icon: 'trips', badge: followUps, section: 'Sell' },
    { href: '/agent/clients', label: 'Clients', icon: 'profile', section: 'Sell' },
    { href: '/agent/bookings', label: 'My bookings', icon: 'bookings', badge: pending, section: 'Manage' },
    { href: '/agent/finance', label: 'Invoices & payments', icon: 'finance', section: 'Manage' },
    { href: '/agent/insights', label: 'Insights', icon: 'insights', section: 'Manage' },
    { href: '/agent/ai', label: 'AI assistant', icon: 'spark', section: 'Tools' },
    { href: '/agent/profile', label: 'Agency profile', icon: 'profile', section: 'Account' },
    { href: '/agent/support', label: 'Support', icon: 'support', section: 'Account' },
  ];
  const tabs: NavItem[] = [
    { href: '/agent', label: 'Today', icon: 'overview' },
    { href: '/agent/search', label: 'Search', icon: 'search' },
    { href: '/agent/rate-requests', label: 'Best rates', icon: 'spark', badge: rates },
    { href: '/agent/trips', label: 'Clients', icon: 'trips', badge: followUps },
    { href: '/agent/bookings', label: 'Bookings', icon: 'bookings', badge: pending },
  ];
  return (
    <AppShell
      nav={nav}
      tabs={tabs}
      actions={[
        { label: 'Search hotels', href: '/agent/search', hint: 'book find rates' },
        { label: 'Paste a group enquiry', href: '/agent/groups/new', hint: 'new group request mice wedding' },
        { label: 'New client trip', href: '/agent/trips/new', hint: 'quote proposal' },
        { label: 'Compare saved hotels', href: '/agent/saved', hint: 'side by side shortlist' },
      ]}
      banner={<>
        <EnvBanner />
        {agency.status !== 'verified' && (
          <div className="border-b border-[#ecd9b5] bg-pending-bg px-4 py-2.5 text-center text-[0.84rem] text-pending">
            {agency.status === 'pending'
              ? <>Your agency is waiting for approval. You can search, quote and build client trips now — booking opens once we approve you. <Link href="/agent/profile#kyc" className="font-semibold underline underline-offset-2">Check your documents</Link></>
              : <>Your agency account is {agency.status}. Contact HotelBridge support.</>}
          </div>
        )}
      </>}
      context={<>
        <p className="truncate font-medium text-paper">{agency.name}</p>
        <p className="mt-0.5 capitalize">{agency.status === 'verified' ? 'Verified agency' : agency.status === 'pending' ? 'Verification pending' : agency.status}</p>
        {wallet.length > 0 && <Link href="/agent/finance#wallet" className="mt-2 flex items-center justify-between rounded-[var(--radius-sm)] bg-paper/[0.06] px-2.5 py-1.5 text-paper/80 hover:bg-paper/[0.1]"><span>Wallet</span><span className="num font-medium text-champagne">{wallet.map((w) => formatMoney(w.minor, w.currency, { compact: true })).join(' · ')}</span></Link>}
      </>}
      user={<><p className="truncate text-paper/80">{user.name}</p><p className="truncate">{user.email}</p></>}
      signOut={<SignOut />}
    >
      {children}
    </AppShell>
  );
}
