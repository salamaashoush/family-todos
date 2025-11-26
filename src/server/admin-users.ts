import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../db/schema";
import type { AdminUser } from "../db/types";
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

    const adminUser = db
      .query<AdminUser, [number]>("SELECT * FROM admin_users WHERE id = ?")
      .get(session.data.adminUserId);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    const isValid = await verifyPassword(
      data.currentPassword,
      adminUser.password_hash
    );
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await hashPassword(data.newPassword);
    db.run(
      "UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newHash, adminUser.id]
    );

    return { success: true };
  });

export const getAdminProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    const adminUser = db
      .query<AdminUser, [number]>("SELECT * FROM admin_users WHERE id = ?")
      .get(session.data.adminUserId);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    return {
      id: adminUser.id,
      username: adminUser.username,
      createdAt: adminUser.created_at,
      lastLoginAt: adminUser.last_login_at,
    };
  }
);

export const getAdminUsers = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    const adminUsers = db
      .query<AdminUser, []>(
        "SELECT * FROM admin_users ORDER BY created_at ASC"
      )
      .all();

    return adminUsers.map((u) => ({
      id: u.id,
      username: u.username,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    }));
  }
);

const CreateAdminUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
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

    const existing = db
      .query<AdminUser, [string]>(
        "SELECT * FROM admin_users WHERE username = ?"
      )
      .get(data.username);

    if (existing) {
      throw new Error("Username already exists");
    }

    const passwordHash = await hashPassword(data.password);
    const result = db.run(
      "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
      [data.username, passwordHash]
    );

    return { id: result.lastInsertRowid as number, success: true };
  });

const UpdateAdminUserSchema = z.object({
  id: z.number(),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

export const updateAdminUser = createServerFn({ method: "POST" })
  .inputValidator(UpdateAdminUserSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession();

    if (!session.data.isAuthenticated || !session.data.adminUserId) {
      throw new Error("Not authenticated");
    }

    const adminUser = db
      .query<AdminUser, [number]>("SELECT * FROM admin_users WHERE id = ?")
      .get(data.id);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    if (data.username !== adminUser.username) {
      const existing = db
        .query<AdminUser, [string]>(
          "SELECT * FROM admin_users WHERE username = ?"
        )
        .get(data.username);
      if (existing && existing.id !== data.id) {
        throw new Error("Username already exists");
      }
    }

    db.run(
      "UPDATE admin_users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [data.username, data.id]
    );

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

    const count = db
      .query<{ count: number }, []>("SELECT COUNT(*) as count FROM admin_users")
      .get();
    if (count && count.count <= 1) {
      throw new Error("Cannot delete the last admin user");
    }

    db.run("DELETE FROM admin_users WHERE id = ?", [data.id]);
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

    const adminUser = db
      .query<AdminUser, [number]>("SELECT * FROM admin_users WHERE id = ?")
      .get(data.id);

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    const newHash = await hashPassword(data.newPassword);
    db.run(
      "UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newHash, data.id]
    );

    return { success: true };
  });
