// The open sea for the pirate ships (docs/PIRATE_SEAS.md), ported from Bellmourn's water (Bellmourn src/fps/water.js:
// rippleTexture, waterMaterial, the spray Points and the mist Billows). Bellmourn's surface is a Phong material patched
// in onBeforeCompile: two flow-advected ripple layers and two drifting ones make the normal, colour goes shallow to
// deep, foam comes from the ripple map's noise channel, and a Fresnel term mixes in a sky gradient. At sea it adds:
//   - a swell: a few long crossing waves lift the vertices (seaHeight() gives the same height to JS, so ships ride it)
//   - ship foam: a ring round each hull at the waterline, a bow wave, a churned centre wake and the two arms of a
//     Kelvin wake (19.5 degrees) trailing astern, all from setShips()
//   - splash rings: ripples running out from where a cannonball or a body hits the water (splash())
//   - spray (Bellmourn's Points) and mist (Bellmourn's Billows) for bow spray, splashes and shot columns
// Units are tiles, like the ships. buildSea(scene, opts) -> sea; sea.update(dt, t, { camera, height }) each frame.
import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const R = Math.random;
const NOISE = /* glsl */`
  float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fh(i), fh(i + vec2(1.0, 0.0)), f.x), mix(fh(i + vec2(0.0, 1.0)), fh(i + vec2(1.0, 1.0)), f.x), f.y); }`;

// ------------------------------------------------------------------ the swell (shared by the shader and JS)
// [dirX, dirZ, wavelength, amplitude, speed]: long crossing waves; amplitude in tiles. Kept gentle: the game camera is
// orthographic and 30 degrees down, so a big swell reads as the deck sliding about rather than as the sea moving.
export const SWELL = [[0.8, 0.6, 38, 0.32, 1.0], [-0.35, 0.94, 23, 0.2, 1.25], [0.97, -0.24, 14, 0.11, 1.6], [0.2, 0.98, 8.5, 0.05, 2.1]];
const swellGLSL = () => {
  const terms = SWELL.map(([dx, dz, wl, a, sp], i) => {
    const l = Math.hypot(dx, dz), k = (2 * Math.PI / wl).toFixed(5), w = (sp * Math.sqrt(9.8 * 2 * Math.PI / wl) * 0.35).toFixed(5);
    return `{ float ph = dot(p, vec2(${(dx / l).toFixed(4)}, ${(dz / l).toFixed(4)})) * ${k} - t * ${w}; h += ${a.toFixed(3)} * sin(ph) * wAmp;
      g += vec2(${(dx / l).toFixed(4)}, ${(dz / l).toFixed(4)}) * ${(a * 2 * Math.PI / wl).toFixed(5)} * cos(ph) * wAmp; }`;
  }).join('\n');
  return `vec3 swell(vec2 p, float t) { float h = 0.0; vec2 g = vec2(0.0); ${terms} return vec3(h, g); }`;
};
/** Sea height (tiles, relative to the sea's level) at world (x, z), time t; amp scales the swell like the shader. */
export function seaHeight(x, z, t, amp = 1) {
  let h = 0;
  for (const [dx, dz, wl, a, sp] of SWELL) {
    const l = Math.hypot(dx, dz), k = 2 * Math.PI / wl, w = sp * Math.sqrt(9.8 * k) * 0.35;
    h += a * Math.sin((x * dx / l + z * dz / l) * k - t * w) * amp;
  }
  return h;
}
/** How a hull of half length hl and half beam hb at (x, z), heading h (radians, 0 = bow toward -Z), rides the swell:
 *  { y, pitch, roll } (pitch: bow up positive, about X; roll: about Z). Big ships average it out over their length. */
export function ride(x, z, h, hl, hb, t, amp = 1) {
  const fx = -Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
  const H = (a, b) => seaHeight(x + fx * a + rx * b, z + fz * a + rz * b, t, amp);
  const bow = H(hl * 0.8, 0), stern = H(-hl * 0.8, 0), port = H(0, -hb), stbd = H(0, hb);
  return { y: (bow + stern + port + stbd) / 4, pitch: Math.atan2(bow - stern, hl * 1.6), roll: Math.atan2(port - stbd, hb * 2) };
}

