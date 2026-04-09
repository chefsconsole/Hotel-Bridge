import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Building2, Mail, Phone, MapPin, Star, Pencil, Trash2 } from 'lucide-react';
import { hotelsAPI } from '../../services/api';
import { HotelDialog } from './HotelDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

export const HotelsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
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
        bookingsAPI.getAll()
      ]);
      
      const hotelsData = hotelsRes.data;
      
      // Calculate stats for each hotel
      const hotelsWithStats = hotelsData.map(hotel => {
        const hotelBookings = bookingsRes.data.filter(b => b.hotelId === hotel.id);
        const totalRevenue = hotelBookings.reduce((sum, b) => sum + (b.totalRevenue || 0), 0);
        const totalRoomNights = hotelBookings.reduce((sum, b) => sum + (b.rooms * b.nights), 0);
        
        return {
          ...hotel,
          stats: {
            totalGroups: hotelBookings.length,
            totalRevenue,
            totalRoomNights
          }
        };
      });
      
      setHotels(hotelsWithStats);
    } catch (error) {
      toast.error('Failed to load hotels');
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hotel.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hotel.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setSelectedHotel(null);
    setDialogOpen(true);
  };

  const handleEdit = (hotel) => {
    setSelectedHotel(hotel);
    setDialogOpen(true);
  };

  const handleDeleteClick = (hotel) => {
    setHotelToDelete(hotel);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await hotelsAPI.delete(hotelToDelete.id);
      toast.success('Hotel deleted successfully!');
      fetchHotels();
    } catch (error) {
      toast.error('Failed to delete hotel');
      console.error('Error deleting hotel:', error);
    } finally {
      setDeleteDialogOpen(false);
      setHotelToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Hotels</h1>
          <p className="text-gray-600">Manage your hotel partnerships and contracts</p>
        </div>
        <Button onClick={handleAdd} className="bg-secondary hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add New Hotel
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search hotels by name, city, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading hotels...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredHotels.map((hotel) => (
            <Card key={hotel.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary">{hotel.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{hotel.city}, {hotel.country}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${hotel.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {hotel.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Star Category</p>
                    <div className="flex items-center">
                      {[...Array(hotel.starCategory)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Rooms</p>
                    <p className="font-semibold text-primary">{hotel.rooms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Contract Type</p>
                    <p className="font-semibold text-primary capitalize">{hotel.contractType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Commission</p>
                    <p className="font-semibold text-secondary">{hotel.commission}%</p>
                  </div>
                </div>

                {hotel.stats && hotel.stats.totalGroups > 0 && (
                  <div className="mb-4 p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                    <p className="text-xs font-semibold text-secondary mb-2">Performance Summary</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-primary">{hotel.stats.totalGroups}</p>
                        <p className="text-xs text-gray-600">Groups</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">€{hotel.stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Revenue</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">{hotel.stats.totalRoomNights}</p>
                        <p className="text-xs text-gray-600">Room Nights</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {hotel.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {hotel.phone}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Contact Person</p>
                      <p className="text-sm font-medium text-primary">{hotel.contactPerson}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(hotel)}
                        className="text-primary border-primary hover:bg-primary hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteClick(hotel)}
                        className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {hotel.notes && (
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">{hotel.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredHotels.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hotels found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first hotel'}
            </p>
            {!searchTerm && (
              <Button onClick={handleAdd} className="bg-secondary hover:bg-secondary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add First Hotel
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <HotelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        hotel={selectedHotel}
        onSuccess={fetchHotels}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{hotelToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HotelsList;
