import { asc, eq } from 'drizzle-orm';
import { Empty, Money, Notice, PageHeader, Panel, Pill } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { addDays, todayIso } from '@/lib/domain/dates';
import { compareOffers, type ComparableOffer } from '@/lib/domain/comparison';
import { freeCancelUntil } from '@/lib/domain/cancellation';
import { decodeRooms } from '@/lib/domain/occupancy';
import { priceOffer, DEFAULT_RULE } from '@/lib/domain/pricing';
import { requireStaff } from '@/lib/session';
import { collectOffers, destinations } from '@/lib/services/search';

export const metadata = { title: 'Rate comparison' };

export default async function RateCheck({ searchParams }: { searchParams: Promise<{ city?: string; in?: string; out?: string; rooms?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const db = await getDb();
  const dests = await destinations(db);
  const city = sp.city ?? dests[0]?.city;
  const checkIn = sp.in ?? addDays(todayIso(), 30);
  const checkOut = sp.out ?? addDays(checkIn, 2);
  const rooms = decodeRooms(sp.rooms);
  const hotels = city ? await db.select().from(schema.hotels).where(eq(schema.hotels.city, city)).orderBy(asc(schema.hotels.name)) : [];
  const { offers } = city ? await collectOffers(db, { city, checkIn, checkOut, rooms }) : { offers: [] };
  const toComparable = (o: (typeof offers)[number]): ComparableOffer => ({
    supplier: o.supplier, hotelId: o.hotelId, roomTypeId: o.roomTypeId, roomName: o.roomName, mealPlan: o.mealPlan, currency: o.terms.currency,
    sellMinor: priceOffer({ terms: o.terms, contractAmountMinor: o.contractAmountMinor, roomNights: o.roomNights, personNights: o.personNights, rule: DEFAULT_RULE }).sellMinor,
    freeCancelUntil: freeCancelUntil(o.cancelPolicy, checkIn), nonRefundable: o.cancelPolicy.nonRefundable, taxesIncluded: o.terms.taxMode === 'included',
    localTaxMinor: o.terms.localTaxMinor, collectionModel: o.terms.collectionModel, availability: o.availability,
  });
  return (
    <>
      <PageHeader eyebrow="Commercial" title="Rate comparison" description="Contracted rates against other sources for the same stay. Prices are only compared when every condition matches; otherwise we list the differences." />
      <form className="mb-6 flex flex-wrap items-end gap-2">
        <select name="city" defaultValue={city} className="field !w-auto">{dests.map((d) => <option key={d.city}>{d.city}</option>)}</select>
        <input type="date" name="in" defaultValue={checkIn} className="field num !w-auto" /><input type="date" name="out" defaultValue={checkOut} className="field num !w-auto" />
        <input name="rooms" defaultValue={sp.rooms ?? '2'} className="field num !w-28" title="Rooms, e.g. 2|2|1" />
        <button className="h-[42px] rounded-[var(--radius-sm)] bg-ink px-4 text-[0.88rem] text-paper">Compare</button>
      </form>
      <Notice>Scraping competitor sites is not permitted. Only approved supplier connections are compared. In development the second source is the simulated sandbox.</Notice>
      <div className="mt-6 space-y-6">
        {hotels.length === 0 && <Panel><Empty title="No hotels in this destination" /></Panel>}
        {hotels.map((h) => {
          const mine = offers.filter((o) => o.hotelId === h.id).map(toComparable);
          const contracted = mine.filter((o) => o.supplier === 'contracted');
          const others = mine.filter((o) => o.supplier !== 'contracted');
          return (
            <Panel key={h.id} title={h.name} padded={false}>
              {mine.length === 0 ? <Empty title="No source has this stay" /> : (
                <table className="table"><thead><tr><th>Contracted offer</th><th>Other source</th><th>Verdict</th></tr></thead>
                  <tbody>{(contracted.length ? contracted : [null]).flatMap((c, i) => (others.length ? others : [null]).map((o, j) => {
                    const cmp = c && o ? compareOffers(c, o) : null;
                    return (
                      <tr key={`${i}-${j}`}>
                        <td>{c ? <>{c.roomName} · {c.mealPlan}<p><Money minor={c.sellMinor} currency={c.currency} /></p></> : <span className="text-faint">No contracted rate</span>}</td>
                        <td>{o ? <>{o.supplier}: {o.roomName} · {o.mealPlan}<p><Money minor={o.sellMinor} currency={o.currency} /></p></> : <span className="text-faint">No other source</span>}</td>
                        <td>{cmp ? (cmp.comparable
                          ? <Pill tone={cmp.deltaMinor! <= 0 ? 'positive' : 'attention'}>{cmp.deltaMinor! <= 0 ? 'Contract cheaper or equal' : 'Contract more expensive'} by <Money minor={Math.abs(cmp.deltaMinor!)} currency={c!.currency} /></Pill>
                          : <><Pill tone="neutral">Not comparable</Pill><ul className="mt-1 text-[0.75rem] text-muted">{cmp.differences.map((x) => <li key={x}>{x}</li>)}</ul></>) : '—'}</td>
                      </tr>
                    );
                  }))}</tbody></table>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
