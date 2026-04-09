import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from 'sonner';
import { bookingsAPI, hotelsAPI, operatorsAPI } from '../../services/api';

export const BookingDialog = ({ open, onClose, booking, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [operators, setOperators] = useState([]);
  const [formData, setFormData] = useState({
    groupName: '',
    operatorId: '',
    operatorName: '',
    destination: '',
    hotelId: '',
    hotelName: '',
    checkIn: '',
    checkOut: '',
    nights: '',
    rooms: '',
    ratePerRoom: '',
    status: 'inquiry',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchHotels();
      fetchOperators();
    }
  }, [open]);

  useEffect(() => {
    if (booking) {
      setFormData({
        ...booking,
        nights: booking.nights?.toString() || '',
        rooms: booking.rooms?.toString() || '',
        ratePerRoom: booking.ratePerRoom?.toString() || ''
      });
    } else {
      setFormData({
        groupName: '',
        operatorId: '',
        operatorName: '',
        destination: '',
        hotelId: '',
        hotelName: '',
        checkIn: '',
        checkOut: '',
        nights: '',
        rooms: '',
        ratePerRoom: '',
        status: 'inquiry',
        notes: ''
      });
    }
  }, [booking, open]);

  const fetchHotels = async () => {
    try {
      const response = await hotelsAPI.getAll();
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    }
  };

  const fetchOperators = async () => {
    try {
      const response = await operatorsAPI.getAll();
      setOperators(response.data);
    } catch (error) {
      console.error('Error fetching operators:', error);
    }
  };

  const handleHotelChange = (hotelId) => {
    const selectedHotel = hotels.find(h => h.id === hotelId);
    if (selectedHotel) {
      setFormData({
        ...formData,
        hotelId,
        hotelName: selectedHotel.name,
        destination: selectedHotel.city
      });
    }
  };

  const handleOperatorChange = (operatorId) => {
    const selectedOperator = operators.find(o => o.id === operatorId);
    if (selectedOperator) {
      setFormData({
        ...formData,
        operatorId,
        operatorName: selectedOperator.companyName
      });
    }
  };

  const calculateNights = (checkIn, checkOut) => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : '';
    }
    return '';
  };

  const handleDateChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    if (field === 'checkIn' || field === 'checkOut') {
      const nights = calculateNights(
        field === 'checkIn' ? value : formData.checkIn,
        field === 'checkOut' ? value : formData.checkOut
      );
      updated.nights = nights.toString();
    }
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        nights: parseInt(formData.nights),
        rooms: parseInt(formData.rooms),
        ratePerRoom: parseFloat(formData.ratePerRoom)
      };

      if (booking) {
        await bookingsAPI.update(booking.id, payload);
        toast.success('Booking updated successfully!');
      } else {
        await bookingsAPI.create(payload);
        toast.success('Booking created successfully!');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(booking ? 'Failed to update booking' : 'Failed to create booking');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{booking ? 'Edit Booking' : 'Add New Booking'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={(e) => setFormData({...formData, groupName: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="operator">Operator *</Label>
              <Select value={formData.operatorId} onValueChange={handleOperatorChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(op => (
                    <SelectItem key={op.id} value={op.id}>{op.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hotel">Hotel *</Label>
              <Select value={formData.hotelId} onValueChange={handleHotelChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map(hotel => (
                    <SelectItem key={hotel.id} value={hotel.id}>{hotel.name} - {hotel.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="checkIn">Check-in *</Label>
              <Input
                id="checkIn"
                type="date"
                value={formData.checkIn}
                onChange={(e) => handleDateChange('checkIn', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkOut">Check-out *</Label>
              <Input
                id="checkOut"
                type="date"
                value={formData.checkOut}
                onChange={(e) => handleDateChange('checkOut', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="nights">Nights</Label>
              <Input
                id="nights"
                type="number"
                value={formData.nights}
                onChange={(e) => setFormData({...formData, nights: e.target.value})}
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rooms">Rooms *</Label>
              <Input
                id="rooms"
                type="number"
                value={formData.rooms}
                onChange={(e) => setFormData({...formData, rooms: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="ratePerRoom">Rate/Room (€) *</Label>
              <Input
                id="ratePerRoom"
                type="number"
                step="0.01"
                value={formData.ratePerRoom}
                onChange={(e) => setFormData({...formData, ratePerRoom: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-secondary hover:bg-secondary/90" disabled={loading}>
              {loading ? 'Saving...' : booking ? 'Update Booking' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
