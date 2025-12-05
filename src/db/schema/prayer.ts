import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  varchar,
  integer,
  index,
  uniqueIndex,
  decimal,
} from "drizzle-orm/pg-core";
import { families } from "./families";

// Calculation method options
export const calculationMethodEnum = [
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "UmmAlQura",
  "Dubai",
  "MoonsightingCommittee",
  "NorthAmerica",
  "Kuwait",
  "Qatar",
  "Singapore",
  "Turkey",
  "Tehran",
  "Other",
] as const;
export type CalculationMethodType = (typeof calculationMethodEnum)[number];

// Madhab options
export const madhabEnum = ["Shafi", "Hanafi"] as const;
export type MadhabType = (typeof madhabEnum)[number];

// High latitude rule options
export const highLatitudeRuleEnum = [
  "MiddleOfTheNight",
  "SeventhOfTheNight",
  "TwilightAngle",
] as const;
export type HighLatitudeRuleType = (typeof highLatitudeRuleEnum)[number];

// Prayer time source options
export const prayerSourceEnum = ["calculated", "mosque"] as const;
export type PrayerSourceType = (typeof prayerSourceEnum)[number];

// Prayer names
export const prayerNameEnum = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerNameType = (typeof prayerNameEnum)[number];

// Prayer settings per family
export const prayerSettings = pgTable(
  "prayer_settings",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" })
      .unique(),

    // Location settings
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    timezone: varchar("timezone", { length: 50 }).notNull(),
    city: varchar("city", { length: 255 }),
    country: varchar("country", { length: 100 }),

    // Calculation settings
    calculationMethod: varchar("calculation_method", { length: 50 })
      .notNull()
      .default("MuslimWorldLeague")
      .$type<CalculationMethodType>(),
    madhab: varchar("madhab", { length: 20 })
      .notNull()
      .default("Shafi")
      .$type<MadhabType>(),
    highLatitudeRule: varchar("high_latitude_rule", { length: 30 })
      .default("MiddleOfTheNight")
      .$type<HighLatitudeRuleType>(),

    // Manual adjustments (minutes)
    fajrAdjustment: integer("fajr_adjustment").default(0),
    sunriseAdjustment: integer("sunrise_adjustment").default(0),
    dhuhrAdjustment: integer("dhuhr_adjustment").default(0),
    asrAdjustment: integer("asr_adjustment").default(0),
    maghribAdjustment: integer("maghrib_adjustment").default(0),
    ishaAdjustment: integer("isha_adjustment").default(0),

    // Feature toggles
    isEnabled: boolean("is_enabled").default(true).notNull(),
    showFloatingButton: boolean("show_floating_button").default(true).notNull(),
    fullscreenAdhanEnabled: boolean("fullscreen_adhan_enabled").default(true).notNull(),

    // Prayer source (calculated or mosque-based via Mawaqit)
    prayerSource: varchar("prayer_source", { length: 20 })
      .default("calculated")
      .notNull()
      .$type<PrayerSourceType>(),

    // Mawaqit mosque settings (used when prayerSource = "mosque")
    mosqueUuid: varchar("mosque_uuid", { length: 100 }),
    mosqueName: varchar("mosque_name", { length: 255 }),
    mosqueAddress: text("mosque_address"),
    mawaqitCacheExpiry: timestamp("mawaqit_cache_expiry"),
    mawaqitLastSync: timestamp("mawaqit_last_sync"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_prayer_settings_family").on(table.familyId),
  ]
);

// Adhan audio settings per prayer per family
export const prayerAdhanSettings = pgTable(
  "prayer_adhan_settings",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),

    prayerName: varchar("prayer_name", { length: 20 })
      .notNull()
      .$type<PrayerNameType>(),

    // Audio settings
    adhanEnabled: boolean("adhan_enabled").default(true).notNull(),
    adhanAudioUrl: text("adhan_audio_url"), // URL to audio file (null = use default)
    adhanAudioName: varchar("adhan_audio_name", { length: 255 }), // Display name
    adhanVolume: decimal("adhan_volume", { precision: 3, scale: 2 }).default("1.0"),
    useFajrAdhan: boolean("use_fajr_adhan").default(false), // Fajr has different adhan

    // Reminder settings
    reminderEnabled: boolean("reminder_enabled").default(false).notNull(),
    reminderMinutesBefore: integer("reminder_minutes_before").default(15),
    reminderSoundEnabled: boolean("reminder_sound_enabled").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_prayer_adhan_family_prayer").on(table.familyId, table.prayerName),
    index("idx_prayer_adhan_settings_family").on(table.familyId),
  ]
);

// Default adhan audio files (global, managed by super admin)
export const defaultAdhanAudio = pgTable(
  "default_adhan_audio",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    audioUrl: text("audio_url").notNull(),
    isFajrAdhan: boolean("is_fajr_adhan").default(false).notNull(), // Special Fajr adhan
    isDefault: boolean("is_default").default(false).notNull(),
    displayOrder: integer("display_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_default_adhan_order").on(table.displayOrder),
  ]
);

// Type exports
export type PrayerSettings = typeof prayerSettings.$inferSelect;
export type NewPrayerSettings = typeof prayerSettings.$inferInsert;
export type PrayerAdhanSettings = typeof prayerAdhanSettings.$inferSelect;
export type NewPrayerAdhanSettings = typeof prayerAdhanSettings.$inferInsert;
export type DefaultAdhanAudio = typeof defaultAdhanAudio.$inferSelect;
export type NewDefaultAdhanAudio = typeof defaultAdhanAudio.$inferInsert;
