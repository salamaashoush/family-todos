import { InputHTMLAttributes, forwardRef } from 'react'

interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ label, helperText, error, fullWidth = true, className = '', id, ...props }, ref) => {
    const inputId = id || props.name

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="file"
          className={`
            block w-full text-sm text-gray-700
            file:mr-4 file:py-3 file:px-4
            file:rounded-xl file:border-0
            file:text-sm file:font-semibold
            file:bg-theme-primary/10 file:text-theme-primary
            hover:file:bg-theme-primary/20
            file:cursor-pointer file:transition-colors
            cursor-pointer
            border-2 border-gray-200 rounded-xl
            focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20
            transition-all duration-200
            ${error ? 'border-red-500' : ''}
            ${className}
          `.trim()}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

FileInput.displayName = 'FileInput'
