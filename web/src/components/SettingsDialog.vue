<template>
  <Dialog 
    v-model:visible="isVisible" 
    modal 
    :header="'Settings'" 
    :style="{ width: '50rem' }"
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
  >
    <div class="settings-content">
      <Accordion :multiple="true" :activeIndex="[0]">
        <!-- Prayer Calculation Settings -->
        <AccordionTab header="Prayer Calculation">
          <div class="settings-section">
            <div class="setting-item">
              <label for="calc-method">Calculation Method</label>
              <Dropdown 
                id="calc-method"
                v-model="localSettings.calculationMethod" 
                :options="settingsStore.calculationMethods" 
                optionLabel="name"
                optionValue="id"
                placeholder="Select calculation method"
                class="full-width"
              />
              <small>Different schools of thought use different calculation methods</small>
            </div>

            <div class="setting-item">
              <label for="asr-calc">Asr Calculation</label>
              <SelectButton 
                id="asr-calc"
                v-model="localSettings.asrCalculation" 
                :options="asrOptions" 
                optionLabel="label"
                optionValue="value"
                class="full-width"
              />
              <small>Shafi (standard) or Hanafi school</small>
            </div>
          </div>
        </AccordionTab>

        <!-- Display Settings -->
        <AccordionTab header="Display">
          <div class="settings-section">
            <div class="setting-item">
              <label for="time-format">Time Format</label>
              <SelectButton 
                id="time-format"
                v-model="localSettings.timeFormat" 
                :options="timeFormatOptions" 
                optionLabel="label"
                optionValue="value"
                class="full-width"
              />
            </div>

            <div class="setting-item">
              <label for="theme">Theme</label>
              <SelectButton 
                id="theme"
                v-model="localSettings.theme" 
                :options="themeOptions" 
                optionLabel="label"
                optionValue="value"
                class="full-width"
              />
            </div>

            <div class="setting-item">
              <label for="language">Language</label>
              <Dropdown 
                id="language"
                v-model="localSettings.language" 
                :options="languageOptions" 
                optionLabel="label"
                optionValue="value"
                placeholder="Select language"
                class="full-width"
              />
              <small>More languages coming soon</small>
            </div>
          </div>
        </AccordionTab>

        <!-- Notification Settings -->
        <AccordionTab header="Notifications">
          <div class="settings-section">
            <div class="setting-item">
              <div class="setting-header">
                <label>Enable Notifications</label>
                <InputSwitch v-model="localSettings.notificationsEnabled" @change="handleNotificationToggle" />
              </div>
              <small>Receive browser notifications for prayer times</small>
            </div>

            <Divider />

            <div v-if="localSettings.notificationsEnabled" class="notification-settings">
              <div class="setting-item">
                <div class="setting-header">
                  <label>Notify Before Prayer</label>
                  <InputSwitch v-model="localSettings.notifyBeforePrayer" />
                </div>
                <div v-if="localSettings.notifyBeforePrayer" class="sub-setting">
                  <label for="before-minutes">Minutes before:</label>
                  <InputNumber 
                    id="before-minutes"
                    v-model="localSettings.notifyBeforeMinutes" 
                    :min="1" 
                    :max="60"
                    showButtons
                    class="compact-input"
                  />
                </div>
              </div>

              <div class="setting-item">
                <div class="setting-header">
                  <label>Notify At Prayer Time</label>
                  <InputSwitch v-model="localSettings.notifyAtPrayer" />
                </div>
              </div>

              <div class="setting-item">
                <div class="setting-header">
                  <label>Notify Before Prayer Ends</label>
                  <InputSwitch v-model="localSettings.notifyPrayerEnd" />
                </div>
                <div v-if="localSettings.notifyPrayerEnd" class="sub-setting">
                  <label for="end-minutes">Minutes before end:</label>
                  <InputNumber 
                    id="end-minutes"
                    v-model="localSettings.notifyPrayerEndMinutes" 
                    :min="1" 
                    :max="60"
                    showButtons
                    class="compact-input"
                  />
                </div>
              </div>

              <Divider />

              <div class="setting-item">
                <label>Prayer-specific Notifications</label>
                <div class="prayer-toggles">
                  <div class="prayer-toggle">
                    <label>Fajr</label>
                    <InputSwitch v-model="localSettings.notifyFajr" />
                  </div>
                  <div class="prayer-toggle">
                    <label>Dhuhr</label>
                    <InputSwitch v-model="localSettings.notifyDhuhr" />
                  </div>
                  <div class="prayer-toggle">
                    <label>Asr</label>
                    <InputSwitch v-model="localSettings.notifyAsr" />
                  </div>
                  <div class="prayer-toggle">
                    <label>Maghrib</label>
                    <InputSwitch v-model="localSettings.notifyMaghrib" />
                  </div>
                  <div class="prayer-toggle">
                    <label>Isha</label>
                    <InputSwitch v-model="localSettings.notifyIsha" />
                  </div>
                </div>
              </div>

              <Divider />

              <div class="setting-item">
                <div class="setting-header">
                  <label>Ramadan Notifications</label>
                  <InputSwitch v-model="localSettings.notifyRamadan" />
                </div>
                <div v-if="localSettings.notifyRamadan" class="ramadan-settings">
                  <div class="sub-setting">
                    <label>Sehri Reminders</label>
                    <InputSwitch v-model="localSettings.notifyRamadanSehri" />
                  </div>
                  <div class="sub-setting">
                    <label>Iftar Reminders</label>
                    <InputSwitch v-model="localSettings.notifyRamadanIftar" />
                  </div>
                </div>
              </div>

              <div class="setting-item">
                <div class="setting-header">
                  <label>Notification Sound</label>
                  <InputSwitch v-model="localSettings.notificationSound" />
                </div>
              </div>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" @click="closeDialog" text />
      <Button label="Save Settings" icon="pi pi-check" @click="saveSettings" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'

