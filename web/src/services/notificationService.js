/**
 * Notification Service
 * Manages browser notifications for prayer times and Ramadan events
 * Uses Service Worker for persistent notifications
 */

import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

class NotificationService {
  constructor() {
    this.registration = null
  }

  /**
   * Set Service Worker registration
   */
  setServiceWorkerRegistration(registration) {
    this.registration = registration
  }

  /**
   * Check if Service Worker is available and ready
   */
  isServiceWorkerReady() {
    return !!(this.registration && this.registration.active)
  }

  /**
   * Send message to Service Worker
   */
  async sendMessageToServiceWorker(message) {
    if (!this.isServiceWorkerReady()) {
      console.warn('Service Worker not ready, waiting for registration...')
      // Wait for Service Worker to be ready
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        this.setServiceWorkerRegistration(registration)
      } else {
        console.error('Service Worker not supported')
        return false
      }
    }

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message)
      return true
    } else {
      console.error('No active Service Worker controller')
      return false
    }
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  /**
   * Show a notification
   */
  show(title, options = {}) {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications')
      return null
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return null
    }

    const defaultOptions = {
      icon: '/icon.png',
      badge: '/badge.png',
      requireInteraction: false,
      silent: false,
      ...options
    }

    return new Notification(title, defaultOptions)
  }

  /**
   * Schedule notifications for prayer times using Service Worker
   */
  async schedulePrayerNotifications(prayerTimings, settings, isRamadan = false) {
    if (!settings.notificationsEnabled || Notification.permission !== 'granted') {
      // Clear notifications if disabled
      await this.clearScheduledNotifications()
      return
    }

    // Send schedule message to Service Worker
    const success = await this.sendMessageToServiceWorker({
      type: 'SCHEDULE_NOTIFICATIONS',
      payload: {
        prayerTimings,
        settings,
        isRamadan
      }
    })

    if (!success) {
      console.error('Failed to schedule notifications via Service Worker')
    }
  }

  /**
   * Clear all scheduled notifications via Service Worker
   */
  async clearScheduledNotifications() {
    await this.sendMessageToServiceWorker({
      type: 'CLEAR_NOTIFICATIONS'
    })
  }

  /**
   * Show a test notification via Service Worker
   */
  async showTestNotification() {
    await this.sendMessageToServiceWorker({
      type: 'SHOW_TEST_NOTIFICATION'
    })
  }
}

export default new NotificationService()
