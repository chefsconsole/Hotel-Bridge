/* One-hue magnitude bars. Values are printed in text colour; the bar only
 * carries size. The full number is also in each row's tooltip. */
export function BarList({ items, format = (v) => String(v), empty = 'No data yet' }: {
  items: { label: string; value: number; hint?: string }[]; format?: (v: number) => string; empty?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-[0.88rem] text-faint">{empty}</p>;
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${format(i.value)}${i.hint ? ` · ${i.hint}` : ''}`}>
          <div className="flex items-baseline justify-between gap-4 text-[0.88rem]">
            <span className="truncate">{i.label}{i.hint && <span className="ml-2 text-[0.78rem] text-faint">{i.hint}</span>}</span>
            <span className="num shrink-0 text-ink">{format(i.value)}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-mist">
            <div className="h-full rounded-full bg-champagne transition-[width] duration-500" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
