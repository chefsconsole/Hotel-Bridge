-- Financial history is append-only. Corrections are new rows (adjustment /
-- reversal), never edits. Enforced here so no code path can get it wrong.
CREATE OR REPLACE FUNCTION hb_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: this table is append-only', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER ledger_entries_append_only BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION hb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER booking_events_append_only BEFORE UPDATE OR DELETE ON booking_events
  FOR EACH ROW EXECUTE FUNCTION hb_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER invoices_append_only BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION hb_forbid_mutation();
--> statement-breakpoint
-- Sanity constraints the ORM schema can't express.
ALTER TABLE allocations ADD CONSTRAINT allocations_sold_within_total CHECK (sold >= 0 AND sold <= total);
--> statement-breakpoint
ALTER TABLE rate_periods ADD CONSTRAINT rate_periods_dates CHECK (date_to >= date_from);
--> statement-breakpoint
ALTER TABLE contracts ADD CONSTRAINT contracts_dates CHECK (valid_to >= valid_from);
--> statement-breakpoint
ALTER TABLE bookings ADD CONSTRAINT bookings_dates CHECK (check_out > check_in);
--> statement-breakpoint
ALTER TABLE bookings ADD CONSTRAINT bookings_amounts CHECK (sell_minor >= 0 AND supplier_cost_minor >= 0);
