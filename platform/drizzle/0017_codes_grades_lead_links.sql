ALTER TABLE "agencies" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "grade" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "rate_request_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "enquiry_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "code" text;--> statement-breakpoint
CREATE UNIQUE INDEX "agencies_code_uq" ON "agencies" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_code_uq" ON "users" USING btree ("code");