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
/** How long an unpaid prepay booking keeps its rooms. */
export const PAYMENT_HOLD_HOURS = 48;
/** How long we give ourselves to acknowledge a group enquiry. */
export const GROUP_FIRST_RESPONSE_HOURS = 24;
/** Default time a hotel has to accept or decline an on-request booking (per-contract override). */
export const HOTEL_RESPONSE_HOURS = 48;

export const SUPPORT_EMAIL = 'info@hotelbridge.co';
