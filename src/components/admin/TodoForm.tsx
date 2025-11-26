import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useTimeslots, useMembers } from '../../hooks/useQueries'
import { useTimeslotMutations, useMemberMutations } from '../../hooks/useAdminMutations'
import { useImageUpload } from '../../hooks/useImageUpload'
import { UPLOAD_CONFIG } from '../../constants'
import { getErrorMessage } from '../../utils/form'
import { getDisplaySymbol } from '../../utils/symbols'
import { showToast } from '../Toast'
import { Button, Input, Textarea, FileInput, MultiSelect } from '../shared'
import { Modal } from '../shared/Modal'
import { TimeslotForm } from './TimeslotForm'
import { MemberForm } from './MemberForm'
import type { Todo, Timeslot, Member } from '../../types'

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  symbol: z.string().max(10, 'Symbol must be less than 10 characters'),
  imageUrl: z.string(),
  position: z.number(),
  points: z.number().min(0, 'Points must be at least 0'),
  timeslotIds: z.array(z.number()).min(1, 'Select at least one time slot'),
})

type TodoFormData = z.infer<typeof todoSchema>

interface TodoFormProps {
  todo?: Todo | null
  onSubmit: (data: TodoFormData) => Promise<void>
  onCancel: () => void
}

export function TodoForm({ todo, onSubmit, onCancel }: TodoFormProps) {
  const { data: timeslots, isLoading: timeslotsLoading } = useTimeslots()
  const { data: members, isLoading: membersLoading } = useMembers()
  const { create: createTimeslot } = useTimeslotMutations()
  const { create: createMember } = useMemberMutations()
  const [showTimeslotModal, setShowTimeslotModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const {
    imagePreview,
    isUploading,
    handleImageChange,
    uploadImageFile,
    resetImage,
    setPreview,
  } = useImageUpload()

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      symbol: '',
      imageUrl: '',
      position: 0,
      points: 5,
      timeslotIds: [],
    } as TodoFormData,
    validators: {
      onChange: todoSchema,
    },
    onSubmit: async ({ value }) => {
      let imageUrl = value.imageUrl

      try {
        const uploadedUrl = await uploadImageFile()
        if (uploadedUrl) imageUrl = uploadedUrl
      } catch {
        showToast('Failed to upload image', 'error')
        return
      }

      await onSubmit({ ...value, imageUrl: imageUrl })
      form.reset()
      resetImage()
    },
  })

  useEffect(() => {
    if (todo) {
      form.setFieldValue('title', todo.title)
      form.setFieldValue('description', todo.description || '')
      // Convert old icon names to emojis when editing
      form.setFieldValue('symbol', getDisplaySymbol(todo.symbol) || '')
      form.setFieldValue('imageUrl', todo.imageUrl || '')
      form.setFieldValue('position', todo.position)
      form.setFieldValue('points', todo.points ?? 5)
      form.setFieldValue('timeslotIds', todo.timeslotIds || [])
      setPreview(todo.imageUrl || '')
    } else {
      form.reset()
      resetImage()
    }
  }, [todo, form, setPreview, resetImage])

  // Transform timeslots for MultiSelect
  const timeslotOptions = (timeslots || []).map((ts: Timeslot) => ({
    value: ts.id,
    label: ts.name,
    subtitle: ts.startTime && ts.endTime ? `${ts.startTime} - ${ts.endTime}` : undefined,
    icon: (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  }))

  // Handler for creating a new timeslot inline
  const handleCreateTimeslot = async (data: {
    name: string
    description: string
    startTime: string
    endTime: string
    recurrenceType: 'daily' | 'weekly' | 'monthly' | 'none'
    recurrenceDays: string
    memberIds: number[]
  }) => {
    createTimeslot.mutate(
      { data },
      {
        onSuccess: () => {
          setShowTimeslotModal(false)
          showToast('Time slot created', 'success')
        },
      }
    )
  }

  // Handler for creating a new member (for timeslot form)
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

  // Check if we have prerequisites
  const hasNoTimeslots = !timeslotsLoading && (!timeslots || timeslots.length === 0)
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
        {/* Warning if no timeslots */}
        {hasNoTimeslots && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">No time slots available</p>
                <p className="text-sm text-amber-700 mt-1">
                  You need at least one time slot before creating a task.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTimeslotModal(true)}
                  className="mt-2 text-sm font-semibold text-amber-700 hover:text-amber-800 underline"
                >
                  Create a time slot now
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field
            name="title"
            children={(field) => (
              <Input
                label="Task Name *"
                type="text"
                placeholder="e.g., Brush Teeth"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
              />
            )}
          />

          <form.Field
            name="symbol"
            children={(field) => (
              <Input
                label="Symbol / Emoji"
                type="text"
                placeholder="e.g., emoji"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="text-2xl"
                error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
              />
            )}
          />
        </div>

        <form.Field
          name="description"
          children={(field) => (
            <Textarea
              label="Description (Optional)"
              placeholder="Add instructions or notes..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={2}
              error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            />
          )}
        />

        <div className="flex items-start gap-4">
          {imagePreview && (
            <div className="flex-shrink-0">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border-4 border-theme-primary/20"
              />
            </div>
          )}
          <FileInput
            label="Task Image (Optional)"
            accept="image/*"
            onChange={handleImageChange}
            helperText={`Visual aid for the task. Max: ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB`}
          />
        </div>

        <form.Field
          name="points"
          children={(field) => (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Points Reward
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                />
                <div className="flex items-center gap-1 min-w-[80px]">
                  <input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-center font-bold focus:outline-none focus:border-theme-primary"
                  />
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Points earned when this task is completed</p>
              {field.state.meta.isTouched && getErrorMessage(field.state.meta.errors) && (
                <p className="text-sm text-red-600 mt-1">{getErrorMessage(field.state.meta.errors)}</p>
              )}
            </div>
          )}
        />

        <form.Field
          name="timeslotIds"
          children={(field) => (
            <MultiSelect
              label="Add to Time Slots *"
              options={timeslotOptions}
              value={field.state.value}
              onChange={(values) => field.handleChange(values as number[])}
              placeholder="Select time slots..."
              isLoading={timeslotsLoading}
              error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
              onCreateNew={() => setShowTimeslotModal(true)}
              createNewLabel="Create New Time Slot"
              emptyMessage="No time slots yet. Create one to get started."
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
                disabled={!canSubmit || isUploading || hasNoTimeslots}
                isLoading={isUploading || isSubmitting}
              >
                {todo ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          )}
        />
      </form>

      {/* Inline Timeslot Creation Modal */}
      <Modal
        isOpen={showTimeslotModal}
        onClose={() => setShowTimeslotModal(false)}
        title="Create Time Slot"
      >
        {hasNoMembers ? (
          <div className="space-y-4">
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
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowTimeslotModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowTimeslotModal(false)
                setShowMemberModal(true)
              }}>
                Create Member First
              </Button>
            </div>
          </div>
        ) : (
          <TimeslotForm
            onSubmit={handleCreateTimeslot}
            onCancel={() => setShowTimeslotModal(false)}
          />
        )}
      </Modal>

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
