/**
 * GLSL for the Earth surface, clouds and atmosphere.
 * The prayer-band logic mirrors eventAngles()/prayerAt() in solar.js.
 */

export const earthVertex = /* glsl */ `
  varying vec3 vPos;     // object-space position on the unit sphere
  varying vec2 vUv;
  void main() {
    vPos = normalize(position);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const earthFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSunDir;        // object space
  uniform float uDec;          // sun declination (deg)
  uniform float uSubLon;       // subsolar longitude (deg)
  uniform float uFajrAngle;
  uniform float uIshaAngle;
  uniform float uIshaMinutes;
  uniform float uMaghribAngle;
  uniform float uAsrFactor;
  uniform float uBands;        // 0..1 overlay strength
  uniform float uLights;       // 0..1 city lights
  uniform vec3 uColors[5];     // Fajr, Dhuhr, Asr, Maghrib, Isha

  varying vec3 vPos;
  varying vec2 vUv;

  const float RAD = 0.017453292519943295;
  const float DEG = 57.29577951308232;

  float wrap180(float d) { return mod(d + 180.0, 360.0) - 180.0; }

  // Overlays are blended in (approximate) sRGB so tints look the same on dark and bright ground
  vec3 toSRGB(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
  vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

  // Hour angle (deg) where the sun reaches altitude alt. state: 0 ok, 1 never that high, -1 always higher
  float hourAngleFor(float alt, float lat, float dec, out float state) {
    float c = (sin(alt * RAD) - sin(lat * RAD) * sin(dec * RAD)) / (cos(lat * RAD) * cos(dec * RAD));
    state = c > 1.0 ? 1.0 : (c < -1.0 ? -1.0 : 0.0);
    return acos(clamp(c, -1.0, 1.0)) * DEG;
  }

  // Anti-aliased line: dist and width in the same units
  float line(float dist, float width, float px) {
    return 1.0 - smoothstep(width * px * 0.5, width * px * 0.5 + px, dist);
  }

  void main() {
    vec3 n = normalize(vPos);
    float lat = asin(clamp(n.y, -1.0, 1.0)) * DEG;
    float lon = atan(-n.z, n.x) * DEG;
    float H = wrap180(lon - uSubLon);

    // ---------- base Earth: day / night with soft terminator ----------
    float sunDot = dot(n, normalize(uSunDir));
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float dayMix = smoothstep(-0.1, 0.02, sunDot);  // night (and city lights) only after the sun sets
    vec3 nightColor = day * 0.06 + night * vec3(1.0, 0.85, 0.6) * 1.6 * uLights;
    vec3 base = mix(nightColor, day * (0.45 + 0.6 * sqrt(max(sunDot, 0.0))), dayMix);
    // warm twilight tint along the terminator
    base += vec3(0.35, 0.15, 0.05) * exp(-pow((sunDot + 0.02) / 0.06, 2.0)) * 0.35;

    // ---------- prayer windows ----------
    float st;
    float sunrise = hourAngleFor(-0.833, lat, uDec, st);
    float polar = st; // 1 = polar night, -1 = midnight sun

    float noonShadow = tan(abs(lat - uDec) * RAD);
    float asrAlt = atan(1.0 / (uAsrFactor + noonShadow)) * DEG;
    float sA;
    float asr = hourAngleFor(asrAlt, lat, uDec, sA);
    if (sA > 0.5) asr = sunrise;      // sun never high enough: Asr starts at sunset
    else if (sA < -0.5) asr = 0.0;    // sun always above: Asr from noon

    float maghrib = sunrise;
    if (uMaghribAngle > 0.0) {
      float sM;
      float m = hourAngleFor(-uMaghribAngle, lat, uDec, sM);
      if (sM == 0.0) maghrib = m;
    }

    float nightLen = 360.0 - 2.0 * sunrise;
    float sF;
    float fajr = hourAngleFor(-uFajrAngle, lat, uDec, sF);
    float fajrCap = sunrise + (uFajrAngle / 60.0) * nightLen;
    fajr = sF < -0.5 ? fajrCap : min(fajr, fajrCap);

    float isha;
    if (uIshaMinutes > 0.0) {
      isha = min(maghrib + uIshaMinutes * 0.25, 180.0);
    } else {
      float sI;
      isha = hourAngleFor(-uIshaAngle, lat, uDec, sI);
      float ishaCap = sunrise + (uIshaAngle / 60.0) * nightLen;
      isha = sI < -0.5 ? ishaCap : min(isha, ishaCap);
    }
    fajr = min(fajr, 180.0);
    isha = min(isha, 180.0);

    int band = -1;          // 0..4 prayer index
    float progress = 0.0;   // 0 at start edge, 1 at end edge
    float late = 0.0;

    if (polar > 0.5) {
      band = -1;
    } else if (polar < -0.5) {
      if (H >= 0.0 && H < asr) { band = 1; progress = H / max(asr, 0.001); }
      else if (H >= asr) { band = 2; progress = (H - asr) / max(180.0 - asr, 0.001); }
    } else if (H >= -fajr && H < -sunrise) {
      band = 0; progress = (H + fajr) / max(fajr - sunrise, 0.001);
    } else if (H >= 0.0 && H < asr) {
      band = 1; progress = H / max(asr, 0.001);
    } else if (H >= asr && H < sunrise) {
      band = 2; progress = (H - asr) / max(sunrise - asr, 0.001);
    } else if (H >= maghrib && H < isha) {
      band = 3; progress = (H - maghrib) / max(isha - maghrib, 0.001);
    } else if (H >= isha) {
      band = 4; progress = (H - isha) / max(180.0 - isha, 0.001);
    } else if (H < -fajr) {
      band = 4; late = 1.0; progress = (H + 180.0) / max(180.0 - fajr, 0.001);
    }

    vec3 col = toSRGB(base); // uColors are sRGB

    if (band >= 0 && uBands > 0.0) {
      vec3 bc = uColors[0];
      if (band == 1) bc = uColors[1];
      else if (band == 2) bc = uColors[2];
      else if (band == 3) bc = uColors[3];
      else if (band == 4) bc = uColors[4];
      // Radar trail: strongest just behind the leading (start) edge, fading toward the end
      float a = mix(0.5, 0.1, pow(clamp(progress, 0.0, 1.0), 0.7));
      // keep city lights readable on the night side
      a *= mix(0.75, 1.0, dayMix);
      if (late > 0.5) a = 0.1;
      col = mix(col, bc, a * uBands);
    }

    // Hatching where the sun never sets / never rises (no normal prayer cycle)
    if (abs(polar) > 0.5 && uBands > 0.0) {
      float stripe = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 14.0));
      col = mix(col, polar > 0.5 ? vec3(0.45, 0.5, 0.9) : vec3(1.0, 0.9, 0.5), stripe * 0.18 * uBands);
    }

    // ---------- boundary lines ----------
    if (uBands > 0.0 && abs(polar) < 0.5) {
      float px = max(length(fwidth(vPos)) * DEG, 1e-4);   // degrees of arc per pixel
      float k = max(cos(lat * RAD), 0.02);               // hour-angle degrees -> arc degrees
      // start edges (bright, in the prayer's colour)
      float lF = line(abs(wrap180(H + fajr)) * k, 2.2, px);
      float lD = line(abs(wrap180(H)) * k, 2.2, px);
      float lA = line(abs(wrap180(H - asr)) * k, 2.2, px);
      float lM = line(abs(wrap180(H - maghrib)) * k, 2.2, px);
      float lI = line(abs(wrap180(H - isha)) * k, 2.2, px);
      col = mix(col, uColors[0] * 1.35 + 0.1, lF * uBands);
      col = mix(col, uColors[1] * 1.35 + 0.1, lD * uBands);
      col = mix(col, uColors[2] * 1.35 + 0.1, lA * uBands);
      col = mix(col, uColors[3] * 1.35 + 0.1, lM * uBands);
      col = mix(col, uColors[4] * 1.35 + 0.1, lI * uBands);

      // end-only edges (soft, dashed white): sunrise, sunset, Islamic midnight
      float dash = step(0.45, fract(lat / 1.6));
      float lR = line(abs(wrap180(H + sunrise)) * k, 1.2, px);
      float lS = line(abs(wrap180(H - sunrise)) * k, 1.2, px) * (abs(maghrib - sunrise) > 0.05 ? 1.0 : 0.0);
      float lN = line(abs(wrap180(H - 180.0)) * k, 1.2, px);
      col = mix(col, vec3(1.0), (lR + lS + lN) * dash * 0.55 * uBands);
    }

    gl_FragColor = vec4(toLinear(col), 1.0);
    #include <colorspace_fragment>
  }
`

