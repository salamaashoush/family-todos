import { useCallback } from 'react'
import { useTimeslotProgress, useMemberDayProgress, useOverallDayProgress } from '../../hooks/useCompletionProgress'
import { useSortedTimeslots, useTimeslotTodos, useTimeslotMembers } from '../../hooks/useTimeslotData'
import { ProgressBar, MemberAvatar, TodoCheckbox } from '../shared'
import type { LayoutProps, Member, Timeslot, Todo } from '../../types'

interface CurrentTimeslotCardProps {
  member: Member
  timeslot: Timeslot
  todos: Todo[]
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => void
}

function CurrentTimeslotCard({
  member,
  timeslot,
  todos,
  isTodoCompleted,
  onToggleTodo,
}: CurrentTimeslotCardProps) {
  const timeslotTodos = useTimeslotTodos(todos, timeslot.id)

  const { completedCount, totalCount, allCompleted, percentage } = useTimeslotProgress(
    timeslotTodos,
    timeslot.id,
    member.id,
    isTodoCompleted
  )

  const handleToggle = useCallback(
    (todoId: number) => {
      const isCompleted = isTodoCompleted(todoId, timeslot.id, member.id)
      onToggleTodo(todoId, timeslot.id, member.id, isCompleted)
    },
    [onToggleTodo, timeslot.id, member.id, isTodoCompleted]
  )

  return (
    <div
      className={`flex-1 min-w-[200px] max-w-[300px] rounded-xl sm:rounded-2xl overflow-hidden transition-all ${
        allCompleted ? 'ring-3 ring-green-400' : ''
      }`}
    >
      <div
        className={`p-3 sm:p-4 text-center ${
          allCompleted
            ? 'bg-gradient-to-b from-green-500 to-green-600'
            : 'bg-gradient-to-b from-theme-primary to-theme-secondary'
        }`}
      >
        <MemberAvatar name={member.name} avatar={member.avatar} size="lg" className="mx-auto text-white" />
        <h3 className="text-white font-bold mt-2 text-base sm:text-lg">{member.name}</h3>
      </div>

      <div className={`p-3 sm:p-4 ${allCompleted ? 'bg-green-50' : 'bg-white'}`}>
        <div className="space-y-2">
          {timeslotTodos.map((todo) => (
            <TodoCheckbox
              key={todo.id}
              todo={todo}
              isCompleted={isTodoCompleted(todo.id, timeslot.id, member.id)}
              onToggle={() => handleToggle(todo.id)}
              size="md"
            />
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-600">
              {completedCount}/{totalCount}
            </span>
            <span className={`text-lg sm:text-xl font-bold ${allCompleted ? 'text-green-600' : 'text-theme-primary'}`}>
              {percentage}%
            </span>
          </div>
          <ProgressBar completed={completedCount} total={totalCount} size="sm" />
        </div>
      </div>
    </div>
  )
}

interface DaySummaryCardProps {
  member: Member
  timeslots: Timeslot[]
  todos: Todo[]
  isTodoCompleted: (todoId: number, timeslotId: number, memberId: number) => boolean
}

function DaySummaryCard({ member, timeslots, todos, isTodoCompleted }: DaySummaryCardProps) {
  const { completedCount, totalCount, percentage, allCompleted } = useMemberDayProgress(
    member,
    timeslots,
    todos,
    isTodoCompleted
  )

  return (
    <div
      className={`flex-1 min-w-[140px] p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
        allCompleted ? 'bg-green-100 border-3 border-green-400' : 'bg-white border-3 border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <MemberAvatar
          name={member.name}
          avatar={member.avatar}
          size="md"
          borderColor={allCompleted ? 'green' : 'gray'}
          className={allCompleted ? 'text-green-600' : 'text-theme-primary'}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{member.name}</h4>
          <p className="text-xs text-gray-500">
            {completedCount}/{totalCount} tasks
          </p>
        </div>
      </div>

      <div className="text-center mb-2">
        <span className={`text-3xl sm:text-4xl font-bold ${allCompleted ? 'text-green-600' : 'text-theme-primary'}`}>
          {percentage}%
        </span>
      </div>

      <ProgressBar completed={completedCount} total={totalCount} size="sm" />
    </div>
  )
}

export function FamilyDashboardLayout({
  members,
  timeslots,
  todos,
  isTodoCompleted,
  onToggleTodo,
  currentTimeslotId,
}: LayoutProps) {
  const sortedTimeslots = useSortedTimeslots(timeslots)

  const currentTimeslot = currentTimeslotId
    ? timeslots.find((t) => t.id === currentTimeslotId)
    : sortedTimeslots[0]

  const nextTimeslot = currentTimeslot
    ? (() => {
        const currentIndex = sortedTimeslots.findIndex((t) => t.id === currentTimeslot.id)
        return currentIndex < sortedTimeslots.length - 1 ? sortedTimeslots[currentIndex + 1] : null
      })()
    : null

  const emptyTimeslot = {
    id: 0,
    name: '',
    description: null,
    startTime: '',
    endTime: '',
    recurrenceType: 'none' as const,
    recurrenceDays: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    familyId: 1,
    memberIds: [] as number[],
  }

  const currentTimeslotMembers = useTimeslotMembers(
    members,
    currentTimeslot || emptyTimeslot
  )

  const overallDayProgress = useOverallDayProgress(members, timeslots, todos, isTodoCompleted)

  return (
    <div className="space-y-4 sm:space-y-6">
      {currentTimeslot && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-theme-primary to-theme-secondary p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold text-white">
                    {currentTimeslotId === currentTimeslot.id ? 'NOW' : 'CURRENT'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">{currentTimeslot.name}</h2>
                {currentTimeslot.startTime && currentTimeslot.endTime && (
                  <p className="text-white/80 text-sm sm:text-base">
                    {currentTimeslot.startTime} - {currentTimeslot.endTime}
                  </p>
                )}
              </div>
              {nextTimeslot && (
                <div className="text-right">
                  <p className="text-white/70 text-xs sm:text-sm">Next up</p>
                  <p className="text-white font-semibold text-sm sm:text-base">{nextTimeslot.name}</p>
                  {nextTimeslot.startTime && (
                    <p className="text-white/70 text-xs">{nextTimeslot.startTime}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-gray-50">
            {currentTimeslotMembers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No members assigned to this timeslot</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 -mb-2 snap-x snap-mandatory">
                {currentTimeslotMembers.map((member) => (
                  <div key={member.id} className="snap-start">
                    <CurrentTimeslotCard
                      member={member}
                      timeslot={currentTimeslot}
                      todos={todos}
                      isTodoCompleted={isTodoCompleted}
                      onToggleTodo={onToggleTodo}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">Today's Progress</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-theme-primary">{overallDayProgress.percentage}%</span>
            <span className="text-xs sm:text-sm text-gray-500">
              ({overallDayProgress.completedCount}/{overallDayProgress.totalCount})
            </span>
          </div>
        </div>

        <ProgressBar
          completed={overallDayProgress.completedCount}
          total={overallDayProgress.totalCount}
          size="lg"
          className="mb-6"
        />

        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mb-2 snap-x snap-mandatory">
          {members.map((member) => (
            <div key={member.id} className="snap-start">
              <DaySummaryCard member={member} timeslots={timeslots} todos={todos} isTodoCompleted={isTodoCompleted} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
