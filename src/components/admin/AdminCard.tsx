import { ReactNode } from 'react'

interface AdminCardProps {
  children: ReactNode
  onDelete: () => void
  onEdit: () => void
  isSelected?: boolean
  onSelect?: () => void
  showCheckbox?: boolean
}

export function AdminCard({
  children,
  onDelete,
  onEdit,
  isSelected = false,
  onSelect,
  showCheckbox = false,
}: AdminCardProps) {
  return (
    <div
      className={`bg-white border-2 rounded-xl transition-all ${
        isSelected
          ? 'border-theme-primary bg-theme-primary/5 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {showCheckbox && onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 ${
              isSelected
                ? 'bg-theme-primary border-theme-primary text-white'
                : 'border-gray-300 hover:border-theme-primary hover:bg-theme-primary/5'
            }`}
            aria-label={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2"
            aria-label="Edit"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2"
            aria-label="Delete"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