export const cloudVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const cloudFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uClouds;
  uniform vec3 uSunDir;        // world space (Earth is not rotated)
  uniform float uOpacity;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec2 vUv;

  // Cloud density lives in the alpha channel of the (palette) PNG
  float density(vec2 uv) { return texture2D(uClouds, uv).a; }

  // Smooth B-spline-style filter from 4 bilinear taps: softens the upscaled 1024px map
  float smoothDensity(vec2 uv) {
    vec2 texSize = vec2(1024.0, 512.0);
    vec2 st = uv * texSize - 0.5;
    vec2 i = floor(st);
    vec2 f = st - i;
    vec2 f2 = f * f, f3 = f2 * f;
    vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
    vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
    vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
    vec2 w3 = f3 / 6.0;
    vec2 g0 = w0 + w1, g1 = w2 + w3;
    vec2 h0 = (w1 / g0) - 1.0 + i + 0.5;
    vec2 h1 = (w3 / g1) + 1.0 + i + 0.5;
    h0 /= texSize; h1 /= texSize;
    float a = density(vec2(h0.x, h0.y)) * g0.x + density(vec2(h1.x, h0.y)) * g1.x;
    float b = density(vec2(h0.x, h1.y)) * g0.x + density(vec2(h1.x, h1.y)) * g1.x;
    return a * g0.y + b * g1.y;
  }

  void main() {
    float d = smoothstep(0.08, 0.85, smoothDensity(vUv));
    vec3 n = normalize(vNormalW);
    float ndl = dot(n, normalize(uSunDir));
    float lit = smoothstep(-0.1, 0.08, ndl);

    // Lambert-ish shading, warm along the terminator, dim blue-grey at night
    vec3 dayCol = vec3(1.0) * (0.55 + 0.45 * max(ndl, 0.0));
    vec3 dusk = vec3(1.0, 0.72, 0.5);
    dayCol = mix(dayCol, dusk, exp(-pow(ndl / 0.12, 2.0)) * 0.6);
    vec3 nightCol = vec3(0.07, 0.08, 0.11);
    vec3 color = mix(nightCol, dayCol, lit);

    // a touch brighter toward the limb so clouds sit above the surface
    vec3 viewDir = normalize(cameraPosition - vPosW);
    float limb = 1.0 - max(dot(viewDir, n), 0.0);
    color += vec3(0.08, 0.1, 0.14) * pow(limb, 2.0) * lit;

    float alpha = d * uOpacity * mix(0.35, 1.0, lit);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

export const atmosphereVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const atmosphereFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uSunDirW;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosW);
    float rim = pow(1.0 - abs(dot(viewDir, vNormalW)), 3.0);
    float day = smoothstep(-0.35, 0.4, dot(vNormalW, normalize(uSunDirW)));
    vec3 color = mix(vec3(0.15, 0.2, 0.45), vec3(0.35, 0.65, 1.0), day);
    gl_FragColor = vec4(color, rim * (0.25 + 0.75 * day));
    #include <colorspace_fragment>
  }
`
