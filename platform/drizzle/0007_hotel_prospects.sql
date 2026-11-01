CREATE TABLE "hotel_prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"destination" text NOT NULL,
	"region" text,
	"tier" text,
	"best_for" text,
	"priority" text DEFAULT 'P2' NOT NULL,
	"name_checked" boolean DEFAULT false NOT NULL,
	"stage" text DEFAULT 'to_contact' NOT NULL,
	"owner_id" uuid,
	"contact_name" text,
	"contact_role" text,
	"contact_email" text,
	"contact_phone" text,
	"contact_source" text,
	"rate_type" text,
	"next_step" text,
	"next_step_on" date,
	"last_contact_on" date,
	"notes" text,
	"hotel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hotel_prospects_name_dest_uq" ON "hotel_prospects" USING btree ("name","destination");--> statement-breakpoint
CREATE INDEX "hotel_prospects_stage_idx" ON "hotel_prospects" USING btree ("stage","priority");--> statement-breakpoint
CREATE INDEX "hotel_prospects_next_idx" ON "hotel_prospects" USING btree ("next_step_on");