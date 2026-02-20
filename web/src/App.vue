<template>
  <div id="app" :class="{ 'dark-mode': settingsStore.isDarkMode }">
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
              icon="pi pi-bell" 
              :badge="notificationsEnabled ? '✓' : ''" 
              severity="secondary" 
              text 
              @click="toggleNotifications"
              v-tooltip="'Notifications'"
            />
            <Button 
              icon="pi pi-cog" 
              severity="secondary" 
              text 
              @click="showSettings = true"
              v-tooltip="'Settings'"
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
          <div class="location-display" @click="showLocationDialog = true" style="cursor: pointer;">
            <i class="pi pi-map-marker"></i>
            {{ locationStore.locationDisplay }}
            <Button icon="pi pi-pencil" text size="small" />
          </div>
        </div>

        <!-- Prayer Times Card -->
        <PrayerTimesCard />

        <!-- Ramadan Card (only during Ramadan) -->
        <RamadanCard v-if="prayerTimesStore.isRamadan" />

        <!-- Islamic Calendar -->
        <IslamicCalendar />
      </div>
    </main>

    <!-- Location Dialog -->
    <LocationDialog 
      v-model:visible="showLocationDialog" 
      @location-set="onLocationSet" 
    />

    <!-- Settings Dialog -->
    <SettingsDialog 
      v-model:visible="showSettings" 
    />

    <!-- Toast for notifications -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useLocationStore } from './stores/locationStore'
import { usePrayerTimesStore } from './stores/prayerTimesStore'
import { useSettingsStore } from './stores/settingsStore'
import { getCurrentDateInfo, formatHijriDate } from './utils/dateUtils'
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

// Stores
const locationStore = useLocationStore()
const prayerTimesStore = usePrayerTimesStore()
const settingsStore = useSettingsStore()

// State
const showLocationDialog = ref(false)
const showSettings = ref(false)
const currentDate = ref(getCurrentDateInfo())

// Computed
const notificationsEnabled = computed(() => settingsStore.notificationsEnabled)

// Methods
const toggleNotifications = async () => {
  await settingsStore.toggleNotifications(!settingsStore.notificationsEnabled)
  
  if (settingsStore.notificationsEnabled) {
    notificationService.showTestNotification()
  }
}

const onLocationSet = async () => {
  showLocationDialog.value = false
  await prayerTimesStore.fetchTodayPrayerTimes()
}

const setupNotifications = () => {
  if (settingsStore.notificationsEnabled && prayerTimesStore.todayTimings) {
    notificationService.schedulePrayerNotifications(
      prayerTimesStore.todayTimings,
      settingsStore,
      prayerTimesStore.isRamadan
    )
  }
}

// Lifecycle
onMounted(async () => {
  // Try to load saved location and prayer times
  prayerTimesStore.loadFromLocalStorage()
  
  // If we have location, fetch prayer times
  if (locationStore.hasLocation && !prayerTimesStore.todayTimings) {
    await prayerTimesStore.fetchTodayPrayerTimes()
  }
  
  // If no location, show location dialog after a short delay
  if (!locationStore.hasLocation) {
    setTimeout(() => {
      showLocationDialog.value = true
    }, 1000)
  }
  
  // Update current date every second
  setInterval(() => {
    currentDate.value = getCurrentDateInfo()
  }, 1000)
  
  // Setup notifications
  setupNotifications()
  
  // Refresh prayer times at midnight
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const msUntilMidnight = tomorrow - now
  
  setTimeout(() => {
    prayerTimesStore.fetchTodayPrayerTimes()
    // Then refresh every 24 hours
    setInterval(() => {
      prayerTimesStore.fetchTodayPrayerTimes()
    }, 86400000) // 24 hours
  }, msUntilMidnight)
})

// Watch for prayer times changes to update notifications
watch(() => prayerTimesStore.todayTimings, () => {
  setupNotifications()
}, { deep: true })

watch(() => settingsStore.notificationsEnabled, () => {
  if (settingsStore.notificationsEnabled) {
    setupNotifications()
  } else {
    notificationService.clearScheduledNotifications()
  }
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

#app {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
