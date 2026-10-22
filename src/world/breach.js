// THE ETERNAL BREACH (docs/ETERNAL_BREACH.md): a broken world floating in the void. Every floor is 16 height-mapped
// islands (8 small, 5 medium, 3 large) joined by narrow stone walkways in a graph with loops, so there is more than one
// way round. Medium and large islands carry a shrine (a scenario or a boss fight); the large island farthest from the
// start holds the Breach Heart, the floor's final boss. A walkway leading on from a shrine island is warded until
// that island's scenario is won (the ward belongs to the nearer island, counted in walkway hops from the start, so
// the floor can always be finished). Island tops come from the Veilscar March pack, ruins (walls, arches, doors,
// paving) from the Eternal Breach pack; both packs' scatter dress them. Heights are in levels (gfx/terrain.js HS px
// each): a body hops up `climb` levels and drops `drop`. Each column's underside (`map.under`) tapers down to a point
// under the island's middle, so the islands hang in the void like broken-off rock.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { breachLooks, breachArch, breachPack } from '../data/breach.js';

const CLIMB = 4, DROP = 10;
const KINDS = [['large', 3, 10, 12.5], ['medium', 5, 6.5, 8], ['small', 8, 3.6, 5]];
const SPAN = 118;            // the square the islands are thrown into (the map is cropped to them)
const N4 = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];
const OPEN = 0, WALL = 1, PIER = 2, ARCH = 3, DOOR = 4;
const WALLISH = new Set([WALL, PIER, DOOR]);

