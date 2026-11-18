/**
 * Notification Service
 *
 * Builds a list of upcoming prayer/Ramadan reminders and fires them from the
 * page itself. A short polling loop (instead of long setTimeouts in the
 * service worker, which browsers kill after ~30s idle) makes this survive tab
 * throttling and device sleep. The service worker is only used to *display*
 * notifications (required on Android) and to handle clicks.
 *
 * Limitation of the web platform: reminders fire while the app is open in a
 * tab or running as an installed PWA. Alerts with the browser fully closed
 * would need server push (planned for the desktop app).
 */

const FIRED_KEY = 'deen-duniya-fired-notifications'
const CHECK_INTERVAL_MS = 15000
const LATE_GRACE_MS = 10 * 60 * 1000 // still show a reminder up to 10 min late (e.g. after waking from sleep)
const ICON = '/icon-192.svg'
const BADGE = '/moon-favicon.svg'
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

class NotificationService {
  constructor() {
    this.registration = null
    this.events = []
    this.soundEnabled = true
    this.timer = null
    this.audioCtx = null
  }

  // ---------- setup ----------

  setServiceWorkerRegistration(registration) {
    this.registration = registration
  }

  get isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  get permission() {
    return this.isSupported ? Notification.permission : 'unsupported'
  }

  async requestPermission() {
    if (!this.isSupported) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  }

  /** Start the polling loop (idempotent) */
  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.check(), CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', () => this.check())
    // Browsers only allow audio after a user gesture; unlock it on the first interaction
    const unlock = () => {
      this.getAudioContext()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
  }

  /** Replace the schedule of upcoming reminders */
  setSchedule(events, { sound = true } = {}) {
    this.events = Array.isArray(events) ? events : []
    this.soundEnabled = sound
    this.check()
  }

  clearSchedule() {
    this.events = []
  }

  // ---------- schedule building ----------

  /**
   * Build reminder events from the prayer store and plain settings values.
   * Each event: { id, at (ms), title, body, tag, requireInteraction }
   */
  buildSchedule(prayerStore, settings) {
    if (!settings.notificationsEnabled || !prayerStore.todayTimings) return []

    const events = []
    const fmt = (ms) => {
      const d = new Date(ms)
      return d.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: settings.timeFormat === '12',
        timeZone: prayerStore.timezone || undefined
      })
    }
    const add = (id, at, title, body, requireInteraction = false) => {
      if (!at) return
      const ms = at.valueOf()
      events.push({ id: `${id}@${ms}`, at: ms, title, body, tag: id, requireInteraction })
    }

    for (const offset of [0, 1]) {
      for (const name of PRAYERS) {
        if (!settings[`notify${name}`]) continue
        const start = prayerStore.instant(name, offset)
        if (!start) continue

        if (settings.notifyBeforePrayer && settings.notifyBeforeMinutes > 0) {
          add(
            `${name}-before`,
            start.subtract(settings.notifyBeforeMinutes, 'minute'),
            `${name} in ${settings.notifyBeforeMinutes} minutes`,
            `${name} prayer begins at ${fmt(start.valueOf())}. Time to prepare.`
          )
        }

        if (settings.notifyAtPrayer) {
          const iftar = settings.isRamadan && name === 'Maghrib' && offset === 0
          add(
            name,
            start,
            `${name} – ${fmt(start.valueOf())}`,
            iftar ? "It's time for Maghrib prayer and Iftar!" : `It's time for ${name} prayer.`,
            true
          )
        }

        if (settings.notifyPrayerEnd && settings.notifyPrayerEndMinutes > 0) {
          // Isha's preferred time ends at Islamic midnight; others at the end of their window
          const end = name === 'Isha' ? prayerStore.instant('Midnight', offset) : prayerStore.prayerEnd(name, offset)
          if (end) {
            const warn = end.subtract(settings.notifyPrayerEndMinutes, 'minute')
            if (warn.valueOf() > start.valueOf()) {
              add(
                `${name}-ending`,
                warn,
                `${name} time ending soon`,
                `${name} time ends in ${settings.notifyPrayerEndMinutes} minutes (at ${fmt(end.valueOf())}).`
              )
            }
          }
        }
      }

      // Ramadan reminders (today, and tomorrow if Ramadan continues)
      const ramadanThatDay = settings.isRamadan && (offset === 0 || settings.ramadanContinuesTomorrow)
      if (ramadanThatDay && settings.notifyRamadan) {
        const sehri = prayerStore.instant(prayerStore.sehriName, offset)
        if (settings.notifyRamadanSehri && sehri) {
          add('sehri-warning', sehri.subtract(15, 'minute'), 'Sehri ending soon', `Sehri (Suhoor) ends in 15 minutes, at ${fmt(sehri.valueOf())}.`, true)
          add('sehri-end', sehri, 'Sehri time has ended', 'The fast begins now. May Allah accept it.', true)
        }
        const iftar = prayerStore.instant('Maghrib', offset)
        if (settings.notifyRamadanIftar && iftar) {
          add('iftar-warning', iftar.subtract(5, 'minute'), 'Iftar in 5 minutes', `Get ready to break your fast at ${fmt(iftar.valueOf())}.`, true)
        }
      }
    }

    return events.sort((a, b) => a.at - b.at)
  }

  // ---------- firing ----------

  loadFired() {
    try {
      return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}')
    } catch {
      return {}
    }
  }

  saveFired(fired) {
    const cutoff = Date.now() - 2 * 86400000
    for (const id of Object.keys(fired)) {
      if (fired[id] < cutoff) delete fired[id]
    }
    try {
      localStorage.setItem(FIRED_KEY, JSON.stringify(fired))
    } catch {
      /* ignore quota errors */
    }
  }

  check() {
    if (!this.events.length || this.permission !== 'granted') return
    const now = Date.now()
    const fired = this.loadFired()
    let changed = false

    for (const event of this.events) {
      if (event.at > now) break // sorted
      if (fired[event.id]) continue
      fired[event.id] = now
      changed = true
      if (now - event.at <= LATE_GRACE_MS) {
        this.show(event.title, {
          body: event.body,
          tag: event.tag,
          requireInteraction: event.requireInteraction
        })
      }
    }

    if (changed) this.saveFired(fired)
  }

  /** Display a notification (via the service worker when available) */
  async show(title, options = {}) {
    if (this.permission !== 'granted') return false

    const opts = {
      icon: ICON,
      badge: BADGE,
      silent: !this.soundEnabled,
      ...options
    }

    if (this.soundEnabled) this.playChime()

    try {
      const reg = this.registration ||
        ('serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null)
      if (reg?.showNotification) {
        await reg.showNotification(title, opts)
        return true
      }
    } catch (e) {
      console.warn('Service worker notification failed, falling back:', e)
    }

    try {
      const n = new Notification(title, opts)
      n.onclick = () => {
        window.focus()
        n.close()
      }
      return true
    } catch (e) {
      console.error('Unable to show notification:', e)
      return false
    }
  }

  async showTestNotification() {
    return this.show('Notifications are working', {
      body: 'You will be reminded of prayer times while Deen Duniya is open.',
      tag: 'test'
    })
  }

  // ---------- sound ----------

  getAudioContext() {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      this.audioCtx = new Ctx()
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {})
    return this.audioCtx
  }

  /** A soft three-note chime synthesised with Web Audio (no audio file needed) */
  playChime() {
    const ctx = this.getAudioContext()
    if (!ctx) return
    const notes = [659.25, 783.99, 987.77] // E5, G5, B5
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.28
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 1.25)
    })
  }
}

export default new NotificationService()
