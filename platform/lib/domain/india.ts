/* ------------------------------------------------------------------ *
 * Indian business identifiers. Pure checks — they prove a number is
 * well-formed, not that it belongs to the agency. A person still looks at
 * the uploaded PAN card before an agency is approved.
 * ------------------------------------------------------------------ */

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const normaliseId = (s: string) => s.replace(/\s+/g, '').toUpperCase();

export function isPan(s: string): boolean {
  return PAN.test(normaliseId(s));
}

/** GSTIN: 2-digit state code + the holder's PAN + entity no. + 'Z' + check character. */
export function isGstin(s: string): boolean {
  const g = normaliseId(s);
  if (!GSTIN.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = B36.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return B36[(36 - (sum % 36)) % 36] === g[14];
}

/** Characters 3–12 of a GSTIN are the holder's PAN. */
export function gstinMatchesPan(gstin: string, pan: string): boolean {
  return normaliseId(gstin).slice(2, 12) === normaliseId(pan);
}

const STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

export function gstinState(gstin: string): string | null {
  return STATES[normaliseId(gstin).slice(0, 2)] ?? null;
}

export const isIndia = (country: string | null | undefined) => /^(india|in|bharat)$/i.test((country ?? '').trim());

/** What the file really is, from its first bytes — never trust the name or the browser. */
export function sniffDocument(bytes: Uint8Array): 'application/pdf' | 'image/png' | 'image/jpeg' | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return 'application/pdf'; // %PDF
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png';
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  return null;
}

/* ----------------------- form helpers (registration) ----------------------- */

export const INDIAN_STATES = [...new Set(Object.values(STATES))].sort();

/** Where Indian travel agencies are — city → state. */
export const INDIAN_CITIES: Record<string, string> = {
  Mumbai: 'Maharashtra', Pune: 'Maharashtra', Nagpur: 'Maharashtra', Nashik: 'Maharashtra', Thane: 'Maharashtra', 'Navi Mumbai': 'Maharashtra', Aurangabad: 'Maharashtra', Kolhapur: 'Maharashtra',
  Delhi: 'Delhi', 'New Delhi': 'Delhi', Noida: 'Uttar Pradesh', Gurugram: 'Haryana', Gurgaon: 'Haryana', Faridabad: 'Haryana', Ghaziabad: 'Uttar Pradesh',
  Bengaluru: 'Karnataka', Bangalore: 'Karnataka', Mysuru: 'Karnataka', Mysore: 'Karnataka', Mangaluru: 'Karnataka', Hubballi: 'Karnataka',
  Chennai: 'Tamil Nadu', Coimbatore: 'Tamil Nadu', Madurai: 'Tamil Nadu', Tiruchirappalli: 'Tamil Nadu', Salem: 'Tamil Nadu',
  Hyderabad: 'Telangana', Secunderabad: 'Telangana', Warangal: 'Telangana', Visakhapatnam: 'Andhra Pradesh', Vijayawada: 'Andhra Pradesh', Tirupati: 'Andhra Pradesh',
  Kolkata: 'West Bengal', Siliguri: 'West Bengal', Durgapur: 'West Bengal', Howrah: 'West Bengal',
  Ahmedabad: 'Gujarat', Surat: 'Gujarat', Vadodara: 'Gujarat', Rajkot: 'Gujarat', Gandhinagar: 'Gujarat', Bhavnagar: 'Gujarat',
  Jaipur: 'Rajasthan', Udaipur: 'Rajasthan', Jodhpur: 'Rajasthan', Kota: 'Rajasthan', Ajmer: 'Rajasthan', Bikaner: 'Rajasthan',
  Lucknow: 'Uttar Pradesh', Kanpur: 'Uttar Pradesh', Agra: 'Uttar Pradesh', Varanasi: 'Uttar Pradesh', Prayagraj: 'Uttar Pradesh', Meerut: 'Uttar Pradesh',
  Chandigarh: 'Chandigarh', Ludhiana: 'Punjab', Amritsar: 'Punjab', Jalandhar: 'Punjab', Mohali: 'Punjab', Patiala: 'Punjab',
  Bhopal: 'Madhya Pradesh', Indore: 'Madhya Pradesh', Gwalior: 'Madhya Pradesh', Jabalpur: 'Madhya Pradesh', Ujjain: 'Madhya Pradesh',
  Patna: 'Bihar', Gaya: 'Bihar', Ranchi: 'Jharkhand', Jamshedpur: 'Jharkhand', Dhanbad: 'Jharkhand',
  Bhubaneswar: 'Odisha', Cuttack: 'Odisha', Puri: 'Odisha', Raipur: 'Chhattisgarh', Bilaspur: 'Chhattisgarh',
  Kochi: 'Kerala', Thiruvananthapuram: 'Kerala', Kozhikode: 'Kerala', Thrissur: 'Kerala', Kottayam: 'Kerala',
  Guwahati: 'Assam', Dibrugarh: 'Assam', Shillong: 'Meghalaya', Gangtok: 'Sikkim', Imphal: 'Manipur', Agartala: 'Tripura', Aizawl: 'Mizoram', Kohima: 'Nagaland', Itanagar: 'Arunachal Pradesh',
  Dehradun: 'Uttarakhand', Haridwar: 'Uttarakhand', Rishikesh: 'Uttarakhand', Nainital: 'Uttarakhand', Haldwani: 'Uttarakhand',
  Shimla: 'Himachal Pradesh', Manali: 'Himachal Pradesh', Dharamshala: 'Himachal Pradesh',
  Srinagar: 'Jammu & Kashmir', Jammu: 'Jammu & Kashmir', Leh: 'Ladakh',
  Panaji: 'Goa', Margao: 'Goa', Vasco: 'Goa', Goa: 'Goa', Puducherry: 'Puducherry', 'Port Blair': 'Andaman & Nicobar Islands',
};

