import { useState, useRef, ReactNode } from 'react'

interface SwipeableCardProps {
  children: ReactNode
  onDelete: () => void
  onEdit: () => void
  isSelected?: boolean
  onSelect?: () => void
  showCheckbox?: boolean
}

export function SwipeableCard({
  children,
  onDelete,
  onEdit,
  isSelected = false,
  onSelect,
  showCheckbox = false,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    currentXRef.current = translateX
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientX - startXRef.current
    const newTranslate = Math.max(-160, Math.min(0, currentXRef.current + diff))
    setTranslateX(newTranslate)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (translateX < -80) {
      setTranslateX(-160)
    } else {
      setTranslateX(0)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX
    currentXRef.current = translateX
    setIsDragging(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const diff = e.clientX - startXRef.current
    const newTranslate = Math.max(-160, Math.min(0, currentXRef.current + diff))
    setTranslateX(newTranslate)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    if (translateX < -80) {
      setTranslateX(-160)
    } else {
      setTranslateX(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons behind */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => {
            setTranslateX(0)
            onEdit()
          }}
          className="w-20 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center transition-colors"
          aria-label="Edit"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => {
            setTranslateX(0)
            onDelete()
          }}
          className="w-20 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white flex items-center justify-center transition-colors"
          aria-label="Delete"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Card content */}
      <div
        className={`relative bg-white border-2 rounded-xl transition-transform ${
          isDragging ? '' : 'transition-all duration-200'
        } ${isSelected ? 'border-theme-primary bg-theme-primary/5' : 'border-gray-200 hover:border-theme-primary/50'}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-start gap-3 p-4">
          {showCheckbox && onSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors mt-1 ${
                isSelected
                  ? 'bg-theme-primary border-theme-primary text-white'
                  : 'border-gray-300 hover:border-theme-primary'
              }`}
            >
              {isSelected && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  )
}
