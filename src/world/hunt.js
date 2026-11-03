// THE GREAT HUNT (docs/GREAT_HUNT.md): the beast's territory, 96 x 96 tiles. A winding game trail runs from the
// hunters' camp through three hunting grounds (clearings where the beast turns to fight) to its lair. Each leg of the
// trail carries three signs that lead from clue to clue. Narrow game trails branch off to small glades (a dead
// hunter's cache) and open ground lies beside the trail; everything else is the land's cover. Five territories
// (data/huntlands.js) change all of it: the Black Wood (towering trees), the White Waste (snow, frosted pines and
// drifts), the Drowned Fen (bog water, willows, stepping stones, poison pools), the Red Badlands (Sea of Sand ground
// walled by its sandstone cliffs) and the Storm Crags (a height map rising from the camp to a lair on the peak, its
// rock in cliffs). Floors: gfx/huntart.js. The level needs the town art, the Dark Forest pack and trees, and for the
// Badlands the Sea of Sand pack (regions/hunt.js load()).
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { biomeTileSet } from '../core/assets.js';
import { townObject } from './town.js';
import { overworldObject } from '../gfx/overworldart.js';
import { darkForestTree, darkTreeK } from '../gfx/darkforest.js';
import { seaOfSandObject, seaOfSandFrames, seaOfSandCliff } from '../gfx/seaofsand.js';
import { huntFloors, frost } from '../gfx/huntart.js';
import { SAND_H } from './overworld.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { rollLooks } from '../data/bestiary.js';
import { landOf } from '../data/huntlands.js';

export const HUNT_W = 96, HUNT_H = 96;
const K = TW / 160; // town-pack source tiles are 160 x 80
// tile kinds, in priority order (a later carve never lowers a tile's kind)
export const HK = { WOOD: 0, MEADOW: 1, SPUR: 2, TRAIL: 3, GROUND: 4, CAMP: 5, LAIR: 6 };
const GROUND_R = 6.5, LAIR_R = 7.5, CAMP_R = 4.5;
const CRAG_TOP = 84; // the Crags' lair, in height levels (gfx/terrain.js HS px each) above the camp

