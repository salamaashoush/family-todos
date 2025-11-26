import { useMemberStats, useMemberAchievements, useMemberPoints } from '../../hooks/useQueries'
import { LEVEL_PROGRESS } from '../../constants'
import type { MemberStatsCardProps } from '../../types'

// Small icon components for stat rows
const StarIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const FireIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.55 5-8.03V5c0-.55.45-1 1-1s1 .45 1 1v.97c.96-.59 2.04-1.03 3.21-1.25.75-.14 1.29.68.88 1.34-.25.4-.68.65-1.09.79-1.07.36-2.02.96-2.78 1.73C8.24 10.58 7 12.67 7 15c0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.08-2-4-.55-.42-.63-1.2-.16-1.69.47-.49 1.25-.46 1.77.01C18.81 10.97 20 13.31 20 16c0 3.87-3.13 7-7 7h-1z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TrophyIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
  </svg>
)

const CoinIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
  </svg>
)

const TargetIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

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

  const earnedCount = achievements?.filter((a: { earned_at: string | null }) => a.earned_at).length || 0
  const isLoading = statsLoading || achievementsLoading || pointsLoading

  const level = stats?.level || 1
  const totalStars = stats?.total_stars || 0
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
                <TrophyIcon /> Level {level}
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
              icon={<StarIcon />}
              label="Total Stars"
              value={totalStars}
              color="text-yellow-600"
              bgColor="bg-yellow-50"
            />
            <StatRow
              icon={<FireIcon />}
              label="Current Streak"
              value={`${stats?.current_streak || 0}d`}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <StatRow
              icon={<TargetIcon />}
              label="Best Streak"
              value={`${stats?.longest_streak || 0}d`}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <StatRow
              icon={<CheckIcon />}
              label="Tasks Done"
              value={stats?.total_tasks_completed || 0}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <StatRow
              icon={<ClockIcon />}
              label="Timeslots"
              value={stats?.total_timeslots_completed || 0}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatRow
              icon={<CoinIcon />}
              label="Points"
              value={points || 0}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />

            {/* Achievements section */}
            <div className="pt-2 border-t border-gray-200 mt-2">
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-theme-primary"><TrophyIcon /></span>
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
