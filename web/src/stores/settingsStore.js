/**
 * Settings Store
 * Manages user settings and preferences
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'deen-duniya-settings'

// Every persisted setting and its default value
const DEFAULTS = {
  calculationMethod: 3, // Muslim World League
  asrCalculation: 0, // Shafi (Standard)
  hijriAdjustment: 0, // -2 to +2 days
  timeFormat: '12', // '12' or '24'
  language: 'en',
  theme: 'light', // 'light', 'dark', 'auto'
  notificationsEnabled: false,
  notifyBeforePrayer: true,
  notifyBeforeMinutes: 15,
  notifyAtPrayer: true,
  notifyPrayerEnd: false,
  notifyPrayerEndMinutes: 30,
  notifyRamadan: true,
  notifyRamadanSehri: true,
  notifyRamadanIftar: true,
  notificationSound: true,
  notifyFajr: true,
  notifyDhuhr: true,
  notifyAsr: true,
  notifyMaghrib: true,
  notifyIsha: true
}

export const NOTIFICATION_KEYS = Object.keys(DEFAULTS).filter(
  (k) => k.startsWith('notify') || k === 'notificationSound'
)

export const useSettingsStore = defineStore('settings', () => {
  // One ref per setting
  const state = Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, ref(v)]))

  const notificationPermission = ref('Notification' in window ? Notification.permission : 'unsupported')
  const systemPrefersDark = ref(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)

  const calculationMethods = [
    { id: 0, name: 'Jafari / Shia Ithna-Ashari' },
    { id: 1, name: 'University of Islamic Sciences, Karachi' },
    { id: 2, name: 'Islamic Society of North America' },
    { id: 3, name: 'Muslim World League' },
    { id: 4, name: 'Umm Al-Qura University, Makkah' },
    { id: 5, name: 'Egyptian General Authority of Survey' },
    { id: 7, name: 'Institute of Geophysics, University of Tehran' },
    { id: 8, name: 'Gulf Region' },
    { id: 9, name: 'Kuwait' },
    { id: 10, name: 'Qatar' },
    { id: 11, name: 'Majlis Ugama Islam Singapura, Singapore' },
    { id: 12, name: 'Union Organization islamic de France' },
    { id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey' },
    { id: 14, name: 'Spiritual Administration of Muslims of Russia' },
    { id: 15, name: 'Moonsighting Committee Worldwide' },
    { id: 16, name: 'Dubai (experimental)' },
    { id: 17, name: 'Jabatan Kemajuan Islam Malaysia (JAKIM)' },
    { id: 18, name: 'Tunisia' },
    { id: 19, name: 'Algeria' },
    { id: 20, name: 'KEMENAG - Indonesia' },
    { id: 21, name: 'Morocco' },
    { id: 22, name: 'Comunidade Islamica de Lisboa' },
    { id: 23, name: 'Ministry of Awqaf, Jordan' }
  ]

  // Computed
  const currentCalculationMethod = computed(() =>
    calculationMethods.find((m) => m.id === state.calculationMethod.value) || calculationMethods[3]
  )

  const asrCalculationName = computed(() => (state.asrCalculation.value === 0 ? 'Shafi' : 'Hanafi'))

  const isDarkMode = computed(() => {
    if (state.theme.value === 'auto') return systemPrefersDark.value
    return state.theme.value === 'dark'
  })

  // ---------- persistence ----------

  const snapshot = () => Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, state[k].value]))

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()))
    } catch (e) {
      console.warn('Could not save settings:', e)
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      for (const key of Object.keys(DEFAULTS)) {
        if (saved[key] !== undefined && saved[key] !== null) state[key].value = saved[key]
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error)
    }
    // Notifications can't be "on" without browser permission
    if (notificationPermission.value !== 'granted') state.notificationsEnabled.value = false
    applyTheme()
  }

  // ---------- actions ----------

  const applyTheme = () => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
  }

  /** Update any subset of settings at once */
  const update = (changes) => {
    for (const [key, value] of Object.entries(changes)) {
      if (key in DEFAULTS) state[key].value = value
    }
    if ('theme' in changes) applyTheme()
    saveToLocalStorage()
  }

  const setCalculationMethod = (v) => update({ calculationMethod: v })
  const setAsrCalculation = (v) => update({ asrCalculation: v })
  const setHijriAdjustment = (v) => update({ hijriAdjustment: v })
  const setTimeFormat = (v) => update({ timeFormat: v })
  const setLanguage = (v) => update({ language: v })
  const setTheme = (v) => update({ theme: v })
  const updateNotificationSettings = (settings) => update(
    Object.fromEntries(Object.entries(settings).filter(([k]) => NOTIFICATION_KEYS.includes(k)))
  )

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      notificationPermission.value = 'unsupported'
      return false
    }
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    notificationPermission.value = Notification.permission
    return Notification.permission === 'granted'
  }

  /**
   * Turn notifications on/off. Returns the resulting state:
   * { enabled: boolean, reason?: 'denied' | 'unsupported' }
   */
  const toggleNotifications = async (enabled) => {
    if (!enabled) {
      update({ notificationsEnabled: false })
      return { enabled: false }
    }
    const granted = await requestNotificationPermission()
    update({ notificationsEnabled: granted })
    if (granted) return { enabled: true }
    return { enabled: false, reason: notificationPermission.value === 'unsupported' ? 'unsupported' : 'denied' }
  }

  // ---------- init ----------

  loadFromLocalStorage()

  // Follow OS light/dark changes while on "Auto"
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    systemPrefersDark.value = e.matches
    applyTheme()
  })

  return {
    ...state,
    notificationPermission,
    calculationMethods,
    currentCalculationMethod,
    asrCalculationName,
    isDarkMode,
    snapshot,
    update,
    setCalculationMethod,
    setAsrCalculation,
    setHijriAdjustment,
    setTimeFormat,
    setLanguage,
    setTheme,
    applyTheme,
    requestNotificationPermission,
    toggleNotifications,
    updateNotificationSettings,
    saveToLocalStorage,
    loadFromLocalStorage
  }
})
