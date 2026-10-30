CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"country" text NOT NULL,
	"city" text,
	"address" text,
	"tax_id" text,
	"website" text,
	"phone" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"billing_currency" text DEFAULT 'EUR' NOT NULL,
	"credit_enabled" boolean DEFAULT false NOT NULL,
	"credit_limit_minor" bigint DEFAULT 0 NOT NULL,
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"internal_notes" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allocations" (
	"contract_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"night" date NOT NULL,
	"total" integer NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "allocations_contract_id_room_type_id_night_pk" PRIMARY KEY("contract_id","room_type_id","night")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"agency_id" uuid,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_id" uuid,
	"actor_label" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"agency_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"supplier" text NOT NULL,
	"supplier_ref" text,
	"hotel_confirmation" text,
	"hotel_id" uuid NOT NULL,
	"contract_id" uuid,
	"offer_key" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"rooms" jsonb NOT NULL,
	"lead_guest" text NOT NULL,
	"agent_reference" text,
	"special_requests" text,
	"status" text NOT NULL,
	"payment_status" text DEFAULT 'not_due' NOT NULL,
	"currency" text NOT NULL,
	"sell_minor" bigint NOT NULL,
	"supplier_cost_minor" bigint NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"local_tax_minor" bigint DEFAULT 0 NOT NULL,
	"commission_receivable_minor" bigint DEFAULT 0 NOT NULL,
	"net_revenue_minor" bigint NOT NULL,
	"collection_model" text NOT NULL,
	"payment_arrangement" text NOT NULL,
	"pricing" jsonb NOT NULL,
	"cancel_policy" jsonb NOT NULL,
	"free_cancel_until" date,
	"payment_due_at" timestamp with time zone,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"inventory_model" text NOT NULL,
	"rate_basis" text NOT NULL,
	"collection_model" text DEFAULT 'prepaid_to_hb' NOT NULL,
	"currency" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"commission_bps" integer DEFAULT 0 NOT NULL,
	"tax_mode" text DEFAULT 'included' NOT NULL,
	"tax_bps" integer DEFAULT 0 NOT NULL,
	"local_tax_minor" bigint DEFAULT 0 NOT NULL,
	"confirmation_mode" text DEFAULT 'on_request' NOT NULL,
	"free_cancel_days" integer,
	"late_penalty_type" text DEFAULT 'first_night' NOT NULL,
	"late_penalty_bps" integer DEFAULT 0 NOT NULL,
	"non_refundable" boolean DEFAULT false NOT NULL,
	"payment_terms" text,
	"distribution_permitted" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"document_url" text,
	"internal_notes" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"name" text PRIMARY KEY NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"rate_e8" bigint NOT NULL,
	"source" text NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"agency_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"group_name" text NOT NULL,
	"group_type" text NOT NULL,
	"legs" jsonb NOT NULL,
	"total_pax" integer NOT NULL,
	"rooms" jsonb NOT NULL,
	"category" text,
	"meal_plan" text,
	"budget_minor" bigint,
	"budget_basis" text,
	"currency" text NOT NULL,
	"coach_parking" boolean DEFAULT false NOT NULL,
	"accessibility" text,
	"special_requests" text,
	"quote_needed_by" date NOT NULL,
	"respond_by" timestamp with time zone NOT NULL,
	"assigned_to" uuid,
	"outcome_note" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_hotel_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"hotel_id" uuid,
	"hotel_name" text NOT NULL,
	"hotel_email" text,
	"city" text NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"respond_by" date,
	"sent_at" timestamp with time zone,
	"sent_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"author_id" uuid,
	"author_label" text NOT NULL,
	"visibility" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"request_id" uuid,
	"hotel_name" text NOT NULL,
	"city" text NOT NULL,
	"currency" text NOT NULL,
	"lines" jsonb NOT NULL,
	"meal_plan" text,
	"taxes_note" text,
	"city_tax_minor" bigint,
	"cancellation_terms" text,
	"payment_terms" text,
	"valid_until" date,
	"cost_total_minor" bigint NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"offer_ids" jsonb NOT NULL,
	"markup_bps" integer NOT NULL,
	"currency" text NOT NULL,
	"cost_total_minor" bigint NOT NULL,
	"sell_total_minor" bigint NOT NULL,
	"valid_until" date NOT NULL,
	"inclusions" text,
	"exclusions" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"address" text,
	"star_rating" integer,
	"star_rating_verified" boolean DEFAULT false NOT NULL,
	"collections" text[] DEFAULT '{}' NOT NULL,
	"summary" text,
	"description" text,
	"facilities" text[] DEFAULT '{}' NOT NULL,
	"transport" text,
	"check_in_time" text,
	"check_out_time" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"group_notes" text,
	"contact_name" text,
	"contact_email" text,
	"reservations_email" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"agency_id" uuid NOT NULL,
	"booking_id" uuid,
	"kind" text DEFAULT 'invoice' NOT NULL,
	"currency" text NOT NULL,
	"total_minor" bigint NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"lines" jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"agency_id" uuid,
	"kind" text NOT NULL,
	"account" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"reference" text,
	"memo" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"succeeded" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"organisation" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"city" text,
	"country" text,
	"website" text,
	"rooms" integer,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid,
	"hotel_id" uuid,
	"kind" text NOT NULL,
	"value_bps" integer,
	"fixed_minor" bigint,
	"currency" text,
	"agent_commission_share_bps" integer,
	"rounding" text DEFAULT 'whole_unit' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"supplier" text NOT NULL,
	"hotel_id" uuid NOT NULL,
	"offer_key" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"rooms" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"meal_plan" text NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"price1_minor" bigint,
	"price2_minor" bigint,
	"price3_minor" bigint,
	"child_minor" bigint,
	"min_stay" integer DEFAULT 1 NOT NULL,
	"release_days" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restrictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"room_type_id" uuid,
	"kind" text NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"amount_minor" bigint,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_adults" integer NOT NULL,
	"max_children" integer DEFAULT 0 NOT NULL,
	"max_occupancy" integer NOT NULL,
	"bedding" text,
	"size_sqm" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_reservations" (
	"supplier_ref" text PRIMARY KEY NOT NULL,
	"client_reference" text NOT NULL,
	"state" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_hotels" (
	"user_id" uuid NOT NULL,
	"hotel_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_hotels_user_id_hotel_id_pk" PRIMARY KEY("user_id","hotel_id")
);
--> statement-breakpoint
CREATE TABLE "search_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"city" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"rooms" jsonb NOT NULL,
	"result_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier" text NOT NULL,
	"operation" text NOT NULL,
	"booking_id" uuid,
	"outcome" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"request" jsonb,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"platform_role" text,
	"agency_id" uuid,
	"agency_role" text,
	"partner_hotel_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_enquiries" ADD CONSTRAINT "group_enquiries_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_enquiries" ADD CONSTRAINT "group_enquiries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_hotel_requests" ADD CONSTRAINT "group_hotel_requests_enquiry_id_group_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."group_enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_enquiry_id_group_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."group_enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_offers" ADD CONSTRAINT "group_offers_enquiry_id_group_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."group_enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_proposals" ADD CONSTRAINT "group_proposals_enquiry_id_group_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."group_enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_periods" ADD CONSTRAINT "rate_periods_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_periods" ADD CONSTRAINT "rate_periods_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restrictions" ADD CONSTRAINT "restrictions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_hotels" ADD CONSTRAINT "saved_hotels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_hotels" ADD CONSTRAINT "saved_hotels_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idem_uq" ON "bookings" USING btree ("agency_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ref_uq" ON "bookings" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "bookings_agency_idx" ON "bookings" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_hotel_idx" ON "contracts" USING btree ("hotel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_enquiries_ref_uq" ON "group_enquiries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "group_enquiries_agency_idx" ON "group_enquiries" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_proposals_version_uq" ON "group_proposals" USING btree ("enquiry_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "hotels_slug_uq" ON "hotels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "hotels_city_idx" ON "hotels" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_uq" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE INDEX "ledger_booking_idx" ON "ledger_entries" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ledger_agency_idx" ON "ledger_entries" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "login_attempts_key_idx" ON "login_attempts" USING btree ("key","created_at");--> statement-breakpoint
CREATE INDEX "rate_periods_contract_idx" ON "rate_periods" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sandbox_client_ref_uq" ON "sandbox_reservations" USING btree ("client_reference");--> statement-breakpoint
CREATE INDEX "search_log_agency_idx" ON "search_log" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");