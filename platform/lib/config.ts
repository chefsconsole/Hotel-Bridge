/* Environment. Safe by default: anything built for production is production
 * unless HB_ENV says otherwise, and production never loads the sandbox
 * supplier or demo data. */
export const HB_ENV: 'production' | 'staging' | 'development' | 'test' =
  (process.env.HB_ENV as never) ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');

export const isProduction = HB_ENV === 'production';

/** Sample data is visible and labelled. Never in production. */
export const demoMode = !isProduction && process.env.HB_DEMO === '1';

export const SESSION_DAYS = 7;
export const QUOTE_TTL_MINUTES = 20;
/** How long the agent has to pay once the hotel has confirmed (or rooms are held). */
export const PAYMENT_HOLD_HOURS = 24;
/** How long we give ourselves to acknowledge a group enquiry. */
export const GROUP_FIRST_RESPONSE_HOURS = 24;
/** Default time a hotel has to accept or decline an on-request booking (per-contract override). */
export const HOTEL_RESPONSE_HOURS = 48;

export const SUPPORT_EMAIL = 'info@hotelbridge.co';
/** The number agents reach us on. An agent stuck half-way through registration
 *  will not write an email — they want one tap. Digits only for the wa.me link,
 *  and a readable version for anyone who would rather dial it. */
export const SUPPORT_WHATSAPP = '917021620577';
export const SUPPORT_PHONE_DISPLAY = '+91 70216 20577';
export const whatsappUrl = (text?: string) =>
  `https://wa.me/${SUPPORT_WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
/** The office, as it appears on invoices and in the email footer. */
export const OFFICE_ADDRESS = ['Sunrise, Charkop', 'Kandivali West', 'Mumbai 400067', 'India'];
export const OFFICE_ADDRESS_LINE = OFFICE_ADDRESS.join(', ');
/** Where new-agency registrations are announced (set HB_NOTIFY_EMAIL to e.g. registrations@hotelbridge.co). */
export const NOTIFY_EMAIL = process.env.HB_NOTIFY_EMAIL || SUPPORT_EMAIL;
