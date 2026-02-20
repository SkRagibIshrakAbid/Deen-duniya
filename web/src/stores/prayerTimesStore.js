/**
 * Prayer Times Store
 * Manages prayer times data and calculations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { getPrayerTimes, getMonthlyCalendar } from '../services/aladhanApi'
import { useLocationStore } from './locationStore'
import { useSettingsStore } from './settingsStore'

export const usePrayerTimesStore = defineStore('prayerTimes', () => {
  // State
  const todayTimings = ref(null)
  const monthlyTimings = ref([])
  const dateInfo = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)

  // Prayer names mapping
  const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

  // Computed
  const nextPrayer = computed(() => {
    if (!todayTimings.value) return null

    const now = dayjs()
    const timings = todayTimings.value

    for (const prayerName of prayerNames) {
      if (timings[prayerName]) {
        const prayerTime = dayjs(`${now.format('YYYY-MM-DD')} ${timings[prayerName]}`, 'YYYY-MM-DD HH:mm')
        
        if (prayerTime.isAfter(now)) {
          return {
            name: prayerName,
            time: timings[prayerName],
            timeUntil: prayerTime.diff(now)
          }
        }
      }
    }

    // If no prayer is remaining today, return Fajr of tomorrow
    const tomorrow = now.add(1, 'day')
    const fajrTime = dayjs(`${tomorrow.format('YYYY-MM-DD')} ${timings.Fajr}`, 'YYYY-MM-DD HH:mm')
    
    return {
      name: 'Fajr',
      time: timings.Fajr,
      timeUntil: fajrTime.diff(now),
      isTomorrow: true
    }
  })

  const currentPrayer = computed(() => {
    if (!todayTimings.value) return null

    const now = dayjs()
    const timings = todayTimings.value

    let currentPrayer = null

    for (let i = prayerNames.length - 1; i >= 0; i--) {
      const prayerName = prayerNames[i]
      if (timings[prayerName]) {
        const prayerTime = dayjs(`${now.format('YYYY-MM-DD')} ${timings[prayerName]}`, 'YYYY-MM-DD HH:mm')
        
        if (prayerTime.isBefore(now)) {
          currentPrayer = {
            name: prayerName,
            time: timings[prayerName]
          }
          break
        }
      }
    }

    return currentPrayer
  })

  const isRamadan = computed(() => {
    if (!dateInfo.value?.hijri) return false
    return dateInfo.value.hijri.month.number === 9
  })

  const ramadanDay = computed(() => {
    if (!isRamadan.value || !dateInfo.value?.hijri) return null
    return parseInt(dateInfo.value.hijri.day)
  })

  const sehriTime = computed(() => {
    if (!todayTimings.value) return null
    // Sehri ends at Fajr time (technically at Imsak, but we'll use Fajr)
    return todayTimings.value.Imsak || todayTimings.value.Fajr
  })

  const iftarTime = computed(() => {
    if (!todayTimings.value) return null
    return todayTimings.value.Maghrib
  })

  // Actions
  const fetchTodayPrayerTimes = async () => {
    const locationStore = useLocationStore()
    const settingsStore = useSettingsStore()

    if (!locationStore.hasLocation) {
      error.value = 'Location not set'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const today = dayjs().format('DD-MM-YYYY')
      console.log('Fetching prayer times with hijri adjustment:', settingsStore.hijriAdjustment)
      const data = await getPrayerTimes(
        today,
        locationStore.latitude,
        locationStore.longitude,
        settingsStore.calculationMethod,
        settingsStore.asrCalculation,
        settingsStore.hijriAdjustment
      )

      todayTimings.value = data.timings
      dateInfo.value = data.date
      lastUpdated.value = dayjs()
      
      console.log('Prayer times fetched successfully')
      console.log('Hijri date from store:', dateInfo.value.hijri)
      console.log('Is Ramadan:', dateInfo.value.hijri.month.number === 9)
      console.log('Ramadan day:', dateInfo.value.hijri.day)

      // Save to localStorage
      saveToLocalStorage()
    } catch (err) {
      error.value = err.message
      console.error('Error fetching prayer times:', err)
    } finally {
      isLoading.value = false
    }
  }

  const fetchMonthlyCalendar = async (year, month) => {
    const locationStore = useLocationStore()
    const settingsStore = useSettingsStore()

    if (!locationStore.hasLocation) {
      error.value = 'Location not set'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const data = await getMonthlyCalendar(
        year,
        month,
        locationStore.latitude,
        locationStore.longitude,
        settingsStore.calculationMethod,
        settingsStore.asrCalculation,
        settingsStore.hijriAdjustment
      )

      monthlyTimings.value = data
    } catch (err) {
      error.value = err.message
      console.error('Error fetching monthly calendar:', err)
    } finally {
      isLoading.value = false
    }
  }

  const saveToLocalStorage = () => {
    const data = {
      todayTimings: todayTimings.value,
      dateInfo: dateInfo.value,
      lastUpdated: lastUpdated.value?.toISOString(),
      hijriAdjustment: useSettingsStore().hijriAdjustment
    }
    localStorage.setItem('deen-duniya-prayer-times', JSON.stringify(data))
  }

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('deen-duniya-prayer-times')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        const settingsStore = useSettingsStore()
        
        // Check if data is from today
        const savedDate = dayjs(data.lastUpdated)
        const now = dayjs()
        
        // Check if hijri adjustment has changed
        const adjustmentChanged = data.hijriAdjustment !== undefined && 
                                  data.hijriAdjustment !== settingsStore.hijriAdjustment
        
        if (savedDate.isSame(now, 'day') && !adjustmentChanged) {
          todayTimings.value = data.todayTimings
          dateInfo.value = data.dateInfo
          lastUpdated.value = savedDate
          console.log('Using cached prayer times')
        } else {
          // Data is stale or adjustment changed, fetch fresh data
          if (adjustmentChanged) {
            console.log('Hijri adjustment changed, fetching fresh data')
          }
          fetchTodayPrayerTimes()
        }
      } catch (error) {
        console.error('Error loading prayer times from localStorage:', error)
        fetchTodayPrayerTimes()
      }
    }
  }

  const getTimeUntilPrayer = (prayerName) => {
    if (!todayTimings.value || !todayTimings.value[prayerName]) return null

    const now = dayjs()
    const prayerTime = dayjs(`${now.format('YYYY-MM-DD')} ${todayTimings.value[prayerName]}`, 'YYYY-MM-DD HH:mm')

    return prayerTime.diff(now)
  }

  const formatTimeUntil = (milliseconds) => {
    if (milliseconds <= 0) return 'Now'

    const duration = dayjs.duration(milliseconds)
    const hours = Math.floor(duration.asHours())
    const minutes = duration.minutes()
    const seconds = duration.seconds()

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  return {
    // State
    todayTimings,
    monthlyTimings,
    dateInfo,
    isLoading,
    error,
    lastUpdated,
    prayerNames,
    
    // Computed
    nextPrayer,
    currentPrayer,
    isRamadan,
    ramadanDay,
    sehriTime,
    iftarTime,
    
    // Actions
    fetchTodayPrayerTimes,
    fetchMonthlyCalendar,
    saveToLocalStorage,
    loadFromLocalStorage,
    getTimeUntilPrayer,
    formatTimeUntil
  }
})
