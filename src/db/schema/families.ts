import {
  pgTable,
  serial,
  boolean,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export const families = pgTable(
  "families",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).unique(),
    // Secure share token for public family board access (kids view)
    shareToken: varchar("share_token", { length: 64 }).unique(),
    subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"),
    isOnboarded: boolean("is_onboarded").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_families_share_token").on(table.shareToken)]
);

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
