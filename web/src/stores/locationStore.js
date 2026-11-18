/**
 * Location Store
 * Manages the user's chosen location.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'deen-duniya-location'

export const useLocationStore = defineStore('location', () => {
  // State
  const latitude = ref(null)
  const longitude = ref(null)
  const city = ref('')
  const country = ref('')
  const timezone = ref('') // IANA timezone of the location (from geocoder or prayer API)
  const locationType = ref('auto') // 'auto', 'manual', 'city'

  // Computed
  const hasLocation = computed(() => latitude.value !== null && longitude.value !== null)

  const locationDisplay = computed(() => {
    if (city.value && country.value) return `${city.value}, ${country.value}`
    if (city.value) return city.value
    if (hasLocation.value) {
      return `${Number(latitude.value).toFixed(4)}, ${Number(longitude.value).toFixed(4)}`
    }
    return 'Location not set'
  })

  // Actions

  /**
   * Ask the browser for the current position. Does NOT save anything;
   * the caller decides whether to commit it with setLocation().
   */
  const requestGeolocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          const messages = {
            1: 'Location permission denied. Allow location access in your browser, or pick a city instead.',
            2: 'Location information is unavailable.',
            3: 'Location request timed out.'
          }
          reject(new Error(messages[error.code] || 'An unknown error occurred'))
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
      )
    })
  }

  /**
   * Commit a location.
   */
  const setLocation = ({ lat, lon, cityName = '', countryName = '', tz = '', type = 'manual' }) => {
    latitude.value = Number(lat)
    longitude.value = Number(lon)
    city.value = cityName || ''
    country.value = countryName || ''
    timezone.value = tz || ''
    locationType.value = type
    saveToLocalStorage()
  }

  const setTimezone = (tz) => {
    timezone.value = tz || ''
    saveToLocalStorage()
  }

  const saveToLocalStorage = () => {
    const locationData = {
      latitude: latitude.value,
      longitude: longitude.value,
      city: city.value,
      country: country.value,
      timezone: timezone.value,
      locationType: locationType.value
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locationData))
    } catch (e) {
      console.warn('Could not save location:', e)
    }
  }

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const data = JSON.parse(saved)
      latitude.value = data.latitude ?? null
      longitude.value = data.longitude ?? null
      city.value = data.city || ''
      country.value = data.country || ''
      timezone.value = data.timezone || ''
      locationType.value = data.locationType || 'manual'
    } catch (error) {
      console.error('Error loading location from localStorage:', error)
    }
  }

  const clearLocation = () => {
    latitude.value = null
    longitude.value = null
    city.value = ''
    country.value = ''
    timezone.value = ''
    locationType.value = 'auto'
    localStorage.removeItem(STORAGE_KEY)
  }

  // Initialize
  loadFromLocalStorage()

  return {
    latitude,
    longitude,
    city,
    country,
    timezone,
    locationType,
    hasLocation,
    locationDisplay,
    requestGeolocation,
    setLocation,
    setTimezone,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocation
  }
})
