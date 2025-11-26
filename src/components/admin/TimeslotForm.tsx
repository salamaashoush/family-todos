import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useMembers } from '../../hooks/useQueries'
import { Button } from '../shared/Button'
import { Select } from '../shared/Select'
import type { Timeslot, Member } from '../../types'

const timeslotSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters'),
  start_time: z.string(),
  end_time: z.string(),
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'none']),
  recurrence_days: z.string(),
  member_ids: z.array(z.number()).min(1, 'Select at least one family member'),
}).refine(
  (data) => {
    if (!data.start_time || !data.end_time) return true
    return data.start_time < data.end_time
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
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

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      start_time: '',
      end_time: '',
      recurrence_type: 'daily',
      recurrence_days: '',
      member_ids: [],
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
      form.setFieldValue('start_time', timeslot.start_time || '')
      form.setFieldValue('end_time', timeslot.end_time || '')
      form.setFieldValue('recurrence_type', timeslot.recurrence_type)
      form.setFieldValue('recurrence_days', timeslot.recurrence_days || '')
      form.setFieldValue('member_ids', timeslot.member_ids || [])
    } else {
      form.reset()
    }
  }, [timeslot, form])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.Field
          name="name"
          children={(field) => (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Time Slot Name *</label>
              <input
                type="text"
                placeholder="e.g., Morning Routine"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full px-4 py-3 border-2 border-theme-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">{field.state.meta.errors.join(', ')}</p>
              )}
            </div>
          )}
        />

        <form.Field
          name="recurrence_type"
          children={(field) => (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Repeat Schedule</label>
              <Select
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as TimeslotFormData['recurrence_type'])}
                fullWidth
              >
                <option value="daily">Every Day</option>
                <option value="weekly">Every Week</option>
                <option value="none">One Time Only</option>
              </Select>
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.Field
          name="start_time"
          children={(field) => (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-theme-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
              />
            </div>
          )}
        />

        <form.Field
          name="end_time"
          children={(field) => (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
              <input
                type="time"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-theme-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
              />
            </div>
          )}
        />
      </div>

      <form.Field
        name="description"
        children={(field) => (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              placeholder="Add notes about this time slot..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="w-full px-4 py-3 border-2 border-theme-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
              rows={2}
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <p className="text-sm text-red-600 mt-1">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      />

      <form.Field
        name="member_ids"
        children={(field) => (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Assign to Family Members *</label>
            {membersLoading ? (
              <p className="text-gray-500">Loading members...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members?.map((member: Member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      const current = field.state.value
                      if (current.includes(member.id)) {
                        field.handleChange(current.filter((id) => id !== member.id))
                      } else {
                        field.handleChange([...current, member.id])
                      }
                    }}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 ${
                      field.state.value.includes(member.id)
                        ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            )}
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <p className="text-sm text-red-600 mt-2">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              fullWidth
            >
              {timeslot ? 'Update Time Slot' : 'Create Time Slot'}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      />
    </form>
  )
}
