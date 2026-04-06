import { z } from 'zod'

const dateField = z
  .union([z.string(), z.date()])
  .transform((v) => (typeof v === 'string' ? new Date(v) : v))

const nullableDateField = z
  .union([z.string(), z.date(), z.null()])
  .transform((v) => (typeof v === 'string' ? new Date(v) : v))

export const memberSchema = z.object({
  id: z.number(),
  familyId: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  isParent: z.boolean(),
  linkedUserId: z.number().nullable(),
  createdAt: dateField,
  updatedAt: dateField,
})

export const todoSchema = z.object({
  id: z.number(),
  familyId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  symbol: z.string().nullable(),
  position: z.number(),
  points: z.number(),
  createdAt: dateField,
  updatedAt: dateField,
  timeslotIds: z.array(z.number()),
})

export const timeslotSchema = z.object({
  id: z.number(),
  familyId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  recurrenceType: z.string(),
  recurrenceDays: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: dateField,
  updatedAt: dateField,
  memberIds: z.array(z.number()),
})

export const rewardSchema = z.object({
  id: z.number(),
  familyId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  pointCost: z.number(),
  isActive: z.boolean(),
  createdAt: dateField,
  updatedAt: dateField,
})

export const completionSchema = z.object({
  id: z.number(),
  todoId: z.number(),
  timeslotId: z.number(),
  memberId: z.number(),
  completionDate: z.string(),
  completedAt: dateField,
})

export const memberStatsSchema = z.object({
  id: z.number(),
  memberId: z.number(),
  totalStars: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  totalTasksCompleted: z.number(),
  totalTimeslotsCompleted: z.number(),
  level: z.number(),
  lastCompletionDate: z.string().nullable(),
  createdAt: dateField,
  updatedAt: dateField,
})

export const achievementSchema = z.object({
  id: z.number(),
  familyId: z.number().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  requirementType: z.string(),
  requirementValue: z.number(),
  starReward: z.number(),
  isGlobal: z.boolean(),
  createdAt: dateField,
  earnedAt: nullableDateField.optional(),
})
