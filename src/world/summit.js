// THE SNOWY SUMMIT (docs/SNOWY_SUMMIT.md): where the Mountainside's summit leads. A 112 x 112 height field (world/alpine.js)
// of a mountain range, drawn live in three.js (gfx/alpine3d.js) in the Snowy Summit pack's art. The way runs from an
// arrival camp at the near corner (the bottom of the screen) to the peak at the far one (the top), always gaining
// height: thin ridgelines two or three tiles wide, their flanks falling away steeply on both sides into a sea of cloud,
// between four plateaus where groups fight (each sealed on its far side by a frozen iron gate until its fight is won),
// and the peak, an old shrine where one of five snow-swapped bosses waits. The ridges climb in gentle slopes and here
// and there a rock step a hop high; the rest of the range's peaks stand round them, behind the way, never in front of it.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { biomeTileSet } from '../core/assets.js';
import { BIOME_BY_ID } from '../data/biomes.js';
import { rollLooks, SWAPS } from '../data/bestiary.js';
import { buildField, fieldLevels, reachFrom, LV, AS, fbm, smooth } from './alpine.js';
import { vnoise } from './caverns.js';

export const SW = 112, SH = 112;
export const CLIMB = 7, DROP = 10, WALK = 3;

/** The five bosses of the peak: art, raid template (game/raid.js), title, and the swap that puts each in the snow. */
export const SUMMIT_BOSSES = [
  { art: 'glacier_crown_titan', tpl: 'rimehydra', title: 'the Crown of the Glacier', swap: { colorize: [198, 0.38], light: 0.12 } },
  { art: 'blizzard_woolback', tpl: 'mammoth', title: 'Bull of the White Storm', swap: { sat: 0.22, light: 0.18 } },
  { art: 'frostmane_werebear', tpl: 'moon', title: 'the Howl on the Peak', swap: { colorize: [206, 0.3], light: 0.14 } },
  { art: 'bonewhite_crypt_dragon', tpl: 'obsidrake', title: 'the White Wyrm of the Range', swap: { colorize: [192, 0.46], light: 0.06 }, el: 'cold', fx: 'shard' },
  { art: 'rime_antler_lich', tpl: 'lich', title: 'the Antlered Frost', swap: { colorize: [178, 0.42], light: 0.1 } },
];
export const SNOW_LOOKS = [SWAPS.frost, SWAPS.rime, SWAPS.pale];

/** A Catmull-Rom curve through pts ([x, y]), sampled every ~0.5 tile: [[x, y, s (tiles along)], ...]. */
function curve(pts) {
  const out = [];
  let acc = 0, last = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 2));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const c = (q) => 0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3);
      const x = c(0), y = c(1);
      if (last) acc += Math.hypot(x - last[0], y - last[1]);
      out.push([x, y, acc]); last = [x, y];
    }
  }
  const e = pts[pts.length - 1]; acc += Math.hypot(e[0] - last[0], e[1] - last[1]); out.push([e[0], e[1], acc]);
  return out;
}

export function generateSummit(depth, biome, seed) {
  for (let k = 0; k < 12; k++) {
    const gen = build(depth, biome, (seed + k * 6151) >>> 0);
    if (gen) return gen;
  }
  throw new Error('Snowy Summit generator found no way to the peak; seed ' + seed);
}

