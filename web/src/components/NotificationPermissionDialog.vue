<template>
  <Dialog 
    v-model:visible="isVisible" 
    modal 
    :closable="false"
    :style="{ width: '90%', maxWidth: '600px' }"
    header="Enable Notifications"
  >
    <div class="notification-content">
      <div class="notification-intro">
        <i class="pi pi-bell" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
        <h3>Stay Connected with Your Prayer Times</h3>
        <p>Get timely reminders for your prayers and Ramadan events</p>
      </div>

      <div class="benefits-list">
        <h4>With notifications enabled, you'll receive:</h4>
        <div class="benefit-item">
          <i class="pi pi-check-circle"></i>
          <div class="benefit-text">
            <strong>Prayer Time Alerts</strong>
            <span>Get notified before each prayer time and when it starts</span>
          </div>
        </div>
        <div class="benefit-item">
          <i class="pi pi-check-circle"></i>
          <div class="benefit-text">
            <strong>End of Prayer Window</strong>
            <span>Reminders before each prayer time ends</span>
          </div>
        </div>
        <div class="benefit-item">
          <i class="pi pi-check-circle"></i>
          <div class="benefit-text">
            <strong>Ramadan Reminders</strong>
            <span>Special notifications for Sehri and Iftar during Ramadan</span>
          </div>
        </div>
        <div class="benefit-item">
          <i class="pi pi-check-circle"></i>
          <div class="benefit-text">
            <strong>Customizable</strong>
            <span>Choose which notifications you want to receive</span>
          </div>
        </div>
      </div>

      <Message severity="info" :closable="false" class="manage-note">
        <template #messageicon>
          <i class="pi pi-info-circle"></i>
        </template>
        You can always enable or disable notifications later by clicking the bell icon in the header 
        or through the Settings panel.
      </Message>

      <div class="permission-warning" v-if="showPermissionWarning">
        <Message severity="warn" :closable="false">
          <strong>Browser Permission Required:</strong> You'll need to allow notifications in your browser when prompted.
        </Message>
      </div>
    </div>

    <template #footer>
      <div class="footer-actions">
        <Button 
          label="Maybe Later" 
          icon="pi pi-times" 
          @click="skipNotifications"
          text
          severity="secondary"
        />
        <Button 
          label="Enable Notifications" 
          icon="pi pi-bell" 
          @click="enableNotifications"
          :loading="isEnabling"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'

import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Message from 'primevue/message'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'completed'])

const settingsStore = useSettingsStore()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEnabling = ref(false)
const showPermissionWarning = ref(false)

const enableNotifications = async () => {
  isEnabling.value = true
  showPermissionWarning.value = true
  
  try {
    // Request notification permission
    await settingsStore.toggleNotifications(true)
    
    // Mark as completed
    localStorage.setItem('notificationPromptShown', 'true')
    
    // Close dialog
    emit('completed', true)
    isVisible.value = false
  } catch (error) {
    console.error('Failed to enable notifications:', error)
  } finally {
    isEnabling.value = false
    showPermissionWarning.value = false
  }
}

const skipNotifications = () => {
  // Mark as completed (user chose to skip)
  localStorage.setItem('notificationPromptShown', 'true')
  
  emit('completed', false)
  isVisible.value = false
}
</script>

<style scoped>
.notification-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.notification-intro {
  text-align: center;
}

.notification-intro h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.notification-intro p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.benefits-list h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.1rem;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem;
  background-color: var(--surface-ground);
  border-radius: 0.5rem;
  border-left: 3px solid var(--primary-color);
}

.benefit-item .pi-check-circle {
  color: var(--primary-color);
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.benefit-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.benefit-text strong {
  color: var(--text-color);
  font-size: 1rem;
}

.benefit-text span {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.manage-note {
  margin-top: 0.5rem;
}

.manage-note :deep(.p-message-text) {
  font-size: 0.875rem;
  line-height: 1.5;
}

.permission-warning {
  margin-top: -0.5rem;
}

.footer-actions {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
}

@media (max-width: 768px) {
  .notification-intro h3 {
    font-size: 1.25rem;
  }
  
  .benefit-item {
    padding: 0.625rem;
  }
  
  .footer-actions {
    flex-direction: column-reverse;
  }
  
  .footer-actions button {
    width: 100%;
  }
}
</style>
