// The mountain overworlds in three.js (the Mountainside and the Snowy Summit; world/alpine.js builds their height
// fields, game/alpine.js lifts the sprites onto them and picks through them). Drawn live behind the 2D sprites with
// the game's own camera, as the caverns and the dunes are:
//  - the ground is every tile's own floor art (the level's floor list, unprojected from its 160 x 80 diamond into a
//    seamless square, packed into an atlas), chosen per tile through an index texture and blended at the seams;
//  - steep faces are rock, triplanar, from the Snowy Summit pack's wall materials (granite, shale, slate), recoloured
//    per map; gentle rock carries snow above the map's snow line;
//  - a skirt of lower peaks runs on past the map's edges, a sea of cloud fills the valleys, and a painted sky with
//    far snowy ranges shows behind everything.
import { G } from '../state.js';
import { camera, HW, HH } from '../core/view.js';
import { makeCanvas, recolor, clamp } from '../core/util.js';
import { loadImage } from '../core/assets.js';
import { VZ } from '../world/caverns.js';

const SC = HW * Math.SQRT2;          // world px per tile across the screen (one three.js unit)
const CELL = 128, PAD = 4, SLOT = CELL + 2 * PAD;
const MATS = ['snow_capped_granite', 'ice_bound_shale', 'frost_niche_slate', 'ruined_alpine_drywall', 'summit_shrine_ashlar'];
let T = null, R = null, S = null;
const IMG = {};

/** three.js and the Snowy Summit's wall materials (the cliffs' rock). Rejects if three.js can't be fetched. */
export async function loadAlpine3D() {
  if (!T) T = await import('three');
  await Promise.all(MATS.map(async (m) => { if (!IMG[m]) IMG[m] = await loadImage(`assets/tiles/snowy_summit/materials/${m}.webp`); }));
}
export const alpine3dReady = () => !!T;
export const alpineScene = () => S;

