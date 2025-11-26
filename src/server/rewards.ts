import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db, schema } from "../db";
import type { RedemptionStatus, TransactionType } from "../db/schema";
import { getTenantContext, requireRole } from "../utils/tenant";
import { logCreate, logUpdate, logDelete, sanitizeForAudit } from "../utils/audit";
import { broadcastToFamily } from "./realtime";

// Get all rewards
export const getRewards = createServerFn({ method: "GET" }).handler(async () => {
  const { familyId } = await getTenantContext();

  return db
    .select()
    .from(schema.rewards)
    .where(eq(schema.rewards.familyId, familyId))
    .orderBy(asc(schema.rewards.pointCost));
});

// Get active rewards only
export const getActiveRewards = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await getTenantContext();

    return db
      .select()
      .from(schema.rewards)
      .where(
        and(
          eq(schema.rewards.familyId, familyId),
          eq(schema.rewards.isActive, true)
        )
      )
      .orderBy(asc(schema.rewards.pointCost));
  }
);

// Create reward
const CreateRewardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  pointCost: z.number().min(1),
});

export const createReward = createServerFn({ method: "POST" })
  .inputValidator(CreateRewardSchema)
  .handler(async ({ data }) => {
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    const [reward] = await db
      .insert(schema.rewards)
      .values({
        familyId,
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        pointCost: data.pointCost,
      })
      .returning();

    // Audit log
    logCreate({
      familyId,
      userId,
      entityType: "reward",
      entityId: reward.id,
      newValue: sanitizeForAudit(reward),
    });

    // Broadcast real-time update
    broadcastToFamily(familyId, {
      type: "data_refresh",
      timestamp: Date.now(),
      data: { entity: "rewards", action: "created", entityId: reward.id },
    });

    return reward;
  });

// Update reward
const UpdateRewardSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  pointCost: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateReward = createServerFn({ method: "POST" })
  .inputValidator(UpdateRewardSchema)
  .handler(async ({ data }) => {
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    // Get old value for audit
    const [oldReward] = await db
      .select()
      .from(schema.rewards)
      .where(
        and(
          eq(schema.rewards.id, data.id),
          eq(schema.rewards.familyId, familyId)
        )
      )
      .limit(1);

    const updateData: Partial<{
      name: string;
      description: string | null;
      icon: string | null;
      pointCost: number;
      isActive: boolean;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.pointCost !== undefined) updateData.pointCost = data.pointCost;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [reward] = await db
      .update(schema.rewards)
      .set(updateData)
      .where(
        and(
          eq(schema.rewards.id, data.id),
          eq(schema.rewards.familyId, familyId)
        )
      )
      .returning();

    // Audit log
    if (reward && oldReward) {
      logUpdate({
        familyId,
        userId,
        entityType: "reward",
        entityId: reward.id,
        oldValue: sanitizeForAudit(oldReward),
        newValue: sanitizeForAudit(reward),
      });

      // Broadcast real-time update
      broadcastToFamily(familyId, {
        type: "data_refresh",
        timestamp: Date.now(),
        data: { entity: "rewards", action: "updated", entityId: reward.id },
      });
    }

    return reward;
  });

// Delete reward
const DeleteRewardSchema = z.object({
  id: z.number(),
});

export const deleteReward = createServerFn({ method: "POST" })
  .inputValidator(DeleteRewardSchema)
  .handler(async ({ data }) => {
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    // Get old value for audit before deleting
    const [oldReward] = await db
      .select()
      .from(schema.rewards)
      .where(
        and(
          eq(schema.rewards.id, data.id),
          eq(schema.rewards.familyId, familyId)
        )
      )
      .limit(1);

    await db
      .delete(schema.rewards)
      .where(
        and(
          eq(schema.rewards.id, data.id),
          eq(schema.rewards.familyId, familyId)
        )
      );

    // Audit log
    if (oldReward) {
      logDelete({
        familyId,
        userId,
        entityType: "reward",
        entityId: data.id,
        oldValue: sanitizeForAudit(oldReward),
      });

      // Broadcast real-time update
      broadcastToFamily(familyId, {
        type: "data_refresh",
        timestamp: Date.now(),
        data: { entity: "rewards", action: "deleted", entityId: data.id },
      });
    }

    return { success: true };
  });

// Get member point balance - REQUIRES tenant context
const GetMemberPointsSchema = z.object({
  memberId: z.number(),
});

