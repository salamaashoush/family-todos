import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useTimeslots } from '../../hooks/useQueries'
import { useImageUpload } from '../../hooks/useImageUpload'
import { UPLOAD_CONFIG } from '../../constants'
import { getErrorMessage } from '../../utils/form'
import { showToast } from '../Toast'
import { Button, Input, Textarea, FileInput } from '../shared'
import type { Todo, Timeslot } from '../../types'

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  symbol: z.string().max(10, 'Symbol must be less than 10 characters'),
  image_url: z.string(),
  position: z.number(),
  points: z.number().min(0, 'Points must be at least 0'),
  timeslot_ids: z.array(z.number()).min(1, 'Select at least one time slot'),
})

type TodoFormData = z.infer<typeof todoSchema>

interface TodoFormProps {
  todo?: Todo | null
  onSubmit: (data: TodoFormData) => Promise<void>
  onCancel: () => void
}

export function TodoForm({ todo, onSubmit, onCancel }: TodoFormProps) {
  const { data: timeslots, isLoading: timeslotsLoading } = useTimeslots()
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
      image_url: '',
      position: 0,
      points: 5,
      timeslot_ids: [],
    } as TodoFormData,
    validators: {
      onChange: todoSchema,
    },
    onSubmit: async ({ value }) => {
      let imageUrl = value.image_url

      try {
        const uploadedUrl = await uploadImageFile()
        if (uploadedUrl) imageUrl = uploadedUrl
      } catch {
        showToast('Failed to upload image', 'error')
        return
      }

      await onSubmit({ ...value, image_url: imageUrl })
      form.reset()
      resetImage()
    },
  })

  useEffect(() => {
    if (todo) {
      form.setFieldValue('title', todo.title)
      form.setFieldValue('description', todo.description || '')
      form.setFieldValue('symbol', todo.symbol || '')
      form.setFieldValue('image_url', todo.image_url || '')
      form.setFieldValue('position', todo.position)
      form.setFieldValue('points', todo.points ?? 5)
      form.setFieldValue('timeslot_ids', todo.timeslot_ids || [])
      setPreview(todo.image_url || '')
    } else {
      form.reset()
      resetImage()
    }
  }, [todo, form, setPreview, resetImage])

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
        name="timeslot_ids"
        children={(field) => (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Add to Time Slots *</label>
            {timeslotsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 sm:p-4 rounded-xl bg-gray-100 border-2 border-gray-300 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {timeslots?.map((timeslot: Timeslot) => (
                <button
                  key={timeslot.id}
                  type="button"
                  onClick={() => {
                    const current = field.state.value
                    if (current.includes(timeslot.id)) {
                      field.handleChange(current.filter((id) => id !== timeslot.id))
                    } else {
                      field.handleChange([...current, timeslot.id])
                    }
                  }}
                  className={`p-3 sm:p-4 rounded-xl font-semibold text-left transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 ${
                    field.state.value.includes(timeslot.id)
                      ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-lg border-2 border-theme-primary'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                  }`}
                >
                  <div className="font-bold text-base">{timeslot.name}</div>
                  {timeslot.start_time && (
                    <div className="text-xs opacity-90 mt-1">
                      {timeslot.start_time} - {timeslot.end_time}
                    </div>
                  )}
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
              disabled={!canSubmit || isUploading}
              isLoading={isUploading || isSubmitting}
            >
              {todo ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        )}
      />
    </form>
  )
}
