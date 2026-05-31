import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export const Privacy = () => (
  <div className="bg-gradient-to-b from-gray-50 to-white">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 max-w-3xl">

      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-secondary transition-colors mb-8" data-cursor="link">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center">
          <Shield className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest">Legal</div>
          <h1 className="font-serif text-4xl font-bold text-primary">Privacy Policy</h1>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-12">Last updated: January 2026</p>

      <div className="prose prose-gray max-w-none text-gray-600 space-y-8">

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">Overview</h2>
          <p>HotelBridge ("we", "us") respects your privacy. This policy explains what information we collect when you visit hotelbridge.co or use our services, how we use it, and your choices.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">Information we collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Contact information</strong> — name, email, phone, hotel/company name when you submit our contact or partnership forms.</li>
            <li><strong>Usage data</strong> — pages visited, links clicked, device type (collected via essential cookies only by default).</li>
            <li><strong>Communications</strong> — emails and messages you send us.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">How we use your information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To respond to your enquiry and assess partnership fit.</li>
            <li>To send service-related communications and, with consent, marketing updates.</li>
            <li>To improve our website and services.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">Sharing your information</h2>
          <p>We do not sell your data. We share information only with: trusted service providers helping us operate (hosting, analytics, email); tour operators and DMCs when you explicitly request introductions; legal authorities when required.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">Your rights</h2>
          <p>You can request access, correction, or deletion of your personal data at any time by emailing <a href="mailto:privacy@hotelbridge.co" className="text-secondary font-semibold hover:underline" data-cursor="link">privacy@hotelbridge.co</a>.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">Cookies</h2>
          <p>We use essential cookies for site functionality and (with consent) analytics cookies to improve our service. You can adjust your preferences from the banner shown on your first visit.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">Contact</h2>
          <p>Questions about this policy? Email <a href="mailto:privacy@hotelbridge.co" className="text-secondary font-semibold hover:underline" data-cursor="link">privacy@hotelbridge.co</a> or write to us via our <Link to="/contact" className="text-secondary font-semibold hover:underline" data-cursor="link">contact page</Link>.</p>
        </section>

      </div>
    </div>
  </div>
);

export default Privacy;
