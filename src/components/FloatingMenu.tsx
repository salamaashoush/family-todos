import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'

const MenuIcon = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const StatsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

interface MenuItem {
  to: string
  icon: React.ReactNode
  label: string
  bgColor: string
  hoverColor: string
}

const menuItems: MenuItem[] = [
  {
    to: '/admin',
    icon: <AdminIcon />,
    label: 'Admin Panel',
    bgColor: 'bg-gradient-to-r from-theme-primary to-theme-secondary',
    hoverColor: 'hover:from-theme-primary hover:to-pink-700',
  },
  {
    to: '/stats',
    icon: <StatsIcon />,
    label: 'Stats & Rewards',
    bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    hoverColor: 'hover:from-yellow-600 hover:to-orange-600',
  },
]

export function FloatingMenu() {
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
        {menuItems.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${item.bgColor} ${item.hoverColor}`}
            style={{ transitionDelay: isOpen ? `${index * 50}ms` : '0ms' }}
          >
            {item.icon}
            <span className="font-semibold whitespace-nowrap">{item.label}</span>
          </Link>
        ))}
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
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </div>
      </button>
    </div>
  )
}
