import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { families } from "./families";

// Account status enum
export const accountStatusEnum = ["pending", "active", "suspended", "rejected"] as const;
export type AccountStatus = (typeof accountStatusEnum)[number];

// Admin users (for authentication)
export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 100 }).notNull().unique(),
    email: varchar("email", { length: 320 }).unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    passwordHash: text("password_hash").notNull(),
    // Super admin flag - only super admins can access the internal dashboard
    isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
    // Flag to indicate if this is the default admin that needs password change
    isDefaultAdmin: boolean("is_default_admin").default(false).notNull(),
    // Track when password was last changed
    passwordChangedAt: timestamp("password_changed_at"),
    // Account status for approval workflow
    accountStatus: varchar("account_status", { length: 20 })
      .default("pending")
      .notNull()
      .$type<AccountStatus>(),
    // Notes from super admin (e.g., rejection reason)
    adminNotes: text("admin_notes"),
    // When account was activated/approved
    activatedAt: timestamp("activated_at"),
    // Who activated the account (super admin user id)
    activatedBy: integer("activated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (table) => [
    index("idx_admin_users_username").on(table.username),
    index("idx_admin_users_email").on(table.email),
    index("idx_admin_users_status").on(table.accountStatus),
    index("idx_admin_users_super_admin").on(table.isSuperAdmin),
  ]
);

// User roles for family access
export const userRoleEnum = ["owner", "admin", "member"] as const;
export type UserRole = (typeof userRoleEnum)[number];

// Junction table: user <-> family (multi-tenancy)
export const userFamilies = pgTable(
  "user_families",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 })
      .default("admin")
      .notNull()
      .$type<UserRole>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_user_family_unique").on(table.userId, table.familyId),
    index("idx_user_families_user").on(table.userId),
    index("idx_user_families_family").on(table.familyId),
  ]
);

// Password reset tokens
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_password_reset_tokens_token").on(table.token),
    index("idx_password_reset_tokens_user").on(table.userId),
  ]
);

// Email verification tokens
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_email_verification_tokens_token").on(table.token),
    index("idx_email_verification_tokens_user").on(table.userId),
  ]
);

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type UserFamily = typeof userFamilies.$inferSelect;
export type NewUserFamily = typeof userFamilies.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
