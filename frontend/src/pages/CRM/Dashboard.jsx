import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Clock,
  Building2,
  Users as UsersIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getDashboardStats, getMonthlyRevenue, getTopHotels, getTopOperators } from '../../data/crmMockData';

export const Dashboard = () => {
  const stats = getDashboardStats();
  const monthlyData = getMonthlyRevenue();
  const topHotels = getTopHotels();
  const topOperators = getTopOperators();

  const statCards = [
    {
      title: 'Total Confirmed Revenue',
      value: `€${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Room Nights',
      value: stats.totalRoomNights,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Commission',
      value: `€${stats.totalCommission.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      title: 'Pending Payments',
      value: `€${stats.pendingPayments.toLocaleString()}`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Active Hotels',
      value: stats.totalHotels,
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Partner Operators',
      value: stats.totalOperators,
      icon: UsersIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue & Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#1e3a8a" 
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="commission" 
                  stroke="#d4af37" 
                  strokeWidth={2}
                  name="Commission"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Hotels Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Hotels</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topHotels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#d4af37" name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Operators Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Operators by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Operator</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Bookings</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topOperators.map((op, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{op.name}</td>
                    <td className="py-3 px-4">{op.bookings}</td>
                    <td className="py-3 px-4 font-semibold text-secondary">€{op.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-semibold text-primary">Mumbai Corporate Incentive</p>
                <p className="text-sm text-gray-600">Grand Hotel Europa - Rome</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-secondary">€18,000</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Confirmed</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-semibold text-primary">Delhi Wedding Group</p>
                <p className="text-sm text-gray-600">Château de Luxe - Paris</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-secondary">€18,000</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Confirmed</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-primary">Pune Senior Citizens</p>
                <p className="text-sm text-gray-600">Grand Hotel Europa - Rome</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-secondary">€15,600</p>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Quoted</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
