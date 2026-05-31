import { useState, useEffect } from 'react';
import {
  Inbox, Mail, Phone, Building2, MessageSquare, Search,
  Star, Trash2, X, Filter, ExternalLink, Calendar
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { getLeads, updateLead, deleteLead, LEAD_STATUSES, LEAD_SOURCES } from '../../lib/leadsStore';

const formatRelative = (iso) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const LeadsList = () => {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const refresh = () => setLeads(getLeads());
  useEffect(() => { refresh(); }, []);

  const filtered = leads.filter((l) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      (l.name || '').toLowerCase().includes(search) ||
      (l.email || '').toLowerCase().includes(search) ||
      (l.company || '').toLowerCase().includes(search) ||
      (l.message || '').toLowerCase().includes(search);
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    closed: leads.filter((l) => l.status === 'closed').length,
  };

  const handleStatus = (id, status) => {
    updateLead(id, { status });
    refresh();
    if (selected?.id === id) setSelected({ ...selected, status });
    toast.success(`Lead marked as ${LEAD_STATUSES[status].label}`);
  };

  const handleStar = (id, starred) => {
    updateLead(id, { starred: !starred });
    refresh();
    if (selected?.id === id) setSelected({ ...selected, starred: !starred });
  };

  const handleDelete = (id) => {
    deleteLead(id);
    refresh();
    if (selected?.id === id) setSelected(null);
    toast.success('Lead deleted');
  };

  const handleNoteChange = (id, notes) => {
    updateLead(id, { notes });
    refresh();
    if (selected?.id === id) setSelected({ ...selected, notes });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Leads</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">
            Inbox
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Every enquiry from your website lands here — newsletter signups, contact forms, and more.
          </p>
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-primary">{leads.length}</span> total enquiries
        </div>
      </div>

      {/* Status pills with counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'all', label: 'All', accent: 'from-gray-500 to-gray-700' },
          { key: 'new', label: 'New', accent: 'from-blue-500 to-indigo-600' },
          { key: 'contacted', label: 'Contacted', accent: 'from-yellow-500 to-amber-600' },
          { key: 'qualified', label: 'Qualified', accent: 'from-purple-500 to-pink-500' },
          { key: 'closed', label: 'Closed', accent: 'from-green-500 to-emerald-600' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`bg-white rounded-2xl p-4 border flex items-center gap-3 text-left transition-all ${
              statusFilter === s.key ? 'border-secondary shadow-md' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className={`w-2 h-12 rounded-full bg-gradient-to-b ${s.accent}`} />
            <div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-2xl font-serif font-bold text-primary tabular-nums">{counts[s.key]}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, email, company, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 rounded-xl border-gray-200 focus:border-secondary"
          />
        </div>
      </div>

      {/* Empty state */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <Inbox className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No leads yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            When someone submits a contact form, signs up for the newsletter, or pings via WhatsApp — they will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-sm text-gray-500">No leads match your filters.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">

          {/* List */}
          <div className="lg:col-span-3 space-y-2">
            {filtered.map((lead) => {
              const status = LEAD_STATUSES[lead.status] || LEAD_STATUSES.new;
              const isActive = selected?.id === lead.id;
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className={`w-full text-left bg-white rounded-2xl p-4 border transition-all ${
                    isActive
                      ? 'border-secondary shadow-lg ring-2 ring-secondary/20'
                      : 'border-gray-100 hover:border-secondary/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {(lead.name?.[0] || lead.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-semibold text-primary text-sm truncate">
                          {lead.name || lead.email || 'Anonymous'}
                          {lead.starred && <Star className="inline w-3 h-3 text-secondary fill-secondary ml-1" />}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatRelative(lead.createdAt)}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate mb-1">
                        {lead.company ? `${lead.company} · ` : ''}{lead.email}
                      </div>
                      <div className="text-xs text-gray-400 line-clamp-1 mb-2">
                        {lead.message || lead.reason || 'No message'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          via {LEAD_SOURCES[lead.source] || lead.source}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
            {selected ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {(selected.name?.[0] || selected.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif font-bold text-primary text-base leading-tight truncate">
                        {selected.name || 'Anonymous'}
                      </h3>
                      {selected.company && (
                        <div className="text-xs text-gray-500 truncate">{selected.company}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">{formatRelative(selected.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStar(selected.id, selected.starred)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-secondary/10 text-gray-500 hover:text-secondary flex items-center justify-center transition-colors"
                      title={selected.starred ? 'Unstar' : 'Star'}
                    >
                      <Star className={`w-3.5 h-3.5 ${selected.starred ? 'text-secondary fill-secondary' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(selected.id)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-red-600 flex items-center justify-center transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status changer */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Status</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LEAD_STATUSES).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => handleStatus(selected.id, key)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          selected.status === key ? s.color : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact actions */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Contact</div>
                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}`}
                      className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-secondary/5 text-sm text-primary transition-colors group"
                    >
                      <Mail className="w-4 h-4 text-secondary" />
                      <span className="flex-1 truncate">{selected.email}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-secondary" />
                    </a>
                  )}
                  {selected.phone && (
                    <a
                      href={`tel:${selected.phone}`}
                      className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-secondary/5 text-sm text-primary transition-colors group"
                    >
                      <Phone className="w-4 h-4 text-secondary" />
                      <span className="flex-1 truncate">{selected.phone}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-secondary" />
                    </a>
                  )}
                  {selected.reason && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 text-sm text-gray-600">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{selected.reason}</span>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Message
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 italic border border-gray-100">
                    "{selected.message || 'No message'}"
                  </div>
                </div>

                {/* Internal notes */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Internal Notes</div>
                  <textarea
                    value={selected.notes || ''}
                    onChange={(e) => handleNoteChange(selected.id, e.target.value)}
                    placeholder="Add internal notes…"
                    rows={4}
                    className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
                  />
                </div>

                {/* Source meta */}
                <div className="pt-3 border-t border-gray-50 text-xs text-gray-400 flex items-center justify-between">
                  <span>Source: <strong className="text-gray-600">{LEAD_SOURCES[selected.source] || selected.source}</strong></span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(selected.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Select a lead to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsList;