/** Countries agencies register from, with the currency they are usually billed in. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  India: 'INR', 'United Arab Emirates': 'AED', Thailand: 'THB', Singapore: 'SGD', 'United Kingdom': 'GBP', Switzerland: 'CHF',
  'United States': 'USD', Germany: 'EUR', France: 'EUR', Italy: 'EUR', Netherlands: 'EUR', Spain: 'EUR', Austria: 'EUR', Belgium: 'EUR', Ireland: 'EUR', Portugal: 'EUR', Greece: 'EUR',
  Nepal: 'USD', 'Sri Lanka': 'USD', Bangladesh: 'USD', Maldives: 'USD', Oman: 'USD', Qatar: 'USD', 'Saudi Arabia': 'USD', Kuwait: 'USD', Bahrain: 'USD',
  Malaysia: 'USD', Indonesia: 'USD', Vietnam: 'USD', Australia: 'USD', Canada: 'USD', 'South Africa': 'USD', Kenya: 'USD', Mauritius: 'USD',
};

const PAN_HOLDER: Record<string, string> = { C: 'Company', F: 'Firm / LLP', P: 'Individual', H: 'HUF', A: 'Association of persons', T: 'Trust', B: 'Body of individuals', L: 'Local authority', J: 'Artificial juridical person', G: 'Government' };


/** "Company PAN", "Individual PAN"… from the 4th character, or null if not a valid PAN. */
export function panHolder(pan: string): string | null {
  const p = pan.trim().toUpperCase();
  return PAN.test(p) ? `${PAN_HOLDER[p[3]] ?? 'Valid'} PAN` : null;
}

/** PAN and state from a GSTIN (its characters 3–12 are the PAN; the first two the state). */
export function fromGstin(gstin: string): { pan: string; state: string | null } | null {
  const g = normaliseId(gstin);
  if (!isGstin(g)) return null; // includes the check-character test
  return { pan: g.slice(2, 12), state: gstinState(g) };
}

/** Case-insensitive city → state, for Indian cities. */
export function stateForCity(city: string): string | null {
  const c = city.trim().toLowerCase();
  const hit = Object.keys(INDIAN_CITIES).find((k) => k.toLowerCase() === c);
  return hit ? INDIAN_CITIES[hit] : null;
}

const DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'rediffmail.com', 'icloud.com', 'live.com'];
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** "ravi@gmial.com" → "ravi@gmail.com". Null when the domain looks fine. */
export function emailTypoFix(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m || DOMAINS.includes(m[2])) return null;
  const best = DOMAINS.map((d) => ({ d, n: distance(m[2], d) })).sort((x, y) => x.n - y.n)[0];
  return best.n > 0 && best.n <= 2 ? `${m[1]}@${best.d}` : null;
}

/** Indian mobile numbers written without a country code get +91. */
export function normalisePhone(phone: string, country: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (country.trim().toLowerCase() === 'india' && /^[6-9]\d{9}$/.test(digits)) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (country.trim().toLowerCase() === 'india' && /^0[6-9]\d{9}$/.test(digits)) return `+91 ${digits.slice(1, 6)} ${digits.slice(6)}`;
  return phone;
}
