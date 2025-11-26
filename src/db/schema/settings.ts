import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { families } from "./families";

// Layout settings (key-value store per family)
export const layoutSettings = pgTable(
  "layout_settings",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_layout_settings_family_key").on(table.familyId, table.key),
    index("idx_layout_settings_family").on(table.familyId),
  ]
);

export type LayoutSetting = typeof layoutSettings.$inferSelect;
export type NewLayoutSetting = typeof layoutSettings.$inferInsert;
