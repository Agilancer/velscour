// MOUNTAINSIDE (docs/MOUNTAINSIDE.md): a 72 x 104 height field climbed from its foot (the bottom-left edge of the
// screen, +y) to its summit (the top-right edge, y = 0), drawn live in three.js (gfx/alpine3d.js). Uphill is v = MH-1-y.
// Ten cliff bands too tall to climb cross the slope; each is broken by one way up at alternate ends, so the trail
// switchbacks: a graded ramp cut into the cliff, or a scramble of rock steps a hop high each. Between the cliffs the
// ground is a gentle slope a body walks (WALK levels a tile at most), with here and there a terrace step a hop high,
// crags too tall to climb, and shelves a hop up with a chest on top. A rock ridge walls the west, the east falls away
// into the haze, and above the summit plateau the peak rises in snow. The top two bands are the Snowy Summit pack's.
// Heights are levels (gfx/terrain.js HS = 4 px; world/alpine.js LV levels a tile of height); a body walks a step of
// WALK levels, hops up to CLIMB and drops DROP (world/map.js).
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { biomeTileSet } from '../core/assets.js';
import { townObject } from './town.js';
import { overworldObject } from '../gfx/overworldart.js';
import { darkForestTree, darkTreeK } from '../gfx/darkforest.js';
import { mountainFloors } from '../gfx/mountainart.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { rollLooks, SWAPS } from '../data/bestiary.js';
import { buildField, fieldLevels, reachFrom, LV, AS, fbm, smooth } from './alpine.js';
import { vnoise } from './caverns.js';

