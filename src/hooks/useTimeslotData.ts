import { useMemo } from 'react'
import type { Todo, Timeslot, Member } from '../types'

export function useSortedTimeslots(timeslots: Timeslot[]): Timeslot[] {
  return useMemo(() => {
    return [...timeslots].sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0
      return a.start_time.localeCompare(b.start_time)
    })
  }, [timeslots])
}

export function useTimeslotTodos(todos: Todo[], timeslotId: number): Todo[] {
  return useMemo(() => todos.filter((t) => t.timeslot_ids?.includes(timeslotId)), [todos, timeslotId])
}

export function useTimeslotMembers(members: Member[], timeslot: Timeslot): Member[] {
  return useMemo(() => members.filter((m) => timeslot.member_ids?.includes(m.id)), [members, timeslot.member_ids])
}

export function useMemberTimeslots(timeslots: Timeslot[], memberId: number): Timeslot[] {
  return useMemo(() => {
    return timeslots
      .filter((t) => t.member_ids?.includes(memberId))
      .sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0
        return a.start_time.localeCompare(b.start_time)
      })
  }, [timeslots, memberId])
}
