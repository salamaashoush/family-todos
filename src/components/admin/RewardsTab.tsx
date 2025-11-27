import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Gift, Star, Search, CheckCircle, PlusCircle } from 'lucide-react'
import { useRewardMutations, useRedemptionMutations } from '../../hooks/useAdminMutations'
import { getRewards, getPendingRedemptions } from '../../server/rewards'
import { Modal, ConfirmDialog, Button, Input, Select, SkeletonCard, EmptyState, Badge } from '../shared'
import { AdminCard } from './AdminCard'
import { RewardForm } from './RewardForm'
import type { Reward, RewardRedemption } from '../../types'

interface RewardFormData {
  name: string
  description: string
  icon: string
  pointCost: number
  isActive: boolean
}

type PendingRedemptionWithDetails = RewardRedemption & {
  memberName: string
  rewardName: string
}

export function RewardsTab() {
  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => getRewards(),
  })
  const { data: pendingRedemptions } = useQuery({
    queryKey: ['pendingRedemptions'],
    queryFn: () => getPendingRedemptions(),
  })

  const { create, update, remove } = useRewardMutations()
  const { process: processRedemption } = useRedemptionMutations()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [deletingReward, setDeletingReward] = useState<Reward | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [activeSection, setActiveSection] = useState<'rewards' | 'redemptions'>('rewards')

  const filteredRewards = useMemo(() => {
    if (!rewards) return []
    return rewards.filter((reward: Reward) => {
      const matchesSearch =
        searchQuery === '' ||
        reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reward.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && reward.isActive) ||
        (filterStatus === 'inactive' && !reward.isActive)
      return matchesSearch && matchesStatus
    })
  }, [rewards, searchQuery, filterStatus])

  const handleAdd = async (data: RewardFormData) => {
    create.mutate({
      data: {
        name: data.name,
        description: data.description || undefined,
        icon: data.icon || undefined,
        pointCost: data.pointCost,
      },
    })
    setIsModalOpen(false)
  }

  const handleUpdate = async (data: RewardFormData) => {
    if (!editingReward) return
    update.mutate({
      data: {
        id: editingReward.id,
        name: data.name,
        description: data.description || undefined,
        icon: data.icon || undefined,
        pointCost: data.pointCost,
        isActive: data.isActive,
      },
    })
    setIsModalOpen(false)
    setEditingReward(null)
  }

  const handleDelete = () => {
    if (!deletingReward) return
    remove.mutate({ data: { id: deletingReward.id } })
    setDeletingReward(null)
  }

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => {
      remove.mutate({ data: { id } })
    })
    setSelectedIds(new Set())
    setShowBulkDelete(false)
  }

  const handleApproveRedemption = (redemption: PendingRedemptionWithDetails) => {
    processRedemption.mutate({
      data: {
        id: redemption.id,
        status: 'approved',
        // adminUserId is now obtained from session on server
      },
    })
  }

  const handleRejectRedemption = (redemption: PendingRedemptionWithDetails) => {
    processRedemption.mutate({
      data: {
        id: redemption.id,
        status: 'rejected',
        // adminUserId is now obtained from session on server
      },
    })
  }

  const handleFulfillRedemption = (redemption: PendingRedemptionWithDetails) => {
    processRedemption.mutate({
      data: {
        id: redemption.id,
        status: 'fulfilled',
        // adminUserId is now obtained from session on server
      },
    })
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRewards.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRewards.map((r: Reward) => r.id)))
    }
  }

  const openAddModal = () => {
    setEditingReward(null)
    setIsModalOpen(true)
  }

  const openEditModal = (reward: Reward) => {
    setEditingReward(reward)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingReward(null)
  }

  const isSelecting = selectedIds.size > 0
  const pendingCount = pendingRedemptions?.length || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Rewards System</h2>
          {activeSection === 'rewards' && (
            <Button onClick={openAddModal} leftIcon={<Plus className="w-5 h-5" />}>
              <span className="hidden sm:inline">Add Reward</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>

        {/* Section Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSection('rewards')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === 'rewards'
                ? 'bg-white shadow-sm text-theme-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Rewards
          </button>
          <button
            onClick={() => setActiveSection('redemptions')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all relative ${
              activeSection === 'redemptions'
                ? 'bg-white shadow-sm text-theme-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Redemptions
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeSection === 'rewards' ? (
        <>
          {/* Search and filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search rewards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All Rewards</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </div>

          {/* Bulk actions bar */}
          {isSelecting && (
            <div className="flex items-center justify-between bg-theme-primary/10 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="p-2 hover:bg-theme-primary/20 rounded-lg transition-colors"
                >
                  {selectedIds.size === filteredRewards.length ? (
                    <CheckCircle className="w-5 h-5 text-theme-primary" />
                  ) : (
                    <PlusCircle className="w-5 h-5 text-theme-primary" />
                  )}
                </button>
                <span className="font-semibold text-theme-primary">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowBulkDelete(true)}
                  leftIcon={<Trash2 className="w-5 h-5" />}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Rewards list */}
          {rewardsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} lines={2} />
              ))}
            </div>
          ) : filteredRewards.length === 0 ? (
            searchQuery || filterStatus !== 'all' ? (
              <EmptyState
                title={`No rewards match your filters`}
                action={{
                  label: 'Clear filters',
                  onClick: () => {
                    setSearchQuery('')
                    setFilterStatus('all')
                  },
                }}
              />
            ) : (
              <EmptyState
                icon={<Gift className="w-12 h-12 text-gray-300 mb-4" />}
                title="No rewards yet"
                description="Click 'Add Reward' above to create one"
              />
            )
          ) : (
            <div className="space-y-3">
              {filteredRewards.map((reward: Reward) => (
                <AdminCard
                  key={reward.id}
                  onDelete={() => setDeletingReward(reward)}
                  onEdit={() => openEditModal(reward)}
                  isSelected={selectedIds.has(reward.id)}
                  onSelect={() => toggleSelect(reward.id)}
                  showCheckbox={true}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-2xl">
                      {reward.icon || <Gift className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{reward.name}</h3>
                        {!reward.isActive && (
                          <Badge variant="secondary" size="sm">Inactive</Badge>
                        )}
                      </div>
                      {reward.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-yellow-600">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold">{reward.pointCost} points</span>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Redemptions Section */
        <div className="space-y-4">
          {pendingRedemptions && pendingRedemptions.length > 0 ? (
            <>
              <p className="text-sm text-gray-600">
                {pendingCount} pending redemption{pendingCount !== 1 ? 's' : ''} to review
              </p>
              <div className="space-y-3">
                {pendingRedemptions.map((redemption: PendingRedemptionWithDetails) => (
                  <div
                    key={redemption.id}
                    className="bg-white border-2 border-yellow-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-xl">
                          <Gift className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{redemption.rewardName}</h4>
                          <p className="text-sm text-gray-600">
                            Requested by <span className="font-medium">{redemption.memberName}</span>
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-yellow-600 text-sm">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-medium">{redemption.pointsSpent} points</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(redemption.requestedAt).toLocaleDateString()} at{' '}
                            {new Date(redemption.requestedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRejectRedemption(redemption)}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveRedemption(redemption)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFulfillRedemption(redemption)}
                        >
                          Fulfill
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<CheckCircle className="w-12 h-12 text-gray-300 mb-4" />}
              title="No pending redemptions"
              description="When family members redeem rewards, they'll appear here"
            />
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingReward ? 'Edit Reward' : 'Create Reward'}
      >
        <RewardForm
          reward={editingReward}
          onSubmit={editingReward ? handleUpdate : handleAdd}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingReward}
        onClose={() => setDeletingReward(null)}
        onConfirm={handleDelete}
        title="Delete Reward"
        message={`Are you sure you want to delete "${deletingReward?.name}"? This action cannot be undone.`}
      />

      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Rewards"
        message={`Are you sure you want to delete ${selectedIds.size} reward${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`}
      />
    </div>
  )
}