export const MW = 72, MH = 104;
const XL = 5, XR = MW - 7;               // the walkable columns: the west ridge before XL, the fall past XR
export const CLIMB = 7, DROP = 10, WALK = 3;
const SL = 1;                            // levels a row the bands rise
const K = TW / 160;
const h01 = (x, y, s) => { let h = Math.imul(x ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul(y ^ s, 0x165667b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

/** Snowy Summit floors laid on the top bands (and on the Summit itself): names from the pack. */
export const SNOW_FLOORS = ['windpacked_snow', 'compact_snow_path', 'powdered_gravel', 'granite_scree', 'snow_seamed_shale', 'wind_ripples',
  'exposed_rock', 'dry_alpine_grass', 'alpine_tuft', 'scree_drift', 'snowy_slate_flags', 'bootprints', 'slate_chips', 'blue_snow_crust', 'frosted_cobbles', 'summit_shrine_paving'];

/** The floor list of a mountain level: the 21 mountain floors, then the Snowy Summit ones above (by name). */
export function mountainFloorList() {
  const own = mountainFloors(), snow = new Map(biomeTileSet(BIOME_BY_ID.snowy_summit).floors.map((f) => [f.name, f]));
  return [...own, ...SNOW_FLOORS.map((n) => ({ ...(snow.get(n) || own[0]), name: 's:' + n }))];
}

export function generateMountain(depth, biome, seed) {
  for (let k = 0; k < 10; k++) {
    const gen = build(depth, biome, (seed + k * 7919) >>> 0);
    if (gen) return gen;
  }
  throw new Error('Mountainside generator found no trail to the summit; seed ' + seed);
}

function build(depth, biome, seed) {
  const W = MW, H = MH, N = W * H, rng = new RNG(seed), ns = (seed % 9973) + 11;
  const I = (x, y) => y * W + x, vOf = (y) => H - 1 - y, yOf = (v) => H - 1 - v;
  const nz = (x, y, s, o = 0) => vnoise(x / s, y / s, ns + o);

  // ---------------------------------------------------------------- the plan: cliffs, their ways up, terraces
  const CL = [];
  for (let v = rng.int(9, 10); v <= MH - 17; v += rng.int(7, 12)) CL.push(v);   // irregular, so the bands don't read as terraces
  const NB = CL.length + 1;                       // bands: 0 the foot .. NB-1 the summit plateau
  const PEAK = MH - 5;                            // rows from here up are the peak's rock
  const thick = CL.map(() => (rng.chance(0.45) ? 2 : 1));
  const rise = CL.map((_, k) => rng.int(13, 17) + (k >= CL.length - 3 ? 2 : 0));
  // the way up through cliff k: the east end on even cliffs, the west on odd; every other one a scramble of hop steps
  const RX = CL.map((_, k) => (k % 2 === 0 ? XR - 4 - rng.int(0, 3) : XL + 4 + rng.int(0, 3)));
  const scramble = CL.map((_, k) => k % 2 === 1);
  const ph = CL.map(() => [rng.range(0, 6.28), rng.range(0, 6.28)]);
  const cliffV = (k, x) => {
    const wob = 2.5 * Math.sin(x * 0.09 + ph[k][0]) + 0.7 * Math.sin(x * 0.37 + ph[k][1]);
    return CL[k] + Math.round(wob * smooth(4, 10, Math.abs(x - RX[k])));   // straight where its way up crosses it
  };
  const cliffTop = (k, x) => cliffV(k, x) + thick[k] - 1;
  // a terrace step a hop high across the bands whose way in was a graded ramp (the scrambles have their own hops)
  const terr = Array.from({ length: NB }, (_, b) => b > 0 && b < NB - 1 && !scramble[b - 1] && rng.chance(0.8) ? { v: CL[b - 1] + thick[b - 1] + rng.int(3, 4), up: rng.int(4, 6), ph: rng.range(0, 6.28) } : null);
  const terrV = (b, x) => terr[b].v + Math.round(1.2 * Math.sin(x * 0.23 + terr[b].ph));
  const bandOf = (x, v) => { let b = 0; for (let k = 0; k < CL.length; k++) if (v > cliffTop(k, x)) b = k + 1; return b; };
  const vs = (b) => (b === 0 ? 0 : CL[b - 1]);
  // band base levels: each band starts where the one below ends, plus its cliff
  const B = [8];
  const topOf = (b) => B[b] + (vs(b + 1) - vs(b)) * SL + (terr[b] ? terr[b].up : 0);
  for (let b = 1; b < NB; b++) B.push(topOf(b - 1) + rise[b - 1]);
  const ground = (x, v) => {
    const b = bandOf(x, v);
    let lv = B[b] + (Math.min(v, PEAK) - vs(b)) * SL + Math.round((nz(x, v, 9) - 0.5) * 2.6);
    if (terr[b] && v >= terrV(b, x)) lv += terr[b].up;
    return lv;
  };

  // ---------------------------------------------------------------- tiles: walkable ground, rock and its height
  const lv = new Int16Array(N), walk = new Uint8Array(N), rk = new Float32Array(N), kind = new Uint8Array(N); // kind: 1 cliff, 2 ramp, 3 ridge, 4 fall, 5 peak, 6 crag, 7 shelf, 8 shoulder
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y), v = vOf(y);
    lv[i] = ground(Math.min(XR, Math.max(XL, x)), v);
    walk[i] = 1;
    if (x < XL) { walk[i] = 0; kind[i] = 3; rk[i] = ground(XL, v) / LV + (XL - x + 0.4) * 0.62 + fbm(x * 0.3, y * 0.12, ns + 5) * 0.9; }
    else if (x > XR) { walk[i] = 0; kind[i] = 4; rk[i] = ground(XR, v) / LV - (x - XR) * 1.5 - 0.4; }
    else if (v <= 0) { walk[i] = 0; kind[i] = 4; rk[i] = ground(x, 1) / LV - 1.6; }
    else if (v >= PEAK) {
      walk[i] = 0; kind[i] = 5;
      const peakX = XL + (XR - XL) * 0.55, d = Math.abs(x - peakX) / (XR - XL);
      rk[i] = ground(x, PEAK - 1) / LV + 0.6 + (v - PEAK + 1) * (1.9 - d * 1.2) + fbm(x * 0.25, v * 0.25, ns + 9) * 1.4;
    } else {
      for (let k = 0; k < CL.length; k++) {
        if (v < cliffV(k, x) || v > cliffTop(k, x)) continue;
        walk[i] = 0; kind[i] = 1; rk[i] = ground(x, cliffTop(k, x) + 1) / LV + 0.28 + fbm(x * 0.4, v * 0.4, ns + 3) * 0.35;
      }
    }
  }
  // the ways up: a corridor three wide from the band below to the band above (a ramp, or a stair of hop-high steps)
  const ramps = [];
  for (let k = 0; k < CL.length; k++) {
    const rx = RX[k], va = CL[k] - (scramble[k] ? 4 : 5), vb = cliffTop(k, rx) + (scramble[k] ? 3 : 4);
    const l0 = ground(rx, va), l1 = ground(rx, vb), rows = vb - va, R = l1 - l0;
    const steps = Math.ceil(R / (CLIMB - 1));
    const at = (v) => {
      const t = (v - va) / rows;
      if (!scramble[k]) return Math.round(l0 + R * t);
      return Math.round(l0 + R * Math.min(steps, Math.floor(t * (steps + 0.999))) / steps);
    };
    const tiles = [];
    for (let v = va; v <= vb; v++) for (let x = rx - 1; x <= rx + 1; x++) {
      const i = I(x, yOf(v));
      walk[i] = 1; kind[i] = 2; lv[i] = at(v); tiles.push(i);
    }
    // its shoulders: rock where the corridor and the ground beside it are more than a hop apart
    for (let v = va; v <= vb; v++) for (const x of [rx - 2, rx + 2]) {
      const i = I(x, yOf(v));
      if (kind[i] === 2 || x < XL || x > XR) continue;
      const g = walk[i] ? lv[i] : rk[i] * LV, c = at(v);
      if (Math.abs(g - c) > CLIMB) { walk[i] = 0; kind[i] = 8; rk[i] = Math.max(g, c) / LV + 0.22; }
      else if (!walk[i]) { walk[i] = 1; kind[i] = 0; lv[i] = Math.round((g + c) / 2); }
    }
    ramps.push({ k, x: rx, va, vb, scramble: scramble[k], tiles, foot: [rx + 0.5, yOf(va) + 0.5], top: [rx + 0.5, yOf(vb) + 0.5] });
  }
  const START = [XL + 4.5, yOf(3) + 0.5];
  const SUMMIT = [XL + Math.round((XR - XL) * 0.55) + 0.5, yOf(PEAK - 4) + 0.5];
  const s0 = I(Math.floor(START[0]), Math.floor(START[1])), g0 = I(Math.floor(SUMMIT[0]), Math.floor(SUMMIT[1]));
  const near = (x, y, p, r) => Math.hypot(x - p[0], y - p[1]) < r;
  const onRamp = (x, y) => ramps.some((r) => Math.abs(x - r.x) <= 3 && vOf(y) >= r.va - 2 && vOf(y) <= r.vb + 2);
  const connected = () => reachFrom(W, H, lv, walk, null, s0, CLIMB, DROP)[g0] && reachFrom(W, H, lv, walk, null, g0, CLIMB, DROP)[s0];
  if (!connected()) return null;

  // ---------------------------------------------------------------- crags and shelves
  const keepClear = (x, y) => near(x, y, START, 5) || near(x, y, SUMMIT, 6) || onRamp(Math.floor(x), Math.floor(y));
  const shelves = [];
  for (let n = 0, tries = 0; n < 34 && tries < 600; tries++) {
    const cx = rng.range(XL + 2, XR - 1), cy = rng.range(4, H - 8), shelf = shelves.length < 6 && n % 5 === 2;
    if (keepClear(cx, cy)) continue;
    const r = shelf ? rng.range(1.0, 1.5) : rng.range(0.7, 1.9), blob = [];
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if (x >= XL && x <= XR && y >= 0 && y < H && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r && walk[I(x, y)] && kind[I(x, y)] === 0 && !onRamp(x, y)) blob.push(I(x, y));
    if (blob.length < (shelf ? 3 : 1)) continue;
    const was = blob.map((i) => [walk[i], lv[i], rk[i], kind[i]]);
    if (shelf) {
      // a flat shelf a hop above the lowest ground round it
      const inB = new Set(blob);
      let ring = Infinity, top = -Infinity;
      for (const i of blob) { top = Math.max(top, lv[i]); for (const j of [i - 1, i + 1, i - W, i + W]) if (!inB.has(j) && walk[j]) ring = Math.min(ring, lv[j]); }
      const lvl = Math.max(top + 2, ring + CLIMB - 1);
      let ok = true;
      for (const i of blob) for (const j of [i - 1, i + 1, i - W, i + W]) if (!inB.has(j) && walk[j] && Math.abs(lvl - lv[j]) > CLIMB && lv[j] < lvl) ok = false;
      if (!ok) continue;
      for (const i of blob) { lv[i] = lvl; kind[i] = 7; }
    } else {
      const top = Math.max(...blob.map((i) => lv[i]));
      for (const i of blob) { walk[i] = 0; kind[i] = 6; rk[i] = top / LV + rng.range(0.9, 1.5); }
    }
    if (!connected()) { blob.forEach((i, q) => { [walk[i], lv[i], rk[i], kind[i]] = was[q]; }); continue; }
    if (shelf) shelves.push([cx, cy]);
    n++;
  }

  // ---------------------------------------------------------------- the field, the map
  const F = buildField({ W, H, lv, walk, rk, smoothMax: WALK, rough: (u, v, h, d) => h + (fbm(u * 1.3, v * 1.3, ns + 21) - 0.5) * Math.min(0.5, d * 0.6) });
  const map = new TileMap(W, H);
  for (let i = 0; i < N; i++) map.t[i] = walk[i] ? 1 : 0;
  const hgt = fieldLevels(F, W, H, lv, walk);
  // a cliff's lip hides the band above from the band below (and so no pack wakes and shoots across it): its rock counts
  // tall for sight (map.los), the drawn rock keeps its own height
  for (let i = 0; i < N; i++) if (kind[i] === 1 || kind[i] === 8) hgt[i] += 24;
  map.hgt = hgt; map.climb = CLIMB; map.drop = DROP; map.walkStep = WALK; map.smoothField = true; map.hopArc = true;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) if (walk[i]) { lo = Math.min(lo, hgt[i]); hi = Math.max(hi, hgt[i]); }
  map.minLevel = lo; map.maxLevel = hi; map.baseLevel = lo - 40;
  map.losRise = Math.round(1.2 * LV);
  map.losBlocks = true;

  // ---------------------------------------------------------------- the trail: the cheapest way up that can be walked back down
  const cost = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  cost[s0] = 0;
  const open = [s0];
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (cost[open[k]] < cost[open[bi]]) bi = k;
    const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (done[cur]) continue;
    done[cur] = 1;
    if (cur === g0) break;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < XL || ny < 0 || nx > XR || ny >= H) continue;
      const j = I(nx, ny), dh = Math.abs(lv[j] - lv[cur]);
      if (!walk[j] || dh > CLIMB || done[j] || kind[j] === 7) continue;
      const c = cost[cur] + 1 + (dh > WALK ? 1.2 : dh * 0.25) + (nx <= XL + 1 || nx >= XR - 1 ? 2 : 0) + (kind[j] === 2 ? -0.3 : 0);
      if (c < cost[j]) { cost[j] = c; came[j] = cur; open.push(j); }
    }
  }
  if (!done[g0]) return null;
  const trail = [], onTrail = new Uint8Array(N);
  for (let c = g0; c >= 0; c = came[c]) { trail.push(c); onTrail[c] = 2; if (c === s0) break; }
  trail.reverse();
  for (const c of trail) {
    const x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = I(x + dx, y + dy);
      if (x + dx >= XL && x + dx <= XR && y + dy >= 0 && y + dy < H && !onTrail[j] && walk[j] && Math.abs(lv[j] - lv[c]) <= WALK) onTrail[j] = 1;
    }
  }

  // ---------------------------------------------------------------- floors
  const floors = mountainFloorList(), FI = Object.fromEntries(floors.map((f, i) => [f.name, i]));
  const SNOWB = NB - 2;   // the bands from here up are the Snowy Summit's
  const ZONE = [
    ['grass', 'meadow', 'petals'], ['deep_grass', 'meadow', 'moss'], ['grass', 'turf', 'moss'], ['alpine', 'deep_grass', 'moss'],
    ['alpine', 'grass', 'moss'], ['alpine', 'dry_grass', 'lichen'], ['dry_grass', 'alpine', 'lichen'], ['dry_grass', 'scree', 'lichen'],
  ];
  const tfloor = new Uint8Array(N), band = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y), v = vOf(y), b = bandOf(Math.min(XR, Math.max(XL, x)), v), n = nz(x, y, 6, 31), m = nz(x, y, 3, 37), q = nz(x, y, 9, 41);
    band[i] = b;
    const snow = b >= SNOWB || v >= PEAK, z = Math.min(ZONE.length - 1, Math.floor(b * ZONE.length / Math.max(1, SNOWB)));
    let name;
    if (!walk[i]) name = snow ? (n > 0.5 ? 's:windpacked_snow' : 's:granite_scree') : kind[i] === 3 || kind[i] === 5 ? (n > 0.55 ? 'stone' : 'scree') : (n > 0.5 ? 'scree' : 'stone');
    else if (kind[i] === 2) name = snow ? 's:snowy_slate_flags' : ramps.find((r) => r.tiles.includes(i))?.scramble ? 'gravel' : 'steps';   // a scramble's treads pale between its stone risers
    else if (snow) {
      if (onTrail[i] === 2) name = h01(x, y, 5) < 0.5 ? 's:windpacked_snow' : m > 0.6 ? 's:bootprints' : 's:compact_snow_path';   // (not every tile: no corduroy)
      else if (onTrail[i] === 1) name = 's:windpacked_snow';
      else { const n2 = nz(x, y, 11, 43), offT = ![-2, -1, 0, 1, 2].some((d) => [-2, -1, 0, 1, 2].some((e) => onTrail[I(Math.min(W - 1, Math.max(0, x + d)), Math.min(H - 1, Math.max(0, y + e)))])); name = q > 0.72 ? 's:wind_ripples' : n2 > 0.82 && offT ? 's:exposed_rock' : m > 0.78 ? 's:powdered_gravel' : b === SNOWB && n < 0.3 ? 's:alpine_tuft' : 's:windpacked_snow'; }
    } else if (onTrail[i] === 2) name = z <= 2 ? 'dirt' : z <= 5 ? (m < 0.55 ? 'dirt' : 'gravel') : 'gravel';
    else if (onTrail[i] === 1) name = z <= 2 ? (m < 0.5 ? 'mud' : 'dirt') : z <= 5 ? (m < 0.5 ? 'dirt' : 'wash') : 'wash';
    else if (kind[i] === 7) name = 'lichen';
    else { const [base, a, c] = ZONE[z]; name = q > 0.7 ? a : n > 0.76 && m > 0.5 ? c : base; }
    tfloor[i] = FI[name] ?? 0;
    map.v[i] = tfloor[i] < 21 ? tfloor[i] : 0;
  }
  tfloor[g0] = FI['s:summit_shrine_paving'];

  // ---------------------------------------------------------------- per-vertex material: rock, dark, shade, rock B
  const { VW, VH, own, near: vnear, hv } = F, vmat = new Uint8Array(VW * VH * 4);
  for (let k = 0; k < VW * VH; k++) {
    const u = (k % VW) / AS, w = ((k / VW) | 0) / AS;
    const rock = own[k] < 0;
    vmat[k * 4] = rock ? (vnear[k] < 0.6 ? 200 : 255) : 0;   // the rim just off walkable ground: dark bare rock
    vmat[k * 4 + 1] = rock ? 255 * smooth(1.5, 9, vnear[k]) * 0.5 : 0;   // haze: rock far from the trail fades toward the mist
    vmat[k * 4 + 2] = 255 * (0.25 + 0.75 * fbm(u * 0.21, w * 0.21, ns + 51));
    vmat[k * 4 + 3] = 255 * smooth(0.4, 0.6, fbm(u * 0.08, w * 0.08, ns + 53));
  }
  void hv;

  // ---------------------------------------------------------------- props
  const forest = biomeTileSet(BIOME_BY_ID.dark_forest), scat = new Map(forest.scatter.map((s) => [s.name, s]));
  const snowSet = biomeTileSet(BIOME_BY_ID.snowy_summit), snowScat = new Map(snowSet.scatter.map((s) => [s.name, s]));
  const props = [], taken = new Uint8Array(N);
  /** Does ground in front of (x, y) on screen rise over its foot? (2D sprites draw over the 3D, so none stands there.) */
  const hidden = (x, y) => {
    const h0 = F.H2(x, y), fy = (x + y) * 16 - h0 * LV * 4;
    for (let s = 0.25; s < 6; s += 0.25) { const sx = x + s, sy = y + s; if (sx >= W || sy >= H) break; if ((sx + sy) * 16 - F.H2(sx, sy) * LV * 4 < fy - 3) return true; }
    return false;
  };
  const free = (x, y) => x >= XL && x <= XR && y >= 0 && y < H && walk[I(x, y)] && !taken[I(x, y)] && !onTrail[I(x, y)] && kind[I(x, y)] !== 2 && kind[I(x, y)] !== 7 && !keepClear(x + 0.5, y + 0.5) && !shelves.some((l) => near(x + 0.5, y + 0.5, l, 2.2));
  const put = (spr, k, x, y, o = {}) => {
    if (!spr || hidden(x, y)) return null;
    const p = { kind: 'scatter', x, y, spr, k, flip: o.flip ?? (spr.isometric ? false : rng.chance(0.5)), light: o.light || 0 };
    if (spr.tree) p.tree = true;
    props.push(p);
    return p;
  };
  const town = (name, x, y, o) => { const s = overworldObject(name) || townObject(name); return s && put(s, K * (s.pixelScale || 1), x, y, o); };
  const dark = (name, x, y, o = {}) => { const s = scat.get(name); return s && put(s, forest.k * (o.scale || 1), x, y, o); };
  const snowy = (name, x, y, o = {}) => { const s = snowScat.get(name); return s && put(s, snowSet.k * (o.scale || 1), x, y, { ...o, light: o.light ?? 0 }); };
  const tall = (name, x, y, sc) => put(darkForestTree(name), darkTreeK(sc), x, y);
  const block = (x, y) => { taken[I(x, y)] = 1; map.block[I(x, y)] = 1; };
  const jit = () => rng.range(-0.18, 0.18);
  const TREES = [
    [['t_medium_fir', 'T'], ['t_scots_pine', 'T'], ['t_old_cedar', 'T'], ['spire_pine', 'D'], ['hanging_moss_fir', 'D'], ['t_young_pine', 'T']],
    [['spire_pine', 'D'], ['hanging_moss_fir', 'D'], ['t_medium_fir', 'T'], ['t_scots_pine', 'T'], ['t_old_cedar', 'T'], ['t_dusk_cedar', 'T']],
    [['t_scots_pine', 'T'], ['t_wind_pine', 'T'], ['t_young_pine', 'T'], ['t_medium_fir', 'T'], ['t_frost_fir', 'T'], ['spire_pine', 'D']],
    [['t_wind_juniper', 'T'], ['t_wind_pine', 'T'], ['t_frost_fir', 'T'], ['t_dead_thorn', 'T'], ['t_young_pine', 'T']],
    [['t_wind_juniper', 'T'], ['t_dead_thorn', 'T'], ['t_frost_fir', 'T'], ['t_storm_deadwood', 'T']],
    [['t_frost_fir', 'T'], ['t_dead_thorn', 'T']],
  ];
  const DENS = [0.48, 0.52, 0.58, 0.64, 0.72, 0.84];
  for (let y = 0; y < H; y++) for (let x = XL; x <= XR; x++) {
    if (!free(x, y)) continue;
    const b = bandOf(x, vOf(y)), z = Math.min(5, Math.floor(b * 6 / Math.max(1, SNOWB + 1)));
    const g = nz(x + 101, y + 7, 5, 61), edge = x <= XL + 2 ? 0.1 : x >= XR - 1 ? 0.06 : 0;
    if (g + edge > DENS[z] && rng.chance(b >= SNOWB ? 0.25 : 0.72)) {
      const [name, src] = rng.pick(TREES[z]);
      const p = src === 'D' ? tall(name, x + 0.5 + jit(), y + 0.5 + jit(), rng.range(0.55, 0.72)) : town(name, x + 0.5 + jit(), y + 0.5 + jit());
      if (p) block(x, y);
    }
  }
  // boulders, more of them higher up; flowers, shrubs and ferns lower down; snow-capped rock and ice at the top
  for (let n = 0; n < 640; n++) {
    const x = rng.int(XL, XR), y = rng.int(0, H - 1);
    if (!free(x, y)) continue;
    const b = bandOf(x, vOf(y)), z = Math.floor(b * 6 / Math.max(1, SNOWB + 1)), cx = x + 0.5 + jit(), cy = y + 0.5 + jit();
    if (b >= SNOWB) {
      const r = rng.next();
      if (r < 0.32) { if (snowy(rng.pick(['snow_capped_boulder', 'frost_split_boulder', 'snowy_boulder_rubble']), cx, cy)) block(x, y); }
      else if (r < 0.45) { if (snowy(rng.pick(['glacier_ice_spire', 'broken_ice_chunk', 'glacier_crystal_cluster', 'jagged_slate_spur']), cx, cy)) block(x, y); }
      else if (r < 0.62 && snowy(rng.pick(['slate_chip_scatter', 'fallen_alpine_branch', 'snowy_timber_heap']), cx, cy)) taken[I(x, y)] = 1;
    } else if (rng.chance(0.16 + z * 0.07)) {
      const r = rng.next();
      if ((r < 0.4 ? town(rng.pick(['moss_boulder', 'fieldstone_cluster']), cx, cy) : r < 0.75 ? dark('moss_boulder', cx, cy) : town(rng.pick(['ow_standing_stone', 'ow_ancient_stone']), cx, cy))) block(x, y);
    } else if (z <= 2) {
      const nm = rng.pick(['leafy_shrub', 'wildflowers', 'wildflowers', 'dry_reeds', 'mushrooms', 'thorn_bush', 'F:fern_clump', 'F:reeds', 'ow_blue_flowers', 'ow_red_flowers']);
      if (nm.startsWith('F:') ? dark(nm.slice(2), cx, cy) : town(nm, cx, cy)) taken[I(x, y)] = 1;
    } else if (rng.chance(0.6)) {
      const nm = rng.pick(['dry_reeds', 'thorn_bush', 'F:dead_sapling', 'F:dead_bramble', 'fieldstone_cluster', 'F:feather_scatter']);
      if (nm.startsWith('F:') ? dark(nm.slice(2), cx, cy) : town(nm, cx, cy)) taken[I(x, y)] = 1;
    }
  }
  // the trail's markers: a cairn now and then beside the path; at each way up a sign at its foot, rope posts at its top
  /** The nearest free tile beside trail tile c (the trail is laid three wide, so two or three tiles out), within a walk of it. */
  const beside = (c) => {
    const x = c % W, y = (c / W) | 0;
    for (let r = 1; r <= 3; r++) for (const [dx, dy] of [[r, 0], [0, r], [-r, 0], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
      const nx = x + dx, ny = y + dy;
      if (free(nx, ny) && Math.abs(lv[I(nx, ny)] - lv[c]) <= WALK) return [nx, ny];
    }
    return null;
  };
  for (let k = 14; k < trail.length - 8; k += 17) {
    const at = beside(trail[k]);
    if (!at) continue;
    const snowB = bandOf(at[0], vOf(at[1])) >= SNOWB;
    if (snowB ? snowy(k % 2 ? 'notched_trail_marker' : 'snowy_rock_cairn', at[0] + 0.5, at[1] + 0.5) : dark(k % 3 === 0 ? 'trail_sign' : 'stone_cairn', at[0] + 0.5, at[1] + 0.5)) block(at[0], at[1]);
  }
  for (const r of ramps) {
    for (const [v, name] of [[r.va - 1, 'trail_sign'], [r.vb + 1, 'rope_post']]) {
      const y = yOf(v);
      for (const x of [r.x - 4, r.x + 4, r.x - 5, r.x + 5]) {
        if (!free(x, y)) continue;
        if (bandOf(x, v) >= SNOWB ? snowy(name === 'trail_sign' ? 'notched_trail_marker' : 'hooked_lantern_stand', x + 0.5, y + 0.5, { light: name === 'trail_sign' ? 0 : 2.6 }) : dark(name, x + 0.5, y + 0.5)) block(x, y);
        break;
      }
    }
  }
  // a rope post (pitons in the snow) beside the trail where it hops, once a stretch: the hops are the trail's to read
  for (let k = 1, last = -99; k < trail.length; k++) {
    if (Math.abs(lv[trail[k]] - lv[trail[k - 1]]) <= WALK || k - last < 14) continue;
    const at = beside(trail[k]);
    if (!at) continue;
    const snowB = bandOf(at[0], vOf(at[1])) >= SNOWB;
    if (snowB ? snowy('climbing_rope_and_pitons', at[0] + 0.5, at[1] + 0.5, { block: false }) : dark('rope_post', at[0] + 0.5, at[1] + 0.5)) { taken[I(at[0], at[1])] = 1; last = k; }
  }
  // climbers' camps beside the trail a third and two thirds of the way up; the last one in the snow
  const camps = [];
  for (const f of [0.3, 0.62, 0.86]) {
    // the first spot beside the trail near that far up (not on a way up, where nothing is placed)
    let at = null;
    for (let d = 0; d < 40 && !at; d++) { const k = Math.floor(trail.length * f) + (d % 2 ? -1 : 1) * (d >> 1); if (k > 0 && k < trail.length) at = beside(trail[k]); }
    if (!at) continue;
    const [cx, cy] = at, snowB = bandOf(cx, vOf(cy)) >= SNOWB;
    if (snowB) { if (snowy('frosted_iron_brazier', cx + 0.5, cy + 0.5, { light: 3.4 })) block(cx, cy); }
    else if (dark('campfire', cx + 0.5, cy + 0.5, { light: 5 })) block(cx, cy);
    const kit = snowB ? [[1, 0, 'S:fur_bedroll'], [0, 1, 'S:abandoned_summit_sled'], [1, 1, 'S:snowbound_supply_crate']] : [[1, 0, 'F:bedroll'], [0, 1, 'firewood_stack'], [1, 1, 'F:wooden_crate']];
    for (const [dx, dy, name] of kit) {
      const x = cx + dx, y = cy + dy;
      if (!free(x, y)) continue;
      const p = name.startsWith('F:') ? dark(name.slice(2), x + 0.5, y + 0.5) : name.startsWith('S:') ? snowy(name.slice(2), x + 0.5, y + 0.5) : town(name, x + 0.5, y + 0.5);
      if (p) taken[I(x, y)] = 1;
    }
    camps.push([cx + 0.5, cy + 0.5]);
  }
  // the summit: an old shrine and its altar, braziers, the warning bell, cairns round the peak
  const sx0 = Math.floor(SUMMIT[0]), sy0 = Math.floor(SUMMIT[1]);
  const summitProp = (name, dx, dy, o) => { const x = sx0 + dx, y = sy0 + dy; if (x < XL || x > XR || y < 0 || y >= H || !walk[I(x, y)] || onTrail[I(x, y)] === 2) return; const p = snowy(name, x + 0.5, y + 0.5, o); if (p) block(x, y); };
  summitProp('mountain_shrine_altar', -4, -2);   // (the middle of the back row is the gateway's: braziers flank it)
  summitProp('frosted_iron_brazier', -2, -3, { light: 3.4 }); summitProp('frosted_iron_brazier', 2, -3, { light: 3.4 });
  summitProp('summit_warning_bell', -5, 1); summitProp('standing_stone_sentinel', 5, 1);
  summitProp('snowy_rock_cairn', -4, 4); summitProp('alpine_menhir', 4, 4);

  // ---------------------------------------------------------------- chests: one on each shelf, one at each camp
  const reach = reachFrom(W, H, hgt, walk, map.block, s0, CLIMB, DROP);
  const chests = [];
  for (const [x, y] of shelves) {
    const i = I(Math.floor(x), Math.floor(y));
    if (reach[i] && !map.block[i]) chests.push({ x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, rare: rng.chance(0.4) });
  }
  for (const c of camps) { const at = map.randomNear(c[0], c[1], 1.6, rng.fn()); if (reach[map.tileIdx(at[0], at[1])]) chests.push({ x: at[0], y: at[1], rare: false }); }

  // ---------------------------------------------------------------- monsters all the way up: packs along the trail,
  // a champion's pack at the top of every way up, things on the cliffs that leap down on the trail, the Summit Warden
  const base = rollLooks(biome, rng.fn());
  const looks = {
    pick(arch, r) { const l = base.pick(arch, r); return l && this.cold ? { ...l, swap: SWAPS[r && r() < 0.5 ? 'frost' : 'rime'], tint: 'Frostbitten' } : l; },
    boss: base.boss.bind(base), ids: base.ids.bind(base), all: base.all.bind(base), cold: false,
  };
  const pickLook = (arch, snowB) => { looks.cold = snowB; const l = looks.pick(arch, rng.fn()); looks.cold = false; return l; };
  const spawns = [], archs = biome.roster;
  const trailAt = (k) => { const c = trail[Math.max(0, Math.min(trail.length - 1, k))]; return [c % W + 0.5, ((c / W) | 0) + 0.5]; };
  const offTrail = (k, d) => {
    const [x, y] = trailAt(k);
    for (let t = 0; t < 12; t++) {
      const a = rng.range(0, 6.28), r = rng.range(d * 0.6, d), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, i = map.tileIdx(px, py);
      if (px > XL && px < XR + 1 && py > 0 && py < H && walk[i] && !map.block[i] && reach[i] && Math.abs(hgt[i] - hgt[trail[k]]) <= CLIMB && map.circleFree(px, py, 0.35)) return [px, py];
    }
    return null;
  };
  let n = 0;
  const campTi = camps.map((c) => trail.findIndex((t) => Math.hypot(t % W + 0.5 - c[0], ((t / W) | 0) + 0.5 - c[1]) < 2.5)).filter((k) => k >= 0);
  for (let k = 18; k < trail.length - 14; k += rng.int(15, 21)) {
    if (campTi.some((c) => Math.abs(k - c) < 13)) continue;   // a breather round each climbers' camp
    const at = offTrail(k, 2.6);
    if (!at) continue;
    const v = vOf(Math.floor(at[1])), b = bandOf(Math.floor(at[0]), v), arch = rng.pick(archs);
    spawns.push({ x: at[0], y: at[1], arch, n: rng.int(2, 3 + Math.min(2, b >> 2)), rank: n % 7 === 6 ? 'champion' : n % 11 === 7 ? 'unique' : 'normal', look: pickLook(arch, b >= SNOWB), zone: 'trail', ti: k });
    n++;
  }
  // archers on the shelves above the trail: they shoot down at it until someone hops up to them
  for (const [sx, sy] of shelves) {
    const k = trail.findIndex((t) => Math.hypot(t % W + 0.5 - sx, ((t / W) | 0) + 0.5 - sy) < 6);
    const i = I(Math.floor(sx), Math.floor(sy));
    if (k < 0 || !reach[i]) continue;
    const snowB = bandOf(Math.floor(sx), vOf(Math.floor(sy))) >= SNOWB;
    spawns.push({ x: Math.floor(sx) + 0.5, y: Math.floor(sy) + 0.5, arch: 'archer', n: 2, rank: 'normal', look: pickLook('archer', snowB), zone: 'shelf', ti: k });
  }
  const leaps = [];
  for (const r of ramps) {
    const top = trail.findIndex((c) => Math.hypot(c % W + 0.5 - r.top[0], ((c / W) | 0) + 0.5 - r.top[1]) < 2.2);
    if (top < 0) continue;
    const at = offTrail(Math.min(trail.length - 1, top + 4), 2.2);
    if (at) { const arch = rng.pick(archs), snowB = bandOf(Math.floor(at[0]), vOf(Math.floor(at[1]))) >= SNOWB; spawns.push({ x: at[0], y: at[1], arch, n: rng.int(3, 4), rank: r.k % 2 === 0 ? 'champion' : 'normal', look: pickLook(arch, snowB), zone: 'landing', ti: top }); }   // a champion at half the ways up
    // a leap-down ambush on the trail just past every other way up: they wait on the cliff top above the next leg
    if (r.k % 2 === 0 && r.k + 1 < CL.length) {
      const k2 = top + 10;
      if (k2 >= trail.length - 10) continue;
      const [tx, ty] = trailAt(k2), cv = cliffV(r.k + 1, Math.floor(tx));
      leaps.push({ ti: k2, at: [tx, ty], from: [tx + rng.range(-1.5, 1.5), yOf(cv + thick[r.k + 1]) + 0.5 - 0.6], n: rng.int(2, 3), snow: bandOf(Math.floor(tx), vOf(Math.floor(ty))) >= SNOWB - 1 });
    }
  }
  spawns.push({ x: SUMMIT[0], y: SUMMIT[1] + 1.5, arch: 'golem', rank: 'boss', look: { ...(base.pick('golem') || {}), swap: SWAPS.frost, tint: 'Frostbitten' } });

  // ---------------------------------------------------------------- the look of the level and its skirt
  const top = B[NB - 1] / LV, footLv = B[0] / LV;
  const look = {
    rock: ['snow_capped_granite', { sat: 0.82, light: -0.02 }], rockB: ['ice_bound_shale', { sat: 0.7, light: -0.04 }], tint: '#e8e2d8',
    snow: [B[SNOWB - 1] / LV + 1, B[SNOWB] / LV + 1.5], snowC: '#e9eef3', mist: [footLv - 0.2, footLv - 3.7], mistC: '#c8d4dc', flank: '#a8b4c4',
    cloud: { y: footLv - 3.2, color: '#eef2f6', shade: '#a8b4c4', k: 0.8, wisp: 0.32 },
    sun: '#fff1dc', sunI: 2.3, amb: '#c8d0dc', ambI: 0.85, hemiSky: '#cfe0f0', hemiGround: '#7a705e', hemiI: 1.35,
    sky: ['#5b86b8', '#a8c4dc', '#e0e6ea'], far: ['#9fb4c8', '#8197ad', '#6c8199'], rockScale: 0.24, bump: 1.0,
  };
  const edgeH = (x, y) => F.H2(Math.min(W - 0.01, Math.max(0, x)), Math.min(H - 0.01, Math.max(0, y)));
  const skirt = (x, y) => {
    const ex = Math.min(W, Math.max(0, x)), ey = Math.min(H, Math.max(0, y)), d = Math.hypot(x - ex, y - ey), he = edgeH(x, y);
    const inside = x > 0 && y > 0 && x < W && y < H;
    if (inside) return he - 0.25;
    const n1 = fbm(x * 0.07, y * 0.07, ns + 81), n2 = fbm(x * 0.21, y * 0.21, ns + 83);
    if (x < 0 || y < 0) {   // behind: the range goes on, peaks rising
      const k = d * d / (d * d + 40);
      return he + k * (6 + 16 * n1 + 5 * n2) + (y < 0 ? Math.max(0, -y) * 0.35 : 0) - (x > W ? (x - W) * 1.4 : 0);
    }
    return Math.min(he, top) - d * 1.4 - 1.5 * n1;   // in front: the mountain falls away into the cloud
  };

  const av = { W, H, F, tfloor, floors, vmat, look, skirt, skirtP: 44, snowFloor: FI['s:windpacked_snow'], flankSnowFloor: FI['s:blue_snow_crust'], stepFloor: FI.steps,
    noFlip: new Set(['steps', 's:bootprints', 's:snowy_slate_flags', 's:compact_snow_path'].map((n) => FI[n])) };
  map.hopDust = '#b8ab94';
  // the gateway on into the Snowy Summit: the pack's slate pass arch at the back of the summit, the rock rising behind it
  // (game/mountain.js opens a portal under it when the Warden falls)
  const GATE = [SUMMIT[0], yOf(PEAK - 1) + 0.9];
  {
    const L = yOf(PEAK - 1), cx = SUMMIT[0], sls = snowSet.arches.slate_pass_gateway?.SE;
    map.walls = [];
    if (sls) for (const sl of sls) map.walls.push({ kind: 'arch', x: cx, y: L, axis: 'x', r: sl, depth: cx + L + sl.a });
    map.indexWalls();
    for (let x = Math.floor(cx) - 1; x <= Math.floor(cx) + 1; x++) for (let y = L; y <= L + 1; y++) { const i = I(x, y); if (walk[i]) { taken[i] = 1; map.block[i] = 0; } }
  }
  map.mountain = { trail, summit: SUMMIT, shelves, camps, ramps, bands: NB, snowBand: SNOWB, band, gate: GATE };
  return {
    map, props, buildings: [], wallHangings: [], torches: [], townTiles: mountainFloors(), looks, spawns, chests,
    start: START, exit: SUMMIT, summit: SUMMIT, trail, leaps, ramps, seed, alpine: av, lv, walk, gate: GATE, camps,
  };
}
