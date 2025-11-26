import { db, schema } from "../db";
import type { AuditAction, AuditEntityType } from "../db/schema/audit";
import { getRequest } from "@tanstack/react-start/server";

type AuditLogParams = {
  familyId?: number;
  userId?: number;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
};

/**
 * Log an audit event for tracking changes to entities.
 * This function is designed to be non-blocking and fail silently
 * to avoid disrupting the main operation.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    // Try to get request info for IP and user agent
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    try {
      const request = getRequest();
      if (request) {
        // Get IP from various headers (behind proxy) or direct
        ipAddress =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          null;
        userAgent = request.headers.get("user-agent") || null;
      }
    } catch {
      // Request context not available, continue without IP/UA
    }

    await db.insert(schema.auditLogs).values({
      familyId: params.familyId || null,
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      oldValue: params.oldValue || null,
      newValue: params.newValue || null,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Log to console but don't throw - audit logging should never break main operations
    console.error("[Audit] Failed to log audit event:", error);
  }
}

/**
 * Helper to create a sanitized copy of an entity for audit logging.
 * Removes sensitive fields and circular references.
 */
export function sanitizeForAudit<T extends Record<string, unknown>>(
  entity: T,
  excludeFields: string[] = []
): Record<string, unknown> {
  const defaultExclude = ["passwordHash", "password", "token"];
  const allExclude = [...defaultExclude, ...excludeFields];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entity)) {
    if (allExclude.includes(key)) {
      continue;
    }

    // Handle Date objects
    if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    }
    // Handle primitives and arrays
    else if (
      value === null ||
      value === undefined ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      sanitized[key] = value;
    }
    // Skip complex objects to avoid circular refs
  }

  return sanitized;
}

/**
 * Log a create action
 */
export async function logCreate(
  params: Omit<AuditLogParams, "action" | "oldValue"> & {
    newValue: Record<string, unknown>;
  }
): Promise<void> {
  return logAudit({
    ...params,
    action: "create",
    oldValue: null,
  });
}

/**
 * Log an update action
 */
export async function logUpdate(
  params: Omit<AuditLogParams, "action">
): Promise<void> {
  return logAudit({
    ...params,
    action: "update",
  });
}

/**
 * Log a delete action
 */
export async function logDelete(
  params: Omit<AuditLogParams, "action" | "newValue"> & {
    oldValue: Record<string, unknown>;
  }
): Promise<void> {
  return logAudit({
    ...params,
    action: "delete",
    newValue: null,
  });
}
