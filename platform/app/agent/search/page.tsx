import Link from 'next/link';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { SearchForm } from '@/components/search-form';
import { OfferList } from '@/components/offers';
import { Empty, HotelVisual, Notice, PageHeader, SampleTag, Money } from '@/components/ui';
import { getDb } from '@/lib/db';
import { daysBetween, formatDate } from '@/lib/domain/dates';
import { decodeRooms, describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { destinations, searchHotels, searchSchema } from '@/lib/services/search';
import { COLLECTIONS } from '@/lib/services/catalog';
import { getTrip } from '@/lib/services/trips';

export const metadata = { title: 'Search hotels' };

type SP = { city?: string; in?: string; out?: string; rooms?: string; trip?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { actor } = await requireAgent();
  const sp = await searchParams;
  const db = await getDb();
  const dests = await destinations(db);
  const rooms = decodeRooms(sp.rooms);
  const trip = sp.trip ? await getTrip(db, actor, sp.trip).then((d) => d, () => null) : null;
  return (
    <>
      <PageHeader eyebrow="Search" title={trip ? 'Add a hotel to the trip' : 'Find a hotel'} description="Prices are for the whole stay, for every room, and are re-checked with the hotel before you book." />
      {trip && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-champagne/40 bg-champagne-soft px-4 py-3 text-[0.9rem]">
          <p>Building <span className="font-medium">{trip.trip.title}</span> for {trip.client.name} · {trip.items.filter((i) => i.kind === 'hotel').length} hotel{trip.items.filter((i) => i.kind === 'hotel').length === 1 ? '' : 's'} so far. Press <span className="font-medium">Add to trip</span> on a room.</p>
          <Link href={`/agent/trips/${trip.trip.id}`} className="font-medium underline underline-offset-4">Back to trip</Link>
        </div>
      )}
      <SearchForm destinations={dests} initial={{ city: sp.city, checkIn: sp.in, checkOut: sp.out, rooms }} compact={!!sp.city} keep={trip ? { trip: trip.trip.id } : undefined} />
      <div className="mt-8">
        {sp.city && sp.in && sp.out ? (
          <Suspense key={JSON.stringify(sp)} fallback={<ResultsSkeleton />}>
            <Results sp={sp} tripId={trip?.trip.id} />
          </Suspense>
        ) : (
          <Notice title="How search works">
            Choose a destination and dates, and set up each room exactly as it will be occupied. You&apos;ll see every option we can offer — instant confirmations first, then requests the hotel must confirm.
          </Notice>
        )}
      </div>
    </>
  );
}

async function Results({ sp, tripId }: { sp: SP; tripId?: string }) {
  const { actor } = await requireAgent();
  const db = await getDb();
  const input = { city: sp.city!, checkIn: sp.in!, checkOut: sp.out!, rooms: decodeRooms(sp.rooms) };
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return <Notice tone="error" title="Check your search">{parsed.error.issues.map((i) => i.message).join(' · ')}</Notice>;
  // Router prefetches are not searches; don't let them inflate search metrics.
  const prefetch = !!(await headers()).get('next-router-prefetch');
  const { results, warnings } = await searchHotels(db, actor, parsed.data, { log: !prefetch });
  const nights = daysBetween(input.checkIn, input.checkOut);
  const q = new URLSearchParams({ in: input.checkIn, out: input.checkOut, rooms: encodeRooms(input.rooms), ...(tripId ? { trip: tripId } : {}) }).toString();
  return (
    <div className="animate-[var(--animate-rise)]">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.92rem] text-muted">
          <span className="font-medium text-ink">{results.length} hotel{results.length === 1 ? '' : 's'}</span> in {input.city} · {formatDate(input.checkIn)} – {formatDate(input.checkOut)} · {nights} night{nights === 1 ? '' : 's'} · {describeRooms(input.rooms)}
        </p>
      </div>
      {warnings.map((w) => <div key={w} className="mb-3"><Notice tone="warning">{w}</Notice></div>)}
      {results.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface">
          <Empty title="Nothing available for this search" action={<Link href="/agent/groups/new" className="text-[0.9rem] font-medium underline underline-offset-4">Ask the Group Desk instead</Link>}>
            None of our hotels in {input.city} can take this room configuration on these dates. Try different dates or fewer rooms per booking.
          </Empty>
        </div>
      ) : (
        <ul className="space-y-5">
          {results.map(({ hotel, offers, fromMinor, currency }) => (
            <li key={hotel.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface transition-shadow hover:shadow-[var(--shadow-soft)]">
              <div className="grid md:grid-cols-[240px_1fr]">
                <HotelVisual hotel={hotel} className="h-44 md:h-full md:min-h-56" />
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/agent/hotels/${hotel.id}?${q}`} className="text-[1.15rem] font-semibold hover:underline">{hotel.name}</Link>
                        {hotel.isSample && <SampleTag />}
                      </div>
                      <p className="mt-0.5 text-[0.85rem] text-muted">
                        {hotel.starRating && hotel.starRatingVerified ? `${hotel.starRating}-star · ` : ''}{hotel.address ?? hotel.city}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hotel.collections.map((c) => (
                          <span key={c} className="rounded-full bg-mist px-2 py-0.5 text-[0.72rem] text-muted">{COLLECTIONS.find(([k]) => k === c)?.[1] ?? c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.72rem] text-faint">Stay from</p>
                      <Money minor={fromMinor} currency={currency} className="text-[1.25rem] font-semibold" />
                    </div>
                  </div>
                  {hotel.summary && <p className="mt-3 text-[0.88rem] leading-relaxed text-muted">{hotel.summary}</p>}
                  <div className="mt-3 border-t border-line">
                    <OfferList offers={offers} hotelId={hotel.id} stay={input} limit={3} tripId={tripId} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Searching hotels">
      <p className="text-[0.9rem] text-muted">Checking rates and availability with our hotels…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid animate-pulse overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface md:grid-cols-[240px_1fr]">
          <div className="h-44 bg-mist md:h-56" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-1/3 rounded bg-mist" />
            <div className="h-3 w-1/2 rounded bg-mist" />
            <div className="h-12 rounded bg-mist" />
            <div className="h-12 rounded bg-mist" />
          </div>
        </div>
      ))}
    </div>
  );
}