// the floor each kind of tile wears, by land: (kind, three noises, hf = height share on the Crags) -> floor name
const FLOOR = {
  wood: (k, n, m, q) => k === HK.WOOD ? (q > 0.66 ? 'ferns' : n > 0.6 ? 'moss' : m > 0.55 ? 'deep_grass' : 'turf')
    : k === HK.MEADOW ? (q > 0.7 ? 'petals' : n > 0.62 ? 'dry_grass' : m > 0.6 ? 'meadow' : 'grass')
    : k === HK.TRAIL ? (m > 0.62 ? 'mud' : n > 0.7 ? 'dry_grass' : 'dirt') : k === HK.SPUR ? (m > 0.5 ? 'dry_grass' : 'dirt')
    : k === HK.GROUND ? (n > 0.6 ? 'mud' : m > 0.45 ? 'dry_grass' : 'turf') : k === HK.CAMP ? (n > 0.55 ? 'dirt' : 'grass')
    : q > 0.55 ? 'scree' : n > 0.5 ? 'mud' : m > 0.55 ? 'wash' : 'dirt',
  tundra: (k, n, m, q) => k === HK.WOOD ? (q > 0.62 ? 'snow_scree' : n > 0.55 ? 'drift' : 'snow')
    : k === HK.MEADOW ? (m > 0.62 ? 'frost_grass' : n > 0.6 ? 'frost_turf' : 'snow')
    : k === HK.TRAIL ? (m > 0.6 ? 'snow_hooves' : n > 0.72 ? 'drift' : 'snow_tracks') : k === HK.SPUR ? (m > 0.5 ? 'snow_tracks' : 'snow')
    : k === HK.GROUND ? (n > 0.62 ? 'ice' : m > 0.5 ? 'frozen_mud' : 'snow') : k === HK.CAMP ? (n > 0.5 ? 'gravel' : 'frozen_mud')
    : q > 0.55 ? 'stone' : n > 0.5 ? 'ice' : 'snow_scree',
  fen: (k, n, m, q) => k === HK.WOOD ? (n > 0.45 ? 'bog' : q > 0.55 ? 'black_pool' : 'reeds')
    : k === HK.MEADOW ? (q > 0.66 ? 'poison_moss' : n > 0.55 ? 'reeds' : m > 0.5 ? 'moss' : 'fungi')
    : k === HK.TRAIL ? (m > 0.58 ? 'stones' : n > 0.62 ? 'clay' : 'peat') : k === HK.SPUR ? (m > 0.5 ? 'roots' : 'mud')
    : k === HK.GROUND ? (n > 0.6 ? 'clay' : m > 0.45 ? 'hooves' : 'peat') : k === HK.CAMP ? (n > 0.5 ? 'roots' : 'moss')
    : q > 0.55 ? 'fungi' : n > 0.5 ? 'mud' : 'roots',
  badlands: (k, n, m, q) => k === HK.WOOD ? (q > 0.6 ? 'shadowed_dune_sand' : n > 0.55 ? 'rippled_amber_sand' : 'red_dune_sand')
    : k === HK.MEADOW ? (m > 0.6 ? 'pebble_scree' : n > 0.5 ? 'ochre_hardpan' : 'red_earth')
    : k === HK.TRAIL ? (m > 0.6 ? 'deep_caravan_ruts' : n > 0.62 ? 'footprinted_sand' : 'dried_wadi_bed') : k === HK.SPUR ? 'caravan_track_gravel'
    : k === HK.GROUND ? (n > 0.6 ? 'sienna_cracked_clay' : m > 0.45 ? 'flaking_mud_crust' : 'ochre_hardpan') : k === HK.CAMP ? (n > 0.5 ? 'ochre_loam' : 'caravan_track_gravel')
    : q > 0.55 ? 'fossil_bedrock' : n > 0.5 ? 'dark_coarse_scree' : 'ash_wadi',
  crags: (k, n, m, q, hf) => {
    const high = hf > 0.8 || (hf > 0.64 && n > 0.6);
    if (k === HK.WOOD) return high ? (q > 0.5 ? 'snow_scree' : 'snow') : q > 0.55 ? 'scree' : n > 0.5 ? 'stone' : 'wash';
    if (k === HK.MEADOW) return high ? 'snow' : q > 0.6 ? 'lichen' : n > 0.55 ? 'alpine' : 'grass';
    if (k === HK.TRAIL || k === HK.SPUR) return high ? (m > 0.5 ? 'snow_scree' : 'gravel') : m > 0.58 ? 'steps' : n > 0.6 ? 'gravel' : 'dirt';
    if (k === HK.GROUND) return high ? 'snow_scree' : n > 0.6 ? 'scree' : m > 0.45 ? 'lichen' : 'stone';
    if (k === HK.CAMP) return n > 0.55 ? 'dirt' : 'grass';
    return q > 0.5 ? 'snow' : n > 0.5 ? 'snow_scree' : 'stone';
  },
};