function renderer() {
  if (R) return R;
  const gl = new T.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  gl.setPixelRatio(1);
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 1, 2400);
  const e = Math.PI / 6, a = Math.PI / 4;
  cam.position.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(1100);
  cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  R = { gl, cam, w: 0, h: 0 };
  return R;
}
const rgb3 = (hex) => { const n = parseInt(hex.slice(1), 16); return new T.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const col = (hex) => new T.Color(hex);
const hash = (x, y, s) => { let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

// ------------------------------------------------------------------ textures
function tex(canvas, { srgb = true, linear = true, flip = true } = {}) {
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = linear ? T.LinearFilter : T.NearestFilter; t.minFilter = linear ? T.LinearMipmapLinearFilter : T.NearestFilter;
  t.flipY = flip; t.anisotropy = 4;
  return t;
}
/** The floors as one atlas: each diamond unprojected into a CELL px square, PAD px of its own wrap round it. */
function floorAtlas(floors) {
  const n = floors.length, cols = Math.min(16, Math.max(1, Math.ceil(Math.sqrt(n)))), rows = Math.ceil(n / cols);
  const c = makeCanvas(cols * SLOT, rows * SLOT), g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  floors.forEach((f, i) => {
    const ox = (i % cols) * SLOT + PAD, oy = Math.floor(i / cols) * SLOT + PAD, N = CELL;
    g.save(); g.beginPath(); g.rect(ox - PAD, oy - PAD, SLOT, SLOT); g.clip();
    for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) {
      g.setTransform(N / 160, -N / 160, N / 80, N / 80, ox - N / 2 + du * N, oy + N / 2 + dv * N);
      g.drawImage(f.img, f.sx, f.sy, f.w, f.h, 0, 0, 160, 80);
    }
    g.restore();
  });
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: c, cols, rows };
}
/** A wall material (160 x 256, a capped course top and bottom) as a 160 x 160 rock face seamless both ways. */
function rockFace(img, swap, contrast = 1, target = 0.42) {
  const c = makeCanvas(160, 160), g = c.getContext('2d');
  g.drawImage(img, 0, 40, 160, 160, 0, 0, 160, 160);
  // the top 28 rows fade into the rows that follow the bottom, so the face repeats up the cliff without a seam
  const t = makeCanvas(160, 28), tg = t.getContext('2d');
  tg.drawImage(img, 0, 200, 160, 28, 0, 0, 160, 28);
  const gr = tg.createLinearGradient(0, 0, 0, 28); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = gr; tg.fillRect(0, 0, 160, 28);
  g.drawImage(t, 0, 0);
  // the wall art's snow caps would streak every cliff like rain: the bright pixels are taken back to the stone's own
  // tone (the shader lays snow on the ledges itself), and the whole is softened, so courses read as strata
  const d = g.getImageData(0, 0, 160, 160), px = d.data;
  let sr = 0, sg = 0, sb = 0, n = 0;
  const L = (i) => (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
  for (let i = 0; i < px.length; i += 4) if (L(i) < 0.45) { sr += px[i]; sg += px[i + 1]; sb += px[i + 2]; n++; }
  sr /= n || 1; sg /= n || 1; sb /= n || 1;
  let lum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const l = L(i), f = Math.min(1, Math.max(0, (l - 0.42) / 0.3)) * 0.85, k = 0.82 * contrast;
    px[i] = (px[i] * (1 - f) + sr * f) * k + sr * (1 - k); px[i + 1] = (px[i + 1] * (1 - f) + sg * f) * k + sg * (1 - k); px[i + 2] = (px[i + 2] * (1 - f) + sb * f) * k + sb * (1 - k);
    lum += L(i);
  }
  // and lifted to a mid value (mean luminance ~0.42), so a cliff is a mid grey stone, not a black hole
  const gain = Math.min(2.4, target / Math.max(0.05, lum / (px.length / 4)));
  for (let i = 0; i < px.length; i += 4) { px[i] = Math.min(255, px[i] * gain); px[i + 1] = Math.min(255, px[i + 1] * gain); px[i + 2] = Math.min(255, px[i + 2] * gain); }
  g.putImageData(d, 0, 0);
  return swap ? recolor(c, swap) : c;
}
function noiseTex(N = 128, seed = 1) {
  const c = makeCanvas(N, N), g = c.getContext('2d'), d = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const a = (x / N) * 6.2832, b = (y / N) * 6.2832;
    const v = 0.5 + 0.2 * Math.sin(a * 2 + Math.sin(b * 3 + seed) * 1.7) * Math.cos(b * 2 + Math.cos(a * 3)) + 0.16 * Math.sin(a * 5 + b * 4 + seed) * Math.sin(b * 6 - a * 2) + 0.08 * Math.sin(a * 11 - b * 9);
    const u = 0.5 + 0.2 * Math.cos(a * 3 - Math.sin(b * 2 + seed) * 1.3) * Math.sin(b * 3 + Math.cos(a * 2)) + 0.15 * Math.cos(a * 4 - b * 5 + seed) * Math.sin(b * 7 + a * 3) + 0.08 * Math.cos(a * 9 + b * 10);
    d.data.set([255 * clamp(v, 0, 1), 255 * clamp(u, 0, 1), 0, 255], (y * N + x) * 4);
  }
  g.putImageData(d, 0, 0);
  return c;
}

