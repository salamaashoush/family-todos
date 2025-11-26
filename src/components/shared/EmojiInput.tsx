import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface EmojiInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
}

interface EmojiData {
  native: string
}

export function EmojiInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Select emoji',
  error,
}: EmojiInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const pickerHeight = 435
    const pickerWidth = 352

    const spaceBelow = viewportHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openUpward = spaceBelow < pickerHeight && spaceAbove > spaceBelow

    // Calculate left position, ensuring picker stays within viewport
    let left = rect.left
    if (left + pickerWidth > viewportWidth - 8) {
      left = viewportWidth - pickerWidth - 8
    }
    if (left < 8) {
      left = 8
    }

    const style: React.CSSProperties = {
      position: 'fixed',
      left,
      zIndex: 10000,
    }

    if (openUpward) {
      style.bottom = viewportHeight - rect.top + 4
    } else {
      style.top = rect.bottom + 4
    }

    setPickerStyle(style)
  }, [])

  useEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        pickerRef.current &&
        !pickerRef.current.contains(target)
      ) {
        setIsOpen(false)
        onBlur?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onBlur])

  useEffect(() => {
    if (!isOpen) return

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, updatePosition])

  const handleSelect = (emoji: EmojiData) => {
    onChange(emoji.native)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  const picker = isOpen ? (
    <div ref={pickerRef} style={pickerStyle}>
      <Picker
        data={data}
        onEmojiSelect={handleSelect}
        theme="light"
        previewPosition="none"
        skinTonePosition="search"
        maxFrequentRows={2}
      />
    </div>
  ) : null

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      )}

      <div className="flex items-center gap-2">
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div
          ref={triggerRef}
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsOpen(!isOpen)
            }
          }}
          className={`
            flex-1 h-[48px] px-3 py-2
            bg-white border-2 rounded-xl
            transition-all duration-200 cursor-pointer
            focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20
            flex items-center justify-between
            ${error ? 'border-red-500' : isOpen ? 'border-theme-primary ring-2 ring-theme-primary/20' : 'border-gray-200'}
          `}
        >
          {value ? (
            <span className="text-3xl">{value}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(picker, document.body)}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}
