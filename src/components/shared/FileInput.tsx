import { InputHTMLAttributes, forwardRef, useRef, useState, useImperativeHandle, useEffect, useCallback } from 'react'

interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'capture'> {
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
  previewUrl?: string | null
  onClear?: () => void
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function hasCameraSupport(): boolean {
  if (typeof navigator === 'undefined') return false
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ label, helperText, error, fullWidth = true, className = '', id, previewUrl, onClear, accept = 'image/*', onChange, ...props }, ref) => {
    const inputId = id || props.name || 'file-input'
    const cameraInputId = `${inputId}-camera`
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [preview, setPreview] = useState<string | null>(previewUrl || null)
    const [showCamera, setShowCamera] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [cameraOpen, setCameraOpen] = useState(false)

    useImperativeHandle(ref, () => fileInputRef.current as HTMLInputElement)

    useEffect(() => {
      if (previewUrl !== undefined) {
        setPreview(previewUrl)
      }
    }, [previewUrl])

    useEffect(() => {
      setShowCamera(hasCameraSupport())
      setIsMobile(isMobileDevice())
    }, [])

    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      setCameraOpen(false)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else if (file) {
        setPreview(null)
      }
      onChange?.(e)
    }

    const handleClear = () => {
      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      onClear?.()
    }

    const openDesktopCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        streamRef.current = stream
        setCameraOpen(true)

        // Wait for video element to be available
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
          }
        }, 100)
      } catch (err) {
        console.error('Camera access denied:', err)
        // Fall back to file input
        cameraInputRef.current?.click()
      }
    }

    const capturePhoto = () => {
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setPreview(dataUrl)

        // Convert to file and trigger onChange
        canvas.toBlob((blob) => {
          if (blob && fileInputRef.current) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)
            fileInputRef.current.files = dataTransfer.files

            const event = new Event('change', { bubbles: true })
            fileInputRef.current.dispatchEvent(event)
            onChange?.({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>)
          }
        }, 'image/jpeg', 0.9)
      }

      stopCamera()
    }

    const handleCameraClick = () => {
      if (isMobile) {
        // On mobile, use native capture attribute
        cameraInputRef.current?.click()
      } else {
        // On desktop, open camera stream
        openDesktopCamera()
      }
    }

    const isImageAccept = accept?.includes('image')

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {label}
          </label>
        )}

        {cameraOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-[60vh] rounded-xl"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={stopCamera}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-3 bg-theme-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Capture
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          {...props}
        />

        {showCamera && isImageAccept && (
          <input
            ref={cameraInputRef}
            id={cameraInputId}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        )}

        {preview && !cameraOpen ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <img
              src={preview}
              alt="Preview"
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">Image selected</p>
              <p className="text-xs text-gray-500">{helperText}</p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Remove image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ) : (
          <div className={`rounded-xl border-2 border-dashed ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} overflow-hidden`}>
            <div className="flex">
              {showCamera && isImageAccept && (
                <>
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-3 hover:bg-theme-primary/5 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-theme-primary/10 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5 text-gray-500 group-hover:text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600 group-hover:text-theme-primary">Camera</span>
                  </button>
                  <div className="w-px bg-gray-200" />
                </>
              )}
              <label
                htmlFor={inputId}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-3 cursor-pointer hover:bg-theme-primary/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-theme-primary/10 flex items-center justify-center transition-colors">
                  {isImageAccept ? (
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-theme-primary">
                  {isImageAccept ? 'Browse' : 'Choose File'}
                </span>
              </label>
            </div>
            {helperText && (
              <div className="px-3 py-2 bg-gray-100/50 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">{helperText}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

FileInput.displayName = 'FileInput'
