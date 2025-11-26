import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useImageUpload } from '../../hooks/useImageUpload'
import { UPLOAD_CONFIG } from '../../constants'
import { getErrorMessage } from '../../utils/form'
import { showToast } from '../Toast'
import { Button, Input, Checkbox, FileInput } from '../shared'
import type { Member } from '../../types'

const memberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  avatar: z.string(),
  is_admin: z.number().min(0).max(1),
})

type MemberFormData = z.infer<typeof memberSchema>

interface MemberFormProps {
  member?: Member | null
  onSubmit: (data: MemberFormData) => Promise<void>
  onCancel: () => void
}

export function MemberForm({ member, onSubmit, onCancel }: MemberFormProps) {
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
      name: '',
      avatar: '',
      is_admin: 0,
    } as MemberFormData,
    validators: {
      onChange: memberSchema,
    },
    onSubmit: async ({ value }) => {
      let avatarUrl = value.avatar

      try {
        const uploadedUrl = await uploadImageFile()
        if (uploadedUrl) avatarUrl = uploadedUrl
      } catch {
        showToast('Failed to upload avatar image', 'error')
        return
      }

      await onSubmit({ ...value, avatar: avatarUrl })
      form.reset()
      resetImage()
    },
  })

  useEffect(() => {
    if (member) {
      form.setFieldValue('name', member.name)
      form.setFieldValue('avatar', member.avatar || '')
      form.setFieldValue('is_admin', member.is_admin)
      setPreview(member.avatar || '')
    } else {
      form.reset()
      resetImage()
    }
  }, [member, form, setPreview, resetImage])

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
        name="name"
        children={(field) => (
          <Input
            label="Name *"
            type="text"
            placeholder="Enter name (e.g., Omar)"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
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
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-theme-primary/20"
            />
          </div>
        )}
        <FileInput
          label="Avatar Photo (Optional)"
          accept="image/*"
          onChange={handleImageChange}
          helperText={`Max: ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB. Supports: ${UPLOAD_CONFIG.SUPPORTED_FORMATS}`}
        />
      </div>

      <form.Field
        name="is_admin"
        children={(field) => (
          <Checkbox
            label="Admin Privileges"
            description="Allow access to admin dashboard and settings"
            checked={field.state.value === 1}
            onChange={(e) => field.handleChange(e.target.checked ? 1 : 0)}
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
              disabled={!canSubmit || isUploading}
              isLoading={isUploading || isSubmitting}
            >
              {member ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        )}
      />
    </form>
  )
}
