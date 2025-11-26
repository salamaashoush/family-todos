import { SelectHTMLAttributes, ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
  fullWidth?: boolean
}

export function Select({
  children,
  fullWidth = false,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <select
        className={`
          appearance-none
          w-full px-4 py-3 pr-10
          bg-white
          border-2 border-gray-200 rounded-xl
          text-gray-700 font-medium
          focus:border-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/20
          transition-colors
          min-h-[48px]
          cursor-pointer
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg
          className="h-5 w-5 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  )
}
