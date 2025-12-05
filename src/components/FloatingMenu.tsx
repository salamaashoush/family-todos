import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X, Settings, BarChart3 } from 'lucide-react'
import { usePrayerTimesContext } from '../contexts/PrayerTimesContext'
import { usePrayerTimes } from '../hooks/usePrayerTimes'
import { PRAYER_NAMES } from '../utils/prayerCalculations'

interface FloatingMenuProps {
  token: string
}

export function FloatingMenu({ token }: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Prayer times context
  const prayerContext = usePrayerTimesContext()
  const {
    isEnabled: prayerEnabled,
    settings: prayerSettings,
    adhanSettings,
    isAdhanPlaying,
    togglePanel,
  } = prayerContext || {}

  const { nextPrayer, timeUntilNextPrayer, timeUntilNextPrayerMs } = usePrayerTimes({
    settings: prayerSettings ?? null,
    adhanSettings: adhanSettings ?? [],
    enabled: prayerEnabled ?? false,
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if prayer is approaching (within 15 minutes)
  const isPrayerApproaching =
    prayerEnabled && timeUntilNextPrayerMs !== null && timeUntilNextPrayerMs < 15 * 60 * 1000

  // Check if prayer is imminent (within 5 minutes)
  const isPrayerImminent =
    prayerEnabled && timeUntilNextPrayerMs !== null && timeUntilNextPrayerMs < 5 * 60 * 1000

  const showPrayerInFab = prayerEnabled && prayerSettings?.showFloatingButton && nextPrayer
  const nextPrayerName = nextPrayer ? PRAYER_NAMES[nextPrayer].english : ''

  // Determine FAB appearance based on prayer state
  const getFabClasses = () => {
    if (isAdhanPlaying) {
      return 'bg-green-500 hover:bg-green-600 animate-pulse'
    }
    if (isPrayerImminent) {
      return 'bg-amber-500 hover:bg-amber-600'
    }
    if (isPrayerApproaching) {
      return 'bg-theme-primary hover:bg-theme-primary/90'
    }
    return 'bg-gradient-to-r from-theme-primary to-theme-secondary hover:shadow-theme-primary/50'
  }

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
      {/* Menu items */}
      <div
        className={`absolute bottom-full right-0 mb-3 flex flex-col gap-2 transition-all duration-200 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Prayer Times Option */}
        {prayerEnabled && prayerSettings && togglePanel && (
          <button
            onClick={() => {
              togglePanel()
              setIsOpen(false)
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
            </svg>
            <span className="font-semibold whitespace-nowrap">Prayer Times</span>
          </button>
        )}
        <Link
          to="/admin"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-r from-theme-primary to-theme-secondary hover:from-theme-primary hover:to-pink-700"
        >
          <Settings className="w-5 h-5" />
          <span className="font-semibold whitespace-nowrap">Admin Panel</span>
        </Link>
        <Link
          to="/family/$token/stats"
          params={{ token }}
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="font-semibold whitespace-nowrap">Stats & Rewards</span>
        </Link>
      </div>

      {/* Main FAB button - shows prayer countdown when enabled */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${getFabClasses()} text-white p-4 sm:p-5 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 min-w-[56px] min-h-[56px] sm:min-w-[64px] sm:min-h-[64px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 relative`}
        aria-label={showPrayerInFab ? `${nextPrayerName} in ${timeUntilNextPrayer}` : 'Menu'}
      >
        {/* Animated ring for approaching prayer */}
        {isPrayerApproaching && !isAdhanPlaying && (
          <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
        )}

        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          {isOpen ? (
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : showPrayerInFab && !isOpen ? (
            <div className="flex flex-col items-center">
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${isAdhanPlaying ? 'animate-bounce' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
              </svg>
              <span className="text-[10px] font-bold mt-0.5">{timeUntilNextPrayer}</span>
            </div>
          ) : (
            <Menu className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
        </div>
      </button>
    </div>
  )
}
