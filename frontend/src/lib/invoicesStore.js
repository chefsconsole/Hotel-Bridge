// localStorage-backed invoices — branded commission invoices for hotels/DMCs
// Swaps to Supabase later with the same interface.

const KEY = 'hotelbridge.crm.invoices';
const SEQ_KEY = 'hotelbridge.crm.invoiceSeq';

export const COMPANY = {
  name: 'HotelBridge',
  tagline: 'Connecting Hotels with the World’s Group Travel Markets',
  email: 'info@hotelbridge.co',
  phone: '+91 70216 20577',
  web: 'hotelbridge.co',
  location: 'Global · Mumbai HQ',
  logo: '/hotelbridge-logo.png',
};

// Bank details shown on invoices (where the hotel pays your commission).
// Editable in the app (Invoices → Bank details) and stored per-browser.
export const DEFAULT_BANK = {
  accountName: 'HotelBridge',
  bankName: '',
  accountNumber: '',
  iban: '',
  swift: '',
  ref: 'Please quote the invoice number as payment reference.',
  accountantEmail: '', // your CA — auto-CC'd on sends & used for the accounting export
};
const BANK_KEY = 'hotelbridge.crm.bank';
export function getBank() {
  try { return { ...DEFAULT_BANK, ...JSON.parse(localStorage.getItem(BANK_KEY) || '{}') }; }
  catch { return { ...DEFAULT_BANK }; }
}
export function saveBank(bank) {
  try { localStorage.setItem(BANK_KEY, JSON.stringify(bank)); } catch { /* ignore */ }
  return getBank();
}

export const INVOICE_STATUS = {
  draft: { label: 'Draft',    color: 'bg-gray-100 text-gray-600 border-gray-200',    dot: 'bg-gray-400'   },
  sent:  { label: 'Sent',     color: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500'   },
  paid:  { label: 'Paid',     color: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-500'  },
  overdue:{ label: 'Overdue', color: 'bg-red-50 text-red-600 border-red-200',         dot: 'bg-red-500'    },
};

export function getInvoices() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function nextNumber() {
  let seq = 0;
  try { seq = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10) || 0; } catch { seq = 0; }
  seq += 1;
  try { localStorage.setItem(SEQ_KEY, String(seq)); } catch { /* ignore */ }
  const year = new Date().getFullYear();
  return `HB-${year}-${String(seq).padStart(4, '0')}`;
}

export function computeTotals(items, taxPercent = 0) {
  const subtotal = (items || []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const tax = subtotal * ((Number(taxPercent) || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function saveInvoice(data) {
  const list = getInvoices();
  const { subtotal, tax, total } = computeTotals(data.items, data.taxPercent);
  const inv = {
    id: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    number: nextNumber(),
    status: 'draft',
    createdAt: new Date().toISOString(),
    currency: '€',
    taxPercent: 0,
    notes: 'Payment due within 30 days. Thank you for your partnership.',
    ...data,
    subtotal, tax, total,
  };
  writeAll([inv, ...list]);
  return inv;
}

export function updateInvoice(id, patch) {
  const list = getInvoices().map((x) => {
    if (x.id !== id) return x;
    const merged = { ...x, ...patch };
    const { subtotal, tax, total } = computeTotals(merged.items, merged.taxPercent);
    return { ...merged, subtotal, tax, total };
  });
  writeAll(list);
  return getInvoices().find((x) => x.id === id);
}

export function deleteInvoice(id) {
  writeAll(getInvoices().filter((x) => x.id !== id));
}

// Record a (partial or full) payment against an invoice
export function recordPayment(id, amount) {
  const list = getInvoices().map((x) => {
    if (x.id !== id) return x;
    const paid = Math.max(0, (Number(x.amountPaid) || 0) + (Number(amount) || 0));
    const status = paid >= (x.total || 0) && x.total > 0 ? 'paid' : x.status;
    return { ...x, amountPaid: paid, status };
  });
  writeAll(list);
  return getInvoices().find((x) => x.id === id);
}

// Days overdue (0 if not overdue / paid)
export function daysOverdue(inv) {
  if (!inv || inv.status === 'paid' || !inv.dueDate) return 0;
  const diff = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 864e5);
  return diff > 0 ? diff : 0;
}
