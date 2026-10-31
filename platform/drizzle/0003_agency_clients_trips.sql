CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"city" text,
	"notes" text,
	"created_by" uuid NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"start_date" date,
	"end_date" date,
	"client_price_minor" bigint,
	"cost_minor" bigint,
	"cost_currency" text,
	"supplier_name" text,
	"hotel_id" uuid,
	"offer_key" text,
	"rooms" jsonb,
	"room_name" text,
	"meal_plan" text,
	"cancellation" text,
	"net_minor" bigint,
	"net_currency" text,
	"booking_id" uuid,
	"last_issue" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"received_on" date NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"agency_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'enquiry' NOT NULL,
	"currency" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"adults" integer DEFAULT 2 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"balance_due_on" date,
	"source" text,
	"follow_up_on" date,
	"follow_up_note" text,
	"client_approved_at" timestamp with time zone,
	"notes" text,
	"client_note" text,
	"share_token" text NOT NULL,
	"share_enabled" boolean DEFAULT true NOT NULL,
	"show_item_prices" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "brand_name" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "brand_email" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "brand_phone" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "brand_footer" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_payments" ADD CONSTRAINT "trip_payments_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_agency_idx" ON "clients" USING btree ("agency_id","name");--> statement-breakpoint
CREATE INDEX "trip_items_trip_idx" ON "trip_items" USING btree ("trip_id","sort_order");--> statement-breakpoint
CREATE INDEX "trip_payments_trip_idx" ON "trip_payments" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_share_uq" ON "trips" USING btree ("share_token");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_ref_uq" ON "trips" USING btree ("agency_id","reference");--> statement-breakpoint
CREATE INDEX "trips_agency_idx" ON "trips" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX "trips_client_idx" ON "trips" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "trips_follow_up_idx" ON "trips" USING btree ("agency_id","follow_up_on");--> statement-breakpoint
ALTER TABLE "trip_payments" ADD CONSTRAINT "trip_payments_amount_positive" CHECK ("amount_minor" > 0);--> statement-breakpoint
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_price_nonneg" CHECK ("client_price_minor" IS NULL OR "client_price_minor" >= 0);--> statement-breakpoint
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_cost_nonneg" CHECK ("cost_minor" IS NULL OR "cost_minor" >= 0);
