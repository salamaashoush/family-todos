import { Star, Flame, Check, Clock, Trophy, Coins, Target } from 'lucide-react'
import { useMemberStats, useMemberAchievements, useMemberPoints } from '../../hooks/useQueries'
import { LEVEL_PROGRESS } from '../../constants'
import type { MemberStatsCardProps } from '../../types'

interface StatRowProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  bgColor: string
}

function StatRow({ icon, label, value, color, bgColor }: StatRowProps) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${bgColor}`}>
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <span className={`text-base font-bold ${color}`}>{value}</span>
    </div>
  )
}

export function MemberStatsCard({ member }: MemberStatsCardProps) {
  const { data: stats, isLoading: statsLoading } = useMemberStats(member.id)
  const { data: achievements, isLoading: achievementsLoading } = useMemberAchievements(member.id)
  const { data: points, isLoading: pointsLoading } = useMemberPoints(member.id)

  const earnedCount = achievements?.filter((a: { earnedAt: Date | null }) => a.earnedAt).length || 0
  const isLoading = statsLoading || achievementsLoading || pointsLoading

  const level = stats?.level || 1
  const totalStars = stats?.totalStars || 0
  const levelProgress = ((totalStars % LEVEL_PROGRESS.STARS_PER_LEVEL) / LEVEL_PROGRESS.STARS_PER_LEVEL) * 100
  const starsToNextLevel = LEVEL_PROGRESS.STARS_PER_LEVEL - (totalStars % LEVEL_PROGRESS.STARS_PER_LEVEL)

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 hover:border-theme-primary/50 hover:shadow-xl transition-all">
      {/* Header with avatar and level */}
      <div className="bg-gradient-to-r from-theme-primary to-theme-secondary p-4">
        <div className="flex items-center gap-3">
          {member.avatar ? (
            <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-lg flex-shrink-0">
              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 border-3 border-white/50">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{member.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold text-white">
                <Trophy className="w-4 h-4" /> Level {level}
              </span>
            </div>
          </div>
        </div>

        {/* Level progress bar */}
        {!isLoading && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>{totalStars} stars</span>
              <span>{starsToNextLevel} to next</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <>
            <StatRow
              icon={<Star className="w-4 h-4 fill-current" />}
              label="Total Stars"
              value={totalStars}
              color="text-yellow-600"
              bgColor="bg-yellow-50"
            />
            <StatRow
              icon={<Flame className="w-4 h-4" />}
              label="Current Streak"
              value={`${stats?.currentStreak || 0}d`}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <StatRow
              icon={<Target className="w-4 h-4" />}
              label="Best Streak"
              value={`${stats?.longestStreak || 0}d`}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <StatRow
              icon={<Check className="w-4 h-4" />}
              label="Tasks Done"
              value={stats?.totalTasksCompleted || 0}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <StatRow
              icon={<Clock className="w-4 h-4" />}
              label="Timeslots"
              value={stats?.totalTimeslotsCompleted || 0}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatRow
              icon={<Coins className="w-4 h-4" />}
              label="Points"
              value={points || 0}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />

            {/* Achievements section */}
            <div className="pt-2 border-t border-gray-200 mt-2">
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-theme-primary"><Trophy className="w-4 h-4" /></span>
                  <span className="text-sm font-medium text-gray-600">Achievements</span>
                </div>
                <span className="text-base font-bold text-theme-primary">{earnedCount}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
