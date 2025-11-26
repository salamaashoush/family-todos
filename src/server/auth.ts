import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useAppSession } from "~/utils/session";
import { db } from "../db/schema";
import type { AdminUser } from "../db/types";
import { verifyPassword } from "../utils/password";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    const adminUser = db
      .query<
        AdminUser,
        [string]
      >("SELECT * FROM admin_users WHERE username = ?")
      .get(data.username);

    if (!adminUser) {
      // Use constant-time comparison behavior by still verifying
      // against a dummy hash to prevent timing attacks
      await verifyPassword(
        data.password,
        "$argon2id$v=19$m=65536,t=3,p=4$dummy"
      );
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(
      data.password,
      adminUser.password_hash
    );
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login timestamp
    db.run(
      "UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
      [adminUser.id]
    );

    const session = await useAppSession();
    await session.update({
      username: adminUser.username,
      adminUserId: adminUser.id,
      isAuthenticated: true,
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
    };
  }

  return { authenticated: false };
});
