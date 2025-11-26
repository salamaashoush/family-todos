import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, asc, sql, or } from "drizzle-orm";
import { db, schema } from "../db";
import { broadcastToFamily } from "./realtime";
import { getTenantContext } from "../utils/tenant";

const GetStatsSchema = z.object({
  memberId: z.number(),
});

export const getMemberStats = createServerFn({ method: "GET" })
  .inputValidator(GetStatsSchema)
  .handler(async ({ data }) => {
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

export const getMemberAchievements = createServerFn({ method: "GET" })
  .inputValidator(GetMemberAchievementsSchema)
  .handler(async ({ data }) => {
    const { familyId } = await getTenantContext();

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

    // Check for new achievements
    await checkAchievements(memberId);

    return { success: true };
  });

async function checkAchievements(memberId: number) {
  const [stats] = await db
    .select()
    .from(schema.memberStats)
    .where(eq(schema.memberStats.memberId, memberId))
    .limit(1);

  if (!stats) return;

  // Get member's family ID
  const [member] = await db
    .select({ familyId: schema.members.familyId })
    .from(schema.members)
    .where(eq(schema.members.id, memberId))
    .limit(1);

  if (!member) return;

  // Get all achievements (global + family-specific)
  const achievements = await db
    .select()
    .from(schema.achievements)
    .where(
      or(
        eq(schema.achievements.isGlobal, true),
        eq(schema.achievements.familyId, member.familyId)
      )
    );

  for (const achievement of achievements) {
    // Check if already earned
    const [existing] = await db
      .select()
      .from(schema.memberAchievements)
      .where(
        sql`${schema.memberAchievements.memberId} = ${memberId} AND ${schema.memberAchievements.achievementId} = ${achievement.id}`
      )
      .limit(1);

    if (existing) continue;

    let earned = false;

    switch (achievement.requirementType) {
      case "tasks_completed":
        earned = stats.totalTasksCompleted >= achievement.requirementValue;
        break;
      case "streak":
        earned = stats.currentStreak >= achievement.requirementValue;
        break;
      case "stars":
        earned = stats.totalStars >= achievement.requirementValue;
        break;
      case "timeslots_completed":
        earned = stats.totalTimeslotsCompleted >= achievement.requirementValue;
        break;
      case "level":
        earned = stats.level >= achievement.requirementValue;
        break;
    }

    if (earned) {
      try {
        // Award achievement
        await db.insert(schema.memberAchievements).values({
          memberId,
          achievementId: achievement.id,
        });

        // Award bonus stars
        if (achievement.starReward > 0) {
          await db
            .update(schema.memberStats)
            .set({
              totalStars: sql`${schema.memberStats.totalStars} + ${achievement.starReward}`,
            })
            .where(eq(schema.memberStats.memberId, memberId));
        }

        // Broadcast achievement unlocked event
        const [memberForBroadcast] = await db
          .select({ name: schema.members.name, familyId: schema.members.familyId })
          .from(schema.members)
          .where(eq(schema.members.id, memberId))
          .limit(1);

        if (memberForBroadcast) {
          broadcastToFamily(memberForBroadcast.familyId, {
            type: "achievement_unlocked",
            memberId,
            memberName: memberForBroadcast.name,
            timestamp: Date.now(),
            data: {
              achievementId: achievement.id,
              achievementName: achievement.name,
            },
          });
        }
      } catch {
        // Achievement already exists
      }
    }
  }
}

// Re-export types for backwards compatibility
export type { MemberStats, Achievement, MemberAchievement } from "../db/schema";
