import { useState, useCallback } from 'react'
import { uploadImage } from '../server/upload'

interface UseImageUploadReturn {
  imageFile: File | null
  imagePreview: string
  isUploading: boolean
  error: string | null
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadImageFile: () => Promise<string | null>
  resetImage: () => void
  setPreview: (url: string) => void
  clearError: () => void
}

export function useImageUpload(): UseImageUploadReturn {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setError(null)
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.onerror = () => {
        setError('Failed to read image file')
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const uploadImageFile = useCallback(async (): Promise<string | null> => {
    if (!imageFile) return null

    setIsUploading(true)
    setError(null)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', imageFile)
      const result = await uploadImage({ data: uploadFormData })
      return result.url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      console.error('Upload failed:', err)
      throw err
    } finally {
      setIsUploading(false)
    }
  }, [imageFile])

  const resetImage = useCallback(() => {
    setImageFile(null)
    setImagePreview('')
    setError(null)
  }, [])

  const setPreview = useCallback((url: string) => {
    setImagePreview(url)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    imageFile,
    imagePreview,
    isUploading,
    error,
    handleImageChange,
    uploadImageFile,
    resetImage,
    setPreview,
    clearError,
  }
}
