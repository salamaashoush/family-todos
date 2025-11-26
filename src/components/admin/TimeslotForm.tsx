import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useMembers } from '../../hooks/useQueries'
import { useMemberMutations } from '../../hooks/useAdminMutations'
import { getErrorMessage } from '../../utils/form'
import { showToast } from '../Toast'
import { Button, Input, Textarea, Select, MultiSelect } from '../shared'
import { Modal } from '../shared/Modal'
import { MemberForm } from './MemberForm'
import type { Timeslot, Member } from '../../types'

const timeslotSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters'),
  startTime: z.string(),
  endTime: z.string(),
  recurrenceType: z.enum(['daily', 'weekly', 'monthly', 'none']),
  recurrenceDays: z.string(),
  memberIds: z.array(z.number()).min(1, 'Select at least one family member'),
}).refine(
  (data) => {
    if (!data.startTime || !data.endTime) return true
    return data.startTime < data.endTime
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => {
    if (data.recurrenceType === 'weekly') {
      return data.recurrenceDays.length > 0
    }
    return true
  },
  {
    message: 'Select at least one day for weekly schedule',
    path: ['recurrenceDays'],
  }
)

type TimeslotFormData = z.infer<typeof timeslotSchema>

interface TimeslotFormProps {
  timeslot?: Timeslot | null
  onSubmit: (data: TimeslotFormData) => Promise<void>
  onCancel: () => void
}

export function TimeslotForm({ timeslot, onSubmit, onCancel }: TimeslotFormProps) {
  const { data: members, isLoading: membersLoading } = useMembers()
  const { create: createMember } = useMemberMutations()
  const [showMemberModal, setShowMemberModal] = useState(false)

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      startTime: '',
      endTime: '',
      recurrenceType: 'daily',
      recurrenceDays: '',
      memberIds: [],
    } as TimeslotFormData,
    validators: {
      onChange: timeslotSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
      form.reset()
    },
  })

  useEffect(() => {
    if (timeslot) {
      form.setFieldValue('name', timeslot.name)
      form.setFieldValue('description', timeslot.description || '')
      form.setFieldValue('startTime', timeslot.startTime || '')
      form.setFieldValue('endTime', timeslot.endTime || '')
      form.setFieldValue('recurrenceType', timeslot.recurrenceType)
      form.setFieldValue('recurrenceDays', timeslot.recurrenceDays || '')
      form.setFieldValue('memberIds', timeslot.memberIds || [])
    } else {
      form.reset()
    }
  }, [timeslot, form])

  // Transform members for MultiSelect
  const memberOptions = (members || []).map((m: Member) => ({
    value: m.id,
    label: m.name,
    subtitle: m.isParent ? 'Parent' : undefined,
    icon: m.avatar ? (
      <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-white font-bold text-sm">
        {m.name.charAt(0).toUpperCase()}
      </div>
    ),
  }))

  // Handler for creating a new member inline
  const handleCreateMember = async (data: { name: string; avatar: string }) => {
    createMember.mutate(
      { data },
      {
        onSuccess: () => {
          setShowMemberModal(false)
          showToast('Member created', 'success')
        },
      }
    )
  }

  const hasNoMembers = !membersLoading && (!members || members.length === 0)

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        {/* Warning if no members */}
        {hasNoMembers && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">No family members yet</p>
                <p className="text-sm text-amber-700 mt-1">
                  You need at least one family member before creating a time slot.
                </p>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(true)}
                  className="mt-2 text-sm font-semibold text-amber-700 hover:text-amber-800 underline"
                >
                  Add a family member now
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field
            name="name"
            children={(field) => (
              <Input
                label="Time Slot Name *"
                type="text"
                placeholder="e.g., Morning Routine"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
              />
            )}
          />

          <form.Field
            name="recurrenceType"
            children={(field) => (
              <Select
                label="Repeat Schedule"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as TimeslotFormData['recurrenceType'])}
                fullWidth
              >
                <option value="daily">Every Day</option>
                <option value="weekly">Every Week</option>
                <option value="none">One Time Only</option>
              </Select>
            )}
          />
        </div>

        <form.Subscribe
          selector={(state) => state.values.recurrenceType}
          children={(recurrenceType) =>
            recurrenceType === 'weekly' ? (
              <form.Field
                name="recurrenceDays"
                children={(field) => {
                  // Days with numeric values matching Date.getDay() (0=Sunday, 6=Saturday)
                  const DAYS = [
                    { value: '0', label: 'Sun' },
                    { value: '1', label: 'Mon' },
                    { value: '2', label: 'Tue' },
                    { value: '3', label: 'Wed' },
                    { value: '4', label: 'Thu' },
                    { value: '5', label: 'Fri' },
                    { value: '6', label: 'Sat' },
                  ]
                  const selectedDays = field.state.value ? field.state.value.split(',').filter(Boolean) : []

                  const toggleDay = (day: string) => {
                    const newDays = selectedDays.includes(day)
                      ? selectedDays.filter((d) => d !== day)
                      : [...selectedDays, day]
                    // Sort days numerically (0-6)
                    newDays.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                    field.handleChange(newDays.join(','))
                  }

                  return (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Repeat on Days *</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-primary/50 ${
                              selectedDays.includes(day.value)
                                ? 'bg-theme-primary text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      {selectedDays.length === 0 && (
                        <p className="text-sm text-amber-600 mt-2">Select at least one day</p>
                      )}
                    </div>
                  )
                }}
              />
            ) : null
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field
            name="startTime"
            children={(field) => (
              <Input
                label="Start Time"
                type="time"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          />

          <form.Field
            name="endTime"
            children={(field) => (
              <Input
                label="End Time"
                type="time"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          />
        </div>

        <form.Field
          name="description"
          children={(field) => (
            <Textarea
              label="Description (Optional)"
              placeholder="Add notes about this time slot..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={2}
              error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            />
          )}
        />

        <form.Field
          name="memberIds"
          children={(field) => (
            <MultiSelect
              label="Assign to Family Members *"
              options={memberOptions}
              value={field.state.value}
              onChange={(values) => field.handleChange(values as number[])}
              placeholder="Select family members..."
              isLoading={membersLoading}
              error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
              onCreateNew={() => setShowMemberModal(true)}
              createNewLabel="Add New Member"
              emptyMessage="No family members yet. Add one to get started."
            />
          )}
        />

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || hasNoMembers}
                isLoading={isSubmitting}
              >
                {timeslot ? 'Update Time Slot' : 'Create Time Slot'}
              </Button>
            </div>
          )}
        />
      </form>

      {/* Inline Member Creation Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title="Add Family Member"
      >
        <MemberForm
          onSubmit={handleCreateMember}
          onCancel={() => setShowMemberModal(false)}
        />
      </Modal>
    </>
  )
}
