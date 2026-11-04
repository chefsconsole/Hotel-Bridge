ALTER TABLE "bookings" ADD COLUMN "assigned_hotel" text;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "collection_hotels" text[] DEFAULT '{}' NOT NULL;