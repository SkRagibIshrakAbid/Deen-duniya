<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    :closable="true"
    :dismissableMask="true"
    :showHeader="false"
    :style="{ width: '30rem' }"
    :breakpoints="{ '640px': '94vw' }"
    contentClass="announce-content"
    @hide="markSeen"
  >
    <div class="announce">
      <div class="announce-hero">
        <SweepIcon :size="120" />
      </div>
      <span class="announce-badge">New feature</span>
      <h2>Prayer Times, Live on a Globe</h2>
      <p>
        See the real sun light up the Earth and watch the lines where Fajr, Dhuhr, Asr, Maghrib and Isha begin sweep
        around the planet. Somewhere, the call to prayer is always being made.
      </p>
      <div class="announce-actions">
        <Button label="Maybe later" text severity="secondary" @click="isVisible = false" />
        <Button label="Watch it live" icon="pi pi-globe" @click="open" />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import SweepIcon from './SweepIcon.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible', 'open'])

const isVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const markSeen = () => {
  try {
    localStorage.setItem('liveSimAnnounced', 'true')
  } catch {
    /* ignore */
  }
}

const open = () => {
  markSeen()
  isVisible.value = false
  emit('open')
}
</script>

<style scoped>
.announce {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 1.5rem 0.5rem 0.5rem;
}

.announce-hero {
  display: grid;
  place-items: center;
  width: 9rem;
  height: 9rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 156, 255, 0.25), transparent 70%);
}

.announce-badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: var(--primary-color);
  color: #fff;
}

.announce h2 {
  font-size: 1.4rem;
  color: var(--text-color);
}

.announce p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.announce-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
