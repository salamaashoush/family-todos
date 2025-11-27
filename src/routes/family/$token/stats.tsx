import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Gift, Star, Flame, Check, Target, Link2, ChevronLeft, BarChart3, ChevronDown } from 'lucide-react'
import { useLevelUpCelebration } from '../../../hooks/useCelebration'
import { MemberAvatar } from '../../../components/shared'
import { Modal } from '../../../components/shared/Modal'
import { Button } from '../../../components/shared/Button'
import { Toast, showToast } from '../../../components/Toast'
import { LEVEL_PROGRESS, WEEK_DAYS } from '../../../constants'
import {
  getPublicMembers,
  getPublicMemberStats,
  getPublicMemberPoints,
  getPublicMemberAchievements,
  getPublicActiveRewards,
  getPublicWeeklyProgress,
  publicRequestRedemption,
  getPublicMemberRedemptions,
} from '../../../server/publicBoard'
import type { MemberStats, Achievement, Reward } from '../../../types'

const tabIds = ['stats', 'rewards'] as const
type TabId = (typeof tabIds)[number]

const searchSchema = z.object({
  tab: z.enum(tabIds).optional().catch('stats'),
  member: z.number().optional(),
})

export const Route = createFileRoute('/family/$token/stats')({
  validateSearch: searchSchema,
  loader: async ({ params: { token } }) => {
    // Validate token format - same protection as the family board
    if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
      throw new Error("Invalid board link");
    }
    return { token };
  },
  component: StatsPage,
  errorComponent: StatsError,
})

function StatsError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Link2 className="w-10 h-10 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Invalid Board Link
        </h1>
        <p className="text-gray-600 mb-6">
          This family board link is invalid or has expired. Please ask your family admin for a new link.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-theme-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}

type RedemptionWithReward = {
  id: number
  memberId: number
  rewardId: number
  pointsSpent: number
  status: "pending" | "approved" | "rejected" | "fulfilled"
  requestedAt: Date
  processedAt: Date | null
  notes: string | null
  rewardName: string
  rewardIcon: string | null
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'stats',
    label: 'Stats & Achievements',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: 'rewards',
    label: 'Rewards Store',
    icon: <Gift className="w-4 h-4" />,
  },
]

interface MemberStatsViewProps {
  stats: MemberStats
  achievements: (Achievement & { earnedAt: Date | null })[]
  token: string
  memberId: number
}

