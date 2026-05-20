import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Check, X, ArrowRight, Sparkles, Crown, Rocket, Star
} from 'lucide-react';
import { useRevealAll } from '../hooks/useInView';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Rocket,
    description: 'For boutique hotels testing the Indian market',
    commission: '15%',
    monthly: 0,
    accent: 'from-blue-500 to-indigo-600',
    highlight: false,
    features: [
      'Access to top 50 Indian tour operators',
      'Monthly market insights report',
      'Email & chat support',
      'Standard contract templates',
      'CRM portal access',
      'Up to 3 active campaigns',
    ],
    notIncluded: [
      'Dedicated account manager',
      'AI revenue forecasting',
      'Joint marketing initiatives'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: Sparkles,
    description: 'For hotels ready to scale group business',
    commission: '12%',
    monthly: 0,
    accent: 'from-secondary to-yellow-500',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Full network access — 200+ operators & DMCs',
      'Dedicated account manager',
      'Weekly performance reviews',
      'Custom contract negotiation',
      'Priority support (24h SLA)',
      'Unlimited active campaigns',
      'AI revenue insights & forecasting',
      'Quarterly business review',
    ],
    notIncluded: [
      'Joint marketing initiatives',
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    description: 'For chains & flagship properties',
    commission: 'Custom',
    monthly: 0,
    accent: 'from-purple-600 to-pink-600',
    highlight: false,
    features: [
      'Everything in Growth, plus:',
      'Multi-property portfolio management',
      'Strategic Indian market positioning',
      'Joint marketing initiatives & FAM trips',
      'Custom integrations (PMS, channel manager)',
      'Co-branded campaigns with operators',
      'Dedicated 24/7 support',
      'Custom contracts & SLAs',
      'Quarterly executive business review',
    ],
    notIncluded: []
  },
];

const compareFeatures = [
  { name: 'Operator network access', starter: 'Top 50', growth: '200+', enterprise: 'Full + introductions' },
  { name: 'Commission rate', starter: '15%', growth: '12%', enterprise: 'Custom' },
  { name: 'Active campaigns', starter: '3', growth: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Dedicated account manager', starter: false, growth: true, enterprise: true },
  { name: 'AI revenue insights', starter: false, growth: true, enterprise: true },
  { name: 'Joint marketing initiatives', starter: false, growth: false, enterprise: true },
  { name: 'Custom integrations', starter: false, growth: false, enterprise: true },
  { name: 'Multi-property management', starter: false, growth: false, enterprise: true },
  { name: 'Support SLA', starter: '48h', growth: '24h', enterprise: '24/7' },
  { name: 'Setup fees', starter: 'Zero', growth: 'Zero', enterprise: 'Zero' },
];

export const Pricing = () => {
  const [billingType] = useState('commission');
  useRevealAll();

  return (
    <div className="overflow-hidden">

      {/* HERO */}
      <section className="relative pt-24 pb-12 cta-gradient text-white overflow-hidden">
        <div className="orb w-96 h-96 bg-secondary/15 -top-20 -right-20" />
        <div className="orb w-64 h-64 bg-white/5 -bottom-10 left-20" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium text-yellow-300">
            <Sparkles className="w-4 h-4" /> Performance-Based Pricing
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6 leading-tight">
            You only pay when<br />
            <span className="text-shimmer">we deliver bookings.</span>
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto">
            Zero setup fees. No monthly retainers. Commission only on confirmed, materialised group bookings. Aligned incentives — your success is our revenue.
          </p>
        </div>
      </section>

      {/* TIERS */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50 -mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {tiers.map((tier, i) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.id}
                  className={`reveal relative rounded-3xl p-7 border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    tier.highlight
                      ? 'bg-gradient-to-br from-white via-secondary/5 to-white border-secondary shadow-2xl shadow-secondary/10 lg:scale-105'
                      : 'bg-white border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-secondary to-yellow-400 text-white shadow-lg">
                        <Star className="w-3 h-3 fill-white" /> {tier.badge}
                      </span>
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tier.accent} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-primary mb-1">{tier.name}</h3>
                  <p className="text-sm text-gray-500 mb-6 min-h-[40px]">{tier.description}</p>

                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="font-serif text-5xl font-bold text-primary">{tier.commission}</span>
                      <span className="text-sm text-gray-500">commission</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">€0 setup · €0 monthly · pay only on materialised bookings</p>
                  </div>

                  <Button
                    asChild
                    className={`w-full mb-6 rounded-xl py-6 font-semibold ${
                      tier.highlight
                        ? 'btn-gold text-white border-0'
                        : 'bg-primary/5 text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    <Link to="/contact">
                      {tier.id === 'enterprise' ? 'Talk to Sales' : 'Get Started'} <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>

                  <ul className="space-y-3">
                    {tier.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-secondary/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-secondary" />
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed">{f}</span>
                      </li>
                    ))}
                    {tier.notIncluded.map((f, idx) => (
                      <li key={`x-${idx}`} className="flex items-start gap-2.5 opacity-50">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-3 h-3 text-gray-400" />
                        </div>
                        <span className="text-sm text-gray-500 leading-relaxed line-through">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-gray-500 mt-10 reveal">
            All plans include CRM access, mobile dashboard, and onboarding. No long-term lock-in.
          </p>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-12 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">
              Detailed Comparison
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Everything, side by side.
            </h2>
          </div>

          <div className="reveal bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-br from-gray-50 to-gray-100/50">
                    <th className="text-left py-5 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Feature</th>
                    {tiers.map((t) => (
                      <th key={t.id} className={`text-center py-5 px-6 text-sm font-serif font-bold ${t.highlight ? 'text-secondary' : 'text-primary'}`}>
                        {t.name}
                        {t.highlight && <Star className="w-3 h-3 inline ml-1 fill-secondary text-secondary" />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {compareFeatures.map((row, i) => (
                    <tr key={i} className="hover:bg-secondary/5 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-700">{row.name}</td>
                      {['starter', 'growth', 'enterprise'].map((key) => {
                        const v = row[key];
                        return (
                          <td key={key} className={`py-4 px-6 text-center text-sm ${key === 'growth' ? 'bg-secondary/5' : ''}`}>
                            {typeof v === 'boolean' ? (
                              v ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50">
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50">
                                  <X className="w-3.5 h-3.5 text-gray-300" />
                                </div>
                              )
                            ) : (
                              <span className={`font-semibold ${key === 'growth' ? 'text-secondary' : 'text-primary'}`}>{v}</span>
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

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="reveal bg-gradient-to-br from-white to-secondary/5 rounded-3xl p-10 lg:p-14 border-2 border-secondary/20 text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">
              Not sure which tier fits?
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
              Talk to our team. We'll review your property and recommend the right path — usually within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="btn-gold border-0 text-white rounded-full px-8">
                <Link to="/contact">
                  Get in Touch <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-2 border-primary text-primary hover:bg-primary hover:text-white">
                <Link to="/contact">Talk to Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
