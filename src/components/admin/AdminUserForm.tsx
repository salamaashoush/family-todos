import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { getErrorMessage } from '../../utils/form'
import { Button, Input } from '../shared'

type AdminUser = {
  id: number
  username: string
  createdAt: string
  lastLoginAt: string | null
}

const adminUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const editAdminUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
})

type AdminUserFormData = z.infer<typeof adminUserSchema>
type EditAdminUserFormData = z.infer<typeof editAdminUserSchema>

interface AdminUserFormProps {
  adminUser?: AdminUser | null
  onSubmit: (data: { username: string; password?: string }) => Promise<void>
  onCancel: () => void
}

export function AdminUserForm({ adminUser, onSubmit, onCancel }: AdminUserFormProps) {
  const isEditing = !!adminUser

  const createForm = useForm({
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    } as AdminUserFormData,
    validators: {
      onChange: adminUserSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ username: value.username, password: value.password })
      createForm.reset()
    },
  })

  const editForm = useForm({
    defaultValues: {
      username: '',
    } as EditAdminUserFormData,
    validators: {
      onChange: editAdminUserSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({ username: value.username })
      editForm.reset()
    },
  })

  useEffect(() => {
    if (adminUser) {
      editForm.setFieldValue('username', adminUser.username)
    } else {
      createForm.reset()
      editForm.reset()
    }
  }, [adminUser, createForm, editForm])

  if (isEditing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          editForm.handleSubmit()
        }}
        className="space-y-4"
      >
        <editForm.Field
          name="username"
          children={(field) => (
            <Input
              label="Username *"
              type="text"
              placeholder="Enter username"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            />
          )}
        />

        <editForm.Subscribe
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
                Update Admin
              </Button>
            </div>
          )}
        />
      </form>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        createForm.handleSubmit()
      }}
      className="space-y-4"
    >
      <createForm.Field
        name="username"
        children={(field) => (
          <Input
            label="Username *"
            type="text"
            placeholder="Enter username"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
          />
        )}
      />

      <createForm.Field
        name="password"
        children={(field) => (
          <Input
            label="Password *"
            type="password"
            placeholder="Enter password"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.isTouched ? getErrorMessage(field.state.meta.errors) : undefined}
            autoComplete="new-password"
          />
        )}
      />

      <createForm.Field
        name="confirmPassword"
        children={(field) => (
          <Input
            label="Confirm Password *"
            type="password"
            placeholder="Confirm password"
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

      <createForm.Subscribe
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
              Add Admin
            </Button>
          </div>
        )}
      />
    </form>
  )
}
