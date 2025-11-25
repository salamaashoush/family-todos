import { useMemberStats, useMemberAchievements } from '../../hooks/useQueries'
import type { MemberStatsCardProps } from '../../types'

export function MemberStatsCard({ member }: MemberStatsCardProps) {
  const { data: stats, isLoading: statsLoading } = useMemberStats(member.id)
  const { data: achievements, isLoading: achievementsLoading } = useMemberAchievements(member.id)

  const earnedCount = achievements?.filter((a: { earned_at: string | null }) => a.earned_at).length || 0
  const isLoading = statsLoading || achievementsLoading

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-theme-primary/20">
      <div className="bg-gradient-to-r from-theme-primary to-theme-secondary p-4 text-center">
        {member.avatar && (
          <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h3 className="text-lg font-bold text-white">{member.name}</h3>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Level</span>
              <span className="text-lg font-bold text-theme-primary">{stats?.level || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Total Stars</span>
              <span className="text-lg font-bold text-yellow-600">{stats?.total_stars || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Current Streak</span>
              <span className="text-lg font-bold text-orange-600">{stats?.current_streak || 0} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Longest Streak</span>
              <span className="text-lg font-bold text-red-600">{stats?.longest_streak || 0} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Tasks Done</span>
              <span className="text-lg font-bold text-green-600">{stats?.total_tasks_completed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Timeslots Done</span>
              <span className="text-lg font-bold text-blue-600">{stats?.total_timeslots_completed || 0}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t-2 border-gray-200">
              <span className="text-sm font-semibold text-gray-600">Achievements</span>
              <span className="text-lg font-bold text-theme-primary">{earnedCount}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
