import type { Todo } from '../../types'
import { getDisplaySymbol } from '../../utils/symbols'

interface TodoCheckboxProps {
  todo: Todo
  isCompleted: boolean
  onToggle: () => void
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

const checkboxSizes = {
  sm: 'w-6 h-6 sm:w-7 sm:h-7',
  md: 'w-7 h-7 sm:w-8 sm:h-8',
  lg: 'w-8 h-8 sm:w-10 sm:h-10',
}

const checkmarkSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg sm:text-xl',
}

const symbolSizes = {
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-3xl',
  lg: 'text-3xl sm:text-4xl',
}

const textSizes = {
  sm: 'text-sm sm:text-base',
  md: 'text-base sm:text-lg',
  lg: 'text-lg sm:text-xl',
}

export function TodoCheckbox({ todo, isCompleted, onToggle, size = 'md', showDetails = false }: TodoCheckboxProps) {
  const checkboxSize = checkboxSizes[size]
  const checkmarkSize = checkmarkSizes[size]
  const symbolSize = symbolSizes[size]
  const textSize = textSizes[size]

  return (
    <button
      onClick={onToggle}
      aria-pressed={isCompleted}
      aria-label={`${todo.title}${isCompleted ? ' (completed)' : ''}`}
      role="checkbox"
      aria-checked={isCompleted}
      className={`w-full text-left transition-all active:scale-95 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-inset p-3 sm:p-4 rounded-xl min-h-[56px] ${
        isCompleted
          ? 'bg-green-100 border-3 border-green-400'
          : 'bg-white border-3 border-gray-200 hover:border-theme-primary'
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`${checkboxSize} rounded-full flex items-center justify-center flex-shrink-0 border-3 ${
            isCompleted ? 'bg-green-500 border-green-600' : 'bg-white border-theme-primary'
          }`}
        >
          {isCompleted && <span className={`text-white ${checkmarkSize} font-bold`}>✓</span>}
        </div>

        <div className="flex-1 min-w-0">
          {showDetails && todo.imageUrl && (
            <div className="mb-2">
              <img
                src={todo.imageUrl}
                alt={todo.title}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {getDisplaySymbol(todo.symbol) && <span className={`${symbolSize} flex-shrink-0`}>{getDisplaySymbol(todo.symbol)}</span>}
            <span
              className={`${textSize} font-semibold ${showDetails ? 'break-words' : 'truncate'} ${
                isCompleted ? 'line-through text-gray-600' : 'text-gray-800'
              }`}
            >
              {todo.title}
            </span>
          </div>

          {showDetails && todo.description && (
            <p
              className={`text-sm sm:text-base mt-1 break-words ${
                isCompleted ? 'text-gray-500' : 'text-gray-600'
              }`}
            >
              {todo.description}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
