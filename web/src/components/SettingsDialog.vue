<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    header="Settings"
    :style="{ width: '50rem' }"
    :breakpoints="{ '960px': '75vw', '640px': '94vw' }"
  >
    <div class="settings-content">
      <Accordion :value="['calc']" multiple>
        <!-- Prayer Calculation Settings -->
        <AccordionPanel value="calc">
          <AccordionHeader>Prayer Calculation</AccordionHeader>
          <AccordionContent>
            <div class="settings-section">
              <div class="setting-item">
                <label for="calc-method">Calculation Method</label>
                <Select
                  inputId="calc-method"
                  v-model="localSettings.calculationMethod"
                  :options="settingsStore.calculationMethods"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select calculation method"
                  class="full-width"
                />
                <small>Different authorities use different twilight angles for Fajr and Isha</small>
              </div>

              <div class="setting-item">
                <label for="asr-calc">Asr Calculation</label>
                <SelectButton
                  id="asr-calc"
                  v-model="localSettings.asrCalculation"
                  :options="asrOptions"
                  optionLabel="label"
                  optionValue="value"
                  :allowEmpty="false"
                  class="full-width"
                />
                <small>Shafi (standard) or Hanafi school</small>
              </div>

              <div class="setting-item">
                <label for="hijri-adjust">Hijri Date Adjustment</label>
                <Slider
                  id="hijri-adjust"
                  v-model="localSettings.hijriAdjustment"
                  :min="-2"
                  :max="2"
                  :step="1"
                  class="full-width"
                />
                <div class="adjustment-display">
                  <span>{{ localSettings.hijriAdjustment > 0 ? '+' : '' }}{{ localSettings.hijriAdjustment }} day{{ Math.abs(localSettings.hijriAdjustment) !== 1 ? 's' : '' }}</span>
                </div>
                <small>Adjust the Hijri date to match local moon sighting (-2 to +2 days)</small>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>

        <!-- Display Settings -->
        <AccordionPanel value="display">
          <AccordionHeader>Display</AccordionHeader>
          <AccordionContent>
            <div class="settings-section">
              <div class="setting-item">
                <label for="time-format">Time Format</label>
                <SelectButton
                  id="time-format"
                  v-model="localSettings.timeFormat"
                  :options="timeFormatOptions"
                  optionLabel="label"
                  optionValue="value"
                  :allowEmpty="false"
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
                  :allowEmpty="false"
                  class="full-width"
                />
                <small>Auto follows your device's light/dark setting</small>
              </div>

              <div class="setting-item">
                <label for="language">Language</label>
                <Select
                  inputId="language"
                  v-model="localSettings.language"
                  :options="languageOptions"
                  optionLabel="label"
                  optionValue="value"
                  optionDisabled="disabled"
                  class="full-width"
                />
                <small>More languages coming soon</small>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>

        <!-- Notification Settings -->
        <AccordionPanel value="notifications">
          <AccordionHeader>Notifications</AccordionHeader>
          <AccordionContent>
            <div class="settings-section">
              <div class="setting-item">
                <div class="setting-header">
                  <label for="notif-enabled">Enable Notifications</label>
                  <ToggleSwitch
                    inputId="notif-enabled"
                    v-model="localSettings.notificationsEnabled"
                    @update:modelValue="handleNotificationToggle"
                  />
                </div>
                <small>Reminders appear while Deen Duniya is open in a browser tab or installed as an app.</small>
                <Message v-if="permissionMessage" severity="warn" :closable="false">{{ permissionMessage }}</Message>
              </div>

              <div v-if="localSettings.notificationsEnabled" class="notification-settings">
                <Divider />

                <div class="setting-item">
                  <div class="setting-header">
                    <label>Notify Before Prayer</label>
                    <ToggleSwitch v-model="localSettings.notifyBeforePrayer" />
                  </div>
                  <div v-if="localSettings.notifyBeforePrayer" class="sub-setting">
                    <label for="before-minutes">Minutes before:</label>
                    <InputNumber
                      inputId="before-minutes"
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
                    <ToggleSwitch v-model="localSettings.notifyAtPrayer" />
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-header">
                    <label>Notify Before Prayer Time Ends</label>
                    <ToggleSwitch v-model="localSettings.notifyPrayerEnd" />
                  </div>
                  <div v-if="localSettings.notifyPrayerEnd" class="sub-setting">
                    <label for="end-minutes">Minutes before end:</label>
                    <InputNumber
                      inputId="end-minutes"
                      v-model="localSettings.notifyPrayerEndMinutes"
                      :min="1"
                      :max="60"
                      showButtons
                      class="compact-input"
                    />
                  </div>
                  <small>Fajr ends at sunrise, Isha at Islamic midnight, others at the next prayer.</small>
                </div>

                <Divider />

                <div class="setting-item">
                  <label>Prayer-specific Notifications</label>
                  <div class="prayer-toggles">
                    <div v-for="name in prayerNames" :key="name" class="prayer-toggle">
                      <label>{{ name }}</label>
                      <ToggleSwitch v-model="localSettings[`notify${name}`]" />
                    </div>
                  </div>
                </div>

                <Divider />

                <div class="setting-item">
                  <div class="setting-header">
                    <label>Ramadan Notifications</label>
                    <ToggleSwitch v-model="localSettings.notifyRamadan" />
                  </div>
                  <div v-if="localSettings.notifyRamadan" class="ramadan-settings">
                    <div class="sub-setting">
                      <label>Sehri Reminders (15 min before and at the end)</label>
                      <ToggleSwitch v-model="localSettings.notifyRamadanSehri" />
                    </div>
                    <div class="sub-setting">
                      <label>Iftar Reminder (5 min before)</label>
                      <ToggleSwitch v-model="localSettings.notifyRamadanIftar" />
                    </div>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-header">
                    <label>Notification Sound</label>
                    <ToggleSwitch v-model="localSettings.notificationSound" />
                  </div>
                </div>

                <Button
                  label="Send test notification"
                  icon="pi pi-send"
                  size="small"
                  outlined
                  @click="sendTestNotification"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
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
import notificationService from '../services/notificationService'

