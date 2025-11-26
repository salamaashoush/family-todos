import { useState, useCallback } from 'react'
import { useTimeslotProgress, useTimeslotOverallProgress } from '../../hooks/useCompletionProgress'
import { useSortedTimeslots, useTimeslotTodos, useTimeslotMembers } from '../../hooks/useTimeslotData'
import { ProgressBar, MemberHeader, TodoCheckbox, TimeslotHeader } from '../shared'
import type { LayoutProps, Member, Timeslot, Todo, MemberStats } from '../../types'

interface MemberCardProps {
  member: Member
  todos: Todo[]
  timeslotId: number
  stats?: MemberStats | null
  points?: number | null
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
}

function MemberCard({ member, todos, timeslotId, stats, points, isTodoCompleted, onToggleTodo }: MemberCardProps) {
  const { completedCount, totalCount, allCompleted } = useTimeslotProgress(todos, timeslotId, member.id, isTodoCompleted)

  const handleToggle = useCallback(
    (todoId: number) => {
      const isCompleted = isTodoCompleted(todoId, timeslotId, member.id)
      onToggleTodo(todoId, timeslotId, member.id, isCompleted)
    },
    [onToggleTodo, timeslotId, member.id, isTodoCompleted]
  )

  return (
    <div
      className={`flex-shrink-0 w-[280px] sm:w-[320px] rounded-xl sm:rounded-2xl overflow-hidden transition-all ${
        allCompleted ? 'bg-green-50 border-4 border-green-400' : 'bg-white border-4 border-gray-200'
      }`}
    >
      <MemberHeader
        member={member}
        stats={stats}
        points={points}
        variant={allCompleted ? 'complete' : 'compact'}
      />

      <div className="p-3 sm:p-4 space-y-2">
        {todos.map((todo) => (
          <TodoCheckbox
            key={todo.id}
            todo={todo}
            isCompleted={isTodoCompleted(todo.id, timeslotId, member.id)}
            onToggle={() => handleToggle(todo.id)}
            size="md"
          />
        ))}

        {totalCount > 0 && (
          <ProgressBar completed={completedCount} total={totalCount} size="sm" showLabel className="pt-2 border-t border-gray-200" />
        )}
      </div>
    </div>
  )
}

interface TimeslotRowProps {
  timeslot: Timeslot
  members: Member[]
  todos: Todo[]
  memberStats?: MemberStats[]
  memberPoints?: { member_id: number; total: number }[]
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
  isCurrentTimeslot: boolean
  isExpanded: boolean
  onToggleExpand: () => void
}

function TimeslotRow({
  timeslot,
  members,
  todos,
  memberStats,
  memberPoints,
  isTodoCompleted,
  onToggleTodo,
  isCurrentTimeslot,
  isExpanded,
  onToggleExpand,
}: TimeslotRowProps) {
  const timeslotTodos = useTimeslotTodos(todos, timeslot.id)
  const timeslotMembers = useTimeslotMembers(members, timeslot)

  const { completedCount, totalCount, allCompleted } = useTimeslotOverallProgress(timeslot, members, todos, isTodoCompleted)

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl transition-all ${
        isCurrentTimeslot
          ? 'ring-4 ring-theme-accent ring-offset-2'
          : allCompleted
            ? 'ring-2 ring-green-400'
            : ''
      }`}
    >
      <TimeslotHeader
        name={timeslot.name}
        startTime={timeslot.startTime}
        endTime={timeslot.endTime}
        isCurrentTimeslot={isCurrentTimeslot}
        isComplete={allCompleted}
        completedCount={completedCount}
        totalCount={totalCount}
        isExpanded={isExpanded}
        onToggle={onToggleExpand}
      />

      {isExpanded && (
        <div className="bg-gray-100 p-4 sm:p-6 rounded-b-2xl sm:rounded-b-3xl">
          <div className="flex gap-4 overflow-x-auto pb-4 -mb-4 snap-x snap-mandatory">
            {timeslotMembers.map((member) => {
              const stats = memberStats?.find((s) => s.memberId === member.id)
              const points = memberPoints?.find((p) => p.member_id === member.id)?.total
              return (
                <div key={member.id} className="snap-start">
                  <MemberCard
                    member={member}
                    todos={timeslotTodos}
                    timeslotId={timeslot.id}
                    stats={stats}
                    points={points}
                    isTodoCompleted={isTodoCompleted}
                    onToggleTodo={onToggleTodo}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function TimeslotFocusLayout({
  members,
  timeslots,
  todos,
  memberStats,
  memberPoints,
  isTodoCompleted,
  onToggleTodo,
  currentTimeslotId,
}: LayoutProps) {
  const [expandedTimeslots, setExpandedTimeslots] = useState<Set<number>>(() => {
    if (currentTimeslotId) {
      return new Set([currentTimeslotId])
    }
    return timeslots.length > 0 ? new Set([timeslots[0].id]) : new Set()
  })

  const toggleExpand = useCallback((timeslotId: number) => {
    setExpandedTimeslots((prev) => {
      const next = new Set(prev)
      if (next.has(timeslotId)) {
        next.delete(timeslotId)
      } else {
        next.add(timeslotId)
      }
      return next
    })
  }, [])

  const sortedTimeslots = useSortedTimeslots(timeslots)

  return (
    <div className="space-y-4 sm:space-y-6">
      {sortedTimeslots.map((timeslot) => (
        <TimeslotRow
          key={timeslot.id}
          timeslot={timeslot}
          members={members}
          todos={todos}
          memberStats={memberStats}
          memberPoints={memberPoints}
          isTodoCompleted={isTodoCompleted}
          onToggleTodo={onToggleTodo}
          isCurrentTimeslot={timeslot.id === currentTimeslotId}
          isExpanded={expandedTimeslots.has(timeslot.id)}
          onToggleExpand={() => toggleExpand(timeslot.id)}
        />
      ))}
    </div>
  )
}
