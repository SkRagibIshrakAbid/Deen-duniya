/**
 * Geocoding Service
 * - Forward search: Open-Meteo geocoding API (free, no key, sends only the search text)
 * - Reverse lookup: BigDataCloud client-side reverse geocoding (free, no key)
 */

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

/**
 * Search cities worldwide.
 * Returns [{ name, country, region, lat, lon, timezone }]
 */
export const searchPlaces = async (query, { signal } = {}) => {
  const params = new URLSearchParams({ name: query, count: '15', language: 'en', format: 'json' })
  const response = await fetch(`${SEARCH_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`City search failed (${response.status})`)
  const data = await response.json()
  return (data.results || []).map((r) => ({
    name: r.name,
    country: r.country || '',
    region: r.admin1 || '',
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone || ''
  }))
}

/**
 * Find a human-readable name for coordinates.
 * Returns { city, country } (empty strings if unknown). Never throws.
 */
export const reverseGeocode = async (lat, lon) => {
  try {
    const params = new URLSearchParams({ latitude: lat, longitude: lon, localityLanguage: 'en' })
    const response = await fetch(`${REVERSE_URL}?${params}`)
    if (!response.ok) return { city: '', country: '' }
    const data = await response.json()
    return {
      city: data.city || data.locality || data.principalSubdivision || '',
      country: data.countryName || ''
    }
  } catch {
    return { city: '', country: '' }
  }
}
