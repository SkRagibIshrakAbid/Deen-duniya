/**
 * Date and time utilities
 */

import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(customParseFormat)

/**
 * Format time based on user preference (12h or 24h)
 */
export const formatTime = (time, format = '24') => {
  if (!time) return ''
  
  const [hours, minutes] = time.split(':')
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
 * Get time until a specific prayer
 */
export const getTimeUntilPrayer = (prayerTime) => {
  if (!prayerTime) return null
  
  const now = dayjs()
  const [hours, minutes] = prayerTime.split(':')
  const prayer = now.clone().hour(parseInt(hours)).minute(parseInt(minutes)).second(0)
  
  if (prayer.isBefore(now)) {
    // Prayer has passed for today, calculate for tomorrow
    const tomorrow = prayer.add(1, 'day')
    return tomorrow.diff(now)
  }
  
  return prayer.diff(now)
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
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
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
 * Get current time formatted
 */
export const getCurrentTime = (format = '24') => {
  const now = dayjs()
  if (format === '12') {
    return now.format('h:mm:ss A')
  }
  return now.format('HH:mm:ss')
}

/**
 * Get today's date in DD-MM-YYYY format for API
 */
export const getTodayFormatted = () => {
  return dayjs().format('DD-MM-YYYY')
}

/**
 * Get current date info
 */
export const getCurrentDateInfo = () => {
  const now = dayjs()
  return {
    day: now.format('DD'),
    month: now.format('MMMM'),
    year: now.format('YYYY'),
    weekday: now.format('dddd'),
    full: now.format('dddd, DD MMMM YYYY')
  }
}

/**
 * Check if current time is within a prayer window
 */
export const isWithinPrayerTime = (startTime, endTime) => {
  const now = dayjs()
  const [startHours, startMinutes] = startTime.split(':')
  const [endHours, endMinutes] = endTime.split(':')
  
  const start = now.clone().hour(parseInt(startHours)).minute(parseInt(startMinutes)).second(0)
  const end = now.clone().hour(parseInt(endHours)).minute(parseInt(endMinutes)).second(0)
  
  return now.isAfter(start) && now.isBefore(end)
}

/**
 * Format Hijri date
 */
export const formatHijriDate = (hijriDate) => {
  if (!hijriDate) return ''
  
  const { day, month, year } = hijriDate
  return `${day} ${month.en} ${year} AH`
}

/**
 * Get Hijri month name in English
 */
export const getHijriMonthName = (monthNumber) => {
  const months = [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhul-Qi\'dah', 'Dhul-Hijjah'
  ]
  return months[monthNumber - 1] || ''
}

/**
 * Get progress percentage through the day for a prayer time
 */
export const getPrayerProgress = (startTime, endTime) => {
  const now = dayjs()
  const [startHours, startMinutes] = startTime.split(':')
  const [endHours, endMinutes] = endTime.split(':')
  
  const start = now.clone().hour(parseInt(startHours)).minute(parseInt(startMinutes)).second(0)
  const end = now.clone().hour(parseInt(endHours)).minute(parseInt(endMinutes)).second(0)
  
  if (now.isBefore(start)) return 0
  if (now.isAfter(end)) return 100
  
  const total = end.diff(start)
  const elapsed = now.diff(start)
  
  return Math.round((elapsed / total) * 100)
}
