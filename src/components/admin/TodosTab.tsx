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
import { Plus, GripHorizontal, Trash2, ClipboardList, ArrowUpDown, Search, CheckCircle, PlusCircle } from 'lucide-react'
import { useTodos, useTimeslots } from '../../hooks/useQueries'
import { useTodoMutations } from '../../hooks/useAdminMutations'
import { Modal, ConfirmDialog, Button, Select, SkeletonCard, EmptyState, Badge } from '../shared'
import { TodoForm } from './TodoForm'
import { AdminCard } from './AdminCard'
import { SortableItem } from './SortableItem'
import { getDisplaySymbol } from '../../utils/symbols'
import type { Todo, Timeslot } from '../../types'

interface TodoFormData {
  title: string
  description: string
  symbol: string
  imageUrl: string
  position: number
  timeslotIds: number[]
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
        filterTimeslot === null || todo.timeslotIds?.includes(filterTimeslot)
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
            imageUrl: todo.imageUrl || '',
            position: index,
            timeslotIds: todo.timeslotIds || [],
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
                leftIcon={<GripHorizontal className="w-5 h-5" />}
              >
                <span className="hidden sm:inline">Reorder</span>
              </Button>
            )}
            <Button onClick={openAddModal} leftIcon={<Plus className="w-5 h-5" />}>
              <span className="hidden sm:inline">Add Task</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Reordering bar */}
        {isReordering && (
          <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <ArrowUpDown className="w-5 h-5" />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
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
                {selectedIds.size === filteredTodos.length ? (
                  <CheckCircle className="w-5 h-5 text-theme-primary" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-theme-primary" />
                )}
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
                leftIcon={<Trash2 className="w-5 h-5" />}
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
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : filteredTodos.length === 0 ? (
        (searchQuery || filterTimeslot) ? (
          <EmptyState
            title="No tasks match your filters"
            action={{
              label: 'Clear filters',
              onClick: () => {
                setSearchQuery('')
                setFilterTimeslot(null)
              },
            }}
          />
        ) : (
          <EmptyState
            icon={<ClipboardList className="w-12 h-12 text-gray-300 mb-4" />}
            title="No tasks yet"
            description="Click 'Add Task' above to create one"
          />
        )
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
                      {getDisplaySymbol(todo.symbol) && (
                        <span className="text-2xl flex-shrink-0">{getDisplaySymbol(todo.symbol)}</span>
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
                {getDisplaySymbol(todo.symbol) && (
                  <span className="text-3xl flex-shrink-0">{getDisplaySymbol(todo.symbol)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-800">{todo.title}</h3>
                  {todo.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{todo.description}</p>
                  )}
                  {todo.timeslotIds && todo.timeslotIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {todo.timeslotIds.map((id: number) => {
                        const timeslot = timeslots?.find((t: Timeslot) => t.id === id)
                        return timeslot ? (
                          <Badge key={id} variant="primary" size="sm">
                            {timeslot.name}
                          </Badge>
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
