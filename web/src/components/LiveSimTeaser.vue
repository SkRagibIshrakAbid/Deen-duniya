<template>
  <div v-if="visible" class="live-teaser" role="region" aria-label="Live simulation">
    <button type="button" class="teaser-main" @click="emit('open')">
      <SweepIcon :size="40" />
      <span class="teaser-text">
        <span class="teaser-badge">New</span>
        <strong>Watch prayer times sweep across the Earth</strong>
        <span class="teaser-sub">A live 3D globe showing where Fajr, Dhuhr, Asr, Maghrib and Isha are starting right now.</span>
      </span>
      <i class="pi pi-arrow-right teaser-arrow"></i>
    </button>
    <button type="button" class="teaser-close" aria-label="Dismiss" @click="dismiss">
      <i class="pi pi-times"></i>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SweepIcon from './SweepIcon.vue'

const emit = defineEmits(['open'])

const KEY = 'liveSimTeaserDismissed'
const visible = ref(localStorage.getItem(KEY) !== 'true')

const dismiss = () => {
  visible.value = false
  try {
    localStorage.setItem(KEY, 'true')
  } catch {
    /* ignore */
  }
}
</script>

<style scoped>
.live-teaser {
  position: relative;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  background: linear-gradient(120deg, #0b1d36 0%, #1b2f5a 45%, #3b2a6b 100%);
  color: #eef2ff;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.live-teaser::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%);
  background-size: 250% 100%;
  animation: shimmer 5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmer {
  from {
    background-position: 150% 0;
  }
  to {
    background-position: -100% 0;
  }
}

.teaser-main {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 0.9rem 3rem 0.9rem 1.1rem;
  cursor: pointer;
}

.teaser-main:focus-visible {
  outline: 2px solid #7dd3a8;
  outline-offset: -2px;
  border-radius: 1rem;
}

.teaser-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.teaser-badge {
  align-self: flex-start;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: #7dd3a8;
  color: #0b1d36;
}

.teaser-sub {
  font-size: 0.82rem;
  opacity: 0.75;
}

.teaser-arrow {
  transition: transform 0.2s;
}

.teaser-main:hover .teaser-arrow {
  transform: translateX(4px);
}

.teaser-close {
  all: unset;
  position: absolute;
  top: 0.5rem;
  right: 0.6rem;
  width: 1.8rem;
  height: 1.8rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.7;
  z-index: 1;
}

.teaser-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .live-teaser::after {
    animation: none;
  }
}

@media (max-width: 640px) {
  .teaser-sub {
    display: none;
  }
}
</style>
