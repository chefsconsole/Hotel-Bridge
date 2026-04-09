import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Calendar, Building2, Users, MapPin } from 'lucide-react';
import { mockBookings } from '../../data/crmMockData';
import { format } from 'date-fns';

export const BookingsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings] = useState(mockBookings);

  const filteredBookings = bookings.filter(booking =>
    booking.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.hotelName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'quoted': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Group Bookings</h1>
          <p className="text-gray-600">Manage all group bookings and reservations</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add New Booking
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search bookings by group name, hotel, or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-1">{booking.groupName}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                          {booking.destination}
                        </div>
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-1 text-gray-400" />
                          {booking.hotelName}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {booking.operatorName}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Check-in</p>
                      <p className="text-sm font-semibold text-primary">
                        {format(new Date(booking.checkIn), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Nights</p>
                      <p className="text-sm font-semibold text-primary">{booking.nights}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rooms</p>
                      <p className="text-sm font-semibold text-primary">{booking.rooms}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rate/Room</p>
                      <p className="text-sm font-semibold text-primary">€{booking.ratePerRoom}</p>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">{booking.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-3 min-w-[160px]">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-secondary">€{booking.totalRevenue.toLocaleString()}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-white">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBookings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No bookings found</h3>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BookingsList;
