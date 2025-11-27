import { ReactNode, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, Pencil, Trash2, Check } from 'lucide-react'

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
        icon: <Pencil className="w-4 h-4" />,
        onClick: onEdit,
      })
    }
    if (!hideDelete && onDelete) {
      menuActions.push({
        label: 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
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
            {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
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
                  <MoreVertical className="w-5 h-5" />
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
