<template>
  <Card class="prayer-times-card">
    <template #title>
      <div class="card-header">
        <i class="pi pi-clock"></i>
        Prayer Times
      </div>
    </template>
    <template #content>
      <div v-if="isLoading" class="loading-state">
        <ProgressSpinner />
        <p>Loading prayer times...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <Message severity="error" :closable="false">{{ error }}</Message>
      </div>

      <div v-else-if="todayTimings" class="prayer-times">
        <!-- Current & Next Prayer Countdown -->
        <div v-if="nextPrayer" class="next-prayer-banner">
          <div v-if="currentPrayer" class="current-prayer-section">
            <span class="status-label">Current Prayer</span>
            <div class="status-value">{{ currentPrayer.name }}</div>
          </div>
          
          <div class="next-prayer-row">
            <div class="next-prayer-section">
              <span class="status-label">Next Prayer</span>
              <div class="status-value">{{ nextPrayer.name }}</div>
              <span class="status-time">{{ formatTime(nextPrayer.time, timeFormat) }}</span>
            </div>
            <div class="countdown">
              <div class="countdown-display">{{ countdown }}</div>
              <ProgressBar :value="countdownProgress" :showValue="false" class="countdown-progress" />
            </div>
          </div>
        </div>

        <!-- All Prayer Times Grid -->
        <div class="prayers-grid">
          <div 
            v-for="prayer in prayerNames" 
            :key="prayer"
            class="prayer-item"
            :class="{ 
              'current': currentPrayer?.name === prayer,
              'next': nextPrayer?.name === prayer,
              'passed': isPrayerPassed(prayer)
            }"
          >
            <div class="prayer-icon">
              <i :class="getPrayerIcon(prayer)"></i>
            </div>
            <div class="prayer-info">
              <span class="prayer-name">{{ prayer }}</span>
              <span class="prayer-time">{{ formatTime(todayTimings[prayer], timeFormat) }}</span>
            </div>
            <div v-if="nextPrayer?.name === prayer" class="next-badge">
              <Tag value="Next" severity="success" />
            </div>
            <div v-else-if="currentPrayer?.name === prayer" class="current-badge">
              <Tag value="Now" severity="info" />
            </div>
          </div>
        </div>

        <!-- Additional Times -->
        <Divider  />
        <div class="additional-times">
          <div class="additional-time-item">
            <span class="label"><i class="pi pi-sun"></i> Sunrise</span>
            <span class="time">{{ formatTime(todayTimings.Sunrise, timeFormat) }}</span>
          </div>
          <div class="additional-time-item">
            <span class="label"><i class="pi pi-moon"></i> Midnight</span>
            <span class="time">{{ formatTime(todayTimings.Midnight, timeFormat) }}</span>
          </div>
          <div v-if="todayTimings.Imsak" class="additional-time-item">
            <span class="label"><i class="pi pi-star"></i> Imsak</span>
            <span class="time">{{ formatTime(todayTimings.Imsak, timeFormat) }}</span>
          </div>
        </div>

        <!-- Refresh Button -->
        <div class="card-actions">
          <Button 
            label="Refresh" 
            icon="pi pi-refresh" 
            @click="refreshPrayerTimes" 
            :loading="isLoading"
            size="small"
            outlined
          />
          <span v-if="lastUpdated" class="last-updated">
            Updated: {{ lastUpdated.format('h:mm A') }}
          </span>
        </div>
      </div>

      <div v-else class="empty-state">
        <i class="pi pi-map-marker" style="font-size: 3rem; color: var(--text-secondary);"></i>
        <p>Set your location to view prayer times</p>
        <Button label="Set Location" @click="$emit('show-location-dialog')" />
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePrayerTimesStore } from '../stores/prayerTimesStore'
import { useSettingsStore } from '../stores/settingsStore'
import { formatTime, formatDuration } from '../utils/dateUtils'
import dayjs from 'dayjs'

import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import ProgressBar from 'primevue/progressbar'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'

const prayerTimesStore = usePrayerTimesStore()
const settingsStore = useSettingsStore()

// State
const countdown = ref('--:--')
const countdownProgress = ref(0)
let countdownInterval = null

// Computed
const isLoading = computed(() => prayerTimesStore.isLoading)
const error = computed(() => prayerTimesStore.error)
const todayTimings = computed(() => prayerTimesStore.todayTimings)
const nextPrayer = computed(() => prayerTimesStore.nextPrayer)
const currentPrayer = computed(() => prayerTimesStore.currentPrayer)
const prayerNames = computed(() => prayerTimesStore.prayerNames)
const lastUpdated = computed(() => prayerTimesStore.lastUpdated)
const timeFormat = computed(() => settingsStore.timeFormat)

