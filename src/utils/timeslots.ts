import type { Timeslot } from '../types'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/**
 * Get the day abbreviation for a given date
 */
export function getDayAbbreviation(date: Date): string {
  return DAY_NAMES[date.getDay()]
}

/**
 * Check if a timeslot should be shown on a given date based on its recurrence settings
 */
export function shouldShowTimeslot(timeslot: Timeslot, date: Date): boolean {
  const { recurrence_type, recurrence_days } = timeslot

  switch (recurrence_type) {
    case 'daily':
      // Daily timeslots show every day
      return true

    case 'weekly':
      // Weekly timeslots show only on specified days
      if (!recurrence_days) return true // If no days specified, show always (fallback)
      const dayAbbr = getDayAbbreviation(date)
      const days = recurrence_days.split(',').map((d) => d.trim())
      return days.includes(dayAbbr)

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
