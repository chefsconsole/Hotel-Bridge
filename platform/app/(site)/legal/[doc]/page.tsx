import { notFound } from 'next/navigation';
import { Notice } from '@/components/ui';
import { SUPPORT_EMAIL } from '@/lib/config';

const DOCS: Record<string, { title: string; sections: [string, string][] }> = {
  privacy: {
    title: 'Privacy notice',
    sections: [
      ['What we collect', 'Agency details you give us when registering; the names and emails of your users; guest names and the stay details needed to make a reservation; and records of searches, bookings, payments and support requests.'],
      ['Why', 'To verify that you are a travel business, to make and manage reservations with hotels and suppliers, to invoice and reconcile payments, and to keep the service secure.'],
      ['Who we share it with', 'Guest and stay details are shared with the hotel or supplier fulfilling the reservation. We do not sell personal data. Payment card details are never stored by HotelBridge.'],
      ['How long we keep it', 'Booking and financial records are kept for as long as accounting and tax law requires. Other personal data is deleted or anonymised when it is no longer needed.'],
      ['Your rights', `Ask us for a copy of your data, a correction, or deletion where the law allows: ${SUPPORT_EMAIL}.`],
    ],
  },
  terms: {
    title: 'Terms of business',
    sections: [
      ['Who may use HotelBridge', 'Verified travel businesses acting for their clients. Each agency is responsible for its users and for the accuracy of guest details.'],
      ['Prices and availability', 'Prices are for the whole stay and are revalidated before booking. A request is not a reservation until the hotel confirms it. Vouchers are issued only for confirmed bookings.'],
      ['Payment', 'Unless credit terms have been agreed in writing, bookings must be paid by the deadline shown, or the hold is released without charge.'],
      ['Cancellations and amendments', 'The cancellation conditions shown at the time of booking apply. Charges are calculated from the time HotelBridge receives the request.'],
      ['Local taxes', 'City or tourist taxes shown as “payable at the hotel” are settled by the guest directly with the hotel.'],
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return { title: DOCS[doc]?.title ?? 'Legal' };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 text-[2.2rem] font-semibold">{d.title}</h1>
      <div className="mt-6">
        <Notice tone="warning" title="Draft — pending legal review">
          This is a plain-language working draft. The contracting entity, registered address and governing law will be added once confirmed by counsel.
        </Notice>
      </div>
      <div className="mt-10 space-y-8">
        {d.sections.map(([h, p]) => (
          <section key={h}>
            <h2 className="text-[1.1rem] font-semibold">{h}</h2>
            <p className="mt-2 leading-relaxed text-muted">{p}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
