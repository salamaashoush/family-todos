import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { db, schema } from "../db";
import { getTenantContext, requireRole } from "../utils/tenant";
import { broadcastToFamily } from "./realtime";
import {
  calculationMethodEnum,
  madhabEnum,
  highLatitudeRuleEnum,
  prayerNameEnum,
  type PrayerNameType,
} from "../db/schema/prayer";

// Schemas for validation
const PrayerSettingsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  city: z.string().optional(),
  country: z.string().optional(),
  calculationMethod: z.enum(calculationMethodEnum).default("MuslimWorldLeague"),
  madhab: z.enum(madhabEnum).default("Shafi"),
  highLatitudeRule: z.enum(highLatitudeRuleEnum).optional(),
  fajrAdjustment: z.number().int().min(-60).max(60).default(0),
  sunriseAdjustment: z.number().int().min(-60).max(60).default(0),
  dhuhrAdjustment: z.number().int().min(-60).max(60).default(0),
  asrAdjustment: z.number().int().min(-60).max(60).default(0),
  maghribAdjustment: z.number().int().min(-60).max(60).default(0),
  ishaAdjustment: z.number().int().min(-60).max(60).default(0),
  isEnabled: z.boolean().default(true),
  showFloatingButton: z.boolean().default(true),
  fullscreenAdhanEnabled: z.boolean().default(true),
});

const AdhanSettingsSchema = z.object({
  prayerName: z.enum(prayerNameEnum),
  adhanEnabled: z.boolean().default(true),
  adhanAudioUrl: z.string().url().optional().nullable(),
  adhanAudioName: z.string().optional().nullable(),
  adhanVolume: z.number().min(0).max(1).default(1),
  useFajrAdhan: z.boolean().default(false),
  reminderEnabled: z.boolean().default(false),
  reminderMinutesBefore: z.number().int().min(1).max(60).default(15),
  reminderSoundEnabled: z.boolean().default(true),
});

// Get prayer settings for current family
export const getPrayerSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await getTenantContext();

    const [settings] = await db
      .select()
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.familyId, familyId))
      .limit(1);

    return settings || null;
  }
);

// Get prayer settings by share token (for public board)
const PublicTokenSchema = z.object({ token: z.string() });

export const getPublicPrayerSettings = createServerFn({ method: "GET" })
  .inputValidator(PublicTokenSchema)
  .handler(async ({ data }) => {
    // Get family by share token
    const [family] = await db
      .select()
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      return null;
    }

    const [settings] = await db
      .select()
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.familyId, family.id))
      .limit(1);

    return settings || null;
  });

// Create or update prayer settings
export const savePrayerSettings = createServerFn({ method: "POST" })
  .inputValidator(PrayerSettingsSchema)
  .handler(async ({ data }) => {
    const { familyId } = await requireRole(["owner", "admin"]);

    // Check if settings exist
    const [existing] = await db
      .select()
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.familyId, familyId))
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(schema.prayerSettings)
        .set({
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          timezone: data.timezone,
          city: data.city || null,
          country: data.country || null,
          calculationMethod: data.calculationMethod,
          madhab: data.madhab,
          highLatitudeRule: data.highLatitudeRule || null,
          fajrAdjustment: data.fajrAdjustment,
          sunriseAdjustment: data.sunriseAdjustment,
          dhuhrAdjustment: data.dhuhrAdjustment,
          asrAdjustment: data.asrAdjustment,
          maghribAdjustment: data.maghribAdjustment,
          ishaAdjustment: data.ishaAdjustment,
          isEnabled: data.isEnabled,
          showFloatingButton: data.showFloatingButton,
          fullscreenAdhanEnabled: data.fullscreenAdhanEnabled,
          updatedAt: new Date(),
        })
        .where(eq(schema.prayerSettings.id, existing.id))
        .returning();

      broadcastToFamily(familyId, {
        type: "data_refresh",
        timestamp: Date.now(),
        data: { entity: "settings", action: "updated" },
      });

      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(schema.prayerSettings)
        .values({
          familyId,
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          timezone: data.timezone,
          city: data.city || null,
          country: data.country || null,
          calculationMethod: data.calculationMethod,
          madhab: data.madhab,
          highLatitudeRule: data.highLatitudeRule || null,
          fajrAdjustment: data.fajrAdjustment,
          sunriseAdjustment: data.sunriseAdjustment,
          dhuhrAdjustment: data.dhuhrAdjustment,
          asrAdjustment: data.asrAdjustment,
          maghribAdjustment: data.maghribAdjustment,
          ishaAdjustment: data.ishaAdjustment,
          isEnabled: data.isEnabled,
          showFloatingButton: data.showFloatingButton,
          fullscreenAdhanEnabled: data.fullscreenAdhanEnabled,
        })
        .returning();

      // Create default adhan settings for all prayers
      const defaultAdhanSettings = prayerNameEnum
        .filter((p) => p !== "sunrise") // No adhan for sunrise
        .map((prayerName) => ({
          familyId,
          prayerName: prayerName as PrayerNameType,
          adhanEnabled: true,
          adhanVolume: "1.0",
          useFajrAdhan: prayerName === "fajr",
          reminderEnabled: false,
          reminderMinutesBefore: 15,
          reminderSoundEnabled: true,
        }));

      await db.insert(schema.prayerAdhanSettings).values(defaultAdhanSettings);

      broadcastToFamily(familyId, {
        type: "data_refresh",
        timestamp: Date.now(),
        data: { entity: "settings", action: "created" },
      });

      return created;
    }
  });

