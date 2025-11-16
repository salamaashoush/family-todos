import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getMembers, createMember, updateMember, deleteMember } from '../server/members'
import { getTimeslots, createTimeslot, updateTimeslot, deleteTimeslot } from '../server/timeslots'
import { getTodos, createTodo, updateTodo, deleteTodo } from '../server/todos'
import { checkAuth, logout } from '../server/auth'
import { useState } from 'react'
import type { Member, Timeslot, Todo } from '../db/schema'

export const Route = createFileRoute('/admin')({
  loader: async () => {
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
  const [activeTab, setActiveTab] = useState<'members' | 'timeslots' | 'todos'>('members')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <div className="flex gap-3">
              <Link
                to="/"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                Back to Board
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'members'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab('timeslots')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'timeslots'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Timeslots
            </button>
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'todos'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          </div>

          <div className="p-6">
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
  const { data: members, refetch } = useSuspenseQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', avatar: '', is_admin: 0 })

  const handleAdd = async () => {
    await createMember({ data: formData })
    setFormData({ name: '', avatar: '', is_admin: 0 })
    setIsAdding(false)
    refetch()
  }

  const handleUpdate = async (id: number) => {
    await updateMember({ data: { id, ...formData } })
    setFormData({ name: '', avatar: '', is_admin: 0 })
    setEditingId(null)
    refetch()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this member?')) {
      await deleteMember({ data: { id } })
      refetch()
    }
  }

  const startEdit = (member: Member) => {
    setEditingId(member.id)
    setFormData({ name: member.name, avatar: member.avatar || '', is_admin: member.is_admin })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Family Members</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          Add Member
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-green-500">
          <h3 className="font-semibold text-lg mb-3">New Member</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Avatar URL (optional)"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_admin === 1}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked ? 1 : 0 })}
                className="w-4 h-4"
              />
              <span>Is Admin</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setFormData({ name: '', avatar: '', is_admin: 0 })
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {members?.map((member) => (
          <div key={member.id} className="bg-white border rounded-lg p-4">
            {editingId === member.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_admin === 1}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4"
                  />
                  <span>Is Admin</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(member.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setFormData({ name: '', avatar: '', is_admin: 0 })
                    }}
                    className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {member.avatar && (
                    <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="font-semibold text-lg">{member.name}</div>
                    {member.is_admin === 1 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Admin</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(member)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
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
  const { data: timeslots, refetch: refetchTimeslots } = useSuspenseQuery({
    queryKey: ['timeslots'],
    queryFn: () => getTimeslots({ data: {} }),
  })

  const { data: members } = useSuspenseQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    member_id: 0,
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    recurrence_type: 'none' as 'daily' | 'weekly' | 'monthly' | 'none',
    recurrence_days: '',
  })

  const handleAdd = async () => {
    await createTimeslot({ data: formData })
    setFormData({
      member_id: 0,
      name: '',
      description: '',
      start_time: '',
      end_time: '',
      recurrence_type: 'none',
      recurrence_days: '',
    })
    setIsAdding(false)
    refetchTimeslots()
  }

  const handleUpdate = async (id: number) => {
    await updateTimeslot({ data: { id, ...formData } })
    setFormData({
      member_id: 0,
      name: '',
      description: '',
      start_time: '',
      end_time: '',
      recurrence_type: 'none',
      recurrence_days: '',
    })
    setEditingId(null)
    refetchTimeslots()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this timeslot?')) {
      await deleteTimeslot({ data: { id } })
      refetchTimeslots()
    }
  }

  const startEdit = (timeslot: Timeslot) => {
    setEditingId(timeslot.id)
    setFormData({
      member_id: timeslot.member_id,
      name: timeslot.name,
      description: timeslot.description || '',
      start_time: timeslot.start_time || '',
      end_time: timeslot.end_time || '',
      recurrence_type: timeslot.recurrence_type,
      recurrence_days: timeslot.recurrence_days || '',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Timeslots</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          Add Timeslot
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-green-500">
          <h3 className="font-semibold text-lg mb-3">New Timeslot</h3>
          <div className="space-y-3">
            <select
              value={formData.member_id}
              onChange={(e) => setFormData({ ...formData, member_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={0}>Select Member</option>
              {members?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                placeholder="Start Time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="time"
                placeholder="End Time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={formData.recurrence_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recurrence_type: e.target.value as 'daily' | 'weekly' | 'monthly' | 'none',
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="none">No Recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {formData.recurrence_type !== 'none' && (
              <input
                type="text"
                placeholder="Recurrence Days (e.g., Mon,Wed,Fri or 1,15)"
                value={formData.recurrence_days}
                onChange={(e) => setFormData({ ...formData, recurrence_days: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setFormData({
                    member_id: 0,
                    name: '',
                    description: '',
                    start_time: '',
                    end_time: '',
                    recurrence_type: 'none',
                    recurrence_days: '',
                  })
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {timeslots?.map((timeslot) => {
          const member = members?.find((m) => m.id === timeslot.member_id)
          return (
            <div key={timeslot.id} className="bg-white border rounded-lg p-4">
              {editingId === timeslot.id ? (
                <div className="space-y-3">
                  <select
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Select Member</option>
                    {members?.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={formData.recurrence_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence_type: e.target.value as 'daily' | 'weekly' | 'monthly' | 'none',
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Recurrence</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {formData.recurrence_type !== 'none' && (
                    <input
                      type="text"
                      value={formData.recurrence_days}
                      onChange={(e) => setFormData({ ...formData, recurrence_days: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(timeslot.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setFormData({
                          member_id: 0,
                          name: '',
                          description: '',
                          start_time: '',
                          end_time: '',
                          recurrence_type: 'none',
                          recurrence_days: '',
                        })
                      }}
                      className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-lg">{timeslot.name}</div>
                    <div className="text-sm text-gray-600">Member: {member?.name}</div>
                    {timeslot.description && <div className="text-sm text-gray-600">{timeslot.description}</div>}
                    {timeslot.start_time && timeslot.end_time && (
                      <div className="text-sm text-gray-600">
                        Time: {timeslot.start_time} - {timeslot.end_time}
                      </div>
                    )}
                    {timeslot.recurrence_type !== 'none' && (
                      <div className="text-sm text-gray-600">
                        Recurrence: {timeslot.recurrence_type}{' '}
                        {timeslot.recurrence_days && `(${timeslot.recurrence_days})`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(timeslot)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(timeslot.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TodosTab() {
  const { data: todos, refetch: refetchTodos } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: () => getTodos({ data: {} }),
  })

  const { data: timeslots } = useSuspenseQuery({
    queryKey: ['timeslots'],
    queryFn: () => getTimeslots({ data: {} }),
  })

  const { data: members } = useSuspenseQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    timeslot_id: 0,
    title: '',
    description: '',
    image_url: '',
    symbol: '',
    position: 0,
  })

  const handleAdd = async () => {
    await createTodo({ data: formData })
    setFormData({
      timeslot_id: 0,
      title: '',
      description: '',
      image_url: '',
      symbol: '',
      position: 0,
    })
    setIsAdding(false)
    refetchTodos()
  }

  const handleUpdate = async (id: number) => {
    await updateTodo({ data: { id, ...formData } })
    setFormData({
      timeslot_id: 0,
      title: '',
      description: '',
      image_url: '',
      symbol: '',
      position: 0,
    })
    setEditingId(null)
    refetchTodos()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this todo?')) {
      await deleteTodo({ data: { id } })
      refetchTodos()
    }
  }

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setFormData({
      timeslot_id: todo.timeslot_id,
      title: todo.title,
      description: todo.description || '',
      image_url: todo.image_url || '',
      symbol: todo.symbol || '',
      position: todo.position,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Todos</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          Add Todo
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-green-500">
          <h3 className="font-semibold text-lg mb-3">New Todo</h3>
          <div className="space-y-3">
            <select
              value={formData.timeslot_id}
              onChange={(e) => setFormData({ ...formData, timeslot_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={0}>Select Timeslot</option>
              {timeslots?.map((timeslot) => {
                const member = members?.find((m) => m.id === timeslot.member_id)
                return (
                  <option key={timeslot.id} value={timeslot.id}>
                    {member?.name} - {timeslot.name}
                  </option>
                )
              })}
            </select>
            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={2}
            />
            <input
              type="text"
              placeholder="Image URL (optional)"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Symbol/Emoji (optional)"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              placeholder="Position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setFormData({
                    timeslot_id: 0,
                    title: '',
                    description: '',
                    image_url: '',
                    symbol: '',
                    position: 0,
                  })
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {todos?.map((todo) => {
          const timeslot = timeslots?.find((t) => t.id === todo.timeslot_id)
          const member = members?.find((m) => m.id === timeslot?.member_id)
          return (
            <div key={todo.id} className="bg-white border rounded-lg p-4">
              {editingId === todo.id ? (
                <div className="space-y-3">
                  <select
                    value={formData.timeslot_id}
                    onChange={(e) => setFormData({ ...formData, timeslot_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Select Timeslot</option>
                    {timeslots?.map((timeslot) => {
                      const member = members?.find((m) => m.id === timeslot.member_id)
                      return (
                        <option key={timeslot.id} value={timeslot.id}>
                          {member?.name} - {timeslot.name}
                        </option>
                      )
                    })}
                  </select>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(todo.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setFormData({
                          timeslot_id: 0,
                          title: '',
                          description: '',
                          image_url: '',
                          symbol: '',
                          position: 0,
                        })
                      }}
                      className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    {todo.image_url && (
                      <img src={todo.image_url} alt={todo.title} className="w-16 h-16 object-cover rounded" />
                    )}
                    <div>
                      <div className="font-semibold text-lg flex items-center gap-2">
                        {todo.symbol && <span className="text-2xl">{todo.symbol}</span>}
                        {todo.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {member?.name} - {timeslot?.name}
                      </div>
                      {todo.description && <div className="text-sm text-gray-600">{todo.description}</div>}
                      <div className="text-xs text-gray-500">Position: {todo.position}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(todo)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
