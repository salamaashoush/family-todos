import { useMembers, useAllAchievements } from '../../hooks/useQueries'
import { MemberStatsCard } from './MemberStatsCard'
import type { Member, Achievement } from '../../types'

export function StatisticsTab() {
  const { data: members, isLoading: membersLoading } = useMembers()
  const { data: achievements, isLoading: achievementsLoading } = useAllAchievements()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Statistics Overview</h2>
        {membersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-theme-primary/20 animate-pulse">
                <div className="h-24 bg-gray-200"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {members?.map((member: Member) => <MemberStatsCard key={member.id} member={member} />)}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">All Achievements</h2>
        {achievementsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-theme-primary/20 rounded-xl p-4 shadow-md animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements?.map((achievement: Achievement) => (
            <div
              key={achievement.id}
              className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-theme-primary/20 rounded-xl p-4 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl">{achievement.icon}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{achievement.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-theme-primary">
                      Requirement: {achievement.requirement_value}{' '}
                      {achievement.requirement_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 inline-block bg-yellow-100 border-2 border-yellow-400 rounded-full px-3 py-1 text-sm font-bold text-yellow-700">
                    +{achievement.star_reward} Stars
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
