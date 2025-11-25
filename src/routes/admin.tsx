import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { checkAuth } from '../server/auth'
import { getMembers } from '../server/members'
import { getTimeslots } from '../server/timeslots'
import { getTodos } from '../server/todos'
import { getAllAchievements } from '../server/statistics'
import { AdminHeader } from '../components/admin/AdminHeader'
import { MembersTab } from '../components/admin/MembersTab'
import { TimeslotsTab } from '../components/admin/TimeslotsTab'
import { TodosTab } from '../components/admin/TodosTab'
import { StatisticsTab } from '../components/admin/StatisticsTab'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const auth = await checkAuth()
    if (!auth.authenticated) {
      throw redirect({ to: '/login' })
    }
    return auth
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['members'],
        queryFn: () => getMembers(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['timeslots'],
        queryFn: () => getTimeslots({ data: {} }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['todos'],
        queryFn: () => getTodos({ data: {} }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['achievements'],
        queryFn: () => getAllAchievements(),
      }),
    ])
  },
  component: AdminPanel,
})

function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'todos' | 'timeslots' | 'members' | 'stats'>('todos')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <AdminHeader />

      <div className="max-w-[1400px] mx-auto p-3 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b-4 border-theme-primary/20">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-bold transition-all text-sm sm:text-base ${
                activeTab === 'todos'
                  ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('timeslots')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-bold transition-all text-sm sm:text-base ${
                activeTab === 'timeslots'
                  ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Time Slots
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-bold transition-all text-sm sm:text-base ${
                activeTab === 'members'
                  ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Family Members
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-bold transition-all text-sm sm:text-base ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Statistics
            </button>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {activeTab === 'members' && <MembersTab />}
            {activeTab === 'timeslots' && <TimeslotsTab />}
            {activeTab === 'todos' && <TodosTab />}
            {activeTab === 'stats' && <StatisticsTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
