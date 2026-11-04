// Height fields for the mountain overworlds drawn live in three.js (the Mountainside and the Snowy Summit;
// gfx/alpine3d.js, game/alpine.js). A generator gives every tile a height in levels (gfx/terrain.js HS = 4 px each,
// the climb rules of world/map.js) and says which tiles are walkable; buildField turns that into the vertex field the
// 3D terrain is made of, AS vertices a tile edge:
//  - walkable tiles keep flat tops where a neighbour is a step away (a ledge to hop, a crisp crease a quarter tile
//    wide), and blend into a slope where it is a walk away;
//  - every other vertex is rock (`rockAt`, the generator's: a cliff band, a ridge's flanks falling into a valley, the
//    peaks of the range), shaped by its distance to the nearest walkable ground and that ground's height;
//  - the cap (as in the caverns): no rock nearer the camera may rise over the line of sight to walkable ground behind it.
import { VZ, vnoise } from './caverns.js';

export const AS = 4;                    // vertices a tile edge
export const LV = VZ / 4;               // map levels a tile of height (9.8)
const KS = 16 / VZ;                     // rise per tile of depth (x + y) seen edge-on

export const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;
export const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/**
 * spec: { W, H, lv (Int16Array tile heights in levels), walk (Uint8Array), rk (Float32Array: each rock tile's height,
 * tiles; blended between rock tiles), rough(u, v, h, d, hw) -> the rock vertex's height (h: the blend, d: tiles to
 * walkable ground, hw: that ground's height), or rockAt(u, v, d, hw) instead of both, smoothMax (levels: neighbours
 * closer than this make a slope, further a step; default 3) }.
 * Returns { S, VW, VH, hv (Float32Array, tiles), own (Int32Array: the walkable tile owning a vertex, -1 rock),
 * near (Float32Array: tiles to walkable ground), H2(x, y) }.
 */
export function buildField(spec) {
  const { W, H, lv, walk, rockAt } = spec, S = AS, VW = W * S + 1, VH = H * S + 1, NV = VW * VH;
  const sm = spec.smoothMax ?? 3, I = (x, y) => y * W + x;
  const hv = new Float32Array(NV), own = new Int32Array(NV).fill(-1);
  const isW = (x, y) => x >= 0 && y >= 0 && x < W && y < H && walk[I(x, y)];
  // walkable vertices: the tile they lie in, or on a boundary the lowest walkable tile touching them
  for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
    const u = i / S, v = j / S, k = j * VW + i;
    let o = -1;
    const x0 = i % S ? Math.floor(u) : i / S - 1, x1 = i % S ? x0 : i / S, y0 = j % S ? Math.floor(v) : j / S - 1, y1 = j % S ? y0 : j / S;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isW(tx, ty)) { const t = I(tx, ty); if (o < 0 || lv[t] < lv[o]) o = t; }
    if (o < 0) continue;
    own[k] = o;
    const t0 = lv[o], cx = Math.floor(u - 0.5), cy = Math.floor(v - 0.5), fx = u - 0.5 - cx, fy = v - 0.5 - cy;
    const val = (x, y) => { if (!isW(x, y)) return t0; const t = lv[I(x, y)]; return Math.abs(t - t0) <= sm ? t : t0; };
    hv[k] = ((val(cx, cy) * (1 - fx) + val(cx + 1, cy) * fx) * (1 - fy) + (val(cx, cy + 1) * (1 - fx) + val(cx + 1, cy + 1) * fx) * fy) / LV;
  }
  // the distance (tiles) from every rock vertex to walkable ground and that ground's height: a two-pass chamfer
  const near = new Float32Array(NV).fill(1e9), nh = new Float32Array(NV);
  for (let k = 0; k < NV; k++) if (own[k] >= 0) { near[k] = 0; nh[k] = hv[k]; }
  const a = 1 / S, b = Math.SQRT2 / S;
  const relax = (k, n, c) => { if (near[n] + c < near[k]) { near[k] = near[n] + c; nh[k] = nh[n]; } };
  for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
    const k = j * VW + i;
    if (i > 0) relax(k, k - 1, a);
    if (j > 0) { relax(k, k - VW, a); if (i > 0) relax(k, k - VW - 1, b); if (i < VW - 1) relax(k, k - VW + 1, b); }
  }
  for (let j = VH - 1; j >= 0; j--) for (let i = VW - 1; i >= 0; i--) {
    const k = j * VW + i;
    if (i < VW - 1) relax(k, k + 1, a);
    if (j < VH - 1) { relax(k, k + VW, a); if (i < VW - 1) relax(k, k + VW + 1, b); if (i > 0) relax(k, k + VW - 1, b); }
  }
  // rock: the rock tiles' own heights (spec.rk, tiles) blended between rock tiles, roughened by spec.rough; or rockAt
  const rk = spec.rk, isR = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !walk[I(x, y)];
  for (let k = 0; k < NV; k++) {
    if (own[k] >= 0) continue;
    const u = (k % VW) / S, v = ((k / VW) | 0) / S, d = near[k] > 1e8 ? 99 : near[k];
    if (rockAt) { hv[k] = rockAt(u, v, d, nh[k]); continue; }
    const tx = Math.min(W - 1, Math.floor(u)), ty = Math.min(H - 1, Math.floor(v)), r0 = rk[I(tx, ty)];
    const cx = Math.floor(u - 0.5), cy = Math.floor(v - 0.5), fx = u - 0.5 - cx, fy = v - 0.5 - cy;
    const val = (x, y) => (isR(x, y) ? rk[I(x, y)] : r0);
    const b0 = (val(cx, cy) * (1 - fx) + val(cx + 1, cy) * fx) * (1 - fy) + (val(cx, cy + 1) * (1 - fx) + val(cx + 1, cy + 1) * fx) * fy;
    hv[k] = spec.rough ? spec.rough(u, v, b0, d, nh[k]) : b0;
  }
  // round the walkable outline a quarter tile: convex corners cut down, notches between two edges filled
  const cov = (u, v) => {
    const cx = Math.floor(u - 0.5), cy = Math.floor(v - 0.5), fx = u - 0.5 - cx, fy = v - 0.5 - cy, w = (x, y) => (isW(x, y) ? 1 : 0);
    return (w(cx, cy) * (1 - fx) + w(cx + 1, cy) * fx) * (1 - fy) + (w(cx, cy + 1) * (1 - fx) + w(cx + 1, cy + 1) * fx) * fy;
  };
  for (let k = 0; k < NV; k++) {
    const c = cov((k % VW) / S, ((k / VW) | 0) / S);
    if (own[k] >= 0 && c < 0.4) hv[k] -= (0.4 - c) * (spec.cut ?? 3);
    else if (own[k] < 0 && c > 0.42 && near[k] < 0.5) hv[k] = Math.max(hv[k], nh[k] - 0.04);
  }
  cap(hv, own, VW, VH, S);
  const H2 = (x, y) => {
    const fx = Math.min(VW - 1.001, Math.max(0, x * S)), fy = Math.min(VH - 1.001, Math.max(0, y * S)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, t = fy - j, k = j * VW + i;
    return (hv[k] * (1 - u) + hv[k + 1] * u) * (1 - t) + (hv[k + VW] * (1 - u) + hv[k + VW + 1] * u) * t;
  };
  return { S, VW, VH, hv, own, near, H2 };
}

