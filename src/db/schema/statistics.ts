import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  index,
  uniqueIndex,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import { families } from "./families";
import { members } from "./members";

// Aggregated stats per member
export const memberStats = pgTable(
  "member_stats",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .unique()
      .references(() => members.id, { onDelete: "cascade" }),
    totalStars: integer("total_stars").default(0).notNull(),
    currentStreak: integer("current_streak").default(0).notNull(),
    longestStreak: integer("longest_streak").default(0).notNull(),
    totalTasksCompleted: integer("total_tasks_completed").default(0).notNull(),
    totalTimeslotsCompleted: integer("total_timeslots_completed").default(0).notNull(),
    level: integer("level").default(1).notNull(),
    lastCompletionDate: date("last_completion_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_member_stats_member").on(table.memberId),
  ]
);

// Achievement definitions
export const achievements = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id").references(() => families.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 100 }),
    requirementType: varchar("requirement_type", { length: 50 }).notNull(),
    requirementValue: integer("requirement_value").notNull(),
    starReward: integer("star_reward").default(0).notNull(),
    isGlobal: boolean("is_global").default(false).notNull(), // true = applies to all families
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_achievements_family").on(table.familyId),
  ]
);

// Junction: member <-> achievement (earned achievements)
export const memberAchievements = pgTable(
  "member_achievements",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_member_achievement_unique").on(table.memberId, table.achievementId),
    index("idx_member_achievements_member").on(table.memberId),
  ]
);

export type MemberStats = typeof memberStats.$inferSelect;
export type NewMemberStats = typeof memberStats.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type MemberAchievement = typeof memberAchievements.$inferSelect;
export type NewMemberAchievement = typeof memberAchievements.$inferInsert;
