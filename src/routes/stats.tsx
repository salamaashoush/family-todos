import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMembers, useMemberStats, useMemberAchievements, useWeeklyProgress } from '../hooks/useQueries'
import { useLevelUpCelebration } from '../hooks/useCelebration'
import { MemberAvatar } from '../components/shared'
import { Modal } from '../components/shared/Modal'
import { Button } from '../components/shared/Button'
import { Toast, showToast } from '../components/Toast'
import { LEVEL_PROGRESS, WEEK_DAYS } from '../constants'
import { getMembers } from '../server/members'
import { getActiveRewards, getMemberPoints, requestRedemption, getMemberRedemptions } from '../server/rewards'
import type { MemberStats, Achievement, Reward } from '../types'

export const Route = createFileRoute('/stats')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: ['members'],
      queryFn: () => getMembers(),
    })
  },
  component: StatsPage,
})

type Tab = 'stats' | 'rewards'

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

const GiftIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

const StarIconLarge = () => (
  <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const FireIcon = () => (
  <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.55 5-8.03V5c0-.55.45-1 1-1s1 .45 1 1v.97c.96-.59 2.04-1.03 3.21-1.25.75-.14 1.29.68.88 1.34-.25.4-.68.65-1.09.79-1.07.36-2.02.96-2.78 1.73C8.24 10.58 7 12.67 7 15c0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.08-2-4-.55-.42-.63-1.2-.16-1.69.47-.49 1.25-.46 1.77.01C18.81 10.97 20 13.31 20 16c0 3.87-3.13 7-7 7h-1z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const TargetIcon = () => (
  <svg className="w-8 h-8 text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)

interface MemberStatsViewProps {
  stats: MemberStats
  achievements: (Achievement & { earnedAt: Date | null })[]
}

function MemberStatsView({ stats, achievements }: MemberStatsViewProps) {
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

  const { data: weeklyProgress, isLoading: weeklyLoading } = useWeeklyProgress(stats.memberId, weekStart)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-yellow-400">
          <div className="flex items-center gap-2 mb-2">
            <StarIconLarge />
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
            <FireIcon />
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
            <CheckIcon />
            <span className="text-sm font-bold text-gray-600">Tasks</span>
          </div>
          <div className="text-4xl font-bold text-green-600">{stats.totalTasksCompleted}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-theme-primary">
          <div className="flex items-center gap-2 mb-2">
            <TargetIcon />
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
                <span className="text-lg font-bold text-theme-primary flex-shrink-0 flex items-center gap-1">+{achievement.starReward} <StarIcon /></span>
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
}

function RewardsView({ memberId, memberName }: RewardsViewProps) {
  const queryClient = useQueryClient()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [showRedeemModal, setShowRedeemModal] = useState(false)

  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['activeRewards'],
    queryFn: () => getActiveRewards(),
  })

  const { data: memberPoints } = useQuery({
    queryKey: ['memberPoints', memberId],
    queryFn: () => getMemberPoints({ data: { memberId } }),
    enabled: !!memberId,
  })

  const { data: memberRedemptions } = useQuery({
    queryKey: ['memberRedemptions', memberId],
    queryFn: () => getMemberRedemptions({ data: { memberId } }),
    enabled: !!memberId,
  })

  const redeemMutation = useMutation({
    mutationFn: requestRedemption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberPoints', memberId] })
      queryClient.invalidateQueries({ queryKey: ['memberRedemptions', memberId] })
      queryClient.invalidateQueries({ queryKey: ['pendingRedemptions'] })
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
              <StarIcon />
              {memberPoints || 0}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <StarIcon />
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
                      {reward.icon || <GiftIcon />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 text-lg">{reward.name}</h4>
                      {reward.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <StarIcon />
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
              <GiftIcon />
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
                    {redemption.rewardIcon || <GiftIcon />}
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
              {selectedReward.icon || <GiftIcon />}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedReward.name}</h3>
            <p className="text-gray-500 mb-4">{selectedReward.description}</p>
            <div className="flex items-center justify-center gap-2 text-lg mb-6">
              <StarIcon />
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
  const { data: members, isLoading: membersLoading } = useMembers()
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('stats')

  const selectedMember = members?.find((m) => m.id === selectedMemberId) || members?.[0]

  const { data: stats, isLoading: statsLoading } = useMemberStats(selectedMember?.id ?? 0)
  const { data: achievements, isLoading: achievementsLoading } = useMemberAchievements(selectedMember?.id ?? 0)

  const isLoading = membersLoading || statsLoading || achievementsLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      <Toast />

      <header className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-10 border-b-4 border-theme-primary">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2"
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
              Stats & Rewards
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
            {/* Member selector */}
            <div className="flex gap-3 overflow-x-auto p-2 mb-4">
              {members.map((member) => {
                const isSelected = member.id === (selectedMember?.id ?? members[0]?.id)
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl transition-all min-w-[80px] focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-inset ${
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

            {/* Tab switcher */}
            <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow">
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  activeTab === 'stats'
                    ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Stats & Achievements
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  activeTab === 'rewards'
                    ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Rewards Store
              </button>
            </div>

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
                <MemberStatsView stats={stats} achievements={achievements} />
              ) : (
                <div className="text-center py-12 text-gray-500">No stats available</div>
              )
            ) : selectedMember ? (
              <RewardsView memberId={selectedMember.id} memberName={selectedMember.name} />
            ) : null}
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