// Get adhan settings for all prayers
export const getAdhanSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await getTenantContext();

    const settings = await db
      .select()
      .from(schema.prayerAdhanSettings)
      .where(eq(schema.prayerAdhanSettings.familyId, familyId));

    return settings;
  }
);

// Get adhan settings by share token (for public board)
export const getPublicAdhanSettings = createServerFn({ method: "GET" })
  .inputValidator(PublicTokenSchema)
  .handler(async ({ data }) => {
    // Get family by share token
    const [family] = await db
      .select()
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      return [];
    }

    const settings = await db
      .select()
      .from(schema.prayerAdhanSettings)
      .where(eq(schema.prayerAdhanSettings.familyId, family.id));

    return settings;
  });

// Update adhan settings for a specific prayer
export const saveAdhanSettings = createServerFn({ method: "POST" })
  .inputValidator(AdhanSettingsSchema)
  .handler(async ({ data }) => {
    const { familyId } = await requireRole(["owner", "admin"]);

    // Check if settings exist for this prayer
    const [existing] = await db
      .select()
      .from(schema.prayerAdhanSettings)
      .where(
        and(
          eq(schema.prayerAdhanSettings.familyId, familyId),
          eq(schema.prayerAdhanSettings.prayerName, data.prayerName)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(schema.prayerAdhanSettings)
        .set({
          adhanEnabled: data.adhanEnabled,
          adhanAudioUrl: data.adhanAudioUrl || null,
          adhanAudioName: data.adhanAudioName || null,
          adhanVolume: String(data.adhanVolume),
          useFajrAdhan: data.useFajrAdhan,
          reminderEnabled: data.reminderEnabled,
          reminderMinutesBefore: data.reminderMinutesBefore,
          reminderSoundEnabled: data.reminderSoundEnabled,
          updatedAt: new Date(),
        })
        .where(eq(schema.prayerAdhanSettings.id, existing.id))
        .returning();

      broadcastToFamily(familyId, {
        type: "data_refresh",
        timestamp: Date.now(),
        data: { entity: "settings", action: "updated" },
      });

      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(schema.prayerAdhanSettings)
        .values({
          familyId,
          prayerName: data.prayerName,
          adhanEnabled: data.adhanEnabled,
          adhanAudioUrl: data.adhanAudioUrl || null,
          adhanAudioName: data.adhanAudioName || null,
          adhanVolume: String(data.adhanVolume),
          useFajrAdhan: data.useFajrAdhan,
          reminderEnabled: data.reminderEnabled,
          reminderMinutesBefore: data.reminderMinutesBefore,
          reminderSoundEnabled: data.reminderSoundEnabled,
        })
        .returning();

      broadcastToFamily(familyId, {
        type: "data_refresh",
        timestamp: Date.now(),
        data: { entity: "settings", action: "created" },
      });

      return created;
    }
  });

// Get default adhan audio options (global)
export const getDefaultAdhanAudios = createServerFn({ method: "GET" }).handler(
  async () => {
    const audios = await db
      .select()
      .from(schema.defaultAdhanAudio)
      .orderBy(asc(schema.defaultAdhanAudio.displayOrder));

    return audios;
  }
);

// Toggle prayer times feature
const ToggleSchema = z.object({ isEnabled: z.boolean() });

export const togglePrayerTimesEnabled = createServerFn({ method: "POST" })
  .inputValidator(ToggleSchema)
  .handler(async ({ data }) => {
    const { familyId } = await requireRole(["owner", "admin"]);

    const [existing] = await db
      .select()
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.familyId, familyId))
      .limit(1);

    if (!existing) {
      throw new Error("Prayer settings not configured. Please set up location first.");
    }

    const [updated] = await db
      .update(schema.prayerSettings)
      .set({
        isEnabled: data.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(schema.prayerSettings.id, existing.id))
      .returning();

    broadcastToFamily(familyId, {
      type: "data_refresh",
      timestamp: Date.now(),
      data: { entity: "settings", action: "updated" },
    });

    return updated;
  });
