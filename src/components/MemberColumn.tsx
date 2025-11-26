import { useMemo } from 'react'
import { useMemberDayProgress } from '../hooks/useCompletionProgress'
import { TimeslotCard } from './TimeslotCard'
import type { MemberColumnProps, Timeslot, Todo } from '../types'

export function MemberColumn({
  member,
  timeslots,
  todos,
  isTodoCompleted,
  onToggleTodo,
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
      <div className="bg-gradient-to-r from-theme-primary to-theme-secondary p-4 sm:p-6 text-center flex-shrink-0">
        {member.avatar && (
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold text-white">{member.name}</h2>
      </div>

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
            />
          )
        })}
      </div>
    </div>
  )
}
