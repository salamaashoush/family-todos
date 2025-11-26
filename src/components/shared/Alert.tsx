import { ReactNode } from 'react'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

interface AlertProps {
  variant?: AlertVariant
  title: string
  message?: string
  children?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; title: string; text: string; icon: string }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-800',
    text: 'text-blue-700',
    icon: 'text-blue-500',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    title: 'text-green-800',
    text: 'text-green-700',
    icon: 'text-green-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    title: 'text-amber-800',
    text: 'text-amber-700',
    icon: 'text-amber-500',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    title: 'text-red-800',
    text: 'text-red-700',
    icon: 'text-red-500',
  },
}

const variantIcons: Record<AlertVariant, ReactNode> = {
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export function Alert({ variant = 'info', title, message, children, action }: AlertProps) {
  const styles = variantStyles[variant]

  return (
    <div className={`${styles.bg} border-2 ${styles.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
          {variantIcons[variant]}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${styles.title}`}>{title}</p>
          {message && (
            <p className={`text-sm ${styles.text} mt-1`}>{message}</p>
          )}
          {children}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`mt-2 text-sm font-semibold ${styles.title} hover:underline`}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
