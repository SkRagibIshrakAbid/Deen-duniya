<template>
  <Dialog 
    v-model:visible="isVisible" 
    modal 
    :closable="false"
    :style="{ width: '90%', maxWidth: '600px' }"
    header="Calibrate Islamic Calendar"
  >
    <div class="calibration-content">
      <div class="calibration-intro">
        <i class="pi pi-calendar" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
        <h3>When did Ramadan start in your area?</h3>
        <p>Help us calibrate the Islamic calendar based on moon sighting in your region.</p>
      </div>

      <div class="date-options">
        <div 
          v-for="option in dateOptions" 
          :key="option.adjustment"
          class="date-option"
          :class="{ 'selected': selectedAdjustment === option.adjustment }"
          @click="selectedAdjustment = option.adjustment"
        >
          <div class="option-header">
            <i class="pi pi-check-circle" v-if="selectedAdjustment === option.adjustment"></i>
            <div class="option-content">
              <span class="option-date">Ramadan started on {{ option.displayDate }}</span>
              <span class="option-hijri">{{ option.hijriDate }}</span>
            </div>
            <Tag v-if="option.adjustment === 0" value="Default" severity="info" />
          </div>
        </div>
      </div>

      <Message severity="info" :closable="false" class="info-message">
        <template #messageicon>
          <i class="pi pi-info-circle"></i>
        </template>
        You can always adjust this later in the Settings panel.
      </Message>
    </div>

    <template #footer>
      <Button 
        label="Confirm" 
        icon="pi pi-check" 
        @click="confirmSelection"
        :disabled="selectedAdjustment === null"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePrayerTimesStore } from '../stores/prayerTimesStore'
import { useSettingsStore } from '../stores/settingsStore'
import dayjs from 'dayjs'

import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'calibrated'])

const prayerTimesStore = usePrayerTimesStore()
const settingsStore = useSettingsStore()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const selectedAdjustment = ref(0) // Default to 0

// Generate date options (-2, -1, 0, +1, +2)
const dateOptions = computed(() => {
  const options = []
  const today = dayjs() // Current date
  const ramadanDay = prayerTimesStore.ramadanDay || 1
  
  for (let adjustment = -2; adjustment <= 2; adjustment++) {
    // Calculate when Ramadan 1st started with this adjustment
    // adjustment +1 means Hijri date is 1 day ahead (Ramadan started earlier)
    // adjustment -1 means Hijri date is 1 day behind (Ramadan started later)
    const todayRamadanDay = ramadanDay + adjustment
    const ramadanStartDate = today.subtract(todayRamadanDay - 1, 'day')
    
    options.push({
      adjustment,
      displayDate: ramadanStartDate.format('MMM D, YYYY'),
      hijriDate: `Today is Ramadan ${todayRamadanDay}`,
      startDate: ramadanStartDate
    })
  }
  
  return options
})

// Watch for when dialog opens to fetch current prayer times data
watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedAdjustment.value = 0 // Reset to default
  }
})

const confirmSelection = () => {
  // Set the hijri adjustment in settings
  settingsStore.setHijriAdjustment(selectedAdjustment.value)
  
  // Mark calibration as done
  localStorage.setItem('hijriCalibrated', 'true')
  
  // Emit event to parent
  emit('calibrated', selectedAdjustment.value)
  
  // Close dialog
  isVisible.value = false
}
</script>

<style scoped>
.calibration-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.calibration-intro {
  text-align: center;
}

.calibration-intro h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.calibration-intro p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.date-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.date-option {
  padding: 1rem;
  border: 2px solid var(--surface-border);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: var(--surface-ground);
}

.date-option:hover {
  border-color: var(--primary-color);
  background-color: var(--surface-hover);
}

.date-option.selected {
  border-color: var(--primary-color);
  background-color: var(--primary-50);
}

.option-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.option-header .pi-check-circle {
  color: var(--primary-color);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-date {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-color);
}

.option-hijri {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.info-message {
  margin-top: 0.5rem;
}

.info-message :deep(.p-message-text) {
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .calibration-intro h3 {
    font-size: 1.25rem;
  }
  
  .date-option {
    padding: 0.875rem;
  }
}
</style>
