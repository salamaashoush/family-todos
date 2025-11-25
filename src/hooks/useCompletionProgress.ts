import { useMemo } from 'react'
import type { Todo, Timeslot, Member } from '../types'

interface CompletionProgress {
  completedCount: number
  totalCount: number
  allCompleted: boolean
  percentage: number
}

export function useTimeslotProgress(
  todos: Todo[],
  timeslotId: number,
  memberId: number,
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
): CompletionProgress {
  return useMemo(() => {
    const completed = todos.filter((t) => isTodoCompleted(t.id, timeslotId, memberId)).length
    const total = todos.length
    const allCompleted = total > 0 && completed === total
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completedCount: completed, totalCount: total, allCompleted, percentage }
  }, [todos, isTodoCompleted, timeslotId, memberId])
}

export function useMemberDayProgress(
  member: Member,
  timeslots: Timeslot[],
  todos: Todo[],
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
): CompletionProgress {
  return useMemo(() => {
    const memberTimeslots = timeslots.filter((t) => t.member_ids?.includes(member.id))
    let completed = 0
    let total = 0

    for (const timeslot of memberTimeslots) {
      const timeslotTodos = todos.filter((t) => t.timeslot_ids?.includes(timeslot.id))
      for (const todo of timeslotTodos) {
        total++
        if (isTodoCompleted(todo.id, timeslot.id, member.id)) {
          completed++
        }
      }
    }

    const allCompleted = total > 0 && completed === total
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completedCount: completed, totalCount: total, allCompleted, percentage }
  }, [member, timeslots, todos, isTodoCompleted])
}

export function useOverallDayProgress(
  members: Member[],
  timeslots: Timeslot[],
  todos: Todo[],
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
): CompletionProgress {
  return useMemo(() => {
    let completed = 0
    let total = 0

    for (const member of members) {
      const memberTimeslots = timeslots.filter((t) => t.member_ids?.includes(member.id))
      for (const timeslot of memberTimeslots) {
        const timeslotTodos = todos.filter((t) => t.timeslot_ids?.includes(timeslot.id))
        for (const todo of timeslotTodos) {
          total++
          if (isTodoCompleted(todo.id, timeslot.id, member.id)) {
            completed++
          }
        }
      }
    }

    const allCompleted = total > 0 && completed === total
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completedCount: completed, totalCount: total, allCompleted, percentage }
  }, [members, timeslots, todos, isTodoCompleted])
}

export function useTimeslotOverallProgress(
  timeslot: Timeslot,
  members: Member[],
  todos: Todo[],
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
): CompletionProgress {
  return useMemo(() => {
    const timeslotMembers = members.filter((m) => timeslot.member_ids?.includes(m.id))
    const timeslotTodos = todos.filter((t) => t.timeslot_ids?.includes(timeslot.id))
    let completed = 0
    let total = 0

    for (const member of timeslotMembers) {
      for (const todo of timeslotTodos) {
        total++
        if (isTodoCompleted(todo.id, timeslot.id, member.id)) {
          completed++
        }
      }
    }

    const allCompleted = total > 0 && completed === total
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completedCount: completed, totalCount: total, allCompleted, percentage }
  }, [timeslot, members, todos, isTodoCompleted])
}
