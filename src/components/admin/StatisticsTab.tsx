import { useMemo, useState } from 'react'
import { useMembers, useAllAchievements } from '../../hooks/useQueries'
import { MemberStatsCard } from './MemberStatsCard'
import { useMemberStats, useMemberAchievements } from '../../hooks/useQueries'
import type { Member, Achievement, MemberStats } from '../../types'

// Icon components
const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const FireIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.55 5-8.03V5c0-.55.45-1 1-1s1 .45 1 1v.97c.96-.59 2.04-1.03 3.21-1.25.75-.14 1.29.68.88 1.34-.25.4-.68.65-1.09.79-1.07.36-2.02.96-2.78 1.73C8.24 10.58 7 12.67 7 15c0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.08-2-4-.55-.42-.63-1.2-.16-1.69.47-.49 1.25-.46 1.77.01C18.81 10.97 20 13.31 20 16c0 3.87-3.13 7-7 7h-1z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TrophyIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// Aggregate stats component
interface AggregateStatsProps {
  members: Member[]
}

function AggregateStatsSection({ members }: AggregateStatsProps) {
  // Fetch stats for all members
  const memberStatsQueries = members.map((member) => ({
    memberId: member.id,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    stats: useMemberStats(member.id),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    achievements: useMemberAchievements(member.id),
  }))

  const isLoading = memberStatsQueries.some((q) => q.stats.isLoading || q.achievements.isLoading)

  const aggregateData = useMemo(() => {
    if (isLoading) return null

    let totalStars = 0
    let totalTasks = 0
    let totalTimeslots = 0
    let totalAchievements = 0
    let highestStreak = 0
    let highestLevel = 0
    let topPerformer: { name: string; stars: number } | null = null

    memberStatsQueries.forEach((query, index) => {
      const stats = query.stats.data as MemberStats | undefined
      const achievements = query.achievements.data as { earned_at: string | null }[] | undefined

      if (stats) {
        totalStars += stats.total_stars
        totalTasks += stats.total_tasks_completed
        totalTimeslots += stats.total_timeslots_completed
        if (stats.longest_streak > highestStreak) highestStreak = stats.longest_streak
        if (stats.level > highestLevel) highestLevel = stats.level
        if (!topPerformer || stats.total_stars > topPerformer.stars) {
          topPerformer = { name: members[index].name, stars: stats.total_stars }
        }
      }

      if (achievements) {
        totalAchievements += achievements.filter((a) => a.earned_at).length
      }
    })

    return { totalStars, totalTasks, totalTimeslots, totalAchievements, highestStreak, highestLevel, topPerformer }
  }, [isLoading, memberStatsQueries, members])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border-2 border-gray-200 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!aggregateData) return null

  const statCards = [
    {
      label: 'Total Stars',
      value: aggregateData.totalStars,
      icon: <StarIcon />,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
    },
    {
      label: 'Tasks Done',
      value: aggregateData.totalTasks,
      icon: <CheckIcon />,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
    },
    {
      label: 'Timeslots',
      value: aggregateData.totalTimeslots,
      icon: <ClockIcon />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
    },
    {
      label: 'Achievements',
      value: aggregateData.totalAchievements,
      icon: <TrophyIcon />,
      color: 'text-theme-primary',
      bgColor: 'bg-theme-primary/10',
      borderColor: 'border-theme-primary/30',
    },
    {
      label: 'Best Streak',
      value: `${aggregateData.highestStreak}d`,
      icon: <FireIcon />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
    },
    {
      label: 'Members',
      value: members.length,
      icon: <UsersIcon />,
      color: 'text-theme-secondary',
      bgColor: 'bg-theme-secondary/10',
      borderColor: 'border-theme-secondary/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bgColor} rounded-xl p-4 border-2 ${stat.borderColor} transition-all hover:shadow-md`}
        >
          <div className={`${stat.color} mb-2`}>{stat.icon}</div>
          <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// Group achievements by requirement type
function groupAchievementsByType(achievements: Achievement[]) {
  const groups: Record<string, Achievement[]> = {}

  achievements.forEach((achievement) => {
    const type = achievement.requirement_type
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(achievement)
  })

  // Sort each group by requirement value
  Object.keys(groups).forEach((type) => {
    groups[type].sort((a, b) => a.requirement_value - b.requirement_value)
  })

  return groups
}

// Get friendly name for achievement type
function getTypeFriendlyName(type: string): string {
  const names: Record<string, string> = {
    tasks_completed: 'Task Completion',
    timeslots_completed: 'Timeslot Completion',
    current_streak: 'Streak',
    total_stars: 'Star Collection',
    level: 'Level',
  }
  return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Get icon for achievement type
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    tasks_completed: '✅',
    timeslots_completed: '🎯',
    current_streak: '🔥',
    total_stars: '⭐',
    level: '🏆',
  }
  return icons[type] || '🎖️'
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, count, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h2>
          {count !== undefined && (
            <span className="bg-gray-200 text-gray-600 text-sm font-medium px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <div className="p-2 rounded-lg text-gray-500 group-hover:bg-gray-100 group-hover:text-gray-700 transition-colors">
          <ChevronIcon isOpen={isOpen} />
        </div>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </section>
  )
}

export function StatisticsTab() {
  const { data: members, isLoading: membersLoading } = useMembers()
  const { data: achievements, isLoading: achievementsLoading } = useAllAchievements()

  const groupedAchievements = useMemo(() => {
    if (!achievements) return {}
    return groupAchievementsByType(achievements)
  }, [achievements])

  return (
    <div className="space-y-8">
      {/* Aggregate Overview Section */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Family Overview</h2>
        {membersLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 border-2 border-gray-200 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <AggregateStatsSection members={members} />
        ) : (
          <div className="bg-white rounded-xl p-8 border-2 border-gray-200 text-center text-gray-500">
            No members yet. Add family members to see statistics.
          </div>
        )}
      </section>

      {/* Member Stats Section - Collapsible with horizontal scroll */}
      <CollapsibleSection title="Member Statistics" count={members?.length} defaultOpen={true}>
        {membersLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-72 bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 animate-pulse snap-start">
                <div className="h-20 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
            {members.map((member: Member) => (
              <div key={member.id} className="flex-shrink-0 w-72 snap-start">
                <MemberStatsCard member={member} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 border-2 border-gray-200 text-center text-gray-500">
            No members yet. Add family members to see their individual stats.
          </div>
        )}
      </CollapsibleSection>

      {/* Achievements Section - Collapsible, grouped by type */}
      <CollapsibleSection title="Achievement Catalog" count={achievements?.length} defaultOpen={false}>
        {achievementsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border-2 border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-24 bg-gray-100 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : achievements && achievements.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedAchievements).map(([type, typeAchievements]) => (
              <CollapsibleAchievementGroup
                key={type}
                type={type}
                achievements={typeAchievements}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 border-2 border-gray-200 text-center text-gray-500">
            No achievements configured yet.
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}

// Collapsible achievement group component
interface CollapsibleAchievementGroupProps {
  type: string
  achievements: Achievement[]
}

function CollapsibleAchievementGroup({ type, achievements }: CollapsibleAchievementGroupProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-4 sm:p-5 hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl">{getTypeIcon(type)}</span>
        <h3 className="text-lg font-bold text-gray-800">{getTypeFriendlyName(type)}</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {achievements.length}
        </span>
        <div className="ml-auto p-1 text-gray-500">
          <ChevronIcon isOpen={isOpen} />
        </div>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 sm:p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {achievements.map((achievement: Achievement) => (
            <div
              key={achievement.id}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 hover:border-theme-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 text-sm leading-tight truncate">
                    {achievement.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{achievement.description}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-xs font-medium text-theme-primary">
                      {achievement.requirement_value} {type.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-yellow-100 border border-yellow-300 rounded-full px-2 py-0.5 text-xs font-bold text-yellow-700">
                      +{achievement.star_reward} <StarIcon />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
