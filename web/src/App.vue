<template>
  <div id="app-root" :class="{ 'dark-mode': settingsStore.isDarkMode }">
    <!-- Header -->
    <header class="app-header">
      <div class="container">
        <div class="header-content">
          <div class="logo">
            <i class="pi pi-moon"></i>
            <h1>Deen Duniya</h1>
          </div>
          <div class="header-actions">
            <Button
              :icon="notificationsEnabled ? 'pi pi-bell' : 'pi pi-bell-slash'"
              :severity="notificationsEnabled ? 'success' : 'secondary'"
              text
              rounded
              @click="toggleNotifications"
              v-tooltip.bottom="notificationsEnabled ? 'Notifications on' : 'Notifications off'"
              :aria-label="notificationsEnabled ? 'Turn notifications off' : 'Turn notifications on'"
            />
            <Button
              icon="pi pi-cog"
              severity="secondary"
              text
              rounded
              @click="showSettings = true"
              v-tooltip.bottom="'Settings'"
              aria-label="Settings"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- Location Banner (if not set) -->
    <div v-if="!locationStore.hasLocation" class="location-banner">
      <div class="container">
        <Message severity="warn" :closable="false">
          <div class="location-prompt">
            <span>Please set your location to view prayer times</span>
            <Button label="Set Location" @click="showLocationDialog = true" size="small" />
          </div>
        </Message>
      </div>
    </div>

    <!-- Main Content -->
    <main class="app-main">
      <div class="container">
        <!-- Current Date and Location -->
        <div class="info-bar">
          <div class="current-date">
            <div class="gregorian-date">
              <i class="pi pi-calendar"></i>
              {{ currentDate.full }}
            </div>
            <div v-if="prayerTimesStore.dateInfo?.hijri" class="hijri-date">
              {{ formatHijriDate(prayerTimesStore.dateInfo.hijri) }}
              <Tag
                v-if="prayerTimesStore.isRamadan"
                severity="success"
                value="Ramadan"
                class="ramadan-tag"
              />
            </div>
          </div>
          <button type="button" class="location-display" @click="showLocationDialog = true">
            <i class="pi pi-map-marker"></i>
            <span class="location-text">
              <span>{{ locationStore.locationDisplay }}</span>
              <small v-if="prayerTimesStore.isRemoteTimezone" class="local-time">
                Local time {{ locationLocalTime }} ({{ prayerTimesStore.timezone }})
              </small>
            </span>
            <i class="pi pi-pencil edit-icon"></i>
          </button>
        </div>

        <!-- Prayer Times Card -->
        <PrayerTimesCard id="prayer-times" @show-location-dialog="showLocationDialog = true" />

        <!-- Ramadan Card (only during Ramadan) -->
        <RamadanCard v-if="prayerTimesStore.isRamadan" />

        <!-- Islamic Calendar -->
        <IslamicCalendar />
      </div>
    </main>

    <LocationDialog v-model:visible="showLocationDialog" @location-set="onLocationSet" />

    <SettingsDialog v-model:visible="showSettings" @settings-changed="onSettingsChanged" />

    <HijriCalibrationDialog v-model:visible="showCalibrationDialog" @calibrated="onCalibrated" />

    <NotificationPermissionDialog
      v-model:visible="showNotificationPermission"
      @completed="onNotificationPermissionCompleted"
    />

    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useLocationStore } from './stores/locationStore'
import { usePrayerTimesStore } from './stores/prayerTimesStore'
import { useSettingsStore } from './stores/settingsStore'
import { useNow } from './composables/useNow'
import { getCurrentDateInfo, formatHijriDate, nowInTz } from './utils/dateUtils'
import notificationService from './services/notificationService'

import Button from 'primevue/button'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import Tag from 'primevue/tag'

import PrayerTimesCard from './components/PrayerTimesCard.vue'
import RamadanCard from './components/RamadanCard.vue'
import IslamicCalendar from './components/IslamicCalendar.vue'
import LocationDialog from './components/LocationDialog.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import HijriCalibrationDialog from './components/HijriCalibrationDialog.vue'
import NotificationPermissionDialog from './components/NotificationPermissionDialog.vue'

// Stores
const locationStore = useLocationStore()
const prayerTimesStore = usePrayerTimesStore()
const settingsStore = useSettingsStore()
const toast = useToast()
const now = useNow()

// State
const showLocationDialog = ref(false)
const showSettings = ref(false)
const showCalibrationDialog = ref(false)
const showNotificationPermission = ref(false)

// Computed
const notificationsEnabled = computed(() => settingsStore.notificationsEnabled)

// Date shown in the header follows the selected location's timezone
const currentDate = computed(() => {
  void now.value
  return getCurrentDateInfo(prayerTimesStore.effectiveTimezone)
})

const locationLocalTime = computed(() =>
  nowInTz(prayerTimesStore.timezone, now.value).format(settingsStore.timeFormat === '12' ? 'h:mm A' : 'HH:mm')
)

// ---------- notifications ----------

