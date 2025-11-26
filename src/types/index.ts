import type { Member, Timeslot, Todo, TodoCompletion, MemberStats, Achievement, LayoutSettingRow } from '../db/types'

export type { Member, Timeslot, Todo, TodoCompletion, MemberStats, Achievement, LayoutSettingRow }

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
  achievements: (Achievement & { earned_at: string | null })[]
}

export interface MemberStatsCardProps {
  member: Member
}

export interface WeeklyProgressDay {
  date: string
  task_count: number
  timeslot_count: number
}

export interface LayoutProps {
  members: Member[]
  timeslots: Timeslot[]
  todos: Todo[]
  completions: TodoCompletion[]
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
  currentTimeslotId: number | null
}
