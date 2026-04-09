import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Users, Mail, Phone, MapPin, TrendingUp } from 'lucide-react';
import { mockOperators } from '../../data/crmMockData';

export const OperatorsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [operators] = useState(mockOperators);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Operators & DMCs</h1>
          <p className="text-gray-600">Manage your tour operator and DMC partnerships</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add New Operator
        </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOperators.map((operator) => (
          <Card key={operator.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
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

              <div>
                <p className="text-xs text-gray-500 mb-1">Contact Person</p>
                <p className="text-sm font-medium text-primary mb-3">{operator.contactPerson}</p>
              </div>

              {operator.notes && (
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-xs text-gray-600">{operator.notes}</p>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full text-primary border-primary hover:bg-primary hover:text-white">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OperatorsList;
