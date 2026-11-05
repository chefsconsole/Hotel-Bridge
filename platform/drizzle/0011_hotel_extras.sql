CREATE TABLE "hotel_extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"price_minor" bigint NOT NULL,
	"child_price_minor" bigint,
	"currency" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"note" text,
	"compulsory" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotel_extras" ADD CONSTRAINT "hotel_extras_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hotel_extras_hotel_idx" ON "hotel_extras" USING btree ("hotel_id");