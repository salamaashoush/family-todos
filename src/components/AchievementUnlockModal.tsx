import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

export interface AchievementUnlockData {
  memberName: string
  achievementName: string
  achievementIcon: string | null
  starReward: number
}

interface AchievementUnlockModalProps {
  achievement: AchievementUnlockData | null
  onClose: () => void
}

export function AchievementUnlockModal({ achievement, onClose }: AchievementUnlockModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (achievement) {
      // Start animation sequence
      setIsVisible(true)

      // Trigger confetti burst
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1']

      // Center burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5, x: 0.5 },
        colors,
        startVelocity: 30,
        gravity: 0.8,
      })

      // Side bursts with delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors,
        })
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors,
        })
      }, 150)

      // Show content after initial animation
      setTimeout(() => setShowContent(true), 100)

      // Auto-close after 4 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [achievement])

  const handleClose = () => {
    setShowContent(false)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300)
  }

  if (!achievement || !isVisible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop with gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-purple-900/80 via-indigo-900/80 to-pink-900/80 backdrop-blur-sm transition-opacity duration-300 ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal content */}
      <div
        className={`relative transform transition-all duration-500 ${
          showContent
            ? 'scale-100 opacity-100'
            : 'scale-50 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing ring animation */}
        <div className="absolute inset-0 -m-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 animate-spin-slow opacity-60 blur-xl" />
        </div>

        {/* Badge container */}
        <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 shadow-2xl border-2 border-yellow-400/50 min-w-[300px] max-w-[400px]">
          {/* Sparkle decorations */}
          <div className="absolute top-4 left-4 text-yellow-400 animate-pulse">
            <Sparkle />
          </div>
          <div className="absolute top-4 right-4 text-yellow-400 animate-pulse delay-150">
            <Sparkle />
          </div>
          <div className="absolute bottom-4 left-8 text-pink-400 animate-pulse delay-300">
            <Sparkle />
          </div>
          <div className="absolute bottom-4 right-8 text-purple-400 animate-pulse delay-500">
            <Sparkle />
          </div>

          {/* Achievement unlocked header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white text-sm font-bold uppercase tracking-wider shadow-lg animate-bounce-subtle">
              <TrophyIcon />
              Achievement Unlocked!
            </div>
          </div>

          {/* Badge with icon */}
          <div className="relative mx-auto w-32 h-32 mb-6">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 animate-pulse-glow" />

            {/* Inner badge */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-inner">
              <span className="text-6xl animate-badge-pop text-white">
                {achievement.achievementIcon || '🏆'}
              </span>
            </div>

            {/* Shine effect */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute -inset-full top-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-shine" />
            </div>
          </div>

          {/* Achievement name */}
          <h2 className="text-2xl font-bold text-center text-white mb-2 animate-fade-in-up">
            {achievement.achievementName}
          </h2>

          {/* Member name */}
          <p className="text-center text-purple-300 mb-4 animate-fade-in-up delay-100">
            Earned by <span className="font-bold text-yellow-400">{achievement.memberName}</span>
          </p>

          {/* Star reward */}
          {achievement.starReward > 0 && (
            <div className="flex items-center justify-center gap-2 text-yellow-400 animate-fade-in-up delay-200">
              <StarIcon />
              <span className="text-xl font-bold">+{achievement.starReward} Stars</span>
              <StarIcon />
            </div>
          )}

          {/* Tap to dismiss hint */}
          <p className="text-center text-slate-500 text-xs mt-6 animate-fade-in delay-500">
            Tap anywhere to dismiss
          </p>
        </div>
      </div>
    </div>
  )
}

// Icon components
function TrophyIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C9.38 2 7.25 4.13 7.25 6.75c0 1.01.31 1.95.85 2.72C6.5 10.31 5.5 11.97 5.5 13.75c0 .55.45 1 1 1h11c.55 0 1-.45 1-1 0-1.78-1-3.44-2.6-4.28.54-.77.85-1.71.85-2.72C16.75 4.13 14.62 2 12 2zM8.5 17h7c.28 0 .5.22.5.5v.5c0 .55-.45 1-1 1h-6c-.55 0-1-.45-1-1v-.5c0-.28.22-.5.5-.5zm1 3h5c.28 0 .5.22.5.5v.5c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1v-.5c0-.28.22-.5.5-.5z"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function Sparkle() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
    </svg>
  )
}
