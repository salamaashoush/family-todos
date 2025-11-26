import { useState, useCallback } from 'react'
import type { AchievementUnlockData } from '../components/AchievementUnlockModal'
import type { RealtimeEvent } from '../server/realtime'

/**
 * Hook to manage achievement celebration state
 * Queues multiple achievements and displays them one at a time
 */
export function useAchievementCelebration() {
  const [queue, setQueue] = useState<AchievementUnlockData[]>([])
  const [currentAchievement, setCurrentAchievement] = useState<AchievementUnlockData | null>(null)

  const handleAchievementEvent = useCallback((event: RealtimeEvent) => {
    if (event.type !== 'achievement_unlocked') return

    const achievementData: AchievementUnlockData = {
      memberName: event.memberName || 'Someone',
      achievementName: event.data.achievementName,
      achievementIcon: event.data.achievementIcon,
      starReward: event.data.starReward,
    }

    setQueue((prev) => {
      // If no current achievement, show immediately
      if (!currentAchievement && prev.length === 0) {
        setCurrentAchievement(achievementData)
        return []
      }
      // Otherwise add to queue
      return [...prev, achievementData]
    })
  }, [currentAchievement])

  const dismissCurrent = useCallback(() => {
    setCurrentAchievement(null)

    // Show next in queue after a short delay
    setTimeout(() => {
      setQueue((prev) => {
        if (prev.length > 0) {
          const [next, ...rest] = prev
          setCurrentAchievement(next)
          return rest
        }
        return prev
      })
    }, 300)
  }, [])

  return {
    currentAchievement,
    handleAchievementEvent,
    dismissCurrent,
  }
}
