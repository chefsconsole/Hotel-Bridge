import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Calendar, TrendingUp, Clock, Building2, Users as UsersIcon,
  ArrowUpRight, Sparkles, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, AreaChart, Cell
} from 'recharts';
import { dashboardAPI, bookingsAPI } from '../../services/api';

/* ── Animated counter ───────────────────────────── */
function CountUp({ end, prefix = '', suffix = '', duration = 1500 }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        setStarted(true);
        ob.unobserve(el);
      }
    }, { threshold: 0.3 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * end));
      if (p < 1) requestAnimationFrame(tick);
      else setVal(end);
    };
    requestAnimationFrame(tick);
  }, [started, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{val.toLocaleString()}{suffix}
    </span>
  );
}

/* ── Mini sparkline ─────────────────────────────── */
function Sparkline({ data, color = '#d4af37' }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${color.replace('#','')})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Stat card ──────────────────────────────────── */
function StatCard({ icon: Icon, label, value, delta, trend, accent, sparkData, prefix = '', suffix = '' }) {
  const isPositive = delta >= 0;
  return (
    <div className="reveal group relative bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Accent corner */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl ${accent}`} />

      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          <ArrowUpRight className={`w-3 h-3 ${isPositive ? '' : 'rotate-90'}`} />
          {Math.abs(delta)}%
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
        <div className="text-2xl font-serif font-bold text-primary mb-2">
          <CountUp end={value} prefix={prefix} suffix={suffix} />
        </div>
      </div>

      {sparkData && (
        <div className="relative z-10 mt-3 -mx-1">
          <Sparkline data={sparkData} color={trend} />
        </div>
      )}
    </div>
  );
}

/* ── Custom tooltip ─────────────────────────────── */
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-gray-100 shadow-2xl p-3 text-xs">
      <div className="font-semibold text-primary mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-primary">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────── */
