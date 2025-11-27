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
    // Link to admin user account (null if member doesn't have login access)
    linkedUserId: integer("linked_user_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_members_family").on(table.familyId),
    index("idx_members_linked_user").on(table.linkedUserId),
  ]
);

// Member invite tokens for promoting members to admins
export const memberInviteTokens = pgTable(
  "member_invite_tokens",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    role: varchar("role", { length: 20 }).default("admin").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_member_invite_token").on(table.token),
    index("idx_member_invite_member").on(table.memberId),
    uniqueIndex("idx_member_invite_email_family").on(table.email, table.familyId),
  ]
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type MemberInviteToken = typeof memberInviteTokens.$inferSelect;
