import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  resetAdminPassword,
} from '../../server/admin-users'
import { checkAuth } from '../../server/auth'
import { Button } from '../shared'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { AdminCard } from './AdminCard'
import { AdminUserForm } from './AdminUserForm'
import { ResetPasswordForm } from './ResetPasswordForm'
import { ChangePasswordForm } from './ChangePasswordForm'
import { showToast } from '../Toast'

type AdminUser = {
  id: number
  username: string
  email: string | null
  createdAt: Date
  lastLoginAt: Date | null
}

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const KeyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

export function SecurityTab() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null)
  const [resettingPasswordFor, setResettingPasswordFor] = useState<AdminUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: authData } = useQuery({
    queryKey: ['auth'],
    queryFn: () => checkAuth(),
  })

  const currentAdminId = authData?.authenticated ? authData.adminUserId : null

  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => getAdminUsers(),
  })

  const filteredAdmins = useMemo(() => {
    if (!adminUsers) return []
    if (!searchQuery) return adminUsers
    return adminUsers.filter((admin: AdminUser) =>
      admin.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [adminUsers, searchQuery])

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      showToast('Admin user created successfully', 'success')
      setIsModalOpen(false)
    },
    onError: (error: Error) => {
      showToast(error.message, 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      showToast('Admin user updated successfully', 'success')
      setIsModalOpen(false)
      setEditingAdmin(null)
    },
    onError: (error: Error) => {
      showToast(error.message, 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      showToast('Admin user deleted successfully', 'success')
      setDeletingAdmin(null)
    },
    onError: (error: Error) => {
      showToast(error.message, 'error')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: resetAdminPassword,
    onSuccess: () => {
      showToast('Password reset successfully', 'success')
      setResettingPasswordFor(null)
    },
    onError: (error: Error) => {
      showToast(error.message, 'error')
    },
  })

  const handleAdd = async (data: { username: string; password?: string }) => {
    if (!data.password) return
    createMutation.mutate({ data: { username: data.username, password: data.password } })
  }

  const handleUpdate = async (data: { username: string }) => {
    if (!editingAdmin) return
    updateMutation.mutate({ data: { id: editingAdmin.id, username: data.username } })
  }

  const handleDelete = () => {
    if (!deletingAdmin) return
    deleteMutation.mutate({ data: { id: deletingAdmin.id } })
  }

  const handleResetPassword = async (data: { newPassword: string }) => {
    if (!resettingPasswordFor) return
    resetPasswordMutation.mutate({ data: { id: resettingPasswordFor.id, newPassword: data.newPassword } })
  }

  const openAddModal = () => {
    setEditingAdmin(null)
    setIsModalOpen(true)
  }

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAdmin(null)
  }

  const isCurrentAdmin = (adminId: number) => currentAdminId === adminId

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Users</h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsChangePasswordOpen(true)} variant="secondary" leftIcon={<LockIcon />}>
              <span className="hidden sm:inline">Change Password</span>
              <span className="sm:hidden">Password</span>
            </Button>
            <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
              <span className="hidden sm:inline">Add Admin</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
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
            placeholder="Search admins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all duration-200 min-h-[48px]"
          />
        </div>
      </div>

      {/* Admin Users list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
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
      ) : filteredAdmins.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? (
            <>
              <p className="text-lg">No admins match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-theme-primary hover:underline font-medium"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-lg mb-4">No admin users yet</p>
              <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
                Add Your First Admin
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAdmins.map((admin: AdminUser) => {
            const isCurrent = isCurrentAdmin(admin.id)
            return (
              <AdminCard
                key={admin.id}
                onDelete={() => setDeletingAdmin(admin)}
                onEdit={() => openEditModal(admin)}
                hideDelete={isCurrent}
                extraActions={
                  !isCurrent ? (
                    <button
                      onClick={() => setResettingPasswordFor(admin)}
                      className="p-2 text-gray-400 hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                      title="Reset password"
                    >
                      <KeyIcon />
                    </button>
                  ) : null
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {admin.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 truncate">{admin.username}</h3>
                      {isCurrent && (
                        <span className="inline-block text-xs bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full font-semibold">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {admin.lastLoginAt
                        ? `Last login: ${new Date(admin.lastLoginAt).toLocaleDateString()}`
                        : 'Never logged in'}
                    </p>
                  </div>
                </div>
              </AdminCard>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAdmin ? 'Edit Admin User' : 'Add Admin User'}
      >
        <AdminUserForm
          adminUser={editingAdmin}
          onSubmit={editingAdmin ? handleUpdate : handleAdd}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="Change Your Password"
      >
        <ChangePasswordForm
          onSuccess={() => {
            setIsChangePasswordOpen(false)
            showToast('Password changed successfully', 'success')
          }}
          onCancel={() => setIsChangePasswordOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={!!resettingPasswordFor}
        onClose={() => setResettingPasswordFor(null)}
        title="Reset Password"
      >
        {resettingPasswordFor && (
          <ResetPasswordForm
            username={resettingPasswordFor.username}
            onSubmit={handleResetPassword}
            onCancel={() => setResettingPasswordFor(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingAdmin}
        onClose={() => setDeletingAdmin(null)}
        onConfirm={handleDelete}
        title="Delete Admin User"
        message={`Are you sure you want to delete ${deletingAdmin?.username}? This action cannot be undone.`}
      />
    </div>
  )
}
