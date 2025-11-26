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
import { useTimeslots, useMembers } from '../../hooks/useQueries'
import { useTimeslotMutations } from '../../hooks/useAdminMutations'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Button } from '../shared/Button'
import { Select } from '../shared/Select'
import { TimeslotForm } from './TimeslotForm'
import { AdminCard } from './AdminCard'
import { SortableItem } from './SortableItem'
import type { Timeslot, Member } from '../../types'

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

interface TimeslotFormData {
  name: string
  description: string
  start_time: string
  end_time: string
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'none'
  recurrence_days: string
  member_ids: number[]
}

export function TimeslotsTab() {
  const { data: timeslots, isLoading: timeslotsLoading } = useTimeslots()
  const { data: members } = useMembers()
  const { create, update, remove } = useTimeslotMutations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTimeslot, setEditingTimeslot] = useState<Timeslot | null>(null)
  const [deletingTimeslot, setDeletingTimeslot] = useState<Timeslot | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMember, setFilterMember] = useState<number | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [localTimeslots, setLocalTimeslots] = useState<Timeslot[]>([])

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
        filterMember === null || timeslot.member_ids?.includes(filterMember)
      return matchesSearch && matchesMember
    })
  }, [timeslots, localTimeslots, isReordering, searchQuery, filterMember])

  const handleAdd = async (data: TimeslotFormData) => {
    create.mutate({ data })
    setIsModalOpen(false)
  }

  const handleUpdate = async (data: TimeslotFormData) => {
    if (!editingTimeslot) return
    update.mutate({ data: { id: editingTimeslot.id, ...data } })
    setIsModalOpen(false)
    setEditingTimeslot(null)
  }

  const handleDelete = () => {
    if (!deletingTimeslot) return
    remove.mutate({ data: { id: deletingTimeslot.id } })
    setDeletingTimeslot(null)
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
    localTimeslots.forEach((timeslot) => {
      update.mutate({
        data: {
          id: timeslot.id,
          name: timeslot.name,
          description: timeslot.description || '',
          start_time: timeslot.start_time || '',
          end_time: timeslot.end_time || '',
          recurrence_type: timeslot.recurrence_type || 'daily',
          recurrence_days: timeslot.recurrence_days || '',
          member_ids: timeslot.member_ids || [],
        },
      })
    })
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
                leftIcon={<ReorderIcon />}
              >
                <span className="hidden sm:inline">Reorder</span>
              </Button>
            )}
            <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
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
                leftIcon={<TrashIcon />}
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
            <>
              <p className="text-lg mb-4">No time slots yet</p>
              <Button onClick={openAddModal} leftIcon={<PlusIcon />}>
                Create Your First Time Slot
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
                        {timeslot.start_time && timeslot.end_time && (
                          <p className="text-sm text-gray-500">
                            {timeslot.start_time} - {timeslot.end_time}
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
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-800">{timeslot.name}</h3>
                  {timeslot.start_time && timeslot.end_time && (
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {timeslot.start_time} - {timeslot.end_time}
                    </p>
                  )}
                  {timeslot.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{timeslot.description}</p>
                  )}
                  {timeslot.member_ids && timeslot.member_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {timeslot.member_ids.map((id: number) => {
                        const member = members?.find((m: Member) => m.id === id)
                        return member ? (
                          <span
                            key={id}
                            className="inline-block text-xs bg-purple-100 text-theme-primary px-2 py-0.5 rounded-full font-medium"
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
    </div>
  )
}
