/**
 * Settings Store
 * Manages user settings and preferences
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const calculationMethod = ref(3) // Default: Muslim World League
  const asrCalculation = ref(0) // Default: Shafi (Standard)
  const timeFormat = ref('24') // '12' or '24'
  const language = ref('en') // 'en' or 'ar'
  const theme = ref('light') // 'light', 'dark', 'auto'
  
  // Notification settings
  const notificationsEnabled = ref(false)
  const notificationPermission = ref('default') // 'default', 'granted', 'denied'
  const notifyBeforePrayer = ref(true)
  const notifyBeforeMinutes = ref(15) // minutes before prayer
  const notifyAtPrayer = ref(true)
  const notifyPrayerEnd = ref(false)
  const notifyPrayerEndMinutes = ref(30) // minutes before prayer ends
  const notifyRamadan = ref(true)
  const notifyRamadanSehri = ref(true)
  const notifyRamadanIftar = ref(true)
  const notificationSound = ref(true)
  
  // Prayer-specific notification settings
  const notifyFajr = ref(true)
  const notifyDhuhr = ref(true)
  const notifyAsr = ref(true)
  const notifyMaghrib = ref(true)
  const notifyIsha = ref(true)

  // Calculation method names
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
  const currentCalculationMethod = computed(() => {
    return calculationMethods.find(m => m.id === calculationMethod.value) || calculationMethods[3]
  })

  const asrCalculationName = computed(() => {
    return asrCalculation.value === 0 ? 'Shafi' : 'Hanafi'
  })

  const isDarkMode = computed(() => {
    if (theme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value === 'dark'
  })

  // Actions
  const setCalculationMethod = (methodId) => {
    calculationMethod.value = methodId
    saveToLocalStorage()
  }

  const setAsrCalculation = (method) => {
    asrCalculation.value = method
    saveToLocalStorage()
  }

  const setTimeFormat = (format) => {
    timeFormat.value = format
    saveToLocalStorage()
  }

  const setLanguage = (lang) => {
    language.value = lang
    saveToLocalStorage()
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
    applyTheme()
    saveToLocalStorage()
  }

  const applyTheme = () => {
    const root = document.documentElement
    if (isDarkMode.value) {
      root.classList.add('dark-mode')
    } else {
      root.classList.remove('dark-mode')
    }
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      notificationPermission.value = 'granted'
      notificationsEnabled.value = true
      saveToLocalStorage()
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      notificationPermission.value = permission
      
      if (permission === 'granted') {
        notificationsEnabled.value = true
        saveToLocalStorage()
        return true
      }
    }

    notificationsEnabled.value = false
    saveToLocalStorage()
    return false
  }

  const toggleNotifications = async (enabled) => {
    if (enabled) {
      const granted = await requestNotificationPermission()
      notificationsEnabled.value = granted
    } else {
      notificationsEnabled.value = false
    }
    saveToLocalStorage()
  }

  const updateNotificationSettings = (settings) => {
    Object.keys(settings).forEach(key => {
      if (key in { notifyBeforePrayer, notifyBeforeMinutes, notifyAtPrayer, notifyPrayerEnd, notifyPrayerEndMinutes, notifyRamadan, notifyRamadanSehri, notifyRamadanIftar, notificationSound, notifyFajr, notifyDhuhr, notifyAsr, notifyMaghrib, notifyIsha }) {
        switch(key) {
          case 'notifyBeforePrayer': notifyBeforePrayer.value = settings[key]; break
          case 'notifyBeforeMinutes': notifyBeforeMinutes.value = settings[key]; break
          case 'notifyAtPrayer': notifyAtPrayer.value = settings[key]; break
          case 'notifyPrayerEnd': notifyPrayerEnd.value = settings[key]; break
          case 'notifyPrayerEndMinutes': notifyPrayerEndMinutes.value = settings[key]; break
          case 'notifyRamadan': notifyRamadan.value = settings[key]; break
          case 'notifyRamadanSehri': notifyRamadanSehri.value = settings[key]; break
          case 'notifyRamadanIftar': notifyRamadanIftar.value = settings[key]; break
          case 'notificationSound': notificationSound.value = settings[key]; break
          case 'notifyFajr': notifyFajr.value = settings[key]; break
          case 'notifyDhuhr': notifyDhuhr.value = settings[key]; break
          case 'notifyAsr': notifyAsr.value = settings[key]; break
          case 'notifyMaghrib': notifyMaghrib.value = settings[key]; break
          case 'notifyIsha': notifyIsha.value = settings[key]; break
        }
      }
    })
    saveToLocalStorage()
  }

  const saveToLocalStorage = () => {
    const settings = {
      calculationMethod: calculationMethod.value,
      asrCalculation: asrCalculation.value,
      timeFormat: timeFormat.value,
      language: language.value,
      theme: theme.value,
      notificationsEnabled: notificationsEnabled.value,
      notificationPermission: notificationPermission.value,
      notifyBeforePrayer: notifyBeforePrayer.value,
      notifyBeforeMinutes: notifyBeforeMinutes.value,
      notifyAtPrayer: notifyAtPrayer.value,
      notifyPrayerEnd: notifyPrayerEnd.value,
      notifyPrayerEndMinutes: notifyPrayerEndMinutes.value,
      notifyRamadan: notifyRamadan.value,
      notifyRamadanSehri: notifyRamadanSehri.value,
      notifyRamadanIftar: notifyRamadanIftar.value,
      notificationSound: notificationSound.value,
      notifyFajr: notifyFajr.value,
      notifyDhuhr: notifyDhuhr.value,
      notifyAsr: notifyAsr.value,
      notifyMaghrib: notifyMaghrib.value,
      notifyIsha: notifyIsha.value
    }
    localStorage.setItem('deen-duniya-settings', JSON.stringify(settings))
  }

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('deen-duniya-settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        calculationMethod.value = settings.calculationMethod ?? 3
        asrCalculation.value = settings.asrCalculation ?? 0
        timeFormat.value = settings.timeFormat ?? '24'
        language.value = settings.language ?? 'en'
        theme.value = settings.theme ?? 'light'
        notificationsEnabled.value = settings.notificationsEnabled ?? false
        notificationPermission.value = settings.notificationPermission ?? 'default'
        notifyBeforePrayer.value = settings.notifyBeforePrayer ?? true
        notifyBeforeMinutes.value = settings.notifyBeforeMinutes ?? 15
        notifyAtPrayer.value = settings.notifyAtPrayer ?? true
        notifyPrayerEnd.value = settings.notifyPrayerEnd ?? false
        notifyPrayerEndMinutes.value = settings.notifyPrayerEndMinutes ?? 30
        notifyRamadan.value = settings.notifyRamadan ?? true
        notifyRamadanSehri.value = settings.notifyRamadanSehri ?? true
        notifyRamadanIftar.value = settings.notifyRamadanIftar ?? true
        notificationSound.value = settings.notificationSound ?? true
        notifyFajr.value = settings.notifyFajr ?? true
        notifyDhuhr.value = settings.notifyDhuhr ?? true
        notifyAsr.value = settings.notifyAsr ?? true
        notifyMaghrib.value = settings.notifyMaghrib ?? true
        notifyIsha.value = settings.notifyIsha ?? true
        
        applyTheme()
      } catch (error) {
        console.error('Error loading settings from localStorage:', error)
      }
    } else {
      applyTheme()
    }
  }

  // Initialize
  loadFromLocalStorage()

  // Check current notification permission
  if ('Notification' in window) {
    notificationPermission.value = Notification.permission
  }

  return {
    // State
    calculationMethod,
    asrCalculation,
    timeFormat,
    language,
    theme,
    notificationsEnabled,
    notificationPermission,
    notifyBeforePrayer,
    notifyBeforeMinutes,
    notifyAtPrayer,
    notifyPrayerEnd,
    notifyPrayerEndMinutes,
    notifyRamadan,
    notifyRamadanSehri,
    notifyRamadanIftar,
    notificationSound,
    notifyFajr,
    notifyDhuhr,
    notifyAsr,
    notifyMaghrib,
    notifyIsha,
    calculationMethods,
    
    // Computed
    currentCalculationMethod,
    asrCalculationName,
    isDarkMode,
    
    // Actions
    setCalculationMethod,
    setAsrCalculation,
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