// ------------------------------------------------------------------ the ripple map (Bellmourn's rippleTexture)
/** A tileable ripple map: rgb a normal from a sum of crossing waves, a a blotchy noise for foam. */
export function rippleTexture(n = 256) {
  const rnd = rng(4417), h = new Float32Array(n * n), f = new Float32Array(n * n);
  const waves = [];
  for (let i = 0; i < 30; i++) {          // integer wave numbers, so it tiles
    const k = 3 + Math.floor(Math.pow(rnd(), 1.6) * 22), a = rnd() * Math.PI * 2;
    waves.push([Math.round(Math.cos(a) * k), Math.round(Math.sin(a) * k), 1 / Math.pow(k, 1.15), rnd() * Math.PI * 2]);
  }
  const lat = [[6, 0.5], [12, 0.3], [24, 0.2]].map(([c, w]) => [c, w, Float32Array.from({ length: c * c }, rnd)]);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = 0;
    for (const [kx, ky, a, p] of waves) v += a * Math.sin((kx * x + ky * y) / n * Math.PI * 2 + p);
    h[y * n + x] = v;
    let q = 0;
    for (const [c, w, L] of lat) {        // value noise on wrapping lattices
      const fx = x / n * c, fy = y / n * c, ix = Math.floor(fx), iy = Math.floor(fy);
      let u = fx - ix, t = fy - iy; u = u * u * (3 - 2 * u); t = t * t * (3 - 2 * t);
      const g = (i, j) => L[((j % c) * c) + (i % c)];
      q += w * (g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * u + (g(ix, iy + 1) - g(ix, iy)) * t + (g(ix, iy) - g(ix + 1, iy) - g(ix, iy + 1) + g(ix + 1, iy + 1)) * u * t);
    }
    f[y * n + x] = q;
  }
  const data = new Uint8Array(n * n * 4), H = (x, y) => h[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1);
    data.set([(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l) * 255, Math.min(1, Math.max(0, (f[y * n + x] - 0.2) / 0.6)) * 255], (y * n + x) * 4);
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ the surface (Bellmourn's waterMaterial, at sea)
export const MAX_SHIPS = 12, MAX_RINGS = 10;
/** The weathers' water: deep and shallow colours, the sky it reflects, the swell, the foam and the current. */
export const SEAS = {
  day: { deep: 0x0d3c5e, shallow: 0x2a7f97, skyLo: 0xb8d4ea, skyHi: 0x4a82c8, amp: 1, chop: 1, current: [0.15, -0.35] },
  storm: { deep: 0x10242e, shallow: 0x2c5a62, skyLo: 0x7a8a96, skyHi: 0x2e3c48, amp: 2.4, chop: 1.8, current: [0.6, -1.1] },
  night: { deep: 0x05121f, shallow: 0x123a52, skyLo: 0x2a3a5a, skyHi: 0x0a1428, amp: 0.8, chop: 0.8, current: [0.1, -0.3] },
  sunset: { deep: 0x1c2a4a, shallow: 0x3c6a86, skyLo: 0xf0a070, skyHi: 0x5a5a9a, amp: 1, chop: 1, current: [0.15, -0.35] },
  fog: { deep: 0x1a3440, shallow: 0x46727c, skyLo: 0xc6d0d4, skyHi: 0x9aa8b0, amp: 0.6, chop: 0.6, current: [0.1, -0.2] },
  blood: { deep: 0x2a0a10, shallow: 0x6a2028, skyLo: 0xd07050, skyHi: 0x501820, amp: 1.3, chop: 1.2, current: [0.2, -0.5] },   // Velscour's red tide
};
function seaMaterial(U) {
  const m = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xc8d8e0, shininess: 160, transparent: true, depthWrite: false, side: THREE.FrontSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float wTime, wAmp; varying vec3 vWPos; ${swellGLSL()}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec4 wp0 = modelMatrix * vec4(transformed, 1.0); transformed.y += swell(wp0.xz, wTime).x; }`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D wTex; uniform float wTime, wAmp, wChop; uniform vec3 wSkyLo, wSkyHi, wDeep, wShallow; uniform vec2 wCurrent;
      uniform vec4 wShipA[${MAX_SHIPS}], wShipB[${MAX_SHIPS}]; uniform vec4 wRings[${MAX_RINGS}];
      varying vec3 vWPos;
      ${swellGLSL()}
      vec4 wFlowed(vec2 p, vec2 flow, float scale, float rate, float seed) {
        float ph = wTime * rate + seed, a = fract(ph), b = fract(ph + 0.5);
        vec2 f = flow / (rate * scale);
        vec4 s0 = texture2D(wTex, p / scale - f * (a - 0.5) + floor(ph) * vec2(0.37, 0.21) + seed);
        vec4 s1 = texture2D(wTex, p / scale - f * (b - 0.5) + floor(ph + 0.5) * vec2(0.29, 0.43) + seed + 0.5);
        return mix(s0, s1, abs(1.0 - 2.0 * a));
      }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 wp = vWPos.xz;
      vec3 sw = swell(wp, wTime);
      vec4 r1 = wFlowed(wp, wCurrent, 7.5, 0.3, 0.0);
      vec4 r2 = wFlowed(wp, wCurrent * 1.6, 2.4, 0.75, 0.31);
      vec4 r3 = texture2D(wTex, wp / 4.3 + wTime * vec2(0.012, -0.008));
      vec4 r4 = texture2D(wTex, wp / 2.9 + wTime * vec2(-0.010, 0.015) + 0.5);
      vec2 wGrad = ((r1.xy - 0.5) * 0.8 + (r2.xy - 0.5) * 0.7 + (r3.xy + r4.xy - 1.0) * 0.3) * wChop + sw.yz * 2.2;
      float wH = r1.w * 0.45 + r2.w * 0.55;
      // ships: foam round the hull, a bow wave, a churned wake and the two arms of a Kelvin wake astern
      float wShipF = 0.0;
      for (int i = 0; i < ${MAX_SHIPS}; i++) {
        vec4 A = wShipA[i], B = wShipB[i];
        if (B.x <= 0.0) continue;
        vec2 d = wp - A.xy, fw = vec2(A.z, A.w), rt = vec2(-A.w, A.z);
        float al = dot(d, fw), ac = dot(d, rt), hl = B.x, hb = B.y, spd = B.z;
        float e = length(vec2(al / hl, ac / (hb * (1.0 - 0.55 * smoothstep(0.2, 1.0, al / hl)))));   // a pointed bow
        float ring = smoothstep(0.86, 1.0, e) * (1.0 - smoothstep(1.0, 1.0 + (0.18 + 0.25 * spd) * 6.0 / hl, e));
        float bow = smoothstep(0.3, 1.0, al / hl) * smoothstep(1.0 + 0.6 * spd * 8.0 / hl, 1.0, e) * spd;
        float aft = -al - hl * 0.85;
        float churn = 0.0, arms = 0.0;
        if (aft > 0.0) {
          float wl = B.w, fade = 1.0 - smoothstep(0.0, wl, aft);
          churn = (1.0 - smoothstep(hb * 0.5, hb * (1.2 + aft / wl * 0.8), abs(ac))) * fade * spd;
          float armX = hb * 0.7 + aft * 0.354;                   // tan(19.5 deg)
          float wdt = 0.5 + aft * 0.06;
          arms = (1.0 - smoothstep(0.0, wdt, abs(abs(ac) - armX))) * fade * fade * spd * 0.9;
          float rip = sin(aft * 1.6 - wTime * 3.0 + abs(ac) * 0.8);
          wGrad += vec2(rt) * sign(ac) * arms * rip * 0.6;
        }
        wShipF = max(wShipF, max(ring * (0.55 + 0.45 * spd), max(bow, max(churn * 0.9, arms))));
      }
      // splash rings: (x, z, age, strength)
      float wRingF = 0.0;
      for (int i = 0; i < ${MAX_RINGS}; i++) {
        vec4 Q = wRings[i];
        if (Q.w <= 0.0) continue;
        vec2 rv = wp - Q.xy; float rd = length(rv), front = Q.z * 3.2 * sqrt(Q.w), k = exp(-Q.z * 1.4);
        float ph = (rd - front) * 3.4;
        wGrad += rv / max(rd, 0.01) * cos(ph) * exp(-abs(rd - front) * 0.9) * Q.w * k * 0.8;
        wRingF = max(wRingF, (1.0 - smoothstep(0.0, front + 0.3, rd)) * k * Q.w + (1.0 - smoothstep(0.0, 0.6, abs(rd - front))) * k * 0.6);
      }
      float wCrest = smoothstep(0.55, 1.0, sw.x / max(0.3, 0.5 * wAmp)) * 0.35 * smoothstep(1.2, 2.0, wAmp);   // whitecaps in a blow
      float wF = clamp(wShipF * 0.95 + wRingF + wCrest, 0.0, 0.93);
      float wFoam = smoothstep(1.0 - wF, 1.0 - wF + 0.25, wH) * step(0.01, wF);
      wFoam = max(wFoam * (0.75 + 0.25 * r4.w), smoothstep(0.75, 0.95, wShipF) * 0.85);
      float wTop = clamp(0.5 + sw.x / (0.9 * max(wAmp, 0.3)), 0.0, 1.0);    // swell crests a shade lighter
      diffuseColor.rgb = mix(mix(wDeep, wShallow, 0.18 + 0.32 * wTop + 0.15 * (r1.w - 0.5)), vec3(0.9, 0.94, 0.96), wFoam);
      float wAlpha = 0.9;`)
      .replace('#include <normal_fragment_maps>', `
      vec3 wN = normalize(vec3(-wGrad.x * (0.5 + 0.4 * wFoam), 1.0, -wGrad.y * (0.5 + 0.4 * wFoam)));
      normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);`)
      .replace('#include <envmap_fragment>', `
      vec3 wV = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
      float wFr = 0.02 + 0.98 * pow(1.0 - clamp(dot(normal, wV), 0.0, 1.0), 5.0);
      vec3 wR = (vec4(reflect(-wV, normal), 0.0) * viewMatrix).xyz;
      vec3 wSky = mix(wSkyLo, wSkyHi, smoothstep(-0.05, 0.55, wR.y));
      vec3 wSpec = reflectedLight.directSpecular;
      outgoingLight = mix(outgoingLight - wSpec, wSky, min(1.0, wFr * 2.5 + 0.08) * (1.0 - wFoam) * 0.85) + wSpec * (1.0 - wFoam * 0.8);
      diffuseColor.a = clamp(max(mix(wAlpha, 1.0, wFr * 0.85), wFoam * 0.97), 0.0, 1.0);`);
  };
  return m;
}

