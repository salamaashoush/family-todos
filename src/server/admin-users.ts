import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, asc, count, and } from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import { hashPassword, verifyPassword } from "../utils/password";

// Helper to get current tenant context and verify owner role
async function requireFamilyOwner() {
  const session = await useAppSession();

  if (!session.data.isAuthenticated || !session.data.adminUserId) {
    throw new Error("Not authenticated");
  }

  if (!session.data.currentFamilyId) {
    throw new Error("No family selected");
  }

  // Check if the user is an owner of the current family
  if (session.data.currentFamilyRole !== "owner") {
    throw new Error("Only family owners can manage admin users");
  }

  return {
    userId: session.data.adminUserId,
    familyId: session.data.currentFamilyId,
    role: session.data.currentFamilyRole,
  };
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      "Password must contain at least one special character"
    ),
});

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator(ChangePasswordSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    const [adminUser] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, session.data.adminUserId))
      .limit(1);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    const isValid = await verifyPassword(
      data.currentPassword,
      adminUser.passwordHash
    );
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await hashPassword(data.newPassword);

    await db
      .update(schema.adminUsers)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
        // Clear the default admin flag when password is changed
        isDefaultAdmin: false,
      })
      .where(eq(schema.adminUsers.id, adminUser.id));

    return { success: true };
  });

export const getAdminProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    const [adminUser] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, session.data.adminUserId))
      .limit(1);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    return {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      createdAt: adminUser.createdAt,
      lastLoginAt: adminUser.lastLoginAt,
    };
  }
);

// Get admin users for the CURRENT FAMILY only (tenant-isolated)
export const getAdminUsers = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    if (!session.data.currentFamilyId) {
      throw new Error("No family selected");
    }

    const familyId = session.data.currentFamilyId;

    // Get users who belong to this family via userFamilies junction table
    const familyUsers = await db
      .select({
        id: schema.adminUsers.id,
        username: schema.adminUsers.username,
        email: schema.adminUsers.email,
        createdAt: schema.adminUsers.createdAt,
        lastLoginAt: schema.adminUsers.lastLoginAt,
        role: schema.userFamilies.role,
      })
      .from(schema.adminUsers)
      .innerJoin(
        schema.userFamilies,
        eq(schema.adminUsers.id, schema.userFamilies.userId)
      )
      .where(eq(schema.userFamilies.familyId, familyId))
      .orderBy(asc(schema.adminUsers.createdAt));

    return familyUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      role: u.role,
    }));
  }
);

const CreateAdminUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["owner", "admin", "member"]).default("admin"),
});

// Create admin user and add to CURRENT FAMILY (tenant-isolated, owner-only)
export const createAdminUser = createServerFn({ method: "POST" })
  .inputValidator(CreateAdminUserSchema)
  .handler(async ({ data }) => {
    const { familyId } = await requireFamilyOwner();

    // Check for existing username
    const [existingUsername] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, data.username))
      .limit(1);

    if (existingUsername) {
      // Check if user is already in this family
      const [existingInFamily] = await db
        .select()
        .from(schema.userFamilies)
        .where(
          and(
            eq(schema.userFamilies.userId, existingUsername.id),
            eq(schema.userFamilies.familyId, familyId)
          )
        )
        .limit(1);

      if (existingInFamily) {
        throw new Error("This user is already a member of this family");
      }

      // User exists but not in this family - we could add them, but for simplicity
      // require unique usernames for now
      throw new Error("Username already exists");
    }

    // Check for existing email if provided
    if (data.email) {
      const [existingEmail] = await db
        .select()
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.email, data.email))
        .limit(1);

      if (existingEmail) {
        throw new Error("Email already exists");
      }
    }

    const passwordHash = await hashPassword(data.password);

    // Create the user
    const [newUser] = await db
      .insert(schema.adminUsers)
      .values({
        username: data.username,
        email: data.email || null,
        passwordHash,
        accountStatus: "active", // Users created by family owner are active by default
      })
      .returning();

    // Add user to the current family with specified role
    await db.insert(schema.userFamilies).values({
      userId: newUser.id,
      familyId,
      role: data.role || "admin",
    });

    return { id: newUser.id, success: true };
  });

