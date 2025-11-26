import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { families } from "./families";

export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    avatar: text("avatar"),
    isParent: boolean("is_parent").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_members_family").on(table.familyId),
  ]
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
