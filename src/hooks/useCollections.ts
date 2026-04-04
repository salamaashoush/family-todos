import { useLiveQuery } from '@tanstack/react-db'
import {
  membersCollection,
  todosCollection,
  timeslotsCollection,
  rewardsCollection,
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
