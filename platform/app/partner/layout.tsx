import { lapseUnansweredRequests } from '@/lib/services/bookings';
import { eq } from 'drizzle-orm';
import { AppShell } from '@/components/shell';
import { EnvBanner } from '@/components/env-banner';
import { SignOut } from '@/components/sign-out';
import { getDb, schema } from '@/lib/db';
import { requirePartner } from '@/lib/session';

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePartner();
  // No scheduler yet: lapse unanswered requests before showing the hotel its list.
  await lapseUnansweredRequests(await getDb());
  const [h] = await (await getDb()).select().from(schema.hotels).where(eq(schema.hotels.id, user.partnerHotelId!));
  return (
    <AppShell nav={[{ href: '/partner', label: 'Reservations', icon: 'bookings' }]} banner={<EnvBanner />}
      context={<><p className="font-medium text-paper">{h?.name}</p><p className="mt-0.5">Hotel partner</p></>}
      user={<><p className="truncate text-paper/80">{user.name}</p><p className="truncate">{user.email}</p></>} signOut={<SignOut />}>
      {children}
    </AppShell>
  );
}
