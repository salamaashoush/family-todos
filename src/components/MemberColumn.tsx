import { useState, useMemo } from 'react'
import { useMemberStats, useMemberAchievements } from '../hooks/useQueries'
import { StatsDisplay } from './StatsDisplay'
import { TimeslotCard } from './TimeslotCard'
import type { MemberColumnProps, Todo, Timeslot } from '../types'

export function MemberColumn({
  member,
  timeslots,
  todos,
  isTodoCompleted,
  onToggleTodo,
}: MemberColumnProps) {
  const [showStats, setShowStats] = useState(false)
  const { data: stats, isLoading: statsLoading } = useMemberStats(member.id)
  const { data: achievements, isLoading: achievementsLoading } = useMemberAchievements(member.id)

  // Memoize member timeslots to prevent recalculation
  const memberTimeslots = useMemo(
    () => timeslots.filter((t: Timeslot) => t.member_ids?.includes(member.id)),
    [timeslots, member.id]
  )

  // Memoize completion calculations
  const { completedTimeslots, totalTimeslots, completionPercentage } = useMemo(() => {
    const total = memberTimeslots.length
    const completed = memberTimeslots.filter((timeslot: Timeslot) => {
      const timeslotTodos = todos.filter((t: Todo) => t.timeslot_ids?.includes(timeslot.id))
      const completedCount = timeslotTodos.filter((t) =>
        isTodoCompleted(t.id, timeslot.id, member.id)
      ).length
      return timeslotTodos.length > 0 && completedCount === timeslotTodos.length
    }).length
    const percentage = total > 0 ? (completed / total) * 100 : 0
    return { completedTimeslots: completed, totalTimeslots: total, completionPercentage: percentage }
  }, [memberTimeslots, todos, isTodoCompleted, member.id])

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col relative">
      <div className="bg-gradient-to-r from-theme-primary to-theme-secondary p-4 sm:p-6 text-center flex-shrink-0">
        {member.avatar && (
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold text-white">{member.name}</h2>

        <button
          onClick={() => setShowStats(!showStats)}
          className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full shadow-lg transition-all transform hover:scale-110 active:scale-95"
          aria-label="Toggle Stats"
        >
          {showStats ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          )}
        </button>
      </div>

      {showStats && (
        statsLoading || achievementsLoading ? (
          <div className="p-4 text-center text-gray-500">Loading stats...</div>
        ) : stats ? (
          <StatsDisplay stats={stats} achievements={achievements || []} />
        ) : null
      )}

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
        {timeslots.length === 0 && (
          <div className="text-center text-gray-400 py-8">No timeslots yet</div>
        )}
        {timeslots.map((timeslot: Timeslot) => {
          const timeslotTodos = todos.filter((t: Todo) => t.timeslot_ids?.includes(timeslot.id))
          return (
            <TimeslotCard
              key={timeslot.id}
              timeslot={timeslot}
              todos={timeslotTodos}
              memberId={member.id}
              isTodoCompleted={isTodoCompleted}
              onToggleTodo={onToggleTodo}
              completionPercentage={completionPercentage}
              totalTimeslots={totalTimeslots}
              completedTimeslotsCount={completedTimeslots}
            />
          )
        })}
      </div>
    </div>
  )
}
