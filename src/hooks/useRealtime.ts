import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { eventStream, type RealtimeEvent } from '../server/realtime'

export function useRealtime(selectedDate: string, onEvent?: (event: RealtimeEvent) => void) {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false

    const consumeStream = async () => {
      try {
        for await (const event of await eventStream()) {
          if (cancelled) break

          switch (event.type) {
            case 'task_completed':
            case 'task_uncompleted':
              queryClient.invalidateQueries({ queryKey: ['completions', selectedDate] })
              queryClient.invalidateQueries({ queryKey: ['memberStats'] })
              queryClient.invalidateQueries({ queryKey: ['weeklyProgress'] })
              break
            case 'timeslot_completed':
              queryClient.invalidateQueries({ queryKey: ['completions', selectedDate] })
              queryClient.invalidateQueries({ queryKey: ['memberStats'] })
              break
            case 'achievement_unlocked':
              queryClient.invalidateQueries({ queryKey: ['memberAchievements'] })
              queryClient.invalidateQueries({ queryKey: ['memberStats'] })
              break
          }

          onEvent?.(event)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Realtime stream error:', error)
        }
      }
    }

    consumeStream()

    return () => {
      cancelled = true
    }
  }, [queryClient, selectedDate, onEvent])
}
