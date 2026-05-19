import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowRight, Sparkles, CheckCircle2, MapPin, TrendingUp,
  Building2, Star, Globe, Award, Zap
} from 'lucide-react';
import { caseStudies } from '../data/mockData';
import { useRevealAll } from '../hooks/useInView';

const steps = [
  { num: '01', title: 'Apply', desc: 'Fill out a quick form below. Takes 2 minutes.' },
  { num: '02', title: 'Quick Call', desc: 'We schedule a 30-min discovery call within 48 hours.' },
  { num: '03', title: 'Activate', desc: 'Sign agreement, get CRM access, start receiving bookings.' },
];

const benefits = [
  { icon: Globe, title: 'Network Access', desc: '200+ pre-vetted Indian tour operators on day one.' },
  { icon: TrendingUp, title: '40% Revenue Uplift', desc: 'Our partners see 40% revenue growth on average within year one.' },
  { icon: Award, title: '95% Renewal Rate', desc: '95% of partners renew after year one. We deliver on our promise.' },
  { icon: Zap, title: 'Fast Activation', desc: 'CRM access and first introductions within 7 days of signing.' },
];

export const Partnerships = () => {
  useRevealAll();
  const [form, setForm] = useState({
    hotelName: '', country: '', rooms: '', stars: '',
    contactName: '', email: '', phone: '', message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success('Application received!', {
        description: 'We\'ll review your property and respond within 48 hours.'
      });
      setForm({
        hotelName: '', country: '', rooms: '', stars: '',
        contactName: '', email: '', phone: '', message: ''
      });
      setSubmitting(false);
    }, 1100);
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
            <Sparkles className="w-4 h-4" /> Hotel Partnership Application
          </div>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05]">
            Apply in 2 minutes.<br />
            <span className="text-shimmer">Decision in 48 hours.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
            Join 200+ hotels growing through India. No upfront fees, no risk.
          </p>
        </div>
      </section>

      {/* 3-STEP PROCESS */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className="reveal relative bg-white rounded-3xl p-7 border border-gray-100 hover:border-secondary/30 hover:shadow-xl transition-all duration-300">
                <div className="absolute top-7 right-7 font-serif text-5xl font-bold text-secondary/10">{num}</div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 text-white font-bold text-sm flex items-center justify-center mb-5">
                    {i + 1}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-primary mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPLICATION FORM + BENEFITS */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-10 max-w-6xl mx-auto">

            {/* Form */}
            <div className="lg:col-span-3 reveal-left">
              <div className="section-divider" style={{ margin: '0 0 1rem' }} />
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-3 leading-tight">
                Tell us about your property
              </h2>
              <p className="text-gray-500 mb-8">All fields required. Takes 2 minutes.</p>

              <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 lg:p-8 border border-gray-100 space-y-5">

                {/* Hotel info */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Hotel Information</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Hotel Name *"
                      value={form.hotelName}
                      onChange={update('hotelName')}
                      required
                      className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                    />
                    <Input
                      placeholder="Country *"
                      value={form.country}
                      onChange={update('country')}
                      required
                      className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Number of rooms *"
                    value={form.rooms}
                    onChange={update('rooms')}
                    required
                    className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                  />
                  <select
                    value={form.stars}
                    onChange={update('stars')}
                    required
                    className="h-12 rounded-xl border border-gray-200 focus:border-secondary focus-visible:ring-1 focus-visible:ring-secondary/20 bg-white text-sm px-3 outline-none"
                  >
                    <option value="">Star Category *</option>
                    <option value="3">3-Star</option>
                    <option value="4">4-Star</option>
                    <option value="5">5-Star</option>
                    <option value="boutique">Boutique / Luxury</option>
                  </select>
                </div>

                {/* Contact info */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Your Contact</label>
                  <div className="space-y-3">
                    <Input
                      placeholder="Contact Person Name *"
                      value={form.contactName}
                      onChange={update('contactName')}
                      required
                      className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        type="email"
                        placeholder="Email *"
                        value={form.email}
                        onChange={update('email')}
                        required
                        className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                      />
                      <Input
                        placeholder="Phone *"
                        value={form.phone}
                        onChange={update('phone')}
                        required
                        className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Anything else?</label>
                  <Textarea
                    placeholder="Tell us about your hotel and goals (optional)"
                    value={form.message}
                    onChange={update('message')}
                    rows={4}
                    className="rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-gold border-0 text-white rounded-xl h-12 font-semibold text-sm"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit Application <ArrowRight className="ml-2 w-4 h-4" /></>
                  )}
                </Button>

                <p className="text-[10px] text-gray-400 text-center">
                  By submitting you agree to our terms of service. We respond within 48 hours.
                </p>
              </form>
            </div>

            {/* Benefits sidebar */}
            <div className="lg:col-span-2 reveal-right space-y-4">
              <div className="bg-gradient-to-br from-primary to-blue-900 rounded-3xl p-7 text-white relative overflow-hidden">
                <div className="orb w-40 h-40 bg-secondary/20 -top-10 -right-10" />
                <div className="relative z-10">
                  <h3 className="font-serif text-2xl font-bold mb-2">What you get</h3>
                  <p className="text-sm text-gray-300 mb-6">From day one of partnership</p>

                  <div className="space-y-4">
                    {benefits.map(({ icon: Icon, title, desc }) => (
                      <div key={title} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-secondary/20 border border-white/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white">{title}</div>
                          <div className="text-xs text-gray-300">{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trust badge */}
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-3xl p-6">
                <Award className="w-8 h-8 text-secondary mb-3" />
                <div className="font-serif font-bold text-primary text-base mb-1">Performance-Based</div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  €0 setup. €0 monthly. We only earn when you do — on confirmed, materialised bookings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="py-24 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <div className="section-divider" />
            <span className="text-secondary text-sm font-semibold tracking-widest uppercase mb-3 block">Success Stories</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              Real partners. <span className="text-shimmer">Real results.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger max-w-6xl mx-auto">
            {caseStudies.map((cs) => (
              <div key={cs.id} className="reveal group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-secondary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={cs.image + '?w=600&q=80'}
                    alt={cs.hotelName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary text-white">
                    {cs.year}
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <div className="font-serif font-bold text-lg leading-tight">{cs.hotelName}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-200 mt-1">
                      <MapPin className="w-3 h-3" /> {cs.location}
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-2">{cs.category}</div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{cs.solution}</p>
                  <div className="space-y-1.5 pt-3 border-t border-gray-50">
                    {cs.results.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Partnerships;
