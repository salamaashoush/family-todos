import { useMemo } from 'react'
import type { Todo, Timeslot, Member } from '../types'

export function useSortedTimeslots(timeslots: Timeslot[]): Timeslot[] {
  return useMemo(() => {
    return [...timeslots].sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0
      return a.startTime.localeCompare(b.startTime)
    })
  }, [timeslots])
}

export function useTimeslotTodos(todos: Todo[], timeslotId: number): Todo[] {
  return useMemo(() => todos.filter((t) => t.timeslotIds?.includes(timeslotId)), [todos, timeslotId])
}

export function useTimeslotMembers(members: Member[], timeslot: Timeslot): Member[] {
  return useMemo(() => members.filter((m) => timeslot.memberIds?.includes(m.id)), [members, timeslot.memberIds])
}

export function useMemberTimeslots(timeslots: Timeslot[], memberId: number): Timeslot[] {
  return useMemo(() => {
    return timeslots
      .filter((t) => t.memberIds?.includes(memberId))
      .sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0
        return a.startTime.localeCompare(b.startTime)
      })
  }, [timeslots, memberId])
}
