import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Building2, TrendingUp, Users, Handshake, Lightbulb,
  CheckCircle2, ArrowRight, Sparkles, Globe, BarChart3,
  FileText, Headphones, Zap, Award
} from 'lucide-react';
import { services } from '../data/mockData';
import { useRevealAll } from '../hooks/useInView';
import { useTilt } from '../hooks/useTilt';

const iconMap = { Building2, TrendingUp, Users, Handshake, Lightbulb };

/* Bento grid features */
const bentoFeatures = [
  {
    title: 'Direct Operator Access',
    description: '200+ pre-vetted international tour operators and DMCs — exclusive introductions, not cold outreach.',
    icon: Globe,
    span: 'lg:col-span-2', accent: 'from-blue-500/10 to-indigo-500/5',
    visual: (
      <div className="absolute right-0 bottom-0 w-64 h-64 opacity-50">
        <div className="orb w-full h-full bg-blue-500/15" />
      </div>
    )
  },
  {
    title: 'Group Contracting',
    description: 'High-volume rate negotiation, allotment planning, optimal payment terms.',
    icon: FileText,
    accent: 'from-secondary/10 to-yellow-500/5'
  },
  {
    title: 'Performance Analytics',
    description: 'Real-time CRM dashboard with revenue, commission, and forecast insights.',
    icon: BarChart3,
    accent: 'from-purple-500/10 to-pink-500/5'
  },
  {
    title: 'Dedicated Account Manager',
    description: 'A single point of contact who knows your property inside-out.',
    icon: Headphones,
    span: 'lg:col-span-2', accent: 'from-green-500/10 to-emerald-500/5'
  },
];

function TiltCard({ children, className = '' }) {
  const ref = useTilt(5);
  return <div ref={ref} className={className}>{children}</div>;
}

export const Services = () => {
  useRevealAll();

  return (
    <div className="overflow-hidden">

      {/* HERO */}
      <section className="relative pt-24 pb-20 cta-gradient text-white overflow-hidden">
        <div className="orb w-[500px] h-[500px] bg-secondary/15 -top-40 -right-20 animate-float-slow" />
        <div className="orb w-72 h-72 bg-white/5 -bottom-20 left-10 animate-float" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium text-yellow-300">
            <Sparkles className="w-4 h-4" /> Comprehensive Hotel Services
          </div>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05]">
            Everything you need<br />
            to <span className="text-shimmer">win the world.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
            From first introduction to long-term partnership — a complete service stack designed for hotels serious about group business.
          </p>
        </div>
      </section>

      {/* CORE SERVICES — 3-col bento */}
      <section className="py-24 bg-gradient-to-b from-white via-gray-50/30 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              Core Services
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Five services. One mission.
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Increase your bookings, occupancy, and revenue from the world's fastest-growing outbound market.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12 stagger">
            {services.map((service, i) => {
              const Icon = iconMap[service.icon] || Building2;
              return (
                <div key={service.id} className="reveal">
                  <TiltCard className="tilt-card group relative h-full bg-white rounded-3xl p-7 border border-gray-100 hover:border-secondary/30 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                    {/* Decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-secondary/15 to-secondary/0 blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center group-hover:from-secondary/25 transition-all">
                          <Icon className="w-7 h-7 text-secondary" />
                        </div>
                        <span className="font-serif text-3xl font-bold text-secondary/15">0{i + 1}</span>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-primary mb-3 leading-tight">{service.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-5">{service.description}</p>
                      <ul className="space-y-2 mb-5">
                        {service.features?.slice(0, 4).map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENTO ADVANTAGES */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              What Makes Us Different
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Built for <span className="text-shimmer">scale & precision</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 stagger">
            {bentoFeatures.map(({ title, description, icon: Icon, span, accent, visual }, i) => (
              <div key={i} className={`reveal ${span || ''} relative overflow-hidden rounded-3xl bg-gradient-to-br ${accent} border border-gray-100 hover:border-secondary/30 hover:shadow-xl transition-all duration-300 p-7 group`}>
                {visual}
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/80 backdrop-blur flex items-center justify-center mb-5 shadow-sm">
                    <Icon className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-primary mb-2 leading-tight">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}

            {/* Big feature card */}
            <div className="reveal lg:col-span-3 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-blue-900 text-white p-10 lg:p-12">
              <div className="orb w-96 h-96 bg-secondary/15 -top-20 -right-20" />
              <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-secondary/20 backdrop-blur border border-white/10 flex items-center justify-center mb-5">
                    <Zap className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-3 leading-tight">
                    AI-Powered Revenue Insights
                  </h3>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    Our proprietary AI analyzes booking patterns, seasonality, and market trends to recommend optimal rates, allotments, and promotional campaigns. Real-time. Right inside your CRM.
                  </p>
                  <ul className="space-y-2">
                    {['Forecast demand 90 days out', 'Smart rate recommendations', 'Automated booking suggestions'].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-200">
                        <CheckCircle2 className="w-4 h-4 text-secondary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                    <div className="text-xs text-gray-400 mb-3 uppercase tracking-widest">Next 90 days forecast</div>
                    <div className="space-y-3">
                      {[
                        { month: 'Jun', val: 78, growth: '+24%' },
                        { month: 'Jul', val: 92, growth: '+38%' },
                        { month: 'Aug', val: 85, growth: '+31%' },
                      ].map((d) => (
                        <div key={d.month}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-300">{d.month}</span>
                            <span className="text-secondary font-semibold">{d.growth}</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-secondary to-yellow-400 rounded-full transition-all duration-1000"
                              style={{ width: `${d.val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="reveal bg-gradient-to-br from-white to-secondary/5 rounded-3xl p-10 lg:p-14 border-2 border-secondary/20 text-center">
            <Award className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">
              Ready to start growing?
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
              Apply for partnership — we will review your property and respond within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="btn-gold border-0 text-white rounded-full px-8">
                <Link to="/contact">Get in Touch <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-2 border-primary text-primary hover:bg-primary hover:text-white">
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
