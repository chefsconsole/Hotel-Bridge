import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Plus, Search, Building2, Mail, Phone, MapPin, Star, Pencil, Trash2,
  Download, Filter, TrendingUp, X
} from 'lucide-react';
import { hotelsAPI, bookingsAPI } from '../../services/api';
import { HotelDialog } from './HotelDialog';
import { toast } from 'sonner';
import { exportHotelsToCSV } from '../../utils/exportUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';

const hotelImages = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
];
const imgFor = (id) => hotelImages[(id?.charCodeAt?.(0) || 0) % hotelImages.length];

export const HotelsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hotelToDelete, setHotelToDelete] = useState(null);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const [hotelsRes, bookingsRes] = await Promise.all([
        hotelsAPI.getAll(),
        bookingsAPI.getAll(),
      ]);
      const hotelsWithStats = hotelsRes.data.map((hotel) => {
        const hb = bookingsRes.data.filter((b) => b.hotelId === hotel.id);
        return {
          ...hotel,
          stats: {
            totalGroups: hb.length,
            totalRevenue: hb.reduce((s, b) => s + (b.totalRevenue || 0), 0),
            totalRoomNights: hb.reduce((s, b) => s + (b.rooms * b.nights), 0),
          },
        };
      });
      setHotels(hotelsWithStats);
    } catch (e) {
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHotels(); }, []);

  const filteredHotels = hotels.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = hotels.reduce((s, h) => s + (h.stats?.totalRevenue || 0), 0);
  const activeCount = hotels.filter((h) => h.status === 'active').length;

  const handleAdd = () => { setSelectedHotel(null); setDialogOpen(true); };
  const handleEdit = (h) => { setSelectedHotel(h); setDialogOpen(true); };
  const handleDeleteClick = (h) => { setHotelToDelete(h); setDeleteDialogOpen(true); };
  const handleDeleteConfirm = async () => {
    try {
      await hotelsAPI.delete(hotelToDelete.id);
      toast.success('Hotel deleted');
      fetchHotels();
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setDeleteDialogOpen(false);
      setHotelToDelete(null);
    }
  };

  const handleExport = () => {
    if (!filteredHotels.length) return toast.error('No hotels to export');
    try { exportHotelsToCSV(filteredHotels); toast.success('Exported'); }
    catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Hotel Partners</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">
            Your Hotel Network
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Managing <span className="font-semibold text-primary">{hotels.length}</span> partnerships across <span className="font-semibold text-primary">{new Set(hotels.map(h=>h.country)).size}</span> countries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            className="rounded-xl border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button
            onClick={handleAdd}
            className="rounded-xl btn-gold text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Hotel
          </Button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Hotels', value: hotels.length, accent: 'from-blue-500 to-indigo-600' },
          { label: 'Active', value: activeCount, accent: 'from-green-500 to-emerald-600' },
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
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, city, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 rounded-xl border-gray-200 focus:border-secondary"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'active', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
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

      {/* Cards */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading hotels…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredHotels.map((hotel) => (
            <div
              key={hotel.id}
              className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-secondary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Hero image */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={imgFor(hotel.id)}
                  alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md ${
                    hotel.status === 'active'
                      ? 'bg-green-500/90 text-white border border-green-300/30'
                      : 'bg-gray-500/80 text-white border border-gray-300/30'
                  }`}>
                    {hotel.status}
                  </span>
                </div>

                {/* Stars */}
                <div className="absolute top-3 left-3 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md">
                  {[...Array(hotel.starCategory)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-secondary text-secondary" />
                  ))}
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="font-serif font-bold text-lg leading-tight mb-1 truncate">{hotel.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-200">
                    <MapPin className="w-3 h-3" />
                    {hotel.city}, {hotel.country}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Quick stats grid */}
                <div className="grid grid-cols-3 gap-2 -mx-1">
                  <div className="text-center p-2 rounded-xl bg-gray-50">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Rooms</div>
                    <div className="text-sm font-bold text-primary">{hotel.rooms}</div>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-secondary/10">
                    <div className="text-[10px] text-secondary uppercase tracking-wider mb-1">Commission</div>
                    <div className="text-sm font-bold text-primary">{hotel.commission}%</div>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-gray-50">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Contract</div>
                    <div className="text-sm font-bold text-primary capitalize truncate">{hotel.contractType}</div>
                  </div>
                </div>

                {/* Performance */}
                {hotel.stats?.totalGroups > 0 && (
                  <div className="p-3 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/0 border border-secondary/15">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3 h-3 text-secondary" />
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Performance</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-base font-bold text-primary">{hotel.stats.totalGroups}</div>
                        <div className="text-[10px] text-gray-500">Groups</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-primary">€{(hotel.stats.totalRevenue / 1000).toFixed(0)}k</div>
                        <div className="text-[10px] text-gray-500">Revenue</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-primary">{hotel.stats.totalRoomNights}</div>
                        <div className="text-[10px] text-gray-500">Nights</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{hotel.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                    {hotel.phone}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div>
                    <div className="text-[10px] text-gray-500">Contact</div>
                    <div className="text-xs font-semibold text-primary truncate max-w-[150px]">{hotel.contactPerson}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(hotel)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center transition-all"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(hotel)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-gray-500 flex items-center justify-center transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredHotels.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">No hotels found</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            {searchTerm ? 'Try a different search or filter.' : 'Get started by adding your first hotel partnership.'}
          </p>
          {!searchTerm && (
            <Button onClick={handleAdd} className="rounded-xl btn-gold text-white border-0">
              <Plus className="w-4 h-4 mr-2" /> Add First Hotel
            </Button>
          )}
        </div>
      )}

      <HotelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        hotel={selectedHotel}
        onSuccess={fetchHotels}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl">Delete Hotel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-primary">{hotelToDelete?.name}</strong>? This action cannot be undone.
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

export default HotelsList;
