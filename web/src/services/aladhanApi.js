/**
 * AlAdhan API Service
 * Handles all API calls to AlAdhan Prayer Times API
 */

const API_BASE_URL = 'https://api.aladhan.com/v1'

/**
 * Get prayer times for a specific date by coordinates
 */
export const getPrayerTimes = async (date, latitude, longitude, method = 3, school = 0, adjustment = 0) => {
  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      method,
      school,
      calendarMethod: 'MATHEMATICAL',
      adjustment: adjustment
    })
    
    const url = `${API_BASE_URL}/timings/${date}?${params}`
    console.log('Fetching prayer times with adjustment:', adjustment)
    console.log('Full API URL:', url)
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.code === 200) {
      console.log('Hijri date from API:', data.data.date.hijri)
      return data.data
    }
    throw new Error(data.status || 'Failed to fetch prayer times')
  } catch (error) {
    console.error('Error fetching prayer times:', error)
    throw error
  }
}

/**
 * Get prayer times by city name
 */
export const getPrayerTimesByCity = async (date, city, country, method = 3, school = 0, adjustment = 0) => {
  try {
    const params = new URLSearchParams({
      city,
      country,
      method,
      school,
      calendarMethod: 'MATHEMATICAL',
      adjustment: adjustment
    })
    
    const response = await fetch(`${API_BASE_URL}/timingsByCity/${date}?${params}`)
    const data = await response.json()
    
    if (data.code === 200) {
      return data.data
    }
    throw new Error(data.status || 'Failed to fetch prayer times')
  } catch (error) {
    console.error('Error fetching prayer times by city:', error)
    throw error
  }
}

/**
 * Get prayer times by address
 */
export const getPrayerTimesByAddress = async (date, address, method = 3, school = 0, adjustment = 0) => {
  try {
    const params = new URLSearchParams({
      address,
      method,
      school,
      calendarMethod: 'MATHEMATICAL',
      adjustment: adjustment
    })
    
    const response = await fetch(`${API_BASE_URL}/timingsByAddress/${date}?${params}`)
    const data = await response.json()
    
    if (data.code === 200) {
      return data.data
    }
    throw new Error(data.status || 'Failed to fetch prayer times')
  } catch (error) {
    console.error('Error fetching prayer times by address:', error)
    throw error
  }
}

/**
 * Get monthly calendar (all prayer times for a month)
 */
export const getMonthlyCalendar = async (year, month, latitude, longitude, method = 3, school = 0, adjustment = 0) => {
  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      method,
      school,
      calendarMethod: 'MATHEMATICAL',
      adjustment: adjustment
    })
    
    const response = await fetch(`${API_BASE_URL}/calendar/${year}/${month}?${params}`)
    const data = await response.json()
    
    if (data.code === 200) {
      return data.data
    }
    throw new Error(data.status || 'Failed to fetch monthly calendar')
  } catch (error) {
    console.error('Error fetching monthly calendar:', error)
    throw error
  }
}

/**
 * Get Hijri calendar for a specific month
 */
export const getHijriCalendar = async (year, month, latitude, longitude, method = 3, adjustment = 0) => {
  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      method,
      calendarMethod: 'MATHEMATICAL',
      adjustment: adjustment
    })
    
    const response = await fetch(`${API_BASE_URL}/hijriCalendar/${year}/${month}?${params}`)
    const data = await response.json()
    
    if (data.code === 200) {
      return data.data
    }
    throw new Error(data.status || 'Failed to fetch Hijri calendar')
  } catch (error) {
    console.error('Error fetching Hijri calendar:', error)
    throw error
  }
}

/**
 * Get calculation methods
 */
export const getCalculationMethods = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/methods`)
    const data = await response.json()
    
    if (data.code === 200) {
      return data.data
    }
    throw new Error(data.status || 'Failed to fetch calculation methods')
  } catch (error) {
    console.error('Error fetching calculation methods:', error)
    throw error
  }
}

/**
 * Get next prayer time
 */
export const getNextPrayer = async (date, latitude, longitude, method = 3) => {
  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      method
    })
    
    const response = await fetch(`${API_BASE_URL}/nextPrayer/${date}?${params}`)
    const data = await response.json()
    
    if (data.code === 200) {
      return data.data
    }
    throw new Error(data.status || 'Failed to fetch next prayer')
  } catch (error) {
    console.error('Error fetching next prayer:', error)
    throw error
  }
}
