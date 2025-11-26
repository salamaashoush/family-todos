import type { Timeslot } from '../types'

// Day names for display purposes (index matches Date.getDay(): 0=Sunday, 6=Saturday)
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/**
 * Get the numeric day of week for a given date (0=Sunday, 6=Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay()
}

/**
 * Convert numeric days CSV string to day names for display
 * e.g., "0,6" -> "Sun, Sat"
 */
export function formatRecurrenceDays(recurrenceDays: string | null): string {
  if (!recurrenceDays) return ''
  return recurrenceDays
    .split(',')
    .map((d) => DAY_NAMES[parseInt(d.trim(), 10)])
    .filter(Boolean)
    .join(', ')
}

/**
 * Check if a timeslot should be shown on a given date based on its recurrence settings
 * recurrenceDays is stored as CSV of numeric days: "0,1,2,3,4,5,6" (0=Sunday, 6=Saturday)
 */
export function shouldShowTimeslot(timeslot: Timeslot, date: Date): boolean {
  const { recurrenceType, recurrenceDays } = timeslot

  switch (recurrenceType) {
    case 'daily':
      // Daily timeslots show every day
      return true

    case 'weekly':
      // Weekly timeslots show only on specified days
      if (!recurrenceDays) return true // If no days specified, show always (fallback)
      const dayOfWeek = getDayOfWeek(date)
      const days = recurrenceDays.split(',').map((d: string) => parseInt(d.trim(), 10))
      return days.includes(dayOfWeek)

    case 'monthly':
      // Monthly could be implemented later (e.g., specific day of month)
      // For now, show every day
      return true

    case 'none':
      // One-time timeslots - show every day (they're not recurring but still active)
      return true

    default:
      return true
  }
}

/**
 * Filter timeslots based on a given date
 */
export function filterTimeslotsByDate(timeslots: Timeslot[], date: Date): Timeslot[] {
  return timeslots.filter((timeslot) => shouldShowTimeslot(timeslot, date))
}

/**
 * Filter timeslots for a specific date string (YYYY-MM-DD format)
 */
export function filterTimeslotsByDateString(timeslots: Timeslot[], dateString: string): Timeslot[] {
  const date = new Date(dateString + 'T00:00:00')
  return filterTimeslotsByDate(timeslots, date)
}
