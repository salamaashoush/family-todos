import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers } from '../server/members'
import { getTimeslots } from '../server/timeslots'
import { getTodos } from '../server/todos'
import { getTodoCompletions, completeTodo, uncompleteTodo } from '../server/completions'
import { useState } from 'react'
import type { Member, Timeslot, Todo, TodoCompletion } from '../db/schema'

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
    },
  })

  const uncompleteMutation = useMutation({
    mutationFn: uncompleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions', selectedDate] })
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-5xl font-bold text-purple-600 mb-4">Family Todo Board</h1>
          <div className="flex items-center justify-center gap-4 mb-4">
            <label className="text-2xl font-semibold text-gray-700">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 text-xl rounded-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <Link
            to="/admin"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
          >
            Admin Panel
          </Link>
        </header>

        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${members?.length || 1}, minmax(300px, 1fr))` }}>
          {members?.map((member) => (
            <MemberColumn
              key={member.id}
              member={member}
              timeslots={timeslots?.filter(t => t.member_id === member.id) || []}
              todos={todos || []}
              completions={completions || []}
              isTodoCompleted={isTodoCompleted}
              onToggleTodo={handleToggleTodo}
            />
          ))}
        </div>

        {members?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-2xl text-gray-600 mb-4">No family members yet!</p>
            <Link
              to="/admin"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              Add Members in Admin Panel
            </Link>
          </div>
        )}
      </div>
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
  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-6 text-center">
        {member.avatar && (
          <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-3xl font-bold text-white">{member.name}</h2>
      </div>

      <div className="p-4 space-y-4">
        {timeslots.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No timeslots yet
          </div>
        )}
        {timeslots.map((timeslot) => (
          <TimeslotCard
            key={timeslot.id}
            timeslot={timeslot}
            todos={todos.filter(t => t.timeslot_id === timeslot.id)}
            memberId={member.id}
            isTodoCompleted={isTodoCompleted}
            onToggleTodo={onToggleTodo}
          />
        ))}
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
    <div className={`rounded-2xl p-4 transition-all ${allCompleted ? 'bg-green-100 border-4 border-green-400' : 'bg-gray-50 border-4 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800">{timeslot.name}</h3>
        {timeslot.start_time && timeslot.end_time && (
          <span className="text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded-full">
            {timeslot.start_time} - {timeslot.end_time}
          </span>
        )}
      </div>

      {timeslot.description && (
        <p className="text-gray-600 mb-3 text-sm">{timeslot.description}</p>
      )}

      <div className="space-y-2">
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
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-700">Progress:</span>
            <span className={allCompleted ? 'text-green-600' : 'text-purple-600'}>
              {completedCount} / {totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div
              className={`h-3 rounded-full transition-all ${allCompleted ? 'bg-green-500' : 'bg-purple-500'}`}
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
      className={`w-full p-4 rounded-xl text-left transition-all transform hover:scale-105 ${
        isCompleted
          ? 'bg-green-200 border-4 border-green-500'
          : 'bg-white border-4 border-purple-300 hover:border-purple-500'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-500 border-green-600' : 'bg-white border-purple-400'
        }`}>
          {isCompleted && <span className="text-white text-xl">✓</span>}
        </div>

        <div className="flex-1">
          {todo.image_url && (
            <div className="mb-2">
              <img src={todo.image_url} alt={todo.title} className="w-16 h-16 object-cover rounded-lg" />
            </div>
          )}

          <div className="flex items-center gap-2">
            {todo.symbol && (
              <span className="text-3xl">{todo.symbol}</span>
            )}
            <span className={`text-lg font-semibold ${isCompleted ? 'line-through text-gray-600' : 'text-gray-800'}`}>
              {todo.title}
            </span>
          </div>

          {todo.description && (
            <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
              {todo.description}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
