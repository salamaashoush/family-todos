import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "../db";
import { getTenantContext } from "../utils/tenant";
import { generateSecureToken } from "./crypto";
import { sendMemberInviteEmail } from "../utils/email";
import { hashPassword } from "../utils/password";
import { useAppSession } from "../utils/session";
import type { UserRole } from "../db/schema/auth";

const INVITE_EXPIRY_HOURS = 72; // 3 days

// Send invite to promote a member to admin
const SendMemberInviteSchema = z.object({
  memberId: z.number(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member"]).default("admin"),
});

export const sendMemberInvite = createServerFn({ method: "POST" })
  .inputValidator(SendMemberInviteSchema)
  .handler(async ({ data }) => {
    const { familyId, role: currentUserRole } = await getTenantContext();

    // Only owners and admins can invite
    if (currentUserRole !== "owner" && currentUserRole !== "admin") {
      throw new Error("You don't have permission to invite members");
    }

    // Verify member exists and belongs to this family
    const [member] = await db
      .select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found");
    }

    // Check if member already has a linked user
    if (member.linkedUserId) {
      throw new Error("This member already has an account linked");
    }

    // Check if email is already used by another user in this family
    const [existingUser] = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .innerJoin(
        schema.userFamilies,
        eq(schema.adminUsers.id, schema.userFamilies.userId)
      )
      .where(
        and(
          eq(schema.adminUsers.email, data.email),
          eq(schema.userFamilies.familyId, familyId)
        )
      )
      .limit(1);

    if (existingUser) {
      throw new Error("This email is already associated with a family member");
    }

    // Delete any existing invite for this member
    await db
      .delete(schema.memberInviteTokens)
      .where(eq(schema.memberInviteTokens.memberId, data.memberId));

    // Generate invite token
    const token = generateSecureToken(32);
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // Get family name for the email
    const [family] = await db
      .select({ name: schema.families.name })
      .from(schema.families)
      .where(eq(schema.families.id, familyId))
      .limit(1);

    // Save invite token
    await db.insert(schema.memberInviteTokens).values({
      memberId: data.memberId,
      familyId,
      email: data.email,
      token,
      role: data.role,
      expiresAt,
    });

    // Send invite email
    await sendMemberInviteEmail(
      data.email,
      token,
      member.name,
      family?.name || "your family"
    );

    return {
      success: true,
      message: `Invite sent to ${data.email}`,
    };
  });

// Validate invite token
const ValidateInviteSchema = z.object({
  token: z.string().length(64, "Invalid token"),
});