function build(depth, biome, seed) {
  const W = SW, H = SH, N = W * H, rng = new RNG(seed), ns = (seed % 9973) + 17;
  const I = (x, y) => y * W + x, inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = biomeTileSet(BIOME_BY_ID.snowy_summit);

  // ---------------------------------------------------------------- the route: camp, four plateaus, the peak
  const NPL = 4, nodes = [], d0 = W + H - 30, d1 = 38;
  let h = 12;
  for (let i = 0; i <= NPL + 1; i++) {
    const t = i / (NPL + 1), d = d0 + (d1 - d0) * t;
    const s = i === 0 ? rng.range(-6, 6) : i === NPL + 1 ? rng.range(-8, 8) : (i % 2 ? 1 : -1) * rng.range(17, 27);
    const kind = i === 0 ? 'start' : i === NPL + 1 ? 'peak' : 'plateau';
    nodes.push({ i, kind, x: (d + s) / 2, y: (d - s) / 2, r: kind === 'start' ? 4.6 : kind === 'peak' ? 8 : rng.range(6.4, 8.2), h, ph: rng.range(0, 6.28) });
    h += kind === 'start' ? rng.range(3.6, 4.4) : rng.range(4.2, 5.4);
  }
  const radiusAt = (n, a) => n.r * (0.84 + 0.32 * vnoise(Math.cos(a) * 1.6 + n.ph, Math.sin(a) * 1.6 + n.ph * 2, ns + n.i * 3));

  // ---------------------------------------------------------------- tiles: plateaus, then ridges between them
  const lv = new Int16Array(N), walk = new Uint8Array(N), reg = new Int8Array(N).fill(-1), ridgeOf = new Int8Array(N).fill(-1), stepOf = new Int8Array(N), bestD = new Float32Array(N).fill(1e9);
  for (const n of nodes) for (let y = Math.floor(n.y - n.r * 1.3); y <= Math.ceil(n.y + n.r * 1.3); y++) for (let x = Math.floor(n.x - n.r * 1.3); x <= Math.ceil(n.x + n.r * 1.3); x++) {
    if (!inMap(x, y)) continue;
    const dx = x + 0.5 - n.x, dy = y + 0.5 - n.y;
    if (Math.hypot(dx, dy) > radiusAt(n, Math.atan2(dy, dx))) continue;
    const i = I(x, y);
    walk[i] = 1; reg[i] = n.i;
    lv[i] = Math.round(n.h * LV + (fbm(x * 0.22, y * 0.22, ns + 3) - 0.5) * (n.kind === 'plateau' ? 4 : 2));
  }
  const ridges = [];
  for (let r = 0; r < nodes.length - 1; r++) {
    const A = nodes[r], B = nodes[r + 1], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), px = -dy / L, py = dx / L;
    const mids = rng.chance(0.5) ? [0.5] : [0.34, 0.68];
    const pts = [[A.x, A.y], ...mids.map((t) => { const o = rng.range(-6, 6); return [A.x + dx * t + px * o, A.y + dy * t + py * o]; }), [B.x, B.y]];
    const smp = curve(pts), len = smp[smp.length - 1][2];
    // where it leaves A and reaches B
    let s0 = 0, s1 = len;
    for (const q of smp) if (Math.hypot(q[0] - A.x, q[1] - A.y) <= A.r * 0.8) s0 = q[2];
    for (let k = smp.length - 1; k >= 0; k--) if (Math.hypot(smp[k][0] - B.x, smp[k][1] - B.y) <= B.r * 0.8) s1 = smp[k][2];
    const hw = rng.range(1.05, 1.42), Rl = (B.h - A.h) * LV, run = Math.max(4, s1 - s0);
    // hop steps: one to three rock steps a hop high, the rest of the rise a walk (the undulation keeps it under WALK)
    const ns_ = Math.min(3, Math.max(1, Math.floor((Rl - run * 2.1) / (CLIMB - 1)) + rng.int(0, 1))), steps = [];
    for (let k = 0; k < ns_; k++) steps.push({ t: 0.22 + 0.56 * (k + rng.range(0.2, 0.8)) / ns_, up: rng.int(5, CLIMB - 1) });
    const stepsUp = steps.reduce((a, q) => a + q.up, 0), amp = Math.min(5, run * 0.08), cyc = rng.chance(0.5) ? 1 : 1.5;
    const profile = (s) => {
      const t = Math.min(1, Math.max(0, (s - s0) / run));
      let v = A.h * LV + (Rl - stepsUp) * t + amp * Math.sin(Math.PI * 2 * cyc * t) * Math.sin(Math.PI * t);
      let si = 0;
      for (const q of steps) if (t >= q.t) { v += q.up; si++; }
      return [v, si];
    };
    ridges.push({ r, A, B, smp, s0, s1, hw, steps, profile, len });
    for (const q of smp) {
      if (q[2] < s0 - 1 || q[2] > s1 + 1) continue;
      for (let y = Math.floor(q[1] - hw - 1); y <= Math.ceil(q[1] + hw + 1); y++) for (let x = Math.floor(q[0] - hw - 1); x <= Math.ceil(q[0] + hw + 1); x++) {
        if (!inMap(x, y)) continue;
        const i = I(x, y), d = Math.hypot(x + 0.5 - q[0], y + 0.5 - q[1]);
        if (d > hw || reg[i] >= 0 || d >= bestD[i]) continue;
        const [v, si] = profile(q[2]);
        walk[i] = 1; ridgeOf[i] = r; stepOf[i] = si; lv[i] = Math.round(v); bestD[i] = d;
      }
    }
  }
  // the climb limit: walkable neighbours more than a walk apart are eased together, unless a hop step lies between them
  const allowed = (i, j) => (ridgeOf[i] >= 0 && ridgeOf[i] === ridgeOf[j] && stepOf[i] !== stepOf[j] ? CLIMB : WALK);
  for (let pass = 0; pass < 40; pass++) {
    let moved = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = I(x, y);
      if (!walk[i]) continue;
      for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
        if (j < 0 || !walk[j]) continue;
        const d = lv[i] - lv[j], a = allowed(i, j);
        if (Math.abs(d) <= a) continue;
        const fix = Math.ceil((Math.abs(d) - a) / 2) * Math.sign(d);
        lv[i] -= fix; lv[j] += fix; moved++;
      }
    }
    if (!moved) break;
  }
  const start = nodes[0], peak = nodes[NPL + 1];
  const s0i = I(Math.floor(start.x), Math.floor(start.y)), pki = I(Math.floor(peak.x), Math.floor(peak.y));
  if (!walk[s0i] || !walk[pki]) return null;
  const up = reachFrom(W, H, lv, walk, null, s0i, CLIMB, DROP), down = reachFrom(W, H, lv, walk, null, pki, CLIMB, DROP);
  if (!up[pki] || !down[s0i]) return null;

  // ---------------------------------------------------------------- the range: rock falling from the way on both
  // sides into the clouds, gullies down it, other peaks of the range standing behind
  const near = new Float32Array(N).fill(1e9), nh = new Float32Array(N);
  {
    const q = [];
    for (let i = 0; i < N; i++) if (walk[i]) { near[i] = 0; nh[i] = lv[i] / LV; q.push(i); }
    for (let pass = 0; pass < 2; pass++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const yy = pass ? H - 1 - y : y, xx = pass ? W - 1 - x : x, i = I(xx, yy);
      for (const [ox, oy, c] of [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]]) {
        const nx = xx + (pass ? -ox : ox), ny = yy + (pass ? -oy : oy);
        if (!inMap(nx, ny)) continue;
        const j = I(nx, ny);
        if (near[j] + c < near[i]) { near[i] = near[j] + c; nh[i] = nh[j]; }
      }
    }
  }
  const valley = start.h - 9;
  const peaks = [];
  for (let k = 0, tries = 0; k < 9 && tries < 300; tries++) {
    const x = rng.range(-4, W + 4), y = rng.range(-4, H + 4), r = rng.range(9, 17), ti = I(Math.min(W - 1, Math.max(0, Math.floor(x))), Math.min(H - 1, Math.max(0, Math.floor(y))));
    if (near[ti] < r * 0.75) continue;
    peaks.push({ x, y, r, h: nh[ti] + rng.range(4, 11) }); k++;
  }
  // the true summit: a spire of rock towering behind the shrine on the peak's shoulder
  { const back = peak.r + 5.5; peaks.push({ x: peak.x - back * 0.72, y: peak.y - back * 0.72, r: 12, h: peak.h + rng.range(9, 13), spire: true }); }
  const rk = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    if (walk[i]) continue;
    const d = near[i], hn = nh[i];
    let v = hn - (0.8 + 1.0 * d + 0.03 * d * d) - (fbm(x * 0.17, y * 0.17, ns + 41) - 0.5) * Math.min(3, d * 0.5);
    for (const p of peaks) {
      const dd = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) / p.r;
      if (dd < 1) v = Math.max(v, p.h * Math.pow(1 - dd, p.spire ? 1.6 : 1.25) + valley * dd + (fbm(x * 0.3, y * 0.3, ns + 43) - 0.5) * (p.spire ? 3 : 2));
    }
    if (d < 3 && !(near[i] >= 2 && peaks.some((p) => p.spire && Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < p.r))) v = Math.min(v, hn - 0.55 - d * 0.75);   // next to the way the rock falls away (but the spire behind the peak)
    rk[i] = Math.max(valley - 2 + fbm(x * 0.05, y * 0.05, ns + 47) * 2.5, v);
  }

  // ---------------------------------------------------------------- the field, the map
  // off the way the rock falls in crags: steep at the rim (a profile of the distance to the way), easing into the
  // tiles' own shape (the range, its peaks) a few tiles out, never rising back over the way next to it
  const rough = (u, v, b, d, hw) => {
    const n1 = fbm(u * 1.1, v * 1.1, ns + 61) - 0.5, n2 = fbm(u * 3.2, v * 3.2, ns + 63) - 0.5, k = 0.8 + 0.4 * fbm(u * 0.35, v * 0.35, ns + 65);
    const prof = hw - (0.12 + 2.3 * Math.min(d, 0.6) + 1.05 * Math.max(0, d - 0.6) + 0.05 * d * d) * k + n2 * Math.min(0.5, d * 0.5);   // a rock rim, then snowfields
    let h = d < 1.5 ? prof : prof + (b - prof) * smooth(1.5, 4.5, d);
    if (d < 4) h = Math.min(h, hw - 0.1 - d * 0.7);
    return h + n1 * Math.min(0.9, d * 0.35);
  };
  const F = buildField({ W, H, lv, walk, rk, smoothMax: WALK, rough });
  const map = new TileMap(W, H);
  for (let i = 0; i < N; i++) map.t[i] = walk[i] ? 1 : 0;
  const hgt = fieldLevels(F, W, H, lv, walk);
  map.hgt = hgt; map.climb = CLIMB; map.drop = DROP; map.walkStep = WALK; map.smoothField = true; map.hopArc = true;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) if (walk[i]) { lo = Math.min(lo, hgt[i]); hi = Math.max(hi, hgt[i]); }
  map.minLevel = lo; map.maxLevel = hi; map.baseLevel = lo - 60;
  map.losRise = Math.round(1.6 * LV);
  map.losBlocks = true;

  // ---------------------------------------------------------------- gates: the frozen iron gate on each plateau's way on
  const gates = [];
  for (let r = 1; r <= NPL; r++) {
    const R = ridges[r], n = nodes[r];
    const k0 = R.smp.findIndex((q) => q[2] >= R.s0 + 1.5);
    if (k0 < 0) continue;
    let made = null;
    for (let k = k0; k < Math.min(R.smp.length - 3, k0 + 10) && !made; k++) {
      const q = R.smp[k], qa = R.smp[Math.max(0, k - 3)], qb = R.smp[Math.min(R.smp.length - 1, k + 3)];
      const ddx = qb[0] - qa[0], ddy = qb[1] - qa[1], axis = Math.abs(ddx) >= Math.abs(ddy) ? 'y' : 'x';
      const L = Math.round(axis === 'y' ? q[0] : q[1]), fwd = axis === 'y' ? Math.sign(ddx) : Math.sign(ddy);
      const col = fwd > 0 ? L : L - 1, c0 = Math.round(axis === 'y' ? q[1] : q[0]);
      const tiles = [];
      for (let a = c0 - 4; a <= c0 + 4; a++) { const [x, y] = axis === 'y' ? [col, a] : [a, col]; if (inMap(x, y) && walk[I(x, y)] && reg[I(x, y)] < 0) tiles.push(a); }
      if (tiles.length < 2 || tiles.length > 4 || tiles[tiles.length - 1] - tiles[0] !== tiles.length - 1) continue;
      const tIdx = tiles.map((a) => (axis === 'y' ? I(col, a) : I(a, col)));
      const blocked = new Uint8Array(N); for (const i of tIdx) blocked[i] = 1;
      if (reachFrom(W, H, lv, walk, blocked, I(Math.floor(n.x), Math.floor(n.y)), CLIMB, DROP)[I(Math.floor(nodes[r + 1].x), Math.floor(nodes[r + 1].y))]) continue;
      made = { r, axis, line: L, a0: tiles[0], a1: tiles[tiles.length - 1] + 1, tiles: tIdx, fwd, design: 'frozen_iron_gate' };
    }
    if (made) gates.push(made);
  }
  // the gates' doors, an arch over the way onto the peak and out of the camp, ruined shrine walls at the peak's back
  map.walls = []; map.doors = [];
  const gateDoors = [];
  for (const g of gates) {
    const doors = [];
    for (let a = g.a0; a < g.a1; a++) {
      const first = a === g.a0, dir = g.axis === 'x' ? (first ? 'SE' : 'NW') : (first ? 'SW' : 'NE');
      const art = set.doors[g.design]?.[dir] || Object.values(set.doors)[0][dir];
      const [cx, cy] = g.axis === 'x' ? [a + 0.5, g.line] : [g.line, a + 0.5];
      const door = { kind: 'door', x: cx, y: cy, axis: g.axis, open: false, locked: true, art };
      map.doors.push(door); doors.push(door);
      for (const part of ['L', 'R', 'leaf']) {
        const sl = art[part === 'leaf' ? 'open' : 'closed'].find((p) => p.part === part);
        if (sl) map.walls.push({ kind: 'door', door, part, x: cx, y: cy, depth: cx + cy + sl.du + sl.dv });
      }
    }
    for (const i of g.tiles) map.block[i] = 1;
    gateDoors.push({ r: g.r, doors, tiles: g.tiles });
  }
  const archAt = (R, sAt, design) => {
    const k = R.smp.findIndex((q) => q[2] >= sAt);
    if (k < 0) return;
    const q = R.smp[k], qa = R.smp[Math.max(0, k - 3)], qb = R.smp[Math.min(R.smp.length - 1, k + 3)];
    const axis = Math.abs(qb[0] - qa[0]) >= Math.abs(qb[1] - qa[1]) ? 'y' : 'x', L = Math.round(axis === 'y' ? q[0] : q[1]), c = Math.floor(axis === 'y' ? q[1] : q[0]) + 0.5;
    const flip = rng.chance(0.5), dir = axis === 'x' ? (flip ? 'NW' : 'SE') : (flip ? 'NE' : 'SW');
    const sls = set.arches[design]?.[dir];
    if (!sls) return;
    const [cx, cy] = axis === 'x' ? [c, L] : [L, c];
    for (const sl of sls) { const a = dir === 'NW' || dir === 'NE' ? -sl.a : sl.a; map.walls.push({ kind: 'arch', x: cx, y: cy, axis, r: sl, depth: cx + cy + a }); }
  };
  archAt(ridges[0], ridges[0].s0 + 2.5, 'slate_pass_gateway');
  archAt(ridges[NPL], ridges[NPL].s1 - 2.5, 'summit_shrine_portal');
  // the shrine's back wall: a run of ruined ashlar along the peak's far rim, the ground behind it barred
  const wallRun = () => {
    const fam = set.walls.summit_shrine_ashlar ? 'summit_shrine_ashlar' : set.families[0], Wset = set.walls[fam];
    for (let ly = Math.floor(peak.y - peak.r * 0.45); ly >= Math.floor(peak.y - peak.r); ly--) {
      const xs = [];
      for (let x = Math.floor(peak.x - 4); x <= Math.floor(peak.x + 4); x++) if (inMap(x, ly) && inMap(x, ly - 1) && walk[I(x, ly)] && walk[I(x, ly - 1)]) xs.push(x);
      if (xs.length < 5) continue;
      const x0 = xs[0], x1 = Math.min(xs[xs.length - 1], x0 + 6);
      for (let vx = x0; vx <= x1 + 1; vx++) {
        const arms = (vx > x0 ? ['NW'] : []).concat(vx <= x1 ? ['SE'] : []), mask = arms.reduce((m, a) => m | { NE: 1, SE: 2, SW: 4, NW: 8 }[a], 0);
        const vars = Wset[mask] || Wset[10];
        if (!vars) continue;
        const piece = vars[(vx * 7) % vars.length];
        for (const d of arms) { const sl = piece.find((p) => p.arm === d); if (sl) map.walls.push({ kind: 'wall', x: vx, y: ly, r: sl, front: false, depth: vx + ly + (d === 'SE' ? 0.25 : -0.25) - 0.45 }); }
      }
      for (let x = x0; x <= x1; x++) map.block[I(x, ly - 1)] = 1;
      return { y: ly, x0, x1 };
    }
    return null;
  };
  const shrineWall = wallRun();
  map.indexWalls();

  // ---------------------------------------------------------------- floors
  const FI = Object.fromEntries(set.floors.map((f, i) => [f.name, i])), tfloor = new Uint8Array(N);
  const nz = (x, y, s, o) => vnoise(x / s, y / s, ns + o);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y), n = nz(x, y, 5, 71), m = nz(x, y, 3, 73), q = nz(x, y, 8, 77), r = reg[i];
    let name;
    if (!walk[i]) {
      const hh = rk[i];
      name = hh < valley + 1.5 ? (n > 0.55 ? 'glacier_ice' : 'branching_ice_crack') : near[i] < 2 ? (n > 0.6 ? 'exposed_rock' : 'snow_seamed_shale') : q > 0.62 ? 'granite_scree' : n > 0.7 ? 'scree_drift' : 'windpacked_snow';
    } else if (r === NPL + 1) {
      const d = Math.hypot(x + 0.5 - peak.x, y + 0.5 - peak.y);
      name = d < 1.2 ? 'weathered_sun' : d < 2.6 ? (m > 0.6 ? 'wind_knot_paving' : 'summit_shrine_paving') : d < 4 ? (n > 0.6 ? 'shattered_shrine_tile' : 'frosted_cobbles') : (n > 0.55 ? 'wind_ripples' : m > 0.7 ? 'blue_snow_crust' : 'windpacked_snow');
    } else if (r === 0) name = m > 0.6 ? 'sled_groove' : n > 0.6 ? 'crossed_bootprints' : q > 0.6 ? 'runner_tracks' : 'bootprints';
    else if (r > 0) {
      name = q > 0.72 ? 'wind_ripples' : n > 0.82 ? 'scree_drift' : m > 0.78 ? 'powdered_gravel' : n < 0.18 ? 'blue_snow_crust' : 'windpacked_snow';
      if (rng.chance(0.04)) name = rng.pick(['paw_tracks', 'hare_tracks', 'small_bones', 'fallen_feather', 'antler_fragment', 'frozen_puddle', 'buried_crimson_stain', 'hoof_impressions', 'cairn_fragments']);
    } else {
      const st = [i - 1, i + 1, i - W, i + W].some((j) => j >= 0 && j < N && walk[j] && ridgeOf[j] === ridgeOf[i] && stepOf[j] !== stepOf[i]);
      name = st ? 'snowy_slate_flags' : m > 0.7 ? 'bootprints' : n > 0.74 ? 'exposed_rock' : q > 0.7 ? 'snow_seamed_shale' : 'compact_snow_path';
    }
    tfloor[i] = FI[name] ?? 0;
  }

  // ---------------------------------------------------------------- per-vertex material: rock, dark, shade, rock B
  const { VW, VH, own, near: vnear } = F, vmat = new Uint8Array(VW * VH * 4);
  for (let k = 0; k < VW * VH; k++) {
    const u = (k % VW) / AS, w = ((k / VW) | 0) / AS, rock = own[k] < 0;
    vmat[k * 4] = rock ? 255 : 0;
    vmat[k * 4 + 1] = rock ? 255 * smooth(0.5, 4, vnear[k]) * 0.3 : 0;
    vmat[k * 4 + 2] = 255 * (0.3 + 0.7 * fbm(u * 0.18, w * 0.18, ns + 81));
    vmat[k * 4 + 3] = 255 * smooth(0.42, 0.58, fbm(u * 0.06, w * 0.06, ns + 83));
  }

  // ---------------------------------------------------------------- props
  const scat = new Map(set.scatter.map((s) => [s.name, s])), props = [], taken = new Uint8Array(N);
  for (const g of gates) for (const i of g.tiles) taken[i] = 1;
  const hidden = (x, y) => {
    const h0 = F.H2(x, y), fy = (x + y) * 16 - h0 * LV * 4;
    for (let s = 0.25; s < 8; s += 0.25) { const sx = x + s, sy = y + s; if (sx >= W || sy >= H) break; if ((sx + sy) * 16 - F.H2(sx, sy) * LV * 4 < fy - 3) return true; }
    return false;
  };
  const put = (name, x, y, o = {}) => {
    const s = scat.get(name), i = I(Math.floor(x), Math.floor(y));
    if (!s || !inMap(Math.floor(x), Math.floor(y)) || taken[i] || hidden(x, y)) return null;
    const p = { kind: 'scatter', x, y, spr: s, k: set.k * (o.scale || 1), flip: o.flip ?? rng.chance(0.5), light: o.light || 0 };
    props.push(p);
    taken[i] = 1;
    if (o.block ?? s.block) map.block[i] = 1;
    return p;
  };
  const edgeOf = (i) => [i - 1, i + 1, i - W, i + W].some((j) => j >= 0 && j < N && !walk[j]);
  // the arrival camp
  const campKit = [['abandoned_summit_sled', 1.8, -1.2], ['snowbound_supply_crate', 2.4, 0.6], ['fur_bedroll', -1.6, 1.4], ['frosted_iron_brazier', -0.4, -2.2, 3.4], ['shattered_expedition_crate', -2.4, -0.6], ['climbing_pick_and_map', 0.8, 2.2], ['trail_cairn_pedestal', -2, 2.6]];
  for (const [name, dx, dy, light] of campKit) put(name, start.x + dx, start.y + dy, { light: light || 0 });
  // the peak's shrine: its altar at the back, the owl, the basin, braziers, sentinels at the rim
  const peakKit = [['mountain_shrine_altar', 0, -3.4], ['stone_owl_idol', -2.6, -3], ['frozen_shrine_basin', 2.6, -2.8], ['frosted_iron_brazier', -3.6, -1, 3.4], ['frosted_iron_brazier', 3.6, -1, 3.4],
    ['standing_stone_sentinel', -5, 1.5], ['standing_stone_sentinel', 5, 1.5], ['kneeling_pilgrim_stone', -3, 4], ['summit_warning_bell', 4.2, 3.6], ['snowbound_votive_candles', -1.2, -2.2, 2], ['snowbound_votive_candles', 1.3, -2.1, 2]];
  for (const [name, dx, dy, light] of peakKit) put(name, peak.x + dx, peak.y + dy, { light: light || 0 });
  // the plateaus: boulders and ice round their rims, a cairn and a pedestal, a few tracks of the dead
  for (let r = 1; r <= NPL; r++) {
    const n = nodes[r];
    for (let k = 0; k < 9; k++) {
      const a = rng.range(0, 6.28), rr = radiusAt(n, a) * rng.range(0.62, 0.86), x = n.x + Math.cos(a) * rr, y = n.y + Math.sin(a) * rr, i = I(Math.floor(x), Math.floor(y));
      if (!inMap(Math.floor(x), Math.floor(y)) || !walk[i] || reg[i] !== r) continue;
      put(rng.pick(['snow_capped_boulder', 'frost_split_boulder', 'glacier_ice_spire', 'glacier_crystal_cluster', 'snowy_boulder_rubble', 'jagged_slate_spur', 'alpine_menhir', 'broken_ice_chunk', 'granite_column_stump']), x, y);
    }
    put(rng.pick(['snowy_rock_cairn', 'trail_cairn_pedestal', 'leaning_wind_knot_slab']), n.x + rng.range(-2, 2), n.y + rng.range(-2, 2));
    for (let k = 0; k < 3; k++) put(rng.pick(['slate_chip_scatter', 'fallen_alpine_branch', 'snowy_timber_heap', 'broken_timber_fence', 'mountain_boots_and_belt']), n.x + rng.range(-4, 4), n.y + rng.range(-4, 4));
  }
  // along the ridges: trail markers, pitons at the hop steps, now and then a fallen pine or a spur on the rim
  for (const R of ridges) {
    for (let s = R.s0 + 6; s < R.s1 - 4; s += rng.range(9, 13)) {
      const q = R.smp.find((p) => p[2] >= s);
      if (!q) continue;
      for (let t = 0; t < 8; t++) {
        const x = q[0] + rng.range(-R.hw, R.hw), y = q[1] + rng.range(-R.hw, R.hw), i = I(Math.floor(x), Math.floor(y));
        if (inMap(Math.floor(x), Math.floor(y)) && walk[i] && ridgeOf[i] === R.r && edgeOf(i)) { put(rng.pick(['notched_trail_marker', 'notched_trail_marker', 'snowy_rock_cairn', 'alpine_menhir', 'fallen_snowy_pine']), x, y); break; }
      }
    }
    for (const st of R.steps) {
      const q = R.smp.find((p) => (p[2] - R.s0) / Math.max(1, R.s1 - R.s0) >= st.t);
      if (!q) continue;
      for (let t = 0; t < 6; t++) {
        const x = q[0] + rng.range(-R.hw, R.hw), y = q[1] + rng.range(-R.hw, R.hw), i = I(Math.floor(x), Math.floor(y));
        if (inMap(Math.floor(x), Math.floor(y)) && walk[i] && edgeOf(i)) { put('climbing_rope_and_pitons', x, y, { block: false }); break; }
      }
    }
  }

  // nothing dressed on the way may cut it (a boulder at a ridge's mouth, a marker where the ridge is thinnest): with the
  // gates open the peak must still be reachable and the way back down too; else the ridges' props stop blocking
  const passable = () => {
    const bl = Uint8Array.from(map.block);
    for (const g of gates) for (const i of g.tiles) bl[i] = 0;
    return reachFrom(W, H, hgt, walk, bl, s0i, CLIMB, DROP)[pki] && reachFrom(W, H, hgt, walk, bl, pki, CLIMB, DROP)[s0i];
  };
  if (!passable()) {
    for (const pr of props) { const i = I(Math.floor(pr.x), Math.floor(pr.y)); if (reg[i] < 0 || reg[i] === NPL + 1 || near[i] === 0) { if (!gates.some((g) => g.tiles.includes(i))) map.block[i] = 0; } }
    if (!passable()) return null;
  }

  // ---------------------------------------------------------------- the way, for auto-play and the HUD; the ridge packs
  const reach = reachFrom(W, H, hgt, walk, null, s0i, CLIMB, DROP);
  const route = [];
  for (let r = 0; r < ridges.length; r++) {
    const R = ridges[r];
    route.push({ x: nodes[r].x, y: nodes[r].y, node: r });
    for (let s = R.s0 + 4; s < R.s1 - 2; s += 5) { const q = R.smp.find((p) => p[2] >= s); if (q) route.push({ x: q[0], y: q[1], ridge: r }); }
  }
  route.push({ x: peak.x, y: peak.y, node: NPL + 1 });
  const base = rollLooks(biome, rng.fn());
  const looks = {
    pick(arch, r = Math.random) { const l = base.pick(arch, r); return l && { ...l, swap: SNOW_LOOKS[Math.floor(r() * SNOW_LOOKS.length)], tint: 'Frostbitten' }; },
    boss: base.boss.bind(base), ids: () => [...base.ids(), ...SUMMIT_BOSSES.map((b) => b.art), 'va_crystal'], all: base.all.bind(base),
  };
  const spawns = [], leaps = [];
  for (const R of ridges) {
    let n = 0;
    for (let s = R.s0 + 7; s < R.s1 - 5; s += rng.range(8, 12)) {
      const q = R.smp.find((p) => p[2] >= s);
      if (!q) continue;
      const i = I(Math.floor(q[0]), Math.floor(q[1]));
      if (!walk[i] || !reach[i] || map.block[i]) continue;
      const arch = rng.pick(biome.roster), one = rng.chance(0.5);
      spawns.push({ x: q[0], y: q[1], arch, n: one ? 1 : 2, rank: one && n % 3 === 2 ? 'champion' : 'normal', look: looks.pick(arch, rng.fn()), zone: 'ridge' });
      n++;
    }
    // things climb up out of the cloud onto the ridge once along each (not the first)
    if (R.r > 0) {
      const s = R.s0 + (R.s1 - R.s0) * rng.range(0.4, 0.65), q = R.smp.find((p) => p[2] >= s), qa = R.smp.find((p) => p[2] >= s - 2) || q;
      if (q) { const dx = q[0] - qa[0], dy = q[1] - qa[1], l = Math.hypot(dx, dy) || 1, side = rng.chance(0.5) ? 1 : -1; leaps.push({ at: [q[0], q[1]], from: [q[0] - dy / l * side * 4, q[1] + dx / l * side * 4], n: rng.int(2, 3), up: true }); }
    }
  }

  const look = {
    rock: ['snow_capped_granite', null], rockB: ['ice_bound_shale', null], tint: '#ffffff',
    snow: [-99, -98], snowC: '#eef3f8', mist: [valley + 2.5, valley - 2], mistC: '#dfe7ee',
    cloud: { y: valley + 1.6, color: '#f6f8fb', shade: '#b4c0d0', k: 0.86 },
    sun: '#fff4e2', sunI: 2.4, amb: '#d4deea', ambI: 1.05, hemiSky: '#dceaf8', hemiGround: '#9aa4b4', hemiI: 1.35,
    sky: ['#4a78b0', '#9cc0e0', '#e4ecf2'], far: ['#b8c8d8', '#98aec4', '#7d94ae'], rockScale: 0.32, bump: 1.15,
  };
  const edgeH = (x, y) => F.H2(Math.min(W - 0.01, Math.max(0, x)), Math.min(H - 0.01, Math.max(0, y)));
  const skirt = (x, y) => {
    const ex = Math.min(W, Math.max(0, x)), ey = Math.min(H, Math.max(0, y)), d = Math.hypot(x - ex, y - ey), he = edgeH(x, y);
    if (x > 0 && y > 0 && x < W && y < H) return he - 0.3;
    const n1 = fbm(x * 0.06, y * 0.06, ns + 91), n2 = fbm(x * 0.19, y * 0.19, ns + 93);
    if ((x < 0 || y < 0) && x <= W && y <= H) { const k = d * d / (d * d + 30); return he + k * (8 + 22 * n1 + 6 * n2); }   // behind: the range goes on
    return Math.max(valley - 6, he - d * 0.9 - 3 * n1);   // in front: falling into the cloud
  };

  const av = { W, H, F, tfloor, floors: set.floors, vmat, look, skirt, skirtP: 46 };
  map.summit = { nodes, ridges, gates: gateDoors, route, peak, start, reg, ridgeOf, valley, shrineWall };
  return {
    map, props, buildings: [], wallHangings: [], torches: [], looks, spawns, chests: [],
    start: [start.x, start.y], exit: [peak.x, peak.y + 1.5], seed, alpine: av, nodes, ridges, route, gates: gateDoors, leaps, bosses: SUMMIT_BOSSES,
  };
}
