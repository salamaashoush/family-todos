import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useLayout } from '../contexts/LayoutContext'
import { layouts, type LayoutId } from '../config/layouts'

const layoutIcons: Record<LayoutId, ReactNode> = {
  'member-focus': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  'timeslot-focus': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  'quick-check': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  'family-dashboard': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
}

export function LayoutSwitcher() {
  const { layout, setLayout, isManualOverride, isHydrated } = useLayout()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-gray-100 min-h-[44px] min-w-[44px] animate-pulse">
        <div className="w-5 h-5 bg-gray-300 rounded" />
        <div className="hidden sm:block w-16 h-4 bg-gray-300 rounded" />
      </div>
    )
  }

  const currentLayout = layouts[layout]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2"
        aria-label="Switch layout"
        aria-expanded={isOpen}
      >
        <span className="text-gray-600">{layoutIcons[layout]}</span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700">{currentLayout.name}</span>
        {isManualOverride && (
          <span className="w-2 h-2 bg-theme-accent rounded-full flex-shrink-0" title="Manual override active" />
        )}
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
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="p-2">
            {(Object.entries(layouts) as [LayoutId, typeof layouts[LayoutId]][]).map(([id, config]) => (
              <button
                key={id}
                onClick={() => {
                  setLayout(id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-inset ${
                  layout === id
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${layout === id ? 'text-theme-primary' : 'text-gray-400'}`}>
                  {layoutIcons[id]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${layout === id ? 'text-theme-primary' : 'text-gray-700'}`}>
                    {config.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{config.description}</div>
                </div>
                {layout === id && (
                  <svg className="w-5 h-5 text-theme-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
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
