ALTER TABLE "bookings" ADD COLUMN "hotel_respond_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "response_hours" integer DEFAULT 48 NOT NULL;