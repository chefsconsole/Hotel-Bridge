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
  // Inline quick-add (so you never leave the booking form)
  const [quickAdd, setQuickAdd] = useState(null); // 'operator' | 'hotel' | null
  const [qSaving, setQSaving] = useState(false);
  const [qOperator, setQOperator] = useState({ companyName: '', country: '', type: 'operator' });
  const [qHotel, setQHotel] = useState({ name: '', city: '', country: '', commission: 10 });
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

  const saveQuickOperator = async () => {
    if (!qOperator.companyName.trim()) return toast.error('Enter an operator name');
    setQSaving(true);
    try {
      const res = await operatorsAPI.create({
        companyName: qOperator.companyName.trim(),
        contactPerson: '', country: qOperator.country.trim(),
        type: qOperator.type, email: '', phone: '',
        businessPotential: 'medium', notes: ''
      });
      const newOp = res.data;
      const list = (await operatorsAPI.getAll()).data;
      setOperators(list);
      setFormData(f => ({ ...f, operatorId: newOp.id, operatorName: newOp.companyName }));
      setQuickAdd(null);
      setQOperator({ companyName: '', country: '', type: 'operator' });
      toast.success(`Operator "${newOp.companyName}" added & selected`);
    } catch {
      toast.error('Failed to add operator');
    } finally { setQSaving(false); }
  };

  const saveQuickHotel = async () => {
    if (!qHotel.name.trim()) return toast.error('Enter a hotel name');
    setQSaving(true);
    try {
      const res = await hotelsAPI.create({
        name: qHotel.name.trim(), city: qHotel.city.trim(), country: qHotel.country.trim(),
        contactPerson: '', email: '', phone: '', rooms: 0, starCategory: 4,
        contractType: 'commission', commission: Number(qHotel.commission) || 10,
        ratesLow: 0, ratesMid: 0, ratesHigh: 0, blackoutDates: [], status: 'active', notes: ''
      });
      const newHotel = res.data;
      const list = (await hotelsAPI.getAll()).data;
      setHotels(list);
      setFormData(f => ({ ...f, hotelId: newHotel.id, hotelName: newHotel.name, destination: newHotel.city }));
      setQuickAdd(null);
      setQHotel({ name: '', city: '', country: '', commission: 10 });
      toast.success(`Hotel "${newHotel.name}" added & selected`);
    } catch {
      toast.error('Failed to add hotel');
    } finally { setQSaving(false); }
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
            {/* OPERATOR */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="operator">Operator *</Label>
                {quickAdd !== 'operator' && (
                  <button type="button" onClick={() => setQuickAdd('operator')}
                    className="text-xs font-semibold text-secondary hover:underline inline-flex items-center gap-0.5">
                    + New
                  </button>
                )}
              </div>
              {quickAdd === 'operator' ? (
                <div className="p-3 rounded-lg border border-secondary/40 bg-secondary/5 space-y-2">
                  <Input autoFocus placeholder="Operator / company name *" value={qOperator.companyName}
                    onChange={(e) => setQOperator({ ...qOperator, companyName: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveQuickOperator(); } }} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Country" value={qOperator.country}
                      onChange={(e) => setQOperator({ ...qOperator, country: e.target.value })} />
                    <select value={qOperator.type} onChange={(e) => setQOperator({ ...qOperator, type: e.target.value })}
                      className="h-10 rounded-md border border-gray-200 bg-white px-2 text-sm outline-none focus:border-secondary">
                      <option value="operator">Operator</option>
                      <option value="DMC">DMC</option>
                      <option value="agent">Agent</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={saveQuickOperator} disabled={qSaving} className="bg-secondary hover:bg-secondary/90">
                      {qSaving ? 'Adding…' : 'Add & Select'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setQuickAdd(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* HOTEL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="hotel">Hotel *</Label>
                {quickAdd !== 'hotel' && (
                  <button type="button" onClick={() => setQuickAdd('hotel')}
                    className="text-xs font-semibold text-secondary hover:underline inline-flex items-center gap-0.5">
                    + New
                  </button>
                )}
              </div>
              {quickAdd === 'hotel' ? (
                <div className="p-3 rounded-lg border border-secondary/40 bg-secondary/5 space-y-2">
                  <Input autoFocus placeholder="Hotel name *" value={qHotel.name}
                    onChange={(e) => setQHotel({ ...qHotel, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveQuickHotel(); } }} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="City" value={qHotel.city}
                      onChange={(e) => setQHotel({ ...qHotel, city: e.target.value })} />
                    <Input placeholder="Country" value={qHotel.country}
                      onChange={(e) => setQHotel({ ...qHotel, country: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Commission %" value={qHotel.commission}
                      onChange={(e) => setQHotel({ ...qHotel, commission: e.target.value })} className="w-32" />
                    <Button type="button" size="sm" onClick={saveQuickHotel} disabled={qSaving} className="bg-secondary hover:bg-secondary/90">
                      {qSaving ? 'Adding…' : 'Add & Select'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setQuickAdd(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
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
              )}
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
