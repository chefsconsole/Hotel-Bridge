import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Why Work With Us', path: '/why-us' },
    { name: 'Contact', path: '/contact' }
  ];

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docH > 0 ? (y / docH) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-white/60'
            : 'bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-100'
        }`}
      >
        {/* Scroll progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-secondary via-yellow-400 to-secondary transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-500 ${scrolled ? 'h-16' : 'h-20'}`}>

            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="https://customer-assets.emergentagent.com/job_bridge-hospitality/artifacts/famqoiio_Screenshot%202026-04-12%20at%205.50.23%E2%80%AFPM.png"
                alt="HotelBridge Logo"
                className="w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                style={{ height: scrolled ? '2rem' : '2.5rem', transition: 'height 0.5s' }}
              />
              <div className={`font-bold text-primary transition-all duration-500 ${scrolled ? 'text-xl' : 'text-2xl'}`}>
                Hotel<span className="text-shimmer">Bridge</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-lg hover:text-secondary hover:bg-secondary/5 ${
                    isActive(link.path)
                      ? 'text-primary active'
                      : 'text-gray-600'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden lg:flex items-center space-x-3">
              <Link to="/login" className="text-sm text-gray-500 hover:text-primary transition-colors font-medium">
                Partner Login
              </Link>
              <Button
                asChild
                size="sm"
                className="btn-gold text-white border-0 px-5 py-2 rounded-full font-semibold"
              >
                <Link to="/contact">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${
            mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="container mx-auto px-4 pb-4 pt-2 flex flex-col space-y-1 border-t border-gray-100">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-primary/5 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-primary rounded-lg hover:bg-gray-50 transition-all"
              >
                Partner Login
              </Link>
              <Button asChild className="btn-gold text-white border-0 rounded-full font-semibold">
                <Link to="/contact">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
};
