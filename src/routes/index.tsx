import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback, useMemo } from 'react'
import { Header } from '../components/Header'
import { Toast } from '../components/Toast'
import { showToast } from '../components/Toast'
import { FloatingMenu } from '../components/FloatingMenu'
import { useMembers, useTimeslots, useTodos, useCompletions } from '../hooks/useQueries'
import { useTodoOperations, useIsTodoCompleted } from '../hooks/useTodoOperations'
import { useRealtime } from '../hooks/useRealtime'
import { useLayout, useCurrentTimeslot } from '../contexts/LayoutContext'
import { useCompletionCelebration } from '../hooks/useCompletionCelebration'
import { MemberFocusLayout } from '../components/layouts/MemberFocusLayout'
import { TimeslotFocusLayout } from '../components/layouts/TimeslotFocusLayout'
import { QuickCheckLayout } from '../components/layouts/QuickCheckLayout'
import { FamilyDashboardLayout } from '../components/layouts/FamilyDashboardLayout'
import { filterTimeslotsByDateString } from '../utils/timeslots'
import type { RealtimeEvent } from '../server/realtime'
import { getMembers } from '../server/members'
import { getTimeslots } from '../server/timeslots'
import { getTodos } from '../server/todos'
import { getTodoCompletions } from '../server/completions'

export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    const date = new Date().toISOString().split('T')[0]

    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['members'],
        queryFn: () => getMembers(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['timeslots', date],
        queryFn: () => getTimeslots({ data: { date } }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['todos'],
        queryFn: () => getTodos({ data: {} }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['completions', date],
        queryFn: () => getTodoCompletions({ data: { date } }),
      }),
    ])
  },
  component: Home,
})

function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const { data: members, isLoading: membersLoading } = useMembers()
  // Pass selectedDate to useTimeslots for server-side recurrence filtering
  const { data: timeslots } = useTimeslots(selectedDate)
  const { data: todos } = useTodos()
  const { data: completions } = useCompletions(selectedDate)

  const { handleToggleTodo: baseHandleToggleTodo } = useTodoOperations(selectedDate)
  const stableCompletions = useMemo(() => completions || [], [completions])
  const { isTodoCompleted } = useIsTodoCompleted(stableCompletions)

  // Timeslots are now filtered server-side, but keep client-side filtering as fallback
  // for robustness (double-check recurrence rules)
  const filteredTimeslots = useMemo(() => {
    if (!timeslots) return []
    // Server already filters by date, but we apply client-side filter as safety net
    return filterTimeslotsByDateString(timeslots, selectedDate)
  }, [timeslots, selectedDate])

  const { checkAndCelebrate } = useCompletionCelebration({
    timeslots: filteredTimeslots,
    todos: todos || [],
    isTodoCompleted,
  })

  const handleToggleTodo = useCallback(
    (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => {
      // Check for celebration before toggling (if completing)
      if (!isCompleted) {
        checkAndCelebrate(todoId, timeslotId, memberId, true)
      }
      baseHandleToggleTodo(todoId, timeslotId, memberId, isCompleted)
    },
    [baseHandleToggleTodo, checkAndCelebrate]
  )

  const { layout, settings, currentTimeslotId, isHydrated } = useLayout()

  // Only highlight current timeslot when viewing today
  useCurrentTimeslot(filteredTimeslots, selectedDate)

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === 'task_completed') {
      showToast(`${event.memberName} completed a task!`, 'success')
    } else if (event.type === 'task_uncompleted') {
      showToast(`${event.memberName} uncompleted a task`, 'info')
    }
  }, [])

  useRealtime(selectedDate, handleRealtimeEvent)

  // Filter out parents if showParentsInLayout is false
  const filteredMembers = useMemo(() => {
    if (!members) return []
    if (settings.showParentsInLayout) return members
    return members.filter((m) => !m.isParent)
  }, [members, settings.showParentsInLayout])

  const layoutProps = {
    members: filteredMembers,
    timeslots: filteredTimeslots,
    todos: todos || [],
    completions: completions || [],
    isTodoCompleted,
    onToggleTodo: handleToggleTodo,
    currentTimeslotId,
  }

  const renderLayout = () => {
    switch (layout) {
      case 'member-focus':
        return <MemberFocusLayout {...layoutProps} />
      case 'timeslot-focus':
        return <TimeslotFocusLayout {...layoutProps} />
      case 'quick-check':
        return <QuickCheckLayout {...layoutProps} />
      case 'family-dashboard':
        return <FamilyDashboardLayout {...layoutProps} />
      default:
        return <MemberFocusLayout {...layoutProps} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      <Toast />
      <Header selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className="max-w-[1920px] mx-auto p-2 sm:p-4 lg:p-6 pb-20">
        {membersLoading || !isHydrated ? (
          <div className="flex gap-4 sm:gap-5 lg:gap-6 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-80 sm:w-96 bg-white rounded-2xl shadow-xl overflow-hidden animate-pulse snap-start">
                <div className="h-32 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length > 0 ? (
          renderLayout()
        ) : members && members.length > 0 ? (
          <div className="text-center py-12 sm:py-16">
            <p className="text-xl sm:text-2xl text-gray-600 mb-4">All members are parents and hidden from view.</p>
            <p className="text-gray-500 mb-4">Enable "Show parents in layout" in Settings to see them.</p>
            <Link
              to="/admin"
              className="inline-block px-6 sm:px-8 py-4 sm:py-3 bg-theme-primary hover:bg-theme-primary active:bg-theme-primary text-white font-semibold rounded-xl transition-colors min-h-[48px]"
            >
              Go to Admin Settings
            </Link>
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <p className="text-xl sm:text-2xl text-gray-600 mb-4">No family members yet!</p>
            <Link
              to="/admin"
              className="inline-block px-6 sm:px-8 py-4 sm:py-3 bg-theme-primary hover:bg-theme-primary active:bg-theme-primary text-white font-semibold rounded-xl transition-colors min-h-[48px]"
            >
              Add Members in Admin Panel
            </Link>
          </div>
        )}
      </div>

      <FloatingMenu />
    </div>
  )
}