export const validateMemberInvite = createServerFn({ method: "GET" })
  .inputValidator(ValidateInviteSchema)
  .handler(async ({ data }) => {
    const [invite] = await db
      .select({
        id: schema.memberInviteTokens.id,
        memberId: schema.memberInviteTokens.memberId,
        familyId: schema.memberInviteTokens.familyId,
        email: schema.memberInviteTokens.email,
        role: schema.memberInviteTokens.role,
        expiresAt: schema.memberInviteTokens.expiresAt,
        usedAt: schema.memberInviteTokens.usedAt,
        memberName: schema.members.name,
        familyName: schema.families.name,
      })
      .from(schema.memberInviteTokens)
      .innerJoin(
        schema.members,
        eq(schema.memberInviteTokens.memberId, schema.members.id)
      )
      .innerJoin(
        schema.families,
        eq(schema.memberInviteTokens.familyId, schema.families.id)
      )
      .where(
        and(
          eq(schema.memberInviteTokens.token, data.token),
          gt(schema.memberInviteTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invite || invite.usedAt) {
      return {
        valid: false,
        message: "Invalid or expired invite link.",
      };
    }

    return {
      valid: true,
      email: invite.email,
      memberName: invite.memberName,
      familyName: invite.familyName,
      role: invite.role,
    };
  });

// Accept invite and create account
const AcceptInviteSchema = z.object({
  token: z.string().length(64, "Invalid token"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const acceptMemberInvite = createServerFn({ method: "POST" })
  .inputValidator(AcceptInviteSchema)
  .handler(async ({ data }) => {
    // Find valid invite
    const [invite] = await db
      .select()
      .from(schema.memberInviteTokens)
      .where(
        and(
          eq(schema.memberInviteTokens.token, data.token),
          gt(schema.memberInviteTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invite || invite.usedAt) {
      throw new Error("Invalid or expired invite link. Please request a new one.");
    }

    // Check if username is taken
    const [existingUser] = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.username, data.username))
      .limit(1);

    if (existingUser) {
      throw new Error("Username is already taken");
    }

    // Check if email is taken
    const [existingEmail] = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, invite.email))
      .limit(1);

    if (existingEmail) {
      throw new Error("An account with this email already exists");
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create admin user
    const [newUser] = await db
      .insert(schema.adminUsers)
      .values({
        username: data.username,
        email: invite.email,
        emailVerified: true, // Already verified since they received the invite
        passwordHash,
        accountStatus: "active", // Auto-activate invited users
        activatedAt: new Date(),
      })
      .returning();

    // Link user to family with the invited role
    await db.insert(schema.userFamilies).values({
      userId: newUser.id,
      familyId: invite.familyId,
      role: invite.role as UserRole,
    });

    // Link admin user to member
    await db
      .update(schema.members)
      .set({
        linkedUserId: newUser.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.members.id, invite.memberId));

    // Mark invite as used
    await db
      .update(schema.memberInviteTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.memberInviteTokens.id, invite.id));

    // Create session for the new user
    const session = await useAppSession();
    await session.update({
      isAuthenticated: true,
      adminUserId: newUser.id,
      currentFamilyId: invite.familyId,
      familyIds: [invite.familyId],
      currentFamilyRole: invite.role as UserRole,
    });

    return {
      success: true,
      message: "Account created successfully!",
      familyId: invite.familyId,
    };
  });

// Resend invite
const ResendInviteSchema = z.object({
  memberId: z.number(),
});

export const resendMemberInvite = createServerFn({ method: "POST" })
  .inputValidator(ResendInviteSchema)
  .handler(async ({ data }) => {
    const { familyId, role: currentUserRole } = await getTenantContext();

    // Only owners and admins can resend invites
    if (currentUserRole !== "owner" && currentUserRole !== "admin") {
      throw new Error("You don't have permission to resend invites");
    }

    // Find existing invite
    const [invite] = await db
      .select()
      .from(schema.memberInviteTokens)
      .where(
        and(
          eq(schema.memberInviteTokens.memberId, data.memberId),
          eq(schema.memberInviteTokens.familyId, familyId)
        )
      )
      .limit(1);

    if (!invite) {
      throw new Error("No pending invite found for this member");
    }

    if (invite.usedAt) {
      throw new Error("This invite has already been used");
    }

    // Get member and family info
    const [member] = await db
      .select({ name: schema.members.name })
      .from(schema.members)
      .where(eq(schema.members.id, data.memberId))
      .limit(1);

    const [family] = await db
      .select({ name: schema.families.name })
      .from(schema.families)
      .where(eq(schema.families.id, familyId))
      .limit(1);

    // Generate new token and extend expiry
    const newToken = generateSecureToken(32);
    const newExpiresAt = new Date(
      Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000
    );

    await db
      .update(schema.memberInviteTokens)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
      })
      .where(eq(schema.memberInviteTokens.id, invite.id));

    // Resend email
    await sendMemberInviteEmail(
      invite.email,
      newToken,
      member?.name || "Family Member",
      family?.name || "your family"
    );

    return {
      success: true,
      message: `Invite resent to ${invite.email}`,
    };
  });

// Cancel invite
const CancelInviteSchema = z.object({
  memberId: z.number(),
});

export const cancelMemberInvite = createServerFn({ method: "POST" })
  .inputValidator(CancelInviteSchema)
  .handler(async ({ data }) => {
    const { familyId, role: currentUserRole } = await getTenantContext();

    // Only owners and admins can cancel invites
    if (currentUserRole !== "owner" && currentUserRole !== "admin") {
      throw new Error("You don't have permission to cancel invites");
    }

    await db
      .delete(schema.memberInviteTokens)
      .where(
        and(
          eq(schema.memberInviteTokens.memberId, data.memberId),
          eq(schema.memberInviteTokens.familyId, familyId)
        )
      );

    return {
      success: true,
      message: "Invite cancelled",
    };
  });

// Get pending invite for a member
const GetInviteStatusSchema = z.object({
  memberId: z.number(),
});

export const getMemberInviteStatus = createServerFn({ method: "GET" })
  .inputValidator(GetInviteStatusSchema)
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

    const [invite] = await db
      .select({
        email: schema.memberInviteTokens.email,
        expiresAt: schema.memberInviteTokens.expiresAt,
        usedAt: schema.memberInviteTokens.usedAt,
        createdAt: schema.memberInviteTokens.createdAt,
      })
      .from(schema.memberInviteTokens)
      .where(
        and(
          eq(schema.memberInviteTokens.memberId, data.memberId),
          eq(schema.memberInviteTokens.familyId, familyId)
        )
      )
      .limit(1);

    if (!invite) {
      return { hasPendingInvite: false };
    }

    const isExpired = new Date() > invite.expiresAt;
    const isUsed = !!invite.usedAt;

    return {
      hasPendingInvite: !isExpired && !isUsed,
      email: invite.email,
      expiresAt: invite.expiresAt,
      isExpired,
      isUsed,
    };
  });
