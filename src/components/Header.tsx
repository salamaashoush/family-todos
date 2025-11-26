import { Link } from '@tanstack/react-router'
import { ThemeSwitcher } from './ThemeSwitcher'
import { LayoutSwitcher } from './LayoutSwitcher'
import { DatePicker } from './DatePicker'
import { FamilySelector } from './FamilySelector'

interface HeaderProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function Header({ selectedDate, onDateChange }: HeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b-2 border-theme-primary/20">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0 shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
              <span className="hidden xs:inline">Family </span>Todos
            </h1>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <FamilySelector />
            <DatePicker selectedDate={selectedDate} onDateChange={onDateChange} />
            <LayoutSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}
