CREATE INDEX "password_links_user_idx" ON "password_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rate_requests_status_idx" ON "rate_requests" USING btree ("status","respond_by_at");--> statement-breakpoint
CREATE INDEX "support_tickets_agency_idx" ON "support_tickets" USING btree ("agency_id","created_at");