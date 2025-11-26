import { useState, useCallback, useEffect, useRef } from 'react'
import { useTimeslotProgress, useMemberDayProgress } from '../../hooks/useCompletionProgress'
import { useTimeslotTodos, useMemberTimeslots } from '../../hooks/useTimeslotData'
import { ProgressBar, MemberAvatar, TodoCheckbox, TimeslotHeader } from '../shared'
import type { LayoutProps, Timeslot, Todo } from '../../types'

interface AccordionTimeslotProps {
  timeslot: Timeslot
  todos: Todo[]
  memberId: number
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
  isExpanded: boolean
  onToggle: () => void
  isCurrentTimeslot: boolean
}

function AccordionTimeslot({
  timeslot,
  todos,
  memberId,
  isTodoCompleted,
  onToggleTodo,
  isExpanded,
  onToggle,
  isCurrentTimeslot,
}: AccordionTimeslotProps) {
  const timeslotTodos = useTimeslotTodos(todos, timeslot.id)

  const { completedCount, totalCount, allCompleted } = useTimeslotProgress(timeslotTodos, timeslot.id, memberId, isTodoCompleted)

  const handleToggle = useCallback(
    (todoId: number) => {
      const isCompleted = isTodoCompleted(todoId, timeslot.id, memberId)
      onToggleTodo(todoId, timeslot.id, memberId, isCompleted)
    },
    [onToggleTodo, timeslot.id, memberId, isTodoCompleted]
  )

  return (
    <div
      className={`rounded-2xl transition-all ${
        isCurrentTimeslot ? 'ring-3 ring-theme-accent ring-offset-2' : ''
      } ${allCompleted ? 'bg-green-50' : 'bg-white'}`}
    >
      <TimeslotHeader
        name={timeslot.name}
        startTime={timeslot.start_time}
        endTime={timeslot.end_time}
        isCurrentTimeslot={isCurrentTimeslot}
        isComplete={allCompleted}
        completedCount={completedCount}
        totalCount={totalCount}
        isExpanded={isExpanded}
        onToggle={onToggle}
        variant="compact"
      />

      {isExpanded && (
        <div className="p-4 space-y-3 rounded-b-2xl">
          {timeslotTodos.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No tasks for this timeslot</p>
          ) : (
            timeslotTodos.map((todo) => (
              <TodoCheckbox
                key={todo.id}
                todo={todo}
                isCompleted={isTodoCompleted(todo.id, timeslot.id, memberId)}
                onToggle={() => handleToggle(todo.id)}
                size="md"
              />
            ))
          )}

          {totalCount > 0 && (
            <ProgressBar completed={completedCount} total={totalCount} size="md" className="pt-3 border-t border-gray-200" />
          )}
        </div>
      )}
    </div>
  )
}

export function QuickCheckLayout({
  members,
  timeslots,
  todos,
  isTodoCompleted,
  onToggleTodo,
  currentTimeslotId,
}: LayoutProps) {
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(0)
  const [expandedTimeslotId, setExpandedTimeslotId] = useState<number | null>(currentTimeslotId)
  const touchStartX = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedMember = members[selectedMemberIndex]

  const memberTimeslots = useMemberTimeslots(timeslots, selectedMember?.id ?? 0)

  const memberDayProgress = useMemberDayProgress(
    selectedMember || members[0],
    timeslots,
    todos,
    isTodoCompleted
  )

  useEffect(() => {
    if (currentTimeslotId && memberTimeslots.some((t) => t.id === currentTimeslotId)) {
      setExpandedTimeslotId(currentTimeslotId)
    } else if (memberTimeslots.length > 0 && !expandedTimeslotId) {
      setExpandedTimeslotId(memberTimeslots[0].id)
    }
  }, [currentTimeslotId, memberTimeslots, expandedTimeslotId])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return

      const touchEndX = e.changedTouches[0].clientX
      const diff = touchStartX.current - touchEndX
      const threshold = 50

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && selectedMemberIndex < members.length - 1) {
          setSelectedMemberIndex((prev) => prev + 1)
        } else if (diff < 0 && selectedMemberIndex > 0) {
          setSelectedMemberIndex((prev) => prev - 1)
        }
      }

      touchStartX.current = null
    },
    [selectedMemberIndex, members.length]
  )

  const toggleTimeslot = useCallback((timeslotId: number) => {
    setExpandedTimeslotId((prev) => (prev === timeslotId ? null : timeslotId))
  }, [])

  if (!selectedMember) {
    return <div className="text-center py-8 text-gray-500">No family members found</div>
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-[calc(100vh-200px)]"
    >
      <div className="flex gap-2 overflow-x-auto p-2 snap-x snap-mandatory scrollbar-hide">
        {members.map((member, index) => {
          const isSelected = index === selectedMemberIndex
          return (
            <button
              key={member.id}
              onClick={() => setSelectedMemberIndex(index)}
              className={`flex-shrink-0 snap-start flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[72px] focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-inset ${
                isSelected
                  ? 'bg-gradient-to-b from-theme-primary to-theme-secondary scale-105'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <MemberAvatar
                name={member.name}
                avatar={member.avatar}
                size="md"
                borderColor={isSelected ? 'white' : 'gray'}
                className={isSelected ? 'text-white' : 'text-gray-600'}
              />
              <span
                className={`text-xs font-semibold truncate max-w-[64px] ${isSelected ? 'text-white' : 'text-gray-700'}`}
              >
                {member.name}
              </span>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MemberAvatar
              name={selectedMember.name}
              avatar={selectedMember.avatar}
              size="lg"
              borderColor="primary"
              className="text-theme-primary"
            />
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedMember.name}</h2>
              <p className="text-sm text-gray-500">
                {memberDayProgress.completedCount} of {memberDayProgress.totalCount} tasks today
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-theme-primary">{memberDayProgress.percentage}%</div>
          </div>
        </div>
        <ProgressBar
          completed={memberDayProgress.completedCount}
          total={memberDayProgress.totalCount}
          size="md"
          className="mt-3"
        />
      </div>

      <div className="text-center text-xs text-gray-400 mb-3">Swipe left or right to switch members</div>

      <div className="space-y-3">
        {memberTimeslots.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No timeslots assigned to {selectedMember.name}</div>
        ) : (
          memberTimeslots.map((timeslot) => (
            <AccordionTimeslot
              key={timeslot.id}
              timeslot={timeslot}
              todos={todos}
              memberId={selectedMember.id}
              isTodoCompleted={isTodoCompleted}
              onToggleTodo={onToggleTodo}
              isExpanded={expandedTimeslotId === timeslot.id}
              onToggle={() => toggleTimeslot(timeslot.id)}
              isCurrentTimeslot={timeslot.id === currentTimeslotId}
            />
          ))
        )}
      </div>
    </div>
  )
}
