import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { OfferList } from '@/components/offers';
import { DL, Empty, HotelVisual, Notice, Panel, SampleTag } from '@/components/ui';
import { toggleSavedAction } from '@/app/actions/agent';
import { getDb, schema } from '@/lib/db';
import { daysBetween, formatDate } from '@/lib/domain/dates';
import { decodeRooms, describeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { searchHotels, searchSchema } from '@/lib/services/search';
import { COLLECTIONS } from '@/lib/services/catalog';

export default async function HotelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ in?: string; out?: string; rooms?: string }> }) {
  const { actor } = await requireAgent();
  const { id } = await params;
  const sp = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = await getDb();
  const [hotel] = await db.select().from(schema.hotels).where(and(eq(schema.hotels.id, id), eq(schema.hotels.status, 'active')));
  if (!hotel) notFound();
  const rooms = await db.select().from(schema.roomTypes).where(and(eq(schema.roomTypes.hotelId, id), eq(schema.roomTypes.active, true)));
  const [saved] = await db.select().from(schema.savedHotels).where(and(eq(schema.savedHotels.userId, actor.userId), eq(schema.savedHotels.hotelId, id)));

  let offersBlock: React.ReactNode = <Notice>Search with your dates and rooms to see prices for this hotel.</Notice>;
  const stay = { city: hotel.city, checkIn: sp.in ?? '', checkOut: sp.out ?? '', rooms: decodeRooms(sp.rooms) };
  const parsed = searchSchema.safeParse(stay);
  if (sp.in && sp.out && parsed.success) {
    const { results } = await searchHotels(db, actor, parsed.data, { log: false });
    const mine = results.find((r) => r.hotel.id === id);
    offersBlock = mine
      ? <OfferList offers={mine.offers} hotelId={id} stay={parsed.data} />
      : <Empty title="Not available for this search">Try other dates, or ask the Group Desk.</Empty>;
  } else if (sp.in && !parsed.success) {
    offersBlock = <Notice tone="error">{parsed.error.issues[0]?.message}</Notice>;
  }

  return (
    <div className="animate-[var(--animate-rise)]">
      <Link prefetch={false} href={`/agent/search?city=${encodeURIComponent(hotel.city)}${sp.in ? `&in=${sp.in}&out=${sp.out}&rooms=${sp.rooms ?? ''}` : ''}`} className="text-[0.85rem] text-muted hover:text-ink">← Back to {hotel.city}</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <HotelVisual hotel={hotel} size="lg" className="h-64 rounded-[var(--radius-lg)] md:h-80" />
        <div className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <div>
            <div className="flex items-center gap-2">{hotel.isSample && <SampleTag />}<p className="eyebrow">{hotel.city}, {hotel.country}</p></div>
            <h1 className="mt-2 text-[1.9rem] leading-tight font-semibold">{hotel.name}</h1>
            <p className="mt-1 text-[0.9rem] text-muted">{hotel.starRating && hotel.starRatingVerified ? `${hotel.starRating}-star (verified) · ` : 'Star rating not verified · '}{hotel.address}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {hotel.collections.map((c) => <span key={c} className="rounded-full bg-mist px-2 py-0.5 text-[0.72rem] text-muted">{COLLECTIONS.find(([k]) => k === c)?.[1] ?? c}</span>)}
            </div>
          </div>
          <form action={toggleSavedAction} className="mt-6">
            <input type="hidden" name="hotelId" value={id} />
            <button className="text-[0.88rem] font-medium underline underline-offset-4">{saved ? 'Remove from saved hotels' : 'Save this hotel'}</button>
          </form>
        </div>
      </div>

      <div className="mt-6">
        <Panel title="Rates for your stay" description={parsed.success && sp.in ? `${formatDate(stay.checkIn)} – ${formatDate(stay.checkOut)} · ${daysBetween(stay.checkIn, stay.checkOut)} nights · ${describeRooms(stay.rooms)}` : undefined}>
          {offersBlock}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="About the hotel">
          <div className="prose-hb">{(hotel.description ?? '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>
          {hotel.facilities.length > 0 && (
            <>
              <h3 className="mt-6 text-[0.9rem] font-semibold">Facilities</h3>
              <ul className="mt-2 grid gap-1.5 text-[0.88rem] text-muted sm:grid-cols-2">
                {hotel.facilities.map((f) => <li key={f} className="flex items-center gap-2"><span className="size-1 rounded-full bg-champagne" />{f}</li>)}
              </ul>
            </>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Practical">
            <DL cols={1} items={[
              ['Check-in / check-out', hotel.checkInTime || hotel.checkOutTime ? `${hotel.checkInTime ?? '—'} / ${hotel.checkOutTime ?? '—'}` : null],
              ['Getting there', hotel.transport],
              ['Groups', hotel.groupNotes],
            ]} />
          </Panel>
          <Panel title="Room types">
            <ul className="space-y-3">
              {rooms.map((r) => (
                <li key={r.id}>
                  <p className="text-[0.92rem] font-medium">{r.name}</p>
                  <p className="text-[0.8rem] text-muted">Up to {r.maxAdults} adult{r.maxAdults === 1 ? '' : 's'}{r.maxChildren ? ` + ${r.maxChildren} child${r.maxChildren === 1 ? '' : 'ren'}` : ''}{r.bedding ? ` · ${r.bedding}` : ''}{r.sizeSqm ? ` · ${r.sizeSqm} m²` : ''}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export const metadata = { title: 'Hotel' };
