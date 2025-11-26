import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "../db";
import { generateSecureToken } from "./crypto";
import { sendVerificationEmail as sendVerificationEmailUtil } from "../utils/email";

const TOKEN_EXPIRY_HOURS = 24; // Token valid for 24 hours

/**
 * Send verification email to user
 */
export const sendVerificationEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.number() }))
  .handler(async ({ data }) => {
    // Get user
    const [user] = await db
      .select({ id: schema.adminUsers.id, email: schema.adminUsers.email })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, data.userId))
      .limit(1);

    if (!user || !user.email) {
      throw new Error("User not found or no email address");
    }

    // Delete any existing tokens for this user
    await db
      .delete(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.userId, user.id));

    // Generate new token
    const token = generateSecureToken(32);
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // Save token
    await db.insert(schema.emailVerificationTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email via Resend
    await sendVerificationEmailUtil(user.email, token);

    return {
      success: true,
      message: "Verification email sent.",
    };
  });

/**
 * Verify email with token
 */
const VerifyEmailSchema = z.object({
  token: z.string().length(64, "Invalid token"),
});

export const verifyEmail = createServerFn({ method: "POST" })
  .inputValidator(VerifyEmailSchema)
  .handler(async ({ data }) => {
    // Find valid token
    const [tokenRecord] = await db
      .select({
        id: schema.emailVerificationTokens.id,
        userId: schema.emailVerificationTokens.userId,
        expiresAt: schema.emailVerificationTokens.expiresAt,
        usedAt: schema.emailVerificationTokens.usedAt,
      })
      .from(schema.emailVerificationTokens)
      .where(
        and(
          eq(schema.emailVerificationTokens.token, data.token),
          gt(schema.emailVerificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.usedAt) {
      throw new Error("Invalid or expired verification link.");
    }

    // Mark user's email as verified
    await db
      .update(schema.adminUsers)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.adminUsers.id, tokenRecord.userId));

    // Mark token as used
    await db
      .update(schema.emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.emailVerificationTokens.id, tokenRecord.id));

    return { success: true, message: "Email verified successfully." };
  });

/**
 * Check if token is valid (without consuming it)
 */
export const checkVerificationToken = createServerFn({ method: "GET" })
  .inputValidator(VerifyEmailSchema)
  .handler(async ({ data }) => {
    const [tokenRecord] = await db
      .select({
        id: schema.emailVerificationTokens.id,
        expiresAt: schema.emailVerificationTokens.expiresAt,
        usedAt: schema.emailVerificationTokens.usedAt,
      })
      .from(schema.emailVerificationTokens)
      .where(
        and(
          eq(schema.emailVerificationTokens.token, data.token),
          gt(schema.emailVerificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.usedAt) {
      return { valid: false };
    }

    return { valid: true };
  });

/**
 * Resend verification email
 */
export const resendVerificationEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    // Find user by email
    const [user] = await db
      .select({
        id: schema.adminUsers.id,
        email: schema.adminUsers.email,
        emailVerified: schema.adminUsers.emailVerified,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, data.email))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user || user.emailVerified) {
      return {
        success: true,
        message:
          "If your email is registered and unverified, you will receive a verification link.",
      };
    }

    // Delete any existing tokens
    await db
      .delete(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.userId, user.id));

    // Generate new token
    const token = generateSecureToken(32);
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // Save token
    await db.insert(schema.emailVerificationTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email via Resend (use data.email since we queried by it)
    await sendVerificationEmailUtil(data.email, token);

    return {
      success: true,
      message:
        "If your email is registered and unverified, you will receive a verification link.",
    };
  });
