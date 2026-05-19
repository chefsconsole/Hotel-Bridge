import { useState, useEffect } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Search, DollarSign, Calendar, TrendingUp, Download, Clock, CheckCircle2,
  ArrowUpRight, Sparkles, X
} from 'lucide-react';
import { commissionsAPI, bookingsAPI } from '../../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportRevenueToCSV } from '../../utils/exportUtils';

export const RevenueList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const [bookingsRes, commissionsRes] = await Promise.all([
        bookingsAPI.getAll(), commissionsAPI.getAll(),
      ]);
      const map = {};
      commissionsRes.data.forEach((c) => { map[c.bookingId] = c; });
      const all = bookingsRes.data
        .filter((b) => b.status === 'confirmed')
        .map((booking) => {
          if (map[booking.id]) return map[booking.id];
          const marginPerRoom = booking.ratePerRoom * 0.20;
          const totalMargin = marginPerRoom * booking.rooms * booking.nights;
          const commissionAmount = booking.totalRevenue * 0.12;
          return {
            id: `virtual-${booking.id}`,
            bookingId: booking.id,
            groupName: booking.groupName,
            totalBookingValue: booking.totalRevenue,
            marginPerRoom,
            totalMargin,
            commissionPercent: 12,
            commissionAmount,
            paymentStatus: 'pending',
            paymentDueDate: booking.checkOut,
            paidDate: null,
          };
        });
      setCommissions(all);
    } catch { toast.error('Failed to load commission data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCommissions(); }, []);

  const filtered = commissions.filter((c) => {
    const match = c.groupName.toLowerCase().includes(searchTerm.toLowerCase());
    const ok = statusFilter === 'all' || c.paymentStatus === statusFilter;
    return match && ok;
  });

  const totals = {
    totalBookingValue: commissions.reduce((s, c) => s + c.totalBookingValue, 0),
    totalCommission: commissions.reduce((s, c) => s + c.commissionAmount, 0),
    received: commissions.filter((c) => c.paymentStatus === 'received').reduce((s, c) => s + c.commissionAmount, 0),
    pending: commissions.filter((c) => c.paymentStatus === 'pending').reduce((s, c) => s + c.commissionAmount, 0),
  };
  const collectionRate = totals.totalCommission > 0 ? Math.round((totals.received / totals.totalCommission) * 100) : 0;

  const handleExport = () => {
    if (!filtered.length) return toast.error('No data to export');
    try { exportRevenueToCSV(filtered); toast.success('Exported'); }
    catch { toast.error('Export failed'); }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin mx-auto" />
        <p className="mt-4 text-gray-500 text-sm">Loading revenue data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Revenue & Commission</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">
            Financial Overview
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Track margins, commissions, and payment status across all confirmed bookings
          </p>
        </div>
        <Button onClick={handleExport} className="rounded-xl btn-gold text-white border-0">
          <Download className="w-4 h-4 mr-2" /> Export Report
        </Button>
      </div>

      {/* Big revenue card + sub stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Hero card */}
        <div className="lg:col-span-1 relative overflow-hidden rounded-3xl p-6 cta-gradient text-white">
          <div className="orb w-48 h-48 bg-secondary/20 -top-10 -right-10" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-300 px-2 py-1 rounded-full glass mb-4">
              <Sparkles className="w-3 h-3" /> All time
            </div>
            <div className="text-xs text-gray-300 mb-1">Total Booking Value</div>
            <div className="font-serif text-4xl font-bold text-shimmer mb-2">€{totals.totalBookingValue.toLocaleString()}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-400" />
              Across {commissions.length} confirmed bookings
            </div>
          </div>
        </div>

        {/* Three stat tiles */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: 'Total Commission', value: totals.totalCommission, accent: 'from-secondary to-yellow-500', sub: '12% avg rate' },
            { icon: CheckCircle2, label: 'Received', value: totals.received, accent: 'from-green-500 to-emerald-600', sub: `${collectionRate}% collection rate` },
            { icon: Clock, label: 'Pending', value: totals.pending, accent: 'from-orange-500 to-red-500', sub: 'Awaiting payment' },
          ].map(({ icon: Icon, label, value, accent, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl bg-gradient-to-br ${accent}`} />
              <div className={`relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="relative z-10">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="font-serif text-2xl font-bold text-primary mb-1">€{value.toLocaleString()}</div>
                <div className="text-[10px] text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collection rate bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500">Commission Collection Rate</div>
            <div className="font-serif text-xl font-bold text-primary">{collectionRate}% collected</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-sm font-semibold text-orange-600">€{totals.pending.toLocaleString()}</div>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-secondary to-yellow-400 rounded-full transition-all duration-1000"
            style={{ width: `${collectionRate}%` }}
          />
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by group name..."
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
          {['all', 'pending', 'received'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-br from-gray-50 to-gray-100/50">
              <tr>
                {['Group', 'Booking Value', 'Margin', 'Comm %', 'Commission', 'Due Date', 'Status'].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/5 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-serif font-bold text-primary">{c.groupName}</div>
                  </td>
                  <td className="py-4 px-6 text-sm font-semibold text-primary">€{c.totalBookingValue.toLocaleString()}</td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-700">€{c.totalMargin.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400">€{c.marginPerRoom.toFixed(0)}/room</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-primary/5 text-primary">
                      {c.commissionPercent}%
                    </span>
                  </td>
                  <td className="py-4 px-6 font-serif font-bold text-shimmer">€{c.commissionAmount.toLocaleString()}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{format(new Date(c.paymentDueDate), 'MMM dd, yyyy')}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      c.paymentStatus === 'received'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.paymentStatus === 'received' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      {c.paymentStatus}
                    </span>
                    {c.paidDate && (
                      <div className="text-[10px] text-gray-400 mt-1">Paid {format(new Date(c.paidDate), 'MMM dd')}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filtered.length && (
            <div className="text-center py-16">
              <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No commission records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueList;
