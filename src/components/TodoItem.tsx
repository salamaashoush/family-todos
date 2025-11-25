import type { TodoItemProps } from '../types'

export function TodoItem({ todo, isCompleted, onToggle }: TodoItemProps) {
  return (
    <button
      onClick={() => onToggle(isCompleted)}
      aria-pressed={isCompleted}
      aria-label={`${todo.title}${isCompleted ? ' (completed)' : ''}`}
      role="checkbox"
      aria-checked={isCompleted}
      className={`w-full p-4 sm:p-5 rounded-xl text-left transition-all transform active:scale-95 touch-manipulation min-h-[64px] ${
        isCompleted
          ? 'bg-green-200 border-4 border-green-500 shadow-md'
          : 'bg-white border-4 border-theme-primary hover:border-theme-primary active:border-theme-primary shadow-lg hover:shadow-xl'
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 flex items-center justify-center flex-shrink-0 ${
            isCompleted ? 'bg-green-500 border-green-600' : 'bg-white border-theme-primary'
          }`}
        >
          {isCompleted && <span className="text-white text-2xl sm:text-3xl font-bold">✓</span>}
        </div>

        <div className="flex-1 min-w-0">
          {todo.image_url && (
            <div className="mb-2">
              <img
                src={todo.image_url}
                alt={todo.title}
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {todo.symbol && <span className="text-3xl sm:text-4xl">{todo.symbol}</span>}
            <span
              className={`text-base sm:text-lg font-semibold break-words ${
                isCompleted ? 'line-through text-gray-600' : 'text-gray-800'
              }`}
            >
              {todo.title}
            </span>
          </div>

          {todo.description && (
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
