import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { getErrorMessage } from '../../utils/form'
import { Button, Input } from '../shared'

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

interface ResetPasswordFormProps {
  username: string
  onSubmit: (data: { newPassword: string }) => Promise<void>
  onCancel: () => void
}

export function ResetPasswordForm({ username, onSubmit, onCancel }: ResetPasswordFormProps) {
  const form = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    } as ResetPasswordFormData,
    validators: {
      onChange: resetPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ newPassword: value.newPassword })
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
      <p className="text-gray-600">
        Reset password for <span className="font-semibold">{username}</span>
      </p>

      <form.Field
        name="newPassword"
        children={(field) => (
          <Input
            label="New Password *"
            type="password"
            placeholder="Enter new password"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            autoComplete="new-password"
          />
        )}
      />

      <form.Field
        name="confirmPassword"
        children={(field) => (
          <Input
            label="Confirm Password *"
            type="password"
            placeholder="Confirm new password"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            autoComplete="new-password"
          />
        )}
      />

      <div className="text-sm text-gray-600 space-y-1">
        <p>Password requirements:</p>
        <ul className="list-disc list-inside ml-2">
          <li>At least 8 characters</li>
          <li>At least one uppercase letter</li>
          <li>At least one lowercase letter</li>
          <li>At least one number</li>
        </ul>
      </div>

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
              Reset Password
            </Button>
          </div>
        )}
      />
    </form>
  )
}