// ------------------------------------------------------------------ spray and mist (Bellmourn's Points and Billows)
const pxScale = (camera, height) => camera.isOrthographicCamera ? height * camera.zoom / (camera.top - camera.bottom) : height / 2 * camera.projectionMatrix.elements[5];
/** Small round points: droplets of spray (falling) and flecks of foam (riding the water). */
class Points {
  constructor(scene, max, L, flecks) {
    this.max = max; this.n = 0; this.flecks = flecks;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.age = new Float32Array(max); this.life = new Float32Array(max); this.size = new Float32Array(max);
    this.a = new Float32Array(max);
    this.data = new Float32Array(max * 3);   // size, alpha, seed
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pdata', new THREE.BufferAttribute(this.data, 3).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { scale: { value: 300 }, time: { value: 0 } }]),
      vertexShader: /* glsl */`
        uniform float scale; attribute vec3 pdata; varying float vA, vSeed;
        #include <fog_pars_vertex>
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float px = pdata.x * scale / (isOrthographic ? 1.0 : -mvPosition.z);
          gl_PointSize = max(px, 1.5);
          vA = pdata.y * min(1.0, px / 1.5);    // too small to see: fainter, not smaller
          vSeed = pdata.z;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`
        uniform float time; uniform vec3 sunCol, amb; varying float vA, vSeed;
        #include <fog_pars_fragment>
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          vec3 col = vec3(${flecks ? '0.86, 0.9, 0.9' : '0.8, 0.9, 0.95'}) * (amb + sunCol * 0.8);
          ${flecks ? '' : 'col += sunCol * 1.6 * step(0.9, fract(vSeed * 7.13 + time * 1.7));   // a drop catching the sun'}
          gl_FragColor = vec4(col, vA * smoothstep(1.0, 0.4, d));
          #include <fog_fragment>
        }`,
    });
    Object.assign(this.mat.uniforms, L);
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = flecks ? 2 : 4;
    scene.add(this.points);
  }
  add(x, y, z, vx, vy, vz, life, size, alpha) {
    if (this.n >= this.max) return -1;
    const i = this.n++;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3);
    this.age[i] = 0; this.life[i] = life; this.size[i] = size; this.a[i] = alpha; this.data[i * 3 + 2] = R();
    return i;
  }
  kill(i) {   // swap the last one in
    const j = --this.n;
    if (i === j) return;
    this.p.copyWithin(i * 3, j * 3, j * 3 + 3); this.v.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.size[i] = this.size[j]; this.a[i] = this.a[j]; this.data[i * 3 + 2] = this.data[j * 3 + 2];
  }
  step(dt, level, t, amp) {
    for (let i = 0; i < this.n; i++) {
      if ((this.age[i] += dt) >= this.life[i]) { this.kill(i); i--; continue; }
      const j = i * 3;
      if (this.flecks) {                                 // ride the surface, drifting
        this.p[j] += this.v[j] * dt; this.p[j + 2] += this.v[j + 2] * dt;
        this.v[j] *= 1 - dt * 0.6; this.v[j + 2] *= 1 - dt * 0.6;
        this.p[j + 1] = level + seaHeight(this.p[j], this.p[j + 2], t, amp) + 0.04;
      } else {
        this.v[j + 1] -= 9.8 * 0.8 * dt;
        const damp = 1 - Math.min(1, dt * 0.4); this.v[j] *= damp; this.v[j + 2] *= damp;
        this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
        if (this.v[j + 1] < 0 && this.p[j + 1] < level + seaHeight(this.p[j], this.p[j + 2], t, amp)) { this.kill(i); i--; }
      }
    }
  }
  upload(scale, t) {
    for (let i = 0; i < this.n; i++) {
      const k = this.age[i] / this.life[i];
      this.data[i * 3] = this.size[i]; this.data[i * 3 + 1] = this.a[i] * Math.min(1, this.age[i] * 6) * Math.min(1, (1 - k) * 4);
    }
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.pdata.needsUpdate = true;
    this.mat.uniforms.scale.value = scale; this.mat.uniforms.time.value = t;
  }
}
/** Mist: soft billows on camera-facing quads, lit by the sun and the sky (Bellmourn's, without the rainbow). */
class Billows {
  constructor(scene, max, L) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.age = new Float32Array(max); this.life = new Float32Array(max); this.size = new Float32Array(max);
    this.grow = new Float32Array(max); this.a = new Float32Array(max); this.spin = new Float32Array(max);
    this.ipos = new Float32Array(max * 3); this.idat = new Float32Array(max * 4);   // size, alpha, angle, seed
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute('position', q.attributes.position);
    g.setAttribute('ipos', new THREE.InstancedBufferAttribute(this.ipos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('idat', new THREE.InstancedBufferAttribute(this.idat, 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 } }]),
      vertexShader: /* glsl */`
        attribute vec3 ipos; attribute vec4 idat; varying vec2 vQ; varying float vA, vSeed; varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          float c = cos(idat.z), s = sin(idat.z);
          vec2 r = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * idat.x;
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vW = ipos + right * r.x + up * r.y;
          vec4 mvPosition = viewMatrix * vec4(vW, 1.0);
          vA = idat.y;
          vQ = position.xy * 2.0; vSeed = idat.w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`
        uniform float time; uniform vec3 sunCol, amb, sunDir; varying vec2 vQ; varying float vA, vSeed; varying vec3 vW;
        #include <fog_pars_fragment>
        ${NOISE}
        void main() {
          float d = length(vQ);
          if (d > 1.0) discard;
          float n = fn(vQ * 1.8 + vSeed * 31.0) * 0.6 + fn(vQ * 4.1 + vSeed * 17.0 + time * 0.15) * 0.4;
          float a = vA * pow(1.0 - d, 1.4) * (0.35 + 0.9 * n);
          vec3 col = vec3(0.88, 0.92, 0.95) * (amb + sunCol * (0.55 + 0.4 * (1.0 - vQ.y * 0.5 - vQ.x * 0.3)));
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
        }`,
    });
    Object.assign(this.mat.uniforms, L);
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
  }
  add(x, y, z, vx, vy, vz, { life, size, grow, alpha }) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3);
    this.age[i] = 0; this.life[i] = life; this.size[i] = size; this.grow[i] = grow; this.a[i] = alpha;
    this.spin[i] = (R() - 0.5) * 0.5; this.idat[i * 4 + 2] = R() * 6.28; this.idat[i * 4 + 3] = R();
  }
  update(dt, t, level) {
    for (let i = 0; i < this.n; i++) {
      if ((this.age[i] += dt) >= this.life[i]) {   // swap the last one in
        const j = --this.n;
        this.p.copyWithin(i * 3, j * 3, j * 3 + 3); this.v.copyWithin(i * 3, j * 3, j * 3 + 3);
        for (const A of [this.age, this.life, this.size, this.grow, this.a, this.spin]) A[i] = A[j];
        this.idat[i * 4 + 2] = this.idat[j * 4 + 2]; this.idat[i * 4 + 3] = this.idat[j * 4 + 3];
        i--; continue;
      }
      const damp = 1 - Math.min(1, dt * 0.6), j = i * 3;
      this.v[j] *= damp; this.v[j + 2] *= damp;
      this.v[j + 1] = this.v[j + 1] * damp + dt * 0.1 - dt * 0.6 * Math.max(0, this.v[j + 1]);
      this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
      if (this.p[j + 1] < level + this.size[i] * 0.15) this.p[j + 1] = level + this.size[i] * 0.15;
      const k = this.age[i] / this.life[i];
      this.ipos.set([this.p[j], this.p[j + 1], this.p[j + 2]], j);
      this.idat[i * 4] = this.size[i] + this.grow[i] * this.age[i];
      this.idat[i * 4 + 1] = this.a[i] * smooth(0, 0.12, k) * (1 - smooth(0.45, 1, k));
      this.idat[i * 4 + 2] += this.spin[i] * dt;
    }
    this.geo.instanceCount = this.n;
    this.geo.attributes.ipos.needsUpdate = true;
    this.geo.attributes.idat.needsUpdate = true;
    this.mat.uniforms.time.value = t;
  }
}

