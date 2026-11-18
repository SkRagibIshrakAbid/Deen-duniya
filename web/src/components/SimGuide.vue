<template>
  <div v-if="visible" class="sim-guide" @keydown.stop="onKey" @pointerdown.stop @pointerup.stop @click.stop>
    <!-- Dim layer with a cut-out around the current target -->
    <div v-if="rect" class="spotlight" :style="spotStyle"></div>
    <div v-else class="dim"></div>

    <div
      ref="cardEl"
      class="guide-card"
      :class="{ centered: !rect }"
      :style="cardStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="`Guide step ${index + 1} of ${steps.length}`"
      tabindex="-1"
    >
      <div class="guide-step">Step {{ index + 1 }} of {{ steps.length }}</div>
      <h3>{{ step.title }}</h3>
      <p v-for="(line, i) in lines" :key="i">{{ line }}</p>
      <div class="guide-footer">
        <div class="dots" aria-hidden="true">
          <span v-for="(_, i) in steps" :key="i" :class="{ on: i === index }"></span>
        </div>
        <div class="guide-actions">
          <button v-if="index < steps.length - 1" type="button" class="g-btn ghost" @click="finish(true)">Skip</button>
          <button v-if="index > 0" type="button" class="g-btn" @click="go(index - 1)">Back</button>
          <button type="button" class="g-btn primary" @click="next">
            {{ index === steps.length - 1 ? 'Done' : 'Next' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

/**
 * Spotlight walkthrough.
 * steps: [{ title, text, target?: () => HTMLElement | null, pad?: number }]
 */
const props = defineProps({
  visible: Boolean,
  steps: { type: Array, required: true }
})
const emit = defineEmits(['update:visible', 'step', 'done'])

const index = ref(0)
const rect = ref(null)
const cardEl = ref(null)
const cardSize = ref({ w: 340, h: 200 })

const step = computed(() => props.steps[index.value] || {})
const lines = computed(() => String(step.value.text || '').split('\n'))

const measure = async () => {
  await nextTick()
  const el = step.value.target?.()
  if (el) {
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    const r = el.getBoundingClientRect()
    const pad = step.value.pad ?? 8
    rect.value = { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }
  } else {
    rect.value = null
  }
  await nextTick()
  if (cardEl.value) {
    cardSize.value = { w: cardEl.value.offsetWidth, h: cardEl.value.offsetHeight }
    cardEl.value.focus({ preventScroll: true })
  }
}

const spotStyle = computed(() => {
  const r = rect.value
  return { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` }
})

// Place the card below the target if it fits, otherwise above, otherwise beside; clamp to the viewport
const cardStyle = computed(() => {
  const r = rect.value
  if (!r) return {}
  const vw = window.innerWidth
  const vh = window.innerHeight
  const { w, h } = cardSize.value
  const gap = 14
  const margin = 12
  let top
  if (r.y + r.h + gap + h <= vh - margin) top = r.y + r.h + gap
  else if (r.y - gap - h >= margin) top = r.y - gap - h
  else top = Math.max(margin, Math.min(vh - h - margin, r.y + r.h / 2 - h / 2))
  let left = r.x + r.w / 2 - w / 2
  // beside the target when the card had to overlap it vertically
  const overlaps = top < r.y + r.h && top + h > r.y
  if (overlaps) {
    left = r.x + r.w + gap + w <= vw - margin ? r.x + r.w + gap : r.x - gap - w
  }
  left = Math.max(margin, Math.min(vw - w - margin, left))
  return { left: `${left}px`, top: `${top}px` }
})

const go = (i) => {
  index.value = Math.max(0, Math.min(props.steps.length - 1, i))
}

const next = () => {
  if (index.value >= props.steps.length - 1) finish(false)
  else go(index.value + 1)
}

const finish = (skipped) => {
  emit('update:visible', false)
  emit('done', { skipped })
}

const onKey = (e) => {
  if (e.key === 'Escape') finish(true)
  else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
  else if (e.key === 'ArrowLeft') go(index.value - 1)
}

const onResize = () => measure()

watch(
  () => props.visible,
  (open) => {
    if (open) {
      index.value = 0
      emit('step', step.value)
      measure()
      window.addEventListener('resize', onResize)
    } else {
      window.removeEventListener('resize', onResize)
    }
  },
  { immediate: true }
)

watch(index, () => {
  emit('step', step.value)
  // let the parent react (e.g. expand a panel) before measuring
  setTimeout(measure, 30)
})

onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<style scoped>
.sim-guide {
  position: absolute;
  inset: 0;
  z-index: 20;
}

.dim {
  position: absolute;
  inset: 0;
  background: rgba(2, 4, 10, 0.6);
}

.spotlight {
  position: absolute;
  border-radius: 1rem;
  box-shadow: 0 0 0 9999px rgba(2, 4, 10, 0.6), 0 0 0 2px rgba(125, 211, 168, 0.9), 0 0 24px 4px rgba(125, 211, 168, 0.35);
  transition: left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
  pointer-events: none;
}

.guide-card {
  position: absolute;
  width: min(21rem, calc(100vw - 24px));
  padding: 1rem 1.1rem 0.85rem;
  border-radius: 1rem;
  background: rgba(14, 22, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  color: #eef2ff;
  outline: none;
  transition: left 0.3s ease, top 0.3s ease;
}

.guide-card.centered {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(24rem, calc(100vw - 24px));
}

.guide-step {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7dd3a8;
  margin-bottom: 0.3rem;
}

.guide-card h3 {
  font-size: 1.05rem;
  margin-bottom: 0.4rem;
}

.guide-card p {
  font-size: 0.88rem;
  line-height: 1.55;
  opacity: 0.85;
  margin-bottom: 0.35rem;
}

.guide-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.7rem;
}

.dots {
  display: flex;
  gap: 0.3rem;
}

.dots span {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
}

.dots span.on {
  background: #7dd3a8;
  width: 1rem;
  border-radius: 999px;
}

.guide-actions {
  display: flex;
  gap: 0.4rem;
}

.g-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.g-btn.ghost {
  border-color: transparent;
  opacity: 0.7;
}

.g-btn.primary {
  background: #7dd3a8;
  border-color: #7dd3a8;
  color: #0b1d36;
}

.g-btn:focus-visible {
  outline: 2px solid #7dd3a8;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .spotlight,
  .guide-card {
    transition: none;
  }
}
</style>
