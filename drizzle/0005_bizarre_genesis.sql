ALTER TABLE "families" ADD COLUMN "share_token" varchar(64);--> statement-breakpoint
CREATE INDEX "idx_families_share_token" ON "families" USING btree ("share_token");--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_share_token_unique" UNIQUE("share_token");