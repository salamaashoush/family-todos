import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, asc, sql, or } from "drizzle-orm";
import { db, schema } from "../db";
import crypto from "crypto";
import { requireRole } from "../utils/tenant";
import { checkRateLimit, recordAttempt } from "../utils/rateLimiter";
import { isValidShareToken } from "../utils/security";
import { logAudit } from "../utils/audit";
import { broadcastToFamily } from "./realtime";
import { updateStats } from "./statistics";
import { revokeUnqualifiedAchievements } from "./statistics-helpers";

/**
 * Generate a secure share token
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get family data by share token (public access - no auth required)
 */
const GetFamilyByTokenSchema = z.object({
  token: z.string().length(64, "Invalid token"),
});

export const getFamilyByShareToken = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Validate token format before database query
    if (!isValidShareToken(data.token)) {
      return null;
    }

    const [family] = await db
      .select({
        id: schema.families.id,
        name: schema.families.name,
        isOnboarded: schema.families.isOnboarded,
      })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family || !family.isOnboarded) {
      return null;
    }

    return family;
  });

/**
 * Get members for public board (no auth required, uses share token)
 */
export const getPublicMembers = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // First verify the token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    const members = await db
      .select()
      .from(schema.members)
      .where(eq(schema.members.familyId, family.id))
      .orderBy(asc(schema.members.createdAt));

    return members;
  });

/**
 * Get timeslots for public board (no auth required, uses share token)
 */
const GetPublicTimeslotsSchema = z.object({
  token: z.string().length(64),
  date: z.string().optional(),
});

export const getPublicTimeslots = createServerFn({ method: "GET" })
  .inputValidator(GetPublicTimeslotsSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    const timeslots = await db
      .select()
      .from(schema.timeslots)
      .where(
        and(
          eq(schema.timeslots.familyId, family.id),
          eq(schema.timeslots.isActive, true)
        )
      )
      .orderBy(asc(schema.timeslots.startTime));

    // Get member assignments for each timeslot
    const timeslotIds = timeslots.map((t) => t.id);
    const allAssignments =
      timeslotIds.length > 0
        ? await db.select().from(schema.timeslotMembers)
        : [];

    const assignmentsByTimeslot = allAssignments.reduce(
      (acc, assignment) => {
        if (!acc[assignment.timeslotId]) {
          acc[assignment.timeslotId] = [];
        }
        acc[assignment.timeslotId].push(assignment.memberId);
        return acc;
      },
      {} as Record<number, number[]>
    );

    return timeslots.map((timeslot) => ({
      ...timeslot,
      memberIds: assignmentsByTimeslot[timeslot.id] || [],
    }));
  });

/**
 * Get todos for public board (no auth required, uses share token)
 */
export const getPublicTodos = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    const todos = await db
      .select()
      .from(schema.todos)
      .where(eq(schema.todos.familyId, family.id))
      .orderBy(asc(schema.todos.position));

    // Get timeslot assignments
    const todoIds = todos.map((t) => t.id);
    const allAssignments =
      todoIds.length > 0 ? await db.select().from(schema.todoTimeslots) : [];

    const assignmentsByTodo = allAssignments.reduce(
      (acc, assignment) => {
        if (!acc[assignment.todoId]) {
          acc[assignment.todoId] = [];
        }
        acc[assignment.todoId].push(assignment.timeslotId);
        return acc;
      },
      {} as Record<number, number[]>
    );

    return todos.map((todo) => ({
      ...todo,
      timeslotIds: assignmentsByTodo[todo.id] || [],
    }));
  });

/**
 * Get completions for public board (no auth required, uses share token)
 */
const GetPublicCompletionsSchema = z.object({
  token: z.string().length(64),
  date: z.string(),
});

export const getPublicCompletions = createServerFn({ method: "GET" })
  .inputValidator(GetPublicCompletionsSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Get all members for this family to filter completions
    const members = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, family.id));

    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // Get completions for these members on the given date
    const completions = await db
      .select()
      .from(schema.todoCompletions)
      .where(eq(schema.todoCompletions.completionDate, data.date));

    // Filter to only this family's members
    return completions.filter((c) => memberIds.includes(c.memberId));
  });

/**
 * Toggle todo completion (public - uses share token for family verification)
 * Rate limited to prevent abuse
 */
const TogglePublicTodoSchema = z.object({
  token: z.string().length(64),
  todoId: z.number(),
  timeslotId: z.number(),
  memberId: z.number(),
  date: z.string(),
  completed: z.boolean(),
  clientId: z.string().nullish(),
});

/**
 * Check if a date is within the allowed completion window
 * Allowed: today and yesterday only (based on client's provided date)
 * Not allowed: future dates or dates more than 1 day in the past
 *
 * Note: This uses UTC to avoid timezone issues between client and server
 */
function isDateInCompletionWindow(dateString: string): { allowed: boolean; reason?: string } {
  // Get today's date in UTC as YYYY-MM-DD string
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Get yesterday's date in UTC as YYYY-MM-DD string
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Simple string comparison for allowed dates
  if (dateString === todayStr || dateString === yesterdayStr) {
    return { allowed: true };
  }

  // Parse dates for more detailed comparison
  const [targetYear, targetMonth, targetDay] = dateString.split("-").map(Number);
  const targetDate = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay));

  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const diffMs = todayUTC.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Future date
  if (diffDays < 0) {
    return { allowed: false, reason: "Cannot complete tasks for future dates" };
  }

  // More than 1 day in the past
  if (diffDays > 1) {
    return { allowed: false, reason: "Cannot modify tasks more than 1 day in the past" };
  }

  return { allowed: true };
}

