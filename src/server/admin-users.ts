import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, asc, count } from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import { hashPassword, verifyPassword } from "../utils/password";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
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
      .set({ passwordHash: newHash, updatedAt: new Date() })
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

export const getAdminUsers = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    const adminUsers = await db
      .select()
      .from(schema.adminUsers)
      .orderBy(asc(schema.adminUsers.createdAt));

    return adminUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
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
});

export const createAdminUser = createServerFn({ method: "POST" })
  .inputValidator(CreateAdminUserSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    // Check for existing username
    const [existingUsername] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, data.username))
      .limit(1);

    if (existingUsername) {
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

    const [newUser] = await db
      .insert(schema.adminUsers)
      .values({
        username: data.username,
        email: data.email || null,
        passwordHash,
      })
      .returning();

    return { id: newUser.id, success: true };
  });

const UpdateAdminUserSchema = z.object({
  id: z.number(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email").optional(),
});

export const updateAdminUser = createServerFn({ method: "POST" })
  .inputValidator(UpdateAdminUserSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
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

    await db
      .update(schema.adminUsers)
      .set({
        username: data.username,
        email: data.email || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.adminUsers.id, data.id));

    return { success: true };
  });

const DeleteAdminUserSchema = z.object({
  id: z.number(),
});

export const deleteAdminUser = createServerFn({ method: "POST" })
  .inputValidator(DeleteAdminUserSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    if (session.data.adminUserId === data.id) {
      throw new Error("Cannot delete your own admin account");
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.adminUsers);

    if (countResult && countResult.count <= 1) {
      throw new Error("Cannot delete the last admin user");
    }

    await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, data.id));

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

export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator(ResetAdminPasswordSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
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
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(schema.adminUsers.id, data.id));

    return { success: true };
  });

// Re-export type for backwards compatibility
export type { AdminUser } from "../db/schema";