const h01 = (x, y, s) => {
  let h = Math.imul(x ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul(y ^ s, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
/** Smooth value noise in [0, 1) at a feature size of s tiles. */
const noiseFn = (seed) => (x, y, s) => {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), sm = (t) => t * t * (3 - 2 * t);
  const u = sm(gx - x0), v = sm(gy - y0), salt = (seed + s * 131) | 0, r = (a, b) => h01(a, b, salt);
  return (r(x0, y0) * (1 - u) + r(x0 + 1, y0) * u) * (1 - v) + (r(x0, y0 + 1) * (1 - u) + r(x0 + 1, y0 + 1) * u) * v;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The hunt's territory: `land` is a data/huntlands.js id (default the Black Wood). */
export function generateHunt(depth, biome, seed, land = 'wood') {
  const errs = [], L = landOf(land);
  for (let k = 0; k < 8; k++) {
    try { return build(depth, biome, (seed + k * 7919) >>> 0, seed, L); } catch (e) { errs.push(e.message); }
  }
  throw new Error('Great Hunt generator: ' + errs.join('; '));
}

/**
 * The Storm Crags' height map: every open tile rises with its place along the trail (camp 0, the lair CRAG_TOP), the
 * clearings flat, and no two open neighbours more than 3 levels apart (under the 4-level hop, so it walks as a slope);
 * the rock rises in cliffs above the open ground beside it. Returns each tile's height share (0..1) for its floor.
 */
function liftCrags(map, kind, paths, anchors, noise) {
  const W = map.w, H = map.h, N = W * H, id = (x, y) => y * W + x, hgt = new Int16Array(N), open = (i) => !map.block[i];
  const pts = [];
  paths.forEach((path, leg) => path.forEach((p, i) => pts.push([p[0], p[1], (leg + i / Math.max(1, path.length - 1)) / 4])));
  // each open tile takes the progress of the trail point nearest it (a coarse grid of buckets keeps it quick)
  const B = 8, grid = new Map();
  for (const p of pts) { const k = Math.floor(p[0] / B) + Math.floor(p[1] / B) * 64; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  const near = (x, y) => {
    const bx = Math.floor(x / B), by = Math.floor(y / B);
    let best = null, bd = Infinity;
    for (let r = 0; r < 12 && (!best || r <= 2); r++) for (let gy = by - r; gy <= by + r; gy++) for (let gx = bx - r; gx <= bx + r; gx++) {
      if (Math.max(Math.abs(gx - bx), Math.abs(gy - by)) !== r) continue;
      for (const p of grid.get(gx + gy * 64) || []) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = p; } }
    }
    return best ? best[2] : 0;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = id(x, y); if (open(i)) hgt[i] = Math.round(near(x + 0.5, y + 0.5) * CRAG_TOP); }
  // the camp, the grounds and the lair flat at their place on the climb
  anchors.forEach((a, k) => {
    const lv = Math.round(k / 4 * CRAG_TOP), r = k === 0 ? CAMP_R + 1 : k === 4 ? LAIR_R + 1 : GROUND_R + 1;
    for (let y = Math.floor(a[1] - r); y <= a[1] + r; y++) for (let x = Math.floor(a[0] - r); x <= a[0] + r; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = id(x, y);
      if (open(i) && Math.hypot(x + 0.5 - a[0], y + 0.5 - a[1]) <= r) hgt[i] = lv;
    }
  });
  // no step over 3 levels between open neighbours: lower the high side, lowest tiles first (a bucket queue)
  const buckets = Array.from({ length: CRAG_TOP + 1 }, () => []);
  for (let i = 0; i < N; i++) if (open(i)) buckets[clamp(hgt[i], 0, CRAG_TOP)].push(i);
  for (let lv = 0; lv <= CRAG_TOP; lv++) for (let a = 0; a < buckets[lv].length; a++) {
    const i = buckets[lv][a];
    if (hgt[i] !== lv) continue;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = id(nx, ny);
      if (open(j) && hgt[j] > lv + 3) { hgt[j] = lv + 3; buckets[lv + 3].push(j); }
    }
  }
  // the rock: the height of the open ground nearest it, and a crag above that, higher the deeper in
  const base = new Int16Array(N).fill(-1), depthIn = new Uint8Array(N), q = [];
  for (let i = 0; i < N; i++) if (open(i)) { base[i] = hgt[i]; q.push(i); }
  for (let a = 0; a < q.length; a++) {
    const i = q[a], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = id(nx, ny);
      if (base[j] < 0) { base[j] = base[i]; depthIn[j] = Math.min(255, depthIn[i] + 1); q.push(j); }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = id(x, y);
    if (open(i)) continue;
    hgt[i] = base[i] + 10 + Math.min(5, depthIn[i]) * 4 + Math.round(noise(x + 13, y + 41, 4) * 14);
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) { lo = Math.min(lo, hgt[i]); hi = Math.max(hi, hgt[i]); }
  Object.assign(map, { hgt, climb: 4, drop: 10, minLevel: lo, maxLevel: hi, baseLevel: lo - 14, noSky: true, smoothField: true, losRise: 10, _terr: null });
  const hf = new Float32Array(N);
  for (let i = 0; i < N; i++) hf[i] = clamp((open(i) ? hgt[i] : base[i]) / CRAG_TOP, 0, 1);
  return hf;
}

function build(depth, biome, seed, savedSeed, land) {
  const W = HUNT_W, H = HUNT_H, N = W * H, rng = new RNG(seed), noise = noiseFn(seed & 0xffff);
  const id = (x, y) => y * W + x, map = new TileMap(W, H);
  map.t.fill(1); map.block.fill(1); map.losBlocks = true;
  const kind = new Uint8Array(N);

  // ---- the route: camp, three hunting grounds, the lair, zig-zagging up the map; turned one of four ways
  const flip = rng.int(0, 3);
  const turn = ([x, y]) => {
    let p = [x, y];
    if (flip & 1) p = [p[1], p[0]];                  // transposed
    if (flip & 2) p = [W - 1 - p[1], H - 1 - p[0]];  // mirrored across the other diagonal
    return [Math.floor(p[0]) + 0.5, Math.floor(p[1]) + 0.5];
  };
  const anchors = [[8.5, 87.5], [rng.range(40, 52), rng.range(74, 84)], [rng.range(74, 86), rng.range(52, 64)], [rng.range(36, 50), rng.range(28, 40)],
    [rng.range(72, 84), rng.range(11, 17)]].map(turn);
  const [START] = anchors, grounds = anchors.slice(1), LAIR = anchors[4];

  const carve = (cx, cy, r, k, rough = 0) => {
    for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + (rough ? (noise(x, y, 3) - 0.5) * rough : 0);
      if (d > r) continue;
      const i = id(x, y);
      map.block[i] = 0;
      if (kind[i] < k) kind[i] = k;
    }
  };
  // a winding line from a to b: jittered waypoints, Chaikin-smoothed, resampled a tile apart
  const wander = (a, b, amp) => {
    const L = dist(a, b), n = Math.max(2, Math.round(L / 7)), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    let pts = [a];
    for (let k = 1; k < n; k++) {
      const t = k / n, off = rng.range(-amp, amp);
      pts.push([clamp(a[0] + (b[0] - a[0]) * t + nx * off, 5, W - 6), clamp(a[1] + (b[1] - a[1]) * t + ny * off, 5, H - 6)]);
    }
    pts.push(b);
    for (let pass = 0; pass < 3; pass++) {
      const q = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) {
        const [p, r] = [pts[k], pts[k + 1]];
        q.push([p[0] * 0.75 + r[0] * 0.25, p[1] * 0.75 + r[1] * 0.25], [p[0] * 0.25 + r[0] * 0.75, p[1] * 0.25 + r[1] * 0.75]);
      }
      q.push(pts[pts.length - 1]); pts = q;
    }
    const out = [pts[0]];
    let carry = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const [p, r] = [pts[k], pts[k + 1]], d = dist(p, r);
      let s = 1 - carry;
      while (s <= d) { out.push([p[0] + (r[0] - p[0]) * s / d, p[1] + (r[1] - p[1]) * s / d]); s += 1; }
      carry = d - (s - 1);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };

  // ---- the trail legs, the clearings (the Fen's trail is a narrow causeway, the Badlands' a wide wash)
  const wide = land.id === 'fen' ? 1.3 : land.id === 'badlands' ? 1.85 : 1.55, amp = land.id === 'crags' ? 9 : 7;
  const paths = [];
  for (let k = 0; k < 4; k++) {
    const path = wander(anchors[k], anchors[k + 1], amp);
    for (const [x, y] of path) carve(x, y, wide + noise(x, y, 5) * 0.6, HK.TRAIL);
    paths.push(path);
  }
  carve(START[0], START[1], CAMP_R, HK.CAMP, 1.2);
  for (const g of grounds.slice(0, 3)) carve(g[0], g[1], GROUND_R, HK.GROUND, 2);
  carve(LAIR[0], LAIR[1], LAIR_R, HK.LAIR, 1.6);

  // ---- open ground beside the trail, game trails off it to small glades
  const nearRoute = (p, r) => anchors.some((a) => dist(p, a) < r);
  for (let n = 0, tries = 0; n < rng.int(6, 9) && tries < 80; tries++) {
    const path = rng.pick(paths), i = rng.int(4, path.length - 5), p = path[i], q = path[i + 1];
    const L = dist(p, q) || 1, nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L, r = rng.range(2.6, 4.6), side = rng.chance(0.5) ? 1 : -1;
    const c = [p[0] + nx * side * (r + 0.6), p[1] + ny * side * (r + 0.6)];
    if (c[0] < r + 3 || c[1] < r + 3 || c[0] > W - r - 3 || c[1] > H - r - 3 || nearRoute(c, 9)) continue;
    carve(c[0], c[1], r, HK.MEADOW, 2.2); n++;
  }
  const spurs = [];
  for (let n = 0, tries = 0; n < 5 && tries < 120; tries++) {
    const leg = rng.int(0, 3), path = paths[leg], i = rng.int(6, path.length - 7), p = path[i], q = path[i + 1];
    const L = dist(p, q) || 1, side = rng.chance(0.5) ? 1 : -1, len = rng.range(9, 15);
    const end = [p[0] - (q[1] - p[1]) / L * side * len, p[1] + (q[0] - p[0]) / L * side * len];
    if (end[0] < 6 || end[1] < 6 || end[0] > W - 7 || end[1] > H - 7 || nearRoute(end, 12) || spurs.some((s) => dist(s.end, end) < 12)) continue;
    // not back across another leg of the trail
    if (paths.some((pp, k) => k !== leg && pp.some((t) => dist(t, end) < 7))) continue;
    const e = [Math.floor(end[0]) + 0.5, Math.floor(end[1]) + 0.5], line = wander(p, e, 2.5);
    for (const [x, y] of line) carve(x, y, 1.15, HK.SPUR);
    carve(e[0], e[1], 2.7, HK.SPUR, 1);
    spurs.push({ end: e, leg, line }); n++;
  }

  // ---- props
  const pack = biomeTileSet(BIOME_BY_ID.dark_forest), scat = new Map(pack.scatter.map((s) => [s.name, s]));
  const props = [], taken = new Uint8Array(N);
  const put = (spr, k, x, y, o = {}) => {
    if (!spr) return null;
    const p = { kind: 'scatter', x, y, spr, k, flip: o.flip ?? (spr.isometric ? false : rng.chance(0.5)), light: o.light || 0 };
    if (spr.tree) p.tree = true;
    props.push(p);
    taken[id(clamp(Math.floor(x), 0, W - 1), clamp(Math.floor(y), 0, H - 1))] = 1;
    return p;
  };
  // a prop ref (data/huntlands.js): 'f:' forest scatter, 't:' town/overworld, 's:'/'S:' Sea of Sand scatter/tree, 'T:' towering tree, '~' frosted
  const sprOf = (ref) => {
    const fr = ref.endsWith('~'), r = fr ? ref.slice(0, -1) : ref, src = r[0], name = r.slice(2);
    let spr = null, k = 0;
    if (src === 'f') { spr = scat.get(name); k = pack.k; }
    else if (src === 't') { spr = overworldObject(name) || townObject(name); k = spr && K * (spr.pixelScale || 1); }
    else if (src === 'T') { spr = darkForestTree(name); k = darkTreeK(rng.range(0.5, 0.68)); }
    else if (src === 's' || src === 'S') { spr = seaOfSandObject(name, src === 'S' ? 'tree' : undefined); if (spr) k = (SAND_H[name] || 40) * rng.range(0.9, 1.1) / (spr.h * (spr.pixelScale || 1)); }
    if (!spr) return null;
    return [fr ? frost(spr) : spr, k];
  };
  const place = (ref, x, y, o = {}) => { const r = sprOf(ref); return r && put(r[0], r[1] * (o.scale || 1), x, y, o); };
  const jit = () => rng.range(-0.2, 0.2);
  const openAt = (x, y) => map.walkable(x, y) && map.circleFree(x, y, 0.3);

  // the clues: three on every leg, on the trail, away from the clearings at its ends
  const clues = [];
  for (let leg = 0; leg < 4; leg++) {
    const path = paths[leg], a = anchors[leg], b = anchors[leg + 1], ra = leg ? GROUND_R : CAMP_R, rb = leg === 3 ? LAIR_R : GROUND_R;
    const span = path.map((p, i) => i).filter((i) => dist(path[i], a) > ra + 2.5 && dist(path[i], b) > rb + 3);
    if (span.length < 9) throw new Error(`leg ${leg} too short for its clues`);
    const pool = (leg ? land.kinds : land.kinds0).slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const kinds = leg ? ['blood', ...pool.filter((k) => k !== 'blood').slice(0, 2)] : pool.slice(0, 3);
    [0.2, 0.5, 0.82].forEach((f, n) => {
      const pi = span[Math.floor(f * (span.length - 1))], p = path[pi], q = path[Math.min(path.length - 1, pi + 1)];
      const L = dist(p, q) || 1, nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L;
      const c = { x: p[0], y: p[1], leg, n, kind: kinds[n], pi, nx, ny };
      clues.push(c);
      for (const [ref, ox, oy] of land.clues[c.kind] || []) {
        const side = n % 2 ? 1 : -1, px = p[0] + nx * side * (1.1 + ox) + oy * 0.3, py = p[1] + ny * side * (1.1 + ox) + oy * 0.3;
        if (map.walkable(px, py)) place(ref, px, py);
      }
    });
  }
  const nearClue = (x, y, r) => clues.some((c) => Math.hypot(c.x - x, c.y - y) < r);

  // the hunters' camp
  const camp = land.camp || [[1.6, -1.2, 'f:campfire', 5], [2.6, -0.2, 'f:bedroll'], [0.4, -2.5, 'f:wooden_crate'], [-1.8, -1.4, 'f:lantern_stake', 3],
    [2.4, 1.8, 'f:trail_sign'], [-2.2, 1.6, 't:firewood_stack'], [3.2, -2.2, 'f:raven_perch']];
  for (const [dx, dy, ref, light] of camp) {
    const x = START[0] + dx, y = START[1] + dy;
    if (openAt(x, y)) place(ref, x, y, { light: light || 0 });
  }
  // the hunting grounds: trampled, a carcass or two, something fallen at the edge
  for (const g of grounds.slice(0, 3)) {
    const a0 = rng.range(0, 6.28);
    for (let n = 0; n < 6; n++) {
      const a = a0 + n * 1.05 + rng.range(-0.2, 0.2), r = rng.range(4.2, 5.8), x = g[0] + Math.cos(a) * r, y = g[1] + Math.sin(a) * r;
      if (openAt(x, y) && !nearClue(x, y, 2)) place(land.dress[(n + rng.int(0, 6)) % land.dress.length], x, y);
    }
  }
  // the lair: a ring of rock, bones and the dead inside, a marker at the mouth
  {
    const a0 = rng.range(0, 6.28);
    for (let n = 0; n < 14; n++) {
      const a = a0 + n * 0.449 + rng.range(-0.1, 0.1), r = rng.range(6.2, 7.4), x = LAIR[0] + Math.cos(a) * r, y = LAIR[1] + Math.sin(a) * r;
      if (!map.walkable(x, y) || paths[3].slice(-12).some((t) => Math.hypot(t[0] - x, t[1] - y) < 2.2)) continue;
      place(land.lairRing[n % 3 === 2 ? 0 : rng.chance(0.5) ? 1 : 2], x, y);
      map.block[id(Math.floor(x), Math.floor(y))] = 1;
    }
    for (let n = 0; n < 9; n++) {
      const a = rng.range(0, 6.28), r = rng.range(2.6, 5.4), x = LAIR[0] + Math.cos(a) * r, y = LAIR[1] + Math.sin(a) * r;
      if (openAt(x, y)) place(land.lairBones[n % land.lairBones.length], x, y);
    }
    place(land.lairMark, LAIR[0] + 1.2, LAIR[1] - 2.2);
    const mouth = paths[3][Math.max(0, paths[3].length - 1 - Math.round(LAIR_R + 1.5))];
    for (const s of [-1, 1]) {
      const q = paths[3][Math.max(0, paths[3].length - 1 - Math.round(LAIR_R + 2.5))], L = dist(mouth, q) || 1;
      const x = mouth[0] - (q[1] - mouth[1]) / L * s * 2.2, y = mouth[1] + (q[0] - mouth[0]) / L * s * 2.2;
      if (map.walkable(x, y)) place(land.mouth, x, y);
    }
  }
  // the dead hunters' caches at the end of the game trails, two with a chest
  const chests = [];
  spurs.forEach((s, k) => {
    const [x, y] = s.end;
    if (k < 2) {
      chests.push({ x: x + 0.3, y: y - 0.4, rare: rng.chance(0.3) });
      place(land.id === 'tundra' ? 'f:wrapped_corpse~' : 'f:wrapped_corpse', x - 1.3, y + 0.6);
      place(land.id === 'badlands' ? 's:buried_weapon_cache' : land.id === 'tundra' ? 'f:lost_shield~' : 'f:lost_shield', x + 1.1, y + 1.0);
    } else place(rng.pick(land.lairBones), x, y);
  });

  // how far each blocked tile lies from the open ground (1 = the edge row)
  const into = new Uint8Array(N).fill(255), bq = [];
  for (let i = 0; i < N; i++) if (!map.block[i]) { into[i] = 0; bq.push(i); }
  for (let a = 0; a < bq.length; a++) {
    const i = bq[a], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = id(nx, ny);
      if (into[j] > into[i] + 1) { into[j] = into[i] + 1; bq.push(j); }
    }
  }
  // the Badlands: the Sea of Sand's modular cliffs wall the open ground (two tiles deep), joined to their neighbours
  const cliffAt = new Uint8Array(N);
  if (land.cliffs) {
    const byMask = new Map();
    for (const f of seaOfSandFrames('cliff')) if (f.connection_mask != null && f.material === land.cliffs) { if (!byMask.has(f.connection_mask)) byMask.set(f.connection_mask, []); byMask.get(f.connection_mask).push(f); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = id(x, y);
      if (!map.block[i] || taken[i] || into[i] > 2) continue;
      let mask = 0;
      for (const [dx, dy, bit] of [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || map.block[id(nx, ny)]) mask |= bit; }
      const f = rng.pick(byMask.get(mask) || byMask.get(0) || [null]), spr = f && seaOfSandCliff(f.name);
      if (spr) { put(spr, K, x + 0.5, y + 0.5); cliffAt[i] = 1; }
    }
  }
  // the cover: thick at the edge (it reads as the wall), thinner deep in; never two on neighbouring tiles
  const treeAt = new Uint8Array(N), P = land.cover.p;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = id(x, y);
    if (!map.block[i] || taken[i] || into[i] === 0 || cliffAt[i]) continue;
    if (!rng.chance(into[i] <= 2 ? P[0] : into[i] <= 5 ? P[1] : P[2])) continue;
    let crowded = false;
    for (let dy = -1; dy <= 1 && !crowded; dy++) for (let dx = -1; dx <= 1; dx++) if (treeAt[id(clamp(x + dx, 0, W - 1), clamp(y + dy, 0, H - 1))]) { crowded = true; break; }
    if (crowded) continue;
    if (place(rng.pick(land.cover.trees), x + 0.5 + jit(), y + 0.5 + jit())) treeAt[i] = 1;
  }
  // undergrowth along the edge, odds and ends in the open ground
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = id(x, y), k = kind[i], cx = x + 0.5 + jit(), cy = y + 0.5 + jit();
    if (map.block[i] || taken[i] || k >= HK.GROUND || nearClue(cx, cy, 2.2)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.block[id(x + dx, y + dy)]);
    if (edge && rng.chance(k === HK.TRAIL ? 0.1 : 0.18)) place(rng.pick(land.cover.under), cx, cy);
    else if (k === HK.MEADOW && rng.chance(0.08)) place(rng.pick(land.cover.meadow), cx, cy);
  }
  // a hunter's lantern now and then beside the first leg; markers along the last
  for (const [leg, every, ref, light] of land.lanterns) {
    const path = paths[leg];
    for (let i = every; i < path.length - every; i += every) {
      const p = path[i], q = path[i + 1], L = dist(p, q) || 1, s = i % 2 ? 1 : -1;
      const x = p[0] - (q[1] - p[1]) / L * s * 2.1, y = p[1] + (q[0] - p[0]) / L * s * 2.1;
      if (map.walkable(x, y) && !nearClue(x, y, 2.5)) place(ref, x, y, { light });
    }
  }

  // ---- the exit: at the back of the lair, away from its mouth; the town portal by the camp
  const back = paths[3][Math.max(0, paths[3].length - 8)], L = dist(LAIR, back) || 1;
  let exit = [LAIR[0] + (LAIR[0] - back[0]) / L * 3.6, LAIR[1] + (LAIR[1] - back[1]) / L * 3.6];
  if (!map.circleFree(exit[0], exit[1], 0.4)) exit = map.randomNear(LAIR[0], LAIR[1], 3, rng.fn());
  let townPortal = [START[0] - 1.8, START[1] + 1.2];
  if (!map.circleFree(townPortal[0], townPortal[1], 0.4)) townPortal = map.randomNear(START[0], START[1], 2.5, rng.fn());

  // ---- monsters: packs through the open ground, never at the camp or where the beast waits (15 tiles clear,
  // so a dodge out of its slam doesn't wake a pack and the beast is fought alone with its brood)
  const looks = rollLooks(biome, rng.fn()), spawns = [];
  for (let n = 0, tries = 0; n < 20 && tries < 600; tries++) {
    const x = rng.int(4, W - 5) + 0.5, y = rng.int(4, H - 5) + 0.5, k = kind[id(Math.floor(x), Math.floor(y))];
    if (!map.circleFree(x, y, 0.35) || k >= HK.GROUND || dist([x, y], START) < 14 || grounds.some((g) => dist([x, y], g) < 15) || nearClue(x, y, 3)) continue;
    if (spawns.some((s) => dist([x, y], [s.x, s.y]) < 6)) continue;
    const arch = rng.pick(land.roster);
    spawns.push({ x, y, arch, n: rng.int(2, 4), rank: n % 6 === 5 ? 'champion' : 'normal', look: looks.pick(arch) });
    n++;
  }

  // ---- the Fen's poison pools: in the open ground beside the trail and round the hunting grounds' rims, never on it
  const pools = [];
  if (land.twist === 'mire') {
    const onTrail = (x, y, r) => paths.some((pp) => pp.some((t) => Math.hypot(t[0] - x, t[1] - y) < r));
    for (let n = 0, tries = 0; n < 16 && tries < 900; tries++) {
      const g = tries % 3 ? null : rng.pick(grounds.slice(0, 3));
      const x = g ? g[0] + rng.range(-6, 6) : rng.int(5, W - 6) + 0.5, y = g ? g[1] + rng.range(-6, 6) : rng.int(5, H - 6) + 0.5, r = rng.range(1.1, 1.8);
      const k = kind[id(Math.floor(x), Math.floor(y))];
      if (!map.walkable(x, y) || k === HK.CAMP || k === HK.LAIR || k === HK.SPUR || onTrail(x, y, r + 2.4) || nearClue(x, y, r + 3) || dist([x, y], START) < 10) continue;
      if (g && dist([x, y], g) < 4) continue;   // not in the middle of a fight's ground
      if (pools.some((p) => dist([x, y], [p.x, p.y]) < p.r + r + 2) || chests.some((c) => dist([x, y], [c.x, c.y]) < 3)) continue;
      pools.push({ x, y, r }); n++;
    }
  }

  // ---- everything that matters must be walkable from the camp
  const seen = new Uint8Array(N), q = [id(Math.floor(START[0]), Math.floor(START[1]))];
  seen[q[0]] = 1;
  for (let a = 0; a < q.length; a++) {
    const i = q[a], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = id(x + dx, y + dy);
      if (map.walkableTile(x + dx, y + dy) && !seen[j]) { seen[j] = 1; q.push(j); }
    }
  }
  const must = [...anchors, exit, townPortal, ...clues.map((c) => [c.x, c.y]), ...chests.map((c) => [c.x, c.y])];
  const lost = must.filter(([x, y]) => !seen[id(Math.floor(x), Math.floor(y))]);
  if (lost.length) throw new Error(`seed ${seed}: ${lost.length} hunt spots unreachable`);

  // ---- the Crags: a height map from the camp up to the lair on the peak, the rock in cliffs above the trail
  const hf = land.heights ? liftCrags(map, kind, paths, anchors, noise) : null;
  // ---- floors
  const FL = huntFloors(land.floors), pick = FLOOR[land.id] || FLOOR.wood;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = id(x, y);
    map.v[i] = FL.idx[pick(kind[i], noise(x, y, 6), noise(x + 31, y + 17, 3), noise(x + 77, y + 5, 9), hf ? hf[i] : 0)] ?? 0;
  }

  map.hunt = { kind, paths, anchors, spurs, land: land.id };
  return {
    map, props, buildings: [], wallHangings: [], torches: [], townTiles: FL.tiles, looks, spawns, chests,
    start: START, exit, townPortal, seed: savedSeed,
    hunt: { start: START, grounds, lair: LAIR, paths, clues, spurs, flip, land: land.id, pools },
  };
}
