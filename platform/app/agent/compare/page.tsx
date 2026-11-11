import Link from 'next/link';
import { Empty, HotelVisual, LinkButton, Money, Notice, PageHeader, SampleTag } from '@/components/ui';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { decodeRooms, describeRooms, encodeRooms } from '@/lib/domain/occupancy';
import { requireAgent } from '@/lib/session';
import { MEAL_PLANS } from '@/lib/services/catalog';
import { compareHotels, MAX_COMPARE, type CompareColumn } from '@/lib/services/compare';
import { AppError } from '@/lib/services/errors';
import { TIER_INFO, isTier } from '@/lib/domain/tiers';

export const metadata = { title: 'Compare hotels' };

const meal = (m: string) => MEAL_PLANS[m as keyof typeof MEAL_PLANS] ?? m;

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string | string[]; in?: string; out?: string; rooms?: string; r?: string; a?: string }> }) {
  const { actor } = await requireAgent();
  const sp = await searchParams;
  const ids = (Array.isArray(sp.ids) ? sp.ids : (sp.ids ?? '').split(',')).filter(Boolean);
  // Rooms come either encoded (from the hotel page) or from the simple form below.
  const rooms = sp.rooms ? decodeRooms(sp.rooms) : Array.from({ length: Math.min(Math.max(Number(sp.r) || 1, 1), 9) }, () => ({ adults: Math.min(Math.max(Number(sp.a) || 2, 1), 4), childAges: [] as number[] }));
  const stay = sp.in && sp.out ? { checkIn: sp.in, checkOut: sp.out, rooms } : undefined;

  let data: Awaited<ReturnType<typeof compareHotels>> | null = null;
  let problem: string | null = null;
  try { data = await compareHotels(await getDb(), actor, ids, stay); } catch (e) { problem = e instanceof AppError ? e.message : 'Could not load the comparison.'; }

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Shortlist" title="Compare hotels" />
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface"><Empty title={problem ?? 'Choose hotels to compare'} action={<LinkButton href="/agent/saved" size="sm">Choose from saved hotels</LinkButton>}>Tick 2–{MAX_COMPARE} hotels on your Saved hotels page.</Empty></div>
      </>
    );
  }
  const cols = data.columns;
  const roomsParam = encodeRooms(rooms);

  const rows: [string, (c: CompareColumn) => React.ReactNode][] = [
    ['Destination', (c) => `${c.hotel.city}, ${c.hotel.country}`],
    ['Category', (c) => <>{isTier(c.hotel.tier) ? `${TIER_INFO[c.hotel.tier].label} · ${TIER_INFO[c.hotel.tier].stars}` : '—'}<p className="text-[0.75rem] text-faint">{c.hotel.starRating && c.hotel.starRatingVerified ? `${c.hotel.starRating}-star, verified` : 'Star rating not verified'}</p></>],
    ['How you book', (c) => (c.hotel.bestRateOnRequest ? <span className="text-champagne">Best rate on request<p className="text-[0.75rem] text-faint">Hotel quotes for your dates; we aim for 1 hour</p></span> : 'Contracted rates')],
    [stay && !data!.error ? `Price for ${cols[0]?.nights ?? ''} night${cols[0]?.nights === 1 ? '' : 's'} · ${describeRooms(rooms)}` : 'Price', (c) => {
      if (c.status === 'priced' && c.cheapest) {
        const per = c.nights ? Math.round(c.cheapest.price.sellMinor / c.nights) : null;
        return <><Money minor={c.cheapest.price.sellMinor} currency={c.cheapest.price.currency} className="text-[1.15rem] font-semibold" /><p className="text-[0.75rem] text-faint">total, cheapest option{per != null && <> · ≈ <Money minor={per} currency={c.cheapest.price.currency} /> a night, all rooms</>}</p></>;
      }
      if (c.status === 'on_request') return <span className="text-muted">Ask the hotel</span>;
      if (c.status === 'unavailable') return <span className="text-muted">Not available for these dates</span>;
      return <span className="text-muted">Add dates above</span>;
    }],
    ['Cheapest room', (c) => (c.cheapest ? <>{c.cheapest.roomName}<p className="text-[0.75rem] text-faint">{meal(c.cheapest.mealPlan)}{c.cheapest.availability === 'on_request' ? ' · hotel confirms' : ' · instant'}</p></> : '—')],
    ['Meal plans offered', (c) => (c.mealPlans.length ? c.mealPlans.map(meal).join(', ') : '—')],
    ['Cancellation', (c) => (c.cheapest ? (c.cheapest.nonRefundable ? <span className="text-attention">Non-refundable</span> : c.cheapest.freeCancelUntil ? <>Free until {formatDate(c.cheapest.freeCancelUntil)}</> : c.cheapest.cancellation) : '—')],
    ['Taxes', (c) => (c.cheapest ? (c.cheapest.price.taxMinor > 0 ? <>Includes VAT <Money minor={c.cheapest.price.taxMinor} currency={c.cheapest.price.currency} /></> : 'As shown on the hotel page') : '—')],
    ['Check-in', (c) => c.hotel.checkInTime ?? '—'],
    ['Room types', (c) => c.roomTypes || '—'],
    ['Facilities', (c) => (c.hotel.facilities.length ? <span className="text-[0.82rem]">{c.hotel.facilities.slice(0, 6).join(' · ')}</span> : '—')],
    ['Getting there', (c) => (c.hotel.transport ? <span className="text-[0.82rem]">{c.hotel.transport}</span> : '—')],
    ['Extras from the hotel', (c) => (c.extras ? `${c.extras} (dinners, spa, activities…)` : '—')],
  ];

  return (
    <>
      <Link href="/agent/saved" className="text-[0.85rem] text-muted hover:text-ink">← Saved hotels</Link>
      <PageHeader eyebrow="Shortlist" title="Compare hotels" description="Prices come from a live search for your dates — the same prices you book at." />

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
        <input type="hidden" name="ids" value={cols.map((c) => c.hotel.id).join(',')} />
        <label className="text-[0.8rem] text-muted">Check-in<input type="date" name="in" defaultValue={sp.in} className="field mt-1 block" /></label>
        <label className="text-[0.8rem] text-muted">Check-out<input type="date" name="out" defaultValue={sp.out} className="field mt-1 block" /></label>
        <label className="text-[0.8rem] text-muted">Rooms<select name="r" defaultValue={String(rooms.length)} className="field mt-1 block">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}</select></label>
        <label className="text-[0.8rem] text-muted">Adults per room<select name="a" defaultValue={String(rooms[0]?.adults ?? 2)} className="field mt-1 block">{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
        <button className="h-10 rounded-full bg-ink px-5 text-[0.88rem] font-medium text-paper">Show prices</button>
      </form>
      {data.error && <div className="mb-6"><Notice tone="error">{data.error}</Notice></div>}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-[0.88rem]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-40 bg-surface p-4 text-left align-bottom text-[0.72rem] font-medium tracking-[0.14em] text-faint uppercase" />
              {cols.map((c) => (
                <th key={c.hotel.id} className="min-w-[200px] border-l border-line p-4 text-left align-top font-normal">
                  <HotelVisual hotel={c.hotel} size="sm" className="mb-3 h-28 rounded-[var(--radius-sm)]" />
                  <Link href={`/agent/hotels/${c.hotel.id}${stay ? `?in=${stay.checkIn}&out=${stay.checkOut}&rooms=${roomsParam}` : ''}`} className="font-semibold hover:underline">{c.hotel.name}</Link> {c.hotel.isSample && <SampleTag />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-surface p-4 text-left align-top text-[0.8rem] font-medium text-muted">{label}</th>
                {cols.map((c) => <td key={c.hotel.id} className="border-l border-line p-4 align-top">{cell(c)}</td>)}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th className="sticky left-0 z-10 bg-surface p-4" />
              {cols.map((c) => (
                <td key={c.hotel.id} className="border-l border-line p-4">
                  <LinkButton size="sm" href={`/agent/hotels/${c.hotel.id}${stay ? `?in=${stay.checkIn}&out=${stay.checkOut}&rooms=${roomsParam}` : ''}`}>{c.hotel.bestRateOnRequest ? 'Get best rate' : c.status === 'priced' ? 'See rooms & book' : 'Open hotel'}</LinkButton>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {ids.length > MAX_COMPARE && <p className="mt-3 text-[0.8rem] text-muted">Showing the first {MAX_COMPARE} hotels.</p>}
    </>
  );
}
