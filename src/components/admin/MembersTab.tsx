import { useState, useMemo } from 'react'
import { useMembers } from '../../hooks/useQueries'
import { useMemberMutations } from '../../hooks/useAdminMutations'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Button } from '../shared/Button'
import { MemberForm } from './MemberForm'
import { AdminCard } from './AdminCard'
import type { Member } from '../../types'

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

export function MembersTab() {
  const { data: members, isLoading } = useMembers()
  const { create, update, remove } = useMemberMutations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showBulkDelete, setShowBulkDelete] = useState(false)

  const filteredMembers = useMemo(() => {
    if (!members) return []
    if (!searchQuery) return members
    return members.filter((member: Member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [members, searchQuery])

  const handleAdd = async (data: { name: string; avatar: string }) => {
    create.mutate({ data })
    setIsModalOpen(false)
  }

  const handleUpdate = async (data: { name: string; avatar: string }) => {
    if (!editingMember) return
    update.mutate({ data: { id: editingMember.id, ...data } })
    setIsModalOpen(false)
    setEditingMember(null)
  }

  const handleDelete = () => {
    if (!deletingMember) return
    remove.mutate({ data: { id: deletingMember.id } })
    setDeletingMember(null)
  }

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => {
      remove.mutate({ data: { id } })
    })
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

  const isSelecting = selectedIds.size > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Family Members</h2>
          <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
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
                <svg className="w-5 h-5 text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {selectedIds.size === filteredMembers.length ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8v8m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
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
                leftIcon={<TrashIcon />}
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
            <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? (
            <>
              <p className="text-lg">No members match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-theme-primary hover:underline font-medium"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-lg mb-4">No family members yet</p>
              <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
                Add Your First Member
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member: Member) => (
            <AdminCard
              key={member.id}
              onDelete={() => setDeletingMember(member)}
              onEdit={() => openEditModal(member)}
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
                  <h3 className="font-bold text-gray-800 truncate">{member.name}</h3>
                </div>
              </div>
            </AdminCard>
          ))}
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
    </div>
  )
}
