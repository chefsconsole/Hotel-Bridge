import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Plus, Search, Calendar, Building2, Users, MapPin, Pencil, Trash2,
  Download, X, Filter
} from 'lucide-react';
import { bookingsAPI } from '../../services/api';
import { BookingDialog } from './BookingDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportBookingsToCSV } from '../../utils/exportUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';

const STATUS_STYLES = {
  confirmed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', label: 'Confirmed' },
  quoted:    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Quoted' },
  cancelled: { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   dot: 'bg-red-500',   label: 'Cancelled' },
};

export const BookingsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingsAPI.getAll();
      setBookings(res.data);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = bookings.filter((b) => {
    const match = b.groupName.toLowerCase().includes(searchTerm.toLowerCase())
      || b.destination.toLowerCase().includes(searchTerm.toLowerCase())
      || b.hotelName.toLowerCase().includes(searchTerm.toLowerCase());
    const statusOk = statusFilter === 'all' || b.status === statusFilter;
    return match && statusOk;
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    revenue: bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.totalRevenue || 0), 0),
  };

  const handleDeleteConfirm = async () => {
    try {
      await bookingsAPI.delete(bookingToDelete.id);
      toast.success('Booking deleted');
      fetchBookings();
    } catch { toast.error('Failed to delete'); }
    finally {
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    }
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('No bookings to export');
    try { exportBookingsToCSV(filtered); toast.success('Exported'); }
    catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Group Bookings</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">
            All Bookings
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Track confirmed, quoted, and cancelled reservations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { setSelectedBooking(null); setDialogOpen(true); }} className="rounded-xl btn-gold text-white border-0">
            <Plus className="w-4 h-4 mr-2" /> Add Booking
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Bookings', value: stats.total, accent: 'from-blue-500 to-indigo-600' },
          { label: 'Confirmed', value: stats.confirmed, accent: 'from-green-500 to-emerald-600' },
          { label: 'Confirmed Revenue', value: `€${stats.revenue.toLocaleString()}`, accent: 'from-secondary to-yellow-500' },
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
            placeholder="Search by group, hotel, or destination..."
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
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'confirmed', 'quoted', 'cancelled'].map((s) => (
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

      {/* List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading bookings…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const s = STATUS_STYLES[b.status] || STATUS_STYLES.quoted;
            return (
              <div
                key={b.id}
                className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-secondary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">

                  {/* Left side */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-serif text-lg font-bold text-primary truncate">{b.groupName}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border} flex items-center gap-1 shrink-0`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.destination}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{b.hotelName}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.operatorName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-gray-50">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Check-in</div>
                        <div className="text-sm font-semibold text-primary">{format(new Date(b.checkIn), 'MMM dd, yyyy')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nights</div>
                        <div className="text-sm font-semibold text-primary">{b.nights}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Rooms</div>
                        <div className="text-sm font-semibold text-primary">{b.rooms}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Rate/Room</div>
                        <div className="text-sm font-semibold text-primary">€{b.ratePerRoom}</div>
                      </div>
                    </div>

                    {b.notes && (
                      <div className="mt-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-600 italic">{b.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right side — revenue & actions */}
                  <div className="lg:w-56 lg:border-l lg:border-gray-50 lg:pl-4 flex lg:flex-col items-center lg:items-end justify-between gap-3">
                    <div className="lg:text-right">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Revenue</div>
                      <div className="font-serif text-2xl font-bold text-shimmer">€{b.totalRevenue?.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedBooking(b); setDialogOpen(true); }}
                        className="w-9 h-9 rounded-xl bg-primary/5 hover:bg-primary hover:text-white text-primary flex items-center justify-center transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setBookingToDelete(b); setDeleteDialogOpen(true); }}
                        className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 hover:text-white text-red-600 flex items-center justify-center transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !filtered.length && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No bookings found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchTerm ? 'Try a different search.' : 'Get started by adding your first booking.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => { setSelectedBooking(null); setDialogOpen(true); }} className="rounded-xl btn-gold text-white border-0">
              <Plus className="w-4 h-4 mr-2" /> Add Booking
            </Button>
          )}
        </div>
      )}

      <BookingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        booking={selectedBooking}
        onSuccess={fetchBookings}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl">Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-primary">{bookingToDelete?.groupName}</strong>?
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

export default BookingsList;
