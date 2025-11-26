import { useRef } from 'react'

interface DatePickerProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const todayDate = new Date(today + 'T00:00:00')
    const diffTime = date.getTime() - todayDate.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays === 1) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const goToPrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number)
    const date = new Date(year, month - 1, day - 1)
    const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    onDateChange(newDate)
  }

  const goToNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number)
    const date = new Date(year, month - 1, day + 1)
    const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    onDateChange(newDate)
  }

  const openDatePicker = () => {
    inputRef.current?.showPicker?.()
  }

  return (
    <div className="relative flex items-center">
      <button
        onClick={goToPrevDay}
        className="p-2 rounded-l-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center border-r border-gray-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-inset"
        aria-label="Previous day"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={openDatePicker}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-inset"
        aria-label="Select date"
      >
        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{formatDisplayDate(selectedDate)}</span>
      </button>

      <button
        onClick={goToNextDay}
        className="p-2 rounded-r-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center border-l border-gray-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-inset"
        aria-label="Next day"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  )
}
