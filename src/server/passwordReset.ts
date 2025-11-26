import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "../db";
import { hashPassword } from "../utils/password";
import crypto from "crypto";

const TOKEN_EXPIRY_HOURS = 1; // Token valid for 1 hour

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Request a password reset
 * In production, this would send an email with the reset link
 */
const RequestResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator(RequestResetSchema)
  .handler(async ({ data }) => {
    // Find user by email
    const [user] = await db
      .select({ id: schema.adminUsers.id, email: schema.adminUsers.email })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, data.email))
      .limit(1);

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return {
        success: true,
        message:
          "If an account with that email exists, you will receive a password reset link.",
      };
    }

    // Delete any existing tokens for this user
    await db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.userId, user.id));

    // Generate new token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Save token
    await db.insert(schema.passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // In production, send email here
    // For now, log the reset URL (remove in production!)
    const resetUrl = `/reset-password?token=${token}`;
    console.log(`[DEV] Password reset URL for ${data.email}: ${resetUrl}`);

    return {
      success: true,
      message:
        "If an account with that email exists, you will receive a password reset link.",
      // Only include token in development for testing
      ...(process.env.NODE_ENV === "development" && { devToken: token }),
    };
  });

/**
 * Validate a password reset token
 */
const ValidateTokenSchema = z.object({
  token: z.string().length(64, "Invalid token"),
});

export const validateResetToken = createServerFn({ method: "GET" })
  .inputValidator(ValidateTokenSchema)
  .handler(async ({ data }) => {
    const [tokenRecord] = await db
      .select({
        id: schema.passwordResetTokens.id,
        userId: schema.passwordResetTokens.userId,
        expiresAt: schema.passwordResetTokens.expiresAt,
        usedAt: schema.passwordResetTokens.usedAt,
      })
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.token, data.token),
          gt(schema.passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.usedAt) {
      return { valid: false, message: "Invalid or expired reset link." };
    }

    return { valid: true };
  });

/**
 * Reset password using token
 */
const ResetPasswordSchema = z.object({
  token: z.string().length(64, "Invalid token"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator(ResetPasswordSchema)
  .handler(async ({ data }) => {
    // Find valid token
    const [tokenRecord] = await db
      .select({
        id: schema.passwordResetTokens.id,
        userId: schema.passwordResetTokens.userId,
        expiresAt: schema.passwordResetTokens.expiresAt,
        usedAt: schema.passwordResetTokens.usedAt,
      })
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.token, data.token),
          gt(schema.passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.usedAt) {
      throw new Error("Invalid or expired reset link. Please request a new one.");
    }

    // Hash new password
    const passwordHash = await hashPassword(data.password);

    // Update user's password
    await db
      .update(schema.adminUsers)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.adminUsers.id, tokenRecord.userId));

    // Mark token as used
    await db
      .update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.passwordResetTokens.id, tokenRecord.id));

    return { success: true, message: "Password has been reset successfully." };
  });
