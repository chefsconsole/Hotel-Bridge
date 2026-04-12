import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Users, Mail, Phone, MapPin, TrendingUp, Pencil, Trash2, Download } from 'lucide-react';
import { operatorsAPI, bookingsAPI } from '../../services/api';
import { OperatorDialog } from './OperatorDialog';
import { toast } from 'sonner';
import { exportOperatorsToCSV } from '../../utils/exportUtils';
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

export const OperatorsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState(null);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const [operatorsRes, bookingsRes] = await Promise.all([
        operatorsAPI.getAll(),
        bookingsAPI.getAll()
      ]);
      
      const operatorsData = operatorsRes.data;
      
      // Calculate stats for each operator
      const operatorsWithStats = operatorsData.map(operator => {
        const opBookings = bookingsRes.data.filter(b => b.operatorId === operator.id);
        const totalRevenue = opBookings.reduce((sum, b) => sum + (b.totalRevenue || 0), 0);
        const totalRoomNights = opBookings.reduce((sum, b) => sum + (b.rooms * b.nights), 0);
        
        return {
          ...operator,
          stats: {
            totalGroups: opBookings.length,
            totalRevenue,
            totalRoomNights
          }
        };
      });
      
      setOperators(operatorsWithStats);
    } catch (error) {
      toast.error('Failed to load operators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const filteredOperators = operators.filter(op =>
    op.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPotentialColor = (potential) => {
    switch(potential) {
      case 'high': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await operatorsAPI.delete(operatorToDelete.id);
      toast.success('Operator deleted successfully!');
      fetchOperators();
    } catch (error) {
      toast.error('Failed to delete operator');
    } finally {
      setDeleteDialogOpen(false);
      setOperatorToDelete(null);
    }
  };

  const handleExport = () => {
    if (filteredOperators.length === 0) {
      toast.error('No operators to export');
      return;
    }
    
    try {
      exportOperatorsToCSV(filteredOperators.map(op => ({
        ...op,
        name: op.companyName,
        stats: op.stats || { totalBookings: 0, totalRevenue: 0, totalRoomNights: 0 }
      })));
      toast.success('Operators data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Operators & DMCs</h1>
          <p className="text-gray-600">Manage your tour operator and DMC partnerships</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => { setSelectedOperator(null); setDialogOpen(true); }} className="bg-secondary hover:bg-secondary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add New Operator
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search operators by name or country..."
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
          <p className="mt-4 text-gray-600">Loading operators...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOperators.map((operator) => (
            <Card key={operator.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary">{operator.companyName}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{operator.country}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary uppercase text-xs">
                    {operator.type}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {operator.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {operator.phone}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 py-3 border-y">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Business Potential</span>
                  </div>
                  <Badge className={getPotentialColor(operator.businessPotential)}>
                    {operator.businessPotential}
                  </Badge>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Contact Person</p>
                  <p className="text-sm font-medium text-primary">{operator.contactPerson}</p>
                </div>

                {operator.stats && operator.stats.totalGroups > 0 && (
                  <div className="mb-3 p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                    <p className="text-xs font-semibold text-secondary mb-2">Performance Summary</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-primary">{operator.stats.totalGroups}</p>
                        <p className="text-xs text-gray-600">Groups</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">€{operator.stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Revenue</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">{operator.stats.totalRoomNights}</p>
                        <p className="text-xs text-gray-600">Room Nights</p>
                      </div>
                    </div>
                  </div>
                )}

                {operator.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <p className="text-xs text-gray-600">{operator.notes}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setSelectedOperator(operator); setDialogOpen(true); }}
                    className="flex-1 text-primary border-primary hover:bg-primary hover:text-white"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setOperatorToDelete(operator); setDeleteDialogOpen(true); }}
                    className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OperatorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        operator={selectedOperator}
        onSuccess={fetchOperators}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Operator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{operatorToDelete?.companyName}</strong>?
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

export default OperatorsList;
