import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Globe, Network, BarChart3, TrendingUp, Clock, Shield, HeadphonesIcon, Target,
  ArrowRight, Sparkles, Check, X, Star, Zap, Award, Users
} from 'lucide-react';
import { benefits } from '../data/mockData';
import { useRevealAll } from '../hooks/useInView';

const iconMap = { Globe, Network, BarChart3, TrendingUp };

const compareRows = [
  { feature: 'Pre-vetted operator network', us: '200+', diy: 'Build from zero', generic: 'Generic lists' },
  { feature: 'Cultural & market expertise', us: 'Native team', diy: 'Hire & train (~6 mo)', generic: 'Surface-level' },
  { feature: 'Dedicated account manager', us: true, diy: 'Hire FTE', generic: false },
  { feature: 'Real-time CRM portal', us: true, diy: 'Build / buy separately', generic: false },
  { feature: 'AI revenue insights', us: true, diy: false, generic: false },
  { feature: 'Contract negotiation handled', us: true, diy: 'Your team', generic: 'Templates only' },
  { feature: 'Payment risk management', us: true, diy: false, generic: false },
  { feature: 'Performance guarantees', us: '90-day results', diy: 'None', generic: 'None' },
  { feature: 'Setup cost', us: '€0', diy: '€50K+ (Year 1)', generic: '€5K–15K' },
  { feature: 'Time to first booking', us: '60–90 days', diy: '6–12 months', generic: '4–6 months' },
];

const additionalBenefits = [
  { icon: Clock, title: 'Time-Tested Expertise', description: 'Years of experience across hospitality and multiple international source-market dynamics.' },
  { icon: Shield, title: 'Risk-Free Partnership', description: 'Performance-based fees mean we only succeed when you do. No upfront costs.' },
  { icon: HeadphonesIcon, title: 'Dedicated Support', description: 'A dedicated account manager focused on driving your hotel\'s success.' },
  { icon: Target, title: 'Targeted Approach', description: 'Customized strategy aligned with your hotel\'s unique positioning.' },
];

export const WhyUs = () => {
  useRevealAll();

  return (
    <div className="overflow-hidden">

      {/* HERO */}
      <section className="relative pt-24 pb-20 cta-gradient text-white overflow-hidden">
        <div className="orb w-[500px] h-[500px] bg-secondary/15 -top-40 -right-20 animate-float-slow" />
        <div className="orb w-72 h-72 bg-white/5 -bottom-20 left-10 animate-float" />
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium text-yellow-300">
            <Sparkles className="w-4 h-4" /> Why Hotels Choose Us
          </div>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05]">
            The unfair advantage<br />
            in <span className="text-shimmer">global group travel.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
            We've spent five years building what you'd otherwise need three full-time hires to replicate.
          </p>
        </div>
      </section>

      {/* BIG BENEFITS WITH STATS */}
      <section className="py-24 bg-gradient-to-b from-white via-gray-50/30 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Key Benefits</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Numbers that <span className="text-shimmer">speak for themselves</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {benefits.map((b) => {
              const Icon = iconMap[b.icon] || Globe;
              return (
                <div key={b.id} className="reveal group bg-white rounded-3xl p-7 border border-gray-100 hover:border-secondary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center mb-5 group-hover:from-secondary/25 transition-all">
                    <Icon className="w-7 h-7 text-secondary" />
                  </div>
                  <div className="font-serif text-4xl font-bold text-shimmer mb-1">{b.stat}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">{b.statLabel}</div>
                  <h3 className="font-serif text-lg font-bold text-primary mb-2 leading-tight">{b.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">The Comparison</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              HotelBridge vs. The Alternatives
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              We're not the only option. We just want you to make an informed choice.
            </p>
          </div>

          <div className="reveal bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-br from-gray-50 to-gray-100/50">
                    <th className="text-left py-6 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Feature</th>
                    <th className="text-center py-6 px-6">
                      <div className="inline-flex flex-col items-center gap-1">
                        <div className="font-serif text-lg font-bold text-secondary flex items-center gap-1">
                          HotelBridge <Star className="w-4 h-4 fill-secondary text-secondary" />
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">Recommended</div>
                      </div>
                    </th>
                    <th className="text-center py-6 px-6">
                      <div className="font-serif text-lg font-semibold text-gray-500">Build In-House</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest">DIY</div>
                    </th>
                    <th className="text-center py-6 px-6">
                      <div className="font-serif text-lg font-semibold text-gray-500">Generic Agency</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest">Others</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {compareRows.map((row, i) => (
                    <tr key={i} className="hover:bg-secondary/5 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-700">{row.feature}</td>
                      {['us', 'diy', 'generic'].map((key, idx) => {
                        const v = row[key];
                        return (
                          <td key={key} className={`py-4 px-6 text-center text-sm ${key === 'us' ? 'bg-secondary/5' : ''}`}>
                            {typeof v === 'boolean' ? (
                              v ? (
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50">
                                  <Check className="w-4 h-4 text-green-600" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-50">
                                  <X className="w-4 h-4 text-gray-300" />
                                </div>
                              )
                            ) : (
                              <span className={`font-semibold ${key === 'us' ? 'text-secondary' : 'text-gray-600'}`}>{v}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ADDITIONAL BENEFITS */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Beyond The Numbers</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              What you actually get every day
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {additionalBenefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="reveal group bg-white rounded-3xl p-7 border border-gray-100 hover:border-secondary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-serif text-lg font-bold text-primary mb-2 leading-tight">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST METRICS */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="reveal relative overflow-hidden rounded-3xl p-10 lg:p-14 cta-gradient text-white">
            <div className="orb w-96 h-96 bg-secondary/20 -top-20 -right-20" />
            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <Award className="w-12 h-12 text-secondary mx-auto mb-5" />
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-8 leading-tight">
                "Working with HotelBridge has been the most consequential business decision of our last decade. Our group bookings tripled in 18 months."
              </h2>
              <div className="flex items-center justify-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80"
                  alt="Quote"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-secondary/30"
                />
                <div className="text-left">
                  <div className="font-semibold text-sm">Marco Rossi</div>
                  <div className="text-xs text-secondary">General Manager, Grand Hotel Europa, Rome</div>
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
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">
              Ready to choose the smart path?
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
              Apply for partnership. We'll review your property and respond within 48 hours.
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

export default WhyUs;
