import { useState, useEffect } from 'react';
import {
  Plus, FileText, Download, Send, Trash2, X, Eye, CheckCircle2,
  Building2, Sparkles, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInvoices, saveInvoice, updateInvoice, deleteInvoice,
  INVOICE_STATUS, COMPANY, computeTotals,
} from '../../lib/invoicesStore';
import { bookingsAPI, hotelsAPI } from '../../services/api';

const money = (n, c = '€') => `${c}${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const emptyForm = () => ({
  billTo: { name: '', company: '', email: '', address: '' },
  items: [{ description: '', qty: 1, rate: 0 }],
  taxPercent: 0,
  issueDate: today(),
  dueDate: plusDays(30),
  notes: 'Payment due within 30 days. Thank you for your partnership.',
});

export const InvoicesList = () => {
  const [invoices, setInvoices] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  // Commission calculator (excl. taxes, per hotel terms)
  const [calc, setCalc] = useState(null); // { gross, base, pct, desc } | null

  const refresh = () => setInvoices(getInvoices());
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (createOpen) {
      bookingsAPI.getAll().then((r) => setBookings((r.data || []).filter((b) => b.status === 'confirmed')));
      hotelsAPI.getAll().then((r) => setHotels(r.data || []));
    }
  }, [createOpen]);

  const totals = {
    invoiced: invoices.reduce((s, i) => s + (i.total || 0), 0),
    paid: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    outstanding: invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0),
  };

  const openNew = () => { setForm(emptyForm()); setCreateOpen(true); };

  const buildItem = (b, base, pct) => ({
    description: `Commission on "${b.groupName}" — ${b.rooms} rooms × ${b.nights} nights via ${b.operatorName} (commissionable €${(Number(base) || 0).toLocaleString()} @ ${pct}%)`,
    qty: 1,
    rate: Math.round((Number(base) || 0) * ((Number(pct) || 0) / 100) * 100) / 100,
  });

  const prefillFromBooking = (id) => {
    const b = bookings.find((x) => String(x.id) === String(id));
    if (!b) return;
    // Invoice is billed TO THE HOTEL, for our commission.
    // % comes from the specific booking's deal (varies per operator/DMC), else the hotel's default.
    const hotel = hotels.find((h) => String(h.id) === String(b.hotelId));
    const pct = b.commissionPercent ?? hotel?.commission ?? 12;
    const gross = b.totalRevenue || 0;
    setCalc({ bookingId: b.id, gross, base: gross, pct });
    setForm((f) => ({
      ...f,
      billTo: {
        name: b.hotelName || '',
        company: b.hotelName || '',
        email: hotel?.email || '',
        address: [hotel?.city, hotel?.country].filter(Boolean).join(', ') || b.destination || '',
      },
      items: [buildItem(b, gross, pct)],
    }));
  };

  // Recompute the commission line when the base (excl. taxes) or % changes
  const updateCalc = (patch) => {
    setCalc((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const b = bookings.find((x) => String(x.id) === String(next.bookingId));
      if (b) setForm((f) => ({ ...f, items: [buildItem(b, next.base, next.pct)] }));
      return next;
    });
  };

  const setItem = (idx, key, val) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { description: '', qty: 1, rate: 0 }] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const liveTotals = computeTotals(form.items, form.taxPercent);

  const handleSave = () => {
    if (!form.billTo.name && !form.billTo.company) return toast.error('Add who the invoice is billed to');
    if (!form.items.length || !form.items.some((i) => i.description)) return toast.error('Add at least one line item');
    const inv = saveInvoice(form);
    refresh();
    setCreateOpen(false);
    setPreview(inv);
    toast.success(`Invoice ${inv.number} created`);
  };

  const setStatus = (inv, status) => {
    updateInvoice(inv.id, { status });
    refresh();
    setPreview((p) => (p && p.id === inv.id ? { ...p, status } : p));
    toast.success(`Marked ${INVOICE_STATUS[status].label}`);
  };

  const handleDelete = (inv) => {
    deleteInvoice(inv.id);
    refresh();
    if (preview?.id === inv.id) setPreview(null);
    toast.success('Invoice deleted');
  };

  const handleDownload = () => window.print();

  const handleSend = (inv) => {
    // Email send activates once the mail service (Resend) is connected.
    const subject = encodeURIComponent(`Invoice ${inv.number} from ${COMPANY.name}`);
    const body = encodeURIComponent(
      `Dear ${inv.billTo.name || inv.billTo.company},\n\nPlease find attached invoice ${inv.number} for ${money(inv.total, inv.currency)}.\n\nBest regards,\n${COMPANY.name}\n${COMPANY.web}`
    );
    window.location.href = `mailto:${inv.billTo.email || ''}?subject=${subject}&body=${body}`;
    updateInvoice(inv.id, { status: 'sent' });
    refresh();
    setPreview((p) => (p ? { ...p, status: 'sent' } : p));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Billing</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">Invoices</h1>
          <p className="text-sm text-gray-500 mt-2">Generate branded commission invoices billed to your hotel partners.</p>
        </div>
        <button onClick={openNew} className="rounded-xl btn-gold text-white border-0 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Invoiced', value: money(totals.invoiced), accent: 'from-blue-500 to-indigo-600' },
          { label: 'Paid', value: money(totals.paid), accent: 'from-green-500 to-emerald-600' },
          { label: 'Outstanding', value: money(totals.outstanding), accent: 'from-secondary to-yellow-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className={`w-2 h-12 rounded-full bg-gradient-to-b ${s.accent}`} />
            <div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-serif font-bold text-primary">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <Receipt className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No invoices yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first branded invoice — prefill it straight from a confirmed booking.</p>
          <button onClick={openNew} className="rounded-xl btn-gold text-white border-0 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-br from-gray-50 to-gray-100/50">
                <tr>
                  {['Invoice', 'Billed To', 'Issued', 'Due', 'Amount', 'Status', ''].map((h) => (
                    <th key={h} className="text-left py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const st = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft;
                  return (
                    <tr key={inv.id} className="hover:bg-secondary/5 transition-colors">
                      <td className="py-4 px-5 font-serif font-bold text-primary">{inv.number}</td>
                      <td className="py-4 px-5 text-sm text-gray-700">{inv.billTo?.company || inv.billTo?.name || '—'}</td>
                      <td className="py-4 px-5 text-sm text-gray-500">{fmtDate(inv.issueDate)}</td>
                      <td className="py-4 px-5 text-sm text-gray-500">{fmtDate(inv.dueDate)}</td>
                      <td className="py-4 px-5 font-serif font-bold text-shimmer">{money(inv.total, inv.currency)}</td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setPreview(inv)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center transition-all" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(inv)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-gray-500 flex items-center justify-center transition-all" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ─────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-10 pb-10 px-4 overflow-y-auto bg-primary/40 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-serif text-xl font-bold text-primary">New Invoice</h3>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Prefill */}
              {bookings.length > 0 && (
                <div className="p-3 rounded-xl bg-secondary/5 border border-secondary/20">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3 h-3" /> Prefill from a confirmed booking (bills the hotel for your commission)
                  </label>
                  <select onChange={(e) => prefillFromBooking(e.target.value)} defaultValue="" className="w-full h-10 rounded-lg border border-gray-200 bg-white text-sm px-3 outline-none focus:border-secondary">
                    <option value="" disabled>Select a booking…</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {`${b.groupName} @ ${b.hotelName} — via ${b.operatorName} (€${(b.totalRevenue || 0).toLocaleString()})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Commission calculator (excl. taxes, per this deal's %) */}
              {calc && (
                <div className="p-4 rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Commission Calculator</div>
                  <div className="grid grid-cols-2 gap-3 items-start">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Commissionable amount (excl. taxes) €</label>
                      <input type="number" min="0" step="0.01" value={calc.base}
                        onChange={(e) => updateCalc({ base: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                      <div className="text-[10px] text-gray-400 mt-1">Booking gross: €{(calc.gross || 0).toLocaleString()} — trim taxes/city tax per the hotel's terms</div>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Commission % (this operator/DMC deal)</label>
                      <input type="number" min="0" step="0.1" value={calc.pct}
                        onChange={(e) => updateCalc({ pct: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-secondary/20">
                    <span className="text-sm text-gray-600">Your commission (invoice total)</span>
                    <span className="font-serif text-xl font-bold text-shimmer">
                      {money((Number(calc.base) || 0) * ((Number(calc.pct) || 0) / 100))}
                    </span>
                  </div>
                </div>
              )}

              {/* Bill to */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Bill To</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input placeholder="Company / Operator name" value={form.billTo.company} onChange={(e) => setForm((f) => ({ ...f, billTo: { ...f.billTo, company: e.target.value, name: e.target.value } }))} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                  <input placeholder="Contact email" value={form.billTo.email} onChange={(e) => setForm((f) => ({ ...f, billTo: { ...f.billTo, email: e.target.value } }))} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                  <input placeholder="Address / City / Country" value={form.billTo.address} onChange={(e) => setForm((f) => ({ ...f, billTo: { ...f.billTo, address: e.target.value } }))} className="sm:col-span-2 h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Issue Date</label>
                  <input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Line Items</label>
                <div className="space-y-2">
                  {form.items.map((it, i) => (
                    <div key={i} className="flex gap-2">
                      <input placeholder="Description" value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                      <input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} className="w-16 h-10 rounded-lg border border-gray-200 px-2 text-sm text-center outline-none focus:border-secondary" title="Qty" />
                      <input type="number" min="0" step="0.01" value={it.rate} onChange={(e) => setItem(i, 'rate', e.target.value)} className="w-28 h-10 rounded-lg border border-gray-200 px-2 text-sm text-right outline-none focus:border-secondary" title="Rate (€)" />
                      <button onClick={() => removeItem(i)} className="w-10 h-10 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-gray-400 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={addItem} className="mt-2 text-xs font-semibold text-secondary inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add line item</button>
              </div>

              {/* Tax + total preview */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Tax %</span>
                  <input type="number" min="0" value={form.taxPercent} onChange={(e) => setForm((f) => ({ ...f, taxPercent: e.target.value }))} className="w-16 h-9 rounded-lg border border-gray-200 px-2 text-sm text-center outline-none focus:border-secondary" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-serif text-2xl font-bold text-shimmer">{money(liveTotals.total)}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 rounded-xl btn-gold text-white text-sm font-semibold">Create Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW / PRINT MODAL ─────────────────── */}
      {preview && (
        <InvoicePreview
          inv={preview}
          onClose={() => setPreview(null)}
          onDownload={handleDownload}
          onSend={() => handleSend(preview)}
          onStatus={(s) => setStatus(preview, s)}
        />
      )}
    </div>
  );
};

/* ── Branded, print-ready invoice ─────────────────── */
function InvoicePreview({ inv, onClose, onDownload, onSend, onStatus }) {
  const c = inv.currency || '€';
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-primary/50 backdrop-blur-sm">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-paper, #invoice-paper * { visibility: visible !important; }
          #invoice-paper { position: absolute !important; left: 0; top: 0; width: 100% !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 inline-flex items-center gap-1.5"><X className="w-4 h-4" /> Close</button>
          <span className="text-sm font-serif font-bold text-primary">{inv.number}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onStatus('paid')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Mark Paid</button>
          <button onClick={onSend} className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1.5"><Send className="w-4 h-4" /> Send</button>
          <button onClick={onDownload} className="px-4 py-2 rounded-xl btn-gold text-white text-xs font-semibold inline-flex items-center gap-1.5"><Download className="w-4 h-4" /> Download PDF</button>
        </div>
      </div>

      {/* Paper */}
      <div className="flex justify-center py-8 px-4">
        <div id="invoice-paper" className="bg-white w-full max-w-[820px] rounded-lg shadow-2xl overflow-hidden">
          {/* Top band */}
          <div className="relative px-10 pt-10 pb-8" style={{ background: 'linear-gradient(135deg,#0a1f47 0%,#0c2864 60%,#081633 100%)' }}>
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full" style={{ background: 'rgba(212,175,55,0.18)', filter: 'blur(60px)' }} />
            <div className="relative z-10 flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-xl p-2 shadow-lg">
                  <img src={COMPANY.logo} alt="HotelBridge" style={{ height: 46, width: 'auto', display: 'block' }} />
                </div>
                <div className="text-white">
                  <div className="font-serif text-2xl font-bold leading-none">Hotel<span style={{ color: '#e9cf7e' }}>Bridge</span></div>
                  <div className="text-[10px] tracking-widest uppercase mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{COMPANY.location}</div>
                </div>
              </div>
              <div className="text-right text-white">
                <div className="font-serif text-3xl font-bold" style={{ color: '#e9cf7e' }}>INVOICE</div>
                <div className="text-sm mt-1">{inv.number}</div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="px-10 py-7 grid grid-cols-2 gap-8">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Billed To</div>
              <div className="font-serif text-lg font-bold text-primary">{inv.billTo?.company || inv.billTo?.name || '—'}</div>
              {inv.billTo?.email && <div className="text-sm text-gray-500">{inv.billTo.email}</div>}
              {inv.billTo?.address && <div className="text-sm text-gray-500">{inv.billTo.address}</div>}
            </div>
            <div className="text-right space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Issue Date</span><span className="text-primary font-medium">{fmtDate(inv.issueDate)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Due Date</span><span className="text-primary font-medium">{fmtDate(inv.dueDate)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Status</span><span className="font-semibold" style={{ color: inv.status === 'paid' ? '#16a34a' : '#b8891e' }}>{(INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft).label}</span></div>
            </div>
          </div>

          {/* Items */}
          <div className="px-10">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '2px solid #0a1f47' }}>
                  <th className="text-left py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Description</th>
                  <th className="text-center py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-16">Qty</th>
                  <th className="text-right py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-32">Rate</th>
                  <th className="text-right py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(inv.items || []).map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="py-3 text-sm text-gray-700">{it.description}</td>
                    <td className="py-3 text-sm text-gray-600 text-center">{it.qty}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{money(it.rate, c)}</td>
                    <td className="py-3 text-sm font-semibold text-primary text-right">{money((Number(it.qty) || 0) * (Number(it.rate) || 0), c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-10 py-6 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="text-primary">{money(inv.subtotal, c)}</span></div>
              {inv.taxPercent > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Tax ({inv.taxPercent}%)</span><span className="text-primary">{money(inv.tax, c)}</span></div>}
              <div className="flex justify-between items-center pt-3" style={{ borderTop: '2px solid #0a1f47' }}>
                <span className="font-serif font-bold text-primary">Total Due</span>
                <span className="font-serif text-2xl font-bold" style={{ color: '#b8891e' }}>{money(inv.total, c)}</span>
              </div>
            </div>
          </div>

          {/* Notes + footer */}
          <div className="px-10 pb-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</div>
            <div className="text-sm text-gray-600">{inv.notes}</div>
          </div>
          <div className="px-10 py-5 mt-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: '#f8fafc', color: '#64748b' }}>
            <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" style={{ color: '#b8891e' }} /> {COMPANY.web}</span>
            <span>{COMPANY.email}</span>
            <span>{COMPANY.phone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicesList;
