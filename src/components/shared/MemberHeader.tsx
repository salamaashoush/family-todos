import { MemberAvatar } from './MemberAvatar'
import type { Member, MemberStats } from '../../types'

interface MemberHeaderProps {
  member: Member
  stats?: MemberStats | null
  points?: number | null
  variant?: 'default' | 'complete' | 'compact'
  className?: string
}

export function MemberHeader({ member, stats, points, variant = 'default', className = '' }: MemberHeaderProps) {
  const isComplete = variant === 'complete'
  const isCompact = variant === 'compact'

  const bgClass = isComplete
    ? 'bg-gradient-to-r from-green-500 to-green-600'
    : 'bg-gradient-to-r from-theme-primary to-theme-secondary'

  return (
    <div className={`${bgClass} px-3 py-2 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <MemberAvatar
            name={member.name}
            avatar={member.avatar}
            size={isCompact ? 'md' : 'lg'}
            className="text-white"
          />
          {stats && stats.level > 0 && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm min-w-[24px] text-center">
              {stats.level}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-white font-bold truncate ${isCompact ? 'text-base' : 'text-lg'}`}>
            {member.name}
          </h3>
          {stats && (
            <div className="flex items-center gap-2 text-white/90 text-xs">
              {stats.currentStreak > 0 && (
                <span className="flex items-center gap-0.5" title={`${stats.currentStreak} day streak`}>
                  <span className="text-orange-300">🔥</span>
                  <span>{stats.currentStreak}d</span>
                </span>
              )}
              <span className="flex items-center gap-0.5" title={`${stats.totalStars} stars`}>
                <span className="text-yellow-300">⭐</span>
                <span>{stats.totalStars}</span>
              </span>
              {!isCompact && (
                <span className="flex items-center gap-0.5" title={`${stats.totalTasksCompleted} tasks`}>
                  <span className="text-green-300">✓</span>
                  <span>{stats.totalTasksCompleted}</span>
                </span>
              )}
              {!isCompact && points !== undefined && points !== null && (
                <span className="flex items-center gap-0.5" title={`${points} points`}>
                  <span className="text-purple-300">&#9670;</span>
                  <span>{points}p</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
