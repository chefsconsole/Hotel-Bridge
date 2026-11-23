ALTER TABLE "restrictions" ADD COLUMN "basis" text DEFAULT 'per_room' NOT NULL;--> statement-breakpoint
ALTER TABLE "restrictions" ADD COLUMN "child_amount_minor" bigint;