// ------------------------------------------------------------------ the terrain material
function terrainMaterial(uni) {
  const m = new T.MeshStandardMaterial({ roughness: 0.94, metalness: 0, side: T.FrontSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = 'attribute vec4 cmat; attribute float csnow;\nvarying vec3 vWp; varying vec3 vWn; varying vec4 vMat; varying float vSnow;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvWp = position; vWn = normal; vMat = cmat; vSnow = csnow;');
    sh.fragmentShader = `uniform sampler2D tAtlas, tIdx, tRA, tRB, tN; uniform vec2 uMapWH, uAtlasN, uSnow, uMist, uSnowK; uniform float uRS, uBump, uSnowId, uStepId, uWinter, uFloorBump, uTime;
uniform vec3 uSnowC, uMistC, uTint, uFlank;
varying vec3 vWp; varying vec3 vWn; varying vec4 vMat; varying float vSnow;
float alpH = 0.0, alpLod = 0.0, alpSnow = 0.0;
vec3 cellAt(float id, vec2 q, float lod) {
  vec2 cell = vec2(mod(id, uAtlasN.x), floor(id / uAtlasN.x));
  vec2 uv = (cell * ${SLOT.toFixed(1)} + ${PAD.toFixed(1)} + fract(q) * ${CELL.toFixed(1)}) / (uAtlasN * ${SLOT.toFixed(1)});
  return textureLod(tAtlas, uv, lod).rgb;
}
// a tile's floor, mirrored and turned as its flags say (G channel: 1 mirror x, 2 mirror y, 4 swap), so a field of one
// floor doesn't show its grid
vec3 cellC(vec2 t, vec2 p) {
  t = clamp(t, vec2(0.0), uMapWH - 1.0);
  vec2 rg = texture2D(tIdx, (t + 0.5) / uMapWH).rg * 255.0 + 0.5;
  float id = floor(rg.x), fl = floor(rg.y);
  // a wind floor runs on unbroken from tile to tile at twice the size, its lines wandering, so ripples read as one snowfield
  if (fl >= 8.0) return cellAt(id, p * 0.5 + (texture2D(tN, p * 0.021).rg - 0.5) * 1.1, max(0.0, alpLod - 1.0));
  vec2 q = fract(p);
  if (mod(fl, 2.0) >= 1.0) q.x = 1.0 - q.x;
  if (mod(floor(fl / 2.0), 2.0) >= 1.0) q.y = 1.0 - q.y;
  if (fl >= 4.0) q = q.yx;
  return cellAt(id, q, alpLod);
}
vec3 floorAt(vec2 p) {
  vec2 f = p - 0.5 + (texture2D(tN, p * 0.31).rg - 0.5) * 0.7, i0 = floor(f), w = smoothstep(0.3, 0.7, f - i0);
  return mix(mix(cellC(i0, p), cellC(i0 + vec2(1.0, 0.0), p), w.x), mix(cellC(i0 + vec2(0.0, 1.0), p), cellC(i0 + vec2(1.0, 1.0), p), w.x), w.y);
}
vec3 rockAt(sampler2D t, vec3 w3, float s) {
  vec2 uxy = vec2(vWp.x, -vWp.y) * s, uzy = vec2(vWp.z, -vWp.y) * s, uxz = vWp.xz * s;
  return texture2D(t, uxy).rgb * w3.z + texture2D(t, uzy).rgb * w3.x + texture2D(t, uxz).rgb * w3.y;
}
// the rolling drifts under the snow, in tiles of height: long wind-carved dunes, smooth so they light cleanly
float snowH(vec2 p) {
  float w = sin(p.y * 0.31 + 1.7 * sin(p.x * 0.17)) + sin(p.x * 0.23 - 1.3 * sin(p.y * 0.13 + 2.0));
  float r = dot(p, vec2(0.82, 0.57)) * 1.25 + w * 1.6;
  return 0.2 * sin(r) + 0.07 * sin(r * 2.3 + w * 2.0 + 1.0) + 0.14 * sin(p.x * 0.41 + w) * sin(p.y * 0.37 - w);
}
float glintH(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 perturbAlp(vec3 sp, vec3 sn, vec2 dH, float fd) {
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, sn), r2 = cross(sn, sx);
  float det = dot(sx, r1) * fd;
  return normalize(abs(det) * sn - sign(det) * (dH.x * r1 + dH.y * r2));
}
` + sh.fragmentShader
      .replace('#include <map_fragment>', `
  // the atlas's mip level from the ground's own derivatives (fract would seam them), held inside its padding
  alpLod = clamp(log2(max(length(dFdx(vWp.xz)), length(dFdy(vWp.xz))) * ${CELL.toFixed(1)}), 0.0, 2.0);
  vec3 n = normalize(vWn), w3 = pow(abs(n), vec3(6.0)); w3 /= (w3.x + w3.y + w3.z);
  vec2 nzz = texture2D(tN, vWp.xz * 0.022).rg;
  float nz = nzz.x, nz2 = nzz.y, nz3 = texture2D(tN, vec2(vWp.x + vWp.z, vWp.y) * 0.07).r;
  // walkable ground is its floor art; a ledge's face between two walkable tiles is laid stone steps (light: a hop), a
  // cliff's face rock (dark: a wall); rock shows its floor art only where it lies gentle. Each only where it shows.
  // vMat.x: 0 walkable, ~0.78 the rock rim just off walkable ground (dark, bare: an outline under every path edge), 1 rock
  bool walk = vMat.x < 0.4, rim = !walk && vMat.x < 0.9;
  float flatK = walk ? smoothstep(0.62, 0.88, n.y) : smoothstep(0.72, 0.92, n.y);
  vec3 alb = vec3(0.0);
  if (flatK > 0.001) {
    alb = floorAt(vWp.xz);
    if (uWinter > 0.0) {
      // what is snow (bright, little colour) is graded from the art's own light: blue in the hollows, warm white on the crests
      float l = dot(alb, vec3(0.3, 0.59, 0.11)), hi = max(alb.r, max(alb.g, alb.b)), lo = min(alb.r, min(alb.g, alb.b));
      alpSnow = flatK * smoothstep(0.2, 0.34, l) * (1.0 - smoothstep(0.34, 0.55, (hi - lo) / max(hi, 0.001)));
      if (alpSnow > 0.001) {
        vec3 g = mix(vec3(0.36, 0.48, 0.74), vec3(0.62, 0.71, 0.86), smoothstep(0.2, 0.46, l));
        g = mix(g, vec3(0.84, 0.84, 0.83), smoothstep(0.44, 0.78, l));
        g *= mix(vec3(0.74, 0.82, 1.0), vec3(1.04, 1.02, 0.98), smoothstep(-0.25, 0.22, snowH(vWp.xz)));
        alb = mix(alb, g, alpSnow);
      }
    }
    // floor art on rock (a gentle scree you can't walk) is darker, greyer and shaded with the rock, so it never reads as path
    if (!walk) alb = mix(vec3(dot(alb, vec3(0.3, 0.59, 0.11))), alb, 0.6) * 0.78 * (0.82 + 0.36 * nz3);
  }
  if (flatK < 0.999) {
    vec3 face;
    if (walk) {
      vec2 sq = (w3.z > w3.x ? vec2(vWp.x, -vWp.y * 1.4) : vec2(vWp.z, -vWp.y * 1.4)) * 0.9;
      face = cellAt(uStepId, sq, alpLod) * 1.1;
    } else {
      // the rock at two scales and in two stones, mixed by a slow noise: no wallpaper over a big face
      vec3 r1 = rockAt(tRA, w3, uRS), r2 = rockAt(tRB, w3, uRS * 0.43);
      face = mix(r1, r2, clamp(smoothstep(0.3, 0.7, nz) * 0.7 + vMat.w * 0.3, 0.0, 1.0)) * uTint;
      face = mix(vec3(dot(face, vec3(0.3, 0.59, 0.11))), face, 0.85) * (0.82 + 0.36 * nz3);   // macro tone down the face
    }
    alb = mix(face, alb, flatK);
  }
  // snow lies on the rock above the snow line where the ground (blurred: csnow) isn't too steep, in broad drifts, in the
  // pack's own snow, shaded down the flanks so the path stays the brightest thing on screen
  float sn = rim ? 0.0 : step(0.4, vMat.x) * smoothstep(uSnow.x, uSnow.y, vWp.y + (nz - 0.5) * 3.0);
  if (uWinter > 0.0) {
    // a hard, broken edge: the snow packs into the rock's cracks and ledges and stops, no grey smear down the cliff
    float fine = texture2D(tN, vWp.xz * 0.37 + vWp.y * 0.11).r + texture2D(tN, vec2(vWp.x - vWp.z, vWp.y * 1.6) * 0.21).g - 1.0;
    float e = vSnow + (nz2 - 0.5) * 0.3 + fine * 0.13 - dot(alb, vec3(0.3, 0.59, 0.11)) * 0.22, m = 0.5 * (uSnowK.x + uSnowK.y) - 0.02;
    sn *= smoothstep(m - 0.014, m + 0.014, e);
  } else sn *= smoothstep(uSnowK.x, uSnowK.y, vSnow + (nz2 - 0.5) * 0.3);
  if (sn > 0.001) {
    vec3 snow = cellAt(uSnowId, vWp.xz, alpLod) * uSnowC;
    if (uWinter > 0.0) { snow = mix(snow * 0.82, uFlank, 0.16 + vMat.y * 0.3); alpSnow = max(alpSnow, sn * 0.6); }
    else snow = mix(snow * 0.62, uFlank, 0.4 + vMat.y * 0.3);   // well below the path's own snow, toward the flank's blue-grey
    alb = mix(alb, snow, sn);
  }
  if (rim) alb *= 0.55;
  alb = mix(alb, uMistC * 0.8, vMat.y * 0.42) * (0.9 + 0.2 * vMat.z);
  // the bump is the rock's own light; painted floors already carry theirs (uFloorBump), and snow rolls over its drifts
  alpH = dot(alb, vec3(0.3, 0.59, 0.11)) * mix(1.0, uFloorBump, flatK);
  if (uWinter > 0.0) alpH = mix(alpH, snowH(vWp.xz) / max(uBump, 0.01), min(1.0, alpSnow * 1.4));
  diffuseColor.rgb *= alb;`)
      .replace('#include <normal_fragment_maps>', 'normal = perturbAlp(-vViewPosition, normal, vec2(dFdx(alpH), dFdy(alpH)) * uBump, faceDirection);')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  if (alpSnow > 0.01) {
    // spindrift: thin veils of snow blown along the ground on the wind
    vec2 wnd = vec2(0.82, 0.57) * uTime, wp = vec2(vWp.x * 0.57 - vWp.z * 0.82, vWp.x * 0.82 + vWp.z * 0.57);
    float a = texture2D(tN, vWp.xz * 0.05 - wnd * 0.016).r, b = texture2D(tN, vWp.xz * 0.15 - wnd * 0.06).g, c = texture2D(tN, vec2(wp.x * 0.95, wp.y * 0.24) - vec2(0.0, uTime * 0.17)).r;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.97, 0.985, 1.0), alpSnow * 0.5 * smoothstep(0.5, 0.74, a * 0.6 + b * 0.5) * smoothstep(0.42, 0.72, c));
    // ice glints: a grain here and there catching the sun, each on its own beat
    vec2 gc = floor(vWp.xz * 24.0);
    float gh = glintH(gc), tw = pow(max(0.0, sin(uTime * (1.1 + gh * 1.7) + gh * 90.0)), 10.0);
    if (gh > 0.972) gl_FragColor.rgb += vec3(0.95, 0.98, 1.0) * tw * alpSnow * smoothstep(0.5, 0.0, length(fract(vWp.xz * 24.0) - 0.5));
  }
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uMistC, smoothstep(uMist.x, uMist.y, vWp.y) * 0.92);`);
  };
  m.customProgramCacheKey = () => 'alpineterrain';
  return m;
}

// ------------------------------------------------------------------ build
/**
 * The scene of one level. av (game/alpine.js): { W, H, F (world/alpine.js buildField), tfloor (Uint8Array: each
 * tile's index into floors), floors [{img, sx, sy, w, h}], vmat (Uint8Array, 4 a vertex: rock, dark, shade, rock
 * B), look: { rock: [material, swap], rockB, tint, snow [lo, hi], snowC, mist [y0, y1], mistC, cloud {y, color, k},
 * sun, sunI, amb, ambI, hemiSky, hemiGround, hemiI, sky [top, mid, low], far [colours], peaks, winter (1: graded snow,
 * drifts, spindrift, glints), floorBump }, skirt(x, y), windFloors (Set of floors that run on unbroken as one field) }.
 */
export function buildAlpine3D(av) {
  if (S && S.av === av) return S;
  disposeAlpine3D();
  renderer();
  const L = av.look, at = floorAtlas(av.floors);
  // the index texture: each tile's floor (R) and its mirror/turn flags (G), none for floors with a direction to them
  const rg = new Uint8Array(av.W * av.H * 2), keep = av.noFlip || new Set(), wind = av.windFloors || new Set();
  for (let i = 0; i < av.W * av.H; i++) { rg[i * 2] = av.tfloor[i]; rg[i * 2 + 1] = wind.has(av.tfloor[i]) ? 8 : keep.has(av.tfloor[i]) ? 0 : (hash(i % av.W, (i / av.W) | 0, 77) * 8) | 0; }
  const idx = new T.DataTexture(rg, av.W, av.H, T.RGFormat, T.UnsignedByteType);
  idx.magFilter = idx.minFilter = T.NearestFilter; idx.flipY = false; idx.needsUpdate = true;
  const atlas = tex(at.canvas, { flip: false }); atlas.wrapS = atlas.wrapT = T.ClampToEdgeWrapping;   // mipped (alpLod): unfiltered, shrinking it is a shimmer of noise
  const M = {
    atlas, idx, n: tex(noiseTex(128, 3), { srgb: false }),
    ra: tex(rockFace(IMG[L.rock[0]], L.rock[1], 1, L.rockL ?? 0.42)), rb: tex(rockFace(IMG[(L.rockB || L.rock)[0]], (L.rockB || L.rock)[1], 0.7, L.rockL ?? 0.42)),
    cloud: tex(noiseTex(256, 9), { srgb: false }),
  };
  const uni = {
    tAtlas: { value: M.atlas }, tIdx: { value: M.idx }, tRA: { value: M.ra }, tRB: { value: M.rb }, tN: { value: M.n },
    uMapWH: { value: new T.Vector2(av.W, av.H) }, uAtlasN: { value: new T.Vector2(at.cols, at.rows) },
    uSnow: { value: new T.Vector2(L.snow[0], L.snow[1]) }, uMist: { value: new T.Vector2(L.mist[0], L.mist[1]) },
    uRS: { value: L.rockScale ?? 0.55 }, uBump: { value: L.bump ?? 1.1 },
    uSnowC: { value: rgb3(L.snowC || '#e8eef4') }, uMistC: { value: rgb3(L.mistC) }, uTint: { value: rgb3(L.tint || '#ffffff') }, uFlank: { value: rgb3(L.flank || '#9fb0c6') },
    uWinter: { value: L.winter ?? 0 }, uFloorBump: { value: L.floorBump ?? 1 }, uTime: { value: 0 },
    uSnowId: { value: av.flankSnowFloor ?? av.snowFloor ?? 0 }, uStepId: { value: av.stepFloor ?? 0 }, uSnowK: { value: new T.Vector2(...(L.snowK || [0.42, 0.74])) },
  };
  const scene = new T.Scene(); scene.background = null;
  const root = new T.Group(); scene.add(root);
  S = { av, M, uni, scene, root, t: 0, mtl: terrainMaterial(uni), cloudUni: null };
  buildTerrain(av);
  buildSkirt(av);
  buildClouds(av);
  scene.add(new T.AmbientLight(col(L.amb), L.ambI ?? 0.75));
  scene.add(new T.HemisphereLight(col(L.hemiSky), col(L.hemiGround), L.hemiI ?? 1.5));
  // the sun from the upper left in front, so both faces the camera sees take some of it; a cool fill from the right
  const sun = new T.DirectionalLight(col(L.sun), L.sunI ?? 2.2); sun.position.set(-25, 70, 55); scene.add(sun, sun.target);
  const fill = new T.DirectionalLight(col(L.fill || '#8fa6c4'), L.fillI ?? 0.6); fill.position.set(60, 30, 40); scene.add(fill, fill.target);
  return S;
}

/** How flat the ground lies round each vertex (its normal's y over the field blurred about a tile): where snow can lie. */
function snowWeights(F) {
  const { VW, VH, hv, S: s0 } = F, N = VW * VH;
  let a = Float32Array.from(hv), b = new Float32Array(N);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
      let t = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < VW && y < VH) { t += a[y * VW + x]; n++; } }
      b[j * VW + i] = t / n;
    }
    [a, b] = [b, a];
  }
  const out = new Float32Array(N), at = (i, j) => a[Math.min(VH - 1, Math.max(0, j)) * VW + Math.min(VW - 1, Math.max(0, i))];
  for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
    const dx = (at(i + 1, j) - at(i - 1, j)) * s0 / 2, dz = (at(i, j + 1) - at(i, j - 1)) * s0 / 2;
    out[j * VW + i] = 1 / Math.hypot(dx, 1, dz);
  }
  return out;
}

function buildTerrain(av) {
  const { F, vmat } = av, { VW, VH, hv, S: s0 } = F, CH = 24 * s0, s = 1 / s0, sw = snowWeights(F);
  const h = (i, j) => hv[Math.min(VH - 1, Math.max(0, j)) * VW + Math.min(VW - 1, Math.max(0, i))];
  for (let cj = 0; cj < VH - 1; cj += CH) for (let ci = 0; ci < VW - 1; ci += CH) {
    const i1 = Math.min(VW - 1, ci + CH), j1 = Math.min(VH - 1, cj + CH), cw = i1 - ci + 1, chh = j1 - cj + 1;
    const pos = new Float32Array(cw * chh * 3), nor = new Float32Array(cw * chh * 3), cm = new Uint8Array(cw * chh * 4), cs = new Float32Array(cw * chh), idx = [];
    for (let j = cj; j <= j1; j++) for (let i = ci; i <= i1; i++) {
      const k = j * VW + i, q = (j - cj) * cw + (i - ci);
      cs[q] = sw[k];
      pos[q * 3] = i * s; pos[q * 3 + 1] = hv[k]; pos[q * 3 + 2] = j * s;
      const dx = (h(i + 1, j) - h(i - 1, j)) / (2 * s), dz = (h(i, j + 1) - h(i, j - 1)) / (2 * s), l = Math.hypot(dx, 1, dz);
      nor[q * 3] = -dx / l; nor[q * 3 + 1] = 1 / l; nor[q * 3 + 2] = -dz / l;
      cm.set(vmat.subarray(k * 4, k * 4 + 4), q * 4);
    }
    for (let j = cj; j < j1; j++) for (let i = ci; i < i1; i++) {
      const k = j * VW + i, a = (j - cj) * cw + (i - ci), b = a + 1, c = a + cw, d = c + 1;
      if (Math.abs(hv[k] - hv[k + VW + 1]) < Math.abs(hv[k + 1] - hv[k + VW])) idx.push(a, c, d, a, d, b); else idx.push(a, c, b, b, c, d);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('cmat', new T.BufferAttribute(cm, 4, true)); g.setAttribute('csnow', new T.BufferAttribute(cs, 1));
    g.setIndex(idx); g.computeBoundingSphere();
    const mesh = new T.Mesh(g, S.mtl); mesh.matrixAutoUpdate = false;
    S.root.add(mesh);
  }
}

/** The range past the map's edges, a tile a vertex, P tiles out (av.skirt gives its height); it starts a tile inside
 * the edge a little under the map's own ground, so no crack shows between the two grids. */
function buildSkirt(av) {
  const { W, H } = av, P = av.skirtP ?? 48, st = 1, NX = W + 2 * P + 1, NY = H + 2 * P + 1;
  const pos = new Float32Array(NX * NY * 3), nor = new Float32Array(NX * NY * 3), cm = new Uint8Array(NX * NY * 4), cs = new Float32Array(NX * NY), idx = [];
  const hs = (x, y) => av.skirt(x, y);
  for (let b = 0; b < NY; b++) for (let a = 0; a < NX; a++) {
    const x = -P + a * st, y = -P + b * st, q = b * NX + a, y0 = hs(x, y);
    const dx = hs(x + 0.5, y) - hs(x - 0.5, y), dz = hs(x, y + 0.5) - hs(x, y - 0.5), l = Math.hypot(dx, 1, dz);
    pos.set([x, y0, y], q * 3); nor.set([-dx / l, 1 / l, -dz / l], q * 3); cs[q] = 1 / l;
    // the range fades into the haze with distance from the map
    const dd = Math.hypot(x - Math.min(W, Math.max(0, x)), y - Math.min(H, Math.max(0, y)));
    cm.set([255, 255 * Math.min(1, 0.25 + Math.min(1, Math.max(0, (dd - 4) / 32)) * 0.75), 100 + 155 * hash(a, b, 5), 255 * (hash(a >> 3, b >> 3, 7) > 0.5 ? 1 : 0)], q * 4);
  }
  for (let b = 0; b < NY - 1; b++) for (let a = 0; a < NX - 1; a++) {
    const x = -P + a * st, y = -P + b * st;
    if (x >= 1 && y >= 1 && x + st <= W - 1 && y + st <= H - 1) continue;   // the map's own field covers it
    const p = b * NX + a; idx.push(p, p + NX, p + NX + 1, p, p + NX + 1, p + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('cmat', new T.BufferAttribute(cm, 4, true)); g.setAttribute('csnow', new T.BufferAttribute(cs, 1));
  g.setIndex(idx); g.computeBoundingSphere();
  const mesh = new T.Mesh(g, S.mtl); mesh.matrixAutoUpdate = false; S.root.add(mesh);
}

/** A sea of cloud over the valleys: a plane at the cloud height, thick where the noise is, drifting. */
function buildClouds(av) {
  const C = av.look.cloud;
  if (!C) return;
  S.cloudUni = { tN: { value: S.M.cloud }, uT: { value: 0 }, uC: { value: rgb3(C.color) }, uS: { value: rgb3(C.shade || '#9aa8bc') }, uK: { value: C.k ?? 0.85 } };
  cloudLayer(av, C.y, S.cloudUni, 3);
  // and thin wisps a little above it, so the cliffs don't stop at a hard line where they meet the cloud
  S.wispUni = { ...S.cloudUni, uK: { value: C.wisp ?? 0.35 }, uT: S.cloudUni.uT };
  cloudLayer(av, C.y + 1.2, S.wispUni, 4, 1.7);
}
function cloudLayer(av, y, uni, order, scale = 1) {
  const P = (av.skirtP ?? 48) + 40, w = av.W + 2 * P, h = av.H + 2 * P;
  const g = new T.PlaneGeometry(w, h, 1, 1); g.rotateX(-Math.PI / 2); g.translate(av.W / 2, y, av.H / 2);
  const uS = { ...uni, uZ: { value: scale } };
  const m = new T.ShaderMaterial({ uniforms: uS, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tN; uniform float uT, uK, uZ; uniform vec3 uC, uS; varying vec3 vP;
void main() {
  float a = texture2D(tN, vP.xz * 0.012 * uZ + vec2(uT * 0.0035, uT * 0.0012)).r, b = texture2D(tN, vP.xz * 0.031 * uZ - vec2(uT * 0.002, -uT * 0.004)).r;
  float d = smoothstep(0.3, 0.75, a * 0.6 + b * 0.5);
  vec3 c = mix(uS, uC, smoothstep(0.35, 0.85, b * 0.7 + a * 0.4));
  gl_FragColor = vec4(c, uK * (0.55 + 0.45 * d));
}` });
  const mesh = new T.Mesh(g, m); mesh.renderOrder = order; mesh.frustumCulled = false;
  S.root.add(mesh);
}

