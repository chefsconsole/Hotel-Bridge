import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Target, Users, Globe, Award, ArrowRight, Sparkles,
  Heart, Compass, Flame, TrendingUp
} from 'lucide-react';
import { useRevealAll } from '../hooks/useInView';
import { EditorialHero } from '../components/EditorialHero';

const values = [
  { icon: Target, title: 'Results-Driven', desc: 'We measure success by your growth. Every action is focused on bookings and revenue.' },
  { icon: Heart, title: 'Partnership First', desc: "We're not vendors — we're an extension of your sales team. Long-term over transactional." },
  { icon: Compass, title: 'Global Perspective', desc: 'International hospitality expertise combined with deep, multi-market source intelligence.' },
  { icon: Flame, title: 'Excellence Always', desc: 'We represent only quality properties and work with reputable, vetted operators.' },
];

const milestones = [
  { year: '2020', title: 'Founded with a Vision', desc: 'Three hospitality veterans launch HotelBridge to connect hotels worldwide with high-growth source markets.' },
  { year: '2021', title: 'First 50 partners', desc: 'Onboarded 50 European hotels across France, Italy, and Switzerland in our first 12 months.' },
  { year: '2022', title: 'CRM platform launched', desc: 'Built proprietary CRM giving partners real-time visibility into bookings, revenue, and analytics.' },
  { year: '2023', title: '€20M+ in bookings', desc: 'Crossed €20M in confirmed group bookings, expanded to Greece, Spain, Austria, and Switzerland.' },
  { year: '2024', title: 'AI assistant goes live', desc: 'GPT-4o-powered assistant enabled instant booking creation, smart insights, and revenue forecasting.' },
  { year: 'Today', title: '200+ hotels, 15+ markets', desc: '500K+ room nights annually. Recognised as a leading global hotel-to-operator partnership platform.' },
];

const team = [
  {
    name: 'Priya Sharma',
    role: 'Founder & CEO',
    bio: '15+ years in international travel. Former Director of Sales at a leading global tour operator.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80'
  },
  {
    name: 'Marco Bianchi',
    role: 'Co-Founder & COO',
    bio: 'Former GM of Luxury Hotels Group, Rome. Deep European hospitality network.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'
  },
  {
    name: 'Raj Patel',
    role: 'Co-Founder & CTO',
    bio: 'Ex-Booking.com engineering. Built the AI and CRM stack from scratch.',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'
  },
  {
    name: 'Sophie Laurent',
    role: 'Head of Partner Success',
    bio: 'Ensures every hotel partner gets measurable results within 90 days.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80'
  },
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
        subtitle="Built by hospitality veterans who saw a gap — exceptional hotels missing out on the world's fastest-growing travel markets."
        image="https://images.unsplash.com/photo-1573164574572-cb89e39749b4?w=2000&q=90"
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
                  Over <strong className="text-primary">300 million</strong> group travelers move across borders every year, generating <strong className="text-primary">$1.7T+</strong> in global travel spend. But for most hotels, accessing the high-growth source markets — India, China, the Middle East, Southeast Asia — is a black box: fragmented, relationship-driven, culturally distinct.
                </p>
                <p>
                  HotelBridge exists to close that gap. We bring deep dual-side expertise — global operator networks and international hospitality fluency — under one roof. Our partners stop guessing and start growing.
                </p>
              </div>
            </div>
            <div className="reveal-right relative">
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1573164574572-cb89e39749b4?w=800&q=80"
                  alt="Team"
                  className="w-full h-[480px] object-cover"
                />
                <div className="absolute bottom-6 left-6 right-6 glass-dark rounded-2xl p-5 text-white">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { v: '€100M+', l: 'Booked through us' },
                      { v: '200+', l: 'Hotel partners' },
                      { v: '95%', l: 'Renewal rate' },
                    ].map((s) => (
                      <div key={s.l}>
                        <div className="font-serif text-xl font-bold text-shimmer">{s.v}</div>
                        <div className="text-[10px] text-gray-300 uppercase tracking-wider mt-1">{s.l}</div>
                      </div>
                    ))}
                  </div>
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

      {/* TIMELINE */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Our Journey</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              From idea to <span className="text-shimmer">industry standard</span>
            </h2>
          </div>

          <div className="relative">
            {/* Center line */}
            <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-secondary via-secondary/30 to-transparent" />

            <div className="space-y-12">
              {milestones.map((m, i) => (
                <div key={m.year} className={`reveal relative flex flex-col lg:flex-row gap-4 lg:gap-8 ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                  <div className="lg:w-1/2" />
                  <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 w-3 h-3 rounded-full bg-secondary ring-4 ring-white shadow-lg" />
                  <div className={`pl-12 lg:pl-0 lg:w-1/2 ${i % 2 === 0 ? 'lg:pr-12 lg:text-right' : 'lg:pl-12'}`}>
                    <div className="inline-block font-serif text-3xl font-bold text-shimmer mb-2">{m.year}</div>
                    <h3 className="font-serif text-xl font-bold text-primary mb-2">{m.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">The Team</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Built by hospitality insiders
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Decades of combined experience — running hotels, building DMC networks, and shipping software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger max-w-6xl mx-auto">
            {team.map((m) => (
              <div key={m.name} className="reveal group">
                <div className="relative rounded-3xl overflow-hidden mb-4 aspect-[3/4]">
                  <img
                    src={m.image}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="font-serif font-bold text-lg leading-tight">{m.name}</div>
                    <div className="text-xs text-secondary font-semibold">{m.role}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKET OPPORTUNITY */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="reveal relative overflow-hidden rounded-3xl p-10 lg:p-14 cta-gradient text-white">
            <div className="orb w-96 h-96 bg-secondary/20 -top-20 -right-20" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-yellow-300 mb-5">
                <TrendingUp className="w-3 h-3" /> Why global group travel matters
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-8 max-w-2xl leading-tight">
                The world's fastest-growing<br />outbound travel markets
              </h2>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { v: '300M+', l: 'International group travelers' },
                  { v: '15+', l: 'Source markets covered' },
                  { v: '$1.7T+', l: 'Global travel spend annually' },
                ].map((s) => (
                  <div key={s.l} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
                    <div className="font-serif text-3xl lg:text-4xl font-bold text-shimmer mb-2">{s.v}</div>
                    <div className="text-xs text-gray-300">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
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
