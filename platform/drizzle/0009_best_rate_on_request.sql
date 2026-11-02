CREATE TABLE "rate_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"agency_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"hotel_id" uuid NOT NULL,
	"hotel_name" text NOT NULL,
	"hotel_email" text,
	"city" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"rooms" jsonb NOT NULL,
	"meal_plan" text,
	"notes" text,
	"budget_minor" bigint,
	"budget_currency" text,
	"status" text NOT NULL,
	"token" text NOT NULL,
	"respond_by_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone,
	"decline_reason" text,
	"quote_currency" text,
	"quote_room_type" text,
	"quote_rate_minor" bigint,
	"quote_net_minor" bigint,
	"sell_minor" bigint,
	"markup_bps" integer,
	"quote_meal_plan" text,
	"quote_cancellation" text,
	"quote_notes" text,
	"quote_valid_until" date,
	"accepted_at" timestamp with time zone,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "best_rate_on_request" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "rate_request_email" text;--> statement-breakpoint
ALTER TABLE "rate_requests" ADD CONSTRAINT "rate_requests_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_requests" ADD CONSTRAINT "rate_requests_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rate_requests_token_uq" ON "rate_requests" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_requests_ref_uq" ON "rate_requests" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "rate_requests_agency_idx" ON "rate_requests" USING btree ("agency_id","created_at");