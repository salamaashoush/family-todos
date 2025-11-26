import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { changePassword } from '../../server/admin-users'
import { getErrorMessage } from '../../utils/form'
import { Button, Input } from '../shared'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

interface ChangePasswordFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function ChangePasswordForm({ onSuccess, onCancel }: ChangePasswordFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      form.reset()
      onSuccess()
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
    },
  })

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    } as PasswordFormData,
    validators: {
      onChange: passwordSchema,
    },
    onSubmit: async ({ value }) => {
      setErrorMessage(null)
      changePasswordMutation.mutate({
        data: {
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        },
      })
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
      <form.Field
        name="currentPassword"
        children={(field) => (
          <Input
            type="password"
            label="Current Password *"
            placeholder="Enter current password"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            autoComplete="current-password"
          />
        )}
      />

      <form.Field
        name="newPassword"
        children={(field) => (
          <Input
            type="password"
            label="New Password *"
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
            type="password"
            label="Confirm New Password *"
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

      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {errorMessage}
        </div>
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
              isLoading={isSubmitting || changePasswordMutation.isPending}
            >
              Change Password
            </Button>
          </div>
        )}
      />
    </form>
  )
}
