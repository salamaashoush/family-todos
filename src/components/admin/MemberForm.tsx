import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useImageUpload } from '../../hooks/useImageUpload'
import { UPLOAD_CONFIG } from '../../constants'
import { showToast } from '../Toast'
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
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              placeholder="Enter name (e.g., Omar)"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="w-full px-4 py-3 border-2 border-theme-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-base"
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <p className="text-sm text-red-600 mt-1">{field.state.meta.errors.join(', ')}</p>
            )}
          </div>
        )}
      />

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Avatar Photo (Optional)</label>
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
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-theme-primary hover:file:bg-purple-100 file:cursor-pointer cursor-pointer border-2 border-theme-primary/20 rounded-xl"
            />
            <p className="text-xs text-gray-500 mt-2">
              Max file size: {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB. Supports: {UPLOAD_CONFIG.SUPPORTED_FORMATS}
            </p>
          </div>
        </div>
      </div>

      <form.Field
        name="is_admin"
        children={(field) => (
          <div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.state.value === 1}
                onChange={(e) => field.handleChange(e.target.checked ? 1 : 0)}
                className="w-6 h-6 text-theme-primary border-2 border-gray-300 rounded focus:ring-2 focus:ring-theme-primary"
              />
              <span className="font-semibold text-gray-700 group-hover:text-theme-primary transition-colors">
                Admin Privileges
              </span>
            </label>
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!canSubmit || isUploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isUploading || isSubmitting ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      />
    </form>
  )
}
