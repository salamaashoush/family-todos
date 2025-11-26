import { useAppSession } from "./session";
import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";

export type TenantContext = {
  userId: number;
  familyId: number;
  role: "owner" | "admin" | "member";
};

/**
 * Get the current tenant context from the session.
 * Throws if user is not authenticated or has no family selected.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await useAppSession();

  if (!session.data.isAuthenticated || !session.data.adminUserId) {
    throw new Error("Not authenticated");
  }

  if (!session.data.currentFamilyId) {
    throw new Error("No family selected");
  }

  return {
    userId: session.data.adminUserId,
    familyId: session.data.currentFamilyId,
    role: session.data.currentFamilyRole || "member",
  };
}

/**
 * Get tenant context, but return null instead of throwing if not available.
 * Useful for routes that may or may not require authentication.
 */
export async function getTenantContextOptional(): Promise<TenantContext | null> {
  try {
    return await getTenantContext();
  } catch {
    return null;
  }
}

/**
 * Require a specific role to access a resource.
 * SECURITY: Re-verifies role from database to prevent stale session attacks.
 * Throws if the user doesn't have one of the allowed roles.
 */
export async function requireRole(
  allowedRoles: Array<"owner" | "admin" | "member">
): Promise<TenantContext> {
  const session = await useAppSession();

  if (!session.data.isAuthenticated || !session.data.adminUserId) {
    throw new Error("Not authenticated");
  }

  if (!session.data.currentFamilyId) {
    throw new Error("No family selected");
  }

  // SECURITY: Re-verify role from database instead of trusting session
  // This prevents attacks where a user's role is changed but session still has old role
  const [userFamily] = await db
    .select({ role: schema.userFamilies.role })
    .from(schema.userFamilies)
    .where(
      and(
        eq(schema.userFamilies.userId, session.data.adminUserId),
        eq(schema.userFamilies.familyId, session.data.currentFamilyId)
      )
    )
    .limit(1);

  // If no membership found, user has been removed from family
  if (!userFamily) {
    throw new Error("Not a member of this family");
  }

  const actualRole = userFamily.role as "owner" | "admin" | "member";

  if (!allowedRoles.includes(actualRole)) {
    throw new Error(`Requires one of roles: ${allowedRoles.join(", ")}`);
  }

  return {
    userId: session.data.adminUserId,
    familyId: session.data.currentFamilyId,
    role: actualRole,
  };
}

/**
 * Check if the current user has owner role for the current family.
 */
export async function isOwner(): Promise<boolean> {
  try {
    const ctx = await getTenantContext();
    return ctx.role === "owner";
  } catch {
    return false;
  }
}

/**
 * Check if the current user can modify resources (owner or admin).
 */
export async function canModify(): Promise<boolean> {
  try {
    const ctx = await getTenantContext();
    return ctx.role === "owner" || ctx.role === "admin";
  } catch {
    return false;
  }
}