export const getMemberPoints = createServerFn({ method: "GET" })
  .inputValidator(GetMemberPointsSchema)
  .handler(async ({ data }) => {
    // SECURITY: Verify member belongs to user's family
    const { familyId } = await getTenantContext();

    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found or access denied");
    }

    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.pointTransactions.amount}), 0)` })
      .from(schema.pointTransactions)
      .where(eq(schema.pointTransactions.memberId, data.memberId));

    return result?.total || 0;
  });

// Get all member points for current family only (for leaderboard/overview)
export const getAllMemberPoints = createServerFn({ method: "GET" }).handler(
  async () => {
    // SECURITY: Only return points for members in the current family
    const { familyId } = await getTenantContext();

    // Get members for this family first
    const familyMembers = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, familyId));

    const memberIds = familyMembers.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // Only get transactions for family members
    const results = await db
      .select({
        memberId: schema.pointTransactions.memberId,
        total: sql<number>`COALESCE(SUM(${schema.pointTransactions.amount}), 0)`,
      })
      .from(schema.pointTransactions)
      .groupBy(schema.pointTransactions.memberId);

    // Filter to only family members
    return results
      .filter((r) => memberIds.includes(r.memberId))
      .map((r) => ({
        member_id: r.memberId,
        total: r.total,
      }));
  }
);

// Get point transactions for a member - REQUIRES tenant context
const GetTransactionsSchema = z.object({
  memberId: z.number(),
  limit: z.number().optional(),
});

export const getMemberTransactions = createServerFn({ method: "GET" })
  .inputValidator(GetTransactionsSchema)
  .handler(async ({ data }) => {
    // SECURITY: Verify member belongs to user's family
    const { familyId } = await getTenantContext();

    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found or access denied");
    }

    const limit = data.limit || 50;

    return db
      .select()
      .from(schema.pointTransactions)
      .where(eq(schema.pointTransactions.memberId, data.memberId))
      .orderBy(desc(schema.pointTransactions.createdAt))
      .limit(limit);
  });

// Award points (when task is completed)
const AwardPointsSchema = z.object({
  memberId: z.number(),
  amount: z.number(),
  description: z.string(),
  todoId: z.number().optional(),
});

export const awardPoints = createServerFn({ method: "POST" })
  .inputValidator(AwardPointsSchema)
  .handler(async ({ data }) => {
    const [transaction] = await db
      .insert(schema.pointTransactions)
      .values({
        memberId: data.memberId,
        amount: data.amount,
        type: "earned" as TransactionType,
        description: data.description,
        todoId: data.todoId || null,
      })
      .returning();

    return transaction;
  });

// Deduct points (for redemption - internal use)
const DeductPointsSchema = z.object({
  memberId: z.number(),
  amount: z.number(),
  description: z.string(),
  rewardId: z.number().optional(),
});

export const deductPoints = createServerFn({ method: "POST" })
  .inputValidator(DeductPointsSchema)
  .handler(async ({ data }) => {
    // Amount should be negative for deductions
    const [transaction] = await db
      .insert(schema.pointTransactions)
      .values({
        memberId: data.memberId,
        amount: -Math.abs(data.amount),
        type: "redeemed" as TransactionType,
        description: data.description,
        rewardId: data.rewardId || null,
      })
      .returning();

    return transaction;
  });

// Request reward redemption
const RequestRedemptionSchema = z.object({
  memberId: z.number(),
  rewardId: z.number(),
});

export const requestRedemption = createServerFn({ method: "POST" })
  .inputValidator(RequestRedemptionSchema)
  .handler(async ({ data }) => {
    // Get reward details
    const [reward] = await db
      .select()
      .from(schema.rewards)
      .where(eq(schema.rewards.id, data.rewardId))
      .limit(1);

    if (!reward) {
      throw new Error("Reward not found");
    }
    if (!reward.isActive) {
      throw new Error("Reward is not available");
    }

    // Check member has enough points
    const [balance] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.pointTransactions.amount}), 0)` })
      .from(schema.pointTransactions)
      .where(eq(schema.pointTransactions.memberId, data.memberId));

    if ((balance?.total || 0) < reward.pointCost) {
      throw new Error("Insufficient points");
    }

    // Create redemption request
    const [redemption] = await db
      .insert(schema.rewardRedemptions)
      .values({
        memberId: data.memberId,
        rewardId: data.rewardId,
        pointsSpent: reward.pointCost,
        status: "pending" as RedemptionStatus,
      })
      .returning();

    return redemption;
  });

// Get pending redemptions (for admin) - REQUIRES owner/admin role
export const getPendingRedemptions = createServerFn({ method: "GET" }).handler(
  async () => {
    // SECURITY: Require owner/admin role and filter by family
    const { familyId } = await requireRole(["owner", "admin"]);

    const redemptions = await db
      .select({
        id: schema.rewardRedemptions.id,
        memberId: schema.rewardRedemptions.memberId,
        rewardId: schema.rewardRedemptions.rewardId,
        pointsSpent: schema.rewardRedemptions.pointsSpent,
        status: schema.rewardRedemptions.status,
        requestedAt: schema.rewardRedemptions.requestedAt,
        processedAt: schema.rewardRedemptions.processedAt,
        processedBy: schema.rewardRedemptions.processedBy,
        notes: schema.rewardRedemptions.notes,
        memberName: schema.members.name,
        rewardName: schema.rewards.name,
      })
      .from(schema.rewardRedemptions)
      .innerJoin(schema.members, eq(schema.rewardRedemptions.memberId, schema.members.id))
      .innerJoin(schema.rewards, eq(schema.rewardRedemptions.rewardId, schema.rewards.id))
      .where(
        and(
          eq(schema.rewardRedemptions.status, "pending"),
          eq(schema.members.familyId, familyId) // SECURITY: Filter by family
        )
      )
      .orderBy(asc(schema.rewardRedemptions.requestedAt));

    return redemptions.map((r) => ({
      ...r,
      member_name: r.memberName,
      reward_name: r.rewardName,
    }));
  }
);

