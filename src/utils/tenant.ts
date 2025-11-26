import { useAppSession } from "./session";

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
 * Throws if the user doesn't have one of the allowed roles.
 */
export async function requireRole(
  allowedRoles: Array<"owner" | "admin" | "member">
): Promise<TenantContext> {
  const ctx = await getTenantContext();

  if (!allowedRoles.includes(ctx.role)) {
    throw new Error(`Requires one of roles: ${allowedRoles.join(", ")}`);
  }

  return ctx;
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
