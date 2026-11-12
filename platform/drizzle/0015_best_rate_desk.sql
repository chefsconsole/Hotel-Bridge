ALTER TABLE "rate_requests" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "rate_requests" ADD COLUMN "offered_at" timestamp with time zone;