export const togglePublicTodo = createServerFn({ method: "POST" })
  .inputValidator(TogglePublicTodoSchema)
  .handler(async ({ data }) => {
    // Validate token format
    if (!isValidShareToken(data.token)) {
      throw new Error("Invalid share token");
    }

    // Validate date is within allowed completion window
    const dateCheck = isDateInCompletionWindow(data.date);
    if (!dateCheck.allowed) {
      throw new Error(dateCheck.reason!);
    }

    // Check rate limit for this token
    const rateLimit = checkRateLimit("publicBoard", data.token);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }

    // Record this attempt
    recordAttempt("publicBoard", data.token);

    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Verify the member belongs to this family
    const [member] = await db
      .select({ id: schema.members.id, name: schema.members.name })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, family.id)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found");
    }

    // Verify the todo belongs to this family
    const [todo] = await db
      .select({ id: schema.todos.id, title: schema.todos.title, points: schema.todos.points })
      .from(schema.todos)
      .where(
        and(
          eq(schema.todos.id, data.todoId),
          eq(schema.todos.familyId, family.id)
        )
      )
      .limit(1);

    if (!todo) {
      throw new Error("Todo not found");
    }

    if (data.completed) {
      // Check if already completed to avoid duplicate processing
      const [existing] = await db
        .select()
        .from(schema.todoCompletions)
        .where(
          and(
            eq(schema.todoCompletions.todoId, data.todoId),
            eq(schema.todoCompletions.timeslotId, data.timeslotId),
            eq(schema.todoCompletions.memberId, data.memberId),
            eq(schema.todoCompletions.completionDate, data.date)
          )
        )
        .limit(1);

      if (!existing) {
        // Add completion
        await db
          .insert(schema.todoCompletions)
          .values({
            todoId: data.todoId,
            timeslotId: data.timeslotId,
            memberId: data.memberId,
            completionDate: data.date,
          })
          .onConflictDoNothing();

        // Award points for completing this task
        if (todo.points > 0) {
          await db.insert(schema.pointTransactions).values({
            memberId: data.memberId,
            amount: todo.points,
            type: "earned",
            description: `Completed: ${todo.title}`,
            todoId: data.todoId,
          });
        }

        // Update statistics and check achievements
        await updateStats({
          data: { memberId: data.memberId, completionDate: data.date },
        });
      }
    } else {
      // Remove completion and check if anything was deleted
      const deleted = await db
        .delete(schema.todoCompletions)
        .where(
          and(
            eq(schema.todoCompletions.todoId, data.todoId),
            eq(schema.todoCompletions.timeslotId, data.timeslotId),
            eq(schema.todoCompletions.memberId, data.memberId),
            eq(schema.todoCompletions.completionDate, data.date)
          )
        )
        .returning();

      if (deleted.length > 0) {
        // Decrement stats
        await db
          .update(schema.memberStats)
          .set({
            totalStars: sql`GREATEST(0, ${schema.memberStats.totalStars} - 1)`,
            totalTasksCompleted: sql`GREATEST(0, ${schema.memberStats.totalTasksCompleted} - 1)`,
            updatedAt: new Date(),
          })
          .where(eq(schema.memberStats.memberId, data.memberId));

        // Remove points for uncompleting this task
        if (todo.points > 0) {
          await db.insert(schema.pointTransactions).values({
            memberId: data.memberId,
            amount: -todo.points,
            type: "adjustment",
            description: `Uncompleted: ${todo.title}`,
            todoId: data.todoId,
          });
        }

        // Revoke achievements that the member no longer qualifies for
        await revokeUnqualifiedAchievements(data.memberId);
      }
    }

    // Audit log for public board mutations
    await logAudit({
      familyId: family.id,
      action: data.completed ? "create" : "delete",
      entityType: "todo_completion",
      entityId: data.todoId,
      newValue: {
        todoId: data.todoId,
        todoTitle: todo.title,
        memberId: data.memberId,
        memberName: member.name,
        date: data.date,
        completed: data.completed,
        source: "public_board",
      },
    });

    // Broadcast real-time update
    broadcastToFamily(family.id, {
      type: data.completed ? "task_completed" : "task_uncompleted",
      sourceClientId: data.clientId ?? undefined,
      memberId: data.memberId,
      memberName: member.name,
      timestamp: Date.now(),
      data: {
        todoId: data.todoId,
        timeslotId: data.timeslotId,
      },
    });

    return { success: true };
  });

/**
 * Get member stats for public board (no auth required, uses share token)
 */
export const getPublicMemberStats = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Get all members for this family
    const members = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, family.id));

    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // Get stats for all members
    const stats = await db
      .select()
      .from(schema.memberStats);

    // Filter to only this family's members
    return stats.filter((s) => memberIds.includes(s.memberId));
  });

/**
 * Regenerate share token (requires auth - admin only)
 * This invalidates all existing share links
 */
export const regenerateShareToken = createServerFn({ method: "POST" }).handler(
  async () => {
    const { familyId, userId } = await requireRole(["owner", "admin"]);

    const newToken = generateShareToken();

    await db
      .update(schema.families)
      .set({
        shareToken: newToken,
        updatedAt: new Date(),
      })
      .where(eq(schema.families.id, familyId));

    // Audit log for share token regeneration (security-sensitive operation)
    await logAudit({
      familyId,
      userId,
      action: "update",
      entityType: "family",
      entityId: familyId,
      oldValue: { shareToken: "[REDACTED - old token invalidated]" },
      newValue: {
        shareToken: "[REDACTED - new token generated]",
        regeneratedAt: new Date().toISOString(),
      },
    });

    return { shareToken: newToken };
  }
);

/**
 * Get current share token (requires auth - admin only)
 */
export const getShareToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await requireRole(["owner", "admin"]);

    const [family] = await db
      .select({ shareToken: schema.families.shareToken })
      .from(schema.families)
      .where(eq(schema.families.id, familyId))
      .limit(1);

    return { shareToken: family?.shareToken || null };
  }
);

