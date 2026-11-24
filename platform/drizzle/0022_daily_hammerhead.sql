CREATE TABLE "rate_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"room_type_id" uuid,
	"kind" text DEFAULT 'early_bird' NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"min_lead_days" integer NOT NULL,
	"discount_bps" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_discounts" ADD CONSTRAINT "rate_discounts_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_discounts_contract_idx" ON "rate_discounts" USING btree ("contract_id","date_from","date_to");