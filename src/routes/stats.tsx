import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useMembers, useMemberStats, useMemberAchievements, useWeeklyProgress } from '../hooks/useQueries'
import { useLevelUpCelebration } from '../hooks/useCelebration'
import { MemberAvatar } from '../components/shared'
import { LEVEL_PROGRESS, WEEK_DAYS } from '../constants'
import { getMembers } from '../server/members'
import type { Member, MemberStats, Achievement } from '../types'

export const Route = createFileRoute('/stats')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: ['members'],
      queryFn: () => getMembers(),
    })
  },
  component: StatsPage,
})

interface MemberStatsViewProps {
  member: Member
  stats: MemberStats
  achievements: (Achievement & { earned_at: string | null })[]
}

function MemberStatsView({ member, stats, achievements }: MemberStatsViewProps) {
  const earnedAchievements = achievements.filter((a) => a.earned_at)
  const nextAchievements = achievements.filter((a) => !a.earned_at).slice(0, 3)
  const levelProgress = ((stats.total_stars % LEVEL_PROGRESS.STARS_PER_LEVEL) / LEVEL_PROGRESS.STARS_PER_LEVEL) * 100

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

  const { data: weeklyProgress, isLoading: weeklyLoading } = useWeeklyProgress(stats.member_id, weekStart)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-yellow-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">⭐</span>
            <span className="text-sm font-bold text-gray-600">Level {stats.level}</span>
          </div>
          <div className="text-4xl font-bold text-theme-primary">{stats.total_stars}</div>
          <div className="text-sm text-gray-500">Total Stars</div>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            {LEVEL_PROGRESS.STARS_PER_LEVEL - (stats.total_stars % LEVEL_PROGRESS.STARS_PER_LEVEL)} stars to Level {stats.level + 1}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-orange-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{stats.current_streak > 0 ? '🔥' : '💤'}</span>
            <span className="text-sm font-bold text-gray-600">Streak</span>
          </div>
          <div className="text-4xl font-bold text-orange-600">{stats.current_streak}</div>
          <div className="text-sm text-gray-500">{stats.current_streak === 1 ? 'Day' : 'Days'}</div>
          <div className="text-sm text-gray-600 mt-3">
            Best streak: <span className="font-bold">{stats.longest_streak} days</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-green-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">✅</span>
            <span className="text-sm font-bold text-gray-600">Tasks</span>
          </div>
          <div className="text-4xl font-bold text-green-600">{stats.total_tasks_completed}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-theme-primary">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🎯</span>
            <span className="text-sm font-bold text-gray-600">Timeslots</span>
          </div>
          <div className="text-4xl font-bold text-theme-primary">{stats.total_timeslots_completed}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Progress</h3>
        {weeklyLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 bg-gray-50 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-8 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-6 mb-2"></div>
                <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              </div>
            ))}
          </div>
        ) : weeklyProgress ? (
          <div className="grid grid-cols-7 gap-2">
            {weeklyProgress.map((day, index) => {
              const today = new Date().toISOString().split('T')[0]
              const isToday = day.date === today
              const hasActivity = day.task_count > 0

              return (
                <div
                  key={day.date}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    isToday ? 'border-theme-primary bg-purple-50 shadow-md' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-sm font-bold text-gray-600">{WEEK_DAYS[index]}</span>
                  <span className="text-xs text-gray-500">{new Date(day.date).getDate()}</span>
                  <div
                    className={`mt-2 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      hasActivity ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {day.task_count}
                  </div>
                  {day.timeslot_count > 0 && (
                    <div className="mt-1 text-xs text-green-600 font-bold">{day.timeslot_count} slots</div>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {earnedAchievements.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Earned Achievements ({earnedAchievements.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {earnedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-gradient-to-br from-theme-primary to-theme-secondary text-white rounded-xl p-3 text-center shadow-lg"
                title={achievement.description}
              >
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <div className="text-sm font-bold leading-tight">{achievement.name}</div>
                <div className="text-xs opacity-80 mt-1">+{achievement.star_reward} stars</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nextAchievements.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Next Goals</h3>
          <div className="space-y-3">
            {nextAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 border-2 border-gray-200"
              >
                <span className="text-4xl opacity-50">{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-gray-700">{achievement.name}</div>
                  <div className="text-sm text-gray-500">{achievement.description}</div>
                </div>
                <span className="text-lg font-bold text-theme-primary flex-shrink-0">+{achievement.star_reward} ⭐</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatsPage() {
  const { data: members, isLoading: membersLoading } = useMembers()
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)

  const selectedMember = members?.find((m) => m.id === selectedMemberId) || members?.[0]

  const { data: stats, isLoading: statsLoading } = useMemberStats(selectedMember?.id ?? 0)
  const { data: achievements, isLoading: achievementsLoading } = useMemberAchievements(selectedMember?.id ?? 0)

  const isLoading = membersLoading || statsLoading || achievementsLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      <header className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-10 border-b-4 border-theme-primary">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Back to Home"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary">
              Stats & Achievements
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto p-4 sm:p-6">
        {membersLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-24 h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <>
            <div className="flex gap-3 overflow-x-auto pb-4 mb-6">
              {members.map((member) => {
                const isSelected = member.id === (selectedMember?.id ?? members[0]?.id)
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl transition-all min-w-[80px] ${
                      isSelected
                        ? 'bg-gradient-to-b from-theme-primary to-theme-secondary scale-105 shadow-lg'
                        : 'bg-white hover:bg-gray-50 shadow'
                    }`}
                  >
                    <MemberAvatar
                      name={member.name}
                      avatar={member.avatar}
                      size="lg"
                      borderColor={isSelected ? 'white' : 'gray'}
                      className={isSelected ? 'text-white' : 'text-gray-600'}
                    />
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {member.name}
                    </span>
                  </button>
                )
              })}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-lg animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-2" />
                    <div className="h-12 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : stats && achievements && selectedMember ? (
              <MemberStatsView member={selectedMember} stats={stats} achievements={achievements} />
            ) : (
              <div className="text-center py-12 text-gray-500">No stats available</div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">No family members yet!</p>
            <Link
              to="/admin"
              className="inline-block px-6 py-3 bg-theme-primary hover:bg-theme-primary text-white font-semibold rounded-xl transition-colors"
            >
              Add Members in Admin Panel
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
