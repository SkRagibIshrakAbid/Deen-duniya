/**
 * Common cities with coordinates for location selection
 */

export const popularCities = [
  // Middle East
  { name: 'Mecca', country: 'Saudi Arabia', lat: 21.4225, lon: 39.8262 },
  { name: 'Medina', country: 'Saudi Arabia', lat: 24.4672, lon: 39.6111 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753 },
  { name: 'Jeddah', country: 'Saudi Arabia', lat: 21.2854, lon: 39.2376 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708 },
  { name: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lon: 54.3773 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lon: 51.5310 },
  { name: 'Kuwait City', country: 'Kuwait', lat: 29.3759, lon: 47.9774 },
  { name: 'Muscat', country: 'Oman', lat: 23.5880, lon: 58.3829 },
  { name: 'Manama', country: 'Bahrain', lat: 26.0667, lon: 50.5577 },
  { name: 'Jerusalem', country: 'Palestine', lat: 31.7683, lon: 35.2137 },
  { name: 'Amman', country: 'Jordan', lat: 31.9454, lon: 35.9284 },
  { name: 'Beirut', country: 'Lebanon', lat: 33.8886, lon: 35.4955 },
  { name: 'Damascus', country: 'Syria', lat: 33.5138, lon: 36.2765 },
  { name: 'Baghdad', country: 'Iraq', lat: 33.3152, lon: 44.3661 },
  { name: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890 },
  { name: 'Ankara', country: 'Turkey', lat: 39.9334, lon: 32.8597 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784 },

  // North Africa
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
  { name: 'Alexandria', country: 'Egypt', lat: 31.2001, lon: 29.9187 },
  { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lon: -7.5898 },
  { name: 'Rabat', country: 'Morocco', lat: 34.0209, lon: -6.8416 },
  { name: 'Algiers', country: 'Algeria', lat: 36.7538, lon: 3.0588 },
  { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815 },
  { name: 'Tripoli', country: 'Libya', lat: 32.8872, lon: 13.1913 },
  { name: 'Khartoum', country: 'Sudan', lat: 15.5007, lon: 32.5599 },

  // South Asia
  { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lon: 67.0011 },
  { name: 'Lahore', country: 'Pakistan', lat: 31.5204, lon: 74.3587 },
  { name: 'Islamabad', country: 'Pakistan', lat: 33.6844, lon: 73.0479 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lon: 90.4125 },
  { name: 'Delhi', country: 'India', lat: 28.7041, lon: 77.1025 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lon: 88.3639 },
  { name: 'Hyderabad', country: 'India', lat: 17.3850, lon: 78.4867 },
  
  // Southeast Asia
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456 },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lon: 101.6869 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Brunei', country: 'Brunei', lat: 4.9031, lon: 114.9398 },

  // Europe
  { name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lon: 4.3517 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lon: 18.0686 },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.6761, lon: 12.5683 },

  // North America
  { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lon: -118.2437 },
  { name: 'Chicago', country: 'USA', lat: 41.8781, lon: -87.6298 },
  { name: 'Houston', country: 'USA', lat: 29.7604, lon: -95.3698 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lon: -73.5673 },

  // Central Asia
  { name: 'Tashkent', country: 'Uzbekistan', lat: 41.2995, lon: 69.2401 },
  { name: 'Almaty', country: 'Kazakhstan', lat: 43.2220, lon: 76.8512 },
  { name: 'Bishkek', country: 'Kyrgyzstan', lat: 42.8746, lon: 74.5698 },

  // Africa
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2864, lon: 36.8172 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241 }
]

/**
 * Search cities by name
 */
export const searchCities = (query) => {
  const lowerQuery = query.toLowerCase()
  return popularCities.filter(city => 
    city.name.toLowerCase().includes(lowerQuery) || 
    city.country.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get city by name
 */
export const getCityByName = (name) => {
  return popularCities.find(city => city.name.toLowerCase() === name.toLowerCase())
}
