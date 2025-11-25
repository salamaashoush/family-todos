import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback, useMemo } from 'react'
import { Header } from '../components/Header'
import { MemberColumn } from '../components/MemberColumn'
import { Toast } from '../components/Toast'
import { showToast } from '../components/Toast'
import { useMembers, useTimeslots, useTodos, useCompletions } from '../hooks/useQueries'
import { useTodoOperations, useIsTodoCompleted } from '../hooks/useTodoOperations'
import { useRealtime } from '../hooks/useRealtime'
import type { RealtimeEvent } from '../server/realtime'
import type { Member, Timeslot } from '../types'
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
        queryKey: ['timeslots'],
        queryFn: () => getTimeslots({ data: {} }),
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
  const { data: timeslots } = useTimeslots()
  const { data: todos } = useTodos()
  const { data: completions } = useCompletions(selectedDate)

  const { handleToggleTodo } = useTodoOperations(selectedDate)
  const stableCompletions = useMemo(() => completions || [], [completions])
  const { isTodoCompleted } = useIsTodoCompleted(stableCompletions)

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === 'task_completed') {
      showToast(`${event.memberName} completed a task!`, 'success')
    } else if (event.type === 'task_uncompleted') {
      showToast(`${event.memberName} uncompleted a task`, 'info')
    }
  }, [])

  useRealtime(selectedDate, handleRealtimeEvent)

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      <Toast />
      <Header selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className="max-w-[1920px] mx-auto p-2 sm:p-4 lg:p-6 pb-20">
        {membersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-xl overflow-hidden animate-pulse">
                <div className="h-32 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {members?.map((member: Member) => {
              const memberTimeslots = timeslots?.filter((t: Timeslot) => t.member_ids?.includes(member.id)) || []
              return (
                <MemberColumn
                  key={member.id}
                  member={member}
                  timeslots={memberTimeslots}
                  todos={todos || []}
                  completions={completions || []}
                  isTodoCompleted={isTodoCompleted}
                  onToggleTodo={handleToggleTodo}
                />
              )
            })}
          </div>
        )}

        {!membersLoading && members?.length === 0 && (
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

      <Link
        to="/admin"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-gradient-to-r from-theme-primary to-theme-secondary hover:from-theme-primary hover:to-pink-700 active:from-theme-primary active:to-pink-800 text-white p-4 sm:p-5 rounded-full shadow-2xl hover:shadow-theme-primary/50 transition-all transform hover:scale-110 active:scale-95 z-50 group min-w-[56px] min-h-[56px] sm:min-w-[64px] sm:min-h-[64px] flex items-center justify-center"
        aria-label="Admin Panel"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 sm:h-7 sm:w-7 group-hover:rotate-90 transition-transform duration-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Admin Panel
        </span>
      </Link>
    </div>
  )
}
