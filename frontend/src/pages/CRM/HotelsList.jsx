import { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Plus, Search, Building2, Mail, Phone, MapPin, Star, Pencil, Trash2,
  Download, Upload, X, ChevronDown, LayoutGrid, List, Utensils, BedDouble, Globe,
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
const imgFor = (id) => hotelImages[(String(id)?.charCodeAt?.(0) || 0) % hotelImages.length];
const CITY_PAGE = 30; // city sections rendered per "load more" chunk

export const HotelsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [view, setView] = useState('compact'); // 'compact' | 'cards'
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hotelToDelete, setHotelToDelete] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [visibleCities, setVisibleCities] = useState(CITY_PAGE);
  const [importing, setImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const [hotelsRes, bookingsRes] = await Promise.all([hotelsAPI.getAll(), bookingsAPI.getAll()]);
      const withStats = hotelsRes.data.map((hotel) => {
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
      setHotels(withStats);
    } catch (e) {
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHotels(); }, []);
  useEffect(() => { setVisibleCities(CITY_PAGE); }, [searchTerm, countryFilter]);

  const countries = useMemo(
    () => Array.from(new Set(hotels.map((h) => h.country).filter(Boolean))).sort(),
    [hotels]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return hotels.filter((h) => {
      const matchesCountry = countryFilter === 'all' || h.country === countryFilter;
      if (!matchesCountry) return false;
      if (!q) return true;
      return [h.name, h.city, h.country, h.brand].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [hotels, searchTerm, countryFilter]);

  // City-wise grouping (compact view)
  const cityGroups = useMemo(() => {
    const map = new Map();
    for (const h of filtered) {
      const key = `${h.city || '—'}|${h.country || ''}`;
      if (!map.has(key)) map.set(key, { city: h.city || '—', country: h.country || '', items: [] });
      map.get(key).items.push(h);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length || a.city.localeCompare(b.city));
  }, [filtered]);

  const totalRevenue = hotels.reduce((s, h) => s + (h.stats?.totalRevenue || 0), 0);

  const handleAdd = () => { setSelectedHotel(null); setDialogOpen(true); };
  const handleEdit = (h) => { setSelectedHotel(h); setDialogOpen(true); };
  const handleDeleteClick = (h) => { setHotelToDelete(h); setDeleteDialogOpen(true); };
  const handleDeleteConfirm = async () => {
    try { await hotelsAPI.delete(hotelToDelete.id); toast.success('Hotel deleted'); fetchHotels(); }
    catch { toast.error('Failed to delete'); }
    finally { setDeleteDialogOpen(false); setHotelToDelete(null); }
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('No hotels to export');
    try { exportHotelsToCSV(filtered); toast.success('Exported'); } catch { toast.error('Export failed'); }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/data/lhg-hotels.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const out = await hotelsAPI.bulkCreate(data);
      await fetchHotels();
      toast.success(`Imported ${out.data.added} hotels`, {
        description: out.data.skipped ? `${out.data.skipped} already in your portfolio (skipped)` : 'Louvre Hotels Group portfolio added',
      });
      setImportOpen(false);
    } catch (e) {
      toast.error('Import failed', { description: 'Could not load the portfolio file.' });
    } finally {
      setImporting(false);
    }
  };

  const toggleCity = (key) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="eyebrow mb-2">Hotel Partners</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">Your Hotel Network</h1>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-semibold text-primary">{hotels.length.toLocaleString()}</span> hotels ·{' '}
            <span className="font-semibold text-primary">{cityGroups.length || new Set(hotels.map((h) => h.city)).size}</span> cities ·{' '}
            <span className="font-semibold text-primary">{countries.length}</span> countries
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" className="rounded-xl border-secondary/40 text-secondary hover:bg-secondary/10 hover:text-secondary">
            <Upload className="w-4 h-4 mr-2" /> Import portfolio
          </Button>
          <Button onClick={handleExport} variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={handleAdd} className="rounded-xl btn-gold text-white border-0">
            <Plus className="w-4 h-4 mr-2" /> Add Hotel
          </Button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Hotels', value: hotels.length.toLocaleString(), accent: 'from-blue-500 to-indigo-600' },
          { label: 'Cities', value: (new Set(hotels.map((h) => `${h.city}|${h.country}`)).size).toLocaleString(), accent: 'from-secondary to-yellow-500' },
          { label: 'Countries', value: countries.length, accent: 'from-green-500 to-emerald-600' },
        ].map((s, i) => (
          <div key={i} className="card-lux p-4 flex items-center gap-3">
            <div className={`w-2 h-12 rounded-full bg-gradient-to-b ${s.accent}`} />
            <div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-serif font-bold text-primary">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card-lux p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by hotel, city, country, or brand…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 rounded-xl border-gray-200 focus:border-secondary bg-white"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="h-11 pl-9 pr-8 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-secondary appearance-none"
            >
              <option value="all">All countries</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* View toggle */}
          <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button onClick={() => setView('compact')} className={`px-3 h-11 inline-flex items-center gap-1.5 text-xs font-semibold ${view === 'compact' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`} title="Compact list">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('cards')} className={`px-3 h-11 inline-flex items-center gap-1.5 text-xs font-semibold ${view === 'cards' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`} title="Card gallery">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading hotels…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState searchTerm={searchTerm} onAdd={handleAdd} onImport={() => setImportOpen(true)} />
      ) : view === 'compact' ? (
        /* ── COMPACT · CITY-WISE ────────────────────────── */
        <>
          <div className="space-y-3 lux-stagger">
            {cityGroups.slice(0, visibleCities).map((g) => {
              const key = `${g.city}|${g.country}`;
              const open = expanded.has(key);
              return (
                <div key={key} className="card-lux overflow-hidden">
                  <button onClick={() => toggleCity(key)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/5 transition-colors text-left">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-900 flex items-center justify-center shrink-0 shadow ring-1 ring-white/30">
                      <MapPin className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif font-bold text-primary leading-tight truncate">{g.city}</div>
                      <div className="text-xs text-gray-500">{g.country}</div>
                    </div>
                    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">
                      {g.items.length} {g.items.length > 1 ? 'hotels' : 'hotel'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {g.items.map((h) => <CompactRow key={h.id} h={h} onEdit={handleEdit} onDelete={handleDeleteClick} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {visibleCities < cityGroups.length && (
            <div className="text-center pt-2">
              <button onClick={() => setVisibleCities((v) => v + CITY_PAGE)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:border-secondary hover:text-secondary">
                Show more cities ({cityGroups.length - visibleCities} left)
              </button>
            </div>
          )}
        </>
      ) : (
        /* ── CARD GALLERY (capped for performance) ───────── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lux-stagger">
            {filtered.slice(0, 60).map((hotel) => <HotelCard key={hotel.id} hotel={hotel} onEdit={handleEdit} onDelete={handleDeleteClick} />)}
          </div>
          {filtered.length > 60 && (
            <p className="text-center text-xs text-gray-500 pt-2">
              Showing 60 of {filtered.length.toLocaleString()} — refine your search or switch to the compact list to see all.
            </p>
          )}
        </>
      )}

      <HotelDialog open={dialogOpen} onClose={() => setDialogOpen(false)} hotel={selectedHotel} onSuccess={fetchHotels} />

      {/* Import confirm */}
      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl flex items-center gap-2"><Upload className="w-5 h-5 text-secondary" /> Import hotel portfolio</AlertDialogTitle>
            <AlertDialogDescription>
              This adds the <strong className="text-primary">Louvre Hotels Group</strong> portfolio (~823 hotels across 13 countries) to your network, grouped city-wise. Hotels already in your list are skipped, so it's safe to run again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); runImport(); }} disabled={importing} className="rounded-xl btn-gold text-white border-0">
              {importing ? 'Importing…' : 'Import hotels'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl">Delete Hotel</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong className="text-primary">{hotelToDelete?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="rounded-xl bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ── Compact single-hotel row ─────────────────────── */
function CompactRow({ h, onEdit, onDelete }) {
  return (
    <div className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-primary text-sm truncate">{h.name}</span>
          {h.brand && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/5 text-primary/70 uppercase tracking-wide">{h.brand}</span>}
          {h.starCategory > 0 && (
            <span className="inline-flex items-center gap-0.5 text-secondary">
              {[...Array(Math.min(h.starCategory, 5))].map((_, i) => <Star key={i} className="w-3 h-3 fill-secondary" />)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          {h.rooms > 0 && <span className="inline-flex items-center gap-1"><BedDouble className="w-3 h-3" />{h.rooms}</span>}
          {h.restaurant && <span className="inline-flex items-center gap-1 text-gray-400"><Utensils className="w-3 h-3" />Restaurant</span>}
          {h.email && <span className="inline-flex items-center gap-1 truncate max-w-[220px]"><Mail className="w-3 h-3" />{h.email}</span>}
          {h.phone && <span className="hidden md:inline-flex items-center gap-1"><Phone className="w-3 h-3" />{h.phone}</span>}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Comm.</div>
        <div className="text-sm font-bold text-secondary">{h.commission ?? 0}%</div>
      </div>
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(h)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(h)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white text-gray-500 flex items-center justify-center" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ── Empty state ──────────────────────────────────── */
function EmptyState({ searchTerm, onAdd, onImport }) {
  return (
    <div className="card-lux p-16 text-center">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
        <Building2 className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="font-serif text-xl font-bold text-primary mb-2">No hotels found</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        {searchTerm ? 'Try a different search or filter.' : 'Add a hotel, or import a partner portfolio to get started.'}
      </p>
      {!searchTerm && (
        <div className="flex justify-center gap-2">
          <Button onClick={onImport} variant="outline" className="rounded-xl border-secondary/40 text-secondary hover:bg-secondary/10">
            <Upload className="w-4 h-4 mr-2" /> Import portfolio
          </Button>
          <Button onClick={onAdd} className="rounded-xl btn-gold text-white border-0"><Plus className="w-4 h-4 mr-2" /> Add Hotel</Button>
        </div>
      )}
    </div>
  );
}

/* ── Rich hotel card (gallery view) ───────────────── */
function HotelCard({ hotel, onEdit, onDelete }) {
  return (
    <div className="group relative card-lux card-lux-hover overflow-hidden">
      <div className="relative h-40 overflow-hidden">
        <img src={imgFor(hotel.id)} alt={hotel.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        {hotel.starCategory > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md">
            {[...Array(Math.min(hotel.starCategory, 5))].map((_, i) => <Star key={i} className="w-3 h-3 fill-secondary text-secondary" />)}
          </div>
        )}
        {hotel.brand && <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full bg-white/90 text-primary uppercase tracking-wide">{hotel.brand}</div>}
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h3 className="font-serif font-bold text-lg leading-tight mb-0.5 truncate">{hotel.name}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-200"><MapPin className="w-3 h-3" />{hotel.city}, {hotel.country}</div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-xl bg-gray-50"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Rooms</div><div className="text-sm font-bold text-primary">{hotel.rooms || '—'}</div></div>
          <div className="text-center p-2 rounded-xl bg-secondary/10"><div className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Comm.</div><div className="text-sm font-bold text-primary">{hotel.commission ?? 0}%</div></div>
          <div className="text-center p-2 rounded-xl bg-gray-50"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Rest.</div><div className="text-sm font-bold text-primary">{hotel.restaurant ? 'Yes' : '—'}</div></div>
        </div>
        <div className="space-y-1.5 text-xs">
          {hotel.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="w-3 h-3 text-gray-400 shrink-0" /><span className="truncate">{hotel.email}</span></div>}
          {hotel.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-3 h-3 text-gray-400 shrink-0" />{hotel.phone}</div>}
        </div>
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-50">
          <button onClick={() => onEdit(hotel)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(hotel)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500 hover:text-white text-gray-500 flex items-center justify-center" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

export default HotelsList;
