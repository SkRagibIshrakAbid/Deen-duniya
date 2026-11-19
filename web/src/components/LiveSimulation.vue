<template>
  <div
    class="live-sim"
    :class="{ 'ui-hidden': !uiShown }"
    role="dialog"
    aria-label="Prayer time live simulation"
    @keydown="onKey"
    @pointerdown.capture="skipIntro"
    @wheel.capture.passive="skipIntro"
    tabindex="-1"
    ref="rootEl"
  >
    <!-- Globe canvas -->
    <div
      ref="canvasEl"
      class="globe"
      @pointermove="onPointerMove"
      @pointerleave="hover = null"
      @pointerdown="onPointerDown"
      @wheel.passive="hover = null"
      @pointerup="onPointerUp"
    ></div>

    <!-- Marker labels -->
    <div ref="userLabelEl" class="marker-label user" v-show="userPoint">
      <i class="pi pi-map-marker"></i> {{ userPoint?.name }}
    </div>
    <div ref="meccaLabelEl" class="marker-label mecca">
      <i class="pi pi-star-fill"></i> Makkah
    </div>

    <!-- Intro: prayer names appear beside each line as it is drawn -->
    <template v-if="intro === 'running'">
      <div
        v-for="(p, name, i) in PRAYERS"
        :key="name"
        :ref="(el) => (introLabelEls[i] = el)"
        class="intro-label"
        :style="{ color: p.color }"
        aria-hidden="true"
      >
        {{ name }}
      </div>
    </template>

    <!-- Hover tooltip -->
    <div v-if="hover && hoverInfo" class="hover-tip" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">
      <div class="tip-prayer" :style="{ color: hoverInfo.color }">{{ hoverInfo.title }}</div>
      <div class="tip-sub">{{ hoverInfo.sub }}</div>
      <div v-if="hoverInfo.note" class="tip-note">{{ hoverInfo.note }}</div>
      <div class="tip-coords">{{ formatCoords(hover.lat, hover.lon) }}</div>
    </div>

    <!-- Loading / errors -->
    <div v-if="!webgl" class="center-msg">
      <i class="pi pi-exclamation-triangle"></i>
      <h2>3D view unavailable</h2>
      <p>Your browser or device doesn't support WebGL, which the live globe needs.</p>
      <Button label="Back to prayer times" icon="pi pi-arrow-left" @click="close" />
    </div>
    <div v-else-if="!ready" class="center-msg loading">
      <i class="pi pi-spin pi-globe"></i>
      <p>Preparing the Earth…</p>
    </div>

    <!-- Top bar -->
    <header class="top-bar">
      <Button icon="pi pi-arrow-left" label="Back" text class="glass-btn" @click="close" />
      <div class="title">
        <span class="title-main">Prayer Times · Live</span>
        <span class="title-sub">{{ methodName }} · {{ asrName }} Asr</span>
      </div>
      <div class="top-actions fade-panel" style="--d: 0ms">
        <span ref="guideBtnEl" class="guide-btn-wrap">
          <Button
            icon="pi pi-question-circle"
            label="Guide"
            text
            class="glass-btn guide-btn"
            aria-label="Show the guide"
            @click="openGuide"
          />
        </span>
        <Button icon="pi pi-info-circle" text rounded class="glass-btn" aria-label="About this view" @click="showAbout = true" />
      </div>
    </header>

    <!-- Legend -->
    <aside ref="legendEl" class="legend glass fade-panel" style="--d: 150ms" :class="{ collapsed: legendCollapsed }">
      <button type="button" class="legend-toggle" @click="legendCollapsed = !legendCollapsed">
        <span>Legend</span>
        <i :class="legendCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"></i>
      </button>
      <template v-if="!legendCollapsed">
        <div v-for="(p, name) in PRAYERS" :key="name" class="legend-row">
          <span class="swatch" :style="{ background: p.color, color: p.color }"></span>
          <span>{{ name }}</span>
          <span v-if="userInfo?.prayer === name && !userInfo?.late" class="legend-here">you</span>
        </div>
        <div class="legend-note">
          <span class="edge solid"></span> bright edge: time starts
        </div>
        <div class="legend-note">
          <span class="edge dashed"></span> dashed: sunrise, sunset, midnight
        </div>
        <div class="legend-note">Colour fades toward the end of each window.</div>
        <div class="layer-toggles">
          <label><ToggleSwitch v-model="layers.bands" /> Prayer bands</label>
          <label><ToggleSwitch v-model="layers.lights" /> City lights</label>
          <label><ToggleSwitch v-model="layers.clouds" /> Clouds</label>
          <label title="Keeps the sun and prayer bands still on screen while the Earth turns beneath (most visible at faster speeds)"><ToggleSwitch v-model="followSun" /> Lock view to sun</label>
        </div>
      </template>
    </aside>

    <!-- Readout -->
    <section v-if="focusInfo" ref="readoutEl" class="readout glass fade-panel" style="--d: 300ms">
      <div class="readout-place">
        <i :class="focus.kind === 'user' ? 'pi pi-map-marker' : 'pi pi-compass'"></i>
        {{ focus.name }}
        <button v-if="focus.kind !== 'user' && userPoint" type="button" class="link-btn" @click="resetFocus">
          back to my location
        </button>
      </div>
      <div class="readout-prayer" :style="{ color: focusInfo.color }">{{ focusInfo.title }}</div>
      <div class="readout-sub">{{ focusInfo.sub }}</div>
      <div v-if="focusInfo.note" class="readout-note">{{ focusInfo.note }}</div>
      <div class="readout-time">{{ focusInfo.clock }}</div>
    </section>

    <!-- Time dock -->
    <footer ref="dockEl" class="time-dock glass fade-panel" style="--d: 450ms">
      <div class="dock-row">
        <Button
          :icon="playing ? 'pi pi-pause' : 'pi pi-play'"
          rounded
          class="play-btn"
          :aria-label="playing ? 'Pause' : 'Play'"
          @click="playing = !playing"
        />
        <div class="sim-clock">
          <span class="sim-time">{{ display.time }}</span>
          <span class="sim-date">{{ display.date }}</span>
        </div>
        <button
          type="button"
          class="live-chip"
          :class="{ active: isLive && intro === 'done', pulse: livePulse }"
          @click="goLive"
          :title="isLive ? 'Showing the real current moment' : 'Jump to now at real speed'"
        >
          <span class="live-dot"></span> {{ isLive ? 'LIVE' : 'Go live' }}
        </button>
      </div>

      <div class="dock-row slider-row">
        <span class="slider-label">00:00</span>
        <input
          type="range"
          min="0"
          max="1439"
          step="1"
          :value="display.minuteOfDay"
          @input="onScrub"
          aria-label="Time of day"
          class="time-slider"
        />
        <span class="slider-label">24:00</span>
      </div>

      <div class="dock-row controls-row">
        <div ref="speedsEl" class="speeds" role="group" aria-label="Playback speed">
          <button
            v-for="s in SPEEDS"
            :key="s.value"
            type="button"
            :class="{ active: speed === s.value }"
            @click="setSpeed(s.value)"
            :title="s.title"
          >
            {{ s.label }}
          </button>
        </div>
        <label class="date-field">
          <i class="pi pi-calendar"></i>
          <input type="date" :value="display.isoDate" @change="onDateChange" aria-label="Simulated date" />
        </label>
      </div>
    </footer>

    <!-- First-time guide -->
    <SimGuide v-model:visible="showGuide" :steps="guideSteps" @step="onGuideStep" @done="onGuideDone" />

    <!-- About -->
    <Dialog v-model:visible="showAbout" modal header="What am I looking at?" :style="{ width: '34rem' }" :breakpoints="{ '640px': '94vw' }">
      <div class="about">
        <p>
          This is the Earth with the sun where it really is at the time shown. Every prayer time begins when the sun
          reaches a certain position in the sky, and at any moment those positions form lines across the planet.
        </p>
        <ul>
          <li><strong style="color: #5b8cff">Fajr</strong> starts when the sun is {{ params.fajrAngle }}° below the horizon before dawn and ends at sunrise.</li>
          <li><strong style="color: #ffcc33">Dhuhr</strong> starts at solar noon, the line where the sun is highest.</li>
          <li><strong style="color: #ff8a1f">Asr</strong> starts when shadows reach {{ params.asrFactor === 2 ? 'twice' : 'once' }} an object's length (plus its noon shadow) and ends at sunset.</li>
          <li><strong style="color: #ff3d7f">Maghrib</strong> starts at sunset{{ params.maghribAngle ? ` (sun ${params.maghribAngle}° below)` : '' }}.</li>
          <li><strong style="color: #8f5bff">Isha</strong> starts {{ params.ishaMinutes ? `${params.ishaMinutes} minutes after Maghrib` : `when the sun is ${params.ishaAngle}° below the horizon` }}; its preferred time ends at Islamic midnight (fainter after that).</li>
        </ul>
        <p>
          As the Earth turns, every line sweeps westward around the globe once a day, so somewhere on Earth the call to
          prayer is always being made. Striped areas near the poles have no normal sunrise or sunset at this time of year. All five prayers
          still apply there; following the Saudi Permanent Committee's ruling, their times are estimated from the
          nearest latitude (on the same meridian) where the sun still rises and sets that day.
        </p>
        <p class="about-small">
          Bands use your calculation method from Settings. Local mosque timetables may add small adjustments.
          Drag to rotate, scroll or pinch to zoom, tap a place to see its prayer.
        </p>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLocationStore } from '../stores/locationStore'
