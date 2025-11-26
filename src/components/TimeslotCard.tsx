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
  isDateEditable = true,
  dateDisabledReason,
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
      className={`rounded-xl p-3 transition-all ${
        allCompleted
          ? 'bg-green-50 border-2 border-green-400'
          : 'bg-gray-50 border-2 border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-base font-bold text-gray-800 truncate">{timeslot.name}</h3>
        {timeslot.startTime && timeslot.endTime && (
          <span className="text-xs font-medium text-gray-500 flex-shrink-0">
            {timeslot.startTime} - {timeslot.endTime}
          </span>
        )}
      </div>

      {timeslot.description && (
        <p className="text-gray-500 mb-2 text-xs truncate">{timeslot.description}</p>
      )}

      <div className="space-y-1.5">
        {todos.length === 0 && (
          <div className="text-center text-gray-400 py-2 text-xs">No tasks yet</div>
        )}
        {todos.map((todo) => (
          <TodoCheckbox
            key={todo.id}
            todo={todo}
            isCompleted={isTodoCompleted(todo.id, timeslot.id, memberId)}
            onToggle={() => handleToggle(todo.id, isTodoCompleted(todo.id, timeslot.id, memberId))}
            size="md"
            showDescription
            disabled={!isDateEditable}
            disabledReason={dateDisabledReason}
          />
        ))}
      </div>

      {totalCount > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs font-medium mb-1">
            <span className="text-gray-600">Progress:</span>
            <span className={allCompleted ? 'text-green-600' : 'text-theme-primary'}>
              {completedCount} / {totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
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
