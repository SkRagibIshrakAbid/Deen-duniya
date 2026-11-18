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
          @click="changeMonth(-1)"
          outlined
          size="small"
          aria-label="Previous month"
        />
        <div class="current-month">
          <span class="hijri-month">{{ gregorianLabel }}</span>
          <span v-if="hijriRange" class="hijri-year">{{ hijriRange }}</span>
          <Button
            v-if="!isCurrentMonth"
            label="Today"
            icon="pi pi-calendar-clock"
            size="small"
            text
            @click="goToToday"
          />
        </div>
        <Button
          icon="pi pi-chevron-right"
          @click="changeMonth(1)"
          outlined
          size="small"
          aria-label="Next month"
        />
      </div>

      <div v-if="isLoading" class="loading-calendar">
        <ProgressSpinner />
        <p>Loading calendar...</p>
      </div>

      <div v-else-if="calendarError" class="empty-calendar">
        <Message severity="error" :closable="false">{{ calendarError }}</Message>
        <Button label="Try again" icon="pi pi-refresh" size="small" outlined @click="fetchMonthlyCalendar" />
      </div>

      <div v-else-if="monthlyData.length > 0" ref="listEl" class="calendar-list">
        <div
          v-for="day in monthlyData"
          :key="day.date.gregorian.date"
          class="calendar-day-item"
          :class="{ today: isToday(day), friday: isFriday(day), holiday: hasHoliday(day) }"
          :data-today="isToday(day) || null"
        >
          <div class="day-header">
            <div class="date-info">
              <span class="gregorian-date">{{ formatGregorianDate(day.date.gregorian) }}</span>
              <span class="hijri-date">{{ formatHijriDate(day.date.hijri) }}</span>
            </div>
            <div class="badges">
              <Tag v-if="isToday(day)" value="Today" severity="success" />
              <Tag
                v-for="holiday in day.date.hijri.holidays || []"
                :key="holiday"
                :value="holiday"
                severity="warn"
              />
              <Tag v-if="isFriday(day)" value="Jumu'ah" severity="info" />
            </div>
          </div>

          <Divider />

          <div class="prayer-times-compact">
            <div v-for="name in prayerNames" :key="name" class="prayer-time-item">
              <span class="prayer-label">{{ name }}</span>
              <span class="prayer-time">{{ formatTime(day.timings[name], timeFormat) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-calendar">
        <p>Set your location to view the monthly calendar.</p>
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import { usePrayerTimesStore } from '../stores/prayerTimesStore'
import { useLocationStore } from '../stores/locationStore'
import { useSettingsStore } from '../stores/settingsStore'
import { formatTime, formatHijriDate, nowInTz, todayInTz } from '../utils/dateUtils'

import Card from 'primevue/card'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

const prayerTimesStore = usePrayerTimesStore()
const locationStore = useLocationStore()
const settingsStore = useSettingsStore()

const today = () => nowInTz(prayerTimesStore.effectiveTimezone)

// State
const currentMonth = ref(today().month() + 1) // 1-12
const currentYear = ref(today().year())
const listEl = ref(null)

// Computed
const timeFormat = computed(() => settingsStore.timeFormat)
const monthlyData = computed(() => prayerTimesStore.monthlyTimings || [])
const isLoading = computed(() => prayerTimesStore.calendarLoading)
const calendarError = computed(() => prayerTimesStore.calendarError)
const prayerNames = prayerTimesStore.prayerNames

const gregorianLabel = computed(() =>
  dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`).format('MMMM YYYY')
)

// A Gregorian month spans two (occasionally three) Hijri months
const hijriRange = computed(() => {
  if (!monthlyData.value.length) return ''
  const first = monthlyData.value[0].date.hijri
  const last = monthlyData.value[monthlyData.value.length - 1].date.hijri
  if (first.month.number === last.month.number) return `${first.month.en} ${first.year} AH`
  if (first.year === last.year) return `${first.month.en} – ${last.month.en} ${last.year} AH`
  return `${first.month.en} ${first.year} – ${last.month.en} ${last.year} AH`
})

const isCurrentMonth = computed(() => {
  const t = today()
  return currentMonth.value === t.month() + 1 && currentYear.value === t.year()
})

// Methods
const scrollToToday = async () => {
  await nextTick()
  const el = listEl.value?.querySelector('[data-today]')
  if (el && listEl.value) {
    listEl.value.scrollTo({ top: el.offsetTop - listEl.value.offsetTop, behavior: 'smooth' })
  }
}

const fetchMonthlyCalendar = async () => {
  if (!locationStore.hasLocation) return
  await prayerTimesStore.fetchMonthlyCalendar(currentYear.value, currentMonth.value)
  if (isCurrentMonth.value) scrollToToday()
}

const changeMonth = (delta) => {
  const d = dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`).add(delta, 'month')
  currentMonth.value = d.month() + 1
  currentYear.value = d.year()
  fetchMonthlyCalendar()
}

const goToToday = () => {
  const t = today()
  currentMonth.value = t.month() + 1
  currentYear.value = t.year()
  fetchMonthlyCalendar()
}

const formatGregorianDate = (gregorian) =>
  `${gregorian.weekday.en}, ${gregorian.day} ${gregorian.month.en} ${gregorian.year}`

const isToday = (day) => day.date.gregorian.date === todayInTz(prayerTimesStore.effectiveTimezone)
const isFriday = (day) => day.date.gregorian.weekday.en === 'Friday'
const hasHoliday = (day) => (day.date.hijri.holidays?.length || 0) > 0

// Lifecycle
onMounted(fetchMonthlyCalendar)

// Refetch whenever the location or any calculation setting changes
watch(
  () => [
    locationStore.latitude,
    locationStore.longitude,
    settingsStore.calculationMethod,
    settingsStore.asrCalculation,
    settingsStore.hijriAdjustment
  ],
  fetchMonthlyCalendar
)
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

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-left: auto;
}

.calendar-list {
  max-height: 40rem;
  overflow-y: auto;
  padding-right: 0.25rem;
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
