import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Target, Globe, ArrowRight, Heart, Compass, Flame,
  TrendingUp, Search, Handshake
} from 'lucide-react';
import { useRevealAll } from '../hooks/useInView';
import { EditorialHero } from '../components/EditorialHero';

const values = [
  { icon: Target, title: 'Results-Driven', desc: 'We measure success by your growth. Every action is focused on bookings and revenue.' },
  { icon: Heart, title: 'Partnership First', desc: "We're not vendors — we're an extension of your sales team. Long-term over transactional." },
  { icon: Compass, title: 'Global Perspective', desc: 'International hospitality expertise combined with deep, multi-market source intelligence.' },
  { icon: Flame, title: 'Excellence Always', desc: 'We represent only quality properties and work with reputable, vetted operators.' },
];

const approach = [
  { icon: Search, step: '01', title: 'Understand', desc: 'We learn your property inside out — positioning, capacity, ideal guest, and the markets where you can win.' },
  { icon: Handshake, step: '02', title: 'Introduce', desc: 'We open the right doors: pre-vetted tour operators and DMCs across high-growth source markets, with offerings built around you.' },
  { icon: TrendingUp, step: '03', title: 'Grow', desc: 'Bookings convert into a predictable revenue stream. We optimise rates, allotments, and renewals so it compounds, season after season.' },
];

export const About = () => {
  useRevealAll();

  return (
    <div className="overflow-hidden">

      {/* HERO */}
      <EditorialHero
        chapter="Chapter 02 — About"
        eyebrow="— Our Story"
        headlineTop="We bridge worlds,"
        headlineMid="not just bookings."
        subtitle="A specialist sales partner connecting exceptional hotels with the world's fastest-growing group travel markets."
        image="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=2000&q=90"
      />

      {/* MISSION */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="reveal-left">
              <div className="section-divider" style={{ margin: '0 0 1.5rem' }} />
              <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Our Mission</span>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 leading-tight">
                To make international group business<br />
                <span className="text-shimmer">your most predictable revenue stream.</span>
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Hundreds of millions of group travelers move across borders every year, generating trillions in global travel spend. But for most hotels, accessing the high-growth source markets — India, China, the Middle East, Southeast Asia — is a black box: fragmented, relationship-driven, culturally distinct.
                </p>
                <p>
                  HotelBridge exists to close that gap. We bring dual-side expertise — global operator networks and international hospitality fluency — under one roof, so our partners stop guessing and start growing.
                </p>
              </div>
            </div>
            <div className="reveal-right relative">
              <div className="img-reveal relative z-10 rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85"
                  alt="Luxury hotel"
                  className="w-full h-[480px] object-cover"
                />
                <div className="img-overlay" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="font-serif text-2xl font-bold leading-tight">Where hospitality meets opportunity</div>
                  <div className="text-xs text-gray-300 mt-1 uppercase tracking-widest">Representing properties worldwide</div>
                </div>
              </div>
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-24 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Our Values</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              What we live by
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="reveal group bg-white rounded-3xl p-7 border border-gray-100 hover:border-secondary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center mb-5 group-hover:from-secondary/25 transition-all">
                  <Icon className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-16 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">How We Work</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              A simple, <span className="text-shimmer">proven approach</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              No noise, no jargon — just a clear path from first conversation to consistent bookings.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger">
            {approach.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="reveal group relative bg-gradient-to-b from-white to-gray-50/40 rounded-3xl p-8 border border-gray-100 hover:border-secondary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-8 right-8 font-serif text-5xl font-bold text-secondary/10 group-hover:text-secondary/20 transition-colors">{step}</div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center mb-6 group-hover:from-secondary/25 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-primary mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKET OPPORTUNITY */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="reveal relative overflow-hidden rounded-3xl p-10 lg:p-14 cta-gradient text-white">
            <div className="orb w-96 h-96 bg-secondary/20 -top-20 -right-20" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-yellow-300 mb-5">
                <Globe className="w-3 h-3" /> Why global group travel matters
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6 max-w-2xl leading-tight">
                The world's fastest-growing<br />outbound travel markets
              </h2>
              <p className="text-gray-300 leading-relaxed max-w-2xl">
                Emerging source markets — India, China, the Middle East and Southeast Asia — are reshaping global tourism, with group and leisure travel growing at double digits year over year. Hotels positioned early capture longer stays, higher occupancy, and more predictable demand. That's exactly where HotelBridge helps you win.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center reveal">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">
            Let's grow together
          </h2>
          <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
            Partner with HotelBridge and unlock global group travel markets.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="btn-gold border-0 text-white rounded-full px-8">
              <Link to="/contact">Get in Touch <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-2 border-primary text-primary hover:bg-primary hover:text-white">
              <Link to="/contact">Talk to Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
