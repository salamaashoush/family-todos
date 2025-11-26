import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  description?: string
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || props.name

    return (
      <div className={className}>
        <label
          htmlFor={checkboxId}
          className="flex items-start gap-3 cursor-pointer group"
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              className="
                peer
                w-6 h-6
                appearance-none
                bg-white
                border-2 border-gray-300 rounded-md
                cursor-pointer
                transition-all duration-200
                checked:bg-theme-primary checked:border-theme-primary
                focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:ring-offset-2
                disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200
              "
              {...props}
            />
            <svg
              className="
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-4 h-4 text-white
                pointer-events-none
                opacity-0 peer-checked:opacity-100
                transition-opacity duration-200
              "
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {(label || description) && (
            <div className="flex-1">
              {label && (
                <span className="font-semibold text-gray-700 group-hover:text-theme-primary transition-colors">
                  {label}
                </span>
              )}
              {description && (
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 ml-9">{error}</p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
