import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Key, Lock, ShieldCheck, Search } from 'lucide-react'
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  resetAdminPassword,
} from '../../server/admin-users'
import { checkAuth } from '../../server/auth'
import { Button, SkeletonCard, EmptyState, Badge } from '../shared'
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
  role: 'owner' | 'admin' | 'member'
}

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

  // Check if current user is an owner (can manage users)
  const currentUserRole = adminUsers?.find((u: AdminUser) => u.id === currentAdminId)?.role
  const isOwner = currentUserRole === 'owner'

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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Family Members</h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsChangePasswordOpen(true)} variant="secondary" leftIcon={<Lock className="w-5 h-5" />}>
              <span className="hidden sm:inline">Change Password</span>
              <span className="sm:hidden">Password</span>
            </Button>
            {isOwner && (
              <Button onClick={openAddModal} leftIcon={<Plus className="w-5 h-5" />}>
                <span className="hidden sm:inline">Add Member</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
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
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : filteredAdmins.length === 0 ? (
        searchQuery ? (
          <EmptyState
            title={`No admins match "${searchQuery}"`}
            action={{ label: 'Clear search', onClick: () => setSearchQuery('') }}
          />
        ) : (
          <EmptyState
            icon={<ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />}
            title="No admin users yet"
            description="Click 'Add Admin' above to create one"
          />
        )
      ) : (
        <div className="space-y-3">
          {filteredAdmins.map((admin: AdminUser) => {
            const isCurrent = isCurrentAdmin(admin.id)
            const canManage = isOwner && !isCurrent
            return (
              <AdminCard
                key={admin.id}
                onDelete={canManage ? () => setDeletingAdmin(admin) : undefined}
                onEdit={canManage ? () => openEditModal(admin) : undefined}
                hideDelete={!canManage}
                hideEdit={!canManage}
                extraActions={
                  canManage ? (
                    <button
                      onClick={() => setResettingPasswordFor(admin)}
                      className="p-2 text-gray-400 hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                      title="Reset password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  ) : null
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {admin.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 truncate">{admin.username}</h3>
                      <Badge
                        variant={admin.role === 'owner' ? 'warning' : admin.role === 'admin' ? 'info' : 'secondary'}
                        size="sm"
                      >
                        {admin.role}
                      </Badge>
                      {isCurrent && (
                        <Badge variant="primary" size="sm">You</Badge>
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