/**
 * Get member points for public board (no auth required, uses share token)
 */
export const getPublicMemberPoints = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Get all members for this family
    const members = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.familyId, family.id));

    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      return [];
    }

    // Get point transactions and sum them by member
    const transactions = await db
      .select({
        memberId: schema.pointTransactions.memberId,
        amount: schema.pointTransactions.amount,
      })
      .from(schema.pointTransactions);

    // Filter to only this family's members and aggregate
    const pointsByMember = new Map<number, number>();
    for (const t of transactions) {
      if (memberIds.includes(t.memberId)) {
        pointsByMember.set(
          t.memberId,
          (pointsByMember.get(t.memberId) || 0) + t.amount
        );
      }
    }

    return Array.from(pointsByMember.entries()).map(([member_id, total]) => ({
      member_id,
      total,
    }));
  });

/**
 * Get achievements for a member on public board (no auth required, uses share token)
 */
const GetPublicMemberAchievementsSchema = z.object({
  token: z.string().length(64),
  memberId: z.number(),
});

export const getPublicMemberAchievements = createServerFn({ method: "GET" })
  .inputValidator(GetPublicMemberAchievementsSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Verify member belongs to this family
    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, family.id)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found");
    }

    // Get achievements with earned status
    const achievements = await db
      .select({
        id: schema.achievements.id,
        familyId: schema.achievements.familyId,
        name: schema.achievements.name,
        description: schema.achievements.description,
        icon: schema.achievements.icon,
        requirementType: schema.achievements.requirementType,
        requirementValue: schema.achievements.requirementValue,
        starReward: schema.achievements.starReward,
        isGlobal: schema.achievements.isGlobal,
        createdAt: schema.achievements.createdAt,
        earnedAt: schema.memberAchievements.earnedAt,
      })
      .from(schema.achievements)
      .leftJoin(
        schema.memberAchievements,
        sql`${schema.achievements.id} = ${schema.memberAchievements.achievementId} AND ${schema.memberAchievements.memberId} = ${data.memberId}`
      )
      .where(
        or(
          eq(schema.achievements.isGlobal, true),
          eq(schema.achievements.familyId, family.id)
        )
      )
      .orderBy(asc(schema.achievements.requirementValue));

    return achievements;
  });

/**
 * Get active rewards for public board (no auth required, uses share token)
 */
export const getPublicActiveRewards = createServerFn({ method: "GET" })
  .inputValidator(GetFamilyByTokenSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    const rewards = await db
      .select()
      .from(schema.rewards)
      .where(
        and(
          eq(schema.rewards.familyId, family.id),
          eq(schema.rewards.isActive, true)
        )
      )
      .orderBy(asc(schema.rewards.pointCost));

    return rewards;
  });

/**
 * Get weekly progress for a member on public board (no auth required, uses share token)
 */
const GetPublicWeeklyProgressSchema = z.object({
  token: z.string().length(64),
  memberId: z.number(),
  weekStart: z.string(),
});

export const getPublicWeeklyProgress = createServerFn({ method: "GET" })
  .inputValidator(GetPublicWeeklyProgressSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Verify member belongs to this family
    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, family.id)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found");
    }

    // Get completions for the week
    const weekDays = [];
    const startDate = new Date(data.weekStart);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // Count completions for this date
      const completions = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.todoCompletions)
        .where(
          and(
            eq(schema.todoCompletions.memberId, data.memberId),
            eq(schema.todoCompletions.completionDate, dateStr)
          )
        );

      // Count unique timeslots completed
      const timeslotCompletions = await db
        .selectDistinct({ timeslotId: schema.todoCompletions.timeslotId })
        .from(schema.todoCompletions)
        .where(
          and(
            eq(schema.todoCompletions.memberId, data.memberId),
            eq(schema.todoCompletions.completionDate, dateStr)
          )
        );

      weekDays.push({
        date: dateStr,
        taskCount: Number(completions[0]?.count || 0),
        timeslotCount: timeslotCompletions.length,
      });
    }

    return weekDays;
  });

