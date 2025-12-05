CREATE TABLE "default_adhan_audio" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"audio_url" text NOT NULL,
	"is_fajr_adhan" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_adhan_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"prayer_name" varchar(20) NOT NULL,
	"adhan_enabled" boolean DEFAULT true NOT NULL,
	"adhan_audio_url" text,
	"adhan_audio_name" varchar(255),
	"adhan_volume" numeric(3, 2) DEFAULT '1.0',
	"use_fajr_adhan" boolean DEFAULT false,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"reminder_minutes_before" integer DEFAULT 15,
	"reminder_sound_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"timezone" varchar(50) NOT NULL,
	"city" varchar(255),
	"country" varchar(100),
	"calculation_method" varchar(50) DEFAULT 'MuslimWorldLeague' NOT NULL,
	"madhab" varchar(20) DEFAULT 'Shafi' NOT NULL,
	"high_latitude_rule" varchar(30) DEFAULT 'MiddleOfTheNight',
	"fajr_adjustment" integer DEFAULT 0,
	"sunrise_adjustment" integer DEFAULT 0,
	"dhuhr_adjustment" integer DEFAULT 0,
	"asr_adjustment" integer DEFAULT 0,
	"maghrib_adjustment" integer DEFAULT 0,
	"isha_adjustment" integer DEFAULT 0,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"show_floating_button" boolean DEFAULT true NOT NULL,
	"fullscreen_adhan_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prayer_settings_family_id_unique" UNIQUE("family_id")
);
--> statement-breakpoint
ALTER TABLE "prayer_adhan_settings" ADD CONSTRAINT "prayer_adhan_settings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_settings" ADD CONSTRAINT "prayer_settings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_default_adhan_order" ON "default_adhan_audio" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_prayer_adhan_family_prayer" ON "prayer_adhan_settings" USING btree ("family_id","prayer_name");--> statement-breakpoint
CREATE INDEX "idx_prayer_adhan_settings_family" ON "prayer_adhan_settings" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_prayer_settings_family" ON "prayer_settings" USING btree ("family_id");