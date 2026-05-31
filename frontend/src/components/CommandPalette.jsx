import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Building2, Users, Calendar,
  DollarSign, Bot, Plus, LogOut, Sparkles, ArrowRight, Command, Inbox
} from 'lucide-react';

const COMMANDS = [
  { id: 'dash', label: 'Go to Dashboard', icon: LayoutDashboard, path: '/crm', group: 'Navigation', keywords: 'home overview metrics' },
  { id: 'leads', label: 'Open Leads inbox', icon: Inbox, path: '/crm/leads', group: 'Navigation', keywords: 'inquiries contact newsletter messages' },
  { id: 'hotels', label: 'View Hotels', icon: Building2, path: '/crm/hotels', group: 'Navigation', keywords: 'properties' },
  { id: 'operators', label: 'View Operators', icon: Users, path: '/crm/operators', group: 'Navigation', keywords: 'dmc tour' },
  { id: 'bookings', label: 'View Bookings', icon: Calendar, path: '/crm/bookings', group: 'Navigation', keywords: 'group reservations' },
  { id: 'revenue', label: 'View Revenue', icon: DollarSign, path: '/crm/revenue', group: 'Navigation', keywords: 'commission margin' },
  { id: 'ai', label: 'Open AI Assistant', icon: Bot, path: '/crm/ai-assistant', group: 'Navigation', keywords: 'chat gpt' },

  { id: 'add-hotel', label: 'Add new hotel', icon: Plus, path: '/crm/hotels?action=add', group: 'Actions', keywords: 'new create' },
  { id: 'add-operator', label: 'Add new operator', icon: Plus, path: '/crm/operators?action=add', group: 'Actions', keywords: 'new create' },
  { id: 'add-booking', label: 'Add new booking', icon: Plus, path: '/crm/bookings?action=add', group: 'Actions', keywords: 'new create' },

  { id: 'ask', label: 'Ask AI: top performing hotels', icon: Sparkles, path: '/crm/ai-assistant?q=top-hotels', group: 'AI Quick Ask', keywords: 'question' },
  { id: 'pending', label: 'Ask AI: pending commission payments', icon: Sparkles, path: '/crm/ai-assistant?q=pending', group: 'AI Quick Ask', keywords: 'question' },
  { id: 'forecast', label: 'Ask AI: 90-day revenue forecast', icon: Sparkles, path: '/crm/ai-assistant?q=forecast', group: 'AI Quick Ask', keywords: 'question' },

  { id: 'logout', label: 'Log out', icon: LogOut, action: 'logout', group: 'Account', keywords: 'signout' },
];

export function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter
  const filtered = query
    ? COMMANDS.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.keywords?.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q)
        );
      })
    : COMMANDS;

  // Group by category
  const grouped = filtered.reduce((acc, c) => {
    (acc[c.group] = acc[c.group] || []).push(c);
    return acc;
  }, {});

  // Execute
  const execute = (cmd) => {
    if (cmd.action === 'logout') {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userEmail');
      navigate('/login');
    } else if (cmd.path) {
      navigate(cmd.path);
    }
    onClose();
  };

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIdx]) execute(filtered[selectedIdx]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, selectedIdx]);

  // Reset selected on filter change
  useEffect(() => { setSelectedIdx(0); }, [query]);

  if (!open) return null;

  // Build flat index map for visual selection
  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-in"
        style={{ animationDuration: '0.2s' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-0 outline-none text-base text-primary placeholder:text-gray-400"
          />
          <kbd className="px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {Object.keys(grouped).length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results for "<span className="text-primary font-semibold">{query}</span>"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</div>
                {items.map((cmd) => {
                  flatIdx++;
                  const isSelected = flatIdx === selectedIdx;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelectedIdx(flatIdx)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-secondary/10' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-secondary/20 text-secondary' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                        {cmd.label}
                      </span>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-secondary" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50/50 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">esc</kbd>
              close
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Command className="w-3 h-3" /> HotelBridge
          </div>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
