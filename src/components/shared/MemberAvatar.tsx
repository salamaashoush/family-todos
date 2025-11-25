interface MemberAvatarProps {
  name: string
  avatar?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  borderColor?: 'white' | 'primary' | 'gray'
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl',
}

const borderClasses = {
  white: 'border-white',
  primary: 'border-theme-primary',
  gray: 'border-gray-200',
}

export function MemberAvatar({ name, avatar, size = 'md', className = '', borderColor = 'white' }: MemberAvatarProps) {
  const sizeClass = sizeClasses[size]
  const borderClass = borderClasses[borderColor]

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeClass} rounded-full border-3 object-cover ${borderClass} ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full border-3 ${borderClass} bg-white/20 flex items-center justify-center ${className}`}
    >
      <span className="font-bold text-inherit">{name.charAt(0)}</span>
    </div>
  )
}
