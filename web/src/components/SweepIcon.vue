<template>
  <!-- Small animated globe with prayer arcs sweeping across it -->
  <svg class="sweep-icon" :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <clipPath :id="clipId">
        <circle cx="32" cy="32" r="26" />
      </clipPath>
      <radialGradient :id="gradId" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#2f6f9f" />
        <stop offset="100%" stop-color="#0b1d36" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="26" :fill="`url(#${gradId})`" />
    <g :clip-path="`url(#${clipId})`">
      <g class="sweep">
        <path d="M 32 -10 A 44 44 0 0 1 32 74" stroke="#5b8cff" />
        <path d="M 32 -10 A 34 44 0 0 1 32 74" stroke="#ffcc33" />
        <path d="M 32 -10 A 22 44 0 0 1 32 74" stroke="#ff8a1f" />
        <path d="M 32 -10 A 10 44 0 0 1 32 74" stroke="#ff3d7f" />
        <path d="M 32 -10 L 32 74" stroke="#8f5bff" />
      </g>
      <rect x="32" y="0" width="40" height="64" fill="rgba(3,5,11,0.45)" />
    </g>
    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(125,180,255,0.6)" stroke-width="1.5" />
  </svg>
</template>

<script setup>
defineProps({ size: { type: [Number, String], default: 48 } })
const uid = Math.random().toString(36).slice(2, 8)
const clipId = `sweep-clip-${uid}`
const gradId = `sweep-grad-${uid}`
</script>

<style scoped>
.sweep-icon {
  flex-shrink: 0;
}

.sweep path {
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
  opacity: 0.9;
}

.sweep {
  animation: sweep 6s linear infinite;
}

@keyframes sweep {
  from {
    transform: translateX(-40px);
  }
  to {
    transform: translateX(40px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sweep {
    animation: none;
  }
}
</style>
