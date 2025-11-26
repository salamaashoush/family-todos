import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useTodos, useTimeslots } from '../../hooks/useQueries'
import { useTodoMutations } from '../../hooks/useAdminMutations'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Button } from '../shared/Button'
import { Select } from '../shared/Select'
import { TodoForm } from './TodoForm'
import { AdminCard } from './AdminCard'
import { SortableItem } from './SortableItem'
import type { Todo, Timeslot } from '../../types'

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const ReorderIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTimeslot, setFilterTimeslot] = useState<number | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [localTodos, setLocalTodos] = useState<Todo[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredTodos = useMemo(() => {
    const source = isReordering ? localTodos : todos
    if (!source) return []
    return source.filter((todo: Todo) => {
      const matchesSearch =
        searchQuery === '' ||
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTimeslot =
        filterTimeslot === null || todo.timeslot_ids?.includes(filterTimeslot)
      return matchesSearch && matchesTimeslot
    })
  }, [todos, localTodos, isReordering, searchQuery, filterTimeslot])

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

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => {
      remove.mutate({ data: { id } })
    })
    setSelectedIds(new Set())
    setShowBulkDelete(false)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTodos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTodos.map((t: Todo) => t.id)))
    }
  }

  const startReordering = () => {
    if (todos) {
      setLocalTodos([...todos])
      setIsReordering(true)
    }
  }

  const cancelReordering = () => {
    setIsReordering(false)
    setLocalTodos([])
  }

  const saveReordering = () => {
    localTodos.forEach((todo, index) => {
      if (todo.position !== index) {
        update.mutate({
          data: {
            id: todo.id,
            title: todo.title,
            description: todo.description || '',
            symbol: todo.symbol || '',
            image_url: todo.image_url || '',
            position: index,
            timeslot_ids: todo.timeslot_ids || [],
          },
        })
      }
    })
    setIsReordering(false)
    setLocalTodos([])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocalTodos((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
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

  const isSelecting = selectedIds.size > 0
  const canReorder = !searchQuery && filterTimeslot === null && !isSelecting

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Tasks</h2>
          <div className="flex items-center gap-2">
            {!isReordering && (
              <Button
                variant="secondary"
                onClick={startReordering}
                disabled={!canReorder || !todos?.length}
                leftIcon={<ReorderIcon />}
              >
                <span className="hidden sm:inline">Reorder</span>
              </Button>
            )}
            <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
              <span className="hidden sm:inline">Add Task</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Reordering bar */}
        {isReordering && (
          <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="font-medium">Drag tasks to reorder</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={cancelReordering}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveReordering}>
                Save Order
              </Button>
            </div>
          </div>
        )}

        {/* Search and filter */}
        {!isReordering && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all duration-200 min-h-[48px]"
              />
            </div>
            <Select
              value={filterTimeslot ?? ''}
              onChange={(e) => setFilterTimeslot(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All Time Slots</option>
              {timeslots?.map((ts: Timeslot) => (
                <option key={ts.id} value={ts.id}>
                  {ts.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Bulk actions bar */}
        {isSelecting && !isReordering && (
          <div className="flex items-center justify-between bg-theme-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="p-2 hover:bg-theme-primary/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {selectedIds.size === filteredTodos.length ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8v8m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </button>
              <span className="font-semibold text-theme-primary">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowBulkDelete(true)}
                leftIcon={<TrashIcon />}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Todos list */}
      {todosLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || filterTimeslot ? (
            <>
              <p className="text-lg">No tasks match your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterTimeslot(null)
                }}
                className="mt-3 text-theme-primary hover:underline font-medium"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-lg mb-4">No tasks yet</p>
              <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
                Create Your First Task
              </Button>
            </>
          )}
        </div>
      ) : isReordering ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredTodos.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredTodos.map((todo: Todo) => (
                <SortableItem key={todo.id} id={todo.id}>
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      {todo.symbol && (
                        <span className="text-2xl flex-shrink-0">{todo.symbol}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 truncate">{todo.title}</h3>
                        {todo.description && (
                          <p className="text-sm text-gray-500 truncate">{todo.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {filteredTodos.map((todo: Todo) => (
            <AdminCard
              key={todo.id}
              onDelete={() => setDeletingTodo(todo)}
              onEdit={() => openEditModal(todo)}
              isSelected={selectedIds.has(todo.id)}
              onSelect={() => toggleSelect(todo.id)}
              showCheckbox={true}
            >
              <div className="flex items-start gap-3">
                {todo.symbol && (
                  <span className="text-3xl flex-shrink-0">{todo.symbol}</span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-800">{todo.title}</h3>
                  {todo.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{todo.description}</p>
                  )}
                  {todo.timeslot_ids && todo.timeslot_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {todo.timeslot_ids.map((id: number) => {
                        const timeslot = timeslots?.find((t: Timeslot) => t.id === id)
                        return timeslot ? (
                          <span
                            key={id}
                            className="inline-block text-xs bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full font-medium"
                          >
                            {timeslot.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
            </AdminCard>
          ))}
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

      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Tasks"
        message={`Are you sure you want to delete ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`}
      />
    </div>
  )
}
