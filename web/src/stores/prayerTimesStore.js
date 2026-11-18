/**
 * Prayer Times Store
 * Manages prayer times data and time-based calculations.
 *
 * All times returned by the API are wall-clock times in the *location's*
 * timezone (data.meta.timezone). Every comparison against "now" is done on
 * absolute instants built with that timezone, so countdowns stay correct even
 * when the selected city is in a different timezone from the browser.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { getPrayerTimes, getMonthlyCalendar } from '../services/aladhanApi'
import { useLocationStore } from './locationStore'
import { useSettingsStore } from './settingsStore'
import { useNow } from '../composables/useNow'
import { instantAt, todayInTz, browserTimezone, formatDuration } from '../utils/dateUtils'

const STORAGE_KEY = 'deen-duniya-prayer-times'
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export const usePrayerTimesStore = defineStore('prayerTimes', () => {
  const now = useNow()

  // State
  const todayTimings = ref(null)
  const dateInfo = ref(null)
  const timezone = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)

  // Monthly calendar has its own loading/error state so it never disturbs today's card
  const monthlyTimings = ref([])
  const calendarLoading = ref(false)
  const calendarError = ref(null)

  const prayerNames = PRAYER_NAMES

  // ---------- helpers ----------

  const effectiveTimezone = computed(() => {
    const locationStore = useLocationStore()
    return timezone.value || locationStore.timezone || browserTimezone()
  })

  /**
   * Absolute instant (dayjs) for a timing name, optionally shifted by whole days.
   * Uses today's timings for neighbouring days (differences are only a minute or two).
   */
  const instant = (name, dayOffset = 0) => {
    if (!todayTimings.value?.[name] || !dateInfo.value?.gregorian?.date) return null
    let offset = dayOffset
    // "Midnight" (e.g. 00:04) belongs to the night after today's Isha
    if (name === 'Midnight') {
      const hour = parseInt(todayTimings.value.Midnight)
      if (hour < 12) offset += 1
    }
    return instantAt(dateInfo.value.gregorian.date, todayTimings.value[name], timezone.value, offset)
  }

  /**
   * End of a prayer's window.
   * Fajr ends at Sunrise, Isha at the next Fajr, others at the following prayer.
   */
  const prayerEnd = (name, dayOffset = 0) => {
    switch (name) {
      case 'Fajr': return instant('Sunrise', dayOffset)
      case 'Dhuhr': return instant('Asr', dayOffset)
      case 'Asr': return instant('Maghrib', dayOffset)
      case 'Maghrib': return instant('Isha', dayOffset)
      case 'Isha': return instant('Fajr', dayOffset + 1)
      default: return null
    }
  }

  // ---------- computed ----------

  const nextPrayer = computed(() => {
    if (!todayTimings.value) return null
    const nowMs = now.value

    for (const offset of [0, 1]) {
      for (const name of PRAYER_NAMES) {
        const at = instant(name, offset)
        if (at && at.valueOf() > nowMs) {
          return {
            name,
            time: todayTimings.value[name],
            at: at.valueOf(),
            timeUntil: at.valueOf() - nowMs,
            isTomorrow: offset === 1
          }
        }
      }
    }
    return null
  })

  const currentPrayer = computed(() => {
    if (!todayTimings.value) return null
    const nowMs = now.value

    // Walk backwards from today's Isha through yesterday's Isha
    for (const offset of [0, -1]) {
      for (let i = PRAYER_NAMES.length - 1; i >= 0; i--) {
        const name = PRAYER_NAMES[i]
        const start = instant(name, offset)
        if (start && start.valueOf() <= nowMs) {
          const end = prayerEnd(name, offset)
          if (end && end.valueOf() > nowMs) {
            return {
              name,
              time: todayTimings.value[name],
              start: start.valueOf(),
              end: end.valueOf()
            }
          }
          // Latest started prayer has already ended (e.g. after Sunrise): no current prayer
          return null
        }
      }
    }
    return null
  })

  /** True when the location's calendar day has moved past the loaded data */
  const isStale = computed(() => {
    if (!dateInfo.value?.gregorian?.date) return false
    // touch `now` so this re-evaluates every tick
    void now.value
    return dateInfo.value.gregorian.date !== todayInTz(effectiveTimezone.value)
  })

  /** True when the location's timezone differs from the browser's */
  const isRemoteTimezone = computed(() => {
    if (!timezone.value) return false
    const probe = Date.now()
    return dayjs(probe).tz(timezone.value).utcOffset() !== dayjs(probe).utcOffset()
  })

  const isRamadan = computed(() => dateInfo.value?.hijri?.month?.number === 9)

  const ramadanDay = computed(() => {
    if (!isRamadan.value) return null
    return parseInt(dateInfo.value.hijri.day)
  })

  const ramadanLength = computed(() => {
    if (!isRamadan.value) return 30
    return parseInt(dateInfo.value.hijri.month.days) || 30
  })

  // Sehri ends at Imsak when provided, otherwise Fajr
  const sehriName = computed(() => (todayTimings.value?.Imsak ? 'Imsak' : 'Fajr'))
  const sehriTime = computed(() => todayTimings.value?.[sehriName.value] || null)
  const iftarTime = computed(() => todayTimings.value?.Maghrib || null)

  // ---------- actions ----------

  const settingsSignature = () => {
    const locationStore = useLocationStore()
    const settingsStore = useSettingsStore()
    return [
      locationStore.latitude,
      locationStore.longitude,
      settingsStore.calculationMethod,
      settingsStore.asrCalculation,
      settingsStore.hijriAdjustment
    ].join('|')
  }

  const fetchTodayPrayerTimes = async (_retry = false) => {
    const locationStore = useLocationStore()
    const settingsStore = useSettingsStore()

    if (!locationStore.hasLocation) {
      error.value = null
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const tz = locationStore.timezone || browserTimezone()
      const data = await getPrayerTimes(
        todayInTz(tz),
        locationStore.latitude,
        locationStore.longitude,
        settingsStore.calculationMethod,
        settingsStore.asrCalculation,
        settingsStore.hijriAdjustment
      )

      const apiTz = data.meta?.timezone || tz
      todayTimings.value = data.timings
      dateInfo.value = data.date
      timezone.value = apiTz
      lastUpdated.value = dayjs()

      if (apiTz !== locationStore.timezone) {
        locationStore.setTimezone(apiTz)
      }

      saveToLocalStorage()

      // We guessed the wrong calendar day for this location (timezone was unknown): refetch once
      if (!_retry && data.date.gregorian.date !== todayInTz(apiTz)) {
        await fetchTodayPrayerTimes(true)
      }
    } catch (err) {
      error.value = navigator.onLine === false
        ? 'You appear to be offline. Showing the last saved prayer times.'
        : (err.message || 'Failed to load prayer times')
      console.error('Error fetching prayer times:', err)
    } finally {
      isLoading.value = false
    }
  }

  const fetchMonthlyCalendar = async (year, month) => {
    const locationStore = useLocationStore()
    const settingsStore = useSettingsStore()

    if (!locationStore.hasLocation) return

    calendarLoading.value = true
    calendarError.value = null

    try {
      monthlyTimings.value = await getMonthlyCalendar(
        year,
        month,
        locationStore.latitude,
        locationStore.longitude,
        settingsStore.calculationMethod,
        settingsStore.asrCalculation,
        settingsStore.hijriAdjustment
      )
    } catch (err) {
      calendarError.value = err.message || 'Failed to load calendar'
      monthlyTimings.value = []
      console.error('Error fetching monthly calendar:', err)
    } finally {
      calendarLoading.value = false
    }
  }

  const saveToLocalStorage = () => {
    const data = {
      todayTimings: todayTimings.value,
      dateInfo: dateInfo.value,
      timezone: timezone.value,
      lastUpdated: lastUpdated.value?.toISOString(),
      signature: settingsSignature()
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('Could not save prayer times:', e)
    }
  }

  /**
   * Load cached times. Uses them only if they match the current location/settings
   * and are for today in the location's timezone; otherwise fetches fresh data
   * (keeping the cache on screen meanwhile).
   */
  const loadFromLocalStorage = async () => {
    const locationStore = useLocationStore()
    if (!locationStore.hasLocation) return

    let cached = null
    try {
      cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    } catch {
      cached = null
    }

    const sameSettings = cached?.signature === settingsSignature()
    if (cached?.todayTimings && sameSettings) {
      todayTimings.value = cached.todayTimings
      dateInfo.value = cached.dateInfo
      timezone.value = cached.timezone || null
      lastUpdated.value = cached.lastUpdated ? dayjs(cached.lastUpdated) : null

      const tz = cached.timezone || locationStore.timezone || browserTimezone()
      if (cached.dateInfo?.gregorian?.date === todayInTz(tz)) return
    }

    await fetchTodayPrayerTimes()
  }

  /** Clear today's data (e.g. when the location changes) */
  const reset = () => {
    todayTimings.value = null
    dateInfo.value = null
    timezone.value = null
    monthlyTimings.value = []
  }

  const formatTimeUntil = (milliseconds) => formatDuration(milliseconds)

  return {
    // State
    todayTimings,
    monthlyTimings,
    dateInfo,
    timezone,
    isLoading,
    error,
    calendarLoading,
    calendarError,
    lastUpdated,
    prayerNames,

    // Computed
    effectiveTimezone,
    nextPrayer,
    currentPrayer,
    isStale,
    isRemoteTimezone,
    isRamadan,
    ramadanDay,
    ramadanLength,
    sehriName,
    sehriTime,
    iftarTime,

    // Helpers
    instant,
    prayerEnd,

    // Actions
    fetchTodayPrayerTimes,
    fetchMonthlyCalendar,
    saveToLocalStorage,
    loadFromLocalStorage,
    reset,
    formatTimeUntil
  }
})
