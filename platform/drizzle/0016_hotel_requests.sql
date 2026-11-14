ALTER TABLE "group_enquiries" ADD COLUMN "kind" text DEFAULT 'group' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_enquiries" ADD COLUMN "wanted_hotel" text;