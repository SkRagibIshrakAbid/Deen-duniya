/**
 * Location Store
 * Manages user location and geolocation
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLocationStore = defineStore('location', () => {
  // State
  const latitude = ref(null)
  const longitude = ref(null)
  const city = ref('')
  const country = ref('')
  const timezone = ref('')
  const locationType = ref('auto') // 'auto', 'manual', 'city'
  const isLoadingLocation = ref(false)
  const locationError = ref(null)
  const userPermittedLocation = ref(false)

  // Computed
  const hasLocation = computed(() => latitude.value !== null && longitude.value !== null)
  const locationDisplay = computed(() => {
    if (city.value && country.value) {
      return `${city.value}, ${country.value}`
    }
    if (latitude.value && longitude.value) {
      return `${latitude.value.toFixed(4)}, ${longitude.value.toFixed(4)}`
    }
    return 'Location not set'
  })

  // Actions
  const requestGeolocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        locationError.value = 'Geolocation is not supported by your browser'
        reject(new Error('Geolocation not supported'))
        return
      }

      isLoadingLocation.value = true
      locationError.value = null

      navigator.geolocation.getCurrentPosition(
        (position) => {
          latitude.value = position.coords.latitude
          longitude.value = position.coords.longitude
          locationType.value = 'auto'
          userPermittedLocation.value = true
          isLoadingLocation.value = false
          
          // Try to get timezone from coordinates
          getTimezoneFromCoordinates()
          
          // Save to localStorage
          saveToLocalStorage()
          resolve({ latitude: latitude.value, longitude: longitude.value })
        },
        (error) => {
          isLoadingLocation.value = false
          userPermittedLocation.value = false
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              locationError.value = 'Location permission denied'
              break
            case error.POSITION_UNAVAILABLE:
              locationError.value = 'Location information unavailable'
              break
            case error.TIMEOUT:
              locationError.value = 'Location request timed out'
              break
            default:
              locationError.value = 'An unknown error occurred'
          }
          
          reject(error)
        }
      )
    })
  }

  const setManualLocation = (lat, lon, cityName = '', countryName = '') => {
    latitude.value = lat
    longitude.value = lon
    city.value = cityName
    country.value = countryName
    locationType.value = 'manual'
    locationError.value = null
    
    getTimezoneFromCoordinates()
    saveToLocalStorage()
  }

  const setCityLocation = (cityName, countryName, lat, lon) => {
    city.value = cityName
    country.value = countryName
    latitude.value = lat
    longitude.value = lon
    locationType.value = 'city'
    locationError.value = null
    
    getTimezoneFromCoordinates()
    saveToLocalStorage()
  }

  const getTimezoneFromCoordinates = () => {
    // Use Intl.DateTimeFormat to get the user's timezone
    timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  const saveToLocalStorage = () => {
    const locationData = {
      latitude: latitude.value,
      longitude: longitude.value,
      city: city.value,
      country: country.value,
      timezone: timezone.value,
      locationType: locationType.value,
      userPermittedLocation: userPermittedLocation.value
    }
    localStorage.setItem('deen-duniya-location', JSON.stringify(locationData))
  }

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('deen-duniya-location')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        latitude.value = data.latitude
        longitude.value = data.longitude
        city.value = data.city || ''
        country.value = data.country || ''
        timezone.value = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        locationType.value = data.locationType || 'manual'
        userPermittedLocation.value = data.userPermittedLocation || false
      } catch (error) {
        console.error('Error loading location from localStorage:', error)
      }
    }
  }

  const clearLocation = () => {
    latitude.value = null
    longitude.value = null
    city.value = ''
    country.value = ''
    timezone.value = ''
    locationType.value = 'auto'
    locationError.value = null
    userPermittedLocation.value = false
    localStorage.removeItem('deen-duniya-location')
  }

  // Initialize
  loadFromLocalStorage()

  return {
    // State
    latitude,
    longitude,
    city,
    country,
    timezone,
    locationType,
    isLoadingLocation,
    locationError,
    userPermittedLocation,
    
    // Computed
    hasLocation,
    locationDisplay,
    
    // Actions
    requestGeolocation,
    setManualLocation,
    setCityLocation,
    getTimezoneFromCoordinates,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocation
  }
})
