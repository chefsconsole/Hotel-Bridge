import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Mail, MapPin, Linkedin, Facebook, Instagram, ArrowRight, Send, CheckCircle2 } from 'lucide-react';
import { saveLead } from '../lib/leadsStore';

const socialLinks = [
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
];

const quickLinks = [
  { name: 'About Us', path: '/about' },
  { name: 'Services', path: '/services' },
  { name: 'Why Work With Us', path: '/why-us' },
  { name: 'Contact', path: '/contact' },
];

const serviceList = [
  'Hotel Sales Representation',
  'Market Development',
  'Group Contracting',
  'Tour Operator Partnerships',
  'Hospitality Consulting',
];

export const Footer = () => {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    saveLead({
      name: '',
      email: email.trim(),
      message: 'Newsletter subscription from footer',
      source: 'newsletter',
    });
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="relative overflow-hidden" style={{ background: 'hsl(221, 83%, 14%)' }}>
      {/* Decorative orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-secondary/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      {/* Top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-secondary to-transparent opacity-60" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 relative z-10">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-5">
              <div className="text-2xl font-bold text-white">
                Hotel<span className="text-shimmer">Bridge</span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Connecting exceptional hotels with the world's most lucrative group travel markets — since 2020.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-secondary/20 border border-white/10 hover:border-secondary/40 flex items-center justify-center text-gray-400 hover:text-secondary transition-all duration-300"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-5 text-sm tracking-wider uppercase">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map(({ name, path }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className="group flex items-center gap-2 text-gray-400 hover:text-secondary text-sm transition-colors duration-200"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-secondary" />
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-5 text-sm tracking-wider uppercase">Our Services</h3>
            <ul className="space-y-3">
              {serviceList.map((s) => (
                <li key={s} className="flex items-center gap-2 text-gray-400 text-sm">
                  <span className="w-1.5 h-1.5 bg-secondary/60 rounded-full flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-5 text-sm tracking-wider uppercase">Get in Touch</h3>
            <ul className="space-y-4">
              {[
                { Icon: Mail, text: 'info@hotelbridge.co', href: 'mailto:info@hotelbridge.co' },
                { Icon: MapPin, text: 'Global · Mumbai HQ', href: null },
              ].map(({ Icon, text, href }) => (
                <li key={text}>
                  {href ? (
                    <a
                      href={href}
                      className="flex items-start gap-3 text-gray-400 hover:text-secondary text-sm transition-colors group"
                    >
                      <Icon size={15} className="mt-0.5 flex-shrink-0 group-hover:text-secondary transition-colors" />
                      <span>{text}</span>
                    </a>
                  ) : (
                    <div className="flex items-start gap-3 text-gray-400 text-sm">
                      <Icon size={15} className="mt-0.5 flex-shrink-0" />
                      <span>{text}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Mini CTA */}
            <div className="mt-7 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400 mb-3">Ready to grow your bookings?</p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:gap-2 transition-all duration-200"
              >
                Contact us today <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Newsletter strip */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="font-serif text-xl font-bold text-white mb-1">Group travel insights, monthly.</h3>
            <p className="text-sm text-gray-400">Market trends, partnership openings, and growth tips for hotels.</p>
          </div>
          {subscribed ? (
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/10 border border-green-400/30 text-green-300 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Subscribed — thanks!
            </div>
          ) : (
            <form onSubmit={handleNewsletter} className="flex gap-2 w-full md:w-auto md:min-w-[360px]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hotel.com"
                required
                className="flex-1 h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:bg-white/10 focus:border-secondary transition-all"
              />
              <button
                type="submit"
                className="h-11 px-5 rounded-xl btn-gold border-0 text-white font-semibold text-sm flex items-center gap-1.5"
                data-cursor="link"
              >
                <Send className="w-3.5 h-3.5" /> Subscribe
              </button>
            </form>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 pt-7">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs">
              &copy; {year} HotelBridge. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-gray-500 hover:text-secondary text-xs transition-colors" data-cursor="link">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-500 hover:text-secondary text-xs transition-colors" data-cursor="link">
                Terms of Service
              </Link>
              <Link to="/login" className="text-gray-500 hover:text-secondary text-xs transition-colors">
                Partner Login
              </Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
