import { createFileRoute, redirect, useRouteContext, useSearch, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useRealtime } from '../hooks/useRealtime'
import { getAccountStatus } from '../server/auth'
import { getOnboardingStatus } from '../server/onboarding'
import { getAllAchievements } from '../server/statistics'
import { getShareToken } from '../server/publicBoard'
import {
  membersCollection,
  todosCollection,
  timeslotsCollection,
  rewardsCollection,
} from '../collections'
import { AdminHeader } from '../components/admin/AdminHeader'
import { MembersTab } from '../components/admin/MembersTab'
import { TimeslotsTab } from '../components/admin/TimeslotsTab'
import { TodosTab } from '../components/admin/TodosTab'
import { StatisticsTab } from '../components/admin/StatisticsTab'
import { SettingsTab } from '../components/admin/SettingsTab'
import { SecurityTab } from '../components/admin/SecurityTab'
import { RewardsTab } from '../components/admin/RewardsTab'
import { PrayerTimesTab } from '../components/admin/PrayerTimesTab'

const tabIds = ['todos', 'timeslots', 'members', 'rewards', 'stats', 'prayer', 'security', 'settings'] as const
type TabId = (typeof tabIds)[number]

const searchSchema = z.object({
  tab: z.enum(tabIds).optional().catch('todos'),
})

export const Route = createFileRoute('/admin')({
  validateSearch: searchSchema,
  ssr: false,
  beforeLoad: async () => {
    // Check authentication and account status
    const auth = await getAccountStatus()
    if (!auth.authenticated) {
      throw redirect({ to: '/login' })
    }

    // SECURITY: Force password change for default admin accounts
    // This must be checked BEFORE any other access is granted
    if (auth.requiresPasswordChange) {
      throw redirect({ to: '/force-password-change' })
    }

    // Check if account is active (super admins bypass this check)
    if (!auth.isSuperAdmin && auth.accountStatus !== 'active') {
      throw redirect({ to: '/account-status' })
    }

    // Check onboarding status
    const status = await getOnboardingStatus()
    if (!status.isOnboarded) {
      throw redirect({ to: '/onboarding' })
    }

    return auth
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      membersCollection.preload(),
      todosCollection.preload(),
      timeslotsCollection.preload(),
      rewardsCollection.preload(),
      queryClient.ensureQueryData({
        queryKey: ['achievements'],
        queryFn: () => getAllAchievements(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['share-token'],
        queryFn: () => getShareToken(),
      }),
    ])
  },
  component: AdminPanel,
})

const tabs: { id: TabId; label: string; shortLabel: string; icon: ReactNode }[] = [
  {
    id: 'todos',
    label: 'Tasks',
    shortLabel: 'Tasks',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'timeslots',
    label: 'Time Slots',
    shortLabel: 'Slots',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'members',
    label: 'Family Members',
    shortLabel: 'Members',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'rewards',
    label: 'Rewards',
    shortLabel: 'Rewards',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Statistics',
    shortLabel: 'Stats',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'prayer',
    label: 'Prayer Times',
    shortLabel: 'Prayer',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
      </svg>
    ),
  },
  {
    id: 'security',
    label: 'Security',
    shortLabel: 'Security',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function AdminPanel() {
  const { username } = useRouteContext({ from: '/admin' }) as { username: string }
  const { tab } = useSearch({ from: '/admin' })
  const activeTab: TabId = tab || 'todos'
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get share token for the Board link
  const { data: shareTokenData } = useQuery({
    queryKey: ['share-token'],
    queryFn: () => getShareToken(),
  })

  // Enable real-time updates
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  useRealtime(today)

  const setActiveTab = useCallback((tabId: TabId) => {
    navigate({ to: '/admin', search: { tab: tabId }, replace: true })
  }, [navigate])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeTabData = tabs.find((t) => t.id === activeTab)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <AdminHeader username={username} shareToken={shareTokenData?.shareToken} />

      <div className="max-w-[1400px] mx-auto p-3 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Mobile Tab Selector */}
          <div className="md:hidden border-b-4 border-theme-primary/20" ref={menuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-theme-primary to-theme-secondary text-white"
            >
              <div className="flex items-center gap-3">
                {activeTabData.icon}
                <span className="font-bold">{activeTabData.label}</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {mobileMenuOpen && (
              <div className="bg-white border-t border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-theme-primary/10 text-theme-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={activeTab === tab.id ? 'text-theme-primary' : 'text-gray-400'}>
                      {tab.icon}
                    </span>
                    <span className="font-medium">{tab.label}</span>
                    {activeTab === tab.id && (
                      <svg className="w-5 h-5 ml-auto text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex border-b-4 border-theme-primary/20">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 lg:px-4 py-3 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={`flex-shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`}>
                  {tab.icon}
                </span>
                <span className="hidden lg:inline truncate">{tab.label}</span>
                <span className="lg:hidden truncate">{tab.shortLabel}</span>
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {activeTab === 'members' && <MembersTab />}
            {activeTab === 'timeslots' && <TimeslotsTab />}
            {activeTab === 'todos' && <TodosTab />}
            {activeTab === 'rewards' && <RewardsTab />}
            {activeTab === 'stats' && <StatisticsTab />}
            {activeTab === 'prayer' && <PrayerTimesTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
