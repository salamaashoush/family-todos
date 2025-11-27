import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X, Settings, BarChart3 } from 'lucide-react'

interface FloatingMenuProps {
  token: string
}

export function FloatingMenu({ token }: FloatingMenuProps) {
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

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
      {/* Menu items */}
      <div
        className={`absolute bottom-full right-0 mb-3 flex flex-col gap-2 transition-all duration-200 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
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

      {/* Main FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-gradient-to-r from-theme-primary to-theme-secondary text-white p-4 sm:p-5 rounded-full shadow-2xl hover:shadow-theme-primary/50 transition-all transform hover:scale-110 active:scale-95 min-w-[56px] min-h-[56px] sm:min-w-[64px] sm:min-h-[64px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 ${
          isOpen ? 'rotate-0' : ''
        }`}
        aria-label="Menu"
      >
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          {isOpen ? <X className="w-6 h-6 sm:w-7 sm:h-7" /> : <Menu className="w-6 h-6 sm:w-7 sm:h-7" />}
        </div>
      </button>
    </div>
  )
}
