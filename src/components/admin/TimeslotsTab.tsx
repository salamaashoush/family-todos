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
import { Plus, GripHorizontal, Trash2, Clock } from 'lucide-react'
import { useTimeslots, useMembers } from '../../hooks/useCollections'
import { timeslotsCollection, todosCollection } from '../../collections'
import { formatRecurrenceDays } from '../../utils/timeslots'
import { showToast } from '../Toast'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Button } from '../shared/Button'
import { Select } from '../shared/Select'
import { TimeslotForm } from './TimeslotForm'
import { QuickTaskForm } from './QuickTaskForm'
import { AdminCard } from './AdminCard'
import { SortableItem } from './SortableItem'
import type { Timeslot, Member } from '../../types'

interface TimeslotFormData {
  name: string
  description: string
  startTime: string
  endTime: string
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'none'
  recurrenceDays: string
  memberIds: number[]
}

export function TimeslotsTab() {
  const { data: timeslots, isLoading: timeslotsLoading } = useTimeslots()
  const { data: members } = useMembers()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTimeslot, setEditingTimeslot] = useState<Timeslot | null>(null)
  const [deletingTimeslot, setDeletingTimeslot] = useState<Timeslot | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMember, setFilterMember] = useState<number | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [localTimeslots, setLocalTimeslots] = useState<Timeslot[]>([])
  const [quickTaskTimeslot, setQuickTaskTimeslot] = useState<Timeslot | null>(null)

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

  const filteredTimeslots = useMemo(() => {
    const source = isReordering ? localTimeslots : timeslots
    if (!source) return []
    return source.filter((timeslot: Timeslot) => {
      const matchesSearch =
        searchQuery === '' ||
        timeslot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        timeslot.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesMember =
        filterMember === null || timeslot.memberIds?.includes(filterMember)
      return matchesSearch && matchesMember
    })
  }, [timeslots, localTimeslots, isReordering, searchQuery, filterMember])

  const handleAdd = async (data: TimeslotFormData) => {
    timeslotsCollection.insert({
      id: Date.now(),
      familyId: 0,
      name: data.name,
      description: data.description || null,
      startTime: data.startTime,
      endTime: data.endTime,
      recurrenceType: data.recurrenceType || 'daily',
      recurrenceDays: data.recurrenceDays || null,
      isActive: true,
      memberIds: data.memberIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).isPersisted.promise
      .then(() => showToast('Time slot created successfully', 'success'))
      .catch(() => showToast('Failed to create time slot', 'error'))
    setIsModalOpen(false)
  }

  const handleUpdate = async (data: TimeslotFormData) => {
    if (!editingTimeslot) return
    timeslotsCollection.update(editingTimeslot.id, (draft) => {
      draft.name = data.name
      draft.description = data.description || null
      draft.startTime = data.startTime
      draft.endTime = data.endTime
      draft.recurrenceType = data.recurrenceType || 'daily'
      draft.recurrenceDays = data.recurrenceDays || null
      draft.memberIds = data.memberIds
    }).isPersisted.promise
      .then(() => showToast('Time slot updated successfully', 'success'))
      .catch(() => showToast('Failed to update time slot', 'error'))
    setIsModalOpen(false)
    setEditingTimeslot(null)
  }

  const handleDelete = () => {
    if (!deletingTimeslot) return
    timeslotsCollection.delete(deletingTimeslot.id).isPersisted.promise
      .then(() => showToast('Time slot deleted successfully', 'success'))
      .catch(() => showToast('Failed to delete time slot', 'error'))
    setDeletingTimeslot(null)
  }

  const handleBulkDelete = () => {
    timeslotsCollection.delete([...selectedIds])
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
    if (selectedIds.size === filteredTimeslots.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTimeslots.map((t: Timeslot) => t.id)))
    }
  }

  const startReordering = () => {
    if (timeslots) {
      setLocalTimeslots([...timeslots])
      setIsReordering(true)
    }
  }

  const cancelReordering = () => {
    setIsReordering(false)
    setLocalTimeslots([])
  }

  const saveReordering = () => {
    // Timeslots don't have a position field, so we just save the current order
    setIsReordering(false)
    setLocalTimeslots([])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocalTimeslots((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const openAddModal = () => {
    setEditingTimeslot(null)
    setIsModalOpen(true)
  }

  const openEditModal = (timeslot: Timeslot) => {
    setEditingTimeslot(timeslot)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTimeslot(null)
  }

  const isSelecting = selectedIds.size > 0
  const canReorder = !searchQuery && filterMember === null && !isSelecting

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Time Slots</h2>
          <div className="flex items-center gap-2">
            {!isReordering && (
              <Button
                variant="secondary"
                onClick={startReordering}
                disabled={!canReorder || !timeslots?.length}
                leftIcon={<GripHorizontal className="w-5 h-5" />}
              >
                <span className="hidden sm:inline">Reorder</span>
              </Button>
            )}
            <Button onClick={openAddModal} leftIcon={<Plus className="w-5 h-5" />}>
              <span className="hidden sm:inline">Add Slot</span>
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
              <span className="font-medium">Drag to reorder</span>
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
                placeholder="Search time slots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all duration-200 min-h-[48px]"
              />
            </div>
            <Select
              value={filterMember ?? ''}
              onChange={(e) => setFilterMember(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All Members</option>
              {members?.map((m: Member) => (
                <option key={m.id} value={m.id}>
                  {m.name}
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
                  {selectedIds.size === filteredTimeslots.length ? (
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
                leftIcon={<Trash2 className="w-5 h-5" />}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Timeslots list */}
      {timeslotsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTimeslots.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || filterMember ? (
            <>
              <p className="text-lg">No time slots match your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterMember(null)
                }}
                className="mt-3 text-theme-primary hover:underline font-medium"
              >
                Clear filters
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <Clock className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-lg">No time slots yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Time Slot" above to create one</p>
            </div>
          )}
        </div>
      ) : isReordering ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredTimeslots.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredTimeslots.map((timeslot: Timeslot) => (
                <SortableItem key={timeslot.id} id={timeslot.id}>
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 truncate">{timeslot.name}</h3>
                        {timeslot.startTime && timeslot.endTime && (
                          <p className="text-sm text-gray-500">
                            {timeslot.startTime} - {timeslot.endTime}
                          </p>
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
          {filteredTimeslots.map((timeslot: Timeslot) => (
            <AdminCard
              key={timeslot.id}
              onDelete={() => setDeletingTimeslot(timeslot)}
              onEdit={() => openEditModal(timeslot)}
              isSelected={selectedIds.has(timeslot.id)}
              onSelect={() => toggleSelect(timeslot.id)}
              showCheckbox={true}
              extraActions={
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setQuickTaskTimeslot(timeslot)
                  }}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Quick add task"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </button>
              }
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-800">{timeslot.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {timeslot.startTime && timeslot.endTime && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {timeslot.startTime} - {timeslot.endTime}
                      </span>
                    )}
                    {timeslot.recurrenceType === 'daily' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Every day
                      </span>
                    )}
                    {timeslot.recurrenceType === 'weekly' && timeslot.recurrenceDays && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {formatRecurrenceDays(timeslot.recurrenceDays)}
                      </span>
                    )}
                    {timeslot.recurrenceType === 'none' && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        One-time
                      </span>
                    )}
                  </div>
                  {timeslot.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{timeslot.description}</p>
                  )}
                  {timeslot.memberIds && timeslot.memberIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {timeslot.memberIds.map((id: number) => {
                        const member = members?.find((m: Member) => m.id === id)
                        return member ? (
                          <span
                            key={id}
                            className="inline-block text-xs bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full font-medium"
                          >
                            {member.name}
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
        title={editingTimeslot ? 'Edit Time Slot' : 'Create Time Slot'}
      >
        <TimeslotForm
          timeslot={editingTimeslot}
          onSubmit={editingTimeslot ? handleUpdate : handleAdd}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingTimeslot}
        onClose={() => setDeletingTimeslot(null)}
        onConfirm={handleDelete}
        title="Delete Time Slot"
        message={`Are you sure you want to delete "${deletingTimeslot?.name}"? This action cannot be undone.`}
      />

      <ConfirmDialog
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Time Slots"
        message={`Are you sure you want to delete ${selectedIds.size} time slot${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`}
      />

      {/* Quick Task Creation Modal */}
      <Modal
        isOpen={!!quickTaskTimeslot}
        onClose={() => setQuickTaskTimeslot(null)}
        title={`Add Task to ${quickTaskTimeslot?.name || ''}`}
      >
        {quickTaskTimeslot && (
          <QuickTaskForm
            timeslotId={quickTaskTimeslot.id}
            timeslotName={quickTaskTimeslot.name}
            onSubmit={(data) => {
              todosCollection.insert({
                id: Date.now(),
                familyId: 0,
                title: data.title,
                description: data.description || null,
                imageUrl: null,
                symbol: data.symbol || null,
                position: 0,
                points: data.points ?? 5,
                timeslotIds: data.timeslotIds,
                createdAt: new Date(),
                updatedAt: new Date(),
              }).isPersisted.promise
                .then(() => {
                  setQuickTaskTimeslot(null)
                  showToast('Task created', 'success')
                })
                .catch(() => showToast('Failed to create task', 'error'))
            }}
            onCancel={() => setQuickTaskTimeslot(null)}
          />
        )}
      </Modal>
    </div>
  )
}