/** Lower every rock vertex nearer the camera than walkable ground to the line of sight over it (the caverns' cap). */
function cap(hv, own, VW, VH, S) {
  const NC = VW + VH, M = new Float32Array(NC).fill(1e9);
  for (let dsum = 0; dsum < VW + VH - 1; dsum++) {
    const iA = Math.max(0, dsum - (VH - 1)), iB = Math.min(VW - 1, dsum), dv = dsum / S;
    for (let i = iA; i <= iB; i++) {
      const j = dsum - i, k = j * VW + i;
      if (own[k] >= 0) continue;
      const c = i - j + VH;
      let m = 1e9;
      for (let o = -2; o <= 2; o++) { const q = c + o; if (q >= 0 && q < NC && M[q] < m) m = M[q]; }
      if (m > 1e8) continue;
      const lim = m + (dv - 0.35) * KS;
      if (hv[k] > lim) hv[k] = lim;
    }
    for (let i = iA; i <= iB; i++) {
      const j = dsum - i, k = j * VW + i;
      if (own[k] < 0) continue;
      const c = i - j + VH, val = hv[k] - dv * KS;
      if (val < M[c]) M[c] = val;
    }
  }
}

/** map.hgt in levels: walkable tiles their own, rock its height at the tile's centre. */
export function fieldLevels(F, W, H, lv, walk) {
  const out = new Int16Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    out[i] = walk[i] ? lv[i] : Math.round(F.H2(x + 0.5, y + 0.5) * LV);
  }
  return out;
}

/** Tile steps between walkable neighbours (levels), for checks: { slope (<= walk), hop, wall } counts. */
export function stepStats(W, H, lv, walk, walkStep, climb) {
  const s = { slope: 0, hop: 0, wall: 0 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!walk[i]) continue;
    for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
      if (j < 0 || !walk[j]) continue;
      const d = Math.abs(lv[i] - lv[j]);
      if (d <= walkStep) s.slope++; else if (d <= climb) s.hop++; else s.wall++;
    }
  }
  return s;
}

/** Breadth-first reach over walkable tiles under the hop rules (up at most climb, down at most drop). */
export function reachFrom(W, H, lv, walk, blocked, from, climb, drop) {
  const seen = new Uint8Array(W * H), q = [from];
  seen[from] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j < 0 || j >= W * H || seen[j] || !walk[j] || (blocked && blocked[j])) continue;
      const d = lv[j] - lv[i];
      if (d > climb || -d > drop) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}