function MemberStatsView({ stats, achievements, token, memberId }: MemberStatsViewProps) {
  const earnedAchievements = achievements.filter((a) => a.earnedAt)
  const nextAchievements = achievements.filter((a) => !a.earnedAt).slice(0, 3)
  const levelProgress = ((stats.totalStars % LEVEL_PROGRESS.STARS_PER_LEVEL) / LEVEL_PROGRESS.STARS_PER_LEVEL) * 100

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

  const { data: weeklyProgress, isLoading: weeklyLoading } = useQuery({
    queryKey: ['public-weekly-progress', token, memberId, weekStart],
    queryFn: () => getPublicWeeklyProgress({ data: { token, memberId, weekStart } }),
    enabled: !!memberId && !!token,
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-yellow-400">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-8 h-8 text-yellow-500 fill-current" />
            <span className="text-sm font-bold text-gray-600">Level {stats.level}</span>
          </div>
          <div className="text-4xl font-bold text-theme-primary">{stats.totalStars}</div>
          <div className="text-sm text-gray-500">Total Stars</div>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            {LEVEL_PROGRESS.STARS_PER_LEVEL - (stats.totalStars % LEVEL_PROGRESS.STARS_PER_LEVEL)} stars to Level {stats.level + 1}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-orange-400">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-8 h-8 text-orange-500" />
            <span className="text-sm font-bold text-gray-600">Streak</span>
          </div>
          <div className="text-4xl font-bold text-orange-600">{stats.currentStreak}</div>
          <div className="text-sm text-gray-500">{stats.currentStreak === 1 ? 'Day' : 'Days'}</div>
          <div className="text-sm text-gray-600 mt-3">
            Best streak: <span className="font-bold">{stats.longestStreak} days</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-green-400">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-8 h-8 text-green-500" strokeWidth={2.5} />
            <span className="text-sm font-bold text-gray-600">Tasks</span>
          </div>
          <div className="text-4xl font-bold text-green-600">{stats.totalTasksCompleted}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-theme-primary">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-8 h-8 text-theme-primary" />
            <span className="text-sm font-bold text-gray-600">Timeslots</span>
          </div>
          <div className="text-4xl font-bold text-theme-primary">{stats.totalTimeslotsCompleted}</div>
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
              const hasActivity = day.taskCount > 0

              return (
                <div
                  key={day.date}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    isToday ? 'border-theme-primary bg-theme-primary/10 shadow-md' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-sm font-bold text-gray-600">{WEEK_DAYS[index]}</span>
                  <span className="text-xs text-gray-500">{new Date(day.date).getDate()}</span>
                  <div
                    className={`mt-2 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      hasActivity ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {day.taskCount}
                  </div>
                  {day.timeslotCount > 0 && (
                    <div className="mt-1 text-xs text-green-600 font-bold">{day.timeslotCount} slots</div>
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
                title={achievement.description ?? undefined}
              >
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <div className="text-sm font-bold leading-tight">{achievement.name}</div>
                <div className="text-xs opacity-80 mt-1">+{achievement.starReward} stars</div>
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
                <span className="text-lg font-bold text-theme-primary flex-shrink-0 flex items-center gap-1">+{achievement.starReward} <Star className="w-5 h-5 fill-current" /></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface RewardsViewProps {
  memberId: number
  memberName: string
  token: string
}

function RewardsView({ memberId, memberName, token }: RewardsViewProps) {
  const queryClient = useQueryClient()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [showRedeemModal, setShowRedeemModal] = useState(false)

  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['public-active-rewards', token],
    queryFn: () => getPublicActiveRewards({ data: { token } }),
    enabled: !!token,
  })

  const { data: memberPoints } = useQuery({
    queryKey: ['public-member-points-single', token, memberId],
    queryFn: async () => {
      const allPoints = await getPublicMemberPoints({ data: { token } })
      const memberData = allPoints.find((p) => p.member_id === memberId)
      return memberData?.total || 0
    },
    enabled: !!memberId && !!token,
  })

  const { data: memberRedemptions } = useQuery({
    queryKey: ['public-member-redemptions', token, memberId],
    queryFn: () => getPublicMemberRedemptions({ data: { token, memberId } }),
    enabled: !!memberId && !!token,
  })

  const redeemMutation = useMutation({
    mutationFn: publicRequestRedemption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-member-points-single', token, memberId] })
      queryClient.invalidateQueries({ queryKey: ['public-member-redemptions', token, memberId] })
      showToast('Reward requested! Wait for parent approval.', 'success')
      setShowRedeemModal(false)
      setSelectedReward(null)
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to request reward', 'error')
    },
  })

  const handleSelectReward = (reward: Reward) => {
    if ((memberPoints || 0) < reward.pointCost) {
      showToast(`You need ${reward.pointCost - (memberPoints || 0)} more points!`, 'error')
      return
    }
    setSelectedReward(reward)
    setShowRedeemModal(true)
  }

  const handleConfirmRedeem = () => {
    if (!selectedReward) return
    redeemMutation.mutate({
      data: {
        token,
        memberId,
        rewardId: selectedReward.id,
      },
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pending</span>
      case 'approved':
        return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Approved</span>
      case 'fulfilled':
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Received</span>
      case 'rejected':
        return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Rejected</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Points Balance Card */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-yellow-400">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-600 mb-1">Available Points</div>
            <div className="text-4xl font-bold text-yellow-600 flex items-center gap-2">
              <Star className="w-5 h-5 fill-current" />
              {memberPoints || 0}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Star className="w-5 h-5 fill-current" />
          </div>
        </div>
      </div>

      {/* Available Rewards */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Available Rewards</h3>
        {rewardsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full mb-3" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : rewards && rewards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rewards.map((reward: Reward) => {
              const canAfford = (memberPoints || 0) >= reward.pointCost
              return (
                <button
                  key={reward.id}
                  onClick={() => handleSelectReward(reward)}
                  disabled={!canAfford}
                  className={`bg-gray-50 rounded-xl p-4 text-left transition-all ${
                    canAfford
                      ? 'hover:shadow-lg hover:scale-102 cursor-pointer border-2 border-transparent hover:border-theme-primary/50'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-3xl">
                      {reward.icon || <Gift className="w-8 h-8" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 text-lg">{reward.name}</h4>
                      {reward.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-5 h-5 fill-current" />
                        <span className={`font-bold ${canAfford ? 'text-yellow-600' : 'text-red-500'}`}>
                          {reward.pointCost} points
                        </span>
                        {!canAfford && (
                          <span className="text-xs text-gray-400 ml-2">
                            (need {reward.pointCost - (memberPoints || 0)} more)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              <Gift className="w-8 h-8" />
            </div>
            <p className="text-gray-500">No rewards available yet</p>
            <p className="text-sm text-gray-400 mt-1">Ask a parent to add some rewards!</p>
          </div>
        )}
      </div>

      {/* Redemption History */}
      {memberRedemptions && memberRedemptions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">My Requests</h3>
          <div className="space-y-3">
            {memberRedemptions.map((redemption: RedemptionWithReward) => (
              <div
                key={redemption.id}
                className="bg-gray-50 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xl">
                    {redemption.rewardIcon || <Gift className="w-8 h-8" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{redemption.rewardName}</h4>
                    <p className="text-xs text-gray-400">
                      {new Date(redemption.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {getStatusBadge(redemption.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redeem confirmation modal */}
      <Modal
        isOpen={showRedeemModal}
        onClose={() => {
          setShowRedeemModal(false)
          setSelectedReward(null)
        }}
        title="Redeem Reward?"
      >
        {selectedReward && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-4xl mb-4">
              {selectedReward.icon || <Gift className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedReward.name}</h3>
            <p className="text-gray-500 mb-4">{selectedReward.description}</p>
            <div className="flex items-center justify-center gap-2 text-lg mb-6">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-bold text-yellow-600">{selectedReward.pointCost} points</span>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              {memberName}, are you sure you want to redeem this reward?
              <br />
              <span className="text-gray-400">A parent will need to approve your request.</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRedeemModal(false)
                  setSelectedReward(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRedeem}
                isLoading={redeemMutation.isPending}
              >
                Redeem
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function StatsPage() {
  const { token } = Route.useParams()
  const { tab, member: memberIdFromUrl } = Route.useSearch()
  const navigate = useNavigate()
  const activeTab: TabId = tab || 'stats'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fetch members using public API with token
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['public-members', token],
    queryFn: () => getPublicMembers({ data: { token } }),
    enabled: !!token,
  })

  // Use member from URL or default to first member
  const selectedMember = useMemo(() => {
    if (!members) return undefined
    if (memberIdFromUrl) {
      const found = members.find((m) => m.id === memberIdFromUrl)
      if (found) return found
    }
    return members[0]
  }, [members, memberIdFromUrl])

  const setActiveTab = useCallback((tabId: TabId) => {
    navigate({ to: '/family/$token/stats', params: { token }, search: { tab: tabId, member: selectedMember?.id }, replace: true })
  }, [navigate, selectedMember?.id, token])

  const setSelectedMember = useCallback((memberId: number) => {
    navigate({ to: '/family/$token/stats', params: { token }, search: { tab: activeTab, member: memberId }, replace: true })
  }, [navigate, activeTab, token])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch member stats using public API
  const { data: allMemberStats, isLoading: statsLoading } = useQuery({
    queryKey: ['public-member-stats', token],
    queryFn: () => getPublicMemberStats({ data: { token } }),
    enabled: !!token,
  })

  const stats = useMemo(() => {
    if (!allMemberStats || !selectedMember) return null
    return allMemberStats.find((s) => s.memberId === selectedMember.id) || null
  }, [allMemberStats, selectedMember])

  // Fetch achievements using public API
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['public-member-achievements', token, selectedMember?.id],
    queryFn: () => getPublicMemberAchievements({ data: { token, memberId: selectedMember!.id } }),
    enabled: !!token && !!selectedMember,
  })

  const isLoading = membersLoading || statsLoading || achievementsLoading
  const activeTabData = tabs.find((t) => t.id === activeTab)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      <Toast />

      <header className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b-2 border-theme-primary/20">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/family/$token"
                params={{ token }}
                className="flex items-center justify-center p-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2"
                aria-label="Back to Family Board"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h1 className="hidden sm:block text-lg lg:text-xl font-bold text-gray-800">
                Stats & Rewards
              </h1>
            </div>
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
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Member selector */}
            <div className="flex gap-3 overflow-x-auto p-4 border-b border-gray-100">
              {members.map((member) => {
                const isSelected = member.id === selectedMember?.id
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl transition-all min-w-[80px] focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-inset ${
                      isSelected
                        ? 'bg-gradient-to-b from-theme-primary to-theme-secondary scale-105 shadow-lg'
                        : 'bg-gray-50 hover:bg-gray-100 shadow'
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

            {/* Mobile Tab Selector */}
            <div className="md:hidden border-b-4 border-theme-primary/20" ref={menuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-theme-primary to-theme-secondary text-white"
              >
                <div className="flex items-center gap-3">
                  {activeTabData.icon}
                  <span className="font-bold">{activeTabData.label}</span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {mobileMenuOpen && (
                <div className="bg-white border-t border-gray-100">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                        activeTab === tab.id
                          ? 'bg-theme-primary/10 text-theme-primary'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={activeTab === tab.id ? 'text-theme-primary' : 'text-gray-400'}>
                        {tab.icon}
                      </span>
                      <span className="font-medium">{tab.label}</span>
                      {activeTab === tab.id && (
                        <Check className="w-5 h-5 ml-auto text-theme-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex border-b-4 border-theme-primary/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`flex-shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {activeTab === 'stats' ? (
                isLoading ? (
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
                  <MemberStatsView stats={stats} achievements={achievements} token={token} memberId={selectedMember.id} />
                ) : (
                  <div className="text-center py-12 text-gray-500">No stats available</div>
                )
              ) : selectedMember ? (
                <RewardsView memberId={selectedMember.id} memberName={selectedMember.name} token={token} />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">No family members found</p>
          </div>
        )}
      </div>
    </div>
  )
}
