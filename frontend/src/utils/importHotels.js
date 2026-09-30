// Smart hotel-sheet importer — parses an uploaded .xlsx/.xls/.csv (any sheet count)
// and normalizes rows to the CRM hotel schema. Column headers are auto-detected in
// English or French, so it works for the LHG list and future partner sheets alike.
// Nothing partner-specific is stored in the repo — the file is read in the browser.

const strip = (s) =>
  (s == null ? '' : String(s)).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const titleCase = (v) => {
  const s = (v == null ? '' : String(v)).trim();
  if (!s) return '';
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
};

const toInt = (v) => {
  const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

const starsFrom = (v) => {
  const s = String(v ?? '');
  if (s.includes('★')) return (s.match(/★/g) || []).length;
  const m = s.match(/([1-5])/);
  return m ? parseInt(m[1], 10) : 0;
};

const truthy = (v) => {
  const s = strip(v);
  return ['oui', 'yes', 'true', 'y', '1'].includes(s) || String(v ?? '').includes('★');
};

// find the first column whose header matches any keyword (and no exclusion)
function findCol(headers, keywords, exclude = []) {
  for (let i = 0; i < headers.length; i++) {
    const h = strip(headers[i]);
    if (!h) continue;
    if (exclude.some((e) => h.includes(e))) continue;
    if (keywords.some((k) => h.includes(k))) return i;
  }
  return -1;
}

// like findCol but tests a regex (used where a short keyword like "tel" would
// otherwise collide with a substring, e.g. the "tel" inside "hotel")
function findColRe(headers, re, exclude = []) {
  for (let i = 0; i < headers.length; i++) {
    const h = strip(headers[i]);
    if (!h) continue;
    if (exclude.some((e) => h.includes(e))) continue;
    if (re.test(h)) return i;
  }
  return -1;
}

const combineName = (brand, raw) => {
  const b = (brand || '').trim();
  const r = (raw || '').trim();
  if (!r) return b;
  if (!b) return titleCase(r);
  return strip(r).includes(strip(b)) ? titleCase(r) : `${b} ${titleCase(r)}`;
};

// Parse a SheetJS workbook → array of normalized hotel objects (de-duped by name+city)
export function parseHotelWorkbook(XLSX, workbook) {
  const hotels = [];
  const seen = new Set();

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    if (!rows.length) continue;

    // header = first row that has 3+ non-empty cells
    const headerIdx = rows.findIndex((r) => r.filter((c) => String(c).trim()).length >= 3);
    if (headerIdx < 0) continue;
    const headers = rows[headerIdx].map((h) => String(h));

    const col = {
      brand: findCol(headers, ['enseigne', 'brand', 'marque']),
      name: findCol(headers, ['nom hotel', 'hotel name', 'property name', 'nom d', "nom de l"], ['nombre']),
      city: findCol(headers, ['ville', 'city', 'localite']),
      country: findCol(headers, ['pays', 'country']),
      rooms: findCol(headers, ['chambres', 'rooms', 'number of rooms']),
      stars: findCol(headers, ['classification', 'etoiles', 'star', 'rating', 'categorie']),
      email: findCol(headers, ['email', 'e-mail', 'courriel', 'mail'], ['manager', 'general', 'directeur']),
      managerEmail: findCol(headers, ['general manager', 'gm email', 'directeur', 'manager email']),
      phone: findCol(headers, ['phone', 'telephone']),
      address: findCol(headers, ['adresse1', 'adresse', 'address']),
      postal: findCol(headers, ['code postal', 'zip', 'postal']),
      website: findCol(headers, ['site web', 'website', 'url', 'web']),
      region: findCol(headers, ['region administrative', 'region']),
      restaurant: findCol(headers, ['restaurant']),
    };
    // "Tél"/"Tel …" without the word "phone" — match on a word boundary so the
    // "tel" inside "hotel" / "hôtel" is never picked up as the phone column.
    if (col.phone < 0) col.phone = findColRe(headers, /\btel/);
    // fallback: a bare "name"/"nom" column if nothing more specific matched
    if (col.name < 0) col.name = findCol(headers, ['name', 'nom', 'hotel', 'hôtel'], ['nombre', 'prenom']);
    if (col.name < 0 && col.brand < 0) continue; // this sheet has no hotel identity

    const get = (row, i) => (i >= 0 ? String(row[i] ?? '').trim() : '');

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const brand = get(row, col.brand);
      const rawName = get(row, col.name);
      if (!brand && !rawName) continue;
      const name = combineName(brand, rawName);
      if (!name) continue;

      const city = titleCase(get(row, col.city));
      const country = titleCase(get(row, col.country));
      const key = `${strip(name)}|${strip(city)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let phone = get(row, col.phone);
      if (phone && !phone.startsWith('+') && strip(country) === 'france') {
        phone = '+33 ' + phone.replace(/\D/g, '');
      }
      const ad1 = get(row, col.address);
      const cp = get(row, col.postal);

      hotels.push({
        name,
        brand,
        city,
        country,
        region: get(row, col.region),
        address: [ad1, cp].filter(Boolean).join(', '),
        postalCode: cp,
        rooms: toInt(get(row, col.rooms)),
        starCategory: starsFrom(get(row, col.stars)),
        restaurant: col.restaurant >= 0 ? truthy(get(row, col.restaurant)) : false,
        email: get(row, col.email).toLowerCase(),
        managerEmail: get(row, col.managerEmail).toLowerCase(),
        phone,
        website: get(row, col.website),
        contractType: 'commission',
        commission: 8,
        status: 'active',
        contactPerson: '',
        source: sheetName,
      });
    }
  }
  return hotels;
}

// Read a File object → SheetJS workbook → normalized hotels (xlsx is loaded on demand)
export async function parseHotelFile(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  return parseHotelWorkbook(XLSX, wb);
}
