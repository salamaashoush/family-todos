import { useState } from 'react'
import { useMembers } from '../../hooks/useQueries'
import { useMemberMutations } from '../../hooks/useAdminMutations'
import { Modal } from '../shared/Modal'
import { MemberForm } from './MemberForm'
import type { Member } from '../../types'

export function MembersTab() {
  const { data: members, isLoading } = useMembers()
  const { create, update, remove } = useMemberMutations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  const handleAdd = async (data: { name: string; avatar: string; is_admin: number }) => {
    create.mutate({ data })
    setIsModalOpen(false)
  }

  const handleUpdate = async (data: { name: string; avatar: string; is_admin: number }) => {
    if (!editingMember) return
    update.mutate({ data: { id: editingMember.id, ...data } })
    setIsModalOpen(false)
    setEditingMember(null)
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      remove.mutate({ data: { id } })
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Family Members</h2>
        <button
          onClick={openAddModal}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members?.map((member: Member) => (
          <div
            key={member.id}
            className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg hover:border-theme-primary transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {member.avatar && (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-3 border-theme-primary/20"
                  />
                )}
                <div>
                  <div className="font-bold text-lg sm:text-xl text-gray-800">{member.name}</div>
                  {member.is_admin === 1 && (
                    <span className="inline-block text-xs sm:text-sm bg-purple-100 text-theme-primary px-3 py-1 rounded-full font-semibold mt-1">
                      Admin
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(member)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id, member.name)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {!isLoading && members?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-4">No family members yet</p>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Add Your First Member
          </button>
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
    </div>
  )
}
