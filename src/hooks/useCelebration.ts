import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  CELEBRATION_THRESHOLDS,
  CELEBRATION_DURATIONS,
  CELEBRATION_PARTICLE_COUNTS,
  CELEBRATION_COLORS,
} from '../constants'

interface TimeslotCelebrationOptions {
  allCompleted: boolean
  wasCompleted: boolean
  completionPercentage: number
  totalTimeslots: number
  completedTimeslotsCount: number
}

export function useTimeslotCelebration({
  allCompleted,
  wasCompleted,
  completionPercentage,
  totalTimeslots,
  completedTimeslotsCount,
}: TimeslotCelebrationOptions) {
  const [previousCompleted, setPreviousCompleted] = useState(allCompleted)

  useEffect(() => {
    if (allCompleted && !wasCompleted) {
      const newCompletedCount = completedTimeslotsCount + 1
      const newPercentage = totalTimeslots > 0 ? (newCompletedCount / totalTimeslots) * 100 : 0

      if (newPercentage >= CELEBRATION_THRESHOLDS.PERFECT_DAY) {
        triggerPerfectDayCelebration()
      } else if (newPercentage >= CELEBRATION_THRESHOLDS.BIG_CELEBRATION) {
        triggerBigCelebration()
      } else if (newPercentage >= CELEBRATION_THRESHOLDS.MEDIUM_CELEBRATION) {
        triggerMediumCelebration()
      } else {
        triggerSmallCelebration()
      }

      setPreviousCompleted(true)
    } else if (!allCompleted) {
      setPreviousCompleted(false)
    }
  }, [allCompleted, wasCompleted, completionPercentage, totalTimeslots, completedTimeslotsCount])

  return previousCompleted
}

interface LevelUpCelebrationOptions {
  level: number
  achievementCount: number
}

export function useLevelUpCelebration({ level, achievementCount }: LevelUpCelebrationOptions) {
  const [prevLevel, setPrevLevel] = useState(level)
  const [prevAchievementCount, setPrevAchievementCount] = useState(achievementCount)

  useEffect(() => {
    if (level > prevLevel) {
      triggerLevelUpCelebration()
      setPrevLevel(level)
    }

    if (achievementCount > prevAchievementCount) {
      triggerAchievementCelebration()
      setPrevAchievementCount(achievementCount)
    }
  }, [level, achievementCount, prevLevel, prevAchievementCount])
}

function triggerPerfectDayCelebration() {
  const duration = CELEBRATION_DURATIONS.PERFECT_DAY
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: CELEBRATION_PARTICLE_COUNTS.PERFECT_DAY,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: [...CELEBRATION_COLORS.GOLD],
    })
    confetti({
      particleCount: CELEBRATION_PARTICLE_COUNTS.PERFECT_DAY,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: [...CELEBRATION_COLORS.GOLD],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }
  frame()
}

function triggerBigCelebration() {
  confetti({
    particleCount: CELEBRATION_PARTICLE_COUNTS.BIG,
    spread: 90,
    origin: { y: 0.6 },
    colors: [...CELEBRATION_COLORS.COLORFUL],
    startVelocity: 40,
  })
}

function triggerMediumCelebration() {
  confetti({
    particleCount: CELEBRATION_PARTICLE_COUNTS.MEDIUM,
    spread: 70,
    origin: { y: 0.6 },
    colors: [...CELEBRATION_COLORS.MEDIUM],
  })
}

function triggerSmallCelebration() {
  confetti({
    particleCount: CELEBRATION_PARTICLE_COUNTS.SMALL,
    spread: 60,
    origin: { y: 0.6 },
    colors: [...CELEBRATION_COLORS.MEDIUM],
  })
}

function triggerLevelUpCelebration() {
  confetti({
    particleCount: CELEBRATION_PARTICLE_COUNTS.LEVEL_UP,
    spread: 180,
    origin: { y: 0.5 },
    colors: [...CELEBRATION_COLORS.LEVEL_UP],
    startVelocity: 45,
    gravity: 0.8,
  })
}

function triggerAchievementCelebration() {
  confetti({
    particleCount: CELEBRATION_PARTICLE_COUNTS.ACHIEVEMENT,
    angle: 60,
    spread: 55,
    origin: { x: 0 },
    colors: [...CELEBRATION_COLORS.MEDIUM],
  })
  confetti({
    particleCount: CELEBRATION_PARTICLE_COUNTS.ACHIEVEMENT,
    angle: 120,
    spread: 55,
    origin: { x: 1 },
    colors: [...CELEBRATION_COLORS.MEDIUM],
  })
}
