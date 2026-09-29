// localStorage-backed Requirements / RFQs — series & group requirements from
// operators/DMCs that we source & contract with hotels. Swaps to Supabase later.

const KEY = 'hotelbridge.crm.requirements';
const SEQ = 'hotelbridge.crm.rfqSeq';

export const RFQ_STATUS = {
  new:      { label: 'New',       color: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500'   },
  sourcing: { label: 'Sourcing',  color: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-500'  },
  quoted:   { label: 'Quoted',    color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  won:      { label: 'Contracted',color: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500'  },
  lost:     { label: 'Lost',      color: 'bg-red-50 text-red-600 border-red-200',           dot: 'bg-red-500'    },
};

export const OFFER_STATUS = {
  waiting:     { label: 'Waiting',     color: 'bg-gray-100 text-gray-600' },
  available:   { label: 'Available',   color: 'bg-blue-50 text-blue-700' },
  shortlisted: { label: 'Shortlisted', color: 'bg-amber-50 text-amber-700' },
  confirmed:   { label: 'Confirmed',   color: 'bg-green-50 text-green-700' },
  unavailable: { label: 'No Avail.',   color: 'bg-red-50 text-red-600' },
};

export function getRequirements() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
function nextRef() {
  let seq = 0;
  try { seq = parseInt(localStorage.getItem(SEQ) || '0', 10) || 0; } catch { seq = 0; }
  seq += 1;
  try { localStorage.setItem(SEQ, String(seq)); } catch { /* ignore */ }
  return `RFQ-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
}

const normalize = (data) => ({
  id: `RFQ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  ref: nextRef(),
  groupName: '',
  operatorName: '',
  destination: '',
  checkIn: '',
  nights: '',
  pax: '',
  rooms: '',
  meal: 'BB',
  targetRate: '',
  status: 'new',
  notes: '',
  offers: [],
  createdAt: new Date().toISOString(),
  ...data,
});

export function saveRequirement(data) {
  const item = normalize(data);
  writeAll([item, ...getRequirements()]);
  return item;
}

export function saveRequirementsBulk(rows) {
  const items = rows.map((r) => normalize(r));
  writeAll([...items, ...getRequirements()]);
  return items;
}

export function updateRequirement(id, patch) {
  writeAll(getRequirements().map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return getRequirements().find((x) => x.id === id);
}

export function deleteRequirement(id) {
  writeAll(getRequirements().filter((x) => x.id !== id));
}

// Parse pasted spreadsheet text (tab OR comma separated).
// Flexible header detection; falls back to positional columns:
// Group | Operator | Destination | Check-in | Nights | Pax | Rooms | Meal | Target
export function parseSpreadsheet(text) {
  const lines = (text || '').trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (l) => (l.includes('\t') ? l.split('\t') : l.split(',')).map((c) => c.trim());

  // Detect a header row
  const first = split(lines[0]).map((c) => c.toLowerCase());
  const looksLikeHeader = first.some((c) => /group|operator|dmc|destination|city|check|night|pax|room|meal|rate|target/.test(c));
  const dataLines = looksLikeHeader ? lines.slice(1) : lines;

  // Build a column index map if we have a header
  const idx = {};
  if (looksLikeHeader) {
    first.forEach((c, i) => {
      if (/group|name/.test(c)) idx.groupName = i;
      else if (/operator|dmc|agent|client/.test(c)) idx.operatorName = i;
      else if (/destination|city|place/.test(c)) idx.destination = i;
      else if (/check|arriv|date/.test(c)) idx.checkIn = i;
      else if (/night/.test(c)) idx.nights = i;
      else if (/pax|guest|pers/.test(c)) idx.pax = i;
      else if (/room/.test(c)) idx.rooms = i;
      else if (/meal|board|plan/.test(c)) idx.meal = i;
      else if (/rate|target|price|budget/.test(c)) idx.targetRate = i;
    });
  }
  const pos = ['groupName', 'operatorName', 'destination', 'checkIn', 'nights', 'pax', 'rooms', 'meal', 'targetRate'];

  return dataLines.map((line) => {
    const cols = split(line);
    const get = (key, i) => (idx[key] != null ? cols[idx[key]] : cols[i]) || '';
    const row = {};
    pos.forEach((key, i) => { row[key] = get(key, i); });
    // sanitize numerics
    ['nights', 'pax', 'rooms'].forEach((k) => { row[k] = (row[k] || '').replace(/[^\d]/g, ''); });
    row.targetRate = (row.targetRate || '').replace(/[^\d.]/g, '');
    row.meal = (row.meal || 'BB').toUpperCase().slice(0, 4) || 'BB';
    return row;
  }).filter((r) => r.groupName || r.destination);
}