// ------------------------------------------------------------------ the sky (2D, behind the 3D)
let skyKey = '', skyCan = null;
/** The sky: a gradient, a pale sun, and three ranges of far snowy peaks drifting a little with the camera. */
function drawSky(ctx, W, H, L) {
  const key = W + 'x' + H + L.sky.join();
  if (key !== skyKey) {
    skyKey = key; skyCan = makeCanvas(W, H);
    const g = skyCan.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, L.sky[0]); gr.addColorStop(0.55, L.sky[1]); gr.addColorStop(1, L.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const sx = W * 0.22, sy = H * 0.16, sg = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.35);
    sg.addColorStop(0, 'rgba(255,250,235,0.85)'); sg.addColorStop(0.08, 'rgba(255,248,225,0.45)'); sg.addColorStop(1, 'rgba(255,248,225,0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
  }
  ctx.drawImage(skyCan, 0, 0);
  const cx = camera.x * camera.zoom * G.dpr, cy = camera.y * camera.zoom * G.dpr;
  const layers = L.far;
  layers.forEach((c, n) => {
    const par = 0.03 + n * 0.035, off = cx * par, base = H * (0.42 + n * 0.1) - cy * par * 0.4, step = Math.max(18, W / 46);
    const pts = [];
    for (let u = Math.floor(off / step) - 2; u <= Math.ceil((off + W) / step) + 2; u++) {
      const big = Math.sin(u * 0.27 + n * 1.7) * 0.5 + Math.sin(u * 0.071 + n) * 0.5, jag = hash(u, n, 31);
      pts.push([u * step - off, base - H * (0.07 + 0.09 * Math.max(0, big)) - jag * H * 0.035 * (1 + Math.max(0, big))]);
    }
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], H);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(pts[pts.length - 1][0], H); ctx.closePath(); ctx.fill();
    // snow on the near ranges' tops
    if (n < layers.length) {
      ctx.fillStyle = L.peakSnow?.[n] || 'rgba(240,246,252,0.55)';
      ctx.beginPath();
      for (let k = 1; k < pts.length - 1; k++) {
        const p = pts[k];
        if (p[1] > pts[k - 1][1] || p[1] > pts[k + 1][1]) continue;
        const d = step * 0.9;
        ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + d, p[1] + d * 0.7); ctx.lineTo(p[0] + d * 0.3, p[1] + d * 0.55); ctx.lineTo(p[0] - d * 0.2, p[1] + d * 0.8); ctx.lineTo(p[0] - d * 0.8, p[1] + d * 0.6); ctx.closePath();
      }
      ctx.fill();
    }
  });
}

