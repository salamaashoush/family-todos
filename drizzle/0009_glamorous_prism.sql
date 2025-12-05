ALTER TABLE "prayer_settings" ADD COLUMN "prayer_source" varchar(20) DEFAULT 'calculated' NOT NULL;--> statement-breakpoint
ALTER TABLE "prayer_settings" ADD COLUMN "mosque_uuid" varchar(100);--> statement-breakpoint
ALTER TABLE "prayer_settings" ADD COLUMN "mosque_name" varchar(255);--> statement-breakpoint
ALTER TABLE "prayer_settings" ADD COLUMN "mosque_address" text;--> statement-breakpoint
ALTER TABLE "prayer_settings" ADD COLUMN "mawaqit_cache_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "prayer_settings" ADD COLUMN "mawaqit_last_sync" timestamp;