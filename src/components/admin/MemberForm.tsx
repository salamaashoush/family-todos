import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useImageUpload } from '../../hooks/useImageUpload'
import { UPLOAD_CONFIG } from '../../constants'
import { getErrorMessage } from '../../utils/form'
import { showToast } from '../Toast'
import { Button, Input, FileInput } from '../shared'
import type { Member } from '../../types'

const memberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  avatar: z.string(),
  isParent: z.boolean(),
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
      isParent: false,
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
      form.setFieldValue('isParent', member.isParent)
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

      <FileInput
        label="Avatar Photo (Optional)"
        accept="image/*"
        onChange={handleImageChange}
        previewUrl={imagePreview}
        onClear={resetImage}
        helperText={`Max: ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB`}
      />

      <form.Field
        name="isParent"
        children={(field) => (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <div>
              <label htmlFor="isParent" className="font-semibold text-gray-800">
                Parent / Adult
              </label>
              <p className="text-sm text-gray-600">
                Parents can be hidden from the main task view
              </p>
            </div>
            <button
              type="button"
              id="isParent"
              role="switch"
              aria-checked={field.state.value}
              onClick={() => field.handleChange(!field.state.value)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                field.state.value ? 'bg-theme-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  field.state.value ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
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
              {member ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        )}
      />
    </form>
  )
}
