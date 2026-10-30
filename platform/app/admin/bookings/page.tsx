import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';
import { PaymentPill, StatusPill } from '@/components/booking-bits';
import { Empty, Money, PageHeader, SampleTag } from '@/components/ui';
import { getDb, schema } from '@/lib/db';
import { BOOKING_STATUSES, STATUS_LABEL } from '@/lib/domain/booking-state';
import { formatDate } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Bookings' };

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff();
  const { status, q = '' } = await searchParams;
  const db = await getDb();
  const b = schema.bookings;
  let rows = await db.select({ b, hotel: schema.hotels.name, agency: schema.agencies.name }).from(b)
    .innerJoin(schema.hotels, eq(schema.hotels.id, b.hotelId)).innerJoin(schema.agencies, eq(schema.agencies.id, b.agencyId))
    .where(status ? inArray(b.status, [status]) : undefined).orderBy(desc(b.createdAt)).limit(300);
  const n = q.trim().toLowerCase();
  if (n) rows = rows.filter((r) => [r.b.reference, r.b.leadGuest, r.hotel, r.agency, r.b.supplierRef ?? ''].some((s) => s.toLowerCase().includes(n)));
  return (
    <>
      <PageHeader eyebrow="Operations" title="Bookings" />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="status" defaultValue={status ?? ''} className="field !w-auto"><option value="">All statuses</option>{BOOKING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <input name="q" defaultValue={q} placeholder="Reference, guest, hotel, agency, supplier ref" className="field md:!w-80" />
        <button className="rounded-[var(--radius-sm)] bg-ink px-4 text-[0.88rem] text-paper">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? <Empty title="No bookings" /> : (
          <table className="table"><thead><tr><th>Reference</th><th>Agency</th><th>Hotel</th><th>Stay</th><th>Supplier</th><th>Status</th><th>Payment</th><th className="text-right">Sell</th><th className="text-right">Net rev.</th></tr></thead>
            <tbody>{rows.map(({ b, hotel, agency }) => (
              <tr key={b.id}>
                <td><Link href={`/admin/bookings/${b.id}`} className="num font-medium hover:underline">{b.reference}</Link> {b.isSample && <SampleTag />}</td>
                <td>{agency}</td><td>{hotel}</td><td className="num whitespace-nowrap">{formatDate(b.checkIn)}</td><td className="text-[0.82rem]">{b.supplier}</td>
                <td><StatusPill status={b.status} /></td><td><PaymentPill status={b.paymentStatus} /></td>
                <td className="text-right"><Money minor={b.sellMinor} currency={b.currency} /></td><td className="text-right"><Money minor={b.netRevenueMinor} currency={b.currency} /></td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
