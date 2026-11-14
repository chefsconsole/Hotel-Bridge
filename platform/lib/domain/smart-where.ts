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
  uttarakhand: ['Rishikesh', 'Haridwar', 'Mussoorie', 'Dehradun', 'Bhimtal', 'Nainital', 'Jim Corbett', 'Lansdowne', 'Rudraprayag', 'Sattal'], 'char dham': ['Haridwar', 'Rishikesh', 'Rudraprayag'],
  corbett: ['Jim Corbett'], 'jim corbett': ['Jim Corbett'], ramnagar: ['Jim Corbett'],
  kashmir: ['Srinagar', 'Katra'], 'jammu': ['Katra'], 'vaishno devi': ['Katra'], gulmarg: ['Srinagar'], pahalgam: ['Srinagar'],
  himachal: ['Shimla', 'Parwanoo', 'Manali', 'Kasauli', 'Chail', 'Kufri', 'Dharamshala'], manali: ['Manali'], dalhousie: ['Dharamshala'], mcleodganj: ['Dharamshala'],
  kerala: ['Kochi', 'Munnar', 'Kollam', 'Alleppey', 'Thekkady', 'Athirappilly', 'Guruvayur', 'Malampuzha'], cochin: ['Kochi'], 'fort kochi': ['Kochi'],
  alleppey: ['Alleppey'], alappuzha: ['Alleppey'], backwaters: ['Alleppey', 'Kollam'], periyar: ['Thekkady'],
  rajasthan: ['Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Pushkar', 'Mount Abu', 'Ranthambore', 'Sariska', 'Jawai'],
  'golden triangle': ['Agra', 'Jaipur'], 'pink city': ['Jaipur'], 'blue city': ['Jodhpur'], ajmer: ['Pushkar'], desert: ['Jaisalmer'],
  'uttar pradesh': ['Agra', 'Varanasi', 'Vrindavan', 'Ayodhya'], mathura: ['Vrindavan'], banaras: ['Varanasi'], kashi: ['Varanasi'], ayodhya: ['Ayodhya'],
  'madhya pradesh': ['Ujjain', 'Kanha', 'Pench', 'Bandhavgarh'], mahakal: ['Ujjain'], punjab: ['Amritsar'], 'golden temple': ['Amritsar'],
  sikkim: ['Gangtok'], 'west bengal': ['Darjeeling', 'Kalimpong'], 'north east': ['Gangtok', 'Darjeeling', 'Kalimpong'],
  andaman: ['Neil Island (Andaman)'], havelock: ['Neil Island (Andaman)'],
  karnataka: ['Mysore', 'Coorg', 'Sakleshpur', 'Karwar', 'Badami'], mysuru: ['Mysore'], madikeri: ['Coorg'], kodagu: ['Coorg'],
  'tamil nadu': ['Ooty', 'Kodaikanal', 'Madurai', 'Yercaud', 'Anaikatti', 'Tiruvannamalai'], nilgiris: ['Ooty'], kodai: ['Kodaikanal'],
  maharashtra: ['Lonavala', 'Panchgani', 'Tadoba'], mahabaleshwar: ['Panchgani'], khandala: ['Lonavala'],
  gujarat: ['Gir'], 'gir forest': ['Gir'], odisha: ['Puri'], jagannath: ['Puri'],
  wildlife: ['Ranthambore', 'Kanha', 'Pench', 'Bandhavgarh', 'Gir', 'Jim Corbett', 'Tadoba', 'Sariska', 'Jawai'],
  safari: ['Ranthambore', 'Kanha', 'Pench', 'Bandhavgarh', 'Gir', 'Jim Corbett', 'Tadoba', 'Sariska'],
  'north goa': ['Goa'], 'south goa': ['Goa'], calangute: ['Goa'], morjim: ['Goa'], nainital: ['Bhimtal'], 'taj mahal': ['Agra'],
  // Thailand
  patong: ['Phuket'], kata: ['Phuket'], karon: ['Phuket'], 'laguna': ['Phuket'], 'ao nang': ['Krabi'], 'koh lanta': ['Krabi'], samui: ['Koh Samui'],
  sukhumvit: ['Bangkok'], pratunam: ['Bangkok'], 'jomtien': ['Pattaya'],
  // Indonesia & around
  ubud: ['Bali'], kuta: ['Bali'], legian: ['Bali'], seminyak: ['Bali'], 'nusa dua': ['Bali'], benoa: ['Bali'], jimbaran: ['Bali'],
  // Vietnam
  danang: ['Da Nang'], vietnam: ['Hanoi', 'Da Nang', 'Hoi An', 'Ho Chi Minh City', 'Phu Quoc'],
  saigon: ['Ho Chi Minh City'], hcmc: ['Ho Chi Minh City'], 'ho chi minh': ['Ho Chi Minh City'],
  'old quarter': ['Hanoi'], 'halong': ['Hanoi'], 'ha long': ['Hanoi'],
  // Middle East
  uae: ['Dubai'], emirates: ['Dubai'], 'jumeirah': ['Dubai'],
  // Europe
  europe: ['London', 'Paris', 'Amsterdam', 'Rome', 'Milan', 'Brussels', 'Prague', 'Vienna', 'Zurich', 'Munich', 'Berlin', 'Salzburg', 'Interlaken', 'Geneva'],
  belgium: ['Brussels'], bruges: ['Brussels'], milano: ['Milan'], lombardy: ['Milan'],
  spain: ['Barcelona', 'Valencia', 'Bilbao', 'Zaragoza', 'Salamanca', 'Las Palmas', 'Puerto de la Cruz'],
  espana: ['Barcelona', 'Valencia', 'Bilbao'], catalonia: ['Barcelona'], 'basque country': ['Bilbao'],
  'costa brava': ['Barcelona'], 'canary islands': ['Las Palmas', 'Puerto de la Cruz'], canaries: ['Las Palmas', 'Puerto de la Cruz'],
  tenerife: ['Puerto de la Cruz'], 'gran canaria': ['Las Palmas'],
  swiss: ['Zurich', 'Interlaken', 'Geneva', 'Bern'], switzerland: ['Zurich', 'Interlaken', 'Geneva', 'Bern'], jungfrau: ['Interlaken'], uk: ['London'], england: ['London'],
  holland: ['Amsterdam'], italy: ['Rome', 'Milan'], czech: ['Prague'], france: ['Paris'],
  austria: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz', 'Villach', 'Lienz', 'Dornbirn', 'Steyr', 'Bischofshofen'],
  germany: ['Berlin', 'Munich'], bavaria: ['Munich'], tyrol: ['Innsbruck', 'Lienz'], tirol: ['Innsbruck', 'Lienz'], telfs: ['Innsbruck'], carinthia: ['Villach'],
  vorarlberg: ['Dornbirn'], wien: ['Vienna'], muenchen: ['Munich'], munchen: ['Munich'], zuerich: ['Zurich'], zurich: ['Zurich'], wallisellen: ['Zurich'], spreitenbach: ['Zurich'], ostermundigen: ['Bern'],
  // Oceania / Africa
  australia: ['Sydney'], 'south africa': ['Johannesburg'], midrand: ['Johannesburg'], joburg: ['Johannesburg'],
};

