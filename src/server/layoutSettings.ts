import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import {
  type LayoutSettings,
  DEFAULT_LAYOUT_SETTINGS,
  LAYOUT_IDS,
} from "../config/layouts";

// For now, we'll use a default family ID of 1
// This will be replaced with session-based family ID in multi-tenancy phase
const DEFAULT_FAMILY_ID = 1;

const LayoutIdSchema = z.enum(LAYOUT_IDS);

const DeviceLayoutsSchema = z.object({
  phone: LayoutIdSchema,
  tablet: LayoutIdSchema,
  desktop: LayoutIdSchema,
});

const LayoutSettingsSchema = z.object({
  autoSwitchEnabled: z.boolean().optional(),
  timeslotAutoExpand: z.boolean().optional(),
  defaultLayout: LayoutIdSchema.optional(),
  deviceLayouts: DeviceLayoutsSchema.optional(),
});

export const getLayoutSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const rows = await db
      .select()
      .from(schema.layoutSettings)
      .where(eq(schema.layoutSettings.familyId, DEFAULT_FAMILY_ID));

    const settings: LayoutSettings = { ...DEFAULT_LAYOUT_SETTINGS };

    for (const row of rows) {
      try {
        switch (row.key) {
          case "autoSwitchEnabled":
            settings.autoSwitchEnabled = row.value === "true";
            break;
          case "timeslotAutoExpand":
            settings.timeslotAutoExpand = row.value === "true";
            break;
          case "defaultLayout":
            if (LAYOUT_IDS.includes(row.value as (typeof LAYOUT_IDS)[number])) {
              settings.defaultLayout = row.value as (typeof LAYOUT_IDS)[number];
            }
            break;
          case "deviceLayouts":
            settings.deviceLayouts = JSON.parse(row.value);
            break;
        }
      } catch {
        // Invalid value, use default
      }
    }

    return settings;
  }
);

export const updateLayoutSettings = createServerFn({ method: "POST" })
  .inputValidator(LayoutSettingsSchema)
  .handler(async ({ data }) => {
    const updates: { key: string; value: string }[] = [];

    if (data.autoSwitchEnabled !== undefined) {
      updates.push({
        key: "autoSwitchEnabled",
        value: String(data.autoSwitchEnabled),
      });
    }
    if (data.timeslotAutoExpand !== undefined) {
      updates.push({
        key: "timeslotAutoExpand",
        value: String(data.timeslotAutoExpand),
      });
    }
    if (data.defaultLayout !== undefined) {
      updates.push({ key: "defaultLayout", value: data.defaultLayout });
    }
    if (data.deviceLayouts !== undefined) {
      updates.push({
        key: "deviceLayouts",
        value: JSON.stringify(data.deviceLayouts),
      });
    }

    for (const { key, value } of updates) {
      // PostgreSQL upsert using ON CONFLICT
      await db
        .insert(schema.layoutSettings)
        .values({
          familyId: DEFAULT_FAMILY_ID,
          key,
          value,
        })
        .onConflictDoUpdate({
          target: [schema.layoutSettings.familyId, schema.layoutSettings.key],
          set: {
            value,
            updatedAt: new Date(),
          },
        });
    }

    return getLayoutSettings();
  });

// Re-export type for backwards compatibility
export type { LayoutSetting } from "../db/schema";
