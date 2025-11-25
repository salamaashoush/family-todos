import { useState } from 'react'
import { useTodos, useTimeslots } from '../../hooks/useQueries'
import { useTodoMutations } from '../../hooks/useAdminMutations'
import { Modal } from '../shared/Modal'
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

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Delete "${title}"?`)) {
      remove.mutate({ data: { id } })
    }
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
        <button
          onClick={openAddModal}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
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
          {todos?.map((todo: Todo) => (
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id, todo.title)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  )
}
