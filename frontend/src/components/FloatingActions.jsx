import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, ArrowUp, Calendar } from 'lucide-react';

/**
 * Floating action stack — bottom-right corner.
 * - WhatsApp chat button (always)
 * - Book-a-call CTA (appears after scroll)
 * - Scroll-to-top (appears after scroll)
 *
 * Hidden inside CRM and on the Login page (they have their own UX).
 */
const WHATSAPP_NUMBER = '911234567890'; // E.164 without +, change to real one anytime
const WHATSAPP_MSG = encodeURIComponent(
  "Hi HotelBridge! I'm interested in learning more about your services for my hotel."
);

export function FloatingActions() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 600);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  // Hide on CRM / Login screens
  if (pathname.startsWith('/crm') || pathname === '/login') return null;

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 pointer-events-none">

      {/* Scroll-to-top — appears after scroll */}
      {scrolled && (
        <button
          onClick={scrollTop}
          aria-label="Scroll to top"
          data-cursor="link"
          className="pointer-events-auto w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 text-primary flex items-center justify-center hover:scale-110 hover:border-secondary/40 transition-all animate-fade-up"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Book a Call — appears after scroll */}
      {scrolled && (
        <Link
          to="/contact"
          data-cursor="link"
          className="pointer-events-auto pl-5 pr-5 py-3 rounded-full shadow-2xl text-sm font-semibold flex items-center gap-2 btn-gold text-white border-0 animate-fade-up hover:scale-105 transition-transform"
          style={{ animationDelay: '0.05s' }}
        >
          <Calendar className="w-4 h-4" />
          Book a Call
        </Link>
      )}

      {/* WhatsApp — always visible */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        data-cursor="link"
        className="pointer-events-auto relative w-14 h-14 rounded-full shadow-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white flex items-center justify-center transition-all hover:scale-110 group"
      >
        {/* Ring pulse */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping" />
        <MessageCircle className="relative w-6 h-6 fill-current" />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Chat on WhatsApp
        </span>
      </a>
    </div>
  );
}

export default FloatingActions;