// ------------------------------------------------------------------ the sea
/**
 * buildSea(scene, { size, seg, level, weather, low }) -> sea:
 *   sea.mesh, sea.level, sea.setWeather(name), sea.setShips([{ x, z, heading, hl, hb, speed, wake }]),
 *   sea.splash(x, z, strength), sea.column(x, z, strength) (a shot's water column), sea.bowSpray(x, y, z, vx, vz, n),
 *   sea.heightAt(x, z), sea.follow(x, z) (keep the grid under the camera), sea.update(dt, t, { camera, height, sun, hemi }).
 */
export function buildSea(scene, { size = 420, seg = 220, level = 0, weather = 'day', low = false } = {}) {
  const L = { sunCol: { value: new THREE.Color(1, 0.97, 0.9) }, amb: { value: new THREE.Color(0.55, 0.6, 0.7) }, sunDir: { value: new THREE.Vector3(0, 1, 0) } };
  const U = {
    wTex: { value: rippleTexture() }, wTime: { value: 0 }, wAmp: { value: 1 }, wChop: { value: 1 }, wCurrent: { value: new THREE.Vector2() },
    wSkyLo: { value: new THREE.Color() }, wSkyHi: { value: new THREE.Color() },
    wDeep: { value: new THREE.Color() }, wShallow: { value: new THREE.Color() },
    wShipA: { value: Array.from({ length: MAX_SHIPS }, () => new THREE.Vector4()) },
    wShipB: { value: Array.from({ length: MAX_SHIPS }, () => new THREE.Vector4()) },
    wRings: { value: Array.from({ length: MAX_RINGS }, () => new THREE.Vector4()) },
  };
  const geo = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, seaMaterial(U));
  mesh.name = 'sea'; mesh.receiveShadow = true; mesh.renderOrder = 1; mesh.position.y = level; mesh.frustumCulled = false;
  scene.add(mesh);
  const spray = new Points(scene, low ? 900 : 2400, L, false), flecks = new Points(scene, low ? 400 : 1200, L, true);
  const mist = new Billows(scene, low ? 90 : 220, L);
  const rings = [];                                      // { x, z, age, k }
  let cur = SEAS[weather], ships = [], time = 0;
  const sea = {
    mesh, level, U, spray, flecks, mist,
    setWeather(name) {
      cur = SEAS[name] || SEAS.day;
      U.wDeep.value.set(cur.deep); U.wShallow.value.set(cur.shallow); U.wSkyLo.value.set(cur.skyLo); U.wSkyHi.value.set(cur.skyHi);
      U.wAmp.value = cur.amp; U.wChop.value = cur.chop; U.wCurrent.value.set(...cur.current);
    },
    get amp() { return U.wAmp.value; },
    heightAt: (x, z, t = time) => level + seaHeight(x, z, t, U.wAmp.value),
    ride: (x, z, h, hl, hb, t = time) => { const r = ride(x, z, h, hl, hb, t, U.wAmp.value); r.y += level; return r; },
    /** Ships for the foam: heading in radians (0 = bow toward -Z), hl/hb half length/beam at the waterline, speed 0..1.5. */
    setShips(list) { ships = list.slice(0, MAX_SHIPS); },
    splash(x, z, k = 1) {
      rings.push({ x, z, age: 0, k }); if (rings.length > MAX_RINGS) rings.shift();
      const y = sea.heightAt(x, z), n = Math.round(40 * k);
      for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, v = (0.6 + R() * 1.6) * Math.sqrt(k); spray.add(x, y + 0.1, z, Math.cos(a) * v, 2 + R() * 4 * k, Math.sin(a) * v, 1.2 + R(), 0.09 + R() * 0.08, 0.9); }
      for (let i = 0; i < 8 * k; i++) { const a = R() * Math.PI * 2; flecks.add(x + Math.cos(a) * R(), y, z + Math.sin(a) * R(), Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2, 3 + R() * 3, 0.12, 0.8); }
    },
    /** A cannonball's water column: a tall white plume of spray with mist at its foot, and a ring. */
    column(x, z, k = 1) {
      sea.splash(x, z, k * 1.4);
      const y = sea.heightAt(x, z);
      for (let i = 0; i < 160 * k; i++) { const a = R() * Math.PI * 2, r = R() * 0.5 * k; spray.add(x + Math.cos(a) * r, y + R() * 0.4, z + Math.sin(a) * r, Math.cos(a) * 0.7, 6 + R() * 7 * k, Math.sin(a) * 0.7, 1.6 + R() * 0.8, 0.12 + R() * 0.1, 0.95); }
      for (let i = 0; i < 9 * k; i++) mist.add(x + (R() - 0.5) * k, y + R() * 3 * k, z + (R() - 0.5) * k, (R() - 0.5) * 1.5, 1.5 + R() * 2.5, (R() - 0.5) * 1.5, { life: 2.2 + R(), size: 1.4 * k, grow: 1.6, alpha: 0.6 });
    },
    bowSpray(x, y, z, vx, vz, n = 6, up = 2.4) {
      for (let i = 0; i < n; i++) spray.add(x + (R() - 0.5) * 0.4, y, z + (R() - 0.5) * 0.4, vx + (R() - 0.5) * 1.4, up * (0.6 + R() * 0.8), vz + (R() - 0.5) * 1.4, 0.9 + R() * 0.5, 0.07 + R() * 0.07, 0.85);
    },
    fleck(x, z, vx = 0, vz = 0, life = 4) { flecks.add(x, level, z, vx, 0, vz, life, 0.1 + R() * 0.06, 0.7); },
    puff(x, y, z, size = 1.2, alpha = 0.45) { mist.add(x, y, z, (R() - 0.5) * 0.6, 0.5 + R(), (R() - 0.5) * 0.6, { life: 1.6 + R(), size, grow: 0.9, alpha }); },
    follow(x, z) { const st = size / seg; mesh.position.x = Math.round(x / st) * st; mesh.position.z = Math.round(z / st) * st; },
    update(dt, t, { camera, height, sun, hemi } = {}) {
      time = t; U.wTime.value = t % 3600;
      if (sun) {
        L.sunDir.value.copy(sun.position).sub(sun.target.position).normalize();
        L.sunCol.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
      }
      if (hemi) L.amb.value.copy(hemi.color).lerp(hemi.groundColor, 0.3).multiplyScalar(hemi.intensity / Math.PI);
      for (let i = 0; i < MAX_SHIPS; i++) {
        const s = ships[i];
        if (!s) { U.wShipB.value[i].set(0, 0, 0, 0); continue; }
        U.wShipA.value[i].set(s.x, s.z, -Math.sin(s.heading), -Math.cos(s.heading));
        U.wShipB.value[i].set(s.hl, s.hb, s.speed ?? 0.5, s.wake ?? s.hl * 3);
      }
      for (const r of rings) r.age += dt;
      while (rings.length && rings[0].age > 4) rings.shift();
      for (let i = 0; i < MAX_RINGS; i++) { const r = rings[i]; U.wRings.value[i].set(r ? r.x : 0, r ? r.z : 0, r ? r.age : 0, r ? r.k : 0); }
      // foam flecks shed along the wakes, spray off moving bows
      for (const s of ships) {
        const sp = s.speed ?? 0.5; if (sp < 0.05) continue;
        const fx = -Math.sin(s.heading), fz = -Math.cos(s.heading), rx = Math.cos(s.heading), rz = -Math.sin(s.heading);
        if (R() < dt * 30 * sp) { const side = R() < 0.5 ? -1 : 1, a = -s.hl * (0.6 + R() * 0.4); flecks.add(s.x + fx * a + rx * side * s.hb * (0.8 + R() * 0.4), level, s.z + fz * a + rz * side * s.hb, rx * side * 0.6 - fx * 0.3, 0, rz * side * 0.6 - fz * 0.3, 4 + R() * 4, 0.1 + R() * 0.07, 0.75); }
        if (s.spray !== false && R() < dt * 26 * sp) {
          const bx = s.x + fx * s.hl * 0.95, bz = s.z + fz * s.hl * 0.95, y = sea.heightAt(bx, bz);
          for (const side of [-1, 1]) sea.bowSpray(bx + rx * side * s.hb * 0.35, y + 0.15, bz + rz * side * s.hb * 0.35, rx * side * 1.8 * sp, rz * side * 1.8 * sp, 2, 1.6 + 1.6 * sp);
        }
      }
      spray.step(dt, level, t, U.wAmp.value); flecks.step(dt, level, t, U.wAmp.value); mist.update(dt, t, level);
      if (camera) { const sc = pxScale(camera, height || 720); spray.upload(sc, t); flecks.upload(sc, t); }
    },
  };
  sea.setWeather(weather);
  return sea;
}
