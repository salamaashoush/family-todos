import { useState } from 'react'
import { useTimeslots, useMembers } from '../../hooks/useQueries'
import { useTimeslotMutations } from '../../hooks/useAdminMutations'
import { Modal } from '../shared/Modal'
import { TimeslotForm } from './TimeslotForm'
import type { Timeslot, Member } from '../../types'

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

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      remove.mutate({ data: { id } })
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Time Slots</h2>
        <button
          onClick={openAddModal}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Time Slot
        </button>
      </div>

      {timeslotsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="flex gap-2 mt-3">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {timeslots?.map((timeslot: Timeslot) => (
            <div
              key={timeslot.id}
              className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg hover:border-theme-primary transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg sm:text-xl text-gray-800">{timeslot.name}</h3>
                  {timeslot.start_time && timeslot.end_time && (
                    <p className="text-sm sm:text-base text-gray-600 mt-1 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {timeslot.start_time} - {timeslot.end_time}
                    </p>
                  )}
                  {timeslot.description && (
                    <p className="text-sm text-gray-600 mt-2">{timeslot.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {timeslot.member_ids?.map((id: number) => {
                      const member = members?.find((m: Member) => m.id === id)
                      return member ? (
                        <span
                          key={id}
                          className="inline-block text-xs sm:text-sm bg-purple-100 text-theme-primary px-3 py-1 rounded-full font-semibold"
                        >
                          {member.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openEditModal(timeslot)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm sm:text-base transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(timeslot.id, timeslot.name)}
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

      {!timeslotsLoading && timeslots?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-4">No time slots yet</p>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Create Your First Time Slot
          </button>
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
    </div>
  )
}
