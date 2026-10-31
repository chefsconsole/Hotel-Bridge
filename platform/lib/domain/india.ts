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