// ------------------------------------------------------------------ each frame
export function tickAlpine3D(dt) {
  if (!S) return;
  S.t += dt;
  S.uni.uTime.value = S.t;
  if (S.cloudUni) S.cloudUni.uT.value = S.t;
}
/** Draw the level behind the sprites (cr = world.cave, game/alpine.js). */
export function drawAlpine3D(ctx, cr) {
  const W = G.W * G.dpr, H = G.H * G.dpr, L = cr.av.look;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawSky(ctx, W, H, L);
  if (!S || S.av !== cr.av) return;
  const rd = renderer(), z = camera.zoom, q = G.touch ? 0.75 : 1;
  const pw = Math.max(16, Math.round(G.W / z * q)), ph = Math.max(16, Math.round(G.H / z * q));
  if (rd.w !== pw || rd.h !== ph) { rd.gl.setSize(pw, ph, false); rd.w = pw; rd.h = ph; }
  const cx = camera.x + camera.shakeX, cy = camera.y + camera.shakeY, hw = G.W / 2 / z, hh = G.H / 2 / z, cam = rd.cam;
  cam.left = (cx - hw) / SC; cam.right = (cx + hw) / SC; cam.top = -(cy - hh) / SC; cam.bottom = -(cy + hh) / SC; cam.updateProjectionMatrix();
  rd.gl.setClearColor(0x000000, 0);
  rd.gl.render(S.scene, cam);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = W / pw > 1.5;   // a phone's big upscale smoothed, not a mosaic
  ctx.drawImage(rd.gl.domElement, 0, 0, W, H);
  ctx.imageSmoothingEnabled = sm;
}

export function disposeAlpine3D() {
  if (!S) return;
  S.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
  for (const t of Object.values(S.M)) t.dispose?.();
  S = null;
}
export { VZ };
