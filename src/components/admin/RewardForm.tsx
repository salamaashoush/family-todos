import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { getErrorMessage } from '../../utils/form'
import { Button, Input, Textarea } from '../shared'
import type { Reward } from '../../types'

const rewardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters'),
  icon: z.string().max(10, 'Icon must be less than 10 characters'),
  point_cost: z.number().min(1, 'Point cost must be at least 1'),
  is_active: z.boolean(),
})

type RewardFormData = z.infer<typeof rewardSchema>

interface RewardFormProps {
  reward?: Reward | null
  onSubmit: (data: RewardFormData) => Promise<void>
  onCancel: () => void
}

export function RewardForm({ reward, onSubmit, onCancel }: RewardFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      icon: '',
      point_cost: 10,
      is_active: true,
    } as RewardFormData,
    validators: {
      onChange: rewardSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
      form.reset()
    },
  })

  useEffect(() => {
    if (reward) {
      form.setFieldValue('name', reward.name)
      form.setFieldValue('description', reward.description || '')
      form.setFieldValue('icon', reward.icon || '')
      form.setFieldValue('point_cost', reward.point_cost)
      form.setFieldValue('is_active', reward.is_active === 1)
    } else {
      form.reset()
    }
  }, [reward, form])

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
              label="Reward Name *"
              type="text"
              placeholder="e.g., Extra Screen Time"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            />
          )}
        />

        <form.Field
          name="icon"
          children={(field) => (
            <Input
              label="Icon / Emoji"
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
            placeholder="Describe the reward..."
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            rows={2}
            error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
          />
        )}
      />

      <form.Field
        name="point_cost"
        children={(field) => (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Point Cost *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
              />
              <div className="flex items-center gap-1 min-w-[80px]">
                <input
                  type="number"
                  min={1}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-center font-bold focus:outline-none focus:border-theme-primary"
                />
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            {field.state.meta.isTouched && getErrorMessage(field.state.meta.errors) && (
              <p className="text-sm text-red-600 mt-1">{getErrorMessage(field.state.meta.errors)}</p>
            )}
          </div>
        )}
      />

      {reward && (
        <form.Field
          name="is_active"
          children={(field) => (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => field.handleChange(!field.state.value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  field.state.value ? 'bg-theme-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    field.state.value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {field.state.value ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
        />
      )}

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
              {reward ? 'Update Reward' : 'Create Reward'}
            </Button>
          </div>
        )}
      />
    </form>
  )
}
