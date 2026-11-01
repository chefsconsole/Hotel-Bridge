CREATE TABLE "outbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"to_name" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"kind" text NOT NULL,
	"related_id" uuid,
	"status" text NOT NULL,
	"provider" text,
	"provider_id" text,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_enquiries" ADD COLUMN "tiers" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_enquiries" ADD COLUMN "client_brief" text;--> statement-breakpoint
ALTER TABLE "group_enquiries" ADD COLUMN "dispatched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_hotel_requests" ADD COLUMN "respond_by_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_hotel_requests" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "group_hotel_requests" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_hotel_requests" ADD COLUMN "prospect_id" uuid;--> statement-breakpoint
ALTER TABLE "group_hotel_requests" ADD COLUMN "answered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_hotel_requests" ADD COLUMN "decline_reason" text;--> statement-breakpoint
ALTER TABLE "group_proposals" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_proposals" ADD COLUMN "automatic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_prospects" ADD COLUMN "total_rooms" integer;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "total_rooms" integer;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "accepts_groups" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "groups_email" text;--> statement-breakpoint
CREATE INDEX "outbound_emails_created_idx" ON "outbound_emails" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "outbound_emails_related_idx" ON "outbound_emails" USING btree ("related_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_hotel_requests_token_uq" ON "group_hotel_requests" USING btree ("token");