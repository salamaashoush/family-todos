import type { Todo } from '../../types'

interface TodoCheckboxProps {
  todo: Todo
  isCompleted: boolean
  onToggle: () => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'compact'
}

const checkboxSizes = {
  sm: 'w-5 h-5 sm:w-6 sm:h-6',
  md: 'w-6 h-6 sm:w-7 sm:h-7',
  lg: 'w-8 h-8 sm:w-10 sm:h-10',
}

const symbolSizes = {
  sm: 'text-lg sm:text-xl',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-3xl',
}

const textSizes = {
  sm: 'text-xs sm:text-sm',
  md: 'text-sm sm:text-base',
  lg: 'text-base sm:text-lg',
}

export function TodoCheckbox({ todo, isCompleted, onToggle, size = 'md', variant = 'full' }: TodoCheckboxProps) {
  const checkboxSize = checkboxSizes[size]
  const symbolSize = symbolSizes[size]
  const textSize = textSizes[size]

  const baseClasses = `w-full text-left transition-all active:scale-95 touch-manipulation flex items-center`

  const variantClasses =
    variant === 'full'
      ? `p-3 sm:p-4 rounded-xl min-h-[56px] gap-3 sm:gap-4 ${
          isCompleted
            ? 'bg-green-100 border-3 border-green-400'
            : 'bg-gray-50 border-3 border-gray-200 hover:border-theme-primary'
        }`
      : `p-2 sm:p-3 rounded-lg min-h-[44px] gap-2 sm:gap-3 ${
          isCompleted
            ? 'bg-green-100 border-2 border-green-400'
            : 'bg-gray-50 border-2 border-gray-200 hover:border-theme-primary'
        }`

  return (
    <button onClick={onToggle} className={`${baseClasses} ${variantClasses}`}>
      <div
        className={`${checkboxSize} rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-500 border-green-600' : 'bg-white border-theme-primary'
        }`}
      >
        {isCompleted && <span className="text-white text-xs sm:text-sm font-bold">✓</span>}
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {todo.symbol && <span className={`${symbolSize} flex-shrink-0`}>{todo.symbol}</span>}
        <span className={`${textSize} font-medium truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
          {todo.title}
        </span>
      </div>
    </button>
  )
}
