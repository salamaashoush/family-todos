interface ProgressBarProps {
  completed: number
  total: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
}

export function ProgressBar({ completed, total, size = 'md', showLabel = false, className = '' }: ProgressBarProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0
  const isComplete = total > 0 && completed === total

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm font-semibold mb-1">
          <span className="text-gray-600">Progress</span>
          <span className={isComplete ? 'text-green-600' : 'text-theme-primary'}>
            {completed}/{total}
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-theme-primary'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
