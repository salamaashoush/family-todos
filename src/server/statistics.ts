import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, asc, sql, or, and } from "drizzle-orm";
import { db, schema } from "../db";
import { broadcastToFamily } from "./realtime";
import { getTenantContext } from "../utils/tenant";
import { checkAchievements, revokeUnqualifiedAchievements } from "./statistics-helpers";

const GetStatsSchema = z.object({
  memberId: z.number(),
});

/**
 * Get stats for a member - REQUIRES tenant context and member ownership verification
 */
export const getMemberStats = createServerFn({ method: "GET" })
  .inputValidator(GetStatsSchema)
  .handler(async ({ data }) => {
    // SECURITY: Verify user is authenticated and member belongs to their family
    const { familyId } = await getTenantContext();

    // Verify member belongs to the current family
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

    let [stats] = await db
      .select()
      .from(schema.memberStats)
      .where(eq(schema.memberStats.memberId, data.memberId))
      .limit(1);

    if (!stats) {
      // Initialize stats if they don't exist
      [stats] = await db
        .insert(schema.memberStats)
        .values({ memberId: data.memberId })
        .returning();
    }

    return stats;
  });

export const getAllAchievements = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await getTenantContext();

    // Get global achievements and family-specific achievements
    const achievements = await db
      .select()
      .from(schema.achievements)
      .where(
        or(
          eq(schema.achievements.isGlobal, true),
          eq(schema.achievements.familyId, familyId)
        )
      )
      .orderBy(asc(schema.achievements.requirementValue));

    return achievements;
  }
);

const GetMemberAchievementsSchema = z.object({
  memberId: z.number(),
});

/**
 * Get achievements for a member - REQUIRES tenant context and member ownership verification
 */
export const getMemberAchievements = createServerFn({ method: "GET" })
  .inputValidator(GetMemberAchievementsSchema)
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

    // SECURITY: Verify member belongs to the current family
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

    // LEFT JOIN to get achievements with earned status
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
          eq(schema.achievements.familyId, familyId)
        )
      )
      .orderBy(asc(schema.achievements.requirementValue));

    return achievements;
  });

// This will be called automatically when a task is completed
export const updateStats = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      memberId: z.number(),
      completionDate: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { memberId, completionDate } = data;

    // Get or create stats
    let [stats] = await db
      .select()
      .from(schema.memberStats)
      .where(eq(schema.memberStats.memberId, memberId))
      .limit(1);

    if (!stats) {
      [stats] = await db
        .insert(schema.memberStats)
        .values({ memberId: memberId })
        .returning();
    }

    // Calculate streak
    const lastDate = stats.lastCompletionDate;
    let newStreak = 1;

    if (lastDate) {
      const last = new Date(lastDate);
      const current = new Date(completionDate);
      const diffDays = Math.floor(
        (current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        // Consecutive day
        newStreak = stats.currentStreak + 1;
      } else if (diffDays === 0) {
        // Same day, keep current streak
        newStreak = stats.currentStreak;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    // Award 1 star per task
    const newTotalStars = stats.totalStars + 1;
    const newTasksCompleted = stats.totalTasksCompleted + 1;
    const newLongestStreak = Math.max(stats.longestStreak, newStreak);

    // Calculate level (every 50 stars = 1 level)
    const newLevel = Math.floor(newTotalStars / 50) + 1;
    const previousLevel = stats.level;

    await db
      .update(schema.memberStats)
      .set({
        totalStars: newTotalStars,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        totalTasksCompleted: newTasksCompleted,
        level: newLevel,
        lastCompletionDate: completionDate,
        updatedAt: new Date(),
      })
      .where(eq(schema.memberStats.memberId, memberId));

    // Broadcast level-up event if level increased
    if (newLevel > previousLevel) {
      const [member] = await db
        .select({ name: schema.members.name, familyId: schema.members.familyId })
        .from(schema.members)
        .where(eq(schema.members.id, memberId))
        .limit(1);

      if (member) {
        broadcastToFamily(member.familyId, {
          type: "level_up",
          memberId,
          memberName: member.name,
          timestamp: Date.now(),
          data: {
            previousLevel,
            newLevel,
          },
        });
      }
    }

    // Check for new achievements
    await checkAchievements(memberId);

    return { success: true };
  });

/**
 * Check and reset streak if member hasn't completed tasks recently
 * Should be called on app load or periodically
 */
export const checkAndResetStreak = createServerFn({ method: "POST" })
  .inputValidator(z.object({ memberId: z.number() }))
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

    // Verify member belongs to family
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

    const [stats] = await db
      .select()
      .from(schema.memberStats)
      .where(eq(schema.memberStats.memberId, data.memberId))
      .limit(1);

    if (!stats || !stats.lastCompletionDate) {
      return { streakReset: false, currentStreak: 0 };
    }

    const lastDate = new Date(stats.lastCompletionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If more than 1 day has passed since last completion, reset streak
    if (diffDays > 1 && stats.currentStreak > 0) {
      await db
        .update(schema.memberStats)
        .set({
          currentStreak: 0,
          updatedAt: new Date(),
        })
        .where(eq(schema.memberStats.memberId, data.memberId));

      // Revoke any streak-based achievements
      await revokeUnqualifiedAchievements(data.memberId);

      return { streakReset: true, currentStreak: 0, previousStreak: stats.currentStreak };
    }

    return { streakReset: false, currentStreak: stats.currentStreak };
  });

// Re-export types for backwards compatibility
export type { MemberStats, Achievement, MemberAchievement } from "../db/schema";
