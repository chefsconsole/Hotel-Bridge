import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Building2, Users, Calendar, DollarSign, Bot,
  LogOut, Menu, X, Search, Bell, ChevronLeft, ChevronRight, Sparkles,
  Inbox, ListTodo
} from 'lucide-react';
import { getLeads } from '../../lib/leadsStore';
import { getTasks, isOverdue, isDueToday } from '../../lib/tasksStore';
import { CommandPalette, useCommandPalette } from '../../components/CommandPalette';

const baseMenuItems = [
  { name: 'Dashboard', path: '/crm', icon: LayoutDashboard, exact: true },
  { name: 'Leads', path: '/crm/leads', icon: Inbox, badgeKey: 'newLeads' },
  { name: 'Tasks', path: '/crm/tasks', icon: ListTodo, badgeKey: 'todayTasks' },
  { name: 'Hotels', path: '/crm/hotels', icon: Building2 },
  { name: 'Operators', path: '/crm/operators', icon: Users },
  { name: 'Bookings', path: '/crm/bookings', icon: Calendar },
  { name: 'Revenue', path: '/crm/revenue', icon: DollarSign },
  { name: 'AI Assistant', path: '/crm/ai-assistant', icon: Bot, badge: 'AI' },
];

export const CRMLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const userEmail = localStorage.getItem('userEmail') || 'admin@hotelbridge.co';
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  // Badge counts (refreshes on every route change because component remounts)
  const newLeadsCount = getLeads().filter((l) => l.status === 'new').length;
  const tasks = getTasks();
  const todayTasksCount = tasks.filter((t) => isOverdue(t) || isDueToday(t)).length;
  const menuItems = baseMenuItems.map((m) => {
    if (m.badgeKey === 'newLeads' && newLeadsCount > 0) return { ...m, badge: String(newLeadsCount) };
    if (m.badgeKey === 'todayTasks' && todayTasksCount > 0) return { ...m, badge: String(todayTasksCount) };
    return m;
  });
  const currentPage = menuItems.find((m) => isActive(m))?.name || 'Dashboard';

  const cmdPalette = useCommandPalette();

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── SIDEBAR ──────────────────────────── */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-40 transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-20' : 'w-72'}
          flex flex-col`}
        style={{ background: 'linear-gradient(180deg, hsl(221, 83%, 15%) 0%, hsl(221, 83%, 11%) 100%)' }}
      >
        {/* Decorative orb */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-primary/30 blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 px-6 py-6 border-b border-white/5 flex items-center justify-between">
          <Link to="/" className={`flex items-center gap-2 ${collapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 flex items-center justify-center font-bold text-white text-sm shrink-0">
              H
            </div>
            {!collapsed && (
              <div className="text-xl font-bold text-white whitespace-nowrap">
                Hotel<span className="text-shimmer">Bridge</span>
              </div>
            )}
          </Link>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section label */}
        {!collapsed && (
          <div className="relative z-10 px-6 pt-6 pb-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Workspace</div>
          </div>
        )}

        {/* Nav */}
        <nav className="relative z-10 flex-1 px-3 py-2 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-secondary/20 to-secondary/5 text-white border border-secondary/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'}
                    ${collapsed ? 'lg:justify-center' : ''}`}
                  title={collapsed ? item.name : ''}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-secondary rounded-r-full" />
                  )}
                  <Icon
                    size={20}
                    className={`shrink-0 transition-colors ${active ? 'text-secondary' : 'group-hover:text-secondary'}`}
                  />
                  {!collapsed && (
                    <>
                      <span className="font-medium text-sm flex-1">{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-secondary text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Upgrade card */}
          {!collapsed && (
            <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 border border-secondary/20 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 mx-auto mb-3 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm font-semibold text-white mb-1">Pro Insights</div>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                Unlock AI revenue forecasting
              </p>
              <button className="w-full py-2 text-xs font-semibold text-white btn-gold rounded-lg">
                Learn More
              </button>
            </div>
          )}
        </nav>

        {/* User card / Logout */}
        <div className="relative z-10 p-3 border-t border-white/5">
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 flex items-center justify-center font-bold text-white text-xs shrink-0 ring-2 ring-secondary/30">
              {userInitials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400">Signed in as</div>
                  <div className="text-sm font-semibold text-white truncate">{userEmail}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center justify-center w-full mt-2 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MAIN ──────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-primary"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="text-xs text-gray-500">Workspace</div>
              <h2 className="text-base font-serif font-semibold text-primary leading-tight">{currentPage}</h2>
            </div>
          </div>

          {/* Search → opens command palette */}
          <button
            onClick={() => cmdPalette.setOpen(true)}
            className="hidden md:flex flex-1 max-w-md group items-center gap-2 px-3 py-2 text-sm rounded-xl bg-gray-50 hover:bg-white hover:border-secondary/40 border border-transparent transition-all"
          >
            <Search className="w-4 h-4 text-gray-400 group-hover:text-secondary transition-colors shrink-0" />
            <span className="flex-1 text-left text-gray-400">Search or jump to...</span>
            <kbd className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">⌘K</kbd>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 flex items-center justify-center font-bold text-white text-xs ring-2 ring-secondary/20">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 mesh-bg min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette open={cmdPalette.open} onClose={() => cmdPalette.setOpen(false)} />
    </div>
  );
};

export default CRMLayout;
