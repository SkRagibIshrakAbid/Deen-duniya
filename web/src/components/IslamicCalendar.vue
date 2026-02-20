<template>
  <Card class="calendar-card">
    <template #title>
      <div class="card-header">
        <i class="pi pi-calendar"></i>
        Islamic Calendar
      </div>
    </template>
    <template #content>
      <div class="calendar-controls">
        <Button 
          icon="pi pi-chevron-left" 
          @click="previousMonth" 
          outlined 
          size="small"
        />
        <div class="current-month">
          <span class="hijri-month">{{ currentHijriMonth }}</span>
          <span class="hijri-year">{{ currentHijriYear }} AH</span>
        </div>
        <Button 
          icon="pi pi-chevron-right" 
          @click="nextMonth" 
          outlined 
          size="small"
        />
      </div>

      <DataView v-if="monthlyData.length > 0" :value="monthlyData" class="calendar-view">
        <template #list="slotProps">
          <div class="calendar-list">
            <div 
              v-for="(day, index) in slotProps.items"
              :key="index"
              class="calendar-day-item"
              :class="{ 'today': isToday(day), 'friday': isFriday(day), 'holiday': hasHoliday(day) }"
            >
              <div class="day-header">
                <div class="date-info">
                  <span class="gregorian-date">{{ formatGregorianDate(day.date.gregorian) }}</span>
                  <span class="hijri-date">{{ formatHijriDate(day.date.hijri) }}</span>
                </div>
                <div v-if="hasHoliday(day)" class="holiday-badge">
                  <Tag :value="day.date.hijri.holidays[0]" severity="success" />
                </div>
                <div v-if="isFriday(day)" class="friday-badge">
                  <Tag value="Jumu'ah" severity="info" />
                </div>
              </div>
              
              <Divider />
              
              <div class="prayer-times-compact">
                <div class="prayer-time-item">
                  <span class="prayer-label">Fajr</span>
                  <span class="prayer-time">{{ formatTime(day.timings.Fajr, timeFormat) }}</span>
                </div>
                <div class="prayer-time-item">
                  <span class="prayer-label">Dhuhr</span>
                  <span class="prayer-time">{{ formatTime(day.timings.Dhuhr, timeFormat) }}</span>
                </div>
                <div class="prayer-time-item">
                  <span class="prayer-label">Asr</span>
                  <span class="prayer-time">{{ formatTime(day.timings.Asr, timeFormat) }}</span>
                </div>
                <div class="prayer-time-item">
                  <span class="prayer-label">Maghrib</span>
                  <span class="prayer-time">{{ formatTime(day.timings.Maghrib, timeFormat) }}</span>
                </div>
                <div class="prayer-time-item">
                  <span class="prayer-label">Isha</span>
                  <span class="prayer-time">{{ formatTime(day.timings.Isha, timeFormat) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </DataView>

      <div v-else-if="!isLoading" class="empty-calendar">
        <p>Select a month to view the Islamic calendar</p>
      </div>

      <div v-if="isLoading" class="loading-calendar">
        <ProgressSpinner />
        <p>Loading calendar...</p>
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePrayerTimesStore } from '../stores/prayerTimesStore'
import { useLocationStore } from '../stores/locationStore'
import { useSettingsStore } from '../stores/settingsStore'
import { formatTime } from '../utils/dateUtils'
import dayjs from 'dayjs'

import Card from 'primevue/card'
import Button from 'primevue/button'
import DataView from 'primevue/dataview'
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'

const prayerTimesStore = usePrayerTimesStore()
const locationStore = useLocationStore()
const settingsStore = useSettingsStore()

// State
const currentMonth = ref(dayjs().month() + 1) // 1-12
const currentYear = ref(dayjs().year())
const monthlyData = ref([])
const isLoading = ref(false)
const currentHijriMonth = ref('')
const currentHijriYear = ref('')

// Computed
const timeFormat = computed(() => settingsStore.timeFormat)

// Methods
const fetchMonthlyCalendar = async () => {
  if (!locationStore.hasLocation) return
  
  isLoading.value = true
  try {
    await prayerTimesStore.fetchMonthlyCalendar(currentYear.value, currentMonth.value)
    monthlyData.value = prayerTimesStore.monthlyTimings || []
    
    // Get Hijri month info from first day
    if (monthlyData.value.length > 0) {
      const firstDay = monthlyData.value[0]
      currentHijriMonth.value = firstDay.date.hijri.month.en
      currentHijriYear.value = firstDay.date.hijri.year
    }
  } catch (error) {
    console.error('Error fetching monthly calendar:', error)
  } finally {
    isLoading.value = false
  }
}

const previousMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  fetchMonthlyCalendar()
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  fetchMonthlyCalendar()
}

const formatGregorianDate = (gregorian) => {
  return `${gregorian.weekday.en}, ${gregorian.day} ${gregorian.month.en} ${gregorian.year}`
}

const formatHijriDate = (hijri) => {
  return `${hijri.day} ${hijri.month.en} ${hijri.year} AH`
}

const isToday = (day) => {
  const today = dayjs().format('DD-MM-YYYY')
  return day.date.gregorian.date === today
}

const isFriday = (day) => {
  return day.date.gregorian.weekday.en === 'Friday'
}

const hasHoliday = (day) => {
  return day.date.hijri.holidays && day.date.hijri.holidays.length > 0
}

// Lifecycle
onMounted(() => {
  if (locationStore.hasLocation) {
    fetchMonthlyCalendar()
  }
})

// Watch for location changes
watch(() => locationStore.hasLocation, (hasLocation) => {
  if (hasLocation) {
    fetchMonthlyCalendar()
  }
})
</script>

<style scoped>
.calendar-card {
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

.calendar-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: var(--bg-color);
  border-radius: 0.75rem;
}

.current-month {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.hijri-month {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
}

.hijri-year {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.calendar-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calendar-day-item {
  background-color: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  transition: all 0.3s;
}

.calendar-day-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow);
}

.calendar-day-item.today {
  border-color: var(--primary-color);
  background-color: rgba(44, 95, 45, 0.05);
}

.calendar-day-item.friday {
  background-color: rgba(14, 165, 233, 0.05);
}

.calendar-day-item.holiday {
  background-color: rgba(212, 175, 55, 0.05);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.gregorian-date {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
}

.hijri-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.holiday-badge,
.friday-badge {
  margin-left: auto;
}

.prayer-times-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
}

.prayer-time-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background-color: var(--surface-color);
  border-radius: 0.5rem;
  text-align: center;
}

.prayer-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prayer-time {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary-color);
  font-variant-numeric: tabular-nums;
}

.empty-calendar,
.loading-calendar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .prayer-times-compact {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .day-header {
    flex-direction: column;
  }
  
  .holiday-badge,
  .friday-badge {
    margin-left: 0;
  }
}
</style>