export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0, totalRoomNights: 0, totalCommission: 0,
    pendingPayments: 0, confirmedBookings: 0, totalHotels: 0, totalOperators: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [topHotels, setTopHotels] = useState([]);
  const [topOperators, setTopOperators] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, monthlyRes, topHotelsRes, topOperatorsRes, bookingsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getMonthlyRevenue(),
        dashboardAPI.getTopHotels(),
        dashboardAPI.getTopOperators(),
        bookingsAPI.getAll()
      ]);
      setStats(statsRes.data);
      setMonthlyData(monthlyRes.data);
      setTopHotels(topHotelsRes.data);
      setTopOperators(topOperatorsRes.data);
      setRecentBookings(
        bookingsRes.data
          .filter(b => b.status === 'confirmed' || b.status === 'quoted')
          .slice(0, 4)
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger reveal animations after load
  useEffect(() => {
    if (loading) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  // Synthesize sparkline data from monthly data
  const sparkFromMonthly = (key) =>
    monthlyData.length
      ? monthlyData.slice(-6).map(d => ({ v: d[key] || 0 }))
      : Array.from({ length: 6 }, (_, i) => ({ v: 10 + i * 5 }));

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-secondary animate-pulse" />
        </div>
        <p className="mt-6 text-gray-500 font-medium">Loading your dashboard…</p>
      </div>
    );
  }

  const statCards = [
    {
      icon: DollarSign, label: 'Total Revenue', value: stats.totalRevenue,
      delta: 12.4, accent: 'bg-gradient-to-br from-green-500 to-emerald-600',
      trend: '#10b981', sparkData: sparkFromMonthly('revenue'), prefix: '€'
    },
    {
      icon: Calendar, label: 'Room Nights', value: stats.totalRoomNights,
      delta: 8.7, accent: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      trend: '#3b82f6', sparkData: sparkFromMonthly('revenue')
    },
    {
      icon: TrendingUp, label: 'Commission Earned', value: stats.totalCommission,
      delta: 18.2, accent: 'bg-gradient-to-br from-secondary to-yellow-500',
      trend: '#d4af37', sparkData: sparkFromMonthly('commission'), prefix: '€'
    },
    {
      icon: Clock, label: 'Pending Payments', value: stats.pendingPayments,
      delta: -4.1, accent: 'bg-gradient-to-br from-orange-500 to-red-500',
      trend: '#f97316', sparkData: sparkFromMonthly('commission'), prefix: '€'
    },
    {
      icon: Building2, label: 'Active Hotels', value: stats.totalHotels,
      delta: 6.3, accent: 'bg-gradient-to-br from-purple-500 to-pink-500',
      trend: '#a855f7'
    },
    {
      icon: UsersIcon, label: 'Partner Operators', value: stats.totalOperators,
      delta: 14.0, accent: 'bg-gradient-to-br from-indigo-500 to-blue-600',
      trend: '#6366f1'
    },
  ];

  const userEmail = localStorage.getItem('userEmail') || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = userEmail.split('@')[0]?.split('.')[0] || 'there';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* ── Welcome banner ─────────────────────── */}
      <div className="reveal relative overflow-hidden rounded-3xl p-6 lg:p-8 cta-gradient text-white">
        <div className="orb w-64 h-64 bg-secondary/20 -top-10 -right-10" />
        <div className="orb w-48 h-48 bg-white/5 -bottom-10 left-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-yellow-300 mb-3">
              <Sparkles className="w-3 h-3" /> Dashboard Overview
            </div>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold leading-tight mb-2">
              {greeting}, <span className="text-shimmer capitalize">{firstName}</span>
            </h1>
            <p className="text-sm text-gray-300">Here's what's happening with your business today.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/crm/bookings"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold btn-gold text-white inline-flex items-center gap-2"
            >
              New Booking <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/crm/ai-assistant"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold glass text-white border border-white/20 inline-flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              Ask AI <Sparkles className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger">
        {statCards.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* ── Charts row ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue chart */}
        <div className="reveal lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">Revenue & Commission</h3>
              <p className="text-xs text-gray-500">Last 12 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" /> Commission
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(221, 83%, 25%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(221, 83%, 25%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4af37" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={v => `€${v.toLocaleString()}`} />} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(221, 83%, 25%)" strokeWidth={2.5} fill="url(#revGrad)" name="Revenue" />
              <Area type="monotone" dataKey="commission" stroke="#d4af37" strokeWidth={2.5} fill="url(#commGrad)" name="Commission" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top hotels */}
        <div className="reveal bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">Top Hotels</h3>
              <p className="text-xs text-gray-500">By bookings</p>
            </div>
            <Link to="/crm/hotels" className="text-xs text-secondary font-semibold hover:underline">View all</Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topHotels} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="bookings" radius={[0, 8, 8, 0]}>
                {topHotels.map((_, i) => (
                  <Cell key={i} fill={`hsl(${43 + i * 8}, 74%, ${49 + i * 4}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom row: operators + recent bookings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Operators table */}
        <div className="reveal lg:col-span-3 bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">Top Operators</h3>
              <p className="text-xs text-gray-500">Ranked by revenue this period</p>
            </div>
            <Link to="/crm/operators" className="text-xs text-secondary font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {topOperators.map((op, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white ${
                  i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                  i === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                  i === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-800' :
                  'bg-gradient-to-br from-gray-300 to-gray-400'
                }`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-primary text-sm truncate">{op.name}</div>
                  <div className="text-xs text-gray-500">{op.bookings} bookings</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-secondary text-sm">€{op.revenue.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="reveal lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-lg font-bold text-primary">Recent Bookings</h3>
            <Link to="/crm/bookings" className="text-xs text-secondary font-semibold hover:underline flex items-center gap-1">
              All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentBookings.map((b) => (
              <div key={b.id} className="p-4 rounded-xl border border-gray-100 hover:border-secondary/40 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-primary text-sm truncate">{b.groupName}</div>
                    <div className="text-xs text-gray-500 truncate">{b.hotelName}</div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    b.status === 'confirmed'
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    {b.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-500">{b.destination}</span>
                  <span className="text-sm font-bold text-secondary">€{b.totalRevenue?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
