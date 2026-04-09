import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Search, DollarSign, Calendar, TrendingUp, Download } from 'lucide-react';
import { mockCommissions } from '../../data/crmMockData';
import { format } from 'date-fns';

export const RevenueList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [commissions] = useState(mockCommissions);

  const filteredCommissions = commissions.filter(comm =>
    comm.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = {
    totalBookingValue: commissions.reduce((sum, c) => sum + c.totalBookingValue, 0),
    totalMargin: commissions.reduce((sum, c) => sum + c.totalMargin, 0),
    totalCommission: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
    pending: commissions.filter(c => c.paymentStatus === 'pending').reduce((sum, c) => sum + c.commissionAmount, 0),
    received: commissions.filter(c => c.paymentStatus === 'received').reduce((sum, c) => sum + c.commissionAmount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Revenue & Commission</h1>
          <p className="text-gray-600">Track revenue, margins, and commission payments</p>
        </div>
        <Button className="bg-secondary hover:bg-secondary/90">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total Booking Value</p>
            <p className="text-3xl font-bold">€{totals.totalBookingValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total Commission</p>
            <p className="text-3xl font-bold">€{totals.totalCommission.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Received</p>
            <p className="text-3xl font-bold">€{totals.received.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Pending</p>
            <p className="text-3xl font-bold">€{totals.pending.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search by group name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Commission Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Group Name</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Booking Value</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Margin</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Commission %</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Commission Amount</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Due Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-primary">{comm.groupName}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-semibold">€{comm.totalBookingValue.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-700">€{comm.totalMargin.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">€{comm.marginPerRoom}/room</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-primary">{comm.commissionPercent}%</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-secondary">€{comm.commissionAmount.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm">{format(new Date(comm.paymentDueDate), 'MMM dd, yyyy')}</p>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={comm.paymentStatus === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {comm.paymentStatus}
                      </Badge>
                      {comm.paidDate && (
                        <p className="text-xs text-gray-500 mt-1">Paid: {format(new Date(comm.paidDate), 'MMM dd')}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-white">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueList;