import Dialog from 'primevue/dialog'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Slider from 'primevue/slider'
import ToggleSwitch from 'primevue/toggleswitch'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Message from 'primevue/message'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['update:visible', 'settingsChanged'])

const settingsStore = useSettingsStore()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const localSettings = ref(settingsStore.snapshot())
const permissionMessage = ref('')

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

const deniedText = (reason) =>
  reason === 'unsupported'
    ? 'This browser does not support notifications.'
    : 'Notifications are blocked for this site. Allow them in your browser\'s site settings, then try again.'

// Methods
const handleNotificationToggle = async (enabled) => {
  permissionMessage.value = ''
  if (!enabled) return
  const granted = await settingsStore.requestNotificationPermission()
  if (!granted) {
    localSettings.value.notificationsEnabled = false
    permissionMessage.value = deniedText(settingsStore.notificationPermission)
  }
}

const sendTestNotification = async () => {
  const granted = await settingsStore.requestNotificationPermission()
  if (!granted) {
    permissionMessage.value = deniedText(settingsStore.notificationPermission)
    return
  }
  notificationService.soundEnabled = localSettings.value.notificationSound
  notificationService.showTestNotification()
}

const saveSettings = async () => {
  const s = localSettings.value
  const needsRefresh =
    s.calculationMethod !== settingsStore.calculationMethod ||
    s.asrCalculation !== settingsStore.asrCalculation ||
    s.hijriAdjustment !== settingsStore.hijriAdjustment

  const { notificationsEnabled, ...rest } = s
  settingsStore.update(rest)

  if (notificationsEnabled !== settingsStore.notificationsEnabled) {
    await settingsStore.toggleNotifications(notificationsEnabled)
  }

  if (needsRefresh) emit('settingsChanged')

  closeDialog()
}

const closeDialog = () => {
  isVisible.value = false
}

// Load the current values every time the dialog opens (discarding cancelled edits)
watch(isVisible, (open) => {
  if (open) {
    localSettings.value = settingsStore.snapshot()
    permissionMessage.value = ''
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

.adjustment-display {
  display: flex;
  justify-content: center;
  padding: 0.5rem;
  background-color: var(--bg-color);
  border-radius: 0.5rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 0.5rem;
}

.sub-setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: var(--bg-color);
  border-radius: 0.5rem;
  margin-left: 1.5rem;
  overflow: hidden;
}

.sub-setting label {
  flex: 1;
  min-width: 0;
}

.compact-input {
  width: 120px;
  min-width: 100px;
  flex-shrink: 0;
}

.compact-input :deep(.p-inputnumber) {
  width: 100%;
  max-width: 100%;
}

.compact-input :deep(.p-inputnumber-input) {
  width: 100%;
  max-width: 100%;
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
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .sub-setting label {
    flex: none;
  }
  
  .compact-input {
    width: 100%;
  }
}
</style>
