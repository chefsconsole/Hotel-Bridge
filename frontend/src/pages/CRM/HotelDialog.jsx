import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from 'sonner';
import { hotelsAPI } from '../../services/api';

export const HotelDialog = ({ open, onClose, hotel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    contactPerson: '',
    email: '',
    phone: '',
    rooms: '',
    starCategory: '3',
    contractType: 'commission',
    commission: '',
    ratesLow: '',
    ratesMid: '',
    ratesHigh: '',
    blackoutDates: [],
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (hotel) {
      setFormData({
        ...hotel,
        rooms: hotel.rooms?.toString() || '',
        commission: hotel.commission?.toString() || '',
        ratesLow: hotel.ratesLow?.toString() || '',
        ratesMid: hotel.ratesMid?.toString() || '',
        ratesHigh: hotel.ratesHigh?.toString() || '',
        blackoutDates: hotel.blackoutDates || []
      });
    } else {
      setFormData({
        name: '',
        city: '',
        country: '',
        contactPerson: '',
        email: '',
        phone: '',
        rooms: '',
        starCategory: '3',
        contractType: 'commission',
        commission: '',
        ratesLow: '',
        ratesMid: '',
        ratesHigh: '',
        blackoutDates: [],
        status: 'active',
        notes: ''
      });
    }
  }, [hotel, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        rooms: parseInt(formData.rooms),
        starCategory: parseInt(formData.starCategory),
        commission: parseFloat(formData.commission),
        ratesLow: parseFloat(formData.ratesLow),
        ratesMid: parseFloat(formData.ratesMid),
        ratesHigh: parseFloat(formData.ratesHigh)
      };

      if (hotel) {
        await hotelsAPI.update(hotel.id, payload);
        toast.success('Hotel updated successfully!');
      } else {
        await hotelsAPI.create(payload);
        toast.success('Hotel created successfully!');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(hotel ? 'Failed to update hotel' : 'Failed to create hotel');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hotel ? 'Edit Hotel' : 'Add New Hotel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Hotel Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="contactPerson">Contact Person *</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rooms">Total Rooms *</Label>
              <Input
                id="rooms"
                type="number"
                value={formData.rooms}
                onChange={(e) => setFormData({...formData, rooms: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="starCategory">Star Category *</Label>
              <Select value={formData.starCategory} onValueChange={(val) => setFormData({...formData, starCategory: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Star</SelectItem>
                  <SelectItem value="4">4 Star</SelectItem>
                  <SelectItem value="5">5 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractType">Contract Type *</Label>
              <Select value={formData.contractType} onValueChange={(val) => setFormData({...formData, contractType: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="net">Net Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="commission">Commission % *</Label>
              <Input
                id="commission"
                type="number"
                step="0.1"
                value={formData.commission}
                onChange={(e) => setFormData({...formData, commission: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ratesLow">Low Season Rate (€) *</Label>
              <Input
                id="ratesLow"
                type="number"
                step="0.01"
                value={formData.ratesLow}
                onChange={(e) => setFormData({...formData, ratesLow: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="ratesMid">Mid Season Rate (€) *</Label>
              <Input
                id="ratesMid"
                type="number"
                step="0.01"
                value={formData.ratesMid}
                onChange={(e) => setFormData({...formData, ratesMid: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="ratesHigh">High Season Rate (€) *</Label>
              <Input
                id="ratesHigh"
                type="number"
                step="0.01"
                value={formData.ratesHigh}
                onChange={(e) => setFormData({...formData, ratesHigh: e.target.value})}
                required
              />
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
              {loading ? 'Saving...' : hotel ? 'Update Hotel' : 'Create Hotel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
