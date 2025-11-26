ALTER TABLE "admin_users" ADD COLUMN "is_default_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "password_changed_at" timestamp;