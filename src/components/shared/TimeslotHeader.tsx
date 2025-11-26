interface TimeslotHeaderProps {
  name: string
  startTime?: string | null
  endTime?: string | null
  isCurrentTimeslot?: boolean
  isComplete?: boolean
  completedCount?: number
  totalCount?: number
  isExpanded?: boolean
  onToggle?: () => void
  variant?: 'full' | 'compact'
}

export function TimeslotHeader({
  name,
  startTime,
  endTime,
  isCurrentTimeslot = false,
  isComplete = false,
  completedCount,
  totalCount,
  isExpanded,
  onToggle,
  variant = 'full',
}: TimeslotHeaderProps) {
  const bgClass = isComplete
    ? 'bg-gradient-to-r from-green-500 to-green-600'
    : 'bg-gradient-to-r from-theme-primary to-theme-secondary'

  const content = (
    <>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={`font-bold text-white ${variant === 'full' ? 'text-xl sm:text-2xl' : 'text-lg'}`}>{name}</h3>
          {isCurrentTimeslot && (
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
              NOW
            </span>
          )}
        </div>
        {startTime && endTime && (
          <p className="text-white/80 text-sm mt-0.5">
            {startTime} - {endTime}
          </p>
        )}
      </div>

      {(completedCount !== undefined && totalCount !== undefined) && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <span className="text-white font-bold text-lg">
              {completedCount}/{totalCount}
            </span>
          </div>
          {onToggle !== undefined && (
            <svg
              className={`w-5 h-5 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      )}
    </>
  )

  if (onToggle) {
    return (
      <button
        onClick={onToggle}
        className={`w-full p-4 flex items-center justify-between gap-3 transition-colors rounded-t-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-inset ${bgClass}`}
      >
        {content}
      </button>
    )
  }

  return <div className={`p-4 flex items-center justify-between gap-3 rounded-t-2xl ${bgClass}`}>{content}</div>
}
