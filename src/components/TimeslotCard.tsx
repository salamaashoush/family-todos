import { useState, useCallback, useEffect } from 'react'
import { useTimeslotCelebration } from '../hooks/useCelebration'
import { useTimeslotProgress } from '../hooks/useCompletionProgress'
import { TodoCheckbox } from './shared'
import type { TimeslotCardProps } from '../types'

export function TimeslotCard({
  timeslot,
  todos,
  memberId,
  isTodoCompleted,
  onToggleTodo,
  completionPercentage,
  totalTimeslots,
  completedTimeslotsCount,
}: TimeslotCardProps) {
  const { completedCount, totalCount, allCompleted } = useTimeslotProgress(
    todos,
    timeslot.id,
    memberId,
    isTodoCompleted
  )

  const [wasCompleted, setWasCompleted] = useState(allCompleted)

  useEffect(() => {
    setWasCompleted(allCompleted)
  }, [allCompleted])

  useTimeslotCelebration({
    allCompleted,
    wasCompleted,
    completionPercentage,
    totalTimeslots,
    completedTimeslotsCount,
  })

  const handleToggle = useCallback(
    (todoId: number, isCompleted: boolean) => {
      onToggleTodo(todoId, timeslot.id, memberId, isCompleted)
    },
    [onToggleTodo, timeslot.id, memberId]
  )

  return (
    <div
      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all ${
        allCompleted
          ? 'bg-green-100 border-4 border-green-400'
          : 'bg-gray-50 border-4 border-gray-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800">{timeslot.name}</h3>
        {timeslot.startTime && timeslot.endTime && (
          <span className="text-xs sm:text-sm font-semibold text-gray-600 bg-white px-3 py-2 rounded-full self-start sm:self-auto">
            {timeslot.startTime} - {timeslot.endTime}
          </span>
        )}
      </div>

      {timeslot.description && (
        <p className="text-gray-600 mb-3 text-sm">{timeslot.description}</p>
      )}

      <div className="space-y-2 sm:space-y-3">
        {todos.length === 0 && (
          <div className="text-center text-gray-400 py-4 text-sm">No tasks yet</div>
        )}
        {todos.map((todo) => (
          <TodoCheckbox
            key={todo.id}
            todo={todo}
            isCompleted={isTodoCompleted(todo.id, timeslot.id, memberId)}
            onToggle={() => handleToggle(todo.id, isTodoCompleted(todo.id, timeslot.id, memberId))}
            size="lg"
            showDetails
          />
        ))}
      </div>

      {totalCount > 0 && (
        <div className="mt-3 pt-3 border-t-2 border-gray-300">
          <div className="flex items-center justify-between text-sm sm:text-base font-semibold">
            <span className="text-gray-700">Progress:</span>
            <span className={allCompleted ? 'text-green-600' : 'text-theme-primary'}>
              {completedCount} / {totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
            <div
              className={`h-4 rounded-full transition-all ${
                allCompleted ? 'bg-green-500' : 'bg-theme-primary'
              }`}
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