import Dialog from 'primevue/dialog'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import Dropdown from 'primevue/dropdown'
import SelectButton from 'primevue/selectbutton'
import InputSwitch from 'primevue/inputswitch'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Divider from 'primevue/divider'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['update:visible'])

const settingsStore = useSettingsStore()

// State
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const localSettings = ref({
  calculationMethod: settingsStore.calculationMethod,
  asrCalculation: settingsStore.asrCalculation,
  timeFormat: settingsStore.timeFormat,
  language: settingsStore.language,
  theme: settingsStore.theme,
  notificationsEnabled: settingsStore.notificationsEnabled,
  notifyBeforePrayer: settingsStore.notifyBeforePrayer,
  notifyBeforeMinutes: settingsStore.notifyBeforeMinutes,
  notifyAtPrayer: settingsStore.notifyAtPrayer,
  notifyPrayerEnd: settingsStore.notifyPrayerEnd,
  notifyPrayerEndMinutes: settingsStore.notifyPrayerEndMinutes,
  notifyRamadan: settingsStore.notifyRamadan,
  notifyRamadanSehri: settingsStore.notifyRamadanSehri,
  notifyRamadanIftar: settingsStore.notifyRamadanIftar,
  notificationSound: settingsStore.notificationSound,
  notifyFajr: settingsStore.notifyFajr,
  notifyDhuhr: settingsStore.notifyDhuhr,
  notifyAsr: settingsStore.notifyAsr,
  notifyMaghrib: settingsStore.notifyMaghrib,
  notifyIsha: settingsStore.notifyIsha
})

// Options
const asrOptions = [
  { label: 'Shafi (Standard)', value: 0 },
  { label: 'Hanafi', value: 1 }
]

const timeFormatOptions = [
  { label: '12 Hour', value: '12' },
  { label: '24 Hour', value: '24' }
]

const themeOptions = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Auto', value: 'auto' }
]

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'العربية (Coming Soon)', value: 'ar', disabled: true }
]

