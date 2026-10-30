'use client';
import { useState } from 'react';
import { runScenario, type ScenarioInput } from '@/lib/domain/scenario';
import { formatMoney } from '@/lib/domain/money';

const FIELDS: [keyof ScenarioInput, string, 'int' | 'dec' | 'money' | 'pct'][] = [
  ['bookingsPerAgencyPerMonth', 'Bookings per active agency per month', 'dec'],
  ['avgBookingValueMinor', 'Average booking value (GBV)', 'money'],
  ['takeRateBps', 'Blended take rate (net revenue / GBV)', 'pct'],
  ['cancellationRateBps', 'Cancellation rate', 'pct'],
  ['prepaidShareBps', 'Share of GBV collected by HotelBridge', 'pct'],
  ['paymentCostBps', 'Payment + FX cost on collected GBV', 'pct'],
  ['bookingsPerSupportPerson', 'Bookings one ops person handles per month', 'int'],
  ['supportPersonMonthlyMinor', 'Cost of one ops person per month', 'money'],
  ['accountCostPerAgencyMonthlyMinor', 'Account management per agency per month', 'money'],
];

export function ScenarioModel({ currency }: { currency: string }) {
  const [inp, setInp] = useState<ScenarioInput>({
    activeAgencies: 100, bookingsPerAgencyPerMonth: 2, avgBookingValueMinor: 60_000, takeRateBps: 900, cancellationRateBps: 1200,
    prepaidShareBps: 7000, paymentCostBps: 250, bookingsPerSupportPerson: 250, supportPersonMonthlyMinor: 250_000, accountCostPerAgencyMonthlyMinor: 1_500,
  });
  const scales = [inp.activeAgencies, 1_000, 10_000];
  const results = scales.map((n) => ({ n, r: runScenario({ ...inp, activeAgencies: n }) }));
  const m = (v: number) => formatMoney(v, currency, { compact: true });
  const shown = (k: keyof ScenarioInput, t: string) => (t === 'money' ? inp[k] / 100 : t === 'pct' ? inp[k] / 100 : inp[k]);
  const set = (k: keyof ScenarioInput, t: string, v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setInp((s) => ({ ...s, [k]: t === 'money' || t === 'pct' ? Math.round(n * 100) : t === 'int' ? Math.round(n) : n }));
  };
  const rows: [string, (r: ReturnType<typeof runScenario>) => string][] = [
    ['Bookings created / realised', (r) => `${r.bookingsCreated.toLocaleString()} / ${r.bookingsRealised.toLocaleString()}`],
    ['Gross booking value', (r) => m(r.gbvMinor)], ['Net revenue', (r) => m(r.netRevenueMinor)], ['Payment & FX cost', (r) => m(-r.paymentCostMinor)],
    ['Gross profit', (r) => m(r.grossProfitMinor)], ['Ops people needed', (r) => String(r.supportPeople)], ['Ops cost', (r) => m(-r.supportCostMinor)],
    ['Account management', (r) => m(-r.accountCostMinor)], ['Contribution', (r) => m(r.contributionMinor)], ['Contribution / net revenue', (r) => `${(r.contributionMarginBps / 100).toFixed(1)}%`],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <label className="block"><span className="text-[0.82rem] font-medium">Active agencies (column 1)</span><input type="number" value={inp.activeAgencies} onChange={(e) => set('activeAgencies', 'int', e.target.value)} className="field num mt-1" /></label>
        {FIELDS.map(([k, l, t]) => (
          <label key={k} className="mt-3 block"><span className="text-[0.82rem] font-medium">{l}{t === 'pct' ? ' (%)' : t === 'money' ? ` (${currency})` : ''}</span>
            <input type="number" step="any" value={shown(k, t)} onChange={(e) => set(k, t, e.target.value)} className="field num mt-1" /></label>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="table"><thead><tr><th>Per month</th>{results.map(({ n }) => <th key={n} className="text-right">{n.toLocaleString()} agencies</th>)}</tr></thead>
          <tbody>{rows.map(([l, f]) => <tr key={l}><td className={l === 'Contribution' ? 'font-semibold' : ''}>{l}</td>{results.map(({ n, r }) => <td key={n} className={`num text-right ${l === 'Contribution' ? 'font-semibold' : ''}`}>{f(r)}</td>)}</tr>)}</tbody></table>
        <p className="border-t border-line px-5 py-3 text-[0.78rem] text-faint">Scenarios, not forecasts. Monthly figures; ×12 for an annual run-rate. Excludes fixed costs (team, technology, marketing) and agency acquisition cost — operating profit is lower than contribution.</p>
      </div>
    </div>
  );
}
