import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { families } from "./families";
import { adminUsers } from "./auth";

// Audit action types
export const auditActionEnum = ["create", "update", "delete"] as const;
export type AuditAction = (typeof auditActionEnum)[number];

// Entity types that can be audited
export const auditEntityEnum = [
  "member",
  "timeslot",
  "todo",
  "todo_completion",
  "reward",
  "achievement",
  "family",
  "user",
  "settings",
] as const;
export type AuditEntityType = (typeof auditEntityEnum)[number];

// Audit logs table
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id").references(() => families.id, {
      onDelete: "cascade",
    }),
    userId: integer("user_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull().$type<AuditAction>(),
    entityType: text("entity_type").notNull().$type<AuditEntityType>(),
    entityId: integer("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_family").on(table.familyId),
    index("idx_audit_logs_user").on(table.userId),
    index("idx_audit_logs_entity").on(table.entityType, table.entityId),
    index("idx_audit_logs_created").on(table.createdAt),
    index("idx_audit_logs_action").on(table.action),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