import { useSettingsStore } from '../stores/settingsStore'
import { usePrayerTimesStore } from '../stores/prayerTimesStore'
import { GlobeScene, isWebGLAvailable } from '../simulation/GlobeScene'
import { prayerAt, resolveParams, eventAngles, PRAYERS } from '../simulation/solar'
import { nowInTz, browserTimezone } from '../utils/dateUtils'
import dayjs from 'dayjs'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ToggleSwitch from 'primevue/toggleswitch'
import SimGuide from './SimGuide.vue'

const emit = defineEmits(['close'])

const MECCA = { lat: 21.4225, lon: 39.8262 }
const SPEEDS = [
  { value: 1, label: '1×', title: 'Real time' },
  { value: 60, label: '1 min/s', title: 'One minute per second' },
  { value: 600, label: '10 min/s', title: 'Ten minutes per second' },
  { value: 1200, label: '20 min/s', title: 'Twenty minutes per second' },
  { value: 3600, label: '1 h/s', title: 'One hour per second' }
]

const locationStore = useLocationStore()
const settingsStore = useSettingsStore()
const prayerTimesStore = usePrayerTimesStore()

const rootEl = ref(null)
const canvasEl = ref(null)
const userLabelEl = ref(null)
const meccaLabelEl = ref(null)