/** Airport / short codes agents use. */
const CODES: Record<string, string> = {
  bkk: 'Bangkok', dmk: 'Bangkok', hkt: 'Phuket', kbv: 'Krabi', usm: 'Koh Samui', utp: 'Pattaya', dps: 'Bali', sin: 'Singapore', dxb: 'Dubai',
  dad: 'Da Nang', han: 'Hanoi', hkg: 'Hong Kong', mle: 'Maldives', cmb: 'Sri Lanka', lhr: 'London', cdg: 'Paris', ams: 'Amsterdam',
  fco: 'Rome', prg: 'Prague', vie: 'Vienna', gva: 'Geneva', zrh: 'Zurich', muc: 'Munich', ber: 'Berlin', szg: 'Salzburg', inn: 'Innsbruck', grz: 'Graz', lnz: 'Linz', brn: 'Bern', syd: 'Sydney', jnb: 'Johannesburg', goi: 'Goa', gox: 'Goa', cok: 'Kochi',
  sxr: 'Srinagar', vns: 'Varanasi', agr: 'Agra', ded: 'Dehradun', ixj: 'Katra', atq: 'Amritsar', udr: 'Udaipur',
  jai: 'Jaipur', jdh: 'Jodhpur', jsa: 'Jaisalmer', ixb: 'Darjeeling', pgh: 'Jim Corbett', ixm: 'Madurai',
  mxp: 'Milan', lin: 'Milan', bgy: 'Milan', bru: 'Brussels', crl: 'Brussels',
  bcn: 'Barcelona', vlc: 'Valencia', bio: 'Bilbao', zaz: 'Zaragoza', lpa: 'Las Palmas', tfn: 'Puerto de la Cruz', tfs: 'Puerto de la Cruz',
  sgn: 'Ho Chi Minh City', hui: 'Hoi An',
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