// Get all redemptions for a member - REQUIRES tenant context
const GetMemberRedemptionsSchema = z.object({
  memberId: z.number(),
});

export const getMemberRedemptions = createServerFn({ method: "GET" })
  .inputValidator(GetMemberRedemptionsSchema)
  .handler(async ({ data }) => {
    // SECURITY: Verify member belongs to user's family
    const { familyId } = await getTenantContext();

    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, familyId)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found or access denied");
    }

    const redemptions = await db
      .select({
        id: schema.rewardRedemptions.id,
        memberId: schema.rewardRedemptions.memberId,
        rewardId: schema.rewardRedemptions.rewardId,
        pointsSpent: schema.rewardRedemptions.pointsSpent,
        status: schema.rewardRedemptions.status,
        requestedAt: schema.rewardRedemptions.requestedAt,
        processedAt: schema.rewardRedemptions.processedAt,
        notes: schema.rewardRedemptions.notes,
        rewardName: schema.rewards.name,
        rewardIcon: schema.rewards.icon,
      })
      .from(schema.rewardRedemptions)
      .innerJoin(schema.rewards, eq(schema.rewardRedemptions.rewardId, schema.rewards.id))
      .where(eq(schema.rewardRedemptions.memberId, data.memberId))
      .orderBy(desc(schema.rewardRedemptions.requestedAt));

    return redemptions.map((r) => ({
      ...r,
      reward_name: r.rewardName,
      reward_icon: r.rewardIcon,
    }));
  });

// Process redemption (approve/reject/fulfill) - REQUIRES owner/admin role
const ProcessRedemptionSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected", "fulfilled"]),
  notes: z.string().optional(),
});

export const processRedemption = createServerFn({ method: "POST" })
  .inputValidator(ProcessRedemptionSchema)
  .handler(async ({ data }) => {
    // SECURITY: Require owner/admin role and get user ID from session
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    // Get redemption with family verification via member
    const [redemption] = await db
      .select({
        id: schema.rewardRedemptions.id,
        memberId: schema.rewardRedemptions.memberId,
        rewardId: schema.rewardRedemptions.rewardId,
        pointsSpent: schema.rewardRedemptions.pointsSpent,
        status: schema.rewardRedemptions.status,
        memberFamilyId: schema.members.familyId,
      })
      .from(schema.rewardRedemptions)
      .innerJoin(schema.members, eq(schema.rewardRedemptions.memberId, schema.members.id))
      .where(eq(schema.rewardRedemptions.id, data.id))
      .limit(1);

    if (!redemption) {
      throw new Error("Redemption not found");
    }

    // SECURITY: Verify redemption belongs to user's family
    if (redemption.memberFamilyId !== familyId) {
      throw new Error("Access denied");
    }

    if (redemption.status !== "pending" && redemption.status !== "approved") {
      throw new Error("Redemption cannot be processed");
    }

    // Get reward for description
    const [reward] = await db
      .select()
      .from(schema.rewards)
      .where(eq(schema.rewards.id, redemption.rewardId))
      .limit(1);

    // If approving or fulfilling, deduct points
    if (
      (data.status === "approved" || data.status === "fulfilled") &&
      redemption.status === "pending"
    ) {
      await db.insert(schema.pointTransactions).values({
        memberId: redemption.memberId,
        amount: -redemption.pointsSpent,
        type: "redeemed" as TransactionType,
        description: `Redeemed: ${reward?.name || "Unknown reward"}`,
        rewardId: redemption.rewardId,
      });
    }

    // If rejecting after approval, refund points
    if (data.status === "rejected" && redemption.status === "approved") {
      await db.insert(schema.pointTransactions).values({
        memberId: redemption.memberId,
        amount: redemption.pointsSpent,
        type: "adjustment" as TransactionType,
        description: `Refund: ${reward?.name || "Unknown reward"} (rejected)`,
        rewardId: redemption.rewardId,
      });
    }

    // SECURITY: Use userId from session, not from client input
    const [updated] = await db
      .update(schema.rewardRedemptions)
      .set({
        status: data.status as RedemptionStatus,
        processedAt: new Date(),
        processedBy: userId, // Use authenticated user ID, not client-provided
        notes: data.notes || null,
      })
      .where(eq(schema.rewardRedemptions.id, data.id))
      .returning();

    return updated;
  });

// Re-export types for backwards compatibility
export type { Reward, PointTransaction, RewardRedemption } from "../db/schema";
