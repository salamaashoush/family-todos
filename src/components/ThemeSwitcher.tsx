import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

const themeNames: Record<string, string> = {
  default: 'Default',
  ocean: 'Ocean',
  sunset: 'Sunset',
  forest: 'Forest',
  candy: 'Candy',
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border-2 border-theme-primary rounded-lg px-4 py-2 font-bold text-theme-primary hover:bg-theme-primary hover:text-white transition-all flex items-center gap-2"
      >
        <span>🎨</span>
        <span className="hidden sm:inline">{mounted && theme ? themeNames[theme] : 'Theme'}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 bg-white border-2 border-theme-primary rounded-lg shadow-xl z-20 min-w-[200px]">
            <div className="p-2 space-y-1">
              {Object.entries(themeNames).map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTheme(id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 ${
                    mounted && theme === id
                      ? 'bg-theme-primary text-white font-bold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{name}</span>
                  {mounted && theme === id && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
