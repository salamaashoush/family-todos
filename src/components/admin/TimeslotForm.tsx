import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useMembers } from '../../hooks/useQueries'
import { getErrorMessage } from '../../utils/form'
import { Button, Input, Textarea, Select } from '../shared'
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
).refine(
  (data) => {
    if (data.recurrence_type === 'weekly') {
      return data.recurrence_days.length > 0
    }
    return true
  },
  {
    message: 'Select at least one day for weekly schedule',
    path: ['recurrence_days'],
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
          name="recurrence_type"
          children={(field) => (
            <Select
              label="Repeat Schedule"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as TimeslotFormData['recurrence_type'])}
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
        selector={(state) => state.values.recurrence_type}
        children={(recurrenceType) =>
          recurrenceType === 'weekly' ? (
            <form.Field
              name="recurrence_days"
              children={(field) => {
                const DAYS = [
                  { value: 'Mon', label: 'Mon' },
                  { value: 'Tue', label: 'Tue' },
                  { value: 'Wed', label: 'Wed' },
                  { value: 'Thu', label: 'Thu' },
                  { value: 'Fri', label: 'Fri' },
                  { value: 'Sat', label: 'Sat' },
                  { value: 'Sun', label: 'Sun' },
                ]
                const selectedDays = field.state.value ? field.state.value.split(',').filter(Boolean) : []

                const toggleDay = (day: string) => {
                  const newDays = selectedDays.includes(day)
                    ? selectedDays.filter((d) => d !== day)
                    : [...selectedDays, day]
                  // Sort days in week order
                  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                  newDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
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
          name="start_time"
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
          name="end_time"
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
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 ${
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
            {field.state.meta.isTouched && getErrorMessage(field.state.meta.errors) && (
              <p className="text-sm text-red-600 mt-2">{getErrorMessage(field.state.meta.errors)}</p>
            )}
          </div>
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
              disabled={!canSubmit}
              isLoading={isSubmitting}
            >
              {timeslot ? 'Update Time Slot' : 'Create Time Slot'}
            </Button>
          </div>
        )}
      />
    </form>
  )
}