// Methods
const updateCountdown = () => {
  if (!nextPrayer.value) {
    countdown.value = '--:--'
    countdownProgress.value = 0
    return
  }

  // Calculate time until next prayer fresh on every update
  const now = dayjs()
  const [hours, minutes] = nextPrayer.value.time.split(':')
  let nextPrayerTime = now.clone().hour(parseInt(hours)).minute(parseInt(minutes)).second(0)
  
  // If prayer has passed today or is tomorrow's Fajr, add 1 day
  if (nextPrayerTime.isBefore(now) || nextPrayer.value.isTomorrow) {
    nextPrayerTime = nextPrayerTime.add(1, 'day')
  }
  
  const msUntilNextPrayer = nextPrayerTime.diff(now)
  countdown.value = formatDuration(msUntilNextPrayer)
  
  // Calculate progress (assuming total time until next prayer is from current prayer)
  if (currentPrayer.value && todayTimings.value) {
    const currentTime = dayjs(`${now.format('YYYY-MM-DD')} ${todayTimings.value[currentPrayer.value.name]}`, 'YYYY-MM-DD HH:mm')
    
    const total = nextPrayerTime.diff(currentTime)
    const elapsed = now.diff(currentTime)
    
    if (total > 0) {
      countdownProgress.value = Math.min(100, Math.max(0, (elapsed / total) * 100))
    }
  }
}

const refreshPrayerTimes = async () => {
  await prayerTimesStore.fetchTodayPrayerTimes()
}

const isPrayerPassed = (prayerName) => {
  if (!todayTimings.value || !todayTimings.value[prayerName]) return false
  
  const now = dayjs()
  const [hours, minutes] = todayTimings.value[prayerName].split(':')
  const prayerTime = dayjs().hour(parseInt(hours)).minute(parseInt(minutes)).second(0)
  
  return prayerTime.isBefore(now)
}

const getPrayerIcon = (prayerName) => {
  const icons = {
    'Fajr': 'pi pi-star',
    'Dhuhr': 'pi pi-sun',
    'Asr': 'pi pi-cloud',
    'Maghrib': 'pi pi-moon',
    'Isha': 'pi pi-star-fill'
  }
  return icons[prayerName] || 'pi pi-clock'
}

// Lifecycle
onMounted(() => {
  updateCountdown()
  countdownInterval = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<style scoped>
.prayer-times-card {
  margin-bottom: 2rem;
  background-color: var(--surface-color);
  box-shadow: var(--shadow-lg);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--primary-color);
  font-size: 1.5rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.next-prayer-banner {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.current-prayer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.next-prayer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.next-prayer-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.status-label {
  font-size: 0.75rem;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.status-value {
  font-size: 1.75rem;
  font-weight: 700;
}

.status-time {
  font-size: 1rem;
  opacity: 0.95;
  margin-top: 0.25rem;
}

.next-prayer-info {
  flex: 1;
}

.next-prayer-label {
  font-size: 0.875rem;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.next-prayer-name {
  font-size: 2.5rem;
  margin: 0.5rem 0;
  font-weight: 700;
}

.next-prayer-time {
  font-size: 1.25rem;
  opacity: 0.95;
}

.countdown {
  flex: 1;
  text-align: right;
}

.countdown-display {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  font-variant-numeric: tabular-nums;
}

.countdown-progress {
  width: 100%;
  height: 8px;
}

.prayers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.prayer-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  transition: all 0.3s;
  position: relative;
}

.prayer-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.prayer-item.current {
  border-color: #0ea5e9;
  background-color: rgba(14, 165, 233, 0.1);
}

.prayer-item.next {
  border-color: var(--primary-color);
  background-color: rgba(44, 95, 45, 0.1);
}

.prayer-item.passed {
  opacity: 0.6;
}

.prayer-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--surface-color);
  border-radius: 50%;
  font-size: 1.25rem;
  color: var(--primary-color);
}

.prayer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.prayer-name {
  font-weight: 600;
  font-size: 1rem;
}

.prayer-time {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.next-badge,
.current-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

.next-badge :deep(.p-tag),
.current-badge :deep(.p-tag) {
  background-color: var(--tag-bg) !important;
  color: var(--tag-color) !important;
  opacity: 1 !important;
}

.next-badge :deep(.p-tag) {
  --tag-bg: #10b981;
  --tag-color: white;
}

.current-badge :deep(.p-tag) {
  --tag-bg: #3b82f6;
  --tag-color: white;
}

.additional-times {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.additional-time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--bg-color);
  border-radius: 0.5rem;
}

.additional-time-item .label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.additional-time-item .time {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.last-updated {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .next-prayer-banner {
    padding: 1.5rem;
  }
  
  .current-prayer-section {
    padding-bottom: 0.75rem;
  }
  
  .next-prayer-row {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }
  
  .next-prayer-section {
    width: 100%;
    align-items: center;
  }
  
  .countdown {
    text-align: center;
    width: 100%;
  }
  
  .status-value {
    font-size: 1.5rem;
  }
  
  .prayers-grid {
    grid-template-columns: 1fr;
  }
}
</style>
