import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers } from '../server/members'
import { getTimeslots } from '../server/timeslots'
import { getTodos } from '../server/todos'
import { getTodoCompletions, completeTodo, uncompleteTodo } from '../server/completions'
import { getMemberStats, getMemberAchievements } from '../server/statistics'
import { useState } from 'react'
import type { Member, Timeslot, Todo, TodoCompletion, MemberStats, Achievement } from '../db/schema'

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
  const queryClient = useQueryClient()

  const { data: members } = useSuspenseQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })

  const { data: timeslots } = useSuspenseQuery({
    queryKey: ['timeslots'],
    queryFn: () => getTimeslots({ data: {} }),
  })

  const { data: todos } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: () => getTodos({ data: {} }),
  })

  const { data: completions } = useSuspenseQuery({
    queryKey: ['completions', selectedDate],
    queryFn: () => getTodoCompletions({ data: { date: selectedDate } }),
  })

  const completeMutation = useMutation({
    mutationFn: completeTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['memberStats'] })
      queryClient.invalidateQueries({ queryKey: ['memberAchievements'] })
    },
  })

  const uncompleteMutation = useMutation({
    mutationFn: uncompleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['memberStats'] })
      queryClient.invalidateQueries({ queryKey: ['memberAchievements'] })
    },
  })

  const handleToggleTodo = (todoId: number, memberId: number, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteMutation.mutate({ data: { todo_id: todoId, member_id: memberId, completion_date: selectedDate } })
    } else {
      completeMutation.mutate({ data: { todo_id: todoId, member_id: memberId, completion_date: selectedDate } })
    }
  }

  const isTodoCompleted = (todoId: number, memberId: number) => {
    return completions?.some(c => c.todo_id === todoId && c.member_id === memberId) || false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <header className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-10 border-b-4 border-purple-300">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 whitespace-nowrap">
              Family Todos
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl border-3 border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none min-h-[44px] w-auto shadow-md transition-all hover:shadow-lg bg-white"
            />
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto p-2 sm:p-4 lg:p-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {members?.map((member) => {
            const memberTimeslots = timeslots?.filter((t: any) => t.member_ids?.includes(member.id)) || []
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

        {members?.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <p className="text-xl sm:text-2xl text-gray-600 mb-4">No family members yet!</p>
            <Link
              to="/admin"
              className="inline-block px-6 sm:px-8 py-4 sm:py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-xl transition-colors min-h-[48px]"
            >
              Add Members in Admin Panel
            </Link>
          </div>
        )}
      </div>

      <Link
        to="/admin"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800 text-white p-4 sm:p-5 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-110 active:scale-95 z-50 group min-w-[56px] min-h-[56px] sm:min-w-[64px] sm:min-h-[64px] flex items-center justify-center"
        aria-label="Admin Panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Admin Panel
        </span>
      </Link>
    </div>
  )
}

interface MemberColumnProps {
  member: Member
  timeslots: Timeslot[]
  todos: Todo[]
  completions: TodoCompletion[]
  isTodoCompleted: (todoId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, memberId: number, isCompleted: boolean) => void
}

function MemberColumn({ member, timeslots, todos, isTodoCompleted, onToggleTodo }: MemberColumnProps) {
  const { data: stats } = useSuspenseQuery({
    queryKey: ['memberStats', member.id],
    queryFn: () => getMemberStats({ data: { member_id: member.id } }),
  })

  const { data: achievements } = useSuspenseQuery({
    queryKey: ['memberAchievements', member.id],
    queryFn: () => getMemberAchievements({ data: { member_id: member.id } }),
  })

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-4 sm:p-6 text-center flex-shrink-0">
        {member.avatar && (
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold text-white">{member.name}</h2>
      </div>

      {stats && <StatsDisplay stats={stats} achievements={achievements || []} />}

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
        {timeslots.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No timeslots yet
          </div>
        )}
        {timeslots.map((timeslot: any) => {
          const timeslotTodos = todos.filter((t: any) => t.timeslot_ids?.includes(timeslot.id))
          return (
            <TimeslotCard
              key={timeslot.id}
              timeslot={timeslot}
              todos={timeslotTodos}
              memberId={member.id}
              isTodoCompleted={isTodoCompleted}
              onToggleTodo={onToggleTodo}
            />
          )
        })}
      </div>
    </div>
  )
}

interface TimeslotCardProps {
  timeslot: Timeslot
  todos: Todo[]
  memberId: number
  isTodoCompleted: (todoId: number, memberId: number) => boolean
  onToggleTodo: (todoId: number, memberId: number, isCompleted: boolean) => void
}

function TimeslotCard({ timeslot, todos, memberId, isTodoCompleted, onToggleTodo }: TimeslotCardProps) {
  const completedCount = todos.filter(t => isTodoCompleted(t.id, memberId)).length
  const totalCount = todos.length
  const allCompleted = totalCount > 0 && completedCount === totalCount

  return (
    <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all ${allCompleted ? 'bg-green-100 border-4 border-green-400' : 'bg-gray-50 border-4 border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800">{timeslot.name}</h3>
        {timeslot.start_time && timeslot.end_time && (
          <span className="text-xs sm:text-sm font-semibold text-gray-600 bg-white px-3 py-2 rounded-full self-start sm:self-auto">
            {timeslot.start_time} - {timeslot.end_time}
          </span>
        )}
      </div>

      {timeslot.description && (
        <p className="text-gray-600 mb-3 text-sm">{timeslot.description}</p>
      )}

      <div className="space-y-2 sm:space-y-3">
        {todos.length === 0 && (
          <div className="text-center text-gray-400 py-4 text-sm">
            No tasks yet
          </div>
        )}
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            memberId={memberId}
            isCompleted={isTodoCompleted(todo.id, memberId)}
            onToggle={(isCompleted) => onToggleTodo(todo.id, memberId, isCompleted)}
          />
        ))}
      </div>

      {totalCount > 0 && (
        <div className="mt-3 pt-3 border-t-2 border-gray-300">
          <div className="flex items-center justify-between text-sm sm:text-base font-semibold">
            <span className="text-gray-700">Progress:</span>
            <span className={allCompleted ? 'text-green-600' : 'text-purple-600'}>
              {completedCount} / {totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
            <div
              className={`h-4 rounded-full transition-all ${allCompleted ? 'bg-green-500' : 'bg-purple-500'}`}
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface TodoItemProps {
  todo: Todo
  memberId: number
  isCompleted: boolean
  onToggle: (isCompleted: boolean) => void
}

function TodoItem({ todo, isCompleted, onToggle }: TodoItemProps) {
  return (
    <button
      onClick={() => onToggle(isCompleted)}
      className={`w-full p-4 sm:p-5 rounded-xl text-left transition-all transform active:scale-95 touch-manipulation min-h-[64px] ${
        isCompleted
          ? 'bg-green-200 border-4 border-green-500 shadow-md'
          : 'bg-white border-4 border-purple-300 hover:border-purple-500 active:border-purple-600 shadow-lg hover:shadow-xl'
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-500 border-green-600' : 'bg-white border-purple-400'
        }`}>
          {isCompleted && <span className="text-white text-2xl sm:text-3xl font-bold">✓</span>}
        </div>

        <div className="flex-1 min-w-0">
          {todo.image_url && (
            <div className="mb-2">
              <img src={todo.image_url} alt={todo.title} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg" />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {todo.symbol && (
              <span className="text-3xl sm:text-4xl">{todo.symbol}</span>
            )}
            <span className={`text-base sm:text-lg font-semibold break-words ${isCompleted ? 'line-through text-gray-600' : 'text-gray-800'}`}>
              {todo.title}
            </span>
          </div>

          {todo.description && (
            <p className={`text-sm sm:text-base mt-1 break-words ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
              {todo.description}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

interface StatsDisplayProps {
  stats: MemberStats
  achievements: (Achievement & { earned_at: string | null })[]
}

function StatsDisplay({ stats, achievements }: StatsDisplayProps) {
  const earnedAchievements = achievements.filter(a => a.earned_at)
  const nextAchievements = achievements.filter(a => !a.earned_at).slice(0, 3)
  const levelProgress = (stats.total_stars % 50) / 50 * 100

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 border-b-4 border-yellow-300 flex-shrink-0">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-xl p-3 shadow-md border-2 border-yellow-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⭐</span>
            <span className="text-xs font-bold text-gray-600">Level {stats.level}</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.total_stars}</div>
          <div className="text-xs text-gray-500">Stars</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {50 - (stats.total_stars % 50)} to Level {stats.level + 1}
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-md border-2 border-orange-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{stats.current_streak > 0 ? '🔥' : '💤'}</span>
            <span className="text-xs font-bold text-gray-600">Streak</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.current_streak}</div>
          <div className="text-xs text-gray-500">
            {stats.current_streak === 1 ? 'Day' : 'Days'}
          </div>
          <div className="text-xs text-gray-600 mt-2">
            Best: {stats.longest_streak}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-md border-2 border-purple-400 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span className="text-xs font-bold text-gray-600">Tasks Completed</span>
          </div>
          <span className="text-lg font-bold text-purple-600">{stats.total_tasks_completed}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="text-xs font-bold text-gray-600">Timeslots Done</span>
          </div>
          <span className="text-lg font-bold text-green-600">{stats.total_timeslots_completed}</span>
        </div>
      </div>

      {earnedAchievements.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-gray-700">Latest Achievements</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {earnedAchievements.slice(0, 4).map(achievement => (
              <div
                key={achievement.id}
                className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-2 min-w-[80px] text-center shadow-lg flex-shrink-0"
                title={achievement.description}
              >
                <div className="text-3xl mb-1">{achievement.icon}</div>
                <div className="text-xs font-bold leading-tight">{achievement.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nextAchievements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-gray-700">Next Goals</span>
          </div>
          <div className="space-y-2">
            {nextAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="bg-white/60 rounded-lg p-2 flex items-center gap-2 border-2 border-gray-300"
              >
                <span className="text-2xl opacity-50">{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-700 truncate">{achievement.name}</div>
                  <div className="text-xs text-gray-500 truncate">{achievement.description}</div>
                </div>
                <span className="text-xs font-bold text-purple-600 flex-shrink-0">+{achievement.star_reward}⭐</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
