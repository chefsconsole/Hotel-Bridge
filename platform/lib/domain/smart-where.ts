/* ------------------------------------------------------------------ *
 * The "Where to" brain. One box that understands what agents actually
 * type: a city, a country, a hotel's name, a region ("Uttarakhand"), a
 * beach or area ("Patong", "Ubud"), an airport code ("BKK") — with typos.
 * Only real destinations and real partner hotels are ever suggested.
 * Pure and fast; runs in the browser on every keystroke.
 * ------------------------------------------------------------------ */

export type WhereDest = { city: string; country: string; n: number };
export type WhereHotel = { id: string; name: string; city: string; country: string; onRequest: boolean };
export type Suggestion =
  | { kind: 'city'; key: string; city: string; country: string; n: number; why?: string }
  | { kind: 'hotel'; key: string; id: string; name: string; city: string; country: string; onRequest: boolean };

/** Regions, states and well-known areas → the destinations we use for them. */
const AREAS: Record<string, string[]> = {
  // India
  uttarakhand: ['Rishikesh', 'Haridwar', 'Mussoorie', 'Dehradun', 'Bhimtal'], 'char dham': ['Haridwar', 'Rishikesh'],
  kashmir: ['Srinagar', 'Katra'], 'jammu': ['Katra'], 'vaishno devi': ['Katra'], gulmarg: ['Srinagar'], pahalgam: ['Srinagar'],
  himachal: ['Shimla', 'Parwanoo'], kerala: ['Kochi', 'Munnar', 'Kollam'], cochin: ['Kochi'], 'fort kochi': ['Kochi'], alleppey: ['Kollam', 'Kochi'],
  rajasthan: ['Udaipur'], 'uttar pradesh': ['Agra', 'Varanasi', 'Vrindavan'], mathura: ['Vrindavan'], banaras: ['Varanasi'], kashi: ['Varanasi'],
  'madhya pradesh': ['Ujjain'], mahakal: ['Ujjain'], punjab: ['Amritsar'], 'golden temple': ['Amritsar'], sikkim: ['Gangtok'],
  andaman: ['Neil Island (Andaman)'], havelock: ['Neil Island (Andaman)'], karnataka: ['Mysore'], mysuru: ['Mysore'], 'tamil nadu': ['Ooty'], nilgiris: ['Ooty'],
  'north goa': ['Goa'], 'south goa': ['Goa'], calangute: ['Goa'], morjim: ['Goa'], nainital: ['Bhimtal'], 'taj mahal': ['Agra'],
  // Thailand
  patong: ['Phuket'], kata: ['Phuket'], karon: ['Phuket'], 'laguna': ['Phuket'], 'ao nang': ['Krabi'], 'koh lanta': ['Krabi'], samui: ['Koh Samui'],
  sukhumvit: ['Bangkok'], pratunam: ['Bangkok'], 'jomtien': ['Pattaya'],
  // Indonesia & around
  ubud: ['Bali'], kuta: ['Bali'], legian: ['Bali'], seminyak: ['Bali'], 'nusa dua': ['Bali'], benoa: ['Bali'], jimbaran: ['Bali'],
  // Vietnam
  danang: ['Da Nang'], 'hoi an': ['Da Nang'],
  // Middle East
  uae: ['Dubai'], emirates: ['Dubai'], 'jumeirah': ['Dubai'],
  // Europe
  europe: ['London', 'Paris', 'Amsterdam', 'Rome', 'Prague', 'Vienna', 'Interlaken', 'Geneva'],
  swiss: ['Interlaken', 'Geneva'], switzerland: ['Interlaken', 'Geneva'], jungfrau: ['Interlaken'], uk: ['London'], england: ['London'],
  holland: ['Amsterdam'], italy: ['Rome'], austria: ['Vienna'], czech: ['Prague'], france: ['Paris'],
  // Oceania / Africa
  australia: ['Sydney'], 'south africa': ['Johannesburg'], midrand: ['Johannesburg'], joburg: ['Johannesburg'],
};