/**
 * Request reward redemption on public board (uses share token)
 * Rate limited to prevent abuse
 */
const PublicRequestRedemptionSchema = z.object({
  token: z.string().length(64),
  memberId: z.number(),
  rewardId: z.number(),
});

export const publicRequestRedemption = createServerFn({ method: "POST" })
  .inputValidator(PublicRequestRedemptionSchema)
  .handler(async ({ data }) => {
    // Validate token format
    if (!isValidShareToken(data.token)) {
      throw new Error("Invalid share token");
    }

    // Check rate limit
    const rateLimit = checkRateLimit("publicBoard", data.token);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }
    recordAttempt("publicBoard", data.token);

    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Verify member belongs to this family
    const [member] = await db
      .select({ id: schema.members.id, name: schema.members.name })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, family.id)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found");
    }

    // Verify reward exists and is active
    const [reward] = await db
      .select()
      .from(schema.rewards)
      .where(
        and(
          eq(schema.rewards.id, data.rewardId),
          eq(schema.rewards.familyId, family.id),
          eq(schema.rewards.isActive, true)
        )
      )
      .limit(1);

    if (!reward) {
      throw new Error("Reward not found or not available");
    }

    // Get member's current points
    const transactions = await db
      .select({ amount: schema.pointTransactions.amount })
      .from(schema.pointTransactions)
      .where(eq(schema.pointTransactions.memberId, data.memberId));

    const currentPoints = transactions.reduce((sum, t) => sum + t.amount, 0);

    if (currentPoints < reward.pointCost) {
      throw new Error(
        `Not enough points. You have ${currentPoints} but need ${reward.pointCost}`
      );
    }

    // Create redemption request
    const [redemption] = await db
      .insert(schema.rewardRedemptions)
      .values({
        memberId: data.memberId,
        rewardId: data.rewardId,
        pointsSpent: reward.pointCost,
        status: "pending",
      })
      .returning();

    // Deduct points
    await db.insert(schema.pointTransactions).values({
      memberId: data.memberId,
      amount: -reward.pointCost,
      type: "redeemed",
      description: `Requested: ${reward.name}`,
      rewardId: data.rewardId,
    });

    // Audit log
    await logAudit({
      familyId: family.id,
      action: "create",
      entityType: "reward",
      entityId: redemption.id,
      newValue: {
        memberId: data.memberId,
        memberName: member.name,
        rewardId: data.rewardId,
        rewardName: reward.name,
        pointsSpent: reward.pointCost,
        source: "public_board",
        redemption: true,
      },
    });

    return { success: true, redemptionId: redemption.id };
  });

/**
 * Get member's redemption history on public board (no auth required, uses share token)
 */
const GetPublicMemberRedemptionsSchema = z.object({
  token: z.string().length(64),
  memberId: z.number(),
});

export const getPublicMemberRedemptions = createServerFn({ method: "GET" })
  .inputValidator(GetPublicMemberRedemptionsSchema)
  .handler(async ({ data }) => {
    // Verify token and get family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.shareToken, data.token))
      .limit(1);

    if (!family) {
      throw new Error("Invalid share token");
    }

    // Verify member belongs to this family
    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(
        and(
          eq(schema.members.id, data.memberId),
          eq(schema.members.familyId, family.id)
        )
      )
      .limit(1);

    if (!member) {
      throw new Error("Member not found");
    }

    // Get redemptions with reward details
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
      .innerJoin(
        schema.rewards,
        eq(schema.rewardRedemptions.rewardId, schema.rewards.id)
      )
      .where(eq(schema.rewardRedemptions.memberId, data.memberId))
      .orderBy(sql`${schema.rewardRedemptions.requestedAt} DESC`);

    return redemptions;
  });