// Methods
const handleNotificationToggle = async () => {
  if (localSettings.value.notificationsEnabled) {
    const granted = await settingsStore.requestNotificationPermission()
    if (!granted) {
      localSettings.value.notificationsEnabled = false
    }
  }
}

const saveSettings = () => {
  // Save all settings
  settingsStore.setCalculationMethod(localSettings.value.calculationMethod)
  settingsStore.setAsrCalculation(localSettings.value.asrCalculation)
  settingsStore.setTimeFormat(localSettings.value.timeFormat)
  settingsStore.setLanguage(localSettings.value.language)
  settingsStore.setTheme(localSettings.value.theme)
  
  settingsStore.updateNotificationSettings({
    notifyBeforePrayer: localSettings.value.notifyBeforePrayer,
    notifyBeforeMinutes: localSettings.value.notifyBeforeMinutes,
    notifyAtPrayer: localSettings.value.notifyAtPrayer,
    notifyPrayerEnd: localSettings.value.notifyPrayerEnd,
    notifyPrayerEndMinutes: localSettings.value.notifyPrayerEndMinutes,
    notifyRamadan: localSettings.value.notifyRamadan,
    notifyRamadanSehri: localSettings.value.notifyRamadanSehri,
    notifyRamadanIftar: localSettings.value.notifyRamadanIftar,
    notificationSound: localSettings.value.notificationSound,
    notifyFajr: localSettings.value.notifyFajr,
    notifyDhuhr: localSettings.value.notifyDhuhr,
    notifyAsr: localSettings.value.notifyAsr,
    notifyMaghrib: localSettings.value.notifyMaghrib,
    notifyIsha: localSettings.value.notifyIsha
  })
  
  if (localSettings.value.notificationsEnabled !== settingsStore.notificationsEnabled) {
    settingsStore.toggleNotifications(localSettings.value.notificationsEnabled)
  }
  
  closeDialog()
}

const closeDialog = () => {
  isVisible.value = false
}

// Watch for dialog open to reset local settings
watch(isVisible, (newVal) => {
  if (newVal) {
    localSettings.value = {
      calculationMethod: settingsStore.calculationMethod,
      asrCalculation: settingsStore.asrCalculation,
      timeFormat: settingsStore.timeFormat,
      language: settingsStore.language,
      theme: settingsStore.theme,
      notificationsEnabled: settingsStore.notificationsEnabled,
      notifyBeforePrayer: settingsStore.notifyBeforePrayer,
      notifyBeforeMinutes: settingsStore.notifyBeforeMinutes,
      notifyAtPrayer: settingsStore.notifyAtPrayer,
      notifyPrayerEnd: settingsStore.notifyPrayerEnd,
      notifyPrayerEndMinutes: settingsStore.notifyPrayerEndMinutes,
      notifyRamadan: settingsStore.notifyRamadan,
      notifyRamadanSehri: settingsStore.notifyRamadanSehri,
      notifyRamadanIftar: settingsStore.notifyRamadanIftar,
      notificationSound: settingsStore.notificationSound,
      notifyFajr: settingsStore.notifyFajr,
      notifyDhuhr: settingsStore.notifyDhuhr,
      notifyAsr: settingsStore.notifyAsr,
      notifyMaghrib: settingsStore.notifyMaghrib,
      notifyIsha: settingsStore.notifyIsha
    }
  }
})
</script>

<style scoped>
.settings-content {
  padding: 1rem 0;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setting-item label {
  font-weight: 600;
  color: var(--text-color);
}

.setting-item small {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.full-width {
  width: 100%;
}

.sub-setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--bg-color);
  border-radius: 0.5rem;
  margin-left: 1.5rem;
}

.compact-input {
  width: 150px;
}

.prayer-toggles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
}

.prayer-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--bg-color);
  border-radius: 0.5rem;
}

.ramadan-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.notification-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .prayer-toggles {
    grid-template-columns: 1fr;
  }
  
  .sub-setting {
    margin-left: 0;
  }
  
  .compact-input {
    width: 120px;
  }
}
</style>
