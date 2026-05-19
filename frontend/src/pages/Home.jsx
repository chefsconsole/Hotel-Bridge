import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  ArrowRight, Building2, TrendingUp, Users, Globe,
  Star, CheckCircle2, ChevronRight, Zap, Shield, Award,
  Calculator, MessageCircle, Handshake, Sparkles, Plus, Minus,
  PlayCircle, MapPin, Crown, Heart, Mountain, Sun
} from 'lucide-react';
import { services, stats, testimonials } from '../data/mockData';
import { useRevealAll } from '../hooks/useInView';
import { useTilt } from '../hooks/useTilt';
import { Magnetic } from '../components/MagneticButton';
import { useEffect, useRef, useState } from 'react';

/* ───────────────────────────────────────────────────
   COUNT-UP — slot machine style number reveal
   ─────────────────────────────────────────────────── */
function CountUp({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { setStarted(true); ob.unobserve(el); }
    }, { threshold: 0.4 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const numeric = parseInt(String(target).replace(/\D/g, ''), 10);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(eased * numeric));
      if (p < 1) requestAnimationFrame(tick);
      else setCount(numeric);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  const str = String(target);
  const prefix = str.match(/^[^\d]*/)?.[0] || '';
  const numeric = parseInt(str.replace(/\D/g, ''), 10);
  const suffix = str.slice(str.search(/\d/) + String(numeric).length);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ───────────────────────────────────────────────────
   SERVICE CARD — 3D tilt with shine sweep
   ─────────────────────────────────────────────────── */
function ServiceCard({ service }) {
  const tiltRef = useTilt(8);
  const iconMap = { Building2, TrendingUp, Users, Globe, Zap, Shield, Award };
  const IconComponent = iconMap[service.icon] || Building2;

  return (
    <div
      ref={tiltRef}
      className="tilt-card group relative rounded-3xl overflow-hidden bg-white border border-gray-100 hover:border-secondary/40 transition-all duration-500"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}
    >
      {/* Shine sweep */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1200 pointer-events-none"
           style={{
             background: 'linear-gradient(110deg, transparent 30%, rgba(212,175,55,0.15) 50%, transparent 70%)',
             transitionDuration: '1.2s'
           }} />

      <div className="relative p-7">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 via-secondary/10 to-yellow-400/5 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
          <IconComponent className="w-7 h-7 text-secondary" />
        </div>
        <h3 className="text-xl font-serif font-bold text-primary mb-3 leading-snug">{service.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-5">{service.description}</p>
        <Link
          to="/services"
          data-cursor="link"
          className="inline-flex items-center gap-1 text-secondary text-sm font-semibold group/link"
        >
          Learn More
          <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1.5 transition-transform duration-300" />
        </Link>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────
   ROI CALCULATOR
   ─────────────────────────────────────────────────── */
function RoiCalculator() {
  const [rooms, setRooms] = useState(120);
  const [adr, setAdr] = useState(180);
  const [occupancy, setOccupancy] = useState(72);

  const baseAnnualRevenue = rooms * adr * 365 * (occupancy / 100);
  const upliftRevenue = baseAnnualRevenue * 0.40;
  const additionalNights = rooms * 365 * (occupancy / 100) * 0.40;
  const ourFee = upliftRevenue * 0.12;
  const netUplift = upliftRevenue - ourFee;

  return (
    <section className="py-28 bg-white relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 reveal">
          <div className="section-divider" />
          <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
            ROI Calculator
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
            See what HotelBridge could<br />
            add to your <span className="text-shimmer">bottom line</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Adjust the sliders to match your property. Live projections.
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

            {[
              { lbl: 'Number of Rooms', val: rooms, min: 20, max: 500, step: 10, set: setRooms, fmt: (v) => v, suffix: '' },
              { lbl: 'Avg. Daily Rate (ADR)', val: adr, min: 60, max: 600, step: 10, set: setAdr, fmt: (v) => `€${v}`, suffix: '' },
              { lbl: 'Current Occupancy', val: occupancy, min: 30, max: 95, step: 1, set: setOccupancy, fmt: (v) => `${v}%`, suffix: '' },
            ].map((s) => (
              <div key={s.lbl} className="mb-7 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-primary">{s.lbl}</label>
                  <div className="font-serif text-2xl font-bold text-secondary tabular-nums">{s.fmt(s.val)}</div>
                </div>
                <input
                  type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                  onChange={(e) => s.set(parseInt(e.target.value, 10))}
                  className="roi-slider"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>{s.fmt(s.min)}</span><span>{s.fmt(s.max)}</span>
                </div>
              </div>
            ))}
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
                <div className="font-serif text-4xl lg:text-5xl font-bold text-shimmer leading-none tabular-nums">
                  €{Math.round(upliftRevenue).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-2">40% uplift avg · validated by 200+ partners</div>
              </div>

              <div className="space-y-3 mb-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Additional Room Nights</span>
                  <span className="text-sm font-semibold tabular-nums">{Math.round(additionalNights).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Our Fee (12% avg.)</span>
                  <span className="text-sm font-semibold tabular-nums">€{Math.round(ourFee).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm font-bold text-secondary">Your Net Uplift</span>
                  <span className="font-serif text-xl font-bold text-shimmer tabular-nums">€{Math.round(netUplift).toLocaleString()}</span>
                </div>
              </div>

              <Magnetic strength={0.25}>
                <Button asChild className="w-full btn-gold border-0 text-white rounded-xl py-6 font-semibold" data-cursor="link">
                  <Link to="/contact">
                    Get a custom estimate <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </Magnetic>
              <p className="text-[10px] text-gray-400 mt-3 text-center">
                Projections based on partner-network averages. Not a guarantee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────
   FAQ
   ─────────────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState(0);
  const faqs = [
    { q: 'How quickly will I see my first group booking?', a: 'Most partners see their first booking confirmed within 60–90 days of activation. Some close within 30 days, depending on lead time and seasonality.' },
    { q: 'What does HotelBridge charge?', a: 'Commission only on confirmed, materialised bookings — typically 10–15% by volume tier. Zero setup fees, zero monthly retainers. You only pay when your hotel is paid.' },
    { q: 'Do I lose direct relationships with operators?', a: 'No — we are an extension of your sales team. All contracts can be co-signed in your name. You retain full ownership of every relationship we open up for you.' },
    { q: 'Which markets do you cover?', a: 'Core: Indian tour operators and DMCs (200+). Growing reach into Southeast Asian and Middle Eastern outbound markets. Additional markets on request.' },
    { q: 'How does the CRM portal work?', a: 'Every partner gets a dedicated CRM login with real-time bookings, revenue, commissions, and an AI assistant. Mobile-optimised. Updates within seconds of any new booking.' },
    { q: 'Is my hotel right for HotelBridge?', a: 'We work best with 3–5 star hotels (50+ rooms) in destinations Indian travelers visit. Apply for partnership — we will assess fit within 48 hours.' },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-12 reveal">
          <div className="section-divider" />
          <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Frequently Asked</span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">Questions, answered.</h2>
          <p className="text-gray-500 text-lg">Everything you need to know before becoming a partner.</p>
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
                data-cursor="link"
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className={`font-serif font-semibold text-base lg:text-lg transition-colors ${open === i ? 'text-secondary' : 'text-primary'}`}>
                  {f.q}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  open === i ? 'bg-secondary text-white rotate-180' : 'bg-gray-100 text-gray-400'
                }`}>
                  {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
              </button>
              <div className="overflow-hidden transition-all duration-500 ease-in-out" style={{ maxHeight: open === i ? '300px' : '0px' }}>
                <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center reveal">
          <p className="text-sm text-gray-500 mb-4">Still have questions?</p>
          <Link to="/contact" className="inline-flex items-center gap-2 text-secondary font-semibold hover:gap-3 transition-all fancy-link" data-cursor="link">
            Talk to our team <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────
   FEATURED DESTINATIONS — HD imagery grid
   ─────────────────────────────────────────────────── */
const destinations = [
  { name: 'Santorini', country: 'Greece', img: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1200&q=85', icon: Sun, hotels: 28 },
  { name: 'Paris', country: 'France', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85', icon: Heart, hotels: 42 },
  { name: 'Swiss Alps', country: 'Switzerland', img: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=85', icon: Mountain, hotels: 19 },
  { name: 'Rome', country: 'Italy', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=85', icon: Crown, hotels: 35 },
  { name: 'Barcelona', country: 'Spain', img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=85', icon: Sun, hotels: 24 },
  { name: 'Vienna', country: 'Austria', img: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&q=85', icon: Crown, hotels: 16 },
];

function FeaturedDestinations() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 reveal">
          <div className="section-divider" />
          <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Where We Operate</span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
            Hotels in the world's<br />
            <span className="text-shimmer">most loved destinations</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            From cinematic Mediterranean coasts to Alpine retreats — we represent properties Indian travelers actively seek out.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {destinations.map((d, i) => {
            const Icon = d.icon;
            const large = i === 0 || i === 4; // make some larger
            return (
              <div
                key={d.name}
                className={`reveal img-reveal cursor-none aspect-[4/5] ${large ? 'md:row-span-2 md:aspect-[3/4]' : ''}`}
                data-cursor="link"
              >
                <img
                  src={d.img}
                  alt={d.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="img-overlay" />
                {/* Top label */}
                <div className="absolute top-5 left-5 z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[10px] font-bold uppercase tracking-widest text-white">
                    <Icon className="w-3 h-3 text-secondary" />
                    {d.country}
                  </div>
                </div>
                {/* Hotel count badge */}
                <div className="absolute top-5 right-5 z-10">
                  <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur text-[10px] font-bold text-primary">
                    {d.hotels} hotels
                  </div>
                </div>
                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 text-white">
                  <h3 className="font-serif text-3xl lg:text-4xl font-bold mb-1 leading-tight">{d.name}</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">{d.country}</div>
                    <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────
   VISUAL STORYTELLING — sticky image, scrolling text
   ─────────────────────────────────────────────────── */
function StorytellingSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Image stack — left */}
          <div className="reveal-left relative">
            <div className="grid grid-cols-2 gap-4">
              {/* Big tall image */}
              <div className="img-reveal aspect-[3/5] col-span-1 row-span-2">
                <img
                  src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85"
                  alt="Luxury Hotel"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="img-overlay" />
              </div>
              {/* Two small images */}
              <div className="img-reveal aspect-square">
                <img
                  src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=85"
                  alt="Hotel"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="img-reveal aspect-square">
                <img
                  src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=85"
                  alt="Hotel"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Floating stat card */}
            <div className="absolute -bottom-8 -right-4 lg:right-8 glass-dark rounded-2xl p-5 shadow-2xl animate-float">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-serif text-2xl font-bold text-shimmer">+40%</div>
                  <div className="text-[10px] text-gray-300 uppercase tracking-widest">Revenue uplift</div>
                </div>
              </div>
            </div>

            {/* Decorative orbs */}
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Content — right */}
          <div className="reveal-right">
            <div className="section-divider" style={{ margin: '0 0 1.5rem' }} />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              The Indian Opportunity
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 leading-tight">
              <span className="text-shimmer">27 million</span> Indians<br />
              traveling abroad annually
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Group bookings, longer stays, predictable seasonality, and 15% YoY growth. Your hotel can be on that itinerary — without building an Indian sales team from scratch.
            </p>

            <div className="space-y-5 mb-10">
              {[
                { icon: Crown, title: '200+ premium tour operators', desc: 'Direct relationships, not cold outreach' },
                { icon: Award, title: '95% renewal rate', desc: 'Partners stay because the numbers work' },
                { icon: Heart, title: 'Dedicated account manager', desc: 'A real human you can call, who knows your property' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 group">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center shrink-0 group-hover:from-secondary/30 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-1">{title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Magnetic strength={0.3}>
              <Button asChild size="lg" className="btn-gold text-white border-0 rounded-full px-8 py-6 text-base font-semibold" data-cursor="link">
                <Link to="/why-us">Discover All Benefits <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────
   TESTIMONIAL CARD
   ─────────────────────────────────────────────────── */
function TestimonialCard({ testimonial }) {
  return (
    <div className="flex-shrink-0 w-80 glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300" data-cursor="link">
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

/* ───────────────────────────────────────────────────
   HOTEL IMAGE TICKER — for hero stats row
   ─────────────────────────────────────────────────── */
const heroImages = [
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1800&q=85',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1800&q=85',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1800&q=85',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1800&q=85',
];

/* ───────────────────────────────────────────────────
   MAIN HOME
   ─────────────────────────────────────────────────── */
export const Home = () => {
  useRevealAll();
  const [heroImg, setHeroImg] = useState(0);

  // Auto-cycle hero background
  useEffect(() => {
    const id = setInterval(() => setHeroImg((i) => (i + 1) % heroImages.length), 6000);
    return () => clearInterval(id);
  }, []);

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

  /* Hero parallax */
  const heroBgRef = useRef(null);
  const heroContentRef = useRef(null);
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (heroBgRef.current) heroBgRef.current.style.transform = `translate3d(0, ${y * 0.4}px, 0) scale(1.12)`;
      if (heroContentRef.current) heroContentRef.current.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Cursor-follow spotlight on hero */
  const heroRef = useRef(null);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const handle = (e) => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty('--mouse-x', `${x}%`);
      hero.style.setProperty('--mouse-y', `${y}%`);
    };
    hero.addEventListener('mousemove', handle);
    return () => hero.removeEventListener('mousemove', handle);
  }, []);

  const doubled = [...testimonials, ...testimonials, ...testimonials, ...testimonials];

  return (
    <div className="flex flex-col overflow-x-hidden">

      {/* ════════════════════════════════════════════════
          ROYAL HERO
          ════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100vh] flex items-center justify-center overflow-hidden spotlight-wrap"
      >
        {/* Layered parallax backgrounds — cross-fading */}
        <div ref={heroBgRef} className="absolute inset-0 will-change-transform">
          {heroImages.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity ease-in-out"
              style={{ opacity: i === heroImg ? 1 : 0, transitionDuration: '2000ms' }}
            >
              <img
                src={src}
                alt="Hotel"
                className="w-full h-full object-cover"
                fetchpriority={i === 0 ? 'high' : 'auto'}
              />
            </div>
          ))}
        </div>

        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent opacity-90" />

        {/* Floating glows */}
        <div className="hero-glow w-[600px] h-[600px] bg-secondary/30 top-[10%] -right-[10%] animate-float-slow" />
        <div className="hero-glow w-[400px] h-[400px] bg-blue-400/20 -bottom-[10%] left-[5%] animate-float" style={{ animationDelay: '2s' }} />
        <div className="hero-glow w-[300px] h-[300px] bg-secondary/15 top-[40%] left-[40%] animate-float-slow" style={{ animationDelay: '4s' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Content */}
        <div ref={heroContentRef} className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white py-32">

          {/* Top badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-yellow-300 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
            </span>
            Trusted by 200+ Hotels Across 15 Countries
          </div>

          {/* Main heading */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-bold mb-8 leading-[0.95] animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Connecting Hotels with<br />
            <span className="text-royal">India's Booming</span><br />
            Travel Market
          </h1>

          <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-gray-200 leading-relaxed animate-fade-up" style={{ animationDelay: '0.25s' }}>
            Unlock consistent, high-value group bookings through our network of 200+ premium Indian tour operators and DMCs.
          </p>

          {/* CTAs with magnetic effect */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Magnetic strength={0.4}>
              <Button
                asChild size="lg"
                className="btn-gold text-white border-0 px-10 py-7 rounded-full text-base font-semibold group"
                data-cursor="link"
              >
                <Link to="/partnerships">
                  Become a Partner
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={0.4}>
              <Button
                asChild size="lg"
                className="glass text-white border border-white/30 px-10 py-7 rounded-full text-base font-semibold hover:bg-white/15 transition-all group"
                data-cursor="link"
              >
                <Link to="/services">
                  <PlayCircle className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                  See How It Works
                </Link>
              </Button>
            </Magnetic>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto pt-12 border-t border-white/10 animate-fade-up" style={{ animationDelay: '0.55s' }}>
            {[
              { v: '200+', l: 'Hotel Partners', icon: Building2 },
              { v: '500K+', l: 'Room Nights / Year', icon: Calendar },
              { v: '15', l: 'Countries', icon: Globe },
              { v: '95%', l: 'Renewal Rate', icon: Award },
            ].map(({ v, l, icon: Icon }) => (
              <div key={l} className="text-center group cursor-none">
                <Icon className="w-4 h-4 text-secondary mx-auto mb-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="font-serif text-3xl md:text-4xl font-bold text-shimmer mb-1 tabular-nums">
                  <CountUp target={v} />
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest animate-fade-up" style={{ animationDelay: '0.8s' }}>
          <div className="w-5 h-9 rounded-full border border-white/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-float" />
          </div>
          Scroll
        </div>

        {/* Image indicator dots */}
        <div className="absolute bottom-6 right-6 z-10 flex gap-2">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroImg(i)}
              data-cursor="link"
              className={`h-1 rounded-full transition-all duration-500 ${
                i === heroImg ? 'w-8 bg-secondary' : 'w-1 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          LOGO WALL
          ════════════════════════════════════════════════ */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-[0.3em] mb-8">
            Trusted by leading hotels and operators worldwide
          </p>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            <div className="flex items-center gap-16 animate-marquee" style={{ width: 'max-content' }}>
              {[...Array(2)].map((_, dup) => (
                <div key={dup} className="flex items-center gap-16 shrink-0">
                  {[
                    'Grand Hotel Europa', 'Château de Luxe', 'Alpine Resort',
                    'Mediterranean Pearl', 'Royal Plaza', 'Coastal Grand',
                    'Nexus DMC', 'Voyageur Travel', 'Indus Tours',
                  ].map((name, i) => (
                    <div key={`${dup}-${i}`} className="text-lg lg:text-xl font-serif italic text-gray-300 hover:text-primary transition-colors whitespace-nowrap select-none">
                      {name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FEATURED DESTINATIONS
          ════════════════════════════════════════════════ */}
      <FeaturedDestinations />

      {/* ════════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">How It Works</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              From signup to <span className="text-shimmer">booked rooms</span> in 90 days
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              A proven three-step process trusted by 200+ hotels.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger relative">
            <div className="hidden lg:block absolute top-1/2 left-[16%] right-[16%] h-px bg-gradient-to-r from-secondary/0 via-secondary/40 to-secondary/0 -translate-y-12" />
            {[
              { step: '01', icon: MessageCircle, title: 'Discovery & Onboarding', desc: 'We learn your property, capacity, and target demographic. Custom market positioning crafted in week one.', time: 'Week 1–2' },
              { step: '02', icon: Handshake, title: 'Market Activation', desc: 'We introduce your hotel to our network of 200+ pre-vetted Indian tour operators and DMCs.', time: 'Week 3–6' },
              { step: '03', icon: TrendingUp, title: 'Bookings & Growth', desc: 'First group bookings arrive. Dedicated account manager optimizes rates, allotments, and renewals.', time: 'Week 7–12' },
            ].map(({ step, icon: Icon, title, desc, time }) => (
              <div key={step} className="reveal">
                <div className="group relative h-full bg-white rounded-3xl p-8 border border-gray-100 hover:border-secondary/40 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 z-10">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="font-serif text-6xl font-bold text-secondary/15 group-hover:text-secondary/40 transition-colors leading-none">{step}</div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center group-hover:from-secondary/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <Icon className="w-7 h-7 text-secondary" />
                    </div>
                  </div>
                  <div className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">{time}</div>
                  <h3 className="font-serif text-xl font-bold text-primary mb-3">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          ROI CALCULATOR
          ════════════════════════════════════════════════ */}
      <RoiCalculator />

      {/* ════════════════════════════════════════════════
          VISUAL STORYTELLING
          ════════════════════════════════════════════════ */}
      <StorytellingSection />

      {/* ════════════════════════════════════════════════
          SERVICES OVERVIEW
          ════════════════════════════════════════════════ */}
      <section className="py-24 mesh-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">What We Do</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Comprehensive Hotel<br />Sales Services
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              From market entry to revenue growth — end-to-end solutions to help your hotel thrive in the Indian market.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {services.slice(0, 6).map((service) => (
              <div key={service.id} className="reveal"><ServiceCard service={service} /></div>
            ))}
          </div>

          <div className="text-center mt-12 reveal">
            <Magnetic strength={0.3}>
              <Button asChild size="lg" variant="outline" className="border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-full px-8 transition-all duration-300" data-cursor="link">
                <Link to="/services">View All Services <ChevronRight className="ml-1 w-4 h-4" /></Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TESTIMONIALS
          ════════════════════════════════════════════════ */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="text-center reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Success Stories</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Trusted by Leading Hotels
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Hear from hotel partners across Europe on their experience with HotelBridge.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
          <div ref={trackRef} className="flex gap-6 py-4" style={{ width: 'max-content' }}>
            {doubled.map((t, i) => <TestimonialCard key={i} testimonial={t} />)}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FAQ
          ════════════════════════════════════════════════ */}
      <FAQ />

      {/* ════════════════════════════════════════════════
          ROYAL CTA
          ════════════════════════════════════════════════ */}
      <section className="relative py-32 cta-gradient overflow-hidden">
        {/* Decorative orbs */}
        <div className="hero-glow w-[500px] h-[500px] bg-secondary/25 -top-20 -right-20" />
        <div className="hero-glow w-[300px] h-[300px] bg-white/5 bottom-0 left-10" />

        {/* Grid */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white relative z-10">
          <div className="reveal max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm font-medium text-yellow-300">
              <Zap className="w-4 h-4" />
              Ready to grow your hotel's revenue?
            </div>

            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.05]">
              Ready to Expand Your<br />
              <span className="text-royal">Hotel's Reach?</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join 200+ hotels successfully entering the Indian travel market. Results in as little as 90 days.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Magnetic strength={0.4}>
                <Button asChild size="lg" className="btn-gold text-white border-0 px-10 py-7 rounded-full text-base font-semibold" data-cursor="link">
                  <Link to="/partnerships">Become a Partner <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </Magnetic>
              <Magnetic strength={0.4}>
                <Button asChild size="lg" className="glass text-white border border-white/30 px-10 py-7 rounded-full text-base font-semibold hover:bg-white/15 transition-all" data-cursor="link">
                  <Link to="/contact">Talk to Our Team</Link>
                </Button>
              </Magnetic>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              {['No setup fees', 'Results in 90 days', 'Dedicated account manager', 'Cancel anytime'].map((item) => (
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
