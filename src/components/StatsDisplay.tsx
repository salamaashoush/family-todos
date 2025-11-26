import { useState, useMemo } from 'react'
import { useLevelUpCelebration } from '../hooks/useCelebration'
import { useWeeklyProgress } from '../hooks/useQueries'
import { LEVEL_PROGRESS, WEEK_DAYS } from '../constants'
import type { StatsDisplayProps } from '../types'

export function StatsDisplay({ stats, achievements }: StatsDisplayProps) {
  const earnedAchievements = achievements.filter((a) => a.earned_at)
  const nextAchievements = achievements.filter((a) => !a.earned_at).slice(0, 3)
  const levelProgress = ((stats.total_stars % LEVEL_PROGRESS.STARS_PER_LEVEL) / LEVEL_PROGRESS.STARS_PER_LEVEL) * 100
  const [showWeeklyView, setShowWeeklyView] = useState(false)

  useLevelUpCelebration({
    level: stats.level,
    achievementCount: earnedAchievements.length,
  })

  const weekStart = useMemo(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }, [])

  // Always call the hook (rules of hooks), but only use data when needed
  const weeklyProgressQuery = useWeeklyProgress(stats.member_id, weekStart)
  const weeklyProgress = showWeeklyView ? weeklyProgressQuery.data : undefined
  const weeklyLoading = weeklyProgressQuery.isLoading

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 border-b-4 border-yellow-300 flex-shrink-0">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-xl p-3 shadow-md border-2 border-yellow-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⭐</span>
            <span className="text-xs font-bold text-gray-600">Level {stats.level}</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary">{stats.total_stars}</div>
          <div className="text-xs text-gray-500">Stars</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {LEVEL_PROGRESS.STARS_PER_LEVEL - (stats.total_stars % LEVEL_PROGRESS.STARS_PER_LEVEL)} to Level {stats.level + 1}
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-md border-2 border-orange-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{stats.current_streak > 0 ? '🔥' : '💤'}</span>
            <span className="text-xs font-bold text-gray-600">Streak</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.current_streak}</div>
          <div className="text-xs text-gray-500">
            {stats.current_streak === 1 ? 'Day' : 'Days'}
          </div>
          <div className="text-xs text-gray-600 mt-2">Best: {stats.longest_streak}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-md border-2 border-theme-primary mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span className="text-xs font-bold text-gray-600">Tasks Completed</span>
          </div>
          <span className="text-lg font-bold text-theme-primary">
            {stats.total_tasks_completed}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="text-xs font-bold text-gray-600">Timeslots Done</span>
          </div>
          <span className="text-lg font-bold text-green-600">
            {stats.total_timeslots_completed}
          </span>
        </div>
      </div>

      {earnedAchievements.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-gray-700">Latest Achievements</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {earnedAchievements.slice(0, 4).map((achievement) => (
              <div
                key={achievement.id}
                className="bg-gradient-to-br from-theme-primary to-theme-secondary text-white rounded-lg p-2 min-w-[80px] text-center shadow-lg flex-shrink-0"
                title={achievement.description}
              >
                <div className="text-3xl mb-1">{achievement.icon}</div>
                <div className="text-xs font-bold leading-tight">{achievement.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nextAchievements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-gray-700">Next Goals</span>
          </div>
          <div className="space-y-2">
            {nextAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-white/60 rounded-lg p-2 flex items-center gap-2 border-2 border-gray-300"
              >
                <span className="text-2xl opacity-50">{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-700 truncate">
                    {achievement.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{achievement.description}</div>
                </div>
                <span className="text-xs font-bold text-theme-primary flex-shrink-0">
                  +{achievement.star_reward}⭐
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t-2 border-yellow-200">
        <button
          onClick={() => setShowWeeklyView(!showWeeklyView)}
          className="w-full bg-white rounded-lg p-2 flex items-center justify-between border-2 border-theme-primary hover:border-theme-primary transition-all"
        >
          <span className="text-sm font-bold text-gray-700">Weekly Progress</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform ${showWeeklyView ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showWeeklyView && (
          weeklyLoading ? (
            <div className="mt-3 grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex flex-col items-center p-2 rounded-lg border-2 border-gray-200 bg-white animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-6 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-4 mb-1"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                </div>
              ))}
            </div>
          ) : weeklyProgress && (
            <div className="mt-3 grid grid-cols-7 gap-1">
              {weeklyProgress.map((day, index) => {
                const today = new Date().toISOString().split('T')[0]
                const isToday = day.date === today
                const hasActivity = day.task_count > 0

                return (
                  <div
                    key={day.date}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 ${
                      isToday ? 'border-theme-primary bg-theme-primary/10' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-600">{WEEK_DAYS[index]}</span>
                    <span className="text-xs text-gray-500">{new Date(day.date).getDate()}</span>
                    <div
                      className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        hasActivity ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {day.task_count}
                    </div>
                    {day.timeslot_count > 0 && (
                      <div className="mt-1 text-xs text-green-600 font-bold">
                        {day.timeslot_count}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
