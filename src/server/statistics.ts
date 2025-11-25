import { createServerFn } from "@tanstack/react-start";
import { db, type MemberStats, type Achievement, type MemberAchievement } from "../db/schema";
import { z } from "zod";

const GetStatsSchema = z.object({
  member_id: z.number(),
});

export const getMemberStats = createServerFn({ method: "GET" })
  .inputValidator(GetStatsSchema)
  .handler(async ({ data }) => {
    let stats = db
      .query<MemberStats, [number]>("SELECT * FROM member_stats WHERE member_id = ?")
      .get(data.member_id);

    if (!stats) {
      // Initialize stats if they don't exist
      db.run("INSERT INTO member_stats (member_id) VALUES (?)", [data.member_id]);
      stats = db
        .query<MemberStats, [number]>("SELECT * FROM member_stats WHERE member_id = ?")
        .get(data.member_id)!;
    }

    return stats;
  });

export const getAllAchievements = createServerFn({ method: "GET" })
  .handler(async () => {
    const achievements = db
      .query<Achievement, []>("SELECT * FROM achievements ORDER BY requirement_value ASC")
      .all();
    return achievements;
  });

const GetMemberAchievementsSchema = z.object({
  member_id: z.number(),
});

export const getMemberAchievements = createServerFn({ method: "GET" })
  .inputValidator(GetMemberAchievementsSchema)
  .handler(async ({ data }) => {
    const achievements = db
      .query<Achievement & { earned_at: string | null }, [number]>(
        `SELECT a.*, ma.earned_at
         FROM achievements a
         LEFT JOIN member_achievements ma ON a.id = ma.achievement_id AND ma.member_id = ?
         ORDER BY a.requirement_value ASC`
      ).all(data.member_id);

    return achievements;
  });

// This will be called automatically when a task is completed
export const updateStats = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    member_id: z.number(),
    completion_date: z.string(),
  }))
  .handler(async ({ data }) => {
    const { member_id, completion_date } = data;

    // Get or create stats
    let stats = db
      .query<MemberStats, [number]>("SELECT * FROM member_stats WHERE member_id = ?")
      .get(member_id);

    if (!stats) {
      db.run("INSERT INTO member_stats (member_id) VALUES (?)", [member_id]);
      stats = db
        .query<MemberStats, [number]>("SELECT * FROM member_stats WHERE member_id = ?")
        .get(member_id)!;
    }

    // Calculate streak
    const lastDate = stats.last_completion_date;
    let newStreak = 1;

    if (lastDate) {
      const last = new Date(lastDate);
      const current = new Date(completion_date);
      const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        newStreak = stats.current_streak + 1;
      } else if (diffDays === 0) {
        // Same day, keep current streak
        newStreak = stats.current_streak;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    // Award 1 star per task
    const newTotalStars = stats.total_stars + 1;
    const newTasksCompleted = stats.total_tasks_completed + 1;
    const newLongestStreak = Math.max(stats.longest_streak, newStreak);

    // Calculate level (every 50 stars = 1 level)
    const newLevel = Math.floor(newTotalStars / 50) + 1;

    db.run(
      `UPDATE member_stats
       SET total_stars = ?,
           current_streak = ?,
           longest_streak = ?,
           total_tasks_completed = ?,
           level = ?,
           last_completion_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE member_id = ?`,
      [newTotalStars, newStreak, newLongestStreak, newTasksCompleted, newLevel, completion_date, member_id]
    );

    // Check for new achievements
    await checkAchievements(member_id);

    return { success: true };
  });

async function checkAchievements(memberId: number) {
  const stats = db
    .query<MemberStats, [number]>("SELECT * FROM member_stats WHERE member_id = ?")
    .get(memberId);

  if (!stats) return;

  const achievements = db.query<Achievement, []>("SELECT * FROM achievements").all();

  for (const achievement of achievements) {
    // Check if already earned
    const existing = db
      .query<MemberAchievement, [number, number]>(
        "SELECT * FROM member_achievements WHERE member_id = ? AND achievement_id = ?"
      )
      .get(memberId, achievement.id);

    if (existing) continue;

    let earned = false;

    switch (achievement.requirement_type) {
      case 'tasks_completed':
        earned = stats.total_tasks_completed >= achievement.requirement_value;
        break;
      case 'streak':
        earned = stats.current_streak >= achievement.requirement_value;
        break;
      case 'stars':
        earned = stats.total_stars >= achievement.requirement_value;
        break;
      case 'timeslots_completed':
        earned = stats.total_timeslots_completed >= achievement.requirement_value;
        break;
      // Add more achievement types as needed
    }

    if (earned) {
      // Award achievement
      try {
        db.run(
          "INSERT INTO member_achievements (member_id, achievement_id) VALUES (?, ?)",
          [memberId, achievement.id]
        );

        // Award bonus stars
        if (achievement.star_reward > 0) {
          db.run(
            "UPDATE member_stats SET total_stars = total_stars + ? WHERE member_id = ?",
            [achievement.star_reward, memberId]
          );
        }
      } catch {
        // Achievement already exists
      }
    }
  }
}
