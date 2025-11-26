import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { getErrorMessage } from '../../utils/form'
import { Button, Input } from '../shared'

const quickTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  symbol: z.string().max(10, 'Symbol must be less than 10 characters'),
  points: z.number().min(0, 'Points must be at least 0'),
})

interface QuickTaskFormData {
  title: string
  description: string
  symbol: string
  imageUrl: string
  position: number
  points: number
  timeslotIds: number[]
}

interface QuickTaskFormProps {
  timeslotId: number
  timeslotName: string
  onSubmit: (data: QuickTaskFormData) => void
  onCancel: () => void
}

export function QuickTaskForm({ timeslotId, timeslotName, onSubmit, onCancel }: QuickTaskFormProps) {
  const form = useForm({
    defaultValues: {
      title: '',
      symbol: '',
      points: 5,
    },
    validators: {
      onChange: quickTaskSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit({
        title: value.title,
        description: '',
        symbol: value.symbol,
        imageUrl: '',
        position: 0,
        points: value.points,
        timeslotIds: [timeslotId],
      })
      form.reset()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {/* Timeslot indicator */}
      <div className="flex items-center gap-2 p-3 bg-theme-primary/10 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-theme-primary font-medium">Adding to:</p>
          <p className="font-semibold text-theme-primary">{timeslotName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
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
                autoFocus
              />
            )}
          />
        </div>

        <form.Field
          name="symbol"
          children={(field) => (
            <Input
              label="Emoji"
              type="text"
              placeholder="e.g. emoji"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="text-xl text-center"
            />
          )}
        />
      </div>

      <form.Field
        name="points"
        children={(field) => (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Points
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={500}
                step={5}
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
              />
              <div className="flex items-center gap-1 min-w-[70px]">
                <input
                  type="number"
                  min={0}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  className="w-14 px-2 py-1 border-2 border-gray-200 rounded-lg text-center font-bold focus:outline-none focus:border-theme-primary"
                />
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              isLoading={isSubmitting}
            >
              Create Task
            </Button>
          </div>
        )}
      />
    </form>
  )
}
