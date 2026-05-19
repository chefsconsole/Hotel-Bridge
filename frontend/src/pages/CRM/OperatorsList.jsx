import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Plus, Search, Users, Mail, Phone, MapPin, TrendingUp, Pencil, Trash2,
  Download, Briefcase, X
} from 'lucide-react';
import { operatorsAPI, bookingsAPI } from '../../services/api';
import { OperatorDialog } from './OperatorDialog';
import { toast } from 'sonner';
import { exportOperatorsToCSV } from '../../utils/exportUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';

const POTENTIAL_STYLES = {
  high:   { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  low:    { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
};

export const OperatorsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [potentialFilter, setPotentialFilter] = useState('all');
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState(null);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const [opRes, bkRes] = await Promise.all([operatorsAPI.getAll(), bookingsAPI.getAll()]);
      const enriched = opRes.data.map((o) => {
        const ob = bkRes.data.filter((b) => b.operatorId === o.id);
        return {
          ...o,
          stats: {
            totalGroups: ob.length,
            totalRevenue: ob.reduce((s, b) => s + (b.totalRevenue || 0), 0),
            totalRoomNights: ob.reduce((s, b) => s + (b.rooms * b.nights), 0),
          },
        };
      });
      setOperators(enriched);
    } catch {
      toast.error('Failed to load operators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOperators(); }, []);

  const filtered = operators.filter((o) => {
    const match = o.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      || o.country.toLowerCase().includes(searchTerm.toLowerCase());
    const potOk = potentialFilter === 'all' || o.businessPotential === potentialFilter;
    return match && potOk;
  });

  const totalRevenue = operators.reduce((s, o) => s + (o.stats?.totalRevenue || 0), 0);
  const highPotential = operators.filter((o) => o.businessPotential === 'high').length;

  const handleDeleteConfirm = async () => {
    try {
      await operatorsAPI.delete(operatorToDelete.id);
      toast.success('Operator deleted');
      fetchOperators();
    } catch { toast.error('Failed to delete'); }
    finally {
      setDeleteDialogOpen(false);
      setOperatorToDelete(null);
    }
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('No operators to export');
    try {
      exportOperatorsToCSV(filtered.map(op => ({ ...op, name: op.companyName, stats: op.stats || { totalBookings: 0, totalRevenue: 0, totalRoomNights: 0 } })));
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Operators & DMCs</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">
            Your Operator Network
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-semibold text-primary">{operators.length}</span> tour operators driving group business
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { setSelectedOperator(null); setDialogOpen(true); }} className="rounded-xl btn-gold text-white border-0">
            <Plus className="w-4 h-4 mr-2" /> Add Operator
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Operators', value: operators.length, accent: 'from-blue-500 to-indigo-600' },
          { label: 'High Potential', value: highPotential, accent: 'from-green-500 to-emerald-600' },
          { label: 'Total Revenue', value: `€${totalRevenue.toLocaleString()}`, accent: 'from-secondary to-yellow-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className={`w-2 h-12 rounded-full bg-gradient-to-b ${s.accent}`} />
            <div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-serif font-bold text-primary">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by company name or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 rounded-xl border-gray-200 focus:border-secondary"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {['all', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setPotentialFilter(p)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                potentialFilter === p
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading operators…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((op) => {
            const pot = POTENTIAL_STYLES[op.businessPotential] || POTENTIAL_STYLES.low;
            const initials = op.companyName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            return (
              <div
                key={op.id}
                className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-secondary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Top */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif font-bold text-primary text-base leading-tight truncate">{op.companyName}</h3>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {op.country}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {op.type}
                  </span>
                </div>

                {/* Business potential */}
                <div className={`flex items-center justify-between mb-4 p-3 rounded-xl border ${pot.bg} ${pot.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${pot.dot} animate-pulse`} />
                    <span className="text-xs font-semibold text-gray-600">Business Potential</span>
                  </div>
                  <span className={`text-xs font-bold uppercase ${pot.text}`}>{op.businessPotential}</span>
                </div>

                {/* Performance */}
                {op.stats?.totalGroups > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/0 border border-secondary/15">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3 h-3 text-secondary" />
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Performance</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-base font-bold text-primary">{op.stats.totalGroups}</div>
                        <div className="text-[10px] text-gray-500">Groups</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-primary">€{(op.stats.totalRevenue / 1000).toFixed(0)}k</div>
                        <div className="text-[10px] text-gray-500">Revenue</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-primary">{op.stats.totalRoomNights}</div>
                        <div className="text-[10px] text-gray-500">Nights</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-1.5 text-xs mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{op.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                    {op.phone}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{op.contactPerson}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => { setSelectedOperator(op); setDialogOpen(true); }}
                    className="flex-1 py-2 rounded-xl bg-primary/5 hover:bg-primary hover:text-white text-primary text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { setOperatorToDelete(op); setDeleteDialogOpen(true); }}
                    className="w-10 h-9 rounded-xl bg-red-50 hover:bg-red-500 hover:text-white text-red-600 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !filtered.length && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No operators found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchTerm ? 'Try a different search.' : 'Add your first operator partnership.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => { setSelectedOperator(null); setDialogOpen(true); }} className="rounded-xl btn-gold text-white border-0">
              <Plus className="w-4 h-4 mr-2" /> Add Operator
            </Button>
          )}
        </div>
      )}

      <OperatorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        operator={selectedOperator}
        onSuccess={fetchOperators}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl">Delete Operator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-primary">{operatorToDelete?.companyName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="rounded-xl bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OperatorsList;