const UpdateAdminUserSchema = z.object({
  id: z.number(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email").optional(),
  role: z.enum(["owner", "admin", "member"]).optional(),
});

// Update admin user (tenant-isolated, owner-only)
export const updateAdminUser = createServerFn({ method: "POST" })
  .inputValidator(UpdateAdminUserSchema)
  .handler(async ({ data }) => {
    const { familyId, userId: currentUserId } = await requireFamilyOwner();

    // Verify the user belongs to this family
    const [userInFamily] = await db
      .select()
      .from(schema.userFamilies)
      .where(
        and(
          eq(schema.userFamilies.userId, data.id),
          eq(schema.userFamilies.familyId, familyId)
        )
      )
      .limit(1);

    if (!userInFamily) {
      throw new Error("User not found in this family");
    }

    const [adminUser] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, data.id))
      .limit(1);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    // Check for duplicate username
    if (data.username !== adminUser.username) {
      const [existing] = await db
        .select()
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.username, data.username))
        .limit(1);

      if (existing && existing.id !== data.id) {
        throw new Error("Username already exists");
      }
    }

    // Update user info
    await db
      .update(schema.adminUsers)
      .set({
        username: data.username,
        email: data.email || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.adminUsers.id, data.id));

    // Update role if provided (but not for self)
    if (data.role && data.id !== currentUserId) {
      await db
        .update(schema.userFamilies)
        .set({ role: data.role })
        .where(
          and(
            eq(schema.userFamilies.userId, data.id),
            eq(schema.userFamilies.familyId, familyId)
          )
        );
    }

    return { success: true };
  });

const DeleteAdminUserSchema = z.object({
  id: z.number(),
});

// Remove user from CURRENT FAMILY (tenant-isolated, owner-only)
// Note: This removes them from the family, not deletes their account entirely
export const deleteAdminUser = createServerFn({ method: "POST" })
  .inputValidator(DeleteAdminUserSchema)
  .handler(async ({ data }) => {
    const { familyId, userId: currentUserId } = await requireFamilyOwner();

    if (currentUserId === data.id) {
      throw new Error("Cannot remove yourself from the family");
    }

    // Verify the user belongs to this family
    const [userInFamily] = await db
      .select()
      .from(schema.userFamilies)
      .where(
        and(
          eq(schema.userFamilies.userId, data.id),
          eq(schema.userFamilies.familyId, familyId)
        )
      )
      .limit(1);

    if (!userInFamily) {
      throw new Error("User not found in this family");
    }

    // Count owners in this family
    const [ownerCount] = await db
      .select({ count: count() })
      .from(schema.userFamilies)
      .where(
        and(
          eq(schema.userFamilies.familyId, familyId),
          eq(schema.userFamilies.role, "owner")
        )
      );

    // Don't allow removing the last owner
    if (userInFamily.role === "owner" && ownerCount && ownerCount.count <= 1) {
      throw new Error("Cannot remove the last owner of the family");
    }

    // Remove user from this family (not delete the user account)
    await db
      .delete(schema.userFamilies)
      .where(
        and(
          eq(schema.userFamilies.userId, data.id),
          eq(schema.userFamilies.familyId, familyId)
        )
      );

    return { success: true };
  });

const ResetAdminPasswordSchema = z.object({
  id: z.number(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// Reset password for a user in CURRENT FAMILY (tenant-isolated, owner-only)
export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator(ResetAdminPasswordSchema)
  .handler(async ({ data }) => {
    const { familyId } = await requireFamilyOwner();

    // Verify the user belongs to this family
    const [userInFamily] = await db
      .select()
      .from(schema.userFamilies)
      .where(
        and(
          eq(schema.userFamilies.userId, data.id),
          eq(schema.userFamilies.familyId, familyId)
        )
      )
      .limit(1);

    if (!userInFamily) {
      throw new Error("User not found in this family");
    }

    const [adminUser] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, data.id))
      .limit(1);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    const newHash = await hashPassword(data.newPassword);

    await db
      .update(schema.adminUsers)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
        // Clear the default admin flag when password is reset
        isDefaultAdmin: false,
      })
      .where(eq(schema.adminUsers.id, data.id));

    return { success: true };
  });

// Re-export type for backwards compatibility
export type { AdminUser } from "../db/schema";
