/**
 * Solar geometry for the live prayer-time simulation.
 *
 * Every prayer boundary is a sun-altitude (or shadow-length) rule, so at any
 * instant each point on Earth falls in exactly one prayer window. The window is
 * decided by the point's local *hour angle* H (how far the sun is past local
 * noon, in degrees: negative = morning, positive = afternoon) compared with the
 * hour angle at which each event happens at that latitude.
 *
 * This file is the single source of truth: GlobeScene passes the same numbers
 * to the GLSL shader, and prayerAt() (used for the readout and tests) applies
 * exactly the same rules in JavaScript.
 */

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

export const SUNRISE_ALTITUDE = -0.833 // refraction + solar disc

/**
 * Calculation parameters per AlAdhan method id.
 * isha: { angle } or { minutes } after Maghrib. maghrib: angle below horizon (Shia methods).
 */
export const METHOD_PARAMS = {
  0: { fajr: 16, isha: { angle: 14 }, maghrib: 4 }, // Jafari
  1: { fajr: 18, isha: { angle: 18 } }, // Karachi
  2: { fajr: 15, isha: { angle: 15 } }, // ISNA
  3: { fajr: 18, isha: { angle: 17 } }, // Muslim World League
  4: { fajr: 18.5, isha: { minutes: 90 } }, // Umm al-Qura
  5: { fajr: 19.5, isha: { angle: 17.5 } }, // Egypt
  7: { fajr: 17.7, isha: { angle: 14 }, maghrib: 4.5 }, // Tehran
  8: { fajr: 19.5, isha: { minutes: 90 } }, // Gulf
  9: { fajr: 18, isha: { angle: 17.5 } }, // Kuwait
  10: { fajr: 18, isha: { minutes: 90 } }, // Qatar
  11: { fajr: 20, isha: { angle: 18 } }, // Singapore
  12: { fajr: 12, isha: { angle: 12 } }, // France (UOIF)
  13: { fajr: 18, isha: { angle: 17 } }, // Turkey (Diyanet)
  14: { fajr: 16, isha: { angle: 15 } }, // Russia
  15: { fajr: 18, isha: { angle: 18 } }, // Moonsighting Committee
  16: { fajr: 18.2, isha: { angle: 18.2 } }, // Dubai
  17: { fajr: 20, isha: { angle: 18 } }, // JAKIM
  18: { fajr: 18, isha: { angle: 18 } }, // Tunisia
  19: { fajr: 18, isha: { angle: 17 } }, // Algeria
  20: { fajr: 20, isha: { angle: 18 } }, // KEMENAG
  21: { fajr: 19, isha: { angle: 17 } }, // Morocco
  22: { fajr: 18, isha: { minutes: 77 } }, // Lisbon
  23: { fajr: 18, isha: { angle: 18 } } // Jordan
}

/** Plain numeric parameters used by both JS and the shader */
export const resolveParams = (methodId, asrSchool = 0) => {
  const m = METHOD_PARAMS[methodId] || METHOD_PARAMS[3]
  return {
    fajrAngle: m.fajr,
    ishaAngle: m.isha.angle ?? 0,
    ishaMinutes: m.isha.minutes ?? 0, // > 0 means minute-based Isha
    maghribAngle: m.maghrib ?? 0, // 0 means Maghrib at sunset
    asrFactor: asrSchool === 1 ? 2 : 1
  }
}

const wrap180 = (deg) => {
  let d = ((deg + 180) % 360 + 360) % 360 - 180
  if (d === -180) d = 180
  return d
}

/**
 * Sun position for a Date (NOAA / Astronomical Almanac low-precision formulas,
 * accurate to well under a minute of time).
 * Returns { declination, subsolarLon } in degrees.
 */
export const sunPosition = (date) => {
  const jd = date.getTime() / 86400000 + 2440587.5
  const n = jd - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD
  const eps = (23.439 - 0.0000004 * n) * RAD
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * DEG
  const declination = Math.asin(Math.sin(eps) * Math.sin(lambda)) * DEG
  const gmst = ((18.697374558 + 24.06570982441908 * n) % 24 + 24) % 24 // hours
  return { declination, subsolarLon: wrap180(ra - gmst * 15) }
}

/**
 * Hour angle (deg, 0..180) at which the sun reaches `altitude` at latitude `lat`.
 * Returns NaN when it never does (always above: -Infinity flag via `never`).
 */
const hourAngleFor = (altitude, lat, dec) => {
  const phi = lat * RAD
  const d = dec * RAD
  const c = (Math.sin(altitude * RAD) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d))
  if (c > 1) return { h: NaN, state: 'below' } // sun never gets that high
  if (c < -1) return { h: NaN, state: 'above' } // sun never gets that low
  return { h: Math.acos(c) * DEG, state: 'ok' }
}

/**
 * Event hour angles for a latitude. All values in degrees.
 * Mirrors `eventAngles()` in globeShader.js — keep them in sync.
 */
