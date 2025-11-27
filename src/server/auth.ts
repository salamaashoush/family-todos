import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, sql, ilike } from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import { verifyPassword } from "../utils/password";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
} from "../utils/rateLimiter";
import { randomDelay } from "../utils/security";
import { log } from "../utils/logger";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    log.info("Login attempt", { username: data.username });

    // Check rate limit using username as identifier
    const rateLimit = checkLoginRateLimit(data.username);
    if (!rateLimit.allowed) {
      log.warn("Login rate limited", { username: data.username, retryAfter: rateLimit.retryAfter });
      // Add random delay even for rate-limited requests to prevent timing analysis
      await randomDelay(100, 300);
      throw new Error(
        `Too many login attempts. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }

    // Pre-generated dummy hash for timing attack prevention
    // This hash is intentionally hardcoded - it's used when user doesn't exist
    // to ensure consistent timing regardless of user existence
    const DUMMY_HASH =
      "$argon2id$v=19$m=65536,t=3,p=1$+nFsp3W8Yl66PsmlfaJkGHMBgjgk8ldAcgaqf4C2IgQ$exWsCgtJXiGv555e7ihjdY4ylfIVhpU/hxLkgHA5Irk";

    // Case-insensitive username lookup
    const [adminUser] = await db
      .select()
      .from(schema.adminUsers)
      .where(ilike(schema.adminUsers.username, data.username))
      .limit(1);

    // Always perform password verification to ensure constant-time response
    // This prevents timing attacks that could reveal whether a user exists
    const hashToVerify = adminUser?.passwordHash || DUMMY_HASH;
    const isValid = await verifyPassword(data.password, hashToVerify);

    // Add random delay to further obscure timing differences
    // between valid/invalid users and correct/incorrect passwords
    await randomDelay(50, 150);

    if (!adminUser || !isValid) {
      log.warn("Login failed", { username: data.username, userExists: !!adminUser });
      recordFailedLogin(data.username);
      throw new Error("Invalid credentials");
    }

    // Clear rate limit on successful login
    clearLoginRateLimit(data.username);
    log.info("Login successful", { username: data.username, userId: adminUser.id });

    // Update last login timestamp
    await db
      .update(schema.adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.adminUsers.id, adminUser.id));

    // Get user's families for session
    const userFamilies = await db
      .select({
        familyId: schema.userFamilies.familyId,
        role: schema.userFamilies.role,
      })
      .from(schema.userFamilies)
      .where(eq(schema.userFamilies.userId, adminUser.id));

    const familyIds = userFamilies.map((uf) => uf.familyId);
    const currentFamilyId = familyIds.length > 0 ? familyIds[0] : undefined;
    const currentFamilyRole = userFamilies.find(
      (uf) => uf.familyId === currentFamilyId
    )?.role;

    const session = await useAppSession();
    await session.update({
      username: adminUser.username,
      adminUserId: adminUser.id,
      isAuthenticated: true,
      familyIds,
      currentFamilyId,
      currentFamilyRole,
    });

    return { success: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useAppSession();
  await session.clear();
  return { success: true };
});

export const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useAppSession();

  if (
    session.data.isAuthenticated &&
    session.data.username &&
    session.data.adminUserId
  ) {
    return {
      authenticated: true,
      username: session.data.username,
      adminUserId: session.data.adminUserId,
      currentFamilyId: session.data.currentFamilyId,
      familyIds: session.data.familyIds,
    };
  }

  return { authenticated: false };
});

// Get account status for authenticated user (used by route loaders)
export const getAccountStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (
      !session.data.isAuthenticated ||
      !session.data.username ||
      !session.data.adminUserId
    ) {
      return { authenticated: false as const };
    }

    // Get fresh account status from database
    const [user] = await db
      .select({
        accountStatus: schema.adminUsers.accountStatus,
        isSuperAdmin: schema.adminUsers.isSuperAdmin,
        isDefaultAdmin: schema.adminUsers.isDefaultAdmin,
        passwordChangedAt: schema.adminUsers.passwordChangedAt,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, session.data.adminUserId))
      .limit(1);

    if (!user) {
      return { authenticated: false as const };
    }

    // Check if this is a default admin who hasn't changed their password
    // This is a security requirement - default admins MUST change password before accessing the app
    const requiresPasswordChange =
      user.isDefaultAdmin && user.passwordChangedAt === null;

    return {
      authenticated: true as const,
      username: session.data.username,
      adminUserId: session.data.adminUserId,
      accountStatus: user.accountStatus,
      isSuperAdmin: user.isSuperAdmin,
      requiresPasswordChange,
    };
  }
);

// Switch active family
const SwitchFamilySchema = z.object({
  family_id: z.number(),
});

export const switchFamily = createServerFn({ method: "POST" })
  .inputValidator(SwitchFamilySchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to this family
    const familyIds = session.data.familyIds || [];
    if (!familyIds.includes(data.family_id)) {
      throw new Error("Access denied to this family");
    }

    // Get role for new family
    const [userFamily] = await db
      .select({ role: schema.userFamilies.role })
      .from(schema.userFamilies)
      .where(
        sql`${schema.userFamilies.userId} = ${session.data.adminUserId} AND ${schema.userFamilies.familyId} = ${data.family_id}`
      )
      .limit(1);

    await session.update({
      ...session.data,
      currentFamilyId: data.family_id,
      currentFamilyRole: userFamily?.role,
    });

    return { success: true };
  });

// Get user's families with details
export const getUserFamilies = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      return { families: [], currentFamilyId: undefined };
    }

    const familyIds = session.data.familyIds || [];
    if (familyIds.length === 0) {
      return { families: [], currentFamilyId: undefined };
    }

    // Get family details
    const families = await db
      .select({
        id: schema.families.id,
        name: schema.families.name,
        slug: schema.families.slug,
        role: schema.userFamilies.role,
      })
      .from(schema.families)
      .innerJoin(
        schema.userFamilies,
        eq(schema.families.id, schema.userFamilies.familyId)
      )
      .where(eq(schema.userFamilies.userId, session.data.adminUserId));

    return {
      families,
      currentFamilyId: session.data.currentFamilyId,
    };
  }
);

// Get current family's share token for authenticated user (any role)
export const getCurrentFamilyShareToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.currentFamilyId) {
      return { shareToken: null };
    }

    // Verify user has access to this family
    const familyIds = session.data.familyIds || [];
    if (!familyIds.includes(session.data.currentFamilyId)) {
      return { shareToken: null };
    }

    const [family] = await db
      .select({ shareToken: schema.families.shareToken })
      .from(schema.families)
      .where(eq(schema.families.id, session.data.currentFamilyId))
      .limit(1);

    return { shareToken: family?.shareToken || null };
  }
);

// Re-export AdminUser type for backwards compatibility
export type { AdminUser } from "../db/schema";
