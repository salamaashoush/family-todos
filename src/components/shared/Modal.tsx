import { ReactNode, useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Lock body scroll and manage focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'

      // Focus the modal after animation
      setTimeout(() => {
        modalRef.current?.focus()
      }, 50)
    } else {
      document.body.style.overflow = ''

      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative bg-white shadow-2xl w-full
          ${sizeStyles[size]}
          max-h-[95vh] sm:max-h-[90vh]
          overflow-hidden
          rounded-t-2xl sm:rounded-2xl
          animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-theme-primary to-theme-secondary p-4 sm:p-5 flex items-center justify-between">
          <h2
            id="modal-title"
            className="text-lg sm:text-xl font-bold text-white"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-theme-primary"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
