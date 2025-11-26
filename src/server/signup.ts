import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import { hashPassword } from "../utils/password";
import { sendVerificationEmail } from "./emailVerification";

const SignUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator(SignUpSchema)
  .handler(async ({ data }) => {
    // Check if username or email already exists
    const existing = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(
        or(
          eq(schema.adminUsers.username, data.username),
          eq(schema.adminUsers.email, data.email)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Username or email already exists");
    }

    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(schema.adminUsers)
      .values({
        username: data.username,
        email: data.email,
        passwordHash,
      })
      .returning();

    // Send verification email
    await sendVerificationEmail({ data: { userId: user.id } });

    // Set session - user is authenticated but has no family yet
    const session = await useAppSession();
    await session.update({
      username: user.username,
      adminUserId: user.id,
      isAuthenticated: true,
      familyIds: [],
      currentFamilyId: undefined,
      currentFamilyRole: undefined,
    });

    return { success: true, userId: user.id, emailSent: true };
  });

// Check if username is available
const CheckUsernameSchema = z.object({
  username: z.string().min(1),
});

export const checkUsernameAvailable = createServerFn({ method: "GET" })
  .inputValidator(CheckUsernameSchema)
  .handler(async ({ data }) => {
    const existing = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, data.username))
      .limit(1);

    return { available: existing.length === 0 };
  });

// Check if email is available
const CheckEmailSchema = z.object({
  email: z.string().email(),
});

export const checkEmailAvailable = createServerFn({ method: "GET" })
  .inputValidator(CheckEmailSchema)
  .handler(async ({ data }) => {
    const existing = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, data.email))
      .limit(1);

    return { available: existing.length === 0 };
  });
