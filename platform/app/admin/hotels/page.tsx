import Link from 'next/link';
import { Empty, LinkButton, PageHeader, Pill, SampleTag } from '@/components/ui';
import { getDb } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { countHotelsAdmin, hotelCities, listHotelsAdmin } from '@/lib/services/catalog';

export const metadata = { title: 'Hotels & contracts' };

type SP = { q?: string; city?: string; status?: string; contract?: string };

const CAP = 300;

export default async function AdminHotels({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const sp = await searchParams;
  const filter = { q: sp.q, city: sp.city || undefined, status: sp.status, contract: sp.contract };
  const db = await getDb();
  const [rows, cities, total] = await Promise.all([
    listHotelsAdmin(db, { ...filter, limit: CAP }),
    hotelCities(db),
    countHotelsAdmin(db, filter),
  ]);
  const filtered = !!(sp.q || sp.city || (sp.status && sp.status !== 'all') || sp.contract);

  const qs = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return '/admin/hotels' + (q ? `?${q}` : '');
  };
  const pill = (on: boolean) =>
    `rounded-full px-3 py-1.5 text-[0.82rem] ${on ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`;

  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Hotels & contracts"
        description="A hotel is visible to agents once published; it is bookable only with an active contract that permits distribution."
        actions={<LinkButton href="/admin/hotels/new">Add hotel</LinkButton>} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[['', 'All'], ['active', 'Bookable'], ['none', 'No live contract']].map(([k, l]) => (
            <Link key={k} href={qs({ contract: k })} className={pill((sp.contract ?? '') === k)}>{l}</Link>
          ))}
          <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
          {[['all', 'Any profile'], ['active', 'Published'], ['draft', 'Draft']].map(([k, l]) => (
            <Link key={k} href={qs({ status: k })} className={pill((sp.status ?? 'all') === k)}>{l}</Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-2">
          {sp.contract && <input type="hidden" name="contract" value={sp.contract} />}
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <select name="city" defaultValue={sp.city ?? ''} className="field !w-auto max-w-56 py-2 text-[0.85rem]">
            <option value="">All cities</option>
            {cities.map((c) => <option key={`${c.city}|${c.country}`} value={c.city}>{c.city}, {c.country} ({c.n})</option>)}
          </select>
          <input name="q" defaultValue={sp.q} placeholder="Hotel, city or country" className="field !w-52 py-2 text-[0.85rem]" />
          <button className="rounded-[var(--radius-sm)] bg-ink px-4 text-[0.85rem] text-paper">Search</button>
          {filtered && <Link href="/admin/hotels" className="self-center text-[0.82rem] text-muted underline hover:text-ink">Clear</Link>}
        </form>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        {rows.length === 0 ? (
          filtered
            ? <Empty title="No hotel matches that" action={<LinkButton href="/admin/hotels" size="sm">Clear the filters</LinkButton>}>Try a shorter search, or a different city.</Empty>
            : <Empty title="No hotels yet" action={<LinkButton href="/admin/hotels/new" size="sm">Add the first hotel</LinkButton>}>Add contracted partners one at a time. Partner data is never bulk-imported into code.</Empty>
        ) : (
          <table className="table"><thead><tr><th>Hotel</th><th>City</th><th>Profile</th><th>Contracts</th></tr></thead>
            <tbody>{rows.map(({ h, contracts, activeContracts }) => (
              <tr key={h.id}>
                <td><Link href={`/admin/hotels/${h.id}`} className="font-medium hover:underline">{h.name}</Link> {h.isSample && <SampleTag />}</td>
                <td>{h.city}, {h.country}</td>
                <td><Pill tone={h.status === 'active' ? 'positive' : h.status === 'draft' ? 'pending' : 'neutral'}>{h.status === 'active' ? 'Published' : h.status}</Pill></td>
                <td>{activeContracts ? <Pill tone="positive">{activeContracts} active</Pill> : <Pill tone="attention">None active</Pill>} <span className="text-[0.8rem] text-faint">{contracts} total</span></td>
              </tr>
            ))}</tbody></table>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-3 text-[0.78rem] text-faint">
          {total > CAP
            ? `Showing the first ${rows.length} of ${total}. Narrow it with the filters above.`
            : `${total} hotel${total === 1 ? '' : 's'}${filtered ? ' match' : ''}.`}
        </p>
      )}
    </>
  );
}
