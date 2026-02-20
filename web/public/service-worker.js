/**
 * Service Worker for Deen Duniya
 * Handles persistent background notifications and offline caching
 */

const CACHE_NAME = 'deen-duniya-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/moon-favicon.svg'
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell')
        return cache.addAll(urlsToCache)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag)
  event.notification.close()

  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
  )
})

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data)

  if (event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const { prayerTimings, settings, isRamadan } = event.data.payload
    scheduleNotifications(prayerTimings, settings, isRamadan)
  }

  if (event.data.type === 'CLEAR_NOTIFICATIONS') {
    clearAllNotifications()
  }

  if (event.data.type === 'SHOW_TEST_NOTIFICATION') {
    showNotification('Prayer Time Notifications Enabled', {
      body: 'You will receive notifications for prayer times',
      icon: '/moon-favicon.svg',
      badge: '/moon-favicon.svg',
      tag: 'test'
    })
  }
})

// Store for scheduled alarms
let notificationTimers = new Map()

function scheduleNotifications(prayerTimings, settings, isRamadan) {
  console.log('[Service Worker] Scheduling notifications', { prayerTimings, settings, isRamadan })
  
  // Clear existing timers
  clearAllNotifications()

  if (!settings.notificationsEnabled) {
    return
  }

  const now = Date.now()
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

  prayers.forEach(prayerName => {
    if (!prayerTimings[prayerName]) return

    const prayerEnabled = settings[`notify${prayerName}`]
    if (!prayerEnabled) return

    // Parse prayer time
    const [hours, minutes] = prayerTimings[prayerName].split(':')
    const prayerTime = new Date()
    prayerTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    // If prayer time has already passed today, schedule for tomorrow
    if (prayerTime.getTime() < now) {
      prayerTime.setDate(prayerTime.getDate() + 1)
    }

    // Schedule "before prayer" notification
    if (settings.notifyBeforePrayer) {
      const beforeTime = new Date(prayerTime.getTime() - settings.notifyBeforeMinutes * 60000)
      if (beforeTime.getTime() > now) {
        const timeoutId = setTimeout(() => {
          showNotification(`${prayerName} prayer in ${settings.notifyBeforeMinutes} minutes`, {
            body: `Time to prepare for ${prayerName} prayer`,
            icon: '/moon-favicon.svg',
            badge: '/moon-favicon.svg',
            tag: `${prayerName}-before`,
            requireInteraction: false
          })
        }, beforeTime.getTime() - now)

        notificationTimers.set(`${prayerName}-before`, timeoutId)
      }
    }

    // Schedule "at prayer time" notification
    if (settings.notifyAtPrayer) {
      const delay = prayerTime.getTime() - now
      if (delay > 0) {
        const body = isRamadan && prayerName === 'Maghrib' 
          ? 'It\'s time for Maghrib prayer and Iftar!' 
          : `It's time for ${prayerName} prayer`
        
        const timeoutId = setTimeout(() => {
          showNotification(`${prayerName} - ${prayerTimings[prayerName]}`, {
            body,
            icon: '/moon-favicon.svg',
            badge: '/moon-favicon.svg',
            tag: prayerName,
            requireInteraction: true,
            vibrate: [200, 100, 200]
          })
        }, delay)

        notificationTimers.set(prayerName, timeoutId)
      }
    }

    // Schedule "prayer ending" notification
    if (settings.notifyPrayerEnd && settings.notifyPrayerEndMinutes > 0) {
      // Get next prayer time to calculate end of current prayer
      const prayerIndex = prayers.indexOf(prayerName)
      const nextPrayerName = prayers[prayerIndex + 1]
      
      if (nextPrayerName && prayerTimings[nextPrayerName]) {
        const [nextHours, nextMinutes] = prayerTimings[nextPrayerName].split(':')
        const nextPrayerTime = new Date()
        nextPrayerTime.setHours(parseInt(nextHours), parseInt(nextMinutes), 0, 0)
        
        if (nextPrayerTime.getTime() < now) {
          nextPrayerTime.setDate(nextPrayerTime.getDate() + 1)
        }

        const endWarningTime = new Date(nextPrayerTime.getTime() - settings.notifyPrayerEndMinutes * 60000)
        
        if (endWarningTime.getTime() > now && endWarningTime.getTime() > prayerTime.getTime()) {
          const timeoutId = setTimeout(() => {
            showNotification(`${prayerName} prayer ending soon`, {
              body: `${prayerName} prayer time ends in ${settings.notifyPrayerEndMinutes} minutes`,
              icon: '/moon-favicon.svg',
              badge: '/moon-favicon.svg',
              tag: `${prayerName}-ending`,
              requireInteraction: false
            })
          }, endWarningTime.getTime() - now)

          notificationTimers.set(`${prayerName}-ending`, timeoutId)
        }
      }
    }
  })

  // Schedule Ramadan-specific notifications
  if (isRamadan && settings.notifyRamadan) {
    // Sehri notification (before Fajr)
    if (settings.notifyRamadanSehri && prayerTimings.Fajr) {
      const [hours, minutes] = prayerTimings.Fajr.split(':')
      const fajrTime = new Date()
      fajrTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      if (fajrTime.getTime() < now) {
        fajrTime.setDate(fajrTime.getDate() + 1)
      }

      // Notify 15 minutes before Sehri ends (Fajr time)
      const sehriWarning = new Date(fajrTime.getTime() - 15 * 60000)
      if (sehriWarning.getTime() > now) {
        const timeoutId = setTimeout(() => {
          showNotification('Sehri Time Ending Soon', {
            body: 'Sehri (Suhoor) ends in 15 minutes',
            icon: '/moon-favicon.svg',
            badge: '/moon-favicon.svg',
            tag: 'sehri-warning',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
          })
        }, sehriWarning.getTime() - now)

        notificationTimers.set('sehri-warning', timeoutId)
      }

      // Notify at Sehri end time (Fajr)
      const delay = fajrTime.getTime() - now
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          showNotification('Sehri Time Ended', {
            body: 'Sehri (Suhoor) time has ended. Fast begins now.',
            icon: '/moon-favicon.svg',
            badge: '/moon-favicon.svg',
            tag: 'sehri-end',
            requireInteraction: true
          })
        }, delay)

        notificationTimers.set('sehri-end', timeoutId)
      }
    }

    // Iftar notification (before Maghrib)
    if (settings.notifyRamadanIftar && prayerTimings.Maghrib) {
      const [hours, minutes] = prayerTimings.Maghrib.split(':')
      const maghribTime = new Date()
      maghribTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      if (maghribTime.getTime() < now) {
        maghribTime.setDate(maghribTime.getDate() + 1)
      }

      // Notify 5 minutes before Iftar
      const iftarWarning = new Date(maghribTime.getTime() - 5 * 60000)
      if (iftarWarning.getTime() > now) {
        const timeoutId = setTimeout(() => {
          showNotification('Iftar Time Approaching', {
            body: 'Get ready to break your fast in 5 minutes',
            icon: '/moon-favicon.svg',
            badge: '/moon-favicon.svg',
            tag: 'iftar-warning',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
          })
        }, iftarWarning.getTime() - now)

        notificationTimers.set('iftar-warning', timeoutId)
      }
    }
  }

  console.log(`[Service Worker] Scheduled ${notificationTimers.size} notifications`)
}

function showNotification(title, options) {
  return self.registration.showNotification(title, {
    icon: '/moon-favicon.svg',
    badge: '/moon-favicon.svg',
    ...options
  })
}

function clearAllNotifications() {
  notificationTimers.forEach(timerId => clearTimeout(timerId))
  notificationTimers.clear()
  console.log('[Service Worker] Cleared all notification timers')
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-prayer-times') {
    event.waitUntil(updatePrayerTimes())
  }
})

async function updatePrayerTimes() {
  // This would fetch updated prayer times from the API
  // For now, we'll just log
  console.log('[Service Worker] Periodic sync triggered')
}
