/**
 * Notification Service
 * Manages browser notifications for prayer times and Ramadan events
 */

import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

class NotificationService {
  constructor() {
    this.scheduledNotifications = new Map()
    this.checkInterval = null
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
   * Schedule notifications for prayer times
   */
  schedulePrayerNotifications(prayerTimings, settings, isRamadan = false) {
    // Clear existing scheduled notifications
    this.clearScheduledNotifications()

    if (!settings.notificationsEnabled || Notification.permission !== 'granted') {
      return
    }

    const now = dayjs()
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

    prayers.forEach(prayerName => {
      if (!prayerTimings[prayerName]) return

      const prayerEnabled = settings[`notify${prayerName}`]
      if (!prayerEnabled) return

      // Parse prayer time
      const [hours, minutes] = prayerTimings[prayerName].split(':')
      const prayerTime = now.clone().hour(parseInt(hours)).minute(parseInt(minutes)).second(0)

      // If prayer time has passed today, skip
      if (prayerTime.isBefore(now)) return

      // Schedule "before prayer" notification
      if (settings.notifyBeforePrayer) {
        const beforeTime = prayerTime.subtract(settings.notifyBeforeMinutes, 'minutes')
        if (beforeTime.isAfter(now)) {
          const timeoutId = setTimeout(() => {
            this.show(`${prayerName} prayer in ${settings.notifyBeforeMinutes} minutes`, {
              body: `Time to prepare for ${prayerName} prayer`,
              tag: `${prayerName}-before`,
              icon: '/prayer-icon.png'
            })
          }, beforeTime.diff(now))

          this.scheduledNotifications.set(`${prayerName}-before`, timeoutId)
        }
      }

      // Schedule "at prayer time" notification
      if (settings.notifyAtPrayer) {
        const timeoutId = setTimeout(() => {
          const body = isRamadan && prayerName === 'Maghrib' 
            ? 'It\'s time for Maghrib prayer and Iftar!' 
            : `It's time for ${prayerName} prayer`
          
          this.show(`${prayerName} - ${prayerTimings[prayerName]}`, {
            body,
            tag: prayerName,
            icon: '/prayer-icon.png',
            requireInteraction: true
          })
        }, prayerTime.diff(now))

        this.scheduledNotifications.set(prayerName, timeoutId)
      }
    })

    // Schedule Ramadan-specific notifications
    if (isRamadan && settings.notifyRamadan) {
      // Sehri notification (at Imsak/Fajr time)
      if (settings.notifyRamadanSehri && prayerTimings.Imsak) {
        const [hours, minutes] = prayerTimings.Imsak.split(':')
        const sehriTime = now.clone().hour(parseInt(hours)).minute(parseInt(minutes)).second(0)

        if (sehriTime.isAfter(now)) {
          // Notify 15 minutes before Sehri ends
          const beforeSehri = sehriTime.subtract(15, 'minutes')
          if (beforeSehri.isAfter(now)) {
            const timeoutId = setTimeout(() => {
              this.show('Sehri Time Ending Soon', {
                body: 'Sehri (Suhoor) ends in 15 minutes',
                tag: 'sehri-reminder',
                icon: '/ramadan-icon.png',
                requireInteraction: true
              })
            }, beforeSehri.diff(now))

            this.scheduledNotifications.set('sehri-before', timeoutId)
          }

          // Notify at Sehri end time
          const timeoutId = setTimeout(() => {
            this.show('Sehri Time Ended', {
              body: 'Sehri (Suhoor) time has ended. Fast begins now.',
              tag: 'sehri-end',
              icon: '/ramadan-icon.png',
              requireInteraction: true
            })
          }, sehriTime.diff(now))

          this.scheduledNotifications.set('sehri-end', timeoutId)
        }
      }

      // Iftar notification (at Maghrib time) - already covered above but with special message
      if (settings.notifyRamadanIftar && prayerTimings.Maghrib) {
        const [hours, minutes] = prayerTimings.Maghrib.split(':')
        const iftarTime = now.clone().hour(parseInt(hours)).minute(parseInt(minutes)).second(0)

        if (iftarTime.isAfter(now)) {
          // Notify 5 minutes before Iftar
          const beforeIftar = iftarTime.subtract(5, 'minutes')
          if (beforeIftar.isAfter(now)) {
            const timeoutId = setTimeout(() => {
              this.show('Iftar Time Approaching', {
                body: 'Get ready to break your fast in 5 minutes',
                tag: 'iftar-reminder',
                icon: '/ramadan-icon.png',
                requireInteraction: true
              })
            }, beforeIftar.diff(now))

            this.scheduledNotifications.set('iftar-before', timeoutId)
          }
        }
      }
    }
  }

  /**
   * Clear all scheduled notifications
   */
  clearScheduledNotifications() {
    this.scheduledNotifications.forEach(timeoutId => clearTimeout(timeoutId))
    this.scheduledNotifications.clear()
  }

  /**
   * Start checking for prayer times and scheduling notifications
   */
  startNotificationLoop(getPrayerData, settings) {
    // Check every minute
    this.checkInterval = setInterval(() => {
      const data = getPrayerData()
      if (data.timings) {
        this.schedulePrayerNotifications(data.timings, settings, data.isRamadan)
      }
    }, 60000) // Check every minute

    // Schedule immediately
    const data = getPrayerData()
    if (data.timings) {
      this.schedulePrayerNotifications(data.timings, settings, data.isRamadan)
    }
  }

  /**
   * Stop the notification loop
   */
  stopNotificationLoop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.clearScheduledNotifications()
  }

  /**
   * Show a test notification
   */
  showTestNotification() {
    this.show('Prayer Time Notifications Enabled', {
      body: 'You will receive notifications for prayer times',
      tag: 'test',
      icon: '/prayer-icon.png'
    })
  }
}

export default new NotificationService()
