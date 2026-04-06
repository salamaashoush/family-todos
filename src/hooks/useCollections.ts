import { useLiveQuery } from '@tanstack/react-db'
import {
  membersCollection,
  todosCollection,
  timeslotsCollection,
  rewardsCollection,
  completionsCollection,
  memberStatsCollection,
  achievementsCollection,
} from '../collections'

export function useMembers() {
  return useLiveQuery((q) => q.from({ m: membersCollection }))
}

export function useTodos() {
  return useLiveQuery((q) => q.from({ t: todosCollection }))
}

export function useTimeslots() {
  return useLiveQuery((q) => q.from({ ts: timeslotsCollection }))
}

export function useRewards() {
  return useLiveQuery((q) => q.from({ r: rewardsCollection }))
}

export function useCompletions() {
  return useLiveQuery((q) => q.from({ c: completionsCollection }))
}

export function useMemberStats() {
  return useLiveQuery((q) => q.from({ s: memberStatsCollection }))
}

export function useAchievements() {
  return useLiveQuery((q) => q.from({ a: achievementsCollection }))
}