const notificationSchedule = computed(() => {
  const settings = {
    ...settingsStore.snapshot(),
    isRamadan: prayerTimesStore.isRamadan,
    ramadanContinuesTomorrow:
      prayerTimesStore.isRamadan && prayerTimesStore.ramadanDay < prayerTimesStore.ramadanLength
  }
  return notificationService.buildSchedule(prayerTimesStore, settings)
})

watch(
  notificationSchedule,
  (events) => notificationService.setSchedule(events, { sound: settingsStore.notificationSound }),
  { immediate: true }
)

const showPermissionProblem = (reason) => {
  toast.add({
    severity: 'warn',
    summary: 'Notifications unavailable',
    detail: reason === 'unsupported'
      ? 'This browser does not support notifications.'
      : "Notifications are blocked for this site. Allow them in your browser's site settings and try again.",
    life: 7000
  })
}

const toggleNotifications = async () => {
  const result = await settingsStore.toggleNotifications(!settingsStore.notificationsEnabled)
  if (result.enabled) {
    notificationService.soundEnabled = settingsStore.notificationSound
    notificationService.showTestNotification()
  } else if (result.reason) {
    showPermissionProblem(result.reason)
  } else {
    toast.add({ severity: 'info', summary: 'Notifications turned off', life: 3000 })
  }
}

const checkNotificationPermissionPrompt = () => {
  if (localStorage.getItem('notificationPromptShown')) return
  setTimeout(() => {
    showNotificationPermission.value = true
  }, 500)
}

const onNotificationPermissionCompleted = (result) => {
  if (result?.enabled) {
    notificationService.soundEnabled = settingsStore.notificationSound
    notificationService.showTestNotification()
  } else if (result?.reason) {
    showPermissionProblem(result.reason)
  }
}

// ---------- Hijri calibration ----------

const needsCalibration = () => prayerTimesStore.isRamadan && !localStorage.getItem('hijriCalibrated')

const maybeShowCalibration = () => {
  if (needsCalibration() && !showLocationDialog.value) {
    setTimeout(() => {
      showCalibrationDialog.value = true
    }, 500)
    return true
  }
  return false
}

// ---------- events ----------

const onLocationSet = async () => {
  await prayerTimesStore.fetchTodayPrayerTimes()
  if (!maybeShowCalibration()) checkNotificationPermissionPrompt()
}

const onCalibrated = async () => {
  await prayerTimesStore.fetchTodayPrayerTimes()
  checkNotificationPermissionPrompt()
}

const onSettingsChanged = async () => {
  await prayerTimesStore.fetchTodayPrayerTimes()
}

// Refetch when the location's calendar day rolls over (also after sleep / tab return)
let refetching = false
watch(
  () => prayerTimesStore.isStale,
  async (stale) => {
    if (!stale || refetching) return
    refetching = true
    try {
      await prayerTimesStore.fetchTodayPrayerTimes()
    } finally {
      refetching = false
    }
  }
)

// Ramadan may begin while the app is open
watch(() => prayerTimesStore.isRamadan, (isRamadan) => {
  if (isRamadan) maybeShowCalibration()
})

// Manifest shortcuts: /#settings and /#prayer-times
const handleHash = () => {
  const hash = window.location.hash
  if (hash === '#settings') {
    showSettings.value = true
  } else if (hash === '#prayer-times') {
    document.getElementById('prayer-times')?.scrollIntoView({ behavior: 'smooth' })
  } else {
    return
  }
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

// Lifecycle
onMounted(async () => {
  notificationService.start()
  window.addEventListener('hashchange', handleHash)
  handleHash()

  if (!locationStore.hasLocation) {
    setTimeout(() => {
      showLocationDialog.value = true
    }, 800)
    return
  }

  await prayerTimesStore.loadFromLocalStorage()
  maybeShowCalibration()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHash)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-color: #2c5f2d;
  --secondary-color: #97be5a;
  --accent-color: #d4af37;
  --bg-color: #f8f9fa;
  --surface-color: #ffffff;
  --text-color: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.dark-mode {
  --primary-color: #4a8a4d;
  --secondary-color: #b8d68b;
  --accent-color: #f4d03f;
  --bg-color: #1a1a1a;
  --surface-color: #2d2d2d;
  --text-color: #f8f9fa;
  --text-secondary: #adb5bd;
  --border-color: #495057;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.4);
}

#app-root {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-header {
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo i {
  font-size: 2rem;
  color: var(--primary-color);
}

.logo h1 {
  font-size: 1.75rem;
  color: var(--primary-color);
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.location-banner {
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
}

.location-prompt {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.app-main {
  padding: 2rem 0;
}

.info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.current-date {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gregorian-date {
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hijri-date {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ramadan-tag {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.location-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  transition: all 0.3s;
}

.location-display {
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.location-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.local-time {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.edit-icon {
  font-size: 0.8rem;
  opacity: 0.7;
}

.location-display:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow);
}

.location-display i {
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .logo h1 {
    font-size: 1.25rem;
  }
  
  .info-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .location-display {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
