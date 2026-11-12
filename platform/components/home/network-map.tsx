/* The live HotelBridge network: one arc from India to every city where we have
 * partner hotels. Cities come from the database; only their map positions are
 * fixed here. Pure SVG + CSS, server-rendered. */

/** [lat, lon] for the cities we work in. A city missing here is still counted, just not drawn. */
const COORDS: Record<string, [number, number]> = {
  sydney: [-33.87, 151.21], vienna: [48.21, 16.37], prague: [50.08, 14.44], paris: [48.86, 2.35], 'hong kong': [22.32, 114.17],
  agra: [27.18, 78.01], amritsar: [31.63, 74.87], bhimtal: [29.34, 79.56], dehradun: [30.32, 78.03], gangtok: [27.33, 88.61],
  goa: [15.3, 74.12], haridwar: [29.95, 78.16], katra: [32.99, 74.93], kochi: [9.93, 76.27], kollam: [8.89, 76.61], munnar: [10.09, 77.06],
  mussoorie: [30.46, 78.07], mysore: [12.3, 76.64], 'neil island': [11.83, 93.03], ooty: [11.41, 76.7], parwanoo: [30.84, 76.96],
  rishikesh: [30.09, 78.27], shimla: [31.1, 77.17], srinagar: [34.08, 74.8], udaipur: [24.59, 73.71], ujjain: [23.18, 75.78],
  varanasi: [25.32, 82.97], vrindavan: [27.58, 77.7], bali: [-8.41, 115.19], rome: [41.9, 12.5], maldives: [4.18, 73.51],
  amsterdam: [52.37, 4.9], singapore: [1.35, 103.82], 'sri lanka': [6.93, 79.86], geneva: [46.2, 6.14], interlaken: [46.69, 7.86],
  bangkok: [13.76, 100.5], 'koh samui': [9.51, 100.01], krabi: [8.09, 98.91], pattaya: [12.93, 100.88], phuket: [7.88, 98.39],
  dubai: [25.2, 55.27], london: [51.51, -0.13], 'da nang': [16.05, 108.2], hanoi: [21.03, 105.85], mumbai: [19.08, 72.88], johannesburg: [-26.2, 28.05],
};
const LABELS = new Set(['london', 'dubai', 'phuket', 'bali', 'sydney', 'singapore', 'hanoi', 'maldives', 'rishikesh']);

const W = 720, H = 440;
const LON0 = -14, LON1 = 158, LAT0 = 60, LAT1 = -42;
const project = ([lat, lon]: [number, number]) => [((lon - LON0) / (LON1 - LON0)) * W, ((LAT0 - lat) / (LAT0 - LAT1)) * H] as const;
const keyOf = (city: string) => Object.keys(COORDS).find((k) => city.toLowerCase().startsWith(k));

export function NetworkMap({ cities }: { cities: { city: string; country: string; n: number }[] }) {
  const [ox, oy] = project(COORDS.mumbai);
  const points = cities.flatMap((c) => {
    const k = keyOf(c.city);
    if (!k) return [];
    const [x, y] = project(COORDS[k]);
    return [{ ...c, k, x, y, abroad: c.country !== 'India' }];
  });
  // Longest routes first so the short domestic ones sit on top.
  const routes = points.filter((p) => p.abroad).sort((a, b) => Math.hypot(b.x - ox, b.y - oy) - Math.hypot(a.x - ox, a.y - oy));
  const arc = (x: number, y: number) => {
    const mx = (ox + x) / 2, my = (oy + y) / 2, d = Math.hypot(x - ox, y - oy);
    return `M${ox.toFixed(1)},${oy.toFixed(1)} Q${mx.toFixed(1)},${(my - d * 0.32).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`HotelBridge partner hotels in ${points.length} cities, connected from India`}>
      <defs>
        <radialGradient id="hb-fade" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <mask id="hb-mask"><rect width={W} height={H} fill="url(#hb-fade)" /></mask>
        <pattern id="hb-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1.3" cy="1.3" r="1.2" fill="#ffffff" /></pattern>
        <linearGradient id="hb-arc" x1="0" x2="1"><stop offset="0" stopColor="#c79a4a" stopOpacity="0.15" /><stop offset="0.5" stopColor="#e9c98a" stopOpacity="0.9" /><stop offset="1" stopColor="#c79a4a" stopOpacity="0.35" /></linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#hb-dots)" opacity="0.12" mask="url(#hb-mask)" />

      {routes.map((p, i) => {
        const d = arc(p.x, p.y);
        const delay = `${300 + i * 90}ms`;
        return (
          <g key={p.k}>
            <path d={d} pathLength={1} fill="none" stroke="url(#hb-arc)" strokeWidth="1.5" className="hb-arc" style={{ ['--d' as string]: delay }} />
            <circle r="3" fill="#fff4dc" className="hb-plane" style={{ offsetPath: `path('${d}')`, ['--d' as string]: `${1800 + i * 260}ms`, ['--t' as string]: `${2.8 + (i % 4) * 0.5}s` }} />
          </g>
        );
      })}

      {points.map((p, i) => (
        <g key={`pt-${p.k}`}>
          {p.abroad && <circle cx={p.x} cy={p.y} r="5" fill="none" stroke="#e0bd78" strokeWidth="1.2" className="hb-ping" style={{ ['--d' as string]: `${(i % 7) * 380}ms` }} />}
          <circle cx={p.x} cy={p.y} r={p.abroad ? 3.6 : 2.4} fill={p.abroad ? '#f1d49a' : '#c9a35f'} opacity={p.abroad ? 1 : 0.85} />
          {LABELS.has(p.k) && (
            <text x={p.x + (p.k === 'sydney' || p.k === 'bali' ? -8 : 7)} y={p.y + (p.k === 'rishikesh' ? -7 : 3.5)} textAnchor={p.k === 'sydney' || p.k === 'bali' ? 'end' : 'start'}
              fontSize="13" fill="#ffffff" fillOpacity="0.72" style={{ letterSpacing: '0.04em' }}>{p.city.replace(/ \(.*\)/, '')}</text>
          )}
        </g>
      ))}

      {/* Origin: the agents we serve */}
      <circle cx={ox} cy={oy} r="7" fill="none" stroke="#f1d49a" strokeWidth="1.4" className="hb-ping" />
      <circle cx={ox} cy={oy} r="5.5" fill="#f6dfae" />
      <text x={ox - 8} y={oy + 16} textAnchor="end" fontSize="12.5" fontWeight="600" fill="#f6dfae" style={{ letterSpacing: '0.14em' }}>INDIA</text>
    </svg>
  );
}
