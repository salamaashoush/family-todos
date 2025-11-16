import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers, createMember, updateMember, deleteMember } from '../server/members'
import { getTimeslots, createTimeslot, updateTimeslot, deleteTimeslot } from '../server/timeslots'
import { getTodos, createTodo, updateTodo, deleteTodo } from '../server/todos'
import { uploadImage } from '../server/upload'
import { checkAuth, logout } from '../server/auth'
import { useState } from 'react'
import type { Member } from '../db/schema'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const auth = await checkAuth()
    if (!auth.authenticated) {
      throw redirect({ to: '/login' })
    }
    return auth
  },
  component: AdminPanel,
})

function AdminPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'todos' | 'timeslots' | 'members'>('todos')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <header className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-10 border-b-4 border-purple-300">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 whitespace-nowrap">
              Admin Panel
            </h1>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <Link
              to="/"
              className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
            >
              Board
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-3 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b-4 border-purple-200">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-bold transition-all text-sm sm:text-base ${
                activeTab === 'todos'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('timeslots')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-bold transition-all text-sm sm:text-base ${
                activeTab === 'timeslots'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Time Slots
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-bold transition-all text-sm sm:text-base ${
                activeTab === 'members'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Family Members
            </button>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {activeTab === 'members' && <MembersTab />}
            {activeTab === 'timeslots' && <TimeslotsTab />}
            {activeTab === 'todos' && <TodosTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

function MembersTab() {
  const queryClient = useQueryClient()
  const { data: members } = useSuspenseQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })

  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', avatar: '', is_admin: 0 })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setFormData({ name: '', avatar: '', is_admin: 0 })
      setAvatarFile(null)
      setAvatarPreview('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setEditingId(null)
      setFormData({ name: '', avatar: '', is_admin: 0 })
      setAvatarFile(null)
      setAvatarPreview('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) return

    let avatarUrl = formData.avatar

    if (avatarFile) {
      setIsUploading(true)
      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', avatarFile)
        const result = await uploadImage({ data: uploadFormData })
        avatarUrl = result.url
      } catch (error) {
        console.error('Upload failed:', error)
        alert('Failed to upload avatar image')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    createMutation.mutate({ data: { ...formData, avatar: avatarUrl } })
  }

  const handleUpdate = async (id: number) => {
    if (!formData.name.trim()) return

    let avatarUrl = formData.avatar

    if (avatarFile) {
      setIsUploading(true)
      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', avatarFile)
        const result = await uploadImage({ data: uploadFormData })
        avatarUrl = result.url
      } catch (error) {
        console.error('Upload failed:', error)
        alert('Failed to upload avatar image')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    updateMutation.mutate({ data: { id, ...formData, avatar: avatarUrl } })
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      deleteMutation.mutate({ data: { id } })
    }
  }

  const startEdit = (member: Member) => {
    setEditingId(member.id)
    setFormData({ name: member.name, avatar: member.avatar || '', is_admin: member.is_admin })
    setAvatarFile(null)
    setAvatarPreview(member.avatar || '')
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-2xl border-3 border-purple-300 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add New Family Member
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              placeholder="Enter name (e.g., Omar)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Avatar Photo (Optional)
            </label>
            <div className="flex items-start gap-4">
              {avatarPreview && (
                <div className="flex-shrink-0">
                  <img src={avatarPreview} alt="Preview" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-purple-200" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 file:cursor-pointer cursor-pointer border-2 border-purple-200 rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-2">Max file size: 5MB. Supports: JPG, PNG, GIF, WebP</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.is_admin === 1}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked ? 1 : 0 })}
                className="w-6 h-6 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="font-semibold text-gray-700 group-hover:text-purple-600 transition-colors">
                Admin Privileges
              </span>
            </label>

            <button
              onClick={handleAdd}
              disabled={!formData.name.trim() || isUploading}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none text-base"
            >
              {isUploading ? 'Uploading...' : 'Add Member'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-3">Family Members</h3>
        {members?.map((member) => (
          <div key={member.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg hover:border-purple-300 transition-all">
            {editingId === member.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Avatar Photo</label>
                  <div className="flex items-start gap-4">
                    {avatarPreview && (
                      <div className="flex-shrink-0">
                        <img src={avatarPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-4 border-blue-200" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer border-2 border-blue-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_admin === 1}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5"
                  />
                  <span className="font-semibold">Admin</span>
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleUpdate(member.id)}
                    disabled={isUploading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg"
                  >
                    {isUploading ? 'Uploading...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setFormData({ name: '', avatar: '', is_admin: 0 })
                      setAvatarFile(null)
                      setAvatarPreview('')
                    }}
                    className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {member.avatar && (
                    <img src={member.avatar} alt={member.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-3 border-purple-200" />
                  )}
                  <div>
                    <div className="font-bold text-lg sm:text-xl text-gray-800">{member.name}</div>
                    {member.is_admin === 1 && (
                      <span className="inline-block text-xs sm:text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold mt-1">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(member)}
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
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimeslotsTab() {
  const queryClient = useQueryClient()
  const { data: timeslots } = useSuspenseQuery({
    queryKey: ['timeslots'],
    queryFn: () => getTimeslots({ data: {} }),
  })

  const { data: members } = useSuspenseQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })

  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    recurrence_type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'none',
    recurrence_days: '',
    member_ids: [] as number[],
  })

  const createMutation = useMutation({
    mutationFn: createTimeslot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots'] })
      setFormData({
        name: '',
        description: '',
        start_time: '',
        end_time: '',
        recurrence_type: 'daily',
        recurrence_days: '',
        member_ids: [],
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateTimeslot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots'] })
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        start_time: '',
        end_time: '',
        recurrence_type: 'daily',
        recurrence_days: '',
        member_ids: [],
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTimeslot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots'] })
    },
  })

  const handleAdd = () => {
    if (!formData.name.trim() || formData.member_ids.length === 0) return
    createMutation.mutate({ data: formData })
  }

  const handleUpdate = (id: number) => {
    if (!formData.name.trim()) return
    updateMutation.mutate({ data: { id, ...formData } })
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      deleteMutation.mutate({ data: { id } })
    }
  }

  const startEdit = (timeslot: any) => {
    setEditingId(timeslot.id)
    setFormData({
      name: timeslot.name,
      description: timeslot.description || '',
      start_time: timeslot.start_time || '',
      end_time: timeslot.end_time || '',
      recurrence_type: timeslot.recurrence_type,
      recurrence_days: timeslot.recurrence_days || '',
      member_ids: timeslot.member_ids || [],
    })
  }

  const toggleMember = (memberId: number) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-2xl border-3 border-purple-300 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Create New Time Slot
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Time Slot Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Morning Routine"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Repeat Schedule
              </label>
              <select
                value={formData.recurrence_type}
                onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="daily">Every Day</option>
                <option value="weekly">Every Week</option>
                <option value="none">One Time Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add notes about this time slot..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Assign to Family Members *
            </label>
            <div className="flex flex-wrap gap-2">
              {members?.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 ${
                    formData.member_ids.includes(member.id)
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {member.name}
                </button>
              ))}
            </div>
            {formData.member_ids.length === 0 && (
              <p className="text-sm text-red-600 mt-2">Please select at least one family member</p>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!formData.name.trim() || formData.member_ids.length === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none text-base"
          >
            Create Time Slot
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-3">Time Slots</h3>
        {timeslots?.map((timeslot: any) => (
          <div key={timeslot.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg hover:border-purple-300 transition-all">
            {editingId === timeslot.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assign to</label>
                  <div className="flex flex-wrap gap-2">
                    {members?.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          formData.member_ids.includes(member.id)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200'
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleUpdate(timeslot.id)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg sm:text-xl text-gray-800">{timeslot.name}</h3>
                  {timeslot.start_time && timeslot.end_time && (
                    <p className="text-sm sm:text-base text-gray-600 mt-1 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {timeslot.start_time} - {timeslot.end_time}
                    </p>
                  )}
                  {timeslot.description && <p className="text-sm text-gray-600 mt-2">{timeslot.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {timeslot.member_ids?.map((id: number) => {
                      const member = members?.find(m => m.id === id)
                      return member ? (
                        <span key={id} className="inline-block text-xs sm:text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                          {member.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(timeslot)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(timeslot.id, timeslot.name)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TodosTab() {
  const queryClient = useQueryClient()
  const { data: todos } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: () => getTodos({ data: {} }),
  })

  const { data: timeslots } = useSuspenseQuery({
    queryKey: ['timeslots'],
    queryFn: () => getTimeslots({ data: {} }),
  })

  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    symbol: '',
    image_url: '',
    position: 0,
    timeslot_ids: [] as number[],
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setFormData({
        title: '',
        description: '',
        symbol: '',
        image_url: '',
        position: 0,
        timeslot_ids: [],
      })
      setImageFile(null)
      setImagePreview('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setEditingId(null)
      setFormData({
        title: '',
        description: '',
        symbol: '',
        image_url: '',
        position: 0,
        timeslot_ids: [],
      })
      setImageFile(null)
      setImagePreview('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAdd = async () => {
    if (!formData.title.trim() || formData.timeslot_ids.length === 0) return

    let imageUrl = formData.image_url

    if (imageFile) {
      setIsUploading(true)
      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', imageFile)
        const result = await uploadImage({ data: uploadFormData })
        imageUrl = result.url
      } catch (error) {
        console.error('Upload failed:', error)
        alert('Failed to upload image')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    createMutation.mutate({ data: { ...formData, image_url: imageUrl } })
  }

  const handleUpdate = async (id: number) => {
    if (!formData.title.trim()) return

    let imageUrl = formData.image_url

    if (imageFile) {
      setIsUploading(true)
      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', imageFile)
        const result = await uploadImage({ data: uploadFormData })
        imageUrl = result.url
      } catch (error) {
        console.error('Upload failed:', error)
        alert('Failed to upload image')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    updateMutation.mutate({ data: { id, ...formData, image_url: imageUrl } })
  }

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Delete "${title}"?`)) {
      deleteMutation.mutate({ data: { id } })
    }
  }

  const startEdit = (todo: any) => {
    setEditingId(todo.id)
    setFormData({
      title: todo.title,
      description: todo.description || '',
      symbol: todo.symbol || '',
      image_url: todo.image_url || '',
      position: todo.position,
      timeslot_ids: todo.timeslot_ids || [],
    })
    setImageFile(null)
    setImagePreview(todo.image_url || '')
  }

  const toggleTimeslot = (timeslotId: number) => {
    setFormData(prev => ({
      ...prev,
      timeslot_ids: prev.timeslot_ids.includes(timeslotId)
        ? prev.timeslot_ids.filter(id => id !== timeslotId)
        : [...prev.timeslot_ids, timeslotId]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-2xl border-3 border-purple-300 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Create New Task
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Task Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Brush Teeth"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Symbol / Emoji
              </label>
              <input
                type="text"
                placeholder="e.g., 🦷"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-2xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add instructions or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Task Image (Optional)
            </label>
            <div className="flex items-start gap-4">
              {imagePreview && (
                <div className="flex-shrink-0">
                  <img src={imagePreview} alt="Preview" className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border-4 border-purple-200" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 file:cursor-pointer cursor-pointer border-2 border-purple-200 rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-2">Visual aid for the task. Max: 5MB. Supports: JPG, PNG, GIF, WebP</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Add to Time Slots *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {timeslots?.map((timeslot: any) => (
                <button
                  key={timeslot.id}
                  type="button"
                  onClick={() => toggleTimeslot(timeslot.id)}
                  className={`p-3 sm:p-4 rounded-xl font-semibold text-left transition-all transform hover:scale-105 active:scale-95 ${
                    formData.timeslot_ids.includes(timeslot.id)
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg border-2 border-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                  }`}
                >
                  <div className="font-bold text-base">{timeslot.name}</div>
                  {timeslot.start_time && (
                    <div className="text-xs opacity-90 mt-1">
                      {timeslot.start_time} - {timeslot.end_time}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {formData.timeslot_ids.length === 0 && (
              <p className="text-sm text-red-600 mt-2">Please select at least one time slot</p>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!formData.title.trim() || formData.timeslot_ids.length === 0 || isUploading}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none text-base"
          >
            {isUploading ? 'Uploading Image...' : 'Create Task'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-3">Tasks</h3>
        {todos?.map((todo: any) => (
          <div key={todo.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg hover:border-purple-300 transition-all">
            {editingId === todo.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Task Name</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Symbol</label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl text-2xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Add to Time Slots</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {timeslots?.map((timeslot: any) => (
                      <button
                        key={timeslot.id}
                        type="button"
                        onClick={() => toggleTimeslot(timeslot.id)}
                        className={`px-3 py-2 rounded-lg text-sm text-left font-medium ${
                          formData.timeslot_ids.includes(timeslot.id)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200'
                        }`}
                      >
                        {timeslot.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleUpdate(todo.id)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex gap-3 sm:gap-4 flex-1">
                  {todo.symbol && <span className="text-3xl sm:text-4xl flex-shrink-0">{todo.symbol}</span>}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg sm:text-xl text-gray-800">{todo.title}</h3>
                    {todo.description && <p className="text-sm text-gray-600 mt-2">{todo.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {todo.timeslot_ids?.map((id: number) => {
                        const timeslot = timeslots?.find((t: any) => t.id === id)
                        return timeslot ? (
                          <span key={id} className="inline-block text-xs sm:text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                            {timeslot.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(todo)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id, todo.title)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
