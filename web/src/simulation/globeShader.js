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
  uniform float uTime;         // seconds, drives the edge shimmer
  uniform float uIntro;        // intro draw clock in seconds (large = fully drawn)
  uniform float uEndLines;     // 0..1 opacity of the dashed end lines (intro fade)
  uniform float uSpread;       // intro fan: 0 = all edges gathered at uGatherH, 1 = true positions
  uniform float uGatherH;      // hour angle (deg) of the meridian the fan opens from
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

  // ---------- intro: each start line is drawn pole to pole, then its band washes in ----------
  float easeInOut(float t) { return t * t * (3.0 - 2.0 * t); }

  // 0..1 drawing progress of band i (Fajr 0 .. Isha 4), staggered 0.15 s, 1.0 s each
  float introT(float i) { return clamp((uIntro - i * 0.15) / 1.0, 0.0, 1.0); }

  // Latitude the pen has reached for band i (north to south)
  float penLat(float i) { return 90.0 - 184.0 * easeInOut(introT(i)); }

  // 1 where the line of band i has been drawn at this latitude
  float revealAt(float i, float latTrue) {
    float tip = penLat(i);
    return smoothstep(tip - 1.5, tip + 1.5, latTrue);
  }

  // Fraction of band i's width (start edge -> end edge) that has washed in
  float fillAt(float i) {
    float t = introT(i);
    return easeInOut(clamp((t - 0.1) / 0.5, 0.0, 1.0)) * 1.1;
  }

  // Glowing start edge. d: signed arc distance (deg), positive inside the starting window
  // reveal: 0..1 how much of the line is drawn here; tip: bright pen point while drawing
  vec3 startEdge(vec3 col, float d, vec3 bc, float px, float shimmer, float reveal, float tip) {
    float ad = abs(d);
    if (ad > 40.0 * px) return col;   // cheap early-out far from the edge
    float k = uBands * reveal;
    // faint dark seam just ahead of the edge (outgoing side) so it reads as a cut
    float seam = (1.0 - smoothstep(0.0, 2.0 * px, abs(d + 3.0 * px))) * step(d, 0.0);
    col *= 1.0 - 0.35 * seam * k;
    // soft halo on both sides
    col += bc * exp(-ad / (7.0 * px)) * 0.45 * shimmer * k;
    // crisp core of warm light
    vec3 core = mix(bc, vec3(1.0, 0.965, 0.863), 0.55) * (0.9 + 0.25 * shimmer);
    col = mix(col, core, line(ad, 2.6, px) * k);
    // the pen: a bright warm point at the drawing tip
    col += mix(bc, vec3(1.0, 0.97, 0.9), 0.6) * exp(-ad / (5.0 * px)) * tip * 1.4 * uBands;
    return col;
  }

  float tipGlow(float i, float latTrue) {
    float t = introT(i);
    if (t <= 0.0 || t >= 1.0) return 0.0;
    float dl = latTrue - penLat(i);
    return exp(-dl * dl / 6.0) * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.85, 1.0, t));
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
    // Polar day/night: estimate from the nearest latitude where the sun rises and sets
    // (mirrors polarLatitude() in solar.js)
    float latTrue = lat;
    bool sameSide = latTrue * uDec > 0.0;
    float aDec = abs(uDec);
    float thr = sameSide ? 90.0 - aDec - 0.833 : 90.0 - aDec + 0.833;
    float limit = sameSide ? thr - 0.25 : 90.0 - aDec - 0.5;
    float estimated = abs(latTrue) > limit ? 1.0 : 0.0;
    if (estimated > 0.5) lat = sign(latTrue) * limit;

    float st;
    float sunrise = hourAngleFor(-0.833, lat, uDec, st);

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

    // Displayed boundaries. The intro fan squeezes every boundary toward uGatherH with one factor,
    // which keeps their order (bands never cross); uSpread = 1 gives the true positions.
    float sp = clamp(uSpread, 0.0, 1.0);
    float eF = uGatherH + (-fajr - uGatherH) * sp;       // Fajr starts
    float eR = uGatherH + (-sunrise - uGatherH) * sp;    // sunrise
    float eD = uGatherH + (0.0 - uGatherH) * sp;         // Dhuhr starts
    float eA = uGatherH + (asr - uGatherH) * sp;         // Asr starts
    float eS = uGatherH + (sunrise - uGatherH) * sp;     // sunset
    float eM = uGatherH + (maghrib - uGatherH) * sp;     // Maghrib starts
    float eI = uGatherH + (isha - uGatherH) * sp;        // Isha starts
    float eNm = uGatherH + (-180.0 - uGatherH) * sp;     // Islamic midnight (west side)
    float eNp = uGatherH + (180.0 - uGatherH) * sp;      // Islamic midnight (east side)

    int band = -1;          // 0..4 prayer index
    float progress = 0.0;   // 0 at start edge, 1 at end edge
    float late = 0.0;

    if (H >= eF && H < eR) {
      band = 0; progress = (H - eF) / max(eR - eF, 0.001);
    } else if (H >= eD && H < eA) {
      band = 1; progress = (H - eD) / max(eA - eD, 0.001);
    } else if (H >= eA && H < eS) {
      band = 2; progress = (H - eA) / max(eS - eA, 0.001);
    } else if (H >= eM && H < eI) {
      band = 3; progress = (H - eM) / max(eI - eM, 0.001);
    } else if (H >= eI && H < eNp) {
      band = 4; progress = (H - eI) / max(eNp - eI, 0.001);
    } else if (H >= eNm && H < eF) {
      band = 4; late = 1.0; progress = (H - eNm) / max(eF - eNm, 0.001);
    }

    vec3 col = toSRGB(base); // uColors are sRGB

    if (band >= 0 && uBands > 0.0) {
      vec3 bc = uColors[0];
      if (band == 1) bc = uColors[1];
      else if (band == 2) bc = uColors[2];
      else if (band == 3) bc = uColors[3];
      else if (band == 4) bc = uColors[4];
      float p = clamp(progress, 0.0, 1.0);
      // intro: the colour washes from the start edge toward the end, behind the drawn part of the line
      float bi = float(band);
      float f = fillAt(bi);
      float wash = (1.0 - smoothstep(f - 0.08, f, p)) * revealAt(bi, latTrue);
      // Radar trail: solid just behind the leading (start) edge, fading toward the end
      float a = mix(0.6, 0.2, pow(p, 0.55));
      float sheen = exp(-p * 14.0) * 0.28;   // lit-from-within glow right behind the edge
      if (late > 0.5) { a = 0.16; sheen = 0.0; }
      float ub = uBands * wash;
      col = mix(col, bc, a * ub);
      // add light (not just tint) so bands glow over dark ground at night
      col += bc * (a * 0.3 * (1.0 - dayMix) + sheen) * ub;
      // gentle saturation lift inside the band
      float g = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, g + (col - g) * 1.15, ub);
    }

    // Light hatching where times are estimated (sun never sets / never rises, or barely clears the horizon)
    if (estimated > 0.5 && uBands > 0.0) {
      float stripe = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 14.0));
      col = mix(col, sameSide ? vec3(1.0, 0.9, 0.5) : vec3(0.45, 0.5, 0.9), stripe * 0.12 * uBands * uEndLines);
    }

    // ---------- boundary lines ----------
    if (uBands > 0.0) {
      float px = max(length(fwidth(vPos)) * DEG, 1e-4);   // degrees of arc per pixel
      float k = max(cos(latTrue * RAD), 0.02);               // hour-angle degrees -> arc degrees
      // start edges: crisp core of warm light, soft halo, slow shimmer flowing pole to pole
      float shimmer = 0.8 + 0.2 * sin(latTrue * 0.12 - uTime * 1.2);
      // signed arc distance from each start edge (positive = inside the new window)
      float dF = wrap180(H - eF) * k;
      float dD = wrap180(H - eD) * k;
      float dA = wrap180(H - eA) * k;
      float dM = wrap180(H - eM) * k;
      float dI = wrap180(H - eI) * k;
      col = startEdge(col, dF, uColors[0], px, shimmer, revealAt(0.0, latTrue), tipGlow(0.0, latTrue));
      col = startEdge(col, dD, uColors[1], px, shimmer, revealAt(1.0, latTrue), tipGlow(1.0, latTrue));
      col = startEdge(col, dA, uColors[2], px, shimmer, revealAt(2.0, latTrue), tipGlow(2.0, latTrue));
      col = startEdge(col, dM, uColors[3], px, shimmer, revealAt(3.0, latTrue), tipGlow(3.0, latTrue));
      col = startEdge(col, dI, uColors[4], px, shimmer, revealAt(4.0, latTrue), tipGlow(4.0, latTrue));

      // end-only edges (dashed white): sunrise, sunset, Islamic midnight
      float dash = step(0.45, fract(latTrue / 1.6));
      float lR = line(abs(wrap180(H - eR)) * k, 1.4, px);
      float lS = line(abs(wrap180(H - eS)) * k, 1.4, px) * (abs(maghrib - sunrise) > 0.05 ? 1.0 : 0.0);
      float lN = max(line(abs(wrap180(H - eNp)) * k, 1.4, px), line(abs(wrap180(H - eNm)) * k, 1.4, px));
      col = mix(col, vec3(1.0), clamp(lR + lS + lN, 0.0, 1.0) * dash * 0.6 * uBands * uEndLines);
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
  uniform float uBands;        // clouds thin out while prayer bands are shown
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

    float alpha = d * uOpacity * mix(0.35, 1.0, lit) * mix(1.0, 0.6, uBands);
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
