import { ReactNode, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface ActionItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface AdminCardProps {
  children: ReactNode
  actions?: ActionItem[]
  isSelected?: boolean
  onSelect?: () => void
  showCheckbox?: boolean
  // Legacy props for backwards compatibility
  onDelete?: () => void
  onEdit?: () => void
  extraActions?: ReactNode
  hideDelete?: boolean
  hideEdit?: boolean
}

const MoreIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

export function AdminCard({
  children,
  actions,
  isSelected = false,
  onSelect,
  showCheckbox = false,
  // Legacy props
  onDelete,
  onEdit,
  extraActions,
  hideDelete = false,
  hideEdit = false,
}: AdminCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Build actions from legacy props if no actions provided
  const menuActions: ActionItem[] = actions || []

  if (!actions) {
    if (!hideEdit && onEdit) {
      menuActions.push({
        label: 'Edit',
        icon: <EditIcon />,
        onClick: onEdit,
      })
    }
    if (!hideDelete && onDelete) {
      menuActions.push({
        label: 'Delete',
        icon: <DeleteIcon />,
        onClick: onDelete,
        variant: 'danger',
      })
    }
  }

  const hasActions = menuActions.length > 0 || extraActions

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 160
      const dropdownHeight = menuActions.length * 40 + 8

      let top = rect.bottom + 4
      let left = rect.right - dropdownWidth

      // Adjust if dropdown would go off screen
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 4
      }
      if (left < 8) {
        left = 8
      }

      setDropdownPosition({ top, left })
    }
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleActionClick = (action: ActionItem) => {
    setIsDropdownOpen(false)
    action.onClick()
  }

  return (
    <div
      className={`bg-white border-2 rounded-xl transition-all ${
        isSelected
          ? 'border-theme-primary bg-theme-primary/5 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {showCheckbox && onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 ${
              isSelected
                ? 'bg-theme-primary border-theme-primary text-white'
                : 'border-gray-300 hover:border-theme-primary hover:bg-theme-primary/5'
            }`}
            aria-label={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
        <div className="flex-1 min-w-0">{children}</div>

        {hasActions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {extraActions}
            {menuActions.length > 0 && (
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={toggleDropdown}
                  className={`p-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 ${
                    isDropdownOpen
                      ? 'bg-gray-100 text-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="More actions"
                  aria-expanded={isDropdownOpen}
                >
                  <MoreIcon />
                </button>

                {isDropdownOpen && createPortal(
                  <div
                    ref={dropdownRef}
                    className="fixed z-50 min-w-[160px] bg-white rounded-xl shadow-lg border-2 border-gray-200 py-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                    }}
                  >
                    {menuActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActionClick(action)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                          action.variant === 'danger'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
