import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db, schema } from "../db";
import { useAppSession } from "~/utils/session";
import { hashPassword } from "../utils/password";
import { sendVerificationEmail } from "./emailVerification";
import { checkRateLimit, recordAttempt } from "../utils/rateLimiter";
import { getRequest } from "@tanstack/react-start/server";

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

// Helper to get client IP for rate limiting
function getClientIp(): string {
  try {
    const request = getRequest();
    if (request) {
      return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
      );
    }
  } catch {
    // Request context not available
  }
  return "unknown";
}

// Check if username is available
// Rate limited to prevent user enumeration attacks
const CheckUsernameSchema = z.object({
  username: z.string().min(1),
});

export const checkUsernameAvailable = createServerFn({ method: "GET" })
  .inputValidator(CheckUsernameSchema)
  .handler(async ({ data }) => {
    // Rate limit by IP to prevent enumeration
    const clientIp = getClientIp();
    const rateLimit = checkRateLimit("enumeration", clientIp);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }
    recordAttempt("enumeration", clientIp);

    const existing = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, data.username))
      .limit(1);

    return { available: existing.length === 0 };
  });

// Check if email is available
// Rate limited to prevent user enumeration attacks
const CheckEmailSchema = z.object({
  email: z.string().email(),
});

export const checkEmailAvailable = createServerFn({ method: "GET" })
  .inputValidator(CheckEmailSchema)
  .handler(async ({ data }) => {
    // Rate limit by IP to prevent enumeration
    const clientIp = getClientIp();
    const rateLimit = checkRateLimit("enumeration", clientIp);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }
    recordAttempt("enumeration", clientIp);

    const existing = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, data.email))
      .limit(1);

    return { available: existing.length === 0 };
  });
