import { formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { EXTRA_CATEGORY, EXTRA_UNIT } from '@/lib/services/extras';

type Row = {
  id: string; name: string; category: string; unit: string; currency: string;
  /** What the agent pays. */ sellMinor: number; childSellMinor: number | null;
  /** Staff only: the hotel's net price. */ netMinor?: number; childNetMinor?: number | null;
  note: string | null; compulsory: boolean; validFrom: string | null; validTo: string | null;
};

/** Hotel extras grouped by category. Pass netMinor only on staff pages. */
export function ExtrasList({ rows, staff = false }: { rows: Row[]; staff?: boolean }) {
  const groups = Object.keys(EXTRA_CATEGORY).map((c) => [c, rows.filter((r) => r.category === c)] as const).filter(([, list]) => list.length);
  return (
    <div className="space-y-5">
      {groups.map(([cat, list]) => (
        <div key={cat}>
          <p className="eyebrow">{EXTRA_CATEGORY[cat]}</p>
          <ul className="mt-2 divide-y divide-line">
            {list.map((x) => (
              <li key={x.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
                <div className="min-w-0">
                  <p className="text-[0.92rem] font-medium">{x.name}{x.compulsory && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[0.7rem] text-muted">Compulsory</span>}</p>
                  <p className="text-[0.78rem] text-muted">
                    {[x.note, x.validFrom && x.validTo && (x.validFrom === x.validTo ? formatDate(x.validFrom) : `${formatDate(x.validFrom)} – ${formatDate(x.validTo)}`)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="num text-right text-[0.88rem]">
                  <p><span className="font-medium">{formatMoney(x.sellMinor, x.currency)}</span> <span className="text-muted">{EXTRA_UNIT[x.unit] ?? x.unit}</span></p>
                  {x.childSellMinor != null && <p className="text-[0.78rem] text-muted">Child {formatMoney(x.childSellMinor, x.currency)}</p>}
                  {staff && x.netMinor != null && <p className="text-[0.72rem] text-muted">Net {formatMoney(x.netMinor, x.currency)}{x.childNetMinor != null ? ` · child ${formatMoney(x.childNetMinor, x.currency)}` : ''}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
