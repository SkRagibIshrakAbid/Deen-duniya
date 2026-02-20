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
        <!-- Sehri (Suhoor) Section -->
        <div class="ramadan-time-section sehri-section">
          <div class="section-icon">
            <i class="pi pi-moon"></i>
          </div>
          <div class="section-content">
            <h3>Sehri (Suhoor)</h3>
            <div class="time-display">
              <span class="time-label">Ends at</span>
              <span class="time-value">{{ formatTime(sehriTime, timeFormat) }}</span>
            </div>
            <div class="countdown-container">
              <div v-if="sehriCountdown && !sehriPassed" class="countdown-text">
                <i class="pi pi-clock"></i>
                Time remaining: <strong>{{ sehriCountdown }}</strong>
              </div>
              <div v-else class="countdown-text passed">
                <i class="pi pi-check-circle"></i>
                Sehri time has passed
              </div>
            </div>
          </div>
        </div>

        <Divider />

        <!-- Iftar Section -->
        <div class="ramadan-time-section iftar-section">
          <div class="section-icon">
            <i class="pi pi-sun"></i>
          </div>
          <div class="section-content">
            <h3>Iftar</h3>
            <div class="time-display">
              <span class="time-label">Maghrib at</span>
              <span class="time-value">{{ formatTime(iftarTime, timeFormat) }}</span>
            </div>
            <div class="countdown-container">
              <div v-if="iftarCountdown && !iftarPassed" class="countdown-text">
                <i class="pi pi-clock"></i>
                Time until Iftar: <strong>{{ iftarCountdown }}</strong>
              </div>
              <div v-else-if="iftarPassed" class="countdown-text passed">
                <i class="pi pi-check-circle"></i>
                May Allah accept your fast
              </div>
            </div>
            <ProgressBar 
              v-if="!iftarPassed" 
              :value="fastingProgress" 
              :showValue="false" 
              class="fasting-progress"
            >
              <template #value>
                <div class="progress-label">{{ fastingProgress.toFixed(0) }}% Complete</div>
              </template>
            </ProgressBar>
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

        <!-- Ramadan Stats -->
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
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePrayerTimesStore } from '../stores/prayerTimesStore'
import { useSettingsStore } from '../stores/settingsStore'
import { formatTime, formatDetailedDuration, getTimeUntilPrayer } from '../utils/dateUtils'
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
let countdownInterval = null

// Computed
const sehriTime = computed(() => prayerTimesStore.sehriTime)
const iftarTime = computed(() => prayerTimesStore.iftarTime)
const ramadanDay = computed(() => prayerTimesStore.ramadanDay)
const timeFormat = computed(() => settingsStore.timeFormat)

// Methods
const updateCountdowns = () => {
  const now = dayjs()
  
  // Sehri countdown
  if (sehriTime.value) {
    const msUntilSehri = getTimeUntilPrayer(sehriTime.value)
    if (msUntilSehri > 0) {
      sehriCountdown.value = formatDetailedDuration(msUntilSehri)
      sehriPassed.value = false
    } else {
      sehriPassed.value = true
    }
  }
  
  // Iftar countdown
  if (iftarTime.value) {
    const msUntilIftar = getTimeUntilPrayer(iftarTime.value)
    if (msUntilIftar > 0) {
      iftarCountdown.value = formatDetailedDuration(msUntilIftar)
      iftarPassed.value = false
      
      // Calculate fasting progress (from Fajr to Maghrib)
      if (sehriTime.value) {
        const [sehriHours, sehriMinutes] = sehriTime.value.split(':')
        const [iftarHours, iftarMinutes] = iftarTime.value.split(':')
        
        const sehriTimeObj = now.clone().hour(parseInt(sehriHours)).minute(parseInt(sehriMinutes)).second(0)
        const iftarTimeObj = now.clone().hour(parseInt(iftarHours)).minute(parseInt(iftarMinutes)).second(0)
        
        if (now.isAfter(sehriTimeObj) && now.isBefore(iftarTimeObj)) {
          const totalFastingTime = iftarTimeObj.diff(sehriTimeObj)
          const elapsedTime = now.diff(sehriTimeObj)
          fastingProgress.value = (elapsedTime / totalFastingTime) * 100
        } else if (now.isBefore(sehriTimeObj)) {
          fastingProgress.value = 0
        } else {
          fastingProgress.value = 100
        }
      }
    } else {
      iftarPassed.value = true
      fastingProgress.value = 100
    }
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

.ramadan-time-section {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  padding: 1.5rem;
  background-color: var(--surface-color);
  border-radius: 1rem;
  box-shadow: var(--shadow);
}

.section-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border-radius: 50%;
  font-size: 1.75rem;
  color: white;
  flex-shrink: 0;
}

.section-content {
  flex: 1;
}

.section-content h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.time-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.time-label {
  color: var(--text-secondary);
}

.time-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary-color);
  font-variant-numeric: tabular-nums;
}

.countdown-container {
  margin-top: 1rem;
}

.countdown-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  color: var(--text-color);
}

.countdown-text strong {
  color: var(--primary-color);
}

.countdown-text.passed {
  color: var(--text-secondary);
}

.fasting-progress {
  margin-top: 1rem;
  height: 12px;
}

.progress-label {
  font-size: 0.75rem;
  font-weight: 600;
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
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background-color: var(--surface-color);
  border: 2px solid var(--border-color);
  border-radius: 1rem;
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
  .ramadan-time-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .time-display {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
