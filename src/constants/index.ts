export const CELEBRATION_THRESHOLDS = {
  PERFECT_DAY: 100,
  BIG_CELEBRATION: 75,
  MEDIUM_CELEBRATION: 50,
} as const

export const CELEBRATION_DURATIONS = {
  PERFECT_DAY: 2000,
} as const

export const CELEBRATION_PARTICLE_COUNTS = {
  PERFECT_DAY: 5,
  BIG: 120,
  MEDIUM: 80,
  SMALL: 60,
  LEVEL_UP: 200,
  ACHIEVEMENT: 150,
} as const

export const CELEBRATION_COLORS = {
  GOLD: ['#ffd700', '#ffed4e', '#ffa500', '#ff69b4', '#9333ea'],
  COLORFUL: ['#9333ea', '#ec4899', '#f59e0b', '#10b981'],
  MEDIUM: ['#9333ea', '#ec4899', '#f59e0b'],
  LEVEL_UP: ['#ffd700', '#ffed4e', '#ffa500'],
} as const

export const LEVEL_PROGRESS = {
  STARS_PER_LEVEL: 50,
} as const

export const TOAST_DURATION = 3000

export const RECONNECT_DELAY = 3000

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const THEME_NAMES: Record<string, string> = {
  default: 'Default',
  ocean: 'Ocean',
  sunset: 'Sunset',
  forest: 'Forest',
  candy: 'Candy',
}

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 5,
  SUPPORTED_FORMATS: 'JPG, PNG, GIF, WebP',
} as const
