import type { Member as BaseMember, Timeslot as BaseTimeslot, Todo as BaseTodo, TodoCompletion, MemberStats, Achievement, LayoutSetting, Reward, PointTransaction, RewardRedemption } from '../db/schema'

// Extended types with computed properties from server functions
// These are the types returned by API calls which include joined data
export type Timeslot = BaseTimeslot & { memberIds?: number[] }
export type Todo = BaseTodo & { timeslotIds?: number[] }
export type Member = BaseMember

// Re-export base types for explicit access
export type { BaseMember, BaseTimeslot, BaseTodo }
export type { TodoCompletion, MemberStats, Achievement, Reward, PointTransaction, RewardRedemption }
export type LayoutSettingRow = LayoutSetting

export type { LayoutId, LayoutConfig, LayoutSettings, DeviceType } from '../config/layouts'

export interface MemberColumnProps {
  member: Member
  timeslots: Timeslot[]
  todos: Todo[]
  completions: TodoCompletion[]
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
}

export interface TimeslotCardProps {
  timeslot: Timeslot
  todos: Todo[]
  memberId: number
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
  completionPercentage: number
  totalTimeslots: number
  completedTimeslotsCount: number
}

export interface StatsDisplayProps {
  stats: MemberStats
  achievements: (Achievement & { earnedAt: Date | null })[]
}

export interface MemberStatsCardProps {
  member: Member
}

export interface WeeklyProgressDay {
  date: string
  taskCount: number
  timeslotCount: number
}

// Alias types for backwards compatibility
export type TimeslotWithMembers = Timeslot
export type TodoWithTimeslots = Todo

export interface LayoutProps {
  members: Member[]
  timeslots: Timeslot[]
  todos: Todo[]
  completions: TodoCompletion[]
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
  currentTimeslotId: number | null
}
