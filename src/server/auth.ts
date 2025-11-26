import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import { verifyPassword } from "../utils/password";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    const [adminUser] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, data.username))
      .limit(1);

    if (!adminUser) {
      // Use constant-time comparison behavior by still verifying
      // against a dummy hash to prevent timing attacks
      await verifyPassword(
        data.password,
        "$argon2id$v=19$m=65536,t=3,p=4$dummy"
      );
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(data.password, adminUser.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

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

// Re-export AdminUser type for backwards compatibility
export type { AdminUser } from "../db/schema";
