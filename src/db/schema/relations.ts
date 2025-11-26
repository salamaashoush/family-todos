import { relations } from "drizzle-orm";
import { families } from "./families";
import { members } from "./members";
import { timeslots, timeslotMembers } from "./timeslots";
import { todos, todoTimeslots } from "./todos";
import { todoCompletions, timeslotCompletions } from "./completions";
import { memberStats, achievements, memberAchievements } from "./statistics";
import { rewards, pointTransactions, rewardRedemptions } from "./rewards";
import { adminUsers, userFamilies } from "./auth";
import { layoutSettings } from "./settings";

// Family relations
export const familiesRelations = relations(families, ({ many }) => ({
  members: many(members),
  timeslots: many(timeslots),
  todos: many(todos),
  rewards: many(rewards),
  achievements: many(achievements),
  userFamilies: many(userFamilies),
  layoutSettings: many(layoutSettings),
}));

// Member relations
export const membersRelations = relations(members, ({ one, many }) => ({
  family: one(families, {
    fields: [members.familyId],
    references: [families.id],
  }),
  timeslotMembers: many(timeslotMembers),
  todoCompletions: many(todoCompletions),
  timeslotCompletions: many(timeslotCompletions),
  stats: one(memberStats, {
    fields: [members.id],
    references: [memberStats.memberId],
  }),
  memberAchievements: many(memberAchievements),
  pointTransactions: many(pointTransactions),
  rewardRedemptions: many(rewardRedemptions),
}));

// Timeslot relations
export const timeslotsRelations = relations(timeslots, ({ one, many }) => ({
  family: one(families, {
    fields: [timeslots.familyId],
    references: [families.id],
  }),
  timeslotMembers: many(timeslotMembers),
  todoTimeslots: many(todoTimeslots),
  todoCompletions: many(todoCompletions),
  timeslotCompletions: many(timeslotCompletions),
}));

export const timeslotMembersRelations = relations(timeslotMembers, ({ one }) => ({
  timeslot: one(timeslots, {
    fields: [timeslotMembers.timeslotId],
    references: [timeslots.id],
  }),
  member: one(members, {
    fields: [timeslotMembers.memberId],
    references: [members.id],
  }),
}));

// Todo relations
export const todosRelations = relations(todos, ({ one, many }) => ({
  family: one(families, {
    fields: [todos.familyId],
    references: [families.id],
  }),
  todoTimeslots: many(todoTimeslots),
  todoCompletions: many(todoCompletions),
  pointTransactions: many(pointTransactions),
}));

export const todoTimeslotsRelations = relations(todoTimeslots, ({ one }) => ({
  todo: one(todos, {
    fields: [todoTimeslots.todoId],
    references: [todos.id],
  }),
  timeslot: one(timeslots, {
    fields: [todoTimeslots.timeslotId],
    references: [timeslots.id],
  }),
}));

// Completion relations
export const todoCompletionsRelations = relations(todoCompletions, ({ one }) => ({
  todo: one(todos, {
    fields: [todoCompletions.todoId],
    references: [todos.id],
  }),
  timeslot: one(timeslots, {
    fields: [todoCompletions.timeslotId],
    references: [timeslots.id],
  }),
  member: one(members, {
    fields: [todoCompletions.memberId],
    references: [members.id],
  }),
}));

export const timeslotCompletionsRelations = relations(timeslotCompletions, ({ one }) => ({
  timeslot: one(timeslots, {
    fields: [timeslotCompletions.timeslotId],
    references: [timeslots.id],
  }),
  member: one(members, {
    fields: [timeslotCompletions.memberId],
    references: [members.id],
  }),
}));

// Statistics relations
export const memberStatsRelations = relations(memberStats, ({ one }) => ({
  member: one(members, {
    fields: [memberStats.memberId],
    references: [members.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one, many }) => ({
  family: one(families, {
    fields: [achievements.familyId],
    references: [families.id],
  }),
  memberAchievements: many(memberAchievements),
}));

export const memberAchievementsRelations = relations(memberAchievements, ({ one }) => ({
  member: one(members, {
    fields: [memberAchievements.memberId],
    references: [members.id],
  }),
  achievement: one(achievements, {
    fields: [memberAchievements.achievementId],
    references: [achievements.id],
  }),
}));

// Rewards relations
export const rewardsRelations = relations(rewards, ({ one, many }) => ({
  family: one(families, {
    fields: [rewards.familyId],
    references: [families.id],
  }),
  pointTransactions: many(pointTransactions),
  redemptions: many(rewardRedemptions),
}));

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  member: one(members, {
    fields: [pointTransactions.memberId],
    references: [members.id],
  }),
  todo: one(todos, {
    fields: [pointTransactions.todoId],
    references: [todos.id],
  }),
  reward: one(rewards, {
    fields: [pointTransactions.rewardId],
    references: [rewards.id],
  }),
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
  member: one(members, {
    fields: [rewardRedemptions.memberId],
    references: [members.id],
  }),
  reward: one(rewards, {
    fields: [rewardRedemptions.rewardId],
    references: [rewards.id],
  }),
}));

// Auth relations
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  userFamilies: many(userFamilies),
}));

export const userFamiliesRelations = relations(userFamilies, ({ one }) => ({
  user: one(adminUsers, {
    fields: [userFamilies.userId],
    references: [adminUsers.id],
  }),
  family: one(families, {
    fields: [userFamilies.familyId],
    references: [families.id],
  }),
}));

// Settings relations
export const layoutSettingsRelations = relations(layoutSettings, ({ one }) => ({
  family: one(families, {
    fields: [layoutSettings.familyId],
    references: [families.id],
  }),
}));