const webgl = isWebGLAvailable()
const ready = ref(false)
const showAbout = ref(false)
const legendCollapsed = ref(window.innerWidth < 640)
const layers = reactive({ bands: true, lights: true, clouds: true })
const followSun = ref(false)

const playing = ref(true)
const speed = ref(1) // opens live (real time)
let simMs = Date.now()
const simTick = ref(simMs) // reactive copy, refreshed ~8x per second

let scene = null

// ---------- settings ----------

const params = computed(() => resolveParams(settingsStore.calculationMethod, settingsStore.asrCalculation))
const methodName = computed(() => settingsStore.currentCalculationMethod.name)
const asrName = computed(() => settingsStore.asrCalculationName)
const tz = computed(() => (locationStore.hasLocation ? prayerTimesStore.effectiveTimezone : browserTimezone()))

// ---------- places ----------

const userPoint = computed(() =>
  locationStore.hasLocation
    ? {
        lat: Number(locationStore.latitude),
        lon: Number(locationStore.longitude),
        name: locationStore.city || 'Your location'
      }
    : null
)

const focus = ref(null) // { lat, lon, name, kind: 'user'|'pin'|'mecca' }

const resetFocus = () => {
  focus.value = userPoint.value
    ? { ...userPoint.value, kind: 'user' }
    : { ...MECCA, name: 'Makkah', kind: 'mecca' }
  scene?.focusOn(focus.value.lat, focus.value.lon)
}

// ---------- readouts ----------

