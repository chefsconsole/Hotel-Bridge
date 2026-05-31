import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'hotelbridge.cookieConsent';

export function CookieBanner() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem(STORAGE_KEY, 'all');
    setVisible(false);
  };
  const acceptEssential = () => {
    localStorage.setItem(STORAGE_KEY, 'essential');
    setVisible(false);
  };

  if (!visible || pathname.startsWith('/crm') || pathname === '/login') return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 max-w-md w-[calc(100%-2.5rem)] animate-fade-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 relative">
        <button
          onClick={acceptEssential}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          data-cursor="link"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1">
            <h4 className="font-serif font-bold text-primary text-sm mb-1">We use cookies</h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              We use essential cookies to make our site work and optional analytics to improve your experience. See our{' '}
              <Link to="/privacy" className="text-secondary font-semibold hover:underline" data-cursor="link">
                privacy policy
              </Link>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={acceptAll}
                data-cursor="link"
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold btn-gold text-white border-0"
              >
                Accept all
              </button>
              <button
                onClick={acceptEssential}
                data-cursor="link"
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Essential only
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieBanner;
