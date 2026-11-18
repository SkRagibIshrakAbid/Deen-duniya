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

/** Margin (deg) inside the threshold latitude, so sunrise/sunset stay well defined */
export const POLAR_MARGIN = 0.25

/**
 * Where the sun does not rise or does not set, prayer times are estimated from
 * the nearest latitude (same meridian) where it still rises and sets that day.
 * Ruling: Saudi Permanent Committee (Fatwa 2769) - estimate by the nearest place
 * where the prayer times are distinguishable.
 *
 * Exact limits: midnight altitude = |lat + dec| - 90, noon altitude = 90 - |lat - dec|.
 *   midnight sun (lat and dec on the same side): |lat| > 90 - |dec| - 0.833
 *   polar night  (opposite sides):               |lat| > 90 - |dec| + 0.833
 * Times are estimated a little before those limits so every prayer stays defined:
 *   summer side: sunset must exist             -> |lat| <= 90 - |dec| - 0.833 - 0.25
 *   winter side: Asr needs a shadow, i.e. the sun's centre above the horizon at noon
 *                                              -> |lat| <= 90 - |dec| - 0.5
 * Returns { latE, estimated, polar: 'day' | 'night' | null } (polar = the real sky state).
 */
export const NOON_MIN_ALTITUDE = 0.5

export const polarLimits = (dec) => {
  const a = Math.abs(dec)
  return {
    summer: { thr: 90 - a + SUNRISE_ALTITUDE, limit: 90 - a + SUNRISE_ALTITUDE - POLAR_MARGIN },
    winter: { thr: 90 - a - SUNRISE_ALTITUDE, limit: 90 - a - NOON_MIN_ALTITUDE }
  }
}

export const polarLatitude = (lat, dec) => {
  const sameSide = lat * dec > 0
  const { thr, limit } = polarLimits(dec)[sameSide ? 'summer' : 'winter']
  if (Math.abs(lat) <= limit) return { latE: lat, estimated: false, polar: null }
  const polar = Math.abs(lat) >= thr ? (sameSide ? 'day' : 'night') : null
  return { latE: Math.sign(lat || 1) * limit, estimated: true, polar }
}

/**
 * Event hour angles for a latitude. All values in degrees.
 * Mirrors `eventAngles()` in globeShader.js — keep them in sync.
 * In polar day/night the angles are those of the nearest latitude with a sunrise and sunset.
 */
export const eventAngles = (latIn, dec, p) => {
  const { latE: lat, polar, estimated } = polarLatitude(latIn, dec)
  const rise = hourAngleFor(SUNRISE_ALTITUDE, lat, dec)
  const sunrise = rise.state === 'ok' ? rise.h : (rise.state === 'above' ? 180 : 0)
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
    polar,
    estimated,
    estimatedFrom: estimated ? lat : null,
    fajr: Math.min(fajr, 180),
    sunrise,
    asr,
    sunset: sunrise,
    maghrib,
    isha: Math.min(isha, 180)
  }
}

export const PRAYERS = {
  Fajr: { color: '#5b8cff', label: 'Fajr' },
  Dhuhr: { color: '#ffcc33', label: 'Dhuhr' },
  Asr: { color: '#ff8a1f', label: 'Asr' },
  Maghrib: { color: '#ff3d7f', label: 'Maghrib' },
  Isha: { color: '#8f5bff', label: 'Isha' }
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

  const base = { hourAngle: H, polar: e.polar, estimated: e.estimated, estimatedFrom: e.estimatedFrom }
  const win = (prayer, start, end, extra = {}) => ({ ...base, prayer, startsAt: at(start), endsAt: at(end), ...extra })
  const gap = (end, next) => ({ ...base, prayer: null, startsAt: null, endsAt: at(end), next })

  if (H >= -e.fajr && H < -e.sunrise) return win('Fajr', -e.fajr, -e.sunrise)
  if (H >= -e.sunrise && H < 0) return gap(0, 'Dhuhr')
  if (H >= 0 && H < e.asr) return win('Dhuhr', 0, e.asr)
  if (H >= e.asr && H < e.sunset) return win('Asr', e.asr, e.sunset)
  if (H >= e.sunset && H < e.maghrib) return gap(e.maghrib, 'Maghrib')
  if (H >= e.maghrib && H < e.isha) return win('Maghrib', e.maghrib, e.isha)
  if (H >= e.isha) return win('Isha', e.isha, 180)
  // After Islamic midnight until Fajr: Isha still valid (late)
  return win('Isha', e.isha - 360, -e.fajr, { late: true })
}

const hhmm = (d, tz) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)

/**
 * Prayer timings for a local calendar date, computed with the rules above
 * (used where AlAdhan has no real sunrise/sunset: polar day and polar night).
 * dateDMY: 'DD-MM-YYYY'. Returns { timings: { Fajr: 'HH:mm', ... }, polar, estimatedFrom }.
 */
export const estimatedTimings = (lat, lon, dateDMY, tz, params) => {
  const [dd, mm, yyyy] = dateDMY.split('-').map(Number)
  // Approximate local noon (UTC) from longitude, then refine on the sun's actual hour angle there
  let noon = new Date(Date.UTC(yyyy, mm - 1, dd, 12) - (lon / 15) * 3600000)
  for (let i = 0; i < 2; i++) {
    const { subsolarLon } = sunPosition(noon)
    noon = new Date(noon.getTime() - (wrap180(lon - subsolarLon) / 15) * 3600000)
  }
  const { declination } = sunPosition(noon)
  const e = eventAngles(lat, declination, params)
  const at = (h) => new Date(noon.getTime() + (h / 15) * 3600000)
  const angles = {
    Fajr: -e.fajr,
    Sunrise: -e.sunrise,
    Dhuhr: 0,
    Asr: e.asr,
    Sunset: e.sunset,
    Maghrib: e.maghrib,
    Isha: e.isha,
    Imsak: -e.fajr - 2.5, // 10 minutes before Fajr, like AlAdhan
    Midnight: 180,
    Firstthird: e.sunset + (360 - 2 * e.sunset) / 3,
    Lastthird: e.sunset + (2 * (360 - 2 * e.sunset)) / 3
  }
  // With very short nights, Maghrib/Isha can fall after local midnight: record the calendar-day offset
  const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const target = Date.UTC(yyyy, mm - 1, dd)
  const timings = {}
  const offsets = {}
  for (const [name, h] of Object.entries(angles)) {
    const d = at(h)
    timings[name] = hhmm(d, tz)
    const [y2, m2, d2] = ymd(d).split('-').map(Number)
    offsets[name] = Math.round((Date.UTC(y2, m2 - 1, d2) - target) / 86400000)
  }
  return { polar: e.polar, estimated: e.estimated, estimatedFrom: e.estimatedFrom, timings, offsets }
}

/** Polar estimate state for a location on a local date */
export const polarStateFor = (lat, lon, dateDMY) => {
  const [dd, mm, yyyy] = dateDMY.split('-').map(Number)
  const { declination } = sunPosition(new Date(Date.UTC(yyyy, mm - 1, dd, 12) - (lon / 15) * 3600000))
  return polarLatitude(lat, declination)
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
