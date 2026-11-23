CREATE TABLE "staff_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"assigned_to" uuid,
	"due_on" date,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"entity" text,
	"entity_id" uuid,
	"created_by" uuid,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "staff_tasks_queue_idx" ON "staff_tasks" USING btree ("status","due_on");--> statement-breakpoint
CREATE INDEX "staff_tasks_owner_idx" ON "staff_tasks" USING btree ("assigned_to","status");--> statement-breakpoint
CREATE INDEX "staff_tasks_entity_idx" ON "staff_tasks" USING btree ("entity","entity_id");