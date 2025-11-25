import { useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Todo, Timeslot, Member } from '../types'

interface UseCompletionCelebrationOptions {
  members: Member[]
  timeslots: Timeslot[]
  todos: Todo[]
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
}

export function useCompletionCelebration({
  members,
  timeslots,
  todos,
  isTodoCompleted,
}: UseCompletionCelebrationOptions) {
  const lastCelebrationRef = useRef<string | null>(null)

  const checkAndCelebrate = useCallback(
    (todoId: number, timeslotId: number, memberId: number, willBeCompleted: boolean) => {
      if (!willBeCompleted) return

      const timeslot = timeslots.find((t) => t.id === timeslotId)
      if (!timeslot) return

      const timeslotTodos = todos.filter((t) => t.timeslot_ids?.includes(timeslotId))
      if (timeslotTodos.length === 0) return

      // Check if completing this todo will complete the timeslot
      const otherTodosCompleted = timeslotTodos
        .filter((t) => t.id !== todoId)
        .every((t) => isTodoCompleted(t.id, timeslotId, memberId))

      if (otherTodosCompleted) {
        // This todo completion will complete the timeslot
        const celebrationKey = `${timeslotId}-${memberId}`
        if (lastCelebrationRef.current === celebrationKey) return
        lastCelebrationRef.current = celebrationKey

        // Calculate overall progress for this member
        const memberTimeslots = timeslots.filter((t) => t.member_ids?.includes(memberId))
        let completedTimeslots = 0

        for (const ts of memberTimeslots) {
          if (ts.id === timeslotId) {
            // This one will be completed
            completedTimeslots++
            continue
          }
          const tsTodos = todos.filter((t) => t.timeslot_ids?.includes(ts.id))
          if (tsTodos.length > 0 && tsTodos.every((t) => isTodoCompleted(t.id, ts.id, memberId))) {
            completedTimeslots++
          }
        }

        const percentage = memberTimeslots.length > 0
          ? (completedTimeslots / memberTimeslots.length) * 100
          : 0

        if (percentage >= 100) {
          triggerPerfectDayCelebration()
        } else if (percentage >= 75) {
          triggerBigCelebration()
        } else if (percentage >= 50) {
          triggerMediumCelebration()
        } else {
          triggerSmallCelebration()
        }

        // Reset after a delay
        setTimeout(() => {
          lastCelebrationRef.current = null
        }, 2000)
      }
    },
    [timeslots, todos, isTodoCompleted]
  )

  return { checkAndCelebrate }
}

function triggerPerfectDayCelebration() {
  const duration = 3000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 7,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFD700', '#FFA500', '#FF6347'],
    })
    confetti({
      particleCount: 7,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#FFD700', '#FFA500', '#FF6347'],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }
  frame()
}

function triggerBigCelebration() {
  confetti({
    particleCount: 100,
    spread: 90,
    origin: { y: 0.6 },
    colors: ['#8B5CF6', '#EC4899', '#06B6D4', '#22C55E'],
    startVelocity: 40,
  })
}

function triggerMediumCelebration() {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#8B5CF6', '#EC4899', '#06B6D4'],
  })
}

function triggerSmallCelebration() {
  confetti({
    particleCount: 30,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#8B5CF6', '#EC4899'],
  })
}
