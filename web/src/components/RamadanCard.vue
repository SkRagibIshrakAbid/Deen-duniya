<template>
  <Card class="ramadan-card">
    <template #title>
      <div class="card-header">
        <i class="pi pi-star-fill"></i>
        Ramadan Day {{ ramadanDay || '?' }} - Blessed Month
      </div>
    </template>
    <template #content>
      <div class="ramadan-content">
        <!-- Featured Time (Sehri or Iftar) Banner -->
        <div v-if="showSehri" class="featured-time-banner sehri-banner">
          <div class="featured-info">
            <span class="featured-label">{{ isNextDaySehri ? "Tomorrow's " : "" }}Sehri (Suhoor)</span>
            <h2 class="featured-time">{{ formatTime(sehriTime, timeFormat) }}</h2>
          </div>
          <div class="countdown">
            <div class="countdown-display">{{ sehriCountdown }}</div>
          </div>
        </div>

        <div v-else class="featured-time-banner iftar-banner">
          <div class="featured-info">
            <span class="featured-label">Iftar (Breaking Fast)</span>
            <h2 class="featured-time">{{ formatTime(iftarTime, timeFormat) }}</h2>
          </div>
          <div class="countdown">
            <div class="countdown-display">{{ iftarCountdown }}</div>
            <ProgressBar 
              :value="fastingProgress" 
              :showValue="false" 
              class="countdown-progress"
            />
          </div>
        </div>

        <!-- Ramadan Stats -->
        <Divider />
        <div class="ramadan-stats">
          <div class="stat-card">
            <span class="stat-label">Days Completed</span>
            <span class="stat-value">{{ ramadanDay - 1 }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Days Remaining</span>
            <span class="stat-value">{{ 30 - ramadanDay }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Progress</span>
            <span class="stat-value">{{ ((ramadanDay / 30) * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- Ramadan Information -->
        <div class="ramadan-info">
          <Panel header="Did you know?" toggleable>
            <div class="info-content">
              <p>{{ getRamadanMessage() }}</p>
            </div>
          </Panel>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePrayerTimesStore } from '../stores/prayerTimesStore'
import { useSettingsStore } from '../stores/settingsStore'
import { formatTime, formatDetailedDuration } from '../utils/dateUtils'
import dayjs from 'dayjs'

import Card from 'primevue/card'
import Panel from 'primevue/panel'
import ProgressBar from 'primevue/progressbar'
import Divider from 'primevue/divider'

const prayerTimesStore = usePrayerTimesStore()
const settingsStore = useSettingsStore()

// State
const sehriCountdown = ref('')
const iftarCountdown = ref('')
const sehriPassed = ref(false)
const iftarPassed = ref(false)
const fastingProgress = ref(0)
const isNextDaySehri = ref(false)
let countdownInterval = null

// Computed
const sehriTime = computed(() => prayerTimesStore.sehriTime)
const iftarTime = computed(() => prayerTimesStore.iftarTime)
const ramadanDay = computed(() => prayerTimesStore.ramadanDay)
const timeFormat = computed(() => settingsStore.timeFormat)

// Determine which section to show
const showSehri = computed(() => {
  const now = dayjs()
  
  if (!sehriTime.value || !iftarTime.value) return true
  
  const [sehriHours, sehriMinutes] = sehriTime.value.split(':')
  const [iftarHours, iftarMinutes] = iftarTime.value.split(':')
  
  const sehriTimeObj = now.clone().hour(parseInt(sehriHours)).minute(parseInt(sehriMinutes)).second(0)
  const iftarTimeObj = now.clone().hour(parseInt(iftarHours)).minute(parseInt(iftarMinutes)).second(0)
  
  // Before Sehri: Show Sehri
  if (now.isBefore(sehriTimeObj)) {
    return true
  }
  
  // After Iftar: Show next day's Sehri
  if (now.isAfter(iftarTimeObj)) {
    return true
  }
  
  // Between Sehri and Iftar: Show Iftar
  return false
})

// Methods
const updateCountdowns = () => {
  const now = dayjs()
  
  if (!sehriTime.value || !iftarTime.value) return
  
  const [sehriHours, sehriMinutes] = sehriTime.value.split(':')
  const [iftarHours, iftarMinutes] = iftarTime.value.split(':')
  
  let sehriTimeObj = now.clone().hour(parseInt(sehriHours)).minute(parseInt(sehriMinutes)).second(0)
  const iftarTimeObj = now.clone().hour(parseInt(iftarHours)).minute(parseInt(iftarMinutes)).second(0)
  
  // Check if we need to show next day's Sehri
  if (now.isAfter(iftarTimeObj)) {
    // After Iftar, show tomorrow's Sehri
    sehriTimeObj = sehriTimeObj.add(1, 'day')
    isNextDaySehri.value = true
    sehriPassed.value = false
    iftarPassed.value = true
    
    const msUntilSehri = sehriTimeObj.diff(now)
    sehriCountdown.value = formatDetailedDuration(msUntilSehri)
    fastingProgress.value = 0
  } else if (now.isBefore(sehriTimeObj)) {
    // Before Sehri, show today's Sehri
    isNextDaySehri.value = false
    sehriPassed.value = false
    iftarPassed.value = false
    
    const msUntilSehri = sehriTimeObj.diff(now)
    sehriCountdown.value = formatDetailedDuration(msUntilSehri)
    fastingProgress.value = 0
  } else {
    // Between Sehri and Iftar, show Iftar countdown and fasting progress
    isNextDaySehri.value = false
    sehriPassed.value = true
    iftarPassed.value = false
    
    const msUntilIftar = iftarTimeObj.diff(now)
    iftarCountdown.value = formatDetailedDuration(msUntilIftar)
    
    // Calculate fasting progress
    const totalFastingTime = iftarTimeObj.diff(sehriTimeObj)
    const elapsedTime = now.diff(sehriTimeObj)
    fastingProgress.value = Math.min(100, Math.max(0, (elapsedTime / totalFastingTime) * 100))
  }
}

const getRamadanMessage = () => {
  const messages = [
    'Ramadan is the month in which the Quran was revealed.',
    'The gates of Paradise are opened during Ramadan.',
    'Laylat al-Qadr (Night of Power) is better than a thousand months.',
    'Fasting in Ramadan is one of the Five Pillars of Islam.',
    'Every good deed in Ramadan is rewarded many times over.',
    'The Prophet (PBUH) would engage in extra worship during Ramadan.',
    'Charity given in Ramadan is especially blessed.',
    'Ramadan teaches patience, self-control, and empathy for the less fortunate.'
  ]
  
  // Return a consistent message based on the day of Ramadan
  return messages[(ramadanDay.value - 1) % messages.length]
}

// Lifecycle
onMounted(() => {
  updateCountdowns()
  countdownInterval = setInterval(updateCountdowns, 1000)
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<style scoped>
.ramadan-card {
  margin-bottom: 2rem;
  background: linear-gradient(135deg, rgba(44, 95, 45, 0.05) 0%, rgba(151, 190, 90, 0.05) 100%);
  border: 2px solid var(--primary-color);
  box-shadow: var(--shadow-lg);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--primary-color);
  font-size: 1.5rem;
}

.card-header i {
  color: var(--accent-color);
  animation: twinkle 2s infinite;
}

@keyframes twinkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.ramadan-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.featured-time-banner {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.featured-info {
  flex: 1;
}

.featured-label {
  font-size: 0.875rem;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.featured-time {
  font-size: 2.5rem;
  margin: 0.5rem 0;
  font-weight: 700;
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

.ramadan-info {
  padding: 0.5rem 0;
}

.info-content p {
  line-height: 1.6;
  color: var(--text-secondary);
  font-style: italic;
}

.ramadan-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background-color: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  text-align: center;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .featured-time-banner {
    flex-direction: column;
    text-align: center;
  }
  
  .countdown {
    text-align: center;
    width: 100%;
  }
  
  .featured-time {
    font-size: 2rem;
  }
  
  .ramadan-stats {
    grid-template-columns: 1fr;
  }
}
</style>
