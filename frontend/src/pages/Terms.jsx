import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export const Terms = () => (
  <div className="bg-gradient-to-b from-gray-50 to-white">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 max-w-3xl">

      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-secondary transition-colors mb-8" data-cursor="link">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center">
          <FileText className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest">Legal</div>
          <h1 className="font-serif text-4xl font-bold text-primary">Terms of Service</h1>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-12">Last updated: January 2026</p>

      <div className="prose prose-gray max-w-none text-gray-600 space-y-8">

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">1. Acceptance of terms</h2>
          <p>By accessing or using hotelbridge.co and any related services ("Services"), you agree to be bound by these Terms of Service. If you do not agree, please discontinue use.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">2. Services</h2>
          <p>HotelBridge connects hotels with international tour operators and DMCs across multiple source markets. Specific deliverables, pricing, and timelines are set out in individual partnership agreements with each hotel.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">3. Fees & payment</h2>
          <p>Standard engagements are performance-based, with commission applied to confirmed and materialised bookings only. No setup fees or monthly retainers unless agreed in writing. Detailed fee structures are confirmed in your partnership agreement.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">4. Confidentiality</h2>
          <p>Both parties agree to keep confidential information shared during the engagement private and to use it only for the purpose of the partnership.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">5. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, HotelBridge's liability is limited to fees received in the twelve months preceding the claim. We do not guarantee specific booking volumes, revenue, or outcomes.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">6. Intellectual property</h2>
          <p>All content on hotelbridge.co — including logos, copy, and design — is the property of HotelBridge. Hotel partner property names and logos are the property of their respective owners and used with permission.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">7. Changes to these terms</h2>
          <p>We may update these terms from time to time. Material changes will be communicated via the website or email to active partners.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-primary mb-3">8. Contact</h2>
          <p>Questions? Email <a href="mailto:legal@hotelbridge.co" className="text-secondary font-semibold hover:underline" data-cursor="link">legal@hotelbridge.co</a> or use our <Link to="/contact" className="text-secondary font-semibold hover:underline" data-cursor="link">contact page</Link>.</p>
        </section>

      </div>
    </div>
  </div>
);

export default Terms;
