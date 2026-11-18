/**
 * A single shared, reactive clock.
 * Computed values that depend on the current time read `now.value`
 * so Vue re-evaluates them every tick.
 */
import { ref } from 'vue'

const now = ref(Date.now())
let started = false

const tick = () => {
  now.value = Date.now()
}

export const useNow = () => {
  if (!started) {
    started = true
    setInterval(tick, 1000)
    // Catch up immediately when the tab becomes visible again or the device wakes
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
  }
  return now
}