/** Airport / short codes agents use. */
const CODES: Record<string, string> = {
  bkk: 'Bangkok', dmk: 'Bangkok', hkt: 'Phuket', kbv: 'Krabi', usm: 'Koh Samui', utp: 'Pattaya', dps: 'Bali', sin: 'Singapore', dxb: 'Dubai',
  dad: 'Da Nang', han: 'Hanoi', hkg: 'Hong Kong', mle: 'Maldives', cmb: 'Sri Lanka', lhr: 'London', cdg: 'Paris', ams: 'Amsterdam',
  fco: 'Rome', prg: 'Prague', vie: 'Vienna', gva: 'Geneva', syd: 'Sydney', jnb: 'Johannesburg', goi: 'Goa', gox: 'Goa', cok: 'Kochi',
  sxr: 'Srinagar', vns: 'Varanasi', agr: 'Agra', ded: 'Dehradun', ixj: 'Katra', atq: 'Amritsar', udr: 'Udaipur',
};

export const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well the query matches a text: 100 exact … 0 no match. Tolerates typos in longer words. */
export function score(query: string, text: string): number {
  const q = norm(query), t = norm(text);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const words = t.split(' ');
  if (words.some((w) => w.startsWith(q))) return 80;
  if (q.includes(' ') && t.includes(q)) return 75;
  if (q.length >= 3 && t.includes(q)) return 60;
  // Typos: compare against each word (and the same-length prefix of it).
  if (q.length >= 4) {
    const allowed = q.length >= 7 ? 2 : 1;
    for (const w of words) {
      if (lev(q, w, allowed) <= allowed || lev(q, w.slice(0, q.length), allowed) <= allowed) return 50;
    }
  }
  // Several words: all must be found.
  const parts = q.split(' ').filter((p) => p.length > 1);
  if (parts.length > 1 && parts.every((p) => words.some((w) => w.startsWith(p) || (p.length >= 4 && lev(p, w.slice(0, p.length), 1) <= 1)))) return 55;
  return 0;
}

export function smartWhere(query: string, dests: WhereDest[], hotels: WhereHotel[], limit = 8): Suggestion[] {
  const q = norm(query);
  const byCity = new Map(dests.map((d) => [norm(d.city), d]));
  const cityOf = (name: string) => byCity.get(norm(name)) ?? [...byCity.entries()].find(([k]) => k.startsWith(norm(name)))?.[1];
  if (!q) return dests.slice().sort((a, b) => b.n - a.n || a.city.localeCompare(b.city)).map((d) => ({ kind: 'city' as const, key: `c:${d.city}`, ...d }));

  const out = new Map<string, { s: Suggestion; score: number }>();
  const add = (s: Suggestion, sc: number) => { const prev = out.get(s.key); if (!prev || prev.score < sc) out.set(s.key, { s, score: sc }); };

  // Airport codes ("bkk") — exact only.
  if (CODES[q]) { const d = cityOf(CODES[q]); if (d) add({ kind: 'city', key: `c:${d.city}`, ...d, why: `${q.toUpperCase()} airport` }, 98); }
  // Regions and areas ("uttarakhand", "patong", "ubud", "swiss").
  for (const [area, cities] of Object.entries(AREAS)) {
    const sc = score(q, area);
    if (sc < 50) continue;
    for (const c of cities) {
      const d = cityOf(c);
      if (d) add({ kind: 'city', key: `c:${d.city}`, ...d, why: `in ${area.replace(/\b\w/g, (m) => m.toUpperCase())}` }, sc - 2);
    }
  }
  // Cities and countries.
  for (const d of dests) {
    const sc = Math.max(score(q, d.city), score(q, d.country) - 15);
    if (sc > 0) add({ kind: 'city', key: `c:${d.city}`, ...d, why: score(q, d.city) > 0 ? undefined : d.country }, sc + 1);
  }
  // Hotels by name (and "hotel + city", e.g. "mercure phuket").
  for (const h of hotels) {
    const sc = Math.max(score(q, h.name), score(q, `${h.name} ${h.city}`) - 5);
    if (sc > 0) add({ kind: 'hotel', key: `h:${h.id}`, id: h.id, name: h.name, city: h.city, country: h.country, onRequest: h.onRequest }, sc);
  }
  return [...out.values()]
    .sort((a, b) => b.score - a.score || (a.s.kind === 'city' ? -1 : 1) || ('n' in b.s ? b.s.n : 0) - ('n' in a.s ? a.s.n : 0))
    .slice(0, limit)
    .map((x) => x.s);
}