const fmtDur = (ms) => {
  if (ms == null) return ''
  const m = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}m` : `${m}m`
}

const describe = (lat, lon) => {
  const info = prayerAt(lat, lon, new Date(simTick.value), params.value)
  const solarHour = ((12 + info.hourAngle / 15) % 24 + 24) % 24
  const solar = `${String(Math.floor(solarHour)).padStart(2, '0')}:${String(Math.floor((solarHour % 1) * 60)).padStart(2, '0')}`
  // Polar day/night: times estimated from the nearest latitude with a sunrise and sunset
  const sky = info.polar === 'day' ? 'Midnight sun' : info.polar === 'night' ? 'Polar night' : 'Sun barely rises'
  const from = info.estimated
    ? `${Math.abs(info.estimatedFrom).toFixed(1)}°${info.estimatedFrom >= 0 ? 'N' : 'S'}`
    : ''
  const note = info.estimated ? `${sky} · times estimated from ${from}` : null
  if (!info.prayer) {
    const sub = info.next === 'Dhuhr'
      ? `After sunrise · Dhuhr in ${fmtDur(info.endsAt - simTick.value)}`
      : `Maghrib in ${fmtDur(info.endsAt - simTick.value)}`
    return { title: 'Between prayers', sub, note, color: '#e5e7eb', solar, info }
  }
  const title = info.late ? 'Isha (after midnight)' : `${info.prayer} time`
  const sub = `Ends in ${fmtDur(info.endsAt - simTick.value)}`
  return { title, sub, note, color: PRAYERS[info.prayer].color, solar, info }
}

const userInfo = computed(() => (userPoint.value ? describe(userPoint.value.lat, userPoint.value.lon).info : null))

const focusInfo = computed(() => {
  if (!focus.value) return null
  const d = describe(focus.value.lat, focus.value.lon)
  const clock = focus.value.kind === 'user'
    ? `Local time ${nowInTz(tz.value, simTick.value).format(settingsStore.timeFormat === '12' ? 'h:mm A' : 'HH:mm')}`
    : `Solar time ${d.solar} · ${formatCoords(focus.value.lat, focus.value.lon)}`
  return { ...d, clock }
})

const hover = ref(null)
const hoverInfo = computed(() => (hover.value ? describe(hover.value.lat, hover.value.lon) : null))

const formatCoords = (lat, lon) =>
  `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`

const display = computed(() => {
  const t = nowInTz(tz.value, simTick.value)
  return {
    time: t.format(settingsStore.timeFormat === '12' ? 'h:mm A' : 'HH:mm'),
    date: `${t.format('ddd, D MMM YYYY')} · ${tz.value}`,
    isoDate: t.format('YYYY-MM-DD'),
    minuteOfDay: t.hour() * 60 + t.minute()
  }
})

const isLive = computed(() => speed.value === 1 && playing.value && Math.abs(simTick.value - Date.now()) < 5000)

// ---------- controls ----------

const setSpeed = (s) => {
  speed.value = s
  playing.value = true
}

const goLive = () => {
  if (intro.value === 'running') {
    skipIntro()
    return
  }
  scene?.resetFollow()
  simMs = Date.now()
  simTick.value = simMs
  speed.value = 1
  playing.value = true
  scene?.setTime(new Date(simMs))
}

const setSimTime = (ms) => {
  if (intro.value === 'running') endIntroNow()
  scene?.resetFollow()
  simMs = ms
  simTick.value = ms
  scene?.setTime(new Date(ms))
}

const onScrub = (e) => {
  const minutes = Number(e.target.value)
  const t = nowInTz(tz.value, simMs).startOf('day').add(minutes, 'minute')
  setSimTime(t.valueOf())
}

const onDateChange = (e) => {
  if (!e.target.value) return
  const [y, m, d] = e.target.value.split('-').map(Number)
  const cur = nowInTz(tz.value, simMs)
  let t
  try {
    t = dayjs.tz(`${e.target.value} ${cur.format('HH:mm:ss')}`, tz.value)
  } catch {
    t = dayjs(new Date(y, m - 1, d, cur.hour(), cur.minute()))
  }
  setSimTime(t.valueOf())
}

const close = () => emit('close')

const onKey = (e) => {
  if (intro.value === 'running') {
    // any key during the intro just skips it (Esc must not close the view yet)
    skipIntro()
    if (e.key === 'Escape' || e.key === ' ') e.preventDefault()
    return
  }
  if (showGuide.value || e.target instanceof HTMLInputElement) return
  if (e.key === 'Escape' && !showAbout.value) close()
  if (e.key === ' ') {
    e.preventDefault()
    playing.value = !playing.value
  }
}

// ---------- pointer ----------

let downAt = null
let hoverFrame = 0

const onPointerMove = (e) => {
  if (e.pointerType !== 'mouse' || !scene) return
  if (hoverFrame) return
  hoverFrame = requestAnimationFrame(() => {
    hoverFrame = 0
    const ll = scene.pick(e.clientX, e.clientY)
    const rect = canvasEl.value.getBoundingClientRect()
    hover.value = ll ? { ...ll, x: e.clientX - rect.left, y: e.clientY - rect.top } : null
  })
}

const onPointerDown = (e) => {
  hover.value = null
  // a tap that skips the intro shouldn't also select a place
  if (intro.value === 'running') {
    downAt = null
    return
  }
  downAt = { x: e.clientX, y: e.clientY, t: performance.now() }
}

const onPointerUp = (e) => {
  if (!downAt || !scene || showGuide.value) return
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y)
  if (moved < 6 && performance.now() - downAt.t < 500) {
    const ll = scene.pick(e.clientX, e.clientY)
    if (ll) focus.value = { ...ll, name: 'Selected place', kind: 'pin' }
  }
  downAt = null
}

// ---------- frame loop ----------

let lastFrame = performance.now()
let lastUiUpdate = 0

const placeLabel = (el, lat, lon) => {
  if (!el || !scene) return
  const p = scene.project(lat, lon)
  el.style.transform = `translate(${p.x}px, ${p.y}px)`
  el.style.opacity = p.visible ? '1' : '0'
}

// ---------- intro: bands are drawn as a closed fan at your meridian, then open to their live positions ----------
//   0.0-2.2 s  camera flies in, no bands (clock is live throughout)
//   1.6-3.2 s  a bundle of five equal bands (equal gaps) is drawn pole to pole on the focus meridian
//   3.0-6.8 s  the fan opens: every edge glides to its true position now; names ride their lines
//   5.8-6.8 s  dashed end lines and the panels fade in
const INTRO_DRAW_AT = 1.6
const INTRO_FAN_AT = 3.0
const INTRO_FAN_DUR = 3.8
const INTRO_END = INTRO_FAN_AT + INTRO_FAN_DUR
// Bundle layout (mirrors globeShader.js): five 7-deg bands with 4-deg gaps, centred on the focus meridian
const BUNDLE_W = 7
const BUNDLE_G = 4
const INTRO_FULL_DRAW = 3 // seconds of draw clock at which every line is complete
const SKIP_MS = 400

const intro = ref('pending') // 'pending' | 'running' | 'done'
const uiShown = ref(false)
const livePulse = ref(false)
const introLabelEls = ref([])
let introT0 = 0
let skip = null // { t0, draw, endLines, spread, labels } while finishing early
let introState = { draw: 0, endLines: 0, spread: 0, labels: 0 }

const easeInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2
const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const wrap180 = (d) => ((d + 180) % 360 + 360) % 360 - 180

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const startIntro = () => {
  const portrait = canvasEl.value.clientWidth < canvasEl.value.clientHeight
  scene.focusOn(focus.value.lat, focus.value.lon, { distance: portrait ? 4.3 : 3.2, duration: 2200 })
  if (reducedMotion) {
    endIntroNow()
    return
  }
  intro.value = 'running'
  introT0 = performance.now()
  introState = { draw: 0, endLines: 0, spread: 0, labels: 0 }
  scene.setIntro({ draw: 0, endLines: 0, spread: 0, gatherLon: focus.value.lon })
}

const resetIntroUniforms = () => scene?.setIntro({ draw: 99, endLines: 1, spread: 1 })

/** Finish immediately (a user picked a time, or reduced motion) */
const endIntroNow = () => {
  intro.value = 'done'
  skip = null
  uiShown.value = true
  resetIntroUniforms()
  maybeAutoGuide()
}

/** Any interaction during the intro: open the fan the rest of the way over SKIP_MS */
const skipIntro = () => {
  if (intro.value !== 'running' || skip) return
  skip = { t0: performance.now(), ...introState }
  uiShown.value = true
}

const finishIntro = () => {
  resetIntroUniforms()
  intro.value = 'done'
  skip = null
  uiShown.value = true
  livePulse.value = true
  setTimeout(() => (livePulse.value = false), 1800)
  maybeAutoGuide()
}

// Intro labels sit on their (spreading) start line, at the focus latitude clamped to ±40°
const introLabelLat = () => Math.max(-40, Math.min(40, focus.value?.lat ?? 20))

const placeIntroLabels = (spread, draw, alpha) => {
  if (!scene?.subsolar) return
  const lat = introLabelLat()
  const e = eventAngles(lat, scene.subsolar.lat, params.value)
  const h0 = wrap180(focus.value.lon - scene.subsolar.lon)
  const c0 = Math.max(-154.5, Math.min(154.5, h0)) - (5 * BUNDLE_W + 4 * BUNDLE_G) / 2
  const hs = [-e.fajr, 0, e.asr, e.maghrib, e.isha]
  hs.forEach((h, i) => {
    const el = introLabelEls.value[i]
    if (!el) return
    // the label sits on its band's start line: bundle position -> true position
    const bundle = c0 + i * (BUNDLE_W + BUNDLE_G)
    const shown = bundle + (h - bundle) * spread
    const p = scene.project(lat, scene.subsolar.lon + shown)
    // appear once that line has been drawn past the label
    const t = (draw - i * 0.15) / 1.0
    const a = clamp01((t - 0.35) / 0.3) * alpha
    el.style.transform = `translate(${p.x}px, ${p.y}px)`
    el.style.opacity = p.visible ? String(a) : '0'
  })
}

const updateIntro = (now) => {
  const e = (now - introT0) / 1000
  const fanU = clamp01((e - INTRO_FAN_AT) / INTRO_FAN_DUR)
  let draw = Math.max(0, e - INTRO_DRAW_AT)
  let endLines = clamp01((e - (INTRO_END - 1.0)) / 1.0)
  let spread = easeInOutCubic(fanU)
  // names show as their lines are drawn, then fade before the fan settles
  let labels = 1 - clamp01((e - (INTRO_END - 0.8)) / 0.8)
  if (skip) {
    const k = clamp01((now - skip.t0) / SKIP_MS)
    const s = easeInOutSine(k)
    draw = skip.draw + Math.max(0, INTRO_FULL_DRAW - skip.draw) * s
    endLines = skip.endLines + (1 - skip.endLines) * s
    spread = skip.spread + (1 - skip.spread) * s
    labels = skip.labels * (1 - k)
    if (k >= 1) {
      finishIntro()
      return
    }
  } else if (e >= INTRO_END) {
    finishIntro()
    return
  }
  introState = { draw, endLines, spread, labels }
  if (e >= INTRO_END - 1.0) uiShown.value = true
  scene.setIntro({ draw, endLines, spread })
  placeIntroLabels(spread, draw, labels)
}

const onFrame = () => {
  const now = performance.now()
  const elapsed = (now - lastFrame) / 1000
  lastFrame = now
  // real time keeps true elapsed time (so a background tab or slow load doesn't fall behind);
  // time-lapse caps the step so a stall doesn't jump hours
  const dt = speed.value === 1 ? elapsed : Math.min(0.25, elapsed)

  if (intro.value === 'running') updateIntro(now)
  if (playing.value) {
    simMs += dt * 1000 * speed.value
    // real-time mode stays locked to the wall clock
    if (speed.value === 1 && Math.abs(simMs - Date.now()) < 5000) simMs = Date.now()
    scene.setTime(new Date(simMs))
  }

  if (now - lastUiUpdate > 120) {
    lastUiUpdate = now
    simTick.value = simMs
  }

  if (userPoint.value) placeLabel(userLabelEl.value, userPoint.value.lat, userPoint.value.lon)
  placeLabel(meccaLabelEl.value, MECCA.lat, MECCA.lon)
}

// ---------- guide ----------

const GUIDE_KEY = 'liveSimGuideSeen'
const showGuide = ref(false)
const guideBtnEl = ref(null)
const legendEl = ref(null)
const readoutEl = ref(null)
const dockEl = ref(null)
const speedsEl = ref(null)
let legendWasCollapsed = null

const guideSteps = computed(() => [
  {
    title: 'Welcome to the live globe',
    text: 'This is the Earth right now, lit by the real sun: day on one side, night with city lights on the other.\nIt is showing live time, so things move slowly, just like the real sky.'
  },
  {
    title: 'The prayer bands',
    text: 'Each colour shows where a prayer time is in progress at this moment. The bright edge is where it is starting, and the colour fades toward where it ends.\nDrag to rotate the globe, scroll or pinch to zoom.'
  },
  {
    title: 'Legend and layers',
    text: 'Which colour is which prayer. Below it you can switch the bands, city lights and clouds on or off, or lock the view to the sun.',
    target: () => legendEl.value
  },
  {
    title: userPoint.value ? 'Your location' : 'Selected place',
    text: 'This card shows the prayer in progress and when it ends. Tap anywhere on the globe to check another place.',
    target: () => readoutEl.value
  },
  {
    title: 'Speed up time',
    text: 'Pick a faster speed to watch the bands sweep around the world like a radar. One full day passes in 24 seconds at 1 h/s.',
    target: () => speedsEl.value
  },
  {
    title: 'Travel through time',
    text: 'Drag the slider to any time of day, or choose a date to see how the bands change with the seasons. Tap Go live to return to the real current moment.',
    target: () => dockEl.value
  },
  {
    title: 'Need this again?',
    text: 'Open the guide any time with this button.',
    target: () => guideBtnEl.value
  }
])

const openGuide = () => {
  hover.value = null
  showGuide.value = true
}

const maybeAutoGuide = () => {
  if (localStorage.getItem(GUIDE_KEY)) return
  setTimeout(() => {
    if (scene) openGuide()
  }, 1400)
}

// expand the legend while its step is shown (collapsed by default on phones)
const onGuideStep = (s) => {
  const isLegendStep = s?.title === 'Legend and layers'
  if (isLegendStep && legendCollapsed.value) {
    legendWasCollapsed = true
    legendCollapsed.value = false
  } else if (!isLegendStep && legendWasCollapsed) {
    legendCollapsed.value = true
    legendWasCollapsed = null
  }
}

const onGuideDone = () => {
  if (legendWasCollapsed) {
    legendCollapsed.value = true
    legendWasCollapsed = null
  }
  try {
    localStorage.setItem(GUIDE_KEY, 'true')
  } catch {
    /* ignore */
  }
  rootEl.value?.focus()
}

// ---------- lifecycle ----------

const buildMarkers = () => {
  if (!scene) return
  scene.clearMarkers()
  scene.addMarker({ ...MECCA, color: '#f5d77a', id: 'mecca' })
  if (userPoint.value) scene.addMarker({ ...userPoint.value, color: '#ffffff', id: 'user' })
}

onMounted(() => {
  rootEl.value?.focus()
  if (!webgl) return

  scene = new GlobeScene(canvasEl.value, {
    onReady: () => {
      ready.value = true
      if (scene) startIntro() // the guide opens once the intro has finished
    }
  })
  scene.onFrame = onFrame
  if (import.meta.env.DEV) window.__globe = scene // debugging aid, stripped from production builds
  scene.setParams(params.value)
  scene.setTime(new Date(simMs))
  scene.setLayers({ ...layers })
  buildMarkers()

  resetFocus()
  scene.flight = null
  // start a little further out; the fly-in starts with the intro once textures are ready
  scene.camera.position.multiplyScalar(1.6)
  scene.setIntro({ draw: 0, endLines: 0 })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(hoverFrame)
  scene?.dispose()
  scene = null
})

watch(params, (p) => scene?.setParams(p))
watch(layers, (l) => scene?.setLayers({ ...l }))
watch(followSun, (on) => scene?.setFollowSun(on))
watch(userPoint, () => {
  buildMarkers()
  resetFocus()
})
</script>

<style scoped>
/* ---------- intro ---------- */
.fade-panel {
  transition: opacity 0.9s ease, transform 0.9s ease;
  transition-delay: var(--d, 0ms);
}

.ui-hidden .fade-panel {
  opacity: 0;
  pointer-events: none;
}

.ui-hidden .legend.fade-panel,
.ui-hidden .readout.fade-panel {
  transform: translateY(-8px);
}

.ui-hidden .time-dock.fade-panel {
  transform: translate(-50%, 12px);
}

.intro-label {
  position: absolute;
  left: 0;
  top: 0;
  margin: -0.7rem 0 0 0.6rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-shadow: 0 0 12px currentColor, 0 1px 3px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  opacity: 0;
  z-index: 3;
  white-space: nowrap;
}

.live-chip.pulse {
  animation: live-pulse 1.6s ease-out 1;
}

@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); }
  100% { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
}

.live-sim {
  position: fixed;
  inset: 0;
  z-index: 1000; /* PrimeVue dialogs (1100+) must open above it */
  background: radial-gradient(ellipse at center, #0a1226 0%, #03050b 70%);
  color: #e8ecf5;
  overflow: hidden;
  outline: none;
  font-family: inherit;
}

.globe {
  position: absolute;
  inset: 0;
  touch-action: none;
  cursor: grab;
}

.globe:active {
  cursor: grabbing;
}

.glass {
  background: rgba(12, 18, 34, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

/* ---------- top bar ---------- */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(3, 5, 11, 0.7), transparent);
}

.top-bar > * {
  pointer-events: auto;
}

.glass-btn :deep(.p-button-label),
.glass-btn :deep(.p-button-icon) {
  color: #e8ecf5;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.guide-btn-wrap {
  display: inline-flex;
  border-radius: 999px;
}

.readout-note,
.tip-note {
  font-size: 0.72rem;
  opacity: 0.7;
  margin-top: 0.2rem;
  font-style: italic;
}

.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.title-main {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.title-sub {
  font-size: 0.75rem;
  opacity: 0.65;
}

/* ---------- labels & tooltip ---------- */
.marker-label {
  position: absolute;
  left: 0;
  top: 0;
  margin: -2.1rem 0 0 0.6rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  background: rgba(12, 18, 34, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition: opacity 0.3s;
}

.marker-label.mecca {
  color: #f5d77a;
}

.hover-tip {
  position: absolute;
  transform: translate(14px, 14px);
  padding: 0.5rem 0.7rem;
  border-radius: 0.6rem;
  background: rgba(12, 18, 34, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: none;
  font-size: 0.8rem;
  min-width: 10rem;
}

.tip-prayer {
  font-weight: 600;
}

.tip-sub,
.tip-coords {
  opacity: 0.75;
}

/* ---------- legend ---------- */
.legend {
  position: absolute;
  top: 4.25rem;
  left: 1rem;
  padding: 0.6rem 0.8rem 0.8rem;
  width: 15rem;
  font-size: 0.82rem;
}

.legend.collapsed {
  width: auto;
  padding-bottom: 0.6rem;
}

.legend-toggle {
  all: unset;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.18rem 0;
}

.swatch {
  width: 1.6rem;
  height: 0.55rem;
  border-radius: 999px;
  box-shadow: 0 0 10px currentColor;
}

.legend-here {
  margin-left: auto;
  font-size: 0.68rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
}

.legend-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  opacity: 0.7;
  margin-top: 0.3rem;
}

.edge {
  width: 1.6rem;
  height: 0;
  border-top: 2px solid #fff;
}

.edge.dashed {
  border-top-style: dashed;
  opacity: 0.7;
}

.layer-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.75rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.layer-toggles label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
}

.layer-toggles :deep(.p-toggleswitch) {
  transform: scale(0.8);
  transform-origin: left center;
}

/* ---------- readout ---------- */
.readout {
  position: absolute;
  top: 4.25rem;
  right: 1rem;
  padding: 0.8rem 1rem;
  width: 16rem;
}

.readout-place {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.8rem;
  opacity: 0.85;
}

.link-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.72rem;
  text-decoration: underline;
  opacity: 0.8;
}

.readout-prayer {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

.readout-sub {
  font-size: 0.9rem;
}

.readout-time {
  font-size: 0.75rem;
  opacity: 0.65;
  margin-top: 0.25rem;
}

/* ---------- time dock ---------- */
.time-dock {
  position: absolute;
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
  width: min(40rem, calc(100% - 2rem));
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.dock-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.play-btn {
  flex-shrink: 0;
}

.sim-clock {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.sim-time {
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.sim-date {
  font-size: 0.75rem;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-chip {
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.live-chip .live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #9ca3af;
}

.live-chip.active {
  border-color: #ef4444;
  color: #fecaca;
}

.live-chip.active .live-dot {
  background: #ef4444;
  animation: blink 1.4s infinite;
}

@keyframes blink {
  50% {
    opacity: 0.25;
  }
}

.slider-row {
  gap: 0.5rem;
}

.slider-label {
  font-size: 0.7rem;
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
}

.time-slider {
  flex: 1;
  accent-color: #7dd3a8;
  height: 1.5rem;
}

.controls-row {
  justify-content: space-between;
  flex-wrap: wrap;
}

.speeds {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.speeds button {
  all: unset;
  cursor: pointer;
  font-size: 0.72rem;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  opacity: 0.75;
}

.speeds button.active {
  background: rgba(125, 211, 168, 0.22);
  border-color: #7dd3a8;
  opacity: 1;
}

.date-field {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.date-field input {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: inherit;
  border-radius: 0.5rem;
  padding: 0.25rem 0.4rem;
  font: inherit;
  color-scheme: dark;
}

/* ---------- messages ---------- */
.center-msg {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
  padding: 2rem;
}

.center-msg i {
  font-size: 2.5rem;
  opacity: 0.8;
}

.center-msg.loading {
  pointer-events: none;
}

.about p,
.about li {
  line-height: 1.6;
  margin-bottom: 0.6rem;
}

.about ul {
  padding-left: 1.2rem;
  margin-bottom: 0.6rem;
}

.about-small {
  font-size: 0.85rem;
  opacity: 0.75;
}

/* ---------- small screens ---------- */
@media (max-width: 720px) {
  .title-sub {
    display: none;
  }

  .guide-btn :deep(.p-button-label) {
    display: none;
  }

  .legend {
    top: 3.75rem;
    left: 0.5rem;
    width: 13rem;
  }

  .legend.collapsed {
    width: auto;
  }

  .readout {
    top: auto;
    right: 0.5rem;
    left: 0.5rem;
    bottom: 12.5rem;
    width: auto;
    padding: 0.55rem 0.8rem;
  }

  .readout-prayer {
    font-size: 1.1rem;
  }

  .time-dock {
    bottom: 0.5rem;
    width: calc(100% - 1rem);
    padding: 0.6rem 0.75rem;
  }

  .sim-time {
    font-size: 1.25rem;
  }
}
</style>
