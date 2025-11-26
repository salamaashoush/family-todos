import type { Todo } from '../../types'
import { getDisplaySymbol } from '../../utils/symbols'

interface TodoCheckboxProps {
  todo: Todo
  isCompleted: boolean
  onToggle: () => void
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
  disabled?: boolean
  disabledReason?: string
}

const checkboxSizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
}

const imageSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

const symbolSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
}

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
}

export function TodoCheckbox({ todo, isCompleted, onToggle, size = 'md', showDescription = false, disabled = false, disabledReason }: TodoCheckboxProps) {
  const checkboxSize = checkboxSizes[size]
  const imageSize = imageSizes[size]
  const symbolSize = symbolSizes[size]
  const textSize = textSizes[size]
  const displaySymbol = getDisplaySymbol(todo.symbol)

  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      aria-pressed={isCompleted}
      aria-label={`${todo.title}${isCompleted ? ' (completed)' : ''}${disabled && disabledReason ? ` - ${disabledReason}` : ''}`}
      role="checkbox"
      aria-checked={isCompleted}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={`w-full text-left transition-all touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-inset px-3 py-2 rounded-lg ${
        disabled
          ? 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-60'
          : isCompleted
            ? 'bg-green-50 border-2 border-green-400 active:scale-[0.98]'
            : 'bg-white border-2 border-gray-200 hover:border-theme-primary active:scale-[0.98]'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`${checkboxSize} rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
            isCompleted ? 'bg-green-500 border-green-600' : 'bg-white border-theme-primary'
          }`}
        >
          {isCompleted && <span className="text-white text-xs font-bold">✓</span>}
        </div>

        {todo.imageUrl && (
          <img
            src={todo.imageUrl}
            alt=""
            className={`${imageSize} object-cover rounded-md flex-shrink-0`}
          />
        )}

        {displaySymbol && !todo.imageUrl && (
          <span className={`${symbolSize} flex-shrink-0`}>{displaySymbol}</span>
        )}

        <div className="flex-1 min-w-0">
          <span
            className={`${textSize} font-medium block truncate ${
              isCompleted ? 'line-through text-gray-500' : 'text-gray-800'
            }`}
          >
            {todo.title}
          </span>
          {showDescription && todo.description && (
            <span className={`text-xs text-gray-500 block truncate ${isCompleted ? 'line-through' : ''}`}>
              {todo.description}
            </span>
          )}
        </div>

        {displaySymbol && todo.imageUrl && (
          <span className={`${symbolSize} flex-shrink-0`}>{displaySymbol}</span>
        )}
      </div>
    </button>
  )
}
