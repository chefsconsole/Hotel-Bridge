import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { Empty, HotelVisual, LinkButton, PageHeader, SampleTag } from '@/components/ui';
import { toggleSavedAction } from '@/app/actions/agent';
import { getDb, schema } from '@/lib/db';
import { requireAgent } from '@/lib/session';

export const metadata = { title: 'Saved hotels' };

export default async function SavedPage() {
  const { actor } = await requireAgent();
  const db = await getDb();
  const rows = await db.select({ h: schema.hotels }).from(schema.savedHotels)
    .innerJoin(schema.hotels, eq(schema.hotels.id, schema.savedHotels.hotelId)).where(eq(schema.savedHotels.userId, actor.userId));
  return (
    <>
      <PageHeader eyebrow="Shortlist" title="Saved hotels" />
      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface"><Empty title="Nothing saved yet" action={<LinkButton href="/agent/search" size="sm">Search hotels</LinkButton>}>Save hotels you use often to find them quickly.</Empty></div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ h }) => (
            <li key={h.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              <HotelVisual hotel={h} size="sm" className="h-36" />
              <div className="p-4">
                <div className="flex items-center gap-2"><Link href={`/agent/hotels/${h.id}`} className="font-semibold hover:underline">{h.name}</Link>{h.isSample && <SampleTag />}</div>
                <p className="text-[0.82rem] text-muted">{h.city}, {h.country}</p>
                <form action={toggleSavedAction} className="mt-3"><input type="hidden" name="hotelId" value={h.id} /><button className="text-[0.8rem] text-muted underline">Remove</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
