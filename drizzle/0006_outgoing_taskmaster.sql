ALTER TABLE "admin_users" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "account_status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "activated_by" integer;--> statement-breakpoint
CREATE INDEX "idx_admin_users_status" ON "admin_users" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "idx_admin_users_super_admin" ON "admin_users" USING btree ("is_super_admin");