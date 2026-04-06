import { useMemo, useState } from 'react'
import { ChevronDown, Star, Flame, CheckCircle, Trophy, Users, Clock } from 'lucide-react'
import { useMembers } from '../../hooks/useCollections'
import { useAllAchievements } from '../../hooks/useQueries'
import { MemberStatsCard } from './MemberStatsCard'
import type { Member, Achievement, MemberStats } from '../../types'
import { useQueries } from '@tanstack/react-query'
import { getMemberStats, getMemberAchievements } from '../../server/statistics'
import { useCurrentFamilyId } from '../../hooks/useFamilyContext'

// Aggregate stats component
interface AggregateStatsProps {
  members: Member[]
}

function AggregateStatsSection({ members }: AggregateStatsProps) {
  const familyId = useCurrentFamilyId()

  const statsQueries = useQueries({
    queries: members.map((member) => ({
      queryKey: ['memberStats', familyId, member.id],
      queryFn: () => getMemberStats({ data: { memberId: member.id } }),
      enabled: familyId !== undefined,
    })),
  })

  const achievementsQueries = useQueries({
    queries: members.map((member) => ({
      queryKey: ['memberAchievements', familyId, member.id],
      queryFn: () => getMemberAchievements({ data: { memberId: member.id } }),
      enabled: familyId !== undefined,
    })),
  })

  const isLoading = statsQueries.some((q) => q.isLoading) || achievementsQueries.some((q) => q.isLoading)

  const aggregateData = useMemo(() => {
    if (isLoading) return null

    let totalStars = 0
    let totalTasks = 0
    let totalTimeslots = 0
    let totalAchievements = 0
    let highestStreak = 0
    let highestLevel = 0
    let topPerformer: { name: string; stars: number } | null = null

    statsQueries.forEach((query, index) => {
      const stats = query.data as MemberStats | undefined
      const achievements = achievementsQueries[index]?.data as { earnedAt: string | null }[] | undefined

      if (stats) {
        totalStars += stats.totalStars
        totalTasks += stats.totalTasksCompleted
        totalTimeslots += stats.totalTimeslotsCompleted
        if (stats.longestStreak > highestStreak) highestStreak = stats.longestStreak
        if (stats.level > highestLevel) highestLevel = stats.level
        if (!topPerformer || stats.totalStars > topPerformer.stars) {
          topPerformer = { name: members[index].name, stars: stats.totalStars }
        }
      }

      if (achievements) {
        totalAchievements += achievements.filter((a) => a.earnedAt).length
      }
    })

    return { totalStars, totalTasks, totalTimeslots, totalAchievements, highestStreak, highestLevel, topPerformer }
  }, [isLoading, statsQueries, achievementsQueries, members])

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
      icon: <Star className="w-6 h-6 fill-current" />,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
    },
    {
      label: 'Tasks Done',
      value: aggregateData.totalTasks,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
    },
    {
      label: 'Timeslots',
      value: aggregateData.totalTimeslots,
      icon: <Clock className="w-6 h-6" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
    },
    {
      label: 'Achievements',
      value: aggregateData.totalAchievements,
      icon: <Trophy className="w-6 h-6" />,
      color: 'text-theme-primary',
      bgColor: 'bg-theme-primary/10',
      borderColor: 'border-theme-primary/30',
    },
    {
      label: 'Best Streak',
      value: `${aggregateData.highestStreak}d`,
      icon: <Flame className="w-6 h-6" />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
    },
    {
      label: 'Members',
      value: members.length,
      icon: <Users className="w-6 h-6" />,
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
    const type = achievement.requirementType
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(achievement)
  })

  // Sort each group by requirement value
  Object.keys(groups).forEach((type) => {
    groups[type].sort((a, b) => a.requirementValue - b.requirementValue)
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
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
                      {achievement.requirementValue} {type.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-yellow-100 border border-yellow-300 rounded-full px-2 py-0.5 text-xs font-bold text-yellow-700">
                      +{achievement.starReward} <Star className="w-3 h-3 fill-current" />
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
