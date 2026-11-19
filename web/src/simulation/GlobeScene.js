/**
 * Three.js scene for the live prayer-time globe.
 * Earth stays fixed in its own frame; the sun direction moves with simulated time,
 * so the prayer bands sweep across the planet like a radar.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { sunPosition, latLonToVector, vectorToLatLon, PRAYERS } from './solar'
import {
  earthVertex,
  earthFragment,
  cloudFragment,
  atmosphereVertex,
  atmosphereFragment,
  cloudVertex
} from './globeShader'

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const DEG2RAD = Math.PI / 180

const TEXTURES = {
  day: '/textures/earth_day.jpg',
  night: '/textures/earth_lights.png',
  clouds: '/textures/earth_clouds.png'
}

export const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')))
  } catch {
    return false
  }
}

export class GlobeScene {
  constructor(container, { onReady } = {}) {
    this.container = container
    this.markers = []
    this.followSun = false
    this.running = true
    this.flight = null

    const width = container.clientWidth
    const height = container.clientHeight

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(width, height)
    this.renderer.setClearColor(0x03050b, 1)
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200)
    this.camera.position.set(0, 0.6, 3.6)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.enablePan = false
    this.controls.minDistance = 1.6
    this.controls.maxDistance = 8
    this.controls.rotateSpeed = 0.5
    this.controls.zoomSpeed = 0.6

    this.addStars()
    this.addEarth()
    this.loadTextures(onReady)

    this.raycaster = new THREE.Raycaster()
    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(container)

    this.onVisibility = () => {
      this.running = !document.hidden
      if (this.running) this.loop()
    }
    document.addEventListener('visibilitychange', this.onVisibility)

    this.clock = new THREE.Clock()
    this.loop()
  }

  // ---------- construction ----------

  addStars() {
    const count = 2500
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40)
      positions.set([v.x, v.y, v.z], i * 3)
      const t = 0.6 + Math.random() * 0.4
      colors.set([t, t, t + Math.random() * 0.1], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85 })
    this.stars = new THREE.Points(geo, mat)
    this.scene.add(this.stars)
  }

  addEarth() {
    const blank = new THREE.DataTexture(new Uint8Array([10, 20, 40, 255]), 1, 1)
    blank.needsUpdate = true

    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.earthUniforms = {
      uDay: { value: blank },
      uNight: { value: blank },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uDec: { value: 0 },
      uSubLon: { value: 0 },
      uFajrAngle: { value: 18 },
      uIshaAngle: { value: 17 },
      uIshaMinutes: { value: 0 },
      uMaghribAngle: { value: 0 },
      uAsrFactor: { value: 1 },
      uBands: { value: 1 },
      uLights: { value: 1 },
      uTime: { value: 0 },
      uIntro: { value: 99 }, // intro draw clock (s); large = fully drawn
      uEndLines: { value: 1 },
      uSpread: { value: 1 }, // intro fan: 1 = true positions
      uGatherH: { value: 0 },
      // sRGB components (the shader blends overlays in sRGB space)
      uColors: {
        value: Object.values(PRAYERS).map((p) => {
          const n = parseInt(p.color.slice(1), 16)
          return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
        })
      }
    }

    const geo = new THREE.SphereGeometry(1, 160, 120)
    this.earth = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.earthUniforms,
        vertexShader: earthVertex,
        fragmentShader: earthFragment,
        extensions: { derivatives: true }
      })
    )
    this.scene.add(this.earth)

    this.cloudUniforms = {
      uClouds: { value: blank },
      uSunDir: this.earthUniforms.uSunDir,
      uBands: this.earthUniforms.uBands,
      uOpacity: { value: 0.55 }
    }
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.008, 128, 96),
      new THREE.ShaderMaterial({
        uniforms: this.cloudUniforms,
        vertexShader: cloudVertex,
        fragmentShader: cloudFragment,
        transparent: true,
        depthWrite: false
      })
    )
    this.scene.add(this.clouds)

    this.atmoUniforms = { uSunDirW: { value: new THREE.Vector3(1, 0, 0) } }
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 96, 72),
      new THREE.ShaderMaterial({
        uniforms: this.atmoUniforms,
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
    this.scene.add(this.atmosphere)
  }

  loadTextures(onReady) {
    const loader = new THREE.TextureLoader()
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy()
    const load = (url, srgb, smooth = false) =>
      new Promise((resolve) => {
        loader.load(
          url,
          (tex) => {
            if (srgb) tex.colorSpace = THREE.SRGBColorSpace
            tex.anisotropy = smooth ? maxAniso : Math.min(8, maxAniso)
            if (smooth) {
              tex.generateMipmaps = true
              tex.minFilter = THREE.LinearMipmapLinearFilter
              tex.magFilter = THREE.LinearFilter
              tex.wrapS = THREE.RepeatWrapping // no seam at ±180°
            }
            resolve(tex)
          },
          undefined,
          () => resolve(null)
        )
      })

    Promise.all([load(TEXTURES.day, true), load(TEXTURES.night, true), load(TEXTURES.clouds, false, true)]).then(
      ([day, night, clouds]) => {
        if (this.disposed) return
        if (day) this.earthUniforms.uDay.value = day
        if (night) this.earthUniforms.uNight.value = night
        if (clouds) this.cloudUniforms.uClouds.value = clouds
        onReady?.({ ok: !!day })
      }
    )
  }

  // ---------- public API ----------

  setTime(date) {
    const { declination, subsolarLon } = sunPosition(date)
    this.subsolar = { lat: declination, lon: subsolarLon }
    this.earthUniforms.uDec.value = declination
    this.earthUniforms.uSubLon.value = subsolarLon
    const [x, y, z] = latLonToVector(declination, subsolarLon)
    this.earthUniforms.uSunDir.value.set(x, y, z)
    this.atmoUniforms.uSunDirW.value.set(x, y, z)
    this.updateGather()
  }

  // Hour angle of the intro fan's gather meridian (follows the sun as time moves)
  updateGather() {
    if (this.gatherLon == null || !this.subsolar) return
    const d = this.gatherLon - this.subsolar.lon
    this.earthUniforms.uGatherH.value = ((d + 180) % 360 + 360) % 360 - 180
  }

  setParams(p) {
    this.earthUniforms.uFajrAngle.value = p.fajrAngle
    this.earthUniforms.uIshaAngle.value = p.ishaAngle
    this.earthUniforms.uIshaMinutes.value = p.ishaMinutes
    this.earthUniforms.uMaghribAngle.value = p.maghribAngle
    this.earthUniforms.uAsrFactor.value = p.asrFactor
  }

  setLayers({ bands, lights, clouds }) {
    if (bands !== undefined) this.targetBands = bands ? 1 : 0
    if (lights !== undefined) this.earthUniforms.uLights.value = lights ? 1 : 0
    if (clouds !== undefined) this.clouds.visible = clouds
  }

  /**
   * Intro animation state: draw = seconds into the band drawing, endLines = 0..1,
   * spread = 0..1 fan opening, gatherLon = longitude the fan opens from
   */
  setIntro({ draw, endLines, spread, gatherLon }) {
    if (draw !== undefined) this.earthUniforms.uIntro.value = draw
    if (endLines !== undefined) this.earthUniforms.uEndLines.value = endLines
    if (spread !== undefined) this.earthUniforms.uSpread.value = spread
    if (gatherLon !== undefined) {
      this.gatherLon = gatherLon
      this.updateGather()
    }
  }

  setFollowSun(on) {
    this.followSun = on
    this.resetFollow()
  }

  /** Forget the last sun longitude so the next frame does not rotate (call after time jumps) */
  resetFollow() {
    this.followPrevLon = null
  }

  /** Smoothly turn the camera to look at a lat/lon */
  focusOn(lat, lon, { distance, duration = 1600 } = {}) {
    const dir = new THREE.Vector3(...latLonToVector(lat, lon))
    const from = this.camera.position.clone()
    const dist = distance ?? from.length()
    // tilt slightly so the location sits a bit below centre
    const to = dir.clone().add(new THREE.Vector3(0, 0.25, 0)).normalize().multiplyScalar(dist)
    this.flight = { from, to, start: performance.now(), duration }
  }

  addMarker({ lat, lon, color = '#ffffff', id }) {
    const group = new THREE.Group()
    const pos = new THREE.Vector3(...latLonToVector(lat, lon))
    group.position.copy(pos.clone().multiplyScalar(1.004))
    group.lookAt(pos.clone().multiplyScalar(2))

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.009, 24),
      new THREE.MeshBasicMaterial({ color, depthWrite: false })
    )
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.012, 0.016, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })
    )
    group.add(dot, ring)
    this.scene.add(group)
    this.markers.push({ id, group, ring, lat, lon, phase: Math.random() })
  }

  clearMarkers() {
    for (const m of this.markers) {
      this.scene.remove(m.group)
      m.group.traverse((o) => {
        o.geometry?.dispose()
        o.material?.dispose()
      })
    }
    this.markers = []
  }

  /** Screen position of a lat/lon (for HTML labels); visible=false when behind the globe */
  project(lat, lon) {
    const p = new THREE.Vector3(...latLonToVector(lat, lon)).multiplyScalar(1.01)
    const toCam = this.camera.position.clone().sub(p)
    const visible = toCam.dot(p) > 0
    const v = p.clone().project(this.camera)
    const rect = this.renderer.domElement.getBoundingClientRect()
    return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height, visible }
  }

  /** lat/lon under a screen point, or null */
  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    const hit = this.raycaster.intersectObject(this.earth, false)[0]
    if (!hit) return null
    const p = hit.point
    return vectorToLatLon(p.x, p.y, p.z)
  }

  // ---------- loop ----------

  resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    // keep the whole globe in view on narrow (portrait) screens
    this.camera.fov = w < h ? 55 : 40
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  loop() {
    if (this.disposed || !this.running || this.looping) return
    this.looping = true
    const tick = () => {
      if (this.disposed || !this.running) {
        this.looping = false
        return
      }
      const dt = this.clock.getDelta()
      this.update(dt)
      this.renderer.render(this.scene, this.camera)
      this.onFrame?.()
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  update(dt) {
    // band fade in/out
    if (this.targetBands !== undefined) {
      const u = this.earthUniforms.uBands
      u.value += (this.targetBands - u.value) * Math.min(1, dt * 6)
    }

    // edge shimmer (held still for reduced motion)
    if (!this.reducedMotion) this.earthUniforms.uTime.value = (this.earthUniforms.uTime.value + dt) % 3600

    // slow cloud drift
    this.clouds.rotation.y += dt * 0.004

    // pulsing markers
    for (const m of this.markers) {
      m.phase = (m.phase + dt * 0.6) % 1
      const s = 1 + m.phase * 2.2
      m.ring.scale.set(s, s, s)
      m.ring.material.opacity = 1 - m.phase
    }

    if (this.flight) {
      const t = Math.min(1, (performance.now() - this.flight.start) / this.flight.duration)
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const r = this.flight.from.length() + (this.flight.to.length() - this.flight.from.length()) * e
      this.camera.position.copy(this.flight.from.clone().normalize().lerp(this.flight.to.clone().normalize(), e).normalize().multiplyScalar(r))
      if (t >= 1) this.flight = null
      this.followPrevLon = null
    } else if (this.followSun && this.subsolar) {
      // Rotate the camera about the polar axis by exactly as much as the sun moved,
      // so the terminator stays fixed on screen while the Earth turns beneath.
      // A pure rotation never changes the camera distance and composes with user orbiting.
      if (this.followPrevLon != null) {
        let d = this.subsolar.lon - this.followPrevLon
        d = ((d + 540) % 360) - 180
        if (Math.abs(d) < 30) this.camera.position.applyAxisAngle(Y_AXIS, d * DEG2RAD)
      }
      this.followPrevLon = this.subsolar.lon
    }

    this.controls.update()
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.clearMarkers()
    this.scene.traverse((o) => {
      o.geometry?.dispose()
      if (o.material) {
        for (const key of Object.keys(o.material.uniforms || {})) {
          o.material.uniforms[key].value?.isTexture && o.material.uniforms[key].value.dispose()
        }
        o.material.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