export const eventAngles = (lat, dec, p) => {
  const rise = hourAngleFor(SUNRISE_ALTITUDE, lat, dec)
  if (rise.state === 'below') return { polar: 'night' }
  if (rise.state === 'above') {
    const asrAlt = Math.atan(1 / (p.asrFactor + Math.tan(Math.abs(lat - dec) * RAD))) * DEG
    const asr = hourAngleFor(asrAlt, lat, dec)
    return { polar: 'day', asr: asr.state === 'ok' ? asr.h : (asr.state === 'below' ? 180 : 0) }
  }

  const sunrise = rise.h
  const night = 360 - 2 * sunrise // night length in degrees of hour angle

  // Asr: shadow length = factor + noon shadow
  const asrAlt = Math.atan(1 / (p.asrFactor + Math.tan(Math.abs(lat - dec) * RAD))) * DEG
  const asrRes = hourAngleFor(asrAlt, lat, dec)
  const asr = asrRes.state === 'ok' ? asrRes.h : (asrRes.state === 'below' ? sunrise : 0)

  const maghrib = p.maghribAngle > 0
    ? (hourAngleFor(-p.maghribAngle, lat, dec).h || sunrise)
    : sunrise

  // Fajr / Isha with AlAdhan's default high-latitude rule (ANGLE_BASED):
  // never further from sunrise/sunset than (angle / 60) of the night.
  const fajrRaw = hourAngleFor(-p.fajrAngle, lat, dec).h
  const fajrCap = sunrise + (p.fajrAngle / 60) * night
  const fajr = Number.isNaN(fajrRaw) ? fajrCap : Math.min(fajrRaw, fajrCap)

  let isha
  if (p.ishaMinutes > 0) {
    isha = Math.min(maghrib + p.ishaMinutes * 0.25, 180)
  } else {
    const ishaRaw = hourAngleFor(-p.ishaAngle, lat, dec).h
    const ishaCap = sunrise + (p.ishaAngle / 60) * night
    isha = Number.isNaN(ishaRaw) ? ishaCap : Math.min(ishaRaw, ishaCap)
  }

  return {
    polar: null,
    fajr: Math.min(fajr, 180),
    sunrise,
    asr,
    sunset: sunrise,
    maghrib,
    isha: Math.min(isha, 180)
  }
}

export const PRAYERS = {
  Fajr: { color: '#7c9cff', label: 'Fajr' },
  Dhuhr: { color: '#ffd166', label: 'Dhuhr' },
  Asr: { color: '#ff9f43', label: 'Asr' },
  Maghrib: { color: '#ff5d8f', label: 'Maghrib' },
  Isha: { color: '#9b6bff', label: 'Isha' }
}

/**
 * Which prayer window a place is in at `date`.
 * Returns { prayer: 'Fajr'|'Dhuhr'|'Asr'|'Maghrib'|'Isha'|null, late?, polar?,
 *           startsAt: Date|null, endsAt: Date|null, hourAngle }
 */
export const prayerAt = (lat, lon, date, params) => {
  const { declination, subsolarLon } = sunPosition(date)
  const H = wrap180(lon - subsolarLon)
  const e = eventAngles(lat, declination, params)
  const at = (targetH) => new Date(date.getTime() + ((targetH - H) / 15) * 3600000)

  if (e.polar === 'night') return { prayer: null, polar: 'night', hourAngle: H, startsAt: null, endsAt: null }
  if (e.polar === 'day') {
    if (H >= 0 && H < e.asr) return { prayer: 'Dhuhr', polar: 'day', hourAngle: H, startsAt: at(0), endsAt: at(e.asr) }
    if (H >= e.asr) return { prayer: 'Asr', polar: 'day', hourAngle: H, startsAt: at(e.asr), endsAt: null }
    return { prayer: null, polar: 'day', hourAngle: H, startsAt: null, endsAt: at(0) }
  }

  const win = (prayer, start, end, extra = {}) => ({ prayer, hourAngle: H, startsAt: at(start), endsAt: at(end), ...extra })

  if (H >= -e.fajr && H < -e.sunrise) return win('Fajr', -e.fajr, -e.sunrise)
  if (H >= -e.sunrise && H < 0) return { prayer: null, hourAngle: H, startsAt: null, endsAt: at(0), next: 'Dhuhr' }
  if (H >= 0 && H < e.asr) return win('Dhuhr', 0, e.asr)
  if (H >= e.asr && H < e.sunset) return win('Asr', e.asr, e.sunset)
  if (H >= e.sunset && H < e.maghrib) return { prayer: null, hourAngle: H, startsAt: null, endsAt: at(e.maghrib), next: 'Maghrib' }
  if (H >= e.maghrib && H < e.isha) return win('Maghrib', e.maghrib, e.isha)
  if (H >= e.isha) return win('Isha', e.isha, 180)
  // After Islamic midnight until Fajr: Isha still valid (late)
  return win('Isha', e.isha - 360, -e.fajr, { late: true })
}

/** Convert a lat/lon (deg) to a unit vector in the globe's object space (three.js SphereGeometry UVs) */
export const latLonToVector = (lat, lon) => {
  const phi = lat * RAD
  const lambda = lon * RAD
  return [Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)]
}

export const vectorToLatLon = (x, y, z) => {
  const len = Math.hypot(x, y, z) || 1
  return { lat: Math.asin(y / len) * DEG, lon: Math.atan2(-z, x) * DEG }
}
