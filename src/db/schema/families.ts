import {
  pgTable,
  serial,
  boolean,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"),
  isOnboarded: boolean("is_onboarded").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
