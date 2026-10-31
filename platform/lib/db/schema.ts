/* ------------------------------------------------------------------ *
 * HotelBridge platform — database schema.
 *
 * Conventions
 *  - Money is always an integer in MINOR units (cents) next to an explicit
 *    ISO currency column. Never a float, never a bare number.
 *  - Percentages are basis points (1% = 100 bps).
 *  - Dates of stay are ISO `date` strings (YYYY-MM-DD) — no timezone games.
 *  - Financial rows (ledger_entries) are append-only, enforced by a trigger
 *    in the migration, not just by convention.
 * ------------------------------------------------------------------ */
import {
  pgTable, text, integer, bigint, boolean, timestamp, date, jsonb, uuid,
  uniqueIndex, index, primaryKey, customType,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const money = (name: string) => bigint(name, { mode: 'number' });
const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({ dataType: () => 'bytea' });

/* ============================== Accounts ============================== */

export const agencies = pgTable('agencies', {
  id: id(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  country: text('country').notNull(),
  city: text('city'),
  address: text('address'),
  taxId: text('tax_id'),
  // India KYC: PAN is required to approve an Indian agency; GSTIN when registered for GST.
  pan: text('pan'),
  gstin: text('gstin'),
  website: text('website'),
  phone: text('phone'),
  // pending -> verified | rejected; verified -> suspended
  status: text('status').notNull().default('pending'),
  billingCurrency: text('billing_currency').notNull().default('EUR'),
  // Credit is OFF unless someone with finance rights turns it on.
  creditEnabled: boolean('credit_enabled').notNull().default(false),
  creditLimitMinor: money('credit_limit_minor').notNull().default(0),
  paymentTermsDays: integer('payment_terms_days').notNull().default(0),
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  internalNotes: text('internal_notes'),
  // What the agency's own clients see on proposals and reminders (white-label).
  brandName: text('brand_name'),
  brandEmail: text('brand_email'),
  brandPhone: text('brand_phone'),
  logoUrl: text('logo_url'),
  brandFooter: text('brand_footer'),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** KYC documents an agency uploads (PAN card, GST certificate…). Stored in the
 *  database for now; move to object storage when files grow. Only staff and the
 *  agency itself can read them. */
export const agencyDocuments = pgTable('agency_documents', {
  id: id(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  kind: text('kind').notNull(), // pan_card | gst_certificate | registration | other
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  data: bytea('data').notNull(),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: createdAt(),
}, (t) => [index('agency_documents_agency_idx').on(t.agencyId, t.createdAt)]);

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  // HotelBridge staff: admin | ops | finance. Null for agents and partners.
  platformRole: text('platform_role'),
  agencyId: uuid('agency_id').references(() => agencies.id),
  // owner | agent — only meaningful with agencyId
  agencyRole: text('agency_role'),
  partnerHotelId: uuid('partner_hotel_id'),
  status: text('status').notNull().default('active'), // active | disabled
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('users_email_uq').on(t.email)]);

export const sessions = pgTable('sessions', {
  // sha256 of the cookie token — the raw token is never stored
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

export const loginAttempts = pgTable('login_attempts', {
  id: id(),
  key: text('key').notNull(), // lower(email) — per-account throttling
  succeeded: boolean('succeeded').notNull(),
  createdAt: createdAt(),
}, (t) => [index('login_attempts_key_idx').on(t.key, t.createdAt)]);

/* ============================== Hotels ============================== */

export const hotels = pgTable('hotels', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  address: text('address'),
  // Official star rating only when verified; null = not verified.
  starRating: integer('star_rating'),
  starRatingVerified: boolean('star_rating_verified').notNull().default(false),
  // Why this hotel earns a place: city_centre, airport, station, business,
  // premium, group_friendly, value
  collections: text('collections').array().notNull().default([]),
  summary: text('summary'),
  description: text('description'),
  facilities: text('facilities').array().notNull().default([]),
  transport: text('transport'),
  checkInTime: text('check_in_time'),
  checkOutTime: text('check_out_time'),
  // [{ url, alt, credit, license }] — only licensed / permitted imagery
  images: jsonb('images').$type<HotelImage[]>().notNull().default([]),
  groupNotes: text('group_notes'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  reservationsEmail: text('reservations_email'),
  status: text('status').notNull().default('draft'), // draft | active | inactive
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex('hotels_slug_uq').on(t.slug), index('hotels_city_idx').on(t.city)]);

export type HotelImage = { url: string; alt: string; credit?: string; license?: string };

export const roomTypes = pgTable('room_types', {
  id: id(),
  hotelId: uuid('hotel_id').notNull().references(() => hotels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  maxAdults: integer('max_adults').notNull(),
  maxChildren: integer('max_children').notNull().default(0),
  maxOccupancy: integer('max_occupancy').notNull(),
  bedding: text('bedding'),
  sizeSqm: integer('size_sqm'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
});

/* ============================== Contracts ============================== */

export const contracts = pgTable('contracts', {
  id: id(),
  hotelId: uuid('hotel_id').notNull().references(() => hotels.id, { onDelete: 'cascade' }),
  reference: text('reference').notNull(),
  // direct_net | direct_commissionable | request_only
  inventoryModel: text('inventory_model').notNull(),
  // net: rates are what we pay the hotel. commissionable: rates are gross,
  // the hotel pays us commissionBps.
  rateBasis: text('rate_basis').notNull(), // net | commissionable
  // prepaid_to_hb: agent pays HotelBridge, we pay the hotel.
  // pay_direct_to_hotel: agent/guest settles with the hotel, we invoice commission.
  collectionModel: text('collection_model').notNull().default('prepaid_to_hb'),
  currency: text('currency').notNull(),
  validFrom: date('valid_from').notNull(),
  validTo: date('valid_to').notNull(),
  commissionBps: integer('commission_bps').notNull().default(0),
  // included: VAT is inside the rate. excluded: add taxBps on top.
  taxMode: text('tax_mode').notNull().default('included'),
  taxBps: integer('tax_bps').notNull().default(0),
  // City / tourist tax payable locally at the hotel, per person per night.
  localTaxMinor: money('local_tax_minor').notNull().default(0),
  // instant_allocation: confirm from allotment, fall back to on_request.
  // on_request: hotel must confirm every booking.
  confirmationMode: text('confirmation_mode').notNull().default('on_request'),
  // On-request bookings: hours the hotel has to accept or decline before the request lapses.
  responseHours: integer('response_hours').notNull().default(48),
  // Cancellation: free until N days before arrival, then penalty.
  freeCancelDays: integer('free_cancel_days'),
  // first_night | percent | full
  latePenaltyType: text('late_penalty_type').notNull().default('first_night'),
  latePenaltyBps: integer('late_penalty_bps').notNull().default(0),
  nonRefundable: boolean('non_refundable').notNull().default(false),
  paymentTerms: text('payment_terms'),
  // Contractual permission to resell to B2B agents. No permission, no sale.
  distributionPermitted: boolean('distribution_permitted').notNull().default(false),
  // draft | active | suspended
  status: text('status').notNull().default('draft'),
  version: integer('version').notNull().default(1),
  documentUrl: text('document_url'),
  internalNotes: text('internal_notes'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('contracts_hotel_idx').on(t.hotelId)]);

export const ratePeriods = pgTable('rate_periods', {
  id: id(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  roomTypeId: uuid('room_type_id').notNull().references(() => roomTypes.id, { onDelete: 'cascade' }),
  mealPlan: text('meal_plan').notNull(), // RO | BB | HB | FB
  dateFrom: date('date_from').notNull(),
  dateTo: date('date_to').notNull(), // inclusive: last NIGHT the price applies
  // Per room per night by adult occupancy. Null = occupancy not sold.
  price1Minor: money('price1_minor'),
  price2Minor: money('price2_minor'),
  price3Minor: money('price3_minor'),
  childMinor: money('child_minor'), // per child per night; null = children not priced
  minStay: integer('min_stay').notNull().default(1),
  releaseDays: integer('release_days').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [index('rate_periods_contract_idx').on(t.contractId)]);

export const restrictions = pgTable('restrictions', {
  id: id(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  roomTypeId: uuid('room_type_id'), // null = whole contract
  kind: text('kind').notNull(), // blackout | stop_sell | supplement
  dateFrom: date('date_from').notNull(),
  dateTo: date('date_to').notNull(),
  // supplement only: per room per night
  amountMinor: money('amount_minor'),
  note: text('note'),
  createdAt: createdAt(),
});

export const allocations = pgTable('allocations', {
  contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  roomTypeId: uuid('room_type_id').notNull().references(() => roomTypes.id, { onDelete: 'cascade' }),
  night: date('night').notNull(),
  total: integer('total').notNull(),
  sold: integer('sold').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.contractId, t.roomTypeId, t.night] })]);

/* ============================== Pricing ============================== */

export const pricingRules = pgTable('pricing_rules', {
  id: id(),
  // null agencyId = default rule for everyone
  agencyId: uuid('agency_id').references(() => agencies.id),
  hotelId: uuid('hotel_id').references(() => hotels.id),
  // percent: markup on supplier cost. fixed: per room per night (minor units,
  // in the contract currency). Applies to net-rate inventory only.
  kind: text('kind').notNull(),
  valueBps: integer('value_bps'),
  fixedMinor: money('fixed_minor'),
  currency: text('currency'),
  // For commissionable inventory: share of the hotel commission passed to the agent.
  agentCommissionShareBps: integer('agent_commission_share_bps'),
  // none | whole_unit — selling price rounding, always upward
  rounding: text('rounding').notNull().default('whole_unit'),
  active: boolean('active').notNull().default(true),
  note: text('note'),
  createdAt: createdAt(),
});

export const fxRates = pgTable('fx_rates', {
  id: id(),
  base: text('base').notNull(),
  quote: text('quote').notNull(),
  // rate * 1e8 as an integer: 1 base = rateE8 / 1e8 quote
  rateE8: bigint('rate_e8', { mode: 'number' }).notNull(),
  source: text('source').notNull(),
  asOf: timestamp('as_of', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

/* ============================== Search & quotes ============================== */

export const searchLog = pgTable('search_log', {
  id: id(),
  agencyId: uuid('agency_id').notNull(),
  userId: uuid('user_id').notNull(),
  city: text('city').notNull(),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  rooms: jsonb('rooms').$type<RoomRequest[]>().notNull(),
  resultCount: integer('result_count').notNull(),
  createdAt: createdAt(),
}, (t) => [index('search_log_agency_idx').on(t.agencyId, t.createdAt)]);

export type RoomRequest = { adults: number; childAges: number[] };

/** A priced, short-lived offer an agent can check out. The breakdown is the
 *  server's own calculation — the client never sends a price. */
export const quotes = pgTable('quotes', {
  id: id(),
  agencyId: uuid('agency_id').notNull(),
  userId: uuid('user_id').notNull(),
  supplier: text('supplier').notNull(),
  hotelId: uuid('hotel_id').notNull(),
  offerKey: text('offer_key').notNull(),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  rooms: jsonb('rooms').$type<RoomRequest[]>().notNull(),
  snapshot: jsonb('snapshot').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

/* ============================== Bookings ============================== */

export const bookings = pgTable('bookings', {
  id: id(),
  reference: text('reference').notNull(), // HB-XXXXXX, shown to agents
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  // Same key twice from the same agency = same booking. Never a second reservation.
  idempotencyKey: text('idempotency_key').notNull(),
  supplier: text('supplier').notNull(), // contracted | sandbox | ...
  supplierRef: text('supplier_ref'),
  hotelConfirmation: text('hotel_confirmation'),
  hotelId: uuid('hotel_id').notNull().references(() => hotels.id),
  contractId: uuid('contract_id'),
  offerKey: text('offer_key').notNull(),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  rooms: jsonb('rooms').$type<BookedRoom[]>().notNull(),
  leadGuest: text('lead_guest').notNull(),
  agentReference: text('agent_reference'),
  specialRequests: text('special_requests'),
  status: text('status').notNull(),
  paymentStatus: text('payment_status').notNull().default('not_due'),
  // Economics frozen at booking time (minor units, `currency`).
  currency: text('currency').notNull(),
  sellMinor: money('sell_minor').notNull(), // what the agent pays
  supplierCostMinor: money('supplier_cost_minor').notNull(), // what we owe the hotel/supplier
  taxMinor: money('tax_minor').notNull().default(0), // VAT inside sellMinor
  localTaxMinor: money('local_tax_minor').notNull().default(0), // payable at hotel, NOT in sellMinor
  commissionReceivableMinor: money('commission_receivable_minor').notNull().default(0),
  netRevenueMinor: money('net_revenue_minor').notNull(),
  collectionModel: text('collection_model').notNull(),
  // credit (on account) | prepay (pay before confirmation) | direct (guest pays hotel)
  paymentArrangement: text('payment_arrangement').notNull(),
  pricing: jsonb('pricing').notNull(), // full breakdown for audit
  cancelPolicy: jsonb('cancel_policy').notNull(),
  freeCancelUntil: date('free_cancel_until'),
  paymentDueAt: timestamp('payment_due_at', { withTimezone: true }),
  // On-request: the hotel must answer by this time, or the request lapses (no charge).
  hotelRespondBy: timestamp('hotel_respond_by', { withTimezone: true }),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('bookings_idem_uq').on(t.agencyId, t.idempotencyKey),
  uniqueIndex('bookings_ref_uq').on(t.reference),
  index('bookings_agency_idx').on(t.agencyId, t.createdAt),
  index('bookings_status_idx').on(t.status),
]);

export type BookedRoom = {
  adults: number; childAges: number[];
  roomTypeId: string; roomName: string; mealPlan: string;
  guestNames: string[];
};

export const bookingEvents = pgTable('booking_events', {
  id: id(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actorId: uuid('actor_id'),
  actorLabel: text('actor_label').notNull(),
  note: text('note'),
  createdAt: createdAt(),
}, (t) => [index('booking_events_booking_idx').on(t.bookingId)]);

/** Redacted request/response log for every supplier call. */
export const supplierCalls = pgTable('supplier_calls', {
  id: id(),
  supplier: text('supplier').notNull(),
  operation: text('operation').notNull(),
  bookingId: uuid('booking_id'),
  outcome: text('outcome').notNull(), // ok | rejected | timeout | error
  durationMs: integer('duration_ms').notNull(),
  request: jsonb('request'),
  response: jsonb('response'),
  createdAt: createdAt(),
});

/** Development-only sandbox supplier's own "remote" state, so reconciliation
 *  can be exercised end to end. Never used when HB_ENV=production. */
export const sandboxReservations = pgTable('sandbox_reservations', {
  supplierRef: text('supplier_ref').primaryKey(),
  clientReference: text('client_reference').notNull(),
  state: text('state').notNull(), // confirmed | cancelled
  payload: jsonb('payload').notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('sandbox_client_ref_uq').on(t.clientReference)]);

/* ============================== Money ============================== */

/** Append-only. Corrections are new rows (adjustment / reversal), never edits. */
export const ledgerEntries = pgTable('ledger_entries', {
  id: id(),
  bookingId: uuid('booking_id').references(() => bookings.id),
  agencyId: uuid('agency_id').references(() => agencies.id),
  // Settlements with a hotel that aren't tied to one booking (paying the hotel, receiving its commission).
  hotelId: uuid('hotel_id'),
  // agent_charge      +  agent owes us
  // agent_payment     -  agent paid us
  // agent_refund      +  we paid money back (reduces what they've paid)
  // cancellation_fee  (recorded with the reversal that replaces the charge)
  // supplier_payable  +  we owe the supplier
  // supplier_payment  -  we paid the supplier
  // commission_receivable + hotel owes us commission
  // commission_received   - hotel paid commission
  // adjustment / reversal  signed corrections
  kind: text('kind').notNull(),
  account: text('account').notNull(), // agent | supplier | commission
  amountMinor: money('amount_minor').notNull(), // signed
  currency: text('currency').notNull(),
  reference: text('reference'),
  memo: text('memo'),
  createdBy: uuid('created_by'),
  createdAt: createdAt(),
}, (t) => [index('ledger_booking_idx').on(t.bookingId), index('ledger_agency_idx').on(t.agencyId)]);

export const invoices = pgTable('invoices', {
  id: id(),
  number: text('number').notNull(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  bookingId: uuid('booking_id').references(() => bookings.id),
  kind: text('kind').notNull().default('invoice'), // invoice | credit_note
  currency: text('currency').notNull(),
  totalMinor: money('total_minor').notNull(),
  taxMinor: money('tax_minor').notNull().default(0),
  lines: jsonb('lines').$type<{ label: string; amountMinor: number }[]>().notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  issuedAt: createdAt(),
}, (t) => [uniqueIndex('invoices_number_uq').on(t.number)]);

export const counters = pgTable('counters', {
  name: text('name').primaryKey(),
  value: integer('value').notNull(),
});

/* ============================== Group Desk ============================== */

export const groupEnquiries = pgTable('group_enquiries', {
  id: id(),
  reference: text('reference').notNull(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  // new | under_review | sent_to_hotels | offers_received | proposal_prepared
  // | sent_to_agent | negotiation | won | lost | cancelled
  status: text('status').notNull().default('new'),
  groupName: text('group_name').notNull(),
  groupType: text('group_type').notNull(), // leisure | corporate | mice | wedding | education | other
  legs: jsonb('legs').$type<GroupLeg[]>().notNull(),
  totalPax: integer('total_pax').notNull(),
  rooms: jsonb('rooms').$type<GroupRooms>().notNull(),
  category: text('category'),
  mealPlan: text('meal_plan'),
  budgetMinor: money('budget_minor'),
  budgetBasis: text('budget_basis'), // per_room_night | per_person_total | total
  currency: text('currency').notNull(),
  coachParking: boolean('coach_parking').notNull().default(false),
  accessibility: text('accessibility'),
  specialRequests: text('special_requests'),
  quoteNeededBy: date('quote_needed_by').notNull(),
  // Our own commitment: when we owe the agent a first response.
  respondBy: timestamp('respond_by', { withTimezone: true }).notNull(),
  assignedTo: uuid('assigned_to'),
  outcomeNote: text('outcome_note'),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex('group_enquiries_ref_uq').on(t.reference), index('group_enquiries_agency_idx').on(t.agencyId)]);

export type GroupLeg = { city: string; checkIn: string; checkOut: string };
export type GroupRooms = { single: number; double: number; twin: number; triple: number };

export const groupHotelRequests = pgTable('group_hotel_requests', {
  id: id(),
  enquiryId: uuid('enquiry_id').notNull().references(() => groupEnquiries.id, { onDelete: 'cascade' }),
  hotelId: uuid('hotel_id'),
  hotelName: text('hotel_name').notNull(),
  hotelEmail: text('hotel_email'),
  city: text('city').notNull(),
  // generated -> sent (a human confirms it went out) -> responded | declined | no_response
  status: text('status').notNull().default('generated'),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  respondBy: date('respond_by'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  sentBy: uuid('sent_by'),
  createdAt: createdAt(),
});

export const groupOffers = pgTable('group_offers', {
  id: id(),
  enquiryId: uuid('enquiry_id').notNull().references(() => groupEnquiries.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id'),
  hotelName: text('hotel_name').notNull(),
  city: text('city').notNull(),
  currency: text('currency').notNull(),
  // per room per night as quoted by the hotel
  lines: jsonb('lines').$type<GroupOfferLine[]>().notNull(),
  mealPlan: text('meal_plan'),
  taxesNote: text('taxes_note'),
  cityTaxMinor: money('city_tax_minor'), // per person per night, payable locally
  cancellationTerms: text('cancellation_terms'),
  paymentTerms: text('payment_terms'),
  validUntil: date('valid_until'),
  costTotalMinor: money('cost_total_minor').notNull(),
  createdBy: uuid('created_by'),
  createdAt: createdAt(),
});

export type GroupOfferLine = { roomType: string; rooms: number; nights: number; rateMinor: number };

export const groupProposals = pgTable('group_proposals', {
  id: id(),
  enquiryId: uuid('enquiry_id').notNull().references(() => groupEnquiries.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  offerIds: jsonb('offer_ids').$type<string[]>().notNull(),
  markupBps: integer('markup_bps').notNull(),
  currency: text('currency').notNull(),
  costTotalMinor: money('cost_total_minor').notNull(),
  sellTotalMinor: money('sell_total_minor').notNull(),
  validUntil: date('valid_until').notNull(),
  inclusions: text('inclusions'),
  exclusions: text('exclusions'),
  // draft | sent | accepted | declined | superseded
  status: text('status').notNull().default('draft'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('group_proposals_version_uq').on(t.enquiryId, t.version)]);

export const groupMessages = pgTable('group_messages', {
  id: id(),
  enquiryId: uuid('enquiry_id').notNull().references(() => groupEnquiries.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id'),
  authorLabel: text('author_label').notNull(),
  visibility: text('visibility').notNull(), // shared | internal
  body: text('body').notNull(),
  createdAt: createdAt(),
});

/* ============================== Agents' own clients ============================== *
 * The agency's CRM: its travellers, their trips (packages) and what each
 * client has paid the agency. A trip mixes hotels booked through HotelBridge
 * with things the agency sells itself (flights, visas, transfers...). These
 * are the agency's own records, kept apart from the HotelBridge ledger. */

export const clients = pgTable('clients', {
  id: id(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull(),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('clients_agency_idx').on(t.agencyId, t.name)]);

export const trips = pgTable('trips', {
  id: id(),
  reference: text('reference').notNull(), // TR-XXXXX, the agency's own reference for the client
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  title: text('title').notNull(),
  // enquiry -> quoted -> confirmed -> completed; or cancelled
  status: text('status').notNull().default('enquiry'),
  currency: text('currency').notNull(), // what the client is quoted and pays in
  startDate: date('start_date'),
  endDate: date('end_date'),
  adults: integer('adults').notNull().default(2),
  children: integer('children').notNull().default(0),
  balanceDueOn: date('balance_due_on'),
  source: text('source'), // where the lead came from: whatsapp | instagram | referral | walk_in | website | repeat | other
  followUpOn: date('follow_up_on'), // the agent's next action date
  followUpNote: text('follow_up_note'),
  clientApprovedAt: timestamp('client_approved_at', { withTimezone: true }), // client pressed "Approve" on the shared plan
  notes: text('notes'), // internal
  clientNote: text('client_note'), // printed on the proposal
  shareToken: text('share_token').notNull(),
  shareEnabled: boolean('share_enabled').notNull().default(true),
  showItemPrices: boolean('show_item_prices').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('trips_share_uq').on(t.shareToken),
  uniqueIndex('trips_ref_uq').on(t.agencyId, t.reference),
  index('trips_agency_idx').on(t.agencyId, t.createdAt),
  index('trips_client_idx').on(t.clientId),
  index('trips_follow_up_idx').on(t.agencyId, t.followUpOn),
]);

export const TRIP_ITEM_KINDS = ['hotel', 'flight', 'visa', 'transfer', 'activity', 'insurance', 'other'] as const;

export const tripItems = pgTable('trip_items', {
  id: id(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  agencyId: uuid('agency_id').notNull(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  details: text('details'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  // What the client pays the agency for this line, in the trip currency. Null = not priced yet.
  clientPriceMinor: money('client_price_minor'),
  // The agency's own cost for extras (optional), in costCurrency.
  costMinor: money('cost_minor'),
  costCurrency: text('cost_currency'),
  supplierName: text('supplier_name'), // e.g. the airline or visa service — extras only
  // Hotels booked through HotelBridge:
  hotelId: uuid('hotel_id'),
  offerKey: text('offer_key'),
  rooms: jsonb('rooms').$type<RoomRequest[]>(),
  roomName: text('room_name'),
  mealPlan: text('meal_plan'),
  cancellation: text('cancellation'),
  // The HotelBridge price the agent accepted (what the agency will pay us).
  netMinor: money('net_minor'),
  netCurrency: text('net_currency'),
  bookingId: uuid('booking_id').references(() => bookings.id),
  lastIssue: text('last_issue'), // e.g. "price changed" from the last Book all
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('trip_items_trip_idx').on(t.tripId, t.sortOrder)]);

/** Money the CLIENT paid the agency. Not HotelBridge money — the agency's own record. */
export const tripPayments = pgTable('trip_payments', {
  id: id(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  agencyId: uuid('agency_id').notNull(),
  amountMinor: money('amount_minor').notNull(),
  currency: text('currency').notNull(),
  method: text('method').notNull(), // upi | bank | card | cash | other
  reference: text('reference'),
  receivedOn: date('received_on').notNull(),
  note: text('note'),
  createdBy: uuid('created_by').notNull(),
  createdAt: createdAt(),
}, (t) => [index('trip_payments_trip_idx').on(t.tripId)]);

/* ============================== Everything else ============================== */

export const savedHotels = pgTable('saved_hotels', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  hotelId: uuid('hotel_id').notNull().references(() => hotels.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.hotelId] })]);

export const supportTickets = pgTable('support_tickets', {
  id: id(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  userId: uuid('user_id').notNull(),
  bookingId: uuid('booking_id'),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  urgency: text('urgency').notNull().default('normal'), // normal | urgent
  status: text('status').notNull().default('open'), // open | answered | closed
  reply: text('reply'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const partnerApplications = pgTable('partner_applications', {
  id: id(),
  kind: text('kind').notNull(), // hotel | distribution
  organisation: text('organisation').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  city: text('city'),
  country: text('country'),
  website: text('website'),
  rooms: integer('rooms'),
  message: text('message'),
  status: text('status').notNull().default('new'), // new | contacted | onboarding | declined
  createdAt: createdAt(),
});

export const auditLog = pgTable('audit_log', {
  id: id(),
  actorId: uuid('actor_id'),
  actorLabel: text('actor_label').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  agencyId: uuid('agency_id'),
  detail: jsonb('detail'),
  createdAt: createdAt(),
}, (t) => [index('audit_entity_idx').on(t.entity, t.entityId), index('audit_created_idx').on(t.createdAt)]);

/** One row per AI request — for per-user limits and cost visibility. */
export const aiUsage = pgTable('ai_usage', {
  id: id(),
  userId: uuid('user_id').notNull(),
  tool: text('tool').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  ok: boolean('ok').notNull(),
  createdAt: createdAt(),
}, (t) => [index('ai_usage_user_idx').on(t.userId, t.createdAt)]);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
});
