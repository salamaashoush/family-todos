import { useState, useMemo } from 'react'
import { useTodos, useTimeslots } from '../../hooks/useQueries'
import { useTodoMutations } from '../../hooks/useAdminMutations'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { TodoForm } from './TodoForm'
import type { Todo, Timeslot } from '../../types'

interface TodoFormData {
  title: string
  description: string
  symbol: string
  image_url: string
  position: number
  timeslot_ids: number[]
}

export function TodosTab() {
  const { data: todos, isLoading: todosLoading } = useTodos()
  const { data: timeslots } = useTimeslots()
  const { create, update, remove } = useTodoMutations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTimeslot, setFilterTimeslot] = useState<number | null>(null)

  const filteredTodos = useMemo(() => {
    if (!todos) return []
    return todos.filter((todo: Todo) => {
      const matchesSearch =
        searchQuery === '' ||
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTimeslot =
        filterTimeslot === null || todo.timeslot_ids?.includes(filterTimeslot)
      return matchesSearch && matchesTimeslot
    })
  }, [todos, searchQuery, filterTimeslot])

  const handleAdd = async (data: TodoFormData) => {
    create.mutate({ data })
    setIsModalOpen(false)
  }

  const handleUpdate = async (data: TodoFormData) => {
    if (!editingTodo) return
    update.mutate({ data: { id: editingTodo.id, ...data } })
    setIsModalOpen(false)
    setEditingTodo(null)
  }

  const handleDelete = () => {
    if (!deletingTodo) return
    remove.mutate({ data: { id: deletingTodo.id } })
    setDeletingTodo(null)
  }

  const openAddModal = () => {
    setEditingTodo(null)
    setIsModalOpen(true)
  }

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTodo(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
        <button
          onClick={openAddModal}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 min-h-[48px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-theme-primary focus:outline-none transition-colors min-h-[48px]"
          />
        </div>
        <select
          value={filterTimeslot ?? ''}
          onChange={(e) => setFilterTimeslot(e.target.value ? Number(e.target.value) : null)}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-theme-primary focus:outline-none transition-colors min-h-[48px] bg-white"
        >
          <option value="">All Time Slots</option>
          {timeslots?.map((ts: Timeslot) => (
            <option key={ts.id} value={ts.id}>
              {ts.name}
            </option>
          ))}
        </select>
      </div>

      {todosLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="flex gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTodos.length === 0 && (searchQuery || filterTimeslot) ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No tasks match your search</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterTimeslot(null)
                }}
                className="mt-3 text-theme-primary hover:underline font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredTodos.map((todo: Todo) => (
              <div
                key={todo.id}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg hover:border-theme-primary transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 sm:gap-4 flex-1">
                    {todo.symbol && <span className="text-3xl sm:text-4xl flex-shrink-0">{todo.symbol}</span>}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg sm:text-xl text-gray-800">{todo.title}</h3>
                      {todo.description && <p className="text-sm text-gray-600 mt-2">{todo.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {todo.timeslot_ids?.map((id: number) => {
                          const timeslot = timeslots?.find((t: Timeslot) => t.id === id)
                          return timeslot ? (
                            <span
                              key={id}
                              className="inline-block text-xs sm:text-sm bg-purple-100 text-theme-primary px-3 py-1 rounded-full font-semibold"
                            >
                              {timeslot.name}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(todo)}
                      className="p-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center gap-2"
                      aria-label={`Edit ${todo.title}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => setDeletingTodo(todo)}
                      className="p-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center gap-2"
                      aria-label={`Delete ${todo.title}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!todosLoading && todos?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-4">No tasks yet</p>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Create Your First Task
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTodo ? 'Edit Task' : 'Create Task'}
      >
        <TodoForm
          todo={editingTodo}
          onSubmit={editingTodo ? handleUpdate : handleAdd}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingTodo}
        onClose={() => setDeletingTodo(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTodo?.title}"? This action cannot be undone.`}
      />
    </div>
  )
}
