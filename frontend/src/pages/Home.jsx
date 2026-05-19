import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  ArrowRight, Building2, TrendingUp, Users, Globe,
  Star, CheckCircle2, ChevronRight, Zap, Shield, Award,
  Calculator, MessageCircle, Handshake, Sparkles, Plus, Minus,
  PlayCircle, BadgeCheck
} from 'lucide-react';
import { services, stats, testimonials } from '../data/mockData';
import { useRevealAll } from '../hooks/useInView';
import { useTilt } from '../hooks/useTilt';
import { useEffect, useRef, useState } from 'react';

/* ── Animated counter ───────────────────────────── */
function CountUp({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        observer.unobserve(el);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const numeric = parseInt(target.replace(/\D/g, ''), 10);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(ease * numeric));
      if (p < 1) requestAnimationFrame(tick);
      else setCount(numeric);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  const prefix = target.match(/^[^\d]*/)?.[0] || '';
  const numeric = parseInt(target.replace(/\D/g, ''), 10);
  const trailSuffix = target.slice(target.search(/\d/) + numeric.toString().length);

  return (
    <span ref={ref}>
      {prefix}{count}{trailSuffix || suffix}
    </span>
  );
}

/* ── Tilt service card ──────────────────────────── */
function ServiceCard({ service }) {
  const tiltRef = useTilt(6);
  const iconMap = { Building2, TrendingUp, Users, Globe, Zap, Shield, Award };
  const IconComponent = iconMap[service.icon] || Building2;

  return (
    <div
      ref={tiltRef}
      className="tilt-card gradient-border glass-card rounded-2xl p-7 group hover:shadow-2xl transition-shadow duration-500"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center mb-5 group-hover:from-secondary/30 transition-all duration-300">
        <IconComponent className="w-7 h-7 text-secondary" />
      </div>
      <h3 className="text-xl font-serif font-semibold text-primary mb-3 leading-snug">{service.title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed mb-5">{service.description}</p>
      <Link
        to="/services"
        className="inline-flex items-center gap-1 text-secondary text-sm font-semibold group/link hover:gap-2 transition-all duration-200"
      >
        Learn More
        <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-200" />
      </Link>
    </div>
  );
}

/* ── ROI Calculator ─────────────────────────────── */
function RoiCalculator() {
  const [rooms, setRooms] = useState(120);
  const [adr, setAdr] = useState(180);
  const [occupancy, setOccupancy] = useState(72);

  // 40% revenue uplift assumption (matches stat shown on site)
  const baseAnnualRevenue = rooms * adr * 365 * (occupancy / 100);
  const upliftRevenue = baseAnnualRevenue * 0.40;
  const additionalNights = rooms * 365 * (occupancy / 100) * 0.40;
  const ourFee = upliftRevenue * 0.12;
  const netUplift = upliftRevenue - ourFee;

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 reveal">
          <div className="section-divider" />
          <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
            ROI Calculator
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
            See what HotelBridge could<br />add to your <span className="text-shimmer">bottom line</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Adjust the sliders to your property's profile. Live calculation.
          </p>
        </div>

        <div className="max-w-6xl mx-auto reveal-scale grid lg:grid-cols-5 gap-6 lg:gap-10">

          {/* Inputs */}
          <div className="lg:col-span-3 bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 lg:p-10 border border-gray-100">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Your property</div>
                <div className="font-serif font-bold text-primary">Estimate your uplift</div>
              </div>
            </div>

            {/* Rooms slider */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-primary">Number of Rooms</label>
                <div className="font-serif text-2xl font-bold text-secondary">{rooms}</div>
              </div>
              <input
                type="range" min="20" max="500" step="10" value={rooms}
                onChange={(e) => setRooms(parseInt(e.target.value, 10))}
                className="roi-slider"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>20</span><span>500</span>
              </div>
            </div>

            {/* ADR slider */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-primary">Avg. Daily Rate (ADR)</label>
                <div className="font-serif text-2xl font-bold text-secondary">€{adr}</div>
              </div>
              <input
                type="range" min="60" max="600" step="10" value={adr}
                onChange={(e) => setAdr(parseInt(e.target.value, 10))}
                className="roi-slider"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>€60</span><span>€600</span>
              </div>
            </div>

            {/* Occupancy slider */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-primary">Current Occupancy</label>
                <div className="font-serif text-2xl font-bold text-secondary">{occupancy}%</div>
              </div>
              <input
                type="range" min="30" max="95" step="1" value={occupancy}
                onChange={(e) => setOccupancy(parseInt(e.target.value, 10))}
                className="roi-slider"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>30%</span><span>95%</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl p-6 lg:p-8 cta-gradient text-white">
            <div className="orb w-48 h-48 bg-secondary/20 -top-10 -right-10" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[10px] font-bold text-yellow-300 mb-6 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Projected Year 1
              </div>

              <div className="mb-6">
                <div className="text-xs text-gray-300 uppercase tracking-widest mb-1">Additional Revenue</div>
                <div className="font-serif text-4xl lg:text-5xl font-bold text-shimmer leading-none">
                  €{Math.round(upliftRevenue).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-2">40% uplift average · validated by 200+ partners</div>
              </div>

              <div className="space-y-3 mb-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Additional Room Nights</span>
                  <span className="text-sm font-semibold">{Math.round(additionalNights).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Our Fee (12% avg.)</span>
                  <span className="text-sm font-semibold">€{Math.round(ourFee).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm font-bold text-secondary">Your Net Uplift</span>
                  <span className="font-serif text-xl font-bold text-shimmer">€{Math.round(netUplift).toLocaleString()}</span>
                </div>
              </div>

              <Button asChild className="w-full btn-gold border-0 text-white rounded-xl py-6 font-semibold">
                <Link to="/contact">
                  Get a custom estimate <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <p className="text-[10px] text-gray-400 mt-3 text-center">
                Numbers are projections based on our partner-network averages. Not a guarantee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Testimonial card ───────────────────────────── */
function TestimonialCard({ testimonial }) {
  return (
    <div className="flex-shrink-0 w-80 glass-card rounded-2xl p-6">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
        ))}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{testimonial.text}"</p>
      <div className="flex items-center gap-3">
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className="w-11 h-11 rounded-full object-cover ring-2 ring-secondary/20"
        />
        <div>
          <div className="font-semibold text-primary text-sm">{testimonial.name}</div>
          <div className="text-xs text-gray-400">{testimonial.position}</div>
          <div className="text-xs text-secondary font-medium">{testimonial.hotel}</div>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ ────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState(0);
  const faqs = [
    {
      q: 'How quickly will I see my first group booking?',
      a: 'Most partners see their first group booking confirmed within 60–90 days of activation. Some have closed within their first 30 days, depending on lead time and seasonality.'
    },
    {
      q: 'What does HotelBridge charge?',
      a: 'We charge a commission only on confirmed, materialised bookings — typically 10–15% depending on volume tier. Zero setup fees, zero monthly retainers. You only pay when your hotel is paid.'
    },
    {
      q: 'Do I lose direct relationships with operators?',
      a: 'No — we are an extension of your sales team. All contracts can be co-signed in your name, and you retain full ownership of every operator relationship we open up for you.'
    },
    {
      q: 'Which markets do you currently cover?',
      a: 'Our core network is Indian tour operators and DMCs (200+ partners), with growing reach into Southeast Asian and Middle Eastern outbound markets. We can scope additional markets on request.'
    },
    {
      q: 'How does the CRM portal work?',
      a: 'Every partner hotel gets a dedicated CRM login with real-time visibility into your bookings, revenue, commissions, and an AI assistant. Mobile-optimised. Updates within seconds of any new booking.'
    },
    {
      q: 'Is my hotel right for HotelBridge?',
      a: 'We work best with 3–5 star hotels (50+ rooms) in destinations Indian travelers actively visit. Apply for partnership — we will assess fit within 48 hours.'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              Frequently Asked
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Questions, answered.
            </h2>
            <p className="text-gray-500 text-lg">
              Everything you need to know before becoming a partner.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div
                key={i}
                className={`reveal bg-white rounded-2xl border transition-all duration-300 ${
                  open === i ? 'border-secondary/40 shadow-xl' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className={`font-serif font-semibold text-base lg:text-lg transition-colors ${
                    open === i ? 'text-secondary' : 'text-primary'
                  }`}>
                    {f.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    open === i ? 'bg-secondary text-white rotate-180' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                <div
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                  style={{ maxHeight: open === i ? '300px' : '0px' }}
                >
                  <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Still have questions? */}
          <div className="mt-10 text-center reveal">
            <p className="text-sm text-gray-500 mb-4">Still have questions?</p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-secondary font-semibold hover:gap-3 transition-all"
            >
              Talk to our team <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Main component ─────────────────────────────── */
export const Home = () => {
  useRevealAll();

  /* Testimonial auto-scroll */
  const trackRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const posRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const speed = 0.5;

    const animate = () => {
      if (!isPaused) {
        posRef.current += speed;
        const half = track.scrollWidth / 2;
        if (posRef.current >= half) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused]);

  /* Parallax hero */
  const heroRef = useRef(null);
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const doubled = [...testimonials, ...testimonials, ...testimonials, ...testimonials];

  return (
    <div className="flex flex-col overflow-hidden">

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Parallax background */}
        <div ref={heroRef} className="absolute inset-0 will-change-transform">
          <img
            src="https://images.unsplash.com/photo-1677129667171-92abd8740fa3?w=1800&q=80"
            alt="Luxury Hotel"
            className="w-full h-full object-cover scale-110"
          />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 hero-mesh" />

        {/* Floating orbs */}
        <div className="orb w-96 h-96 bg-secondary/20 top-10 -right-20 animate-float-slow" />
        <div className="orb w-64 h-64 bg-primary/30 -bottom-10 left-10 animate-float" style={{ animationDelay: '2s' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-yellow-300 mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            Trusted by 200+ Hotels Across 15 Countries
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Connecting Hotels with<br />
            <span className="text-shimmer">India's Booming</span><br />
            Travel Market
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-gray-200 leading-relaxed animate-fade-up" style={{ animationDelay: '0.25s' }}>
            Unlock consistent, high-value group bookings through our network of 200+ premium Indian tour operators and DMCs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Button
              asChild
              size="lg"
              className="btn-gold text-white border-0 px-8 py-6 rounded-full text-base font-semibold"
            >
              <Link to="/partnerships">
                Become a Partner <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="glass text-white border-white/30 border px-8 py-6 rounded-full text-base font-semibold hover:bg-white/20 transition-all"
            >
              <Link to="/services">Explore Services</Link>
            </Button>
          </div>

          {/* Social proof row */}
          <div className="mt-14 flex flex-wrap justify-center gap-8 animate-fade-up" style={{ animationDelay: '0.55s' }}>
            {[
              { icon: Building2, text: '200+ Hotel Partners' },
              { icon: Globe, text: '15 Countries' },
              { icon: Users, text: '500K+ Room Nights' },
              { icon: TrendingUp, text: '40% Avg. Revenue Uplift' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-gray-300">
                <Icon className="w-4 h-4 text-secondary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-1 text-white/50 text-xs">
          <div className="w-5 h-8 rounded-full border border-white/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-float" />
          </div>
          Scroll
        </div>
      </section>

      {/* ── LOGO WALL ─────────────────────────────────── */}
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-[0.25em] mb-8">
            Trusted by leading hotels and operators worldwide
          </p>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            <div className="flex items-center gap-12 animate-marquee" style={{ width: 'max-content' }}>
              {[...Array(2)].map((_, dup) => (
                <div key={dup} className="flex items-center gap-12 shrink-0">
                  {[
                    'Grand Hotel Europa', 'Château de Luxe', 'Alpine Resort',
                    'Mediterranean Pearl', 'Royal Plaza', 'Coastal Grand',
                    'Nexus DMC', 'Voyageur Travel', 'Indus Tours'
                  ].map((name, i) => (
                    <div key={`${dup}-${i}`} className="text-base lg:text-lg font-serif italic text-gray-300 hover:text-primary transition-colors whitespace-nowrap select-none">
                      {name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────── */}
      <section className="py-14 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 stagger">
            {stats.map((stat, i) => (
              <div key={i} className="stat-card reveal text-center py-6 px-4 rounded-2xl hover:bg-gray-50 transition-all">
                <div className="text-4xl md:text-5xl font-serif font-bold text-primary mb-2">
                  <CountUp target={stat.value} />
                </div>
                <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              How It Works
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              From signup to <span className="text-shimmer">booked rooms</span> in 90 days
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              A proven three-step process trusted by 200+ hotels.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 stagger relative">
            {/* Connecting line behind cards */}
            <div className="hidden lg:block absolute top-1/2 left-[16%] right-[16%] h-px bg-gradient-to-r from-secondary/0 via-secondary/40 to-secondary/0 -translate-y-12" />

            {[
              {
                step: '01', icon: MessageCircle, title: 'Discovery & Onboarding',
                desc: 'We learn your property, capacity, and target demographic. Custom market positioning crafted in week one.',
                time: 'Week 1–2'
              },
              {
                step: '02', icon: Handshake, title: 'Market Activation',
                desc: 'We introduce your hotel to our network of 200+ pre-vetted Indian tour operators and DMCs with custom offerings.',
                time: 'Week 3–6'
              },
              {
                step: '03', icon: TrendingUp, title: 'Bookings & Growth',
                desc: 'First group bookings arrive. Dedicated account manager optimizes rates, allotments, and renewals.',
                time: 'Week 7–12'
              }
            ].map(({ step, icon: Icon, title, desc, time }, i) => (
              <div key={step} className="reveal relative">
                <div className="group relative h-full bg-white rounded-3xl p-8 border border-gray-100 hover:border-secondary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 z-10">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="font-serif text-5xl font-bold text-secondary/15 group-hover:text-secondary/30 transition-colors leading-none">
                      {step}
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center group-hover:from-secondary/25 transition-all">
                      <Icon className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                  <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">{time}</div>
                  <h3 className="font-serif text-xl font-bold text-primary mb-3">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ─────────────────────────────── */}
      <RoiCalculator />

      {/* ── SERVICES ──────────────────────────────────── */}
      <section className="py-24 mesh-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              What We Do
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Comprehensive Hotel<br />Sales Services
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              From market entry to revenue growth — end-to-end solutions to help your hotel thrive in the Indian market.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {services.slice(0, 6).map((service) => (
              <div key={service.id} className="reveal">
                <ServiceCard service={service} />
              </div>
            ))}
          </div>

          <div className="text-center mt-12 reveal">
            <Button asChild size="lg" variant="outline" className="border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-full px-8 transition-all duration-300">
              <Link to="/services">View All Services <ChevronRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── WHY US ────────────────────────────────────── */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="reveal-left">
              <div className="section-divider" style={{ margin: '0 0 1.5rem' }} />
              <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
                Why HotelBridge
              </span>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 leading-tight">
                Your Gateway to India's<br />
                <span className="text-shimmer">Booming Market</span>
              </h2>
              <p className="text-gray-500 mb-10 text-lg leading-relaxed">
                Over 20 million Indian travelers explore the world annually. We make tapping into this lucrative market simple, proven, and profitable.
              </p>

              <div className="space-y-5">
                {[
                  {
                    icon: Award,
                    title: 'Established Network',
                    desc: 'Direct relationships with 200+ tour operators and DMCs across India.'
                  },
                  {
                    icon: TrendingUp,
                    title: 'Proven Results',
                    desc: 'Our partners see an average 40% revenue increase within the first year.'
                  },
                  {
                    icon: Users,
                    title: 'Group Booking Expertise',
                    desc: 'Specialized in high-volume group contracts ensuring consistent occupancy.'
                  }
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
                      <Icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary mb-1">{title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Button asChild size="lg" className="btn-gold text-white border-0 rounded-full px-8">
                  <Link to="/why-us">Discover All Benefits <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>

            {/* Right — image stack */}
            <div className="reveal-right relative">
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80"
                  alt="Business Partnership"
                  className="w-full h-[520px] object-cover"
                />
                {/* Overlay card */}
                <div className="absolute bottom-6 left-6 right-6 glass-dark rounded-2xl p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300">Partner Satisfaction</span>
                    <span className="text-secondary font-bold text-lg">95%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-secondary to-yellow-400 h-2 rounded-full" style={{ width: '95%' }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Based on 200+ hotel partner surveys in 2024</p>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-6 -right-6 glass-dark rounded-2xl p-4 text-white text-center animate-float shadow-xl">
                <div className="text-3xl font-serif font-bold text-shimmer">40%</div>
                <div className="text-xs text-gray-300 mt-1">Revenue<br />Growth</div>
              </div>
              {/* Orb */}
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────── */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="text-center reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              Success Stories
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Trusted by Leading Hotels
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Hear from hotel partners across Europe on their experience with HotelBridge.
            </p>
          </div>
        </div>

        {/* Infinite scroll marquee */}
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

          <div ref={trackRef} className="flex gap-6 py-4" style={{ width: 'max-content' }}>
            {doubled.map((t, i) => (
              <TestimonialCard key={i} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <FAQ />

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="py-28 cta-gradient relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="orb w-96 h-96 bg-secondary/15 -top-20 -right-20" />
        <div className="orb w-64 h-64 bg-white/5 bottom-0 left-10" />

        {/* Grid */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white relative z-10">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm font-medium text-yellow-300">
              <Zap className="w-4 h-4" />
              Ready to grow your hotel's revenue?
            </div>

            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Ready to Expand Your<br />
              <span className="text-shimmer">Hotel's Reach?</span>
            </h2>
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join 200+ hotels that have successfully entered the Indian travel market with HotelBridge. Results in as little as 90 days.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="btn-gold text-white border-0 px-10 py-6 rounded-full text-base font-semibold"
              >
                <Link to="/partnerships">
                  Become a Partner <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="glass text-white border-white/30 border px-10 py-6 rounded-full text-base font-semibold hover:bg-white/20 transition-all"
              >
                <Link to="/contact">Talk to Our Team</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              {['No setup fees', 'Results in 90 days', 'Dedicated account manager', 'Cancel anytime'].map(item => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
