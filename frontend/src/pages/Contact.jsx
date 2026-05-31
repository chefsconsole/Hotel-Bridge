import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  Mail, MessageCircle, MapPin, Send, Sparkles, Clock,
  Calendar, Globe, CheckCircle2
} from 'lucide-react';
import { contactReasons } from '../data/mockData';
import { useRevealAll } from '../hooks/useInView';
import { saveLead } from '../lib/leadsStore';

const contactMethods = [
  {
    icon: Mail, title: 'Email Us',
    text: 'info@hotelbridge.co',
    href: 'mailto:info@hotelbridge.co',
    desc: 'We respond within 4 business hours'
  },
  {
    icon: MessageCircle, title: 'WhatsApp',
    text: 'Chat with us',
    href: 'https://wa.me/911234567890',
    desc: 'Fastest replies — typically within 1 hour'
  },
  {
    icon: Calendar, title: 'Book a Demo',
    text: 'Schedule a call',
    href: 'mailto:info@hotelbridge.co?subject=Demo%20Request',
    desc: 'See the platform in action'
  },
];

export const Contact = () => {
  useRevealAll();
  const [form, setForm] = useState({
    name: '', email: '', company: '', phone: '', reason: '', message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      saveLead({ ...form, source: 'contact-form' });
      toast.success('Message sent!', {
        description: "We'll get back to you within 4 business hours."
      });
      setForm({ name: '', email: '', company: '', phone: '', reason: '', message: '' });
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
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium text-yellow-300">
            <Sparkles className="w-4 h-4" /> Let's Talk
          </div>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05]">
            We'd love to<br /><span className="text-shimmer">hear from you.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
            Hotel partner, tour operator, or just curious — choose your channel below.
          </p>
        </div>
      </section>

      {/* CONTACT METHODS */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50 -mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
            {contactMethods.map(({ icon: Icon, title, text, href, desc }) => (
              <a
                key={title}
                href={href}
                className="reveal group bg-white rounded-3xl p-7 border border-gray-100 hover:border-secondary/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 flex items-center justify-center mb-5 group-hover:from-secondary/25 transition-all">
                  <Icon className="w-6 h-6 text-secondary" />
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{title}</div>
                <div className="font-serif text-lg font-bold text-primary mb-2 group-hover:text-secondary transition-colors">{text}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FORM + INFO */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-10 max-w-6xl mx-auto">

            {/* Form */}
            <div className="lg:col-span-3 reveal-left">
              <div className="section-divider" style={{ margin: '0 0 1rem' }} />
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-3 leading-tight">
                Send us a message
              </h2>
              <p className="text-gray-500 mb-8">We typically respond within 4 business hours.</p>

              <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 lg:p-8 border border-gray-100 space-y-5">

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Full Name *"
                    value={form.name}
                    onChange={update('name')}
                    required
                    className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                  />
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={form.email}
                    onChange={update('email')}
                    required
                    className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Company / Hotel Name"
                    value={form.company}
                    onChange={update('company')}
                    className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                  />
                  <Input
                    placeholder="Phone"
                    value={form.phone}
                    onChange={update('phone')}
                    className="h-12 rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20"
                  />
                </div>

                <select
                  value={form.reason}
                  onChange={update('reason')}
                  required
                  className="w-full h-12 rounded-xl border border-gray-200 focus:border-secondary focus-visible:ring-1 focus-visible:ring-secondary/20 bg-white text-sm px-3 outline-none"
                >
                  <option value="">Reason for contacting *</option>
                  {contactReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>

                <Textarea
                  placeholder="Tell us more *"
                  value={form.message}
                  onChange={update('message')}
                  rows={5}
                  required
                  className="rounded-xl border-gray-200 focus:border-secondary focus-visible:ring-secondary/20 resize-none"
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-gold border-0 text-white rounded-xl h-12 font-semibold text-sm"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>Send Message <Send className="ml-2 w-4 h-4" /></>
                  )}
                </Button>
              </form>
            </div>

            {/* Side panel */}
            <div className="lg:col-span-2 reveal-right space-y-4">
              {/* Office */}
              <div className="bg-gradient-to-br from-primary to-blue-900 rounded-3xl p-7 text-white relative overflow-hidden">
                <div className="orb w-40 h-40 bg-secondary/20 -top-10 -right-10" />
                <div className="relative z-10">
                  <MapPin className="w-8 h-8 text-secondary mb-3" />
                  <div className="font-serif text-xl font-bold mb-1">Global Headquarters</div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-5">
                    Bandra Kurla Complex<br />
                    Mumbai 400051<br />
                    Serving hotels worldwide
                  </p>
                  <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-secondary" /> Mon–Fri · 9am–6pm (multiple time zones)
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-secondary" /> 15+ source markets · 6 continents
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100">
                <h3 className="font-serif text-base font-bold text-primary mb-4">By the numbers</h3>
                <div className="space-y-3">
                  {[
                    { v: '< 4h', l: 'Avg. response time' },
                    { v: '200+', l: 'Hotel partners' },
                    { v: '95%', l: 'Partner satisfaction' },
                  ].map((s) => (
                    <div key={s.l} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{s.l}</span>
                      <span className="font-serif font-bold text-secondary">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick info card */}
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-3xl p-6">
                <CheckCircle2 className="w-7 h-7 text-secondary mb-3" />
                <div className="font-serif font-bold text-primary text-base mb-1">We typically respond fast</div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Most enquiries get a personal reply within 4 business hours, Monday to Friday.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
