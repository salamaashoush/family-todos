import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400">{icon}</span>
        </div>
      )}
      <p className="text-lg font-medium text-gray-600">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
