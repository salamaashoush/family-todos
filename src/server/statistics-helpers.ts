/**
 * Internal helper functions for statistics management.
 * These are NOT server functions and should only be imported by other server files.
 * DO NOT import this file from client code.
 */

import { eq, sql, or } from "drizzle-orm";
import { db, schema } from "../db";
import { broadcastToFamily } from "./realtime";

/**
 * Check and award achievements based on current member stats
 * @internal - Only for use within server files
 */
export async function checkAchievements(memberId: number) {
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
              achievementIcon: achievement.icon,
              starReward: achievement.starReward,
            },
          });
        }
      } catch {
        // Achievement already exists
      }
    }
  }
}

/**
 * Revoke achievements that the member no longer qualifies for
 * Called after uncompleting tasks to ensure consistency
 * @internal - Only for use within server files
 */
export async function revokeUnqualifiedAchievements(memberId: number) {
  const [stats] = await db
    .select()
    .from(schema.memberStats)
    .where(eq(schema.memberStats.memberId, memberId))
    .limit(1);

  if (!stats) return;

  // Get member's family ID for broadcast
  const [member] = await db
    .select({ familyId: schema.members.familyId, name: schema.members.name })
    .from(schema.members)
    .where(eq(schema.members.id, memberId))
    .limit(1);

  if (!member) return;

  // Get all earned achievements for this member
  const earnedAchievements = await db
    .select({
      memberAchievementId: schema.memberAchievements.id,
      achievementId: schema.achievements.id,
      name: schema.achievements.name,
      requirementType: schema.achievements.requirementType,
      requirementValue: schema.achievements.requirementValue,
      starReward: schema.achievements.starReward,
    })
    .from(schema.memberAchievements)
    .innerJoin(
      schema.achievements,
      eq(schema.memberAchievements.achievementId, schema.achievements.id)
    )
    .where(eq(schema.memberAchievements.memberId, memberId));

  for (const achievement of earnedAchievements) {
    let stillQualifies = true;

    switch (achievement.requirementType) {
      case "tasks_completed":
        stillQualifies = stats.totalTasksCompleted >= achievement.requirementValue;
        break;
      case "streak":
        stillQualifies = stats.currentStreak >= achievement.requirementValue;
        break;
      case "stars":
        stillQualifies = stats.totalStars >= achievement.requirementValue;
        break;
      case "timeslots_completed":
        stillQualifies = stats.totalTimeslotsCompleted >= achievement.requirementValue;
        break;
      case "level":
        stillQualifies = stats.level >= achievement.requirementValue;
        break;
    }

    if (!stillQualifies) {
      // Revoke the achievement
      await db
        .delete(schema.memberAchievements)
        .where(eq(schema.memberAchievements.id, achievement.memberAchievementId));

      // Remove the bonus stars that were awarded
      if (achievement.starReward > 0) {
        await db
          .update(schema.memberStats)
          .set({
            totalStars: sql`GREATEST(0, ${schema.memberStats.totalStars} - ${achievement.starReward})`,
          })
          .where(eq(schema.memberStats.memberId, memberId));
      }

      // Broadcast achievement revoked event
      broadcastToFamily(member.familyId, {
        type: "achievement_revoked",
        memberId,
        memberName: member.name,
        timestamp: Date.now(),
        data: {
          achievementId: achievement.achievementId,
          achievementName: achievement.name,
        },
      });
    }
  }
}
