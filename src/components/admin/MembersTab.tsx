import { useState, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Users, Mail, Pencil, UserCheck, Search, CheckCircle, PlusCircle } from 'lucide-react'
import { useMembers } from '../../hooks/useCollections'
import { membersCollection } from '../../collections'
import { showToast } from '../Toast'
import { Modal, ConfirmDialog, Button, SkeletonCard, EmptyState, Input } from '../shared'
import { MemberForm } from './MemberForm'
import { AdminCard } from './AdminCard'
import { sendMemberInvite, getMemberInviteStatus, resendMemberInvite, cancelMemberInvite } from '../../server/memberInvite'
import type { Member } from '../../types'

export function MembersTab() {
  const { data: members, isLoading } = useMembers()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [invitingMember, setInvitingMember] = useState<Member | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const inviteStatusQuery = useQuery({
    queryKey: ['memberInviteStatus', invitingMember?.id],
    queryFn: () => getMemberInviteStatus({ data: { memberId: invitingMember!.id } }),
    enabled: !!invitingMember,
  })

  const sendInviteMutation = useMutation({
    mutationFn: sendMemberInvite,
    onSuccess: (result) => {
      setInviteSuccess(result.message)
      setInviteEmail('')
      inviteStatusQuery.refetch()
    },
    onError: (error) => {
      setInviteError(error instanceof Error ? error.message : 'Failed to send invite')
    },
  })

  const resendInviteMutation = useMutation({
    mutationFn: resendMemberInvite,
    onSuccess: (result) => {
      setInviteSuccess(result.message)
      inviteStatusQuery.refetch()
    },
    onError: (error) => {
      setInviteError(error instanceof Error ? error.message : 'Failed to resend invite')
    },
  })

  const cancelInviteMutation = useMutation({
    mutationFn: cancelMemberInvite,
    onSuccess: () => {
      setInviteSuccess('Invite cancelled')
      inviteStatusQuery.refetch()
    },
    onError: (error) => {
      setInviteError(error instanceof Error ? error.message : 'Failed to cancel invite')
    },
  })

  const filteredMembers = useMemo(() => {
    if (!members) return []
    if (!searchQuery) return members
    return members.filter((member: Member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [members, searchQuery])

  const handleAdd = async (data: { name: string; avatar: string }) => {
    const tx = membersCollection.insert({
      id: Date.now(),
      familyId: 0,
      name: data.name,
      avatar: data.avatar || null,
      isParent: false,
      linkedUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    tx.isPersisted.promise
      .then(() => showToast('Member created successfully', 'success'))
      .catch(() => showToast('Failed to create member', 'error'))
    setIsModalOpen(false)
  }

  const handleUpdate = async (data: { name: string; avatar: string }) => {
    if (!editingMember) return
    membersCollection.update(editingMember.id, (draft) => {
      draft.name = data.name
      draft.avatar = data.avatar || null
    }).isPersisted.promise
      .then(() => showToast('Member updated successfully', 'success'))
      .catch(() => showToast('Failed to update member', 'error'))
    setIsModalOpen(false)
    setEditingMember(null)
  }

  const handleDelete = () => {
    if (!deletingMember) return
    membersCollection.delete(deletingMember.id).isPersisted.promise
      .then(() => showToast('Member deleted successfully', 'success'))
      .catch(() => showToast('Failed to delete member', 'error'))
    setDeletingMember(null)
  }

  const handleBulkDelete = () => {
    membersCollection.delete([...selectedIds])
    setSelectedIds(new Set())
    setShowBulkDelete(false)
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
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMembers.map((m: Member) => m.id)))
    }
  }

  const openAddModal = () => {
    setEditingMember(null)
    setIsModalOpen(true)
  }

  const openEditModal = (member: Member) => {
    setEditingMember(member)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingMember(null)
  }

  const openInviteModal = (member: Member) => {
    setInvitingMember(member)
    setInviteEmail('')
    setInviteError('')
    setInviteSuccess('')
  }

  const closeInviteModal = () => {
    setInvitingMember(null)
    setInviteEmail('')
    setInviteError('')
    setInviteSuccess('')
  }

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitingMember || !inviteEmail) return
    setInviteError('')
    setInviteSuccess('')
    sendInviteMutation.mutate({ data: { memberId: invitingMember.id, email: inviteEmail } })
  }

  const handleResendInvite = () => {
    if (!invitingMember) return
    setInviteError('')
    setInviteSuccess('')
    resendInviteMutation.mutate({ data: { memberId: invitingMember.id } })
  }

  const handleCancelInvite = () => {
    if (!invitingMember) return
    setInviteError('')
    setInviteSuccess('')
    cancelInviteMutation.mutate({ data: { memberId: invitingMember.id } })
  }

  const isSelecting = selectedIds.size > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Family Members</h2>
          <Button onClick={openAddModal} leftIcon={<Plus className="w-5 h-5" />}>
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all duration-200 min-h-[48px]"
          />
        </div>

        {/* Bulk actions bar */}
        {isSelecting && (
          <div className="flex items-center justify-between bg-theme-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="p-2 hover:bg-theme-primary/20 rounded-lg transition-colors"
              >
                {selectedIds.size === filteredMembers.length ? (
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
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        searchQuery ? (
          <EmptyState
            title={`No members match "${searchQuery}"`}
            action={{ label: 'Clear search', onClick: () => setSearchQuery('') }}
          />
        ) : (
          <EmptyState
            icon={<Users className="w-12 h-12 text-gray-300 mb-4" />}
            title="No family members yet"
            description="Click 'Add Member' above to create one"
          />
        )
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member: Member) => {
            const actions = [
              {
                label: 'Edit',
                icon: <Pencil className="w-4 h-4" />,
                onClick: () => openEditModal(member),
              },
              ...(!member.linkedUserId ? [{
                label: 'Invite to Admin',
                icon: <Mail className="w-4 h-4" />,
                onClick: () => openInviteModal(member),
              }] : []),
              {
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => setDeletingMember(member),
                variant: 'danger' as const,
              },
            ]

            return (
              <AdminCard
                key={member.id}
                actions={actions}
                isSelected={selectedIds.has(member.id)}
                onSelect={() => toggleSelect(member.id)}
                showCheckbox={true}
              >
                <div className="flex items-center gap-3">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-theme-primary/20 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 truncate">{member.name}</h3>
                      {member.isParent && (
                        <span className="flex-shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Parent
                        </span>
                      )}
                      {member.linkedUserId && (
                        <span className="flex-shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Has Account
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AdminCard>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingMember ? 'Edit Family Member' : 'Add Family Member'}
      >
        <MemberForm
          member={editingMember}
          onSubmit={editingMember ? handleUpdate : handleAdd}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        onConfirm={handleDelete}
        title="Delete Member"
        message={`Are you sure you want to delete ${deletingMember?.name}? This action cannot be undone.`}
      />

      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Members"
        message={`Are you sure you want to delete ${selectedIds.size} member${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`}
      />

      {/* Invite Modal */}
      <Modal
        isOpen={!!invitingMember}
        onClose={closeInviteModal}
        title={`Invite ${invitingMember?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Send an invite to give this family member their own login account.
            They'll be able to manage tasks, rewards, and other family settings.
          </p>

          {inviteError && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
              {inviteSuccess}
            </div>
          )}

          {inviteStatusQuery.data?.hasPendingInvite ? (
            <>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-800 font-semibold">Pending Invite</p>
                <p className="text-yellow-700 text-sm mt-1">
                  An invite was sent to <span className="font-medium">{inviteStatusQuery.data.email}</span>
                </p>
                <p className="text-yellow-600 text-xs mt-2">
                  Expires: {new Date(inviteStatusQuery.data.expiresAt!).toLocaleDateString()}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={handleCancelInvite}
                  isLoading={cancelInviteMutation.isPending}
                >
                  Cancel Invite
                </Button>
                <Button
                  onClick={handleResendInvite}
                  isLoading={resendInviteMutation.isPending}
                >
                  Resend Invite
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4">
              <Input
                id="inviteEmail"
                name="email"
                type="email"
                label="Email Address *"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter their email address"
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeInviteModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={sendInviteMutation.isPending}
                  disabled={!inviteEmail}
                >
                  Send Invite
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  )
}
