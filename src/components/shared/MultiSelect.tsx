import { useState, useRef, useEffect, ReactNode } from 'react'

interface MultiSelectOption {
  value: number | string
  label: string
  subtitle?: string
  icon?: ReactNode
}

interface MultiSelectProps {
  label?: string
  options: MultiSelectOption[]
  value: (number | string)[]
  onChange: (value: (number | string)[]) => void
  placeholder?: string
  error?: string
  isLoading?: boolean
  onCreateNew?: () => void
  createNewLabel?: string
  emptyMessage?: string
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  isLoading,
  onCreateNew,
  createNewLabel = 'Create New',
  emptyMessage = 'No options available',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOptions = options.filter((opt) => value.includes(opt.value))
  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (optValue: number | string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  const removeOption = (optValue: number | string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== optValue))
  }

  const handleOpen = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      )}

      <div className="relative">
        {/* Selected items display / trigger */}
        <button
          type="button"
          onClick={handleOpen}
          className={`
            w-full min-h-[48px] px-3 py-2
            bg-white border-2 rounded-xl
            text-left transition-all duration-200
            focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20
            ${error ? 'border-red-500' : isOpen ? 'border-theme-primary ring-2 ring-theme-primary/20' : 'border-gray-200'}
          `}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-theme-primary/10 text-theme-primary rounded-lg text-sm font-medium"
                >
                  {opt.icon && <span className="w-4 h-4">{opt.icon}</span>}
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => removeOption(opt.value, e)}
                    className="ml-0.5 hover:bg-theme-primary/20 rounded p-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-theme-primary"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full mx-auto mb-2" />
                  Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchQuery ? `No results for "${searchQuery}"` : emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleOption(opt.value)}
                      className={`
                        w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors
                        ${isSelected ? 'bg-theme-primary/10' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-theme-primary border-theme-primary' : 'border-gray-300'}
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {opt.icon && <span className="w-8 h-8 flex-shrink-0">{opt.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{opt.label}</div>
                        {opt.subtitle && (
                          <div className="text-xs text-gray-500 truncate">{opt.subtitle}</div>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Create new button */}
            {onCreateNew && (
              <div className="border-t border-gray-100 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setSearchQuery('')
                    onCreateNew()
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-theme-primary font-medium rounded-lg hover:bg-theme-primary/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {createNewLabel}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}
