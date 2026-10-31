import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { StatusPill } from '@/components/booking-bits';
import { Empty, Money, PageHeader, Panel, Pill, cx } from '@/components/ui';
import { hotelSettlementAction } from '@/app/actions/admin';
import { getDb, schema } from '@/lib/db';
import { addDays, formatDate, todayIso } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { arrivals, hotelAccounts, hotelVolume, windowFor, type Arrival } from '@/lib/services/tracker';

export const metadata = { title: 'Arrivals & hotels' };

const WINDOWS = { today: 'Today', tomorrow: 'Tomorrow', '7': 'Next 7 days', '30': 'Next 30 days' } as const;

function summary(list: Arrival[]) {
  const fit = list.filter((a) => a.type === 'fit');
  const groups = list.filter((a) => a.type === 'group');
  return { fit: fit.length, fitRooms: fit.reduce((s, a) => s + a.rooms, 0), groups: groups.length, groupPax: groups.reduce((s, a) => s + a.pax, 0) };
}

export default async function TrackerPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  await requireStaff();
  const { w = 'tomorrow' } = await searchParams;
  const db = await getDb();
  const today = todayIso();
  const win = windowFor(w, today);
  const [list, todayList, tomorrowList, weekList, accounts, volume, hotelRows] = await Promise.all([
    arrivals(db, win),
    arrivals(db, windowFor('today', today)),
    arrivals(db, windowFor('tomorrow', today)),
    arrivals(db, windowFor('7', today)),
    hotelAccounts(db),
    hotelVolume(db, { from: addDays(today, -30), to: addDays(today, 365) }),
    db.select({ id: schema.hotels.id, name: schema.hotels.name, city: schema.hotels.city }).from(schema.hotels),
  ]);
  const name = new Map(hotelRows.map((h) => [h.id, h]));
  const hotelIds = [...new Set([...accounts.map((a) => a.hotelId), ...volume.map((v) => v.hotelId)])]
    .sort((a, b) => (name.get(a)?.name ?? '').localeCompare(name.get(b)?.name ?? ''));
  const cards = [['today', 'Today', todayList], ['tomorrow', 'Tomorrow', tomorrowList], ['7', 'Next 7 days', weekList]] as const;

  return (
    <>
      <PageHeader eyebrow="Operations" title="Arrivals & hotels"
        description="Who arrives when — individual bookings (FIT) and Group Desk groups — and the money with every hotel: what we owe it, and what commission it owes us." />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {cards.map(([key, label, l]) => {
          const s = summary(l);
          return (
            <Link key={key} href={`/admin/tracker?w=${key}`} className={cx('rounded-[var(--radius-lg)] border bg-surface p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]', w === key ? 'border-ink' : 'border-line')}>
              <p className="text-[0.68rem] font-medium tracking-[0.14em] text-faint uppercase">{label}</p>
              <div className="mt-3 flex items-end gap-6">
                <div><p className="num font-[family-name:var(--font-display)] text-[2rem] leading-none font-light">{s.fit}</p><p className="mt-1 text-[0.78rem] text-muted">FIT · {s.fitRooms} room{s.fitRooms === 1 ? '' : 's'}</p></div>
                <div><p className="num font-[family-name:var(--font-display)] text-[2rem] leading-none font-light">{s.groups}</p><p className="mt-1 text-[0.78rem] text-muted">Group{s.groups === 1 ? '' : 's'} · {s.groupPax} pax</p></div>
              </div>
            </Link>
          );
        })}
      </div>

      <Panel title={`Arrivals · ${WINDOWS[w as keyof typeof WINDOWS] ?? 'Next 7 days'}`} padded={false}
        actions={<div className="flex flex-wrap gap-1.5">{Object.entries(WINDOWS).map(([k, l]) => <Link key={k} href={`/admin/tracker?w=${k}`} className={`rounded-full px-3 py-1 text-[0.78rem] ${k === w ? 'bg-ink text-paper' : 'bg-mist text-muted hover:text-ink'}`}>{l}</Link>)}</div>}>
        {list.length === 0 ? <Empty title="No arrivals in this window" /> : (
          <table className="table">
            <thead><tr><th>Arrival</th><th>Type</th><th>Hotel</th><th>Guest / group</th><th>Agency</th><th>Rooms · pax</th><th>Status</th><th className="text-right">Hotel gets</th><th className="text-right">Ours</th></tr></thead>
            <tbody>{list.map((a) => (
              <tr key={`${a.type}-${a.reference}-${a.hotelName}`}>
                <td className="num whitespace-nowrap">{formatDate(a.date, { weekday: 'short', day: 'numeric', month: 'short' })}<p className="text-[0.72rem] text-faint">{a.nights} night{a.nights === 1 ? '' : 's'}</p></td>
                <td><Pill tone={a.type === 'group' ? 'info' : 'neutral'} dot={false}>{a.type === 'group' ? 'Group' : 'FIT'}</Pill></td>
                <td>{a.hotelName}<p className="text-[0.72rem] text-faint">{a.city}</p></td>
                <td><Link href={a.href} className="font-medium hover:underline">{a.leadName}</Link><p className="num text-[0.72rem] text-faint">{a.reference}</p></td>
                <td className="text-[0.85rem]">{a.agencyName}</td>
                <td className="num">{a.rooms} · {a.pax}</td>
                <td>{a.type === 'group' ? <Pill tone="positive">Won</Pill> : <StatusPill status={a.status} />}</td>
                <td className="text-right">{a.costMinor != null && a.currency ? <Money minor={a.costMinor} currency={a.currency} /> : '—'}{a.collection === 'pay_direct_to_hotel' && <p className="text-[0.7rem] text-faint">guest pays hotel</p>}</td>
                <td className="text-right">{a.ourMinor != null && a.currency ? <Money minor={a.ourMinor} currency={a.currency} className="font-medium" /> : <span className="text-faint">see proposal</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Panel>

      <Panel title="Hotels — volume and money" className="mt-6" padded={false}
        description="Volume: stays from 30 days ago onward, not cancelled. Balances: everything still open in the ledger.">
        {hotelIds.length === 0 ? <Empty title="No hotel activity yet" /> : (
          <table className="table">
            <thead><tr><th>Hotel</th><th className="text-right">Bookings</th><th className="text-right">Room nights</th><th className="text-right">Agents paid</th><th className="text-right">Our revenue</th><th className="text-right">We owe hotel</th><th className="text-right">Hotel owes us</th></tr></thead>
            <tbody>{hotelIds.map((id) => {
              const vs = volume.filter((v) => v.hotelId === id);
              const ac = accounts.filter((a) => a.hotelId === id);
              const money = (xs: { currency: string; v: number }[], cls = '') => xs.filter((x) => x.v !== 0).length ? xs.filter((x) => x.v !== 0).map((x) => <p key={x.currency}><Money minor={x.v} currency={x.currency} className={cls} /></p>) : <span className="text-faint">—</span>;
              return (
                <tr key={id}>
                  <td><Link href={`/admin/hotels/${id}`} className="font-medium hover:underline">{name.get(id)?.name ?? 'Hotel'}</Link><p className="text-[0.72rem] text-faint">{name.get(id)?.city}</p></td>
                  <td className="num text-right">{vs.reduce((s, v) => s + v.bookings, 0)}</td>
                  <td className="num text-right">{vs.reduce((s, v) => s + v.roomNights, 0)}</td>
                  <td className="text-right">{money(vs.map((v) => ({ currency: v.currency, v: v.sellMinor })))}</td>
                  <td className="text-right">{money(vs.map((v) => ({ currency: v.currency, v: v.ourMinor })), 'font-medium')}</td>
                  <td className="text-right">{money(ac.map((a) => ({ currency: a.currency, v: a.weOweMinor })), 'text-attention')}</td>
                  <td className="text-right">{money(ac.map((a) => ({ currency: a.currency, v: a.theyOweMinor })), 'text-positive')}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </Panel>

      {accounts.length > 0 && (
        <Panel title="Record a settlement" className="mt-6" description="When we pay a hotel for prepaid stays, or a hotel pays the commission it owes us. Finance only.">
          <ActionForm action={hotelSettlementAction} resetOnSuccess className="grid gap-3 md:grid-cols-5 md:items-end">
            <Field label="Hotel"><select name="hotelId" className="field">{[...new Set(accounts.map((a) => a.hotelId))].map((id) => <option key={id} value={id}>{name.get(id)?.name}</option>)}</select></Field>
            <Field label="What happened"><select name="direction" className="field"><option value="paid_hotel">We paid the hotel</option><option value="commission_received">Hotel paid our commission</option></select></Field>
            <Field label="Currency"><select name="currency" className="field">{[...new Set(accounts.map((a) => a.currency))].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Amount"><input name="amount" inputMode="decimal" className="field num" /></Field>
            <Field label="Bank reference"><input name="reference" className="field" /></Field>
            <div className="md:col-span-5"><SubmitButton size="sm" confirm="Record this settlement in the ledger?">Record</SubmitButton></div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
