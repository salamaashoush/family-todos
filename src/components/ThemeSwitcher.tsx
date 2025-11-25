import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

const themes = [
  { id: 'default', name: 'Default', colors: ['#8B5CF6', '#EC4899'] },
  { id: 'ocean', name: 'Ocean', colors: ['#0EA5E9', '#06B6D4'] },
  { id: 'sunset', name: 'Sunset', colors: ['#F97316', '#EF4444'] },
  { id: 'forest', name: 'Forest', colors: ['#22C55E', '#10B981'] },
  { id: 'candy', name: 'Candy', colors: ['#EC4899', '#F472B6'] },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentTheme = themes.find((t) => t.id === theme) || themes[0]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Change theme"
        aria-expanded={isOpen}
      >
        {mounted ? (
          <div
            className="w-5 h-5 rounded-full shadow-inner"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.colors[0]} 0%, ${currentTheme.colors[1]} 100%)`,
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse" />
        )}
        <span className="hidden sm:inline text-sm font-medium text-gray-700">
          {mounted ? currentTheme.name : 'Theme'}
        </span>
        <svg
          className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 min-w-[180px]">
          <div className="p-2 space-y-1">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  mounted && theme === t.id
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full shadow-sm flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%)`,
                  }}
                />
                <span className="font-medium text-gray-700 flex-1">{t.name}</span>
                {mounted && theme === t.id && (
                  <svg className="w-5 h-5 text-theme-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
