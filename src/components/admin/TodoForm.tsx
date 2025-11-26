import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useTimeslots } from '../../hooks/useQueries'
import { useImageUpload } from '../../hooks/useImageUpload'
import { UPLOAD_CONFIG } from '../../constants'
import { showToast } from '../Toast'
import { Button } from '../shared/Button'
import type { Todo, Timeslot } from '../../types'

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  symbol: z.string().max(10, 'Symbol must be less than 10 characters'),
  image_url: z.string(),
  position: z.number(),
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
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Task Name *</label>
              <input
                type="text"
                placeholder="e.g., Brush Teeth"
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
          name="symbol"
          children={(field) => (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Symbol / Emoji</label>
              <input
                type="text"
                placeholder="e.g., toothbrush icon"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full px-4 py-3 border-2 border-theme-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-2xl"
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">{field.state.meta.errors.join(', ')}</p>
              )}
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
              placeholder="Add instructions or notes..."
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

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Task Image (Optional)</label>
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
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-theme-primary hover:file:bg-purple-100 file:cursor-pointer cursor-pointer border-2 border-theme-primary/20 rounded-xl"
            />
            <p className="text-xs text-gray-500 mt-2">
              Visual aid for the task. Max: {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB. Supports: {UPLOAD_CONFIG.SUPPORTED_FORMATS}
            </p>
          </div>
        </div>
      </div>

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
                  className={`p-3 sm:p-4 rounded-xl font-semibold text-left transition-all transform hover:scale-105 active:scale-95 ${
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
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <p className="text-sm text-red-600 mt-2">{field.state.meta.errors.join(', ')}</p>
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
