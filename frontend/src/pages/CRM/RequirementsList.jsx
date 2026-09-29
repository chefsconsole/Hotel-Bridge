import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Trash2, ClipboardList, Sparkles, Upload, ChevronDown, ChevronUp,
  MapPin, Calendar, Users, BedDouble, Building2, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getRequirements, saveRequirement, saveRequirementsBulk, updateRequirement,
  deleteRequirement, parseSpreadsheet, RFQ_STATUS, OFFER_STATUS,
} from '../../lib/requirementsStore';
import { bookingsAPI, operatorsAPI } from '../../services/api';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const num = (n) => (Number(String(n).replace(/[^\d.]/g, '')) || 0);

const emptyReq = () => ({
  groupName: '', operatorName: '', destination: '', checkIn: '', nights: '',
  pax: '', rooms: '', meal: 'BB', targetRate: '', status: 'new', notes: '',
});

export const RequirementsList = () => {
  const navigate = useNavigate();
  const [reqs, setReqs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(emptyReq());
  const [importText, setImportText] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [offerDraft, setOfferDraft] = useState({ hotelName: '', rate: '', meal: 'BB', status: 'waiting' });
  const [operators, setOperators] = useState([]);
  const [opAdd, setOpAdd] = useState(false);
  const [opDraft, setOpDraft] = useState({ companyName: '', country: '', type: 'DMC' });

  const refresh = () => setReqs(getRequirements());
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (createOpen) operatorsAPI.getAll().then((r) => setOperators(r.data || [])); }, [createOpen]);

  const saveQuickOperator = async () => {
    if (!opDraft.companyName.trim()) return toast.error('Enter operator name');
    try {
      const res = await operatorsAPI.create({
        companyName: opDraft.companyName.trim(), contactPerson: '', country: opDraft.country.trim(),
        type: opDraft.type, email: '', phone: '', businessPotential: 'medium', notes: '',
      });
      const list = (await operatorsAPI.getAll()).data;
      setOperators(list);
      setForm((f) => ({ ...f, operatorName: res.data.companyName }));
      setOpAdd(false);
      setOpDraft({ companyName: '', country: '', type: 'DMC' });
      toast.success(`${res.data.companyName} added & selected`);
    } catch { toast.error('Failed to add operator'); }
  };

  const filtered = filter === 'all' ? reqs : reqs.filter((r) => r.status === filter);
  const open = reqs.filter((r) => !['won', 'lost'].includes(r.status));
  const totals = {
    open: open.length,
    groups: reqs.length,
    rooms: reqs.reduce((s, r) => s + num(r.rooms), 0),
    pax: reqs.reduce((s, r) => s + num(r.pax), 0),
  };

  const handleCreate = () => {
    if (!form.groupName && !form.destination) return toast.error('Add a group name or destination');
    saveRequirement(form);
    refresh();
    setCreateOpen(false);
    setForm(emptyReq());
    toast.success('Requirement added');
  };

  const importPreview = importText.trim() ? parseSpreadsheet(importText) : [];
  const handleImport = () => {
    if (!importPreview.length) return toast.error('Nothing to import — paste your rows first');
    saveRequirementsBulk(importPreview);
    refresh();
    setImportOpen(false);
    setImportText('');
    toast.success(`${importPreview.length} requirements imported`);
  };

  const setStatus = (r, status) => { updateRequirement(r.id, { status }); refresh(); };
  const remove = (r) => { deleteRequirement(r.id); refresh(); toast.success('Removed'); };

  const addOffer = (r) => {
    if (!offerDraft.hotelName.trim()) return toast.error('Enter a hotel name');
    const offers = [...(r.offers || []), { ...offerDraft, id: Date.now().toString(36) }];
    updateRequirement(r.id, { offers, status: r.status === 'new' ? 'sourcing' : r.status });
    refresh();
    setOfferDraft({ hotelName: '', rate: '', meal: 'BB', status: 'waiting' });
    toast.success('Hotel option added');
  };
  const updateOffer = (r, oid, patch) => {
    updateRequirement(r.id, { offers: (r.offers || []).map((o) => (o.id === oid ? { ...o, ...patch } : o)) });
    refresh();
  };
  const removeOffer = (r, oid) => {
    updateRequirement(r.id, { offers: (r.offers || []).filter((o) => o.id !== oid) });
    refresh();
  };

  // Contract a requirement → create a confirmed Booking from the winning hotel offer
  const contractToBooking = async (r) => {
    const offers = r.offers || [];
    const winner = offers.find((o) => o.status === 'confirmed')
      || offers.find((o) => o.status === 'shortlisted')
      || offers[0];
    if (!winner) return toast.error('Add a hotel option first, then contract it');
    const nights = num(r.nights) || 1;
    const checkOut = r.checkIn
      ? new Date(new Date(r.checkIn).getTime() + nights * 864e5).toISOString().slice(0, 10)
      : '';
    try {
      await bookingsAPI.create({
        groupName: r.groupName || 'Group',
        operatorId: '', operatorName: r.operatorName || '',
        destination: r.destination || '',
        hotelId: '', hotelName: winner.hotelName || '',
        checkIn: r.checkIn || '', checkOut,
        nights, rooms: num(r.rooms) || 0,
        ratePerRoom: num(winner.rate) || 0,
        status: 'confirmed',
        notes: `Contracted from ${r.ref}`,
      });
      updateRequirement(r.id, { status: 'won' });
      refresh();
      toast.success(`Contracted → booking created at ${winner.hotelName}`);
      navigate('/crm/bookings');
    } catch {
      toast.error('Could not create booking');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Sourcing</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">Requirements &amp; RFQs</h1>
          <p className="text-sm text-gray-500 mt-2">Group &amp; series requirements from operators — source hotels and track every quote in one place.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="rounded-xl border border-gray-200 text-gray-600 hover:border-primary hover:text-primary px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import from Excel
          </button>
          <button onClick={() => { setForm(emptyReq()); setCreateOpen(true); }} className="rounded-xl btn-gold text-white border-0 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Requirement
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open RFQs', value: totals.open, accent: 'from-blue-500 to-indigo-600' },
          { label: 'Total Groups', value: totals.groups, accent: 'from-secondary to-yellow-500' },
          { label: 'Total Rooms', value: totals.rooms.toLocaleString(), accent: 'from-purple-500 to-pink-500' },
          { label: 'Total Pax', value: totals.pax.toLocaleString(), accent: 'from-green-500 to-emerald-600' },
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

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...Object.keys(RFQ_STATUS)].map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${filter === k ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
            {k === 'all' ? 'All' : RFQ_STATUS[k].label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <ClipboardList className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No requirements yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add one, or paste a whole series from Excel (50–100 groups at once).</p>
          <button onClick={() => setImportOpen(true)} className="rounded-xl btn-gold text-white border-0 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import from Excel
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const st = RFQ_STATUS[r.status] || RFQ_STATUS.new;
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 hover:border-secondary/30 transition-all">
                {/* Row */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md">{r.ref}</span>
                        <h3 className="font-serif text-lg font-bold text-primary truncate">{r.groupName || 'Untitled group'}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${st.color} inline-flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {r.operatorName && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{r.operatorName}</span>}
                        {r.destination && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{r.destination}</span>}
                        {r.checkIn && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(r.checkIn)}{r.nights ? ` · ${r.nights}n` : ''}</span>}
                        {r.pax && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{r.pax} pax</span>}
                        {r.rooms && <span className="inline-flex items-center gap-1"><BedDouble className="w-3 h-3" />{r.rooms} rooms · {r.meal}</span>}
                        {r.targetRate && <span className="text-secondary font-semibold">target €{r.targetRate}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select value={r.status} onChange={(e) => setStatus(r, e.target.value)}
                        className="h-8 rounded-lg border border-gray-200 bg-white text-xs px-2 outline-none focus:border-secondary">
                        {Object.entries(RFQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button onClick={() => setExpanded(isOpen ? null : r.id)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center" title="Hotel options">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => remove(r)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-gray-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {(r.offers?.length > 0) && !isOpen && (
                    <div className="mt-2 text-xs text-gray-400">{r.offers.length} hotel option{r.offers.length > 1 ? 's' : ''} · click to view</div>
                  )}
                </div>

                {/* Expanded: hotel offers matrix */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hotel Options / Quotes</div>
                    {(r.offers || []).length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {r.offers.map((o) => {
                          const os = OFFER_STATUS[o.status] || OFFER_STATUS.waiting;
                          return (
                            <div key={o.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                              <span className="flex-1 font-medium text-primary truncate">{o.hotelName}</span>
                              <span className="text-gray-600">{o.rate ? `€${o.rate}` : '—'}</span>
                              <span className="text-gray-400 text-xs">{o.meal}</span>
                              <select value={o.status} onChange={(e) => updateOffer(r, o.id, { status: e.target.value })}
                                className={`text-[10px] font-semibold rounded-md px-2 py-1 border-0 ${os.color}`}>
                                {Object.entries(OFFER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                              <button onClick={() => removeOffer(r, o.id)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Add offer */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <input placeholder="Hotel name" value={offerDraft.hotelName} onChange={(e) => setOfferDraft({ ...offerDraft, hotelName: e.target.value })}
                        className="flex-1 min-w-[140px] h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                      <input placeholder="Rate €" value={offerDraft.rate} onChange={(e) => setOfferDraft({ ...offerDraft, rate: e.target.value })}
                        className="w-24 h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                      <select value={offerDraft.meal} onChange={(e) => setOfferDraft({ ...offerDraft, meal: e.target.value })}
                        className="w-20 h-9 rounded-lg border border-gray-200 bg-white text-sm px-2 outline-none focus:border-secondary">
                        {['RO', 'BB', 'HB', 'FB', 'AI'].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <button onClick={() => addOffer(r)} className="h-9 px-4 rounded-lg btn-gold text-white text-sm font-semibold">Add option</button>
                    </div>
                    {(r.offers?.length > 0) && r.status !== 'won' && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Won this? Contract the confirmed/shortlisted hotel into a booking.</span>
                        <button onClick={() => contractToBooking(r)}
                          className="h-9 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold inline-flex items-center gap-1.5">
                          Contract → Booking <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NEW REQUIREMENT MODAL ─────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-10 pb-10 px-4 overflow-y-auto bg-primary/40 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-serif text-xl font-bold text-primary">New Requirement</h3>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <input placeholder="Group name" value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} className="col-span-2 h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
              <div>
                {opAdd ? (
                  <div className="p-2.5 rounded-xl border border-secondary/40 bg-secondary/5 space-y-2">
                    <input autoFocus placeholder="Operator / DMC name *" value={opDraft.companyName}
                      onChange={(e) => setOpDraft({ ...opDraft, companyName: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveQuickOperator(); } }}
                      className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Country" value={opDraft.country} onChange={(e) => setOpDraft({ ...opDraft, country: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-secondary" />
                      <select value={opDraft.type} onChange={(e) => setOpDraft({ ...opDraft, type: e.target.value })} className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-secondary">
                        <option value="DMC">DMC</option><option value="operator">Operator</option><option value="agent">Agent</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={saveQuickOperator} className="h-8 px-3 rounded-lg btn-gold text-white text-xs font-semibold">Add &amp; Select</button>
                      <button type="button" onClick={() => setOpAdd(false)} className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-600">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <select value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} className="flex-1 h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-secondary">
                      <option value="">Operator / DMC…</option>
                      {operators.map((o) => <option key={o.id} value={o.companyName}>{o.companyName}</option>)}
                    </select>
                    <button type="button" onClick={() => setOpAdd(true)} title="Add new operator" className="h-11 px-3 rounded-xl border border-gray-200 text-secondary hover:border-secondary text-sm font-semibold whitespace-nowrap">+ New</button>
                  </div>
                )}
              </div>
              <input placeholder="Destination / City" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
              <div><label className="text-[11px] text-gray-500">Check-in</label><input type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" /></div>
              <input placeholder="Nights" value={form.nights} onChange={(e) => setForm({ ...form, nights: e.target.value })} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary self-end" />
              <input placeholder="Pax" value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
              <input placeholder="Rooms" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
              <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-secondary">
                {['RO', 'BB', 'HB', 'FB', 'AI'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input placeholder="Target rate €" value={form.targetRate} onChange={(e) => setForm({ ...form, targetRate: e.target.value })} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-secondary" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-secondary resize-none" />
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl btn-gold text-white text-sm font-semibold">Add Requirement</button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ─────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-10 pb-10 px-4 overflow-y-auto bg-primary/40 backdrop-blur-sm" onClick={() => setImportOpen(false)}>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2"><Sparkles className="w-5 h-5 text-secondary" /> Import from Excel</h3>
              <button onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-gray-500">
                Copy rows straight from your Excel sheet and paste below. Columns (any order if you include a header row):
                <span className="font-semibold text-gray-700"> Group · Operator · Destination · Check-in · Nights · Pax · Rooms · Meal · Target</span>
              </p>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8}
                placeholder={"Paste here…\ne.g.\nMunich Series 1\tAtlas Voyages\tMunich\t2026-10-14\t3\t48\t25\tBB\t82\nParis Group\tGlobal Tours\tParis\t2026-11-02\t4\t60\t30\tHB\t120"}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-secondary resize-none" />
              {importText.trim() && (
                <div className="rounded-xl bg-secondary/5 border border-secondary/20 p-3">
                  <div className="text-xs font-semibold text-secondary mb-1">{importPreview.length} requirement{importPreview.length !== 1 ? 's' : ''} detected</div>
                  <div className="max-h-32 overflow-y-auto text-xs text-gray-600 space-y-0.5">
                    {importPreview.slice(0, 8).map((r, i) => (
                      <div key={i} className="truncate">• {r.groupName || '(no name)'} — {r.destination || '—'} · {r.rooms || '?'} rooms · {r.pax || '?'} pax</div>
                    ))}
                    {importPreview.length > 8 && <div className="text-gray-400">…and {importPreview.length - 8} more</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setImportOpen(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleImport} className="px-5 py-2 rounded-xl btn-gold text-white text-sm font-semibold">Import {importPreview.length || ''}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsList;
