/**
 * Get the current date in YYYY-MM-DD format using the local timezone
 */
export function getTodayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert a Date object to YYYY-MM-DD format using local timezone
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string into a Date object in local timezone
 * Avoids UTC interpretation that causes timezone offset issues
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Add days to a YYYY-MM-DD date string
 * Returns a new YYYY-MM-DD string
 */
export function addDays(dateString: string, days: number): string {
  const date = parseLocalDate(dateString)
  date.setDate(date.getDate() + days)
  return toLocalDateString(date)
}
