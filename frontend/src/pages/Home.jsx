import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  ArrowRight, Building2, TrendingUp, Users, Globe,
  Star, CheckCircle2, ChevronRight, Zap, Shield, Award
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

      {/* ── STATS ─────────────────────────────────────── */}
      <section className="py-14 bg-white border-y border-gray-100">
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