const h01 = (x, y, s) => {
  let h = Math.imul(x ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul(y ^ s, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const noiseFn = (seed) => (x, y, s) => {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), sm = (t) => t * t * (3 - 2 * t);
  const u = sm(gx - x0), v = sm(gy - y0), salt = (seed + s * 131) | 0, r = (a, b) => h01(a, b, salt);
  return (r(x0, y0) * (1 - u) + r(x0 + 1, y0) * u) * (1 - v) + (r(x0, y0 + 1) * (1 - u) + r(x0 + 1, y0 + 1) * u) * v;
};

// island tops (Veilscar March): each island pairs two seamless grounds; patches of the pack's feature grounds
const TOPS = [['rift_heath_loam', 'black_peat'], ['ash_bruised_turf', 'dead_fern_soil'], ['basalt_rootbed', 'rift_heath_loam'],
  ['black_peat', 'thornfall_loam'], ['moonlit_clay', 'bone_dust_patch'], ['split_slate_ground', 'violet_seam_gravel'], ['dead_fern_soil', 'basalt_rootbed']];
const PATCH = ['cracked_heather', 'grave_moss_earth', 'black_heather_patch', 'violet_glass_gravel', 'shattered_quartz_soil', 'rift_scorched_dirt',
  'deep_violet_fissure_rubble', 'thorned_ground_seam', 'deadflower_meadow', 'cinder_grass', 'petrified_root_lattice', 'scorched_briar_bed'];
const HIGH = ['split_slate_ground', 'wind_cut_ash_shelf', 'fallen_monolith_chips', 'broken_basalt_flagstones'];
const WALKWAY = ['old_processional_path', 'sunken_slate_causeway', 'broken_basalt_flagstones', 'overgrown_cobble_track', 'riftworn_flagstone', 'mossless_cobble'];
const RUIN = [['ashen_grave_cobbles', 'weathered_limestone'], ['chapel_terracotta', 'mossless_cobble'], ['riftworn_flagstone', 'cold_grave_gravel'], ['ossuary_chips', 'black_slag_basalt']];
const RUIN_FEAT = ['branching_rift_fracture', 'scraped_breach_sigil', 'grave_bootprints', 'shattered_bone_fragments', 'funerary_star_mosaic', 'inset_coffin_lid',
  'skull_seal', 'candle_wax_pool', 'burial_parchment', 'cold_ash_circle', 'bone_cross', 'diagonal_rift_seam', 'old_blood_trail'];
// island scatter (Veilscar March), ruin and shrine dressing (Eternal Breach)
const WILD = ['black_heather_stump', 'deadthorn_bush', 'thornbloom_cluster', 'violet_quartz_boulder', 'split_standing_stones', 'tilted_stone_cairn',
  'petrified_root_coil', 'antlered_root_stump', 'dead_tree_root_cluster', 'violet_shard_cluster', 'split_basalt_monolith', 'fallen_headstone',
  'three_piece_burial_marker', 'rift_scarred_cairn', 'shattered_rootbound_obelisk', 'fallen_statue_torso', 'root_wrapped_grave_post'];
const SOFT = ['bonegrass_tuft', 'bonegrass_tuft', 'cracked_moss_slab', 'moonlit_puddle_marker', 'weathered_offering_bowl', 'moonlit_puddle_basin'];
const CRYPT = ['sealed_wood_coffin', 'breached_open_coffin', 'ossuary_urn', 'burial_urn_cluster', 'last_vigil_candles', 'bent_iron_candelabrum',
  'prayer_lectern', 'crypt_stone_bench', 'collapsed_effigy', 'skull_waymarker_pile', 'long_bone_heap', 'cracked_grave_amphora', 'split_funerary_obelisk'];
const LIGHTS = ['sickly_breach_brazier', 'thorned_torch_stand', 'breach_grave_lantern'];

export function generateBreach(floor, biome, tileset, walls2, seed) {
  for (let k = 0; k < 24; k++) {
    const gen = build(floor, biome, tileset, walls2, (seed + k * 7919) >>> 0);
    if (gen) return gen;
  }
  throw new Error('The Breach generator could not join its islands; seed ' + seed);
}

function build(floor, biome, ts, ts2, seed) {
  const rng = new RNG(seed), noise = noiseFn(seed & 0xffff);

  // ---------------------------------------------------------------- islands: large first, each new one near another
  const isl = [];
  for (const [kind, n, r0, r1] of KINDS) for (let k = 0; k < n; k++) {
    let ok = false;
    for (let t = 0; t < 600 && !ok; t++) {
      const r = rng.range(r0, r1), rmax = r * 1.32, cx = rng.range(rmax + 3, SPAN - rmax - 3), cy = rng.range(rmax + 3, SPAN - rmax - 3);
      let near = !isl.length, clash = false;
      for (const o of isl) {
        const gap = Math.hypot(cx - o.cx, cy - o.cy) - rmax - o.rmax;
        if (gap < (kind === 'small' ? 3 : 4.5)) { clash = true; break; }
        if (gap < 9) near = true;
      }
      if (!clash && near) { isl.push({ kind, r, rmax, cx, cy, idx: isl.length }); ok = true; }
    }
    if (!ok) return null;
  }
  // crop the map round them
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of isl) { x0 = Math.min(x0, o.cx - o.rmax); y0 = Math.min(y0, o.cy - o.rmax); x1 = Math.max(x1, o.cx + o.rmax); y1 = Math.max(y1, o.cy + o.rmax); }
  const M = 5, ox = Math.floor(x0) - M, oy = Math.floor(y0) - M;
  for (const o of isl) { o.cx -= ox; o.cy -= oy; }
  const W = Math.ceil(x1) - ox + M, H = Math.ceil(y1) - oy + M, N = W * H;
  const id = (x, y) => y * W + x, inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const map = new TileMap(W, H);
  const own = new Int16Array(N).fill(-1), hgt = new Int16Array(N), under = new Int16Array(N);
  const rock = new Uint8Array(N), kind = new Uint8Array(N), fam = new Array(N), bridgeOf = new Int16Array(N).fill(-1);
  const flat = new Uint8Array(N); // shrine pads, ruins, landings: nothing scattered, no crags

  // ---------------------------------------------------------------- shapes: wobbly blobs, one piece each
  for (const o of isl) {
    const p1 = rng.range(0, 6.3), p2 = rng.range(0, 6.3), p3 = rng.range(0, 6.3), tiles = [];
    for (let y = Math.floor(o.cy - o.rmax) - 1; y <= o.cy + o.rmax + 1; y++) for (let x = Math.floor(o.cx - o.rmax) - 1; x <= o.cx + o.rmax + 1; x++) {
      if (!inb(x, y)) continue;
      const dx = x + 0.5 - o.cx, dy = y + 0.5 - o.cy, a = Math.atan2(dy, dx);
      const rr = o.r * (1 + 0.15 * Math.sin(3 * a + p1) + 0.08 * Math.sin(5 * a + p2) + 0.05 * Math.sin(7 * a + p3) + (noise(x, y, 3) - 0.5) * 0.2);
      if (Math.hypot(dx, dy) < rr && own[id(x, y)] < 0) { own[id(x, y)] = o.idx; tiles.push(id(x, y)); }
    }
    // keep the piece round the middle
    const c0 = id(Math.floor(o.cx), Math.floor(o.cy));
    if (own[c0] !== o.idx) return null;
    const seen = new Set([c0]), q = [c0];
    for (let k = 0; k < q.length; k++) for (const [dx, dy] of N4) {
      const x = (q[k] % W) + dx, y = ((q[k] / W) | 0) + dy, j = id(x, y);
      if (inb(x, y) && own[j] === o.idx && !seen.has(j)) { seen.add(j); q.push(j); }
    }
    for (const i of tiles) if (!seen.has(i)) own[i] = -1;
    o.tiles = q;
  }

  // ---------------------------------------------------------------- the walkway graph: a spanning tree plus loops
  const cand = [];
  for (let a = 0; a < isl.length; a++) for (let b = a + 1; b < isl.length; b++) {
    const A = isl[a], B = isl[b], d = Math.hypot(A.cx - B.cx, A.cy - B.cy), gap = d - A.r - B.r;
    if (gap < 15) cand.push({ a, b, d, gap });
  }
  cand.sort((p, q) => p.gap - q.gap);
  const par = isl.map((o, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
  const edges = [];
  for (const e of cand) { const ra = find(e.a), rb = find(e.b); if (ra !== rb) { par[ra] = rb; e.mst = true; edges.push(e); } }
  if (new Set(isl.map((o, i) => find(i))).size > 1) return null;
  // a line from A to B that passes over a third island would merge them
  const clear = (e) => isl.every((o, i) => {
    if (i === e.a || i === e.b) return true;
    const A = isl[e.a], B = isl[e.b], vx = B.cx - A.cx, vy = B.cy - A.cy, t = Math.max(0, Math.min(1, ((o.cx - A.cx) * vx + (o.cy - A.cy) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(A.cx + vx * t - o.cx, A.cy + vy * t - o.cy) > o.rmax + 2;
  });
  if (!edges.every(clear)) return null;
  let loops = rng.int(4, 6);
  for (const e of cand) if (!e.mst && loops > 0 && e.gap < 11 && clear(e)) { edges.push(e); loops--; }

  // ---------------------------------------------------------------- the start and the Heart
  const adj = isl.map(() => []);
  for (const e of edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
  const hops = (from, skip = -1) => {
    const h = isl.map(() => -1); h[from] = 0;
    const q = [from];
    for (let k = 0; k < q.length; k++) for (const j of adj[q[k]]) if (j !== skip && h[j] < 0) { h[j] = h[q[k]] + 1; q.push(j); }
    return h;
  };
  const smalls = isl.filter((o) => o.kind === 'small'), larges = isl.filter((o) => o.kind === 'large');
  let best = null;
  for (const s of smalls) {
    const h = hops(s.idx);
    for (const L of larges) {
      // the Heart can't be a cut point: every other shrine must be reachable without crossing it
      const hs = hops(s.idx, L.idx);
      if (isl.some((o, i) => i !== L.idx && hs[i] < 0)) continue;
      const v = h[L.idx] * 10 + Math.hypot(s.cx - L.cx, s.cy - L.cy) * 0.2 + rng.next();
      if (!best || v > best.v) best = { v, s, L, h };
    }
  }
  if (!best) return null;
  const start = best.s, heart = best.L, hop = best.h;
  for (const o of isl) { o.hops = hop[o.idx]; o.shrine = o.kind !== 'small'; o.heart = o === heart; o.start = o === start; }

  // ---------------------------------------------------------------- heights: walk the tree out from the start
  const tree = isl.map(() => []);
  for (const e of edges) if (e.mst) { tree[e.a].push(e); tree[e.b].push(e); }
  start.h = 18;
  const hq = [start], hset = new Set([start.idx]);
  for (let k = 0; k < hq.length; k++) for (const e of tree[hq[k].idx]) {
    const o = isl[e.a === hq[k].idx ? e.b : e.a];
    if (hset.has(o.idx)) continue;
    hset.add(o.idx);
    const L = Math.max(3, e.gap);
    o.h = Math.round(Math.max(0, Math.min(52, hq[k].h + rng.range(-1, 1) * Math.min(1.7 * L, 16))));
    hq.push(o);
  }

  // ---------------------------------------------------------------- relief: plateaus, crags, pads and ruins
  const lift = (o, cx, cy, r, up, as = 'add') => {
    for (const i of o.tiles) {
      const x = i % W, y = (i / W) | 0;
      const rr = r * (1 + (noise(x + 40, y + 9, 2) - 0.5) * 0.35);
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < rr) { if (as === 'add') hgt[i] += up; else hgt[i] = up; }
    }
  };
  for (const o of isl) {
    for (const i of o.tiles) hgt[i] = o.h + Math.round((noise(i % W, (i / W) | 0, 4) - 0.5) * 1.8);
    if (o.kind !== 'small') {
      const a = rng.range(0, 6.3), d = o.r * 0.5;
      o.plateau = [o.cx + Math.cos(a) * d, o.cy + Math.sin(a) * d, o.r * rng.range(0.32, 0.42)];
      lift(o, o.plateau[0], o.plateau[1], o.plateau[2], 3);
      if (o.kind === 'large') lift(o, o.plateau[0] + Math.cos(a) * 0.6, o.plateau[1] + Math.sin(a) * 0.6, o.plateau[2] * 0.55, 3);
    }
  }
  const flatten = (cx, cy, r, lv, o) => {
    for (const i of o.tiles) { const x = i % W, y = (i / W) | 0; if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) { hgt[i] = lv; flat[i] = 1; } }
  };
  // ruins: roofless chapels of the Eternal Breach pack round the shrine on two or three shrine islands (never the
  // start or the Heart): walls, arches and doors, crypt furniture along the walls
  const ruins = [];
  const ruinable = isl.filter((o) => o.shrine && !o.heart).sort(() => rng.next() - 0.5).slice(0, rng.int(2, 3));
  for (const o of ruinable) {
    for (let t = 0; t < 60; t++) {
      const big = o.kind === 'large' && t < 40, rw = big ? rng.int(9, 11) : rng.int(7, 8), rh = big ? rng.int(8, 10) : rng.int(7, 8);
      const rx = Math.round(o.cx - rw / 2 + rng.range(-1.2, 1.2)), ry = Math.round(o.cy - rh / 2 + rng.range(-1.2, 1.2));
      // inside the island with a tile to spare all round, the shrine well inside
      let fit = o.cx > rx + 2.5 && o.cx < rx + rw - 2.5 && o.cy > ry + 2.5 && o.cy < ry + rh - 2.5;
      for (let y = ry - 1; y <= ry + rh && fit; y++) for (let x = rx - 1; x <= rx + rw && fit; x++) if (!inb(x, y) || own[id(x, y)] !== o.idx) fit = false;
      if (!fit) continue;
      ruins.push({ o, x: rx, y: ry, w: rw, h: rh, family: rng.pick(ts.families), interior: rng.pick(RUIN) });
      for (let y = ry - 1; y <= ry + rh; y++) for (let x = rx - 1; x <= rx + rw; x++) { hgt[id(x, y)] = o.h; flat[id(x, y)] = 1; }
      o.ruin = ruins[ruins.length - 1];
      break;
    }
  }
  for (const o of isl) {
    if (o.shrine || o.start) flatten(o.cx, o.cy, o.start ? 2.8 : 3.0, o.h, o);
  }
  // crags on the big islands: tall rock, taken back if they cut the island in two
  const reachIn = (o) => {
    const c0 = id(Math.floor(o.cx), Math.floor(o.cy)), seen = new Set([c0]), q = [c0];
    for (let k = 0; k < q.length; k++) for (const [dx, dy] of N4) {
      const x = (q[k] % W) + dx, y = ((q[k] / W) | 0) + dy, j = id(x, y);
      if (inb(x, y) && own[j] === o.idx && !rock[j] && !seen.has(j) && Math.abs(hgt[j] - hgt[q[k]]) <= CLIMB) { seen.add(j); q.push(j); }
    }
    return o.tiles.filter((i) => !rock[i]).every((i) => seen.has(i));
  };
  for (const o of isl) {
    if (o.kind === 'small') continue;
    const want = o.kind === 'large' ? rng.int(2, 4) : rng.int(0, 2);
    for (let n = 0, t = 0; n < want && t < 30; t++) {
      const a = rng.range(0, 6.3), d = o.r * rng.range(0.3, 0.72), cx = o.cx + Math.cos(a) * d, cy = o.cy + Math.sin(a) * d, r = rng.range(0.8, 1.6);
      const blob = o.tiles.filter((i) => Math.hypot((i % W) + 0.5 - cx, ((i / W) | 0) + 0.5 - cy) < r && !flat[i]);
      if (!blob.length || blob.some((i) => N4.some(([dx, dy]) => own[i + dx + dy * W] !== o.idx))) continue;
      const was = blob.map((i) => hgt[i]), up = rng.int(12, 20);
      for (const i of blob) { hgt[i] += up; rock[i] = 1; }
      if (!reachIn(o)) { blob.forEach((i, k) => { hgt[i] = was[k]; rock[i] = 0; }); continue; }
      n++;
    }
    if (!reachIn(o)) return null;
  }
  if (!reachIn(start)) return null;

  // ---------------------------------------------------------------- walkways
  const bridges = [];
  const rim = (A, B) => { // the last tile of A on the way from A's middle to B's
    const d = Math.hypot(B.cx - A.cx, B.cy - A.cy), ux = (B.cx - A.cx) / d, uy = (B.cy - A.cy) / d;
    let last = [A.cx, A.cy];
    for (let s = 0; s < d; s += 0.25) {
      const x = A.cx + ux * s, y = A.cy + uy * s;
      if (own[id(Math.floor(x), Math.floor(y))] !== A.idx) break;
      if (!rock[id(Math.floor(x), Math.floor(y))]) last = [Math.floor(x) + 0.5, Math.floor(y) + 0.5];
    }
    return last;
  };
  for (const e of edges) {
    const A = isl[e.a], B = isl[e.b], p0 = rim(A, B), p1 = rim(B, A);
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), bend = rng.range(-0.16, 0.16) * len;
    const mx = (p0[0] + p1[0]) / 2 - ((p1[1] - p0[1]) / Math.max(1, len)) * bend, my = (p0[1] + p1[1]) / 2 + ((p1[0] - p0[0]) / Math.max(1, len)) * bend;
    const hA = hgt[id(Math.floor(p0[0]), Math.floor(p0[1]))], hB = hgt[id(Math.floor(p1[0]), Math.floor(p1[1]))];
    const tiles = new Map(); // tile -> param along the walkway
    let bad = false;
    const n = Math.ceil(len * 4) + 1;
    for (let k = 0; k <= n && !bad; k++) {
      const t = k / n, x = (1 - t) * (1 - t) * p0[0] + 2 * t * (1 - t) * mx + t * t * p1[0], y = (1 - t) * (1 - t) * p0[1] + 2 * t * (1 - t) * my + t * t * p1[1];
      for (let yy = Math.floor(y - 1.2); yy <= y + 1.2; yy++) for (let xx = Math.floor(x - 1.2); xx <= x + 1.2; xx++) {
        if (!inb(xx, yy) || Math.hypot(xx + 0.5 - x, yy + 0.5 - y) > 1.02) continue;
        const i = id(xx, yy);
        if (own[i] === e.a || own[i] === e.b) continue;
        if (own[i] >= 0 || (bridgeOf[i] >= 0 && bridgeOf[i] !== bridges.length) || Math.min(xx, yy, W - 1 - xx, H - 1 - yy) < 1) { bad = true; break; }
        if (!tiles.has(i) || Math.abs(tiles.get(i) - 0.5) > Math.abs(t - 0.5)) tiles.set(i, t);
      }
    }
    // a walkway climbs at most ~2 levels a tile
    if (!bad && Math.abs(hA - hB) > Math.max(2, len - 1) * 2.2) bad = true;
    if (bad) { if (e.mst) return null; continue; }
    const b = { a: e.a, b: e.b, idx: bridges.length, tiles: [...tiles.keys()], tp: [...tiles.values()], len, p0, p1, mst: !!e.mst };
    for (const [i, t] of tiles) { bridgeOf[i] = b.idx; hgt[i] = Math.round(hA + (hB - hA) * t); }
    bridges.push(b);
  }
  // a loop walkway that couldn't be laid is gone: count the hops again on the walkways there are, and the Heart still
  // may not be the only way to anything
  for (const o of isl) adj[o.idx] = [];
  for (const b of bridges) { adj[b.a].push(b.b); adj[b.b].push(b.a); }
  {
    const h = hops(start.idx), hs = hops(start.idx, heart.idx);
    if (isl.some((o) => h[o.idx] < 0 || (o !== heart && hs[o.idx] < 0))) return null;
    for (const o of isl) o.hops = h[o.idx];
  }

  // ---------------------------------------------------------------- tiles, undersides
  for (let i = 0; i < N; i++) map.t[i] = own[i] >= 0 || bridgeOf[i] >= 0 ? 1 : 0;
  const HH = 16, HSP = 4; // half a tile's screen height and a level, in world px (view.js, terrain.js)
  for (const o of isl) {
    // the underside: a rough cone down to a point under the middle, D px deep. A rim column's face reaches down to the
    // cone's silhouette at its screen column (the lowest cone point drawn at the same screen x).
    const D = (o.r * 6 + rng.range(8, 20)) * HSP * 2.2, R = o.r * 1.15;
    const sil = new Map();
    const S = (k) => {
      const kk = Math.round(k * 4);
      if (sil.has(kk)) return sil.get(kk);
      let best = -Infinity;
      for (let t = -R; t <= R; t += 0.25) {
        const rho = Math.sqrt(k * k / 2 + 2 * t * t) / R;
        if (rho > 1) continue;
        best = Math.max(best, 2 * t * HH + D * Math.pow(1 - rho, 1.25));
      }
      sil.set(kk, best);
      return best;
    };
    for (const i of o.tiles) {
      const x = i % W, y = (i / W) | 0, dx = x + 1 - o.cx, dy = y + 1 - o.cy; // the tile's front corner
      const s = S(dx - dy), depthPx = Math.max(10, s - (dx + dy) * HH) + h01(x, y, 77) * 14 + 6;
      under[i] = Math.round(hgt[i] - depthPx / HSP);
    }
  }
  for (const b of bridges) for (const i of b.tiles) under[i] = hgt[i] - 4 - Math.round(h01(i % W, (i / W) | 0, 5) * 3);
  map.hgt = hgt; map.under = under; map.climb = CLIMB; map.drop = DROP;
  // the walkways and the islands' rims are drawn with rounded edges (gfx/terrain.js drawRounded)
  map.rounded = new Uint8Array(N);
  for (const b of bridges) for (const i of b.tiles) map.rounded[i] = 1;
  for (let i = 0; i < N; i++) {
    if (own[i] < 0) continue;
    const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1 && !map.rounded[i]; dy++) for (let dx = -1; dx <= 1; dx++) if (!inb(x + dx, y + dy) || (own[id(x + dx, y + dy)] < 0 && bridgeOf[id(x + dx, y + dy)] < 0)) { map.rounded[i] = 1; break; }
  }
  // the walkways are ramps: a height at every tile corner (the island's level where they land, else the mean of the
  // walkway tiles round it), the ground and the drawing smooth between them (gfx/terrain.js useTerrain, drawRounded)
  const W1 = W + 1, ramp = new Float32Array(W1 * (H + 1));
  for (let gy = 0; gy <= H; gy++) for (let gx = 0; gx <= W; gx++) {
    let si = 0, ni = 0, sb = 0, nb = 0;
    for (const [tx, ty] of [[gx - 1, gy - 1], [gx, gy - 1], [gx - 1, gy], [gx, gy]]) {
      if (!inb(tx, ty)) continue;
      const j = id(tx, ty);
      if (own[j] >= 0 && !rock[j]) { si += hgt[j]; ni++; } else if (bridgeOf[j] >= 0) { sb += hgt[j]; nb++; }
    }
    ramp[gy * W1 + gx] = ni ? si / ni : nb ? sb / nb : 0;
  }
  map.ramp = ramp;
  map.rampTile = new Uint8Array(N);
  for (const b of bridges) for (const i of b.tiles) map.rampTile[i] = 1;

  // ---------------------------------------------------------------- ruins: walls, doorways, arches
  const arches = [], doors = [];
  for (const r of ruins) {
    const { x: rx, y: ry, w: rw, h: rh } = r;
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
      const edge = x === rx || y === ry || x === rx + rw - 1 || y === ry + rh - 1;
      if (edge) { kind[id(x, y)] = WALL; fam[id(x, y)] = r.family; }
    }
    // the big ones get buttress walls reaching in from the corners: side chapels round the nave
    if (rw >= 9) for (const [x, y, dx, dy] of [[rx + 2, ry, 0, 1], [rx + rw - 3, ry + rh - 1, 0, -1], [rx, ry + rh - 3, 1, 0], [rx + rw - 1, ry + 2, -1, 0]]) {
      if (!rng.chance(0.75)) continue;
      for (let k = 1; k <= 2; k++) { kind[id(x + dx * k, y + dy * k)] = WALL; fam[id(x + dx * k, y + dy * k)] = r.family; }
    }
    // two or three ways in, on different sides: arches (three tiles) or doors
    const sides = ['N', 'S', 'W', 'E'].sort(() => rng.next() - 0.5).slice(0, rng.int(2, 3));
    // the side facing the shrine always has one
    const toShrine = Math.abs(r.o.cx - (rx + rw / 2)) > Math.abs(r.o.cy - (ry + rh / 2)) ? (r.o.cx < rx ? 'W' : 'E') : r.o.cy < ry ? 'N' : 'S';
    if (!sides.includes(toShrine)) sides[0] = toShrine;
    r.ways = [];
    for (const side of sides) {
      const alongX = side === 'N' || side === 'S', n = alongX ? rw : rh;
      const k = rng.int(2, n - 3), gx = alongX ? rx + k : side === 'W' ? rx : rx + rw - 1, gy = alongX ? (side === 'N' ? ry : ry + rh - 1) : ry + k;
      if ([-1, 0, 1].some((d) => kind[id(gx + (alongX ? d : 0), gy + (alongX ? 0 : d))] === WALL && (alongX ? (gy === ry ? kind[id(gx + d, gy + 1)] : kind[id(gx + d, gy - 1)]) : (gx === rx ? kind[id(gx + 1, gy + d)] : kind[id(gx - 1, gy + d)])) === WALL)) continue;
      const out = side === 'N' ? [gx, gy - 1] : side === 'S' ? [gx, gy + 1] : side === 'W' ? [gx - 1, gy] : [gx + 1, gy];
      if (own[id(out[0], out[1])] !== r.o.idx) continue;
      if (rng.chance(0.55) && ts.arches && Object.keys(ts.arches).length) {
        kind[id(gx, gy)] = ARCH;
        for (const s of [-1, 1]) { const [px, py] = alongX ? [gx + s, gy] : [gx, gy + s]; kind[id(px, py)] = PIER; fam[id(px, py)] = r.family; }
        arches.push({ x: gx + 0.5, y: gy + 0.5, axis: alongX ? 'x' : 'y', design: rng.pick(Object.keys(ts.arches)), flip: rng.chance(0.5) });
      } else {
        kind[id(gx, gy)] = DOOR;
        doors.push({ x: gx + 0.5, y: gy + 0.5, axis: alongX ? 'x' : 'y', design: rng.pick(Object.keys(ts.doors)), first: rng.chance(0.5) });
      }
      r.ways.push([gx + 0.5, gy + 0.5]);
    }
    if (!r.ways.length) return null;
  }
  for (let i = 0; i < N; i++) if (kind[i] === WALL || kind[i] === PIER) map.block[i] = 1;

  // ---------------------------------------------------------------- floors
  const F = {};
  ts.floors.forEach((f, i) => { if (!(f.name in F)) F[f.name] = i; });
  const f = (n) => F[n] ?? ts.bases[0] ?? 0;
  for (const o of isl) {
    o.top = rng.pick(TOPS);
    for (const i of o.tiles) {
      const x = i % W, y = (i / W) | 0, n = noise(x + o.idx * 13, y, 5), m = noise(x, y + o.idx * 7, 2.5);
      let v = f(n > 0.52 ? o.top[1] : o.top[0]);
      if (m > 0.78 && h01(x, y, 3) < 0.6) v = f(PATCH[(o.idx * 5 + Math.floor(h01(x, y, 9) * 4)) % PATCH.length]);
      else if (h01(x, y, 11) < 0.035) v = f(rng.pick(PATCH));
      if (rock[i] || hgt[i] >= o.h + 5) v = f(rng.pick(HIGH));
      map.v[i] = v;
    }
  }
  for (const b of bridges) { const fl = rng.pick(WALKWAY); for (const i of b.tiles) map.v[i] = f(h01(i % W, (i / W) | 0, 21) < 0.12 ? rng.pick(WALKWAY) : fl); }
  for (const r of ruins) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    map.v[id(x, y)] = f(h01(x, y, 31) < 0.14 ? rng.pick(RUIN_FEAT) : r.interior[(noise(x, y, 3) > 0.5) | 0]);
  }
  for (const o of isl) {
    if (!o.shrine && !o.start) continue;
    for (const i of o.tiles) {
      const d = Math.hypot((i % W) + 0.5 - o.cx, ((i / W) | 0) + 0.5 - o.cy);
      if (d < 1.2) map.v[i] = f(o.heart ? 'funerary_star_mosaic' : o.start ? 'scraped_breach_sigil' : 'bone_inlay_mosaic');
      else if (d < (o.start ? 2.6 : 2.9)) map.v[i] = f(o.heart ? 'riftworn_flagstone' : rng.chance(0.2) ? 'branching_rift_fracture' : 'riftworn_flagstone');
    }
  }

  // ---------------------------------------------------------------- walls, arches and doors as draw items
  const OFF = { NE: [0, -0.25], SE: [0.25, 0], SW: [0, 0.25], NW: [-0.25, 0] };
  map.walls = []; map.doors = []; map.segments = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = id(x, y);
    if (kind[i] !== WALL) continue;
    let mask = 0;
    for (const [dx, dy, bit] of N4) if (WALLISH.has(kind[id(x + dx, y + dy)])) mask |= bit;
    const set = ts.walls[fam[i]] || ts.walls[ts.families[0]], vars = set[mask] || set[0];
    const piece = vars[(((x * 73856093) ^ (y * 19349663)) >>> 0) % vars.length];
    for (const sl of piece) {
      const [dx, dy] = OFF[sl.arm] || [0, 0];
      map.walls.push({ kind: 'wall', x: x + 0.5, y: y + 0.5, r: sl, front: false, depth: x + y + 1 + dx + dy });
    }
  }
  for (const o of arches) {
    const dir = o.axis === 'x' ? (o.flip ? 'NW' : 'SE') : (o.flip ? 'NE' : 'SW');
    for (const sl of ts.arches[o.design][dir]) {
      const a = dir === 'NW' || dir === 'NE' ? -sl.a : sl.a;
      map.walls.push({ kind: 'arch', x: o.x, y: o.y, axis: o.axis, r: sl, depth: o.x + o.y + a });
    }
  }
  for (const o of doors) {
    const dir = o.axis === 'x' ? (o.first ? 'SE' : 'NW') : (o.first ? 'SW' : 'NE');
    const door = { kind: 'door', x: o.x, y: o.y, axis: o.axis, open: false, art: ts.doors[o.design][dir] };
    map.doors.push(door);
    for (const part of ['L', 'R', 'leaf']) {
      const sl = door.art[part === 'leaf' ? 'open' : 'closed'].find((p) => p.part === part);
      if (sl) map.walls.push({ kind: 'door', door, part, x: o.x, y: o.y, depth: o.x + o.y + sl.du + sl.dv });
    }
  }
  map.indexWalls();

  // ---------------------------------------------------------------- props
  const props = [], taken = new Uint8Array(N), chests = [];
  for (let i = 0; i < N; i++) if (flat[i] || kind[i] || bridgeOf[i] >= 0 || rock[i]) taken[i] = 1;
  const scat = new Map(), scat2 = new Map((ts2?.scatter || []).map((s) => [s.name, s]));
  for (const s of ts.scatter) if (!scat.has(s.name)) scat.set(s.name, s);
  const put = (name, x, y, o = {}) => {
    const s = scat.get(name) || scat2.get(name);
    if (!s) return null;
    const p = { kind: 'scatter', x, y, spr: s, k: ts.k * (o.scale || 1), flip: o.flip ?? rng.chance(0.5), light: o.light || 0, lightColor: o.lightColor };
    props.push(p);
    if (s.block && !o.walk) map.block[id(Math.floor(x), Math.floor(y))] = 1;
    taken[id(Math.floor(x), Math.floor(y))] = 1;
    return p;
  };
  const free = (x, y, edge = 1) => inb(x, y) && own[id(x, y)] >= 0 && !taken[id(x, y)] && N4.every(([dx, dy]) => inb(x + dx * edge, y + dy * edge) && own[id(x + dx * edge, y + dy * edge)] >= 0);
  const jit = () => rng.range(-0.15, 0.15);
  for (const o of isl) {
    const dens = o.kind === 'small' ? 0.09 : 0.07;
    for (const i of o.tiles) {
      const x = i % W, y = (i / W) | 0;
      if (!free(x, y) || Math.hypot(x + 0.5 - o.cx, y + 0.5 - o.cy) < (o.shrine ? 4 : 3)) continue;
      const g = noise(x + 101, y + 7, 4);
      if (g > 0.62 && rng.chance(dens * 2.2)) put(rng.pick(WILD), x + 0.5 + jit(), y + 0.5 + jit());
      else if (rng.chance(0.035)) put(rng.pick(SOFT), x + 0.5 + jit(), y + 0.5 + jit(), { walk: true });
    }
  }
  // ruin furnishing: coffins and urns along the walls, a brazier or two, a chest
  for (const r of ruins) {
    for (let n = 0, t = 0; n < Math.round(r.w * r.h / 9) && t < 80; t++) {
      const x = rng.int(r.x + 1, r.x + r.w - 2), y = rng.int(r.y + 1, r.y + r.h - 2), i = id(x, y);
      if (kind[i] || map.block[i] || Math.hypot(x + 0.5 - r.o.cx, y + 0.5 - r.o.cy) < 3.2 || r.ways.some((w) => Math.hypot(w[0] - x - 0.5, w[1] - y - 0.5) < 2.2)) continue;
      const byWall = N4.some(([dx, dy]) => kind[id(x + dx, y + dy)] === WALL);
      if (!byWall && rng.chance(0.6)) continue;
      put(n % 4 === 0 ? rng.pick(LIGHTS) : rng.pick(CRYPT), x + 0.5, y + 0.5, n % 4 === 0 ? { light: 4, lightColor: '#b060ff' } : {});
      n++;
    }
    for (let t = 0; t < 30; t++) {
      const x = rng.int(r.x + 1, r.x + r.w - 2), y = rng.int(r.y + 1, r.y + r.h - 2), i = id(x, y);
      if (kind[i] || map.block[i] || Math.hypot(x + 0.5 - r.o.cx, y + 0.5 - r.o.cy) < 3) continue;
      chests.push({ x: x + 0.5, y: y + 0.5, rare: rng.chance(0.5) }); taken[i] = 1; map.block[i] = 0;
      break;
    }
  }
  // the exit portal's spot on the Heart island, in front of its shrine: a clear tile on the pad's level with clear
  // tiles round it, kept free of the dressing below (a brazier on it left the portal out of reach)
  const keep = new Set();
  {
    const hx = Math.floor(heart.cx), hy = Math.floor(heart.cy), lv = hgt[id(hx, hy)];
    const ok = (x, y) => inb(x, y) && own[id(x, y)] === heart.idx && !kind[id(x, y)] && !rock[id(x, y)] && !map.block[id(x, y)] && Math.abs(hgt[id(x, y)] - lv) <= 1;
    const spots = [[2, 2], [2, 1], [1, 2], [3, 2], [2, 3], [3, 1], [1, 3], [3, 3], [-2, 2], [2, -2], [0, 3], [3, 0], [-2, 3], [3, -2]];
    const at = spots.find(([dx, dy]) => ok(hx + dx, hy + dy) && N4.filter(([ax, ay]) => ok(hx + dx + ax, hy + dy + ay)).length >= 3);
    if (!at) return null;
    heart.exitAt = [hx + at[0] + 0.5, hy + at[1] + 0.5];
    keep.add(id(hx + at[0], hy + at[1]));
    for (const [ax, ay] of N4) keep.add(id(hx + at[0] + ax, hy + at[1] + ay));
    for (const i of keep) taken[i] = 1;
  }
  // shrine dressing: a rift-warding basin behind each shrine stone, candles and braziers round the pad
  for (const o of isl) {
    if (!o.shrine) continue;
    o.shrinePos = [Math.floor(o.cx) + 0.5, Math.floor(o.cy) + 0.5];
    const dress = o.heart ? ['open_rift_sarcophagus', 'split_funerary_obelisk', 'split_funerary_obelisk'] : ['riftwarding_basin', 'last_vigil_candles'];
    put(dress[0], o.shrinePos[0] - 1, o.shrinePos[1] - 1);
    for (const [dx, dy] of [[2.2, -1.6], [-2.4, 1.8], [2.0, 2.2], [-1.8, -2.6]]) {
      const x = Math.floor(o.cx + dx), y = Math.floor(o.cy + dy);
      if (inb(x, y) && own[id(x, y)] === o.idx && !kind[id(x, y)] && !map.block[id(x, y)] && !keep.has(id(x, y))) put(rng.pick(LIGHTS), x + 0.5, y + 0.5, { light: 4.5, lightColor: o.heart ? '#ff40c0' : '#a050ff' });
    }
  }
  // landings: a waystone beside each walkway's end
  for (const b of bridges) for (const [p, o] of [[b.p0, isl[b.a]], [b.p1, isl[b.b]]]) {
    for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const x = Math.floor(p[0]) + dx, y = Math.floor(p[1]) + dy;
      if (free(x, y, 0) && own[id(x, y)] === o.idx && rng.chance(0.5)) { put(rng.pick(['broken_mile_marker', 'cracked_waystone_pair', 'tilted_stone_cairn', 'rift_scarred_cairn']), x + 0.5, y + 0.5); break; }
    }
  }
  // treasure on some small islands (a chest on a hop-up rock is the Breach's own little reward)
  for (const o of isl) {
    if (o.kind !== 'small' || o.start || !rng.chance(0.55)) continue;
    for (let t = 0; t < 20; t++) {
      const i = rng.pick(o.tiles), x = i % W, y = (i / W) | 0;
      if (!free(x, y) || map.block[i]) continue;
      chests.push({ x: x + 0.5, y: y + 0.5, rare: rng.chance(0.3) }); taken[i] = 1;
      break;
    }
  }

  // ---------------------------------------------------------------- monsters already on the islands
  const looks = breachLooks(rng.fn()), spawns = [];
  for (const o of isl) {
    if (o.start) continue;
    const packs = o.kind === 'small' ? (rng.chance(0.7) ? 1 : 0) : o.kind === 'medium' ? rng.int(1, 2) : 2;
    for (let n = 0, t = 0; n < packs && t < 40; t++) {
      const i = rng.pick(o.tiles), x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5;
      if (!map.walkable(x, y) || rock[i] || (o.shrine && Math.hypot(x - o.cx, y - o.cy) < 4)) continue;
      const arch = breachArch(rng.fn());
      spawns.push({ x, y, arch, n: breachPack(arch, rng.fn(), o.kind === 'large' ? 1 : 0), rank: rng.chance(0.18 + floor * 0.01) ? 'champion' : 'normal', look: looks.pick(arch), island: o.idx });
      n++;
    }
  }

  // ---------------------------------------------------------------- reachability: every island from the start
  const s0 = id(Math.floor(start.cx), Math.floor(start.cy)), seen = new Uint8Array(N), q = [s0];
  seen[s0] = 1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of N4) {
      const j = id(x + dx, y + dy);
      if (inb(x + dx, y + dy) && !seen[j] && map.walkableTile(x + dx, y + dy) && Math.abs(hgt[j] - hgt[i]) <= CLIMB) { seen[j] = 1; q.push(j); }
    }
  }
  for (const o of isl) if (!seen[id(Math.floor(o.cx), Math.floor(o.cy))]) return null;
  for (const c of chests) if (!seen[id(Math.floor(c.x), Math.floor(c.y))]) c.drop = true;

  // ---------------------------------------------------------------- wards: a walkway leading on from a shrine island
  for (const b of bridges) {
    const A = isl[b.a], B = isl[b.b];
    const near = A.hops < B.hops || (A.hops === B.hops && A.idx < B.idx) ? A : B, far = near === A ? B : A;
    b.ward = near.shrine && !near.heart ? near.idx : -1;
    b.near = near.idx; b.far = far.idx;
    // the ward cuts straight across the walkway just past the last of its tiles touching the warding island, a band
    // wide enough that nothing walks round it (checked: a walk along the walkway from that island can't get past)
    const tOf = (k) => (near === A ? b.tp[k] : 1 - b.tp[k]);
    const touches = (i, o) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => own[i + dx + dy * W] === o));
    let adj = 0;
    b.tiles.forEach((i, k) => { if (touches(i, near.idx)) adj = Math.max(adj, tOf(k)); });
    let ok = false;
    for (let band = 2.2 / Math.max(2, b.len); band < 0.7 && !ok; band += 0.6 / Math.max(2, b.len)) {
      b.gate = b.tiles.filter((i, k) => tOf(k) > adj && tOf(k) <= adj + band);
      const cut = new Set(b.gate), mine = new Set(b.tiles), q = b.tiles.filter((i) => touches(i, near.idx) && !cut.has(i)), seen2 = new Set(q);
      let leak = false;
      for (let k = 0; k < q.length && !leak; k++) {
        if (touches(q[k], far.idx)) leak = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const j = q[k] + dx + dy * W;
          if (mine.has(j) && !cut.has(j) && !seen2.has(j)) { seen2.add(j); q.push(j); }
        }
      }
      ok = b.gate.length > 0 && !leak;
    }
    if (!ok) return null;
    b.nearTiles = b.tiles.filter((i, k) => tOf(k) <= adj); // the walkway this side of its ward
    const gx = b.gate.reduce((s, i) => s + (i % W) + 0.5, 0) / Math.max(1, b.gate.length), gy = b.gate.reduce((s, i) => s + ((i / W) | 0) + 0.5, 0) / Math.max(1, b.gate.length);
    b.gateAt = [gx, gy];
  }
  // an island's walkways (for sealing it during its fight)
  for (const o of isl) o.bridges = bridges.filter((b) => b.a === o.idx || b.b === o.idx).map((b) => b.idx);
  for (const o of isl) o.rimTiles = o.tiles.filter((i) => N4.some(([dx, dy]) => own[i + dx + dy * W] !== o.idx && bridgeOf[i + dx + dy * W] < 0) && !rock[i] && !map.block[i]);

  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) if (map.t[i] === 1) { lo = Math.min(lo, under[i]); hi = Math.max(hi, hgt[i]); }
  map.minLevel = Math.min(...isl.map((o) => o.h)) - 2; map.maxLevel = hi; map.baseLevel = lo;
  map.losBlocks = true;
  map.breach = { own, bridgeOf, rock };
  map.voidFace = 'breach';
  const startAt = [Math.floor(start.cx) + 0.5, Math.floor(start.cy) + 1.5];
  const exitAt = heart.exitAt;
  if (!map.walkable(exitAt[0], exitAt[1]) || !seen[id(Math.floor(exitAt[0]), Math.floor(exitAt[1]))]) return null;
  return {
    map, props, buildings: [], wallHangings: [], torches: [], townTiles: null, looks, spawns, chests: chests.filter((c) => !c.drop),
    start: startAt, exit: exitAt, islands: isl, bridges, ruins, heart: heart.idx, startIsland: start.idx, seed,
  };
}
