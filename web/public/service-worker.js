/**
 * Service Worker for Deen Duniya
 *
 * - Displays notifications requested by the page and focuses the app on click.
 *   (Reminder scheduling lives in the page: browsers terminate idle service
 *   workers, so timers here are unreliable.)
 * - Offline support: network-first for pages, cache-first for hashed build assets.
 *
 * Bump CACHE_VERSION when this file's caching logic changes.
 */

const CACHE_VERSION = 'v3'
const CACHE_NAME = `deen-duniya-${CACHE_VERSION}`
const APP_SHELL = ['/', '/index.html', '/moon-favicon.svg', '/icon-192.svg', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // API calls etc. go straight to the network

  // Pages: network first so a new deploy is picked up immediately, cache as offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    )
    return
  }

  // Hashed build assets and Earth textures never change: cache first
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/textures/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
      })
    )
    return
  }

  // Everything else: network, falling back to cache
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    })
  )
})
