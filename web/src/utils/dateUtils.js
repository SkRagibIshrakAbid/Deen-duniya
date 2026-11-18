/**
 * Date and time utilities
 */

import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * The browser's own IANA timezone
 */
export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * Strip any suffix the API may add to a time string ("05:12 (BST)" -> "05:12")
 */
export const cleanTime = (time) => (time ? String(time).trim().slice(0, 5) : '')

/**
 * "Now" as a dayjs object in the given timezone (falls back to browser local time)
 */
export const nowInTz = (tz, at = Date.now()) => {
  if (!tz) return dayjs(at)
  try {
    return dayjs(at).tz(tz)
  } catch {
    return dayjs(at)
  }
}

/**
 * Today's date (DD-MM-YYYY) in the given timezone
 */
export const todayInTz = (tz) => nowInTz(tz).format('DD-MM-YYYY')

/**
 * Build an absolute instant from a DD-MM-YYYY date, an HH:mm wall-clock time
 * and an IANA timezone. Returns a dayjs object (comparable with dayjs()).
 */
export const instantAt = (dateDMY, time, tz, dayOffset = 0) => {
  const t = cleanTime(time)
  if (!dateDMY || !t) return null
  const [d, m, y] = dateDMY.split('-')
  const iso = `${y}-${m}-${d} ${t}`
  let base
  try {
    base = tz ? dayjs.tz(iso, tz) : dayjs(iso)
  } catch {
    base = dayjs(iso)
  }
  return dayOffset ? base.add(dayOffset, 'day') : base
}

/**
 * Format a wall-clock time string based on user preference (12h or 24h)
 */
export const formatTime = (time, format = '24') => {
  const t = cleanTime(time)
  if (!t) return ''

  const [hours, minutes] = t.split(':')
  const timeObj = dayjs().hour(parseInt(hours)).minute(parseInt(minutes))

  if (format === '12') {
    return timeObj.format('h:mm A')
  }
  return timeObj.format('HH:mm')
}

/**
 * Format date in a readable format
 */
export const formatDate = (date, formatStr = 'DD MMMM YYYY') => {
  return dayjs(date).format(formatStr)
}

/**
 * Format duration in human-readable format
 */
export const formatDuration = (milliseconds) => {
  if (milliseconds <= 0) return 'Now'

  const dur = dayjs.duration(milliseconds)
  const hours = Math.floor(dur.asHours())
  const minutes = dur.minutes()
  const seconds = dur.seconds()

  if (hours > 0) {
    return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`
  } else if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format duration with more detail
 */
export const formatDetailedDuration = (milliseconds) => {
  if (milliseconds <= 0) return 'Now'

  const dur = dayjs.duration(milliseconds)
  const hours = Math.floor(dur.asHours())
  const minutes = dur.minutes()

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else {
    return 'Less than a minute'
  }
}

/**
 * Get current date info (in the given timezone, if any)
 */
export const getCurrentDateInfo = (tz) => {
  const now = nowInTz(tz)
  return {
    day: now.format('DD'),
    month: now.format('MMMM'),
    year: now.format('YYYY'),
    weekday: now.format('dddd'),
    full: now.format('dddd, DD MMMM YYYY')
  }
}

/**
 * Format Hijri date
 */
export const formatHijriDate = (hijriDate) => {
  if (!hijriDate) return ''

  const { day, month, year } = hijriDate
  return `${day} ${month.en} ${year} AH`
}
