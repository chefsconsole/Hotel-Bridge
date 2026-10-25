import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Receipt, ListTodo, ClipboardList, Inbox, Sparkles, Check, ArrowRight } from 'lucide-react';
import { getNotifications, markSeen, unseenCount, relTime, NOTIF_KIND } from '../lib/notifications';

const ICONS = { Receipt, ListTodo, ClipboardList, Inbox };

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const wrapRef = useRef(null);

  const refresh = () => { setItems(getNotifications()); setUnseen(unseenCount()); };

  // refresh on mount, when opened, and every 60s
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) { setItems(getNotifications()); }
  }, [open]);

  // click-outside + Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openPanel = () => {
    setOpen((o) => !o);
    if (!open) { markSeen(); setUnseen(0); }
  };

  const go = (link) => { setOpen(false); navigate(link); };

  const urgentCount = useMemo(() => items.filter((i) => i.urgent).length, [items]);
  const total = items.length;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={openPanel}
        className="relative p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} className={unseen > 0 ? 'animate-[wiggle_1.2s_ease-in-out]' : ''} />
        {total > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white ${urgentCount > 0 ? 'bg-red-500' : 'bg-secondary'}`}>
            {total > 9 ? '9+' : total}
          </span>
        )}
        {unseen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-[17px] h-[17px] rounded-full bg-red-500/60 animate-ping" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right animate-scale-in"
          style={{ animationDuration: '0.16s' }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-primary">Notifications</span>
              {total > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary">{total}</span>
              )}
            </div>
            {urgentCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{urgentCount} urgent</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {total === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-green-50 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-green-500" />
                </div>
                <div className="font-serif font-bold text-primary">You're all caught up</div>
                <div className="text-xs text-gray-500 mt-1">No overdue invoices, due tasks, stale RFQs, or new leads.</div>
              </div>
            ) : (
              items.map((n) => {
                const k = NOTIF_KIND[n.kind] || NOTIF_KIND.task;
                const Icon = ICONS[k.icon] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n.link)}
                    className="group w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/5 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-4 ${k.tint} ${k.ring}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary truncate">{n.title}</span>
                        {n.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{n.sub}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{relTime(n.ts)}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-secondary transition-colors mt-1 shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {total > 0 && (
            <button
              onClick={() => go('/crm/tasks')}
              className="w-full px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-primary hover:bg-gray-50 border-t border-gray-100 inline-flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Review in Tasks
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsBell;
