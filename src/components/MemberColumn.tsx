import { useMemo } from 'react'
import { useMemberDayProgress } from '../hooks/useCompletionProgress'
import { TimeslotCard } from './TimeslotCard'
import { MemberHeader } from './shared'
import type { MemberColumnProps, Timeslot, Todo } from '../types'

export function MemberColumn({
  member,
  timeslots,
  todos,
  stats,
  points,
  isTodoCompleted,
  onToggleTodo,
  isDateEditable,
  dateDisabledReason,
}: MemberColumnProps) {
  const dayProgress = useMemberDayProgress(member, timeslots, todos, isTodoCompleted)

  // Calculate timeslot completion counts for celebration
  const { completedTimeslots, totalTimeslots } = useMemo(() => {
    const total = timeslots.length
    const completed = timeslots.filter((timeslot: Timeslot) => {
      const timeslotTodos = todos.filter((t: Todo) => t.timeslotIds?.includes(timeslot.id))
      const completedCount = timeslotTodos.filter((t) => isTodoCompleted(t.id, timeslot.id, member.id)).length
      return timeslotTodos.length > 0 && completedCount === timeslotTodos.length
    }).length
    return { completedTimeslots: completed, totalTimeslots: total }
  }, [timeslots, todos, isTodoCompleted, member.id])

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col">
      <MemberHeader member={member} stats={stats} points={points} className="flex-shrink-0 rounded-t-2xl sm:rounded-t-3xl" />

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
        {timeslots.length === 0 && (
          <div className="text-center text-gray-400 py-8">No timeslots yet</div>
        )}
        {timeslots.map((timeslot: Timeslot) => {
          const timeslotTodos = todos.filter((t: Todo) => t.timeslotIds?.includes(timeslot.id))
          return (
            <TimeslotCard
              key={timeslot.id}
              timeslot={timeslot}
              todos={timeslotTodos}
              memberId={member.id}
              isTodoCompleted={isTodoCompleted}
              onToggleTodo={onToggleTodo}
              completionPercentage={dayProgress.percentage}
              totalTimeslots={totalTimeslots}
              completedTimeslotsCount={completedTimeslots}
              isDateEditable={isDateEditable}
              dateDisabledReason={dateDisabledReason}
            />
          )
        })}
      </div>
    </div>
  )
}
