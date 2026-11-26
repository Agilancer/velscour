// SHEER DROPS' drawing (data/sheer.js, docs/SHEER_DROPS.md): the cliffs hanging under every brink that faces the
// camera, the abyss behind everything (a black nothingness, or a fog sea with banks drifting below), and bodies
// plunging into it.
//
// A cliff face is a strip baked once per variant: the cliff texture (assets/tiles/sheer/<tex>.webp) running FACE_H
// world px down from the brink, a lit lip and the overhang's shadow at the top, darkening (or fogging) with depth and
// fading out at the bottom into the abyss. Each floor tile whose south-west or south-east neighbour is void hangs one
// slice of it, sheared along the edge; the slice starts at the edge's screen x (mod the texture), so a run of faces
// reads as one wall of rock. The floor chunks bake them (game/render.js drawFloorTiles): all faces, far to near, then
// the floor over them, so the near islands hide the cliffs of the far ones.
import { G } from '../state.js';
import { makeCanvas } from '../core/util.js';
import { HW, HH, TH, isoX, isoY } from '../core/view.js';

export const FACE_H = 230; // world px of cliff shown below a brink before the drop swallows it
const TEX = 128; // world px a texture period spans
const K = 2; // strips are baked at K px a world px (sharp at the usual zoom)
export const FALL_T = 1.2; // how long a plunge shows (s)

const hash = (x, y, s) => {
  let h = Math.imul(x ^ 0x3c6ef372, 0x2c1b3c6d) ^ Math.imul(y ^ s, 0x297a2d39);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ------------------------------------------------------------------ the rules' small helpers (game/sheer.js; kept here,
// with no game imports, so creature.js can use them without an import cycle)
/** May this creature be carried over a brink by a knock or a pull? (The hero only while auto-play is off.) */
export function goesOver(c) {
  if (c.isPlayer) return !G.autoplayOn;
  return c.team === 'enemy' && !c.summon && !c.static && !keeps(c);
}
/** Never falls: set back on the floor instead (bosses, raid bosses, Velscour, minions, set pieces). */
export const keeps = (c) => c.rank === 'boss' || c.rank === 'raid' || c.isRaid || c.isVelscour || !!c.raid || !!c.summon || c.team !== 'enemy' || (!!c.world && c === c.world.boss);
/** A level's tally of what went over the edge (tools/tests/sheer.js). */
export function sheerStats(w) { return w.sheerStats || (w.sheerStats = { fell: 0, hero: 0, braced: 0, saved: 0, hover: 0 }); }
/** Count one: on the level, and over the whole session (G.sheerTally, for the auto-play soak). */
export function sheerCount(w, k) {
  sheerStats(w)[k]++;
  const T = G.sheerTally || (G.sheerTally = { fell: 0, hero: 0, braced: 0, saved: 0, hover: 0 });
  T[k]++;
}

// ------------------------------------------------------------------ textures
const tex = new Map(); // tex name -> Image (null while loading or missing)
/** Load a Sheer Drop biome's cliff texture (with the level's other art, core/assets.js). */
export function preloadSheer(biome) {
  const v = biome && biome.sheer;
  if (!v || tex.get(v.tex)) return Promise.resolve();
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => { tex.set(v.tex, img); strips.delete(v.id); res(); };
    img.onerror = () => res(); // a plain rock colour stands in
    img.src = `assets/tiles/sheer/${v.tex}.webp`;
  });
}

const strips = new Map(); // variant id -> { lit, shade }
function stripsFor(v) {
  let S = strips.get(v.id);
  if (S) return S;
  const img = tex.get(v.tex), w = TEX * K, h = FACE_H * K, fog = v.below === 'fog';
  const make = (shade) => {
    const c = makeCanvas(w, h), g = c.getContext('2d');
    if (img) {
      const pat = g.createPattern(img, 'repeat'), s = w / img.width;
      pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
      g.fillStyle = pat;
    } else g.fillStyle = '#4a4440';
    g.fillRect(0, 0, w, h);
    // the faces turned to the light (south-west) and those in shade (south-east)
    g.fillStyle = shade ? 'rgba(0,0,0,0.4)' : 'rgba(255,244,226,0.05)';
    g.fillRect(0, 0, w, h);
    // vertical cracks and ribs: the rock breaks into columns, so a face reads as a cliff, not a wall
    for (let k = 0; k < 7; k++) {
      const x = hash(k, 1, v.id.length) * w, len = (0.25 + hash(k, 2, 3) * 0.6) * h, y0 = hash(k, 3, 5) * h * 0.25;
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, y0, K * (1 + hash(k, 4, 7) * 1.5), len);
      g.fillStyle = shade ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'; g.fillRect(x + K * 2, y0, K, len * 0.8);
    }
    // the brink: its lip catches the light, the overhang shades the rock under it
    g.fillStyle = rgba(v.rim, shade ? 0.28 : 0.5); g.fillRect(0, 0, w, 2 * K);
    let gr = g.createLinearGradient(0, 2 * K, 0, 18 * K);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 2 * K, w, 16 * K);
    // a light welling up from far below (lava, crystal, gold)
    if (v.glow) {
      g.globalCompositeOperation = 'lighter';
      gr = g.createLinearGradient(0, h * 0.3, 0, h);
      gr.addColorStop(0, rgba(v.glow, 0)); gr.addColorStop(1, rgba(v.glow, shade ? 0.3 : 0.42));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    }
    // depth: into the dark, or into the fog
    gr = g.createLinearGradient(0, 0, 0, h);
    if (fog) { gr.addColorStop(0, rgba(v.deep, 0)); gr.addColorStop(0.12, rgba(v.deep, 0.05)); gr.addColorStop(0.42, rgba(v.deep, 0.42)); gr.addColorStop(0.72, rgba(v.deep, 0.86)); gr.addColorStop(1, rgba(v.deep, 1)); }
    else { gr.addColorStop(0, rgba(v.deep, 0)); gr.addColorStop(0.22, rgba(v.deep, 0.3)); gr.addColorStop(0.55, rgba(v.deep, 0.78)); gr.addColorStop(0.85, rgba(v.deep, 1)); gr.addColorStop(1, rgba(v.deep, 1)); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // fog banks lying across the cliffs' feet: soft horizontal drifts, wrapped so the strip tiles sideways
    if (fog) {
      for (let k = 0; k < 9; k++) {
        const cx = hash(k, 5, 11) * w, cy = h * (0.36 + hash(k, 6, 11) * 0.4), rx = w * (0.25 + hash(k, 7, 11) * 0.35), ry = K * (6 + hash(k, 8, 11) * 10);
        for (const ox of [-w, 0, w]) {
          const rg = g.createRadialGradient(cx + ox, cy, 0, cx + ox, cy, rx);
          rg.addColorStop(0, rgba(v.deep, 0.5)); rg.addColorStop(1, rgba(v.deep, 0));
          g.save(); g.translate(cx + ox, cy); g.scale(1, ry / rx); g.translate(-(cx + ox), -cy);
          g.fillStyle = rg; g.fillRect(cx + ox - rx, cy - rx, rx * 2, rx * 2); g.restore();
        }
      }
    }
    // and the last of it melts into the abyss behind
    g.globalCompositeOperation = 'destination-out';
    gr = g.createLinearGradient(0, h * (fog ? 0.8 : 0.72), 0, h);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    return c;
  };
  S = { lit: make(false), shade: make(true) };
  if (img) strips.set(v.id, S);
  return S;
}

/** One cliff face hung under a brink from (x0,y0) along (dx,dy) (dy > 0: a south-west face, in the light). */
function face(ctx, strip, x0, y0, dx, dy) {
  ctx.save();
  ctx.transform(1, dy / dx, 0, 1, x0, y0);
  let u = ((x0 % TEX) + TEX) % TEX, left = dx, at = 0;
  while (left > 0.01) {
    const n = Math.min(left, TEX - u);
    ctx.drawImage(strip, u * K, 0, n * K, FACE_H * K, at, -0.6, n + 0.5, FACE_H);
    at += n; left -= n; u = 0;
  }
  ctx.restore();
}

/**
 * Draw a Sheer Drop's floor in tiles [tx0..tx1] x [ty0..ty1] (callers widen ty0/tx0 by the faces' reach): every cliff
 * face far to near, then the floor tiles (`tile(ctx, tx, ty, px, py)`), then the brinks' rims. Only tiles at depth
 * (tx + ty) >= minD (a plunge redraws what stands in front of it). `inView(px, py)` culls a tile's diamond.
 */
export function drawSheerTiles(ctx, map, tx0, ty0, tx1, ty1, tile, inView, minD = -Infinity) {
  const v = map.sheer, S = stripsFor(v), t = map.t, W = map.w;
  const fl = (x, y) => x >= 0 && y >= 0 && x < W && y < map.h && t[y * W + x] === 1;
  const d0 = Math.max(tx0 + ty0, Math.ceil(minD)), d1 = tx1 + ty1;
  for (let d = d0; d <= d1; d++) {
    for (let tx = Math.max(tx0, d - ty1); tx <= Math.min(tx1, d - ty0); tx++) {
      const ty = d - tx;
      if (!fl(tx, ty)) continue;
      const sw = !fl(tx, ty + 1), se = !fl(tx + 1, ty);
      if (!sw && !se) continue;
      const px = (tx - ty) * HW, py = (tx + ty) * HH;
      if (!inView(px, py, true)) continue;
      if (sw) face(ctx, S.lit, px - HW, py + HH, HW, HH);
      if (se) face(ctx, S.shade, px, py + TH, HW, -HH);
    }
  }
  const rims = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (tx + ty < minD || !fl(tx, ty)) continue;
    const px = (tx - ty) * HW, py = (tx + ty) * HH;
    if (!inView(px, py, false)) continue;
    tile(ctx, tx, ty, px, py);
    if (!fl(tx - 1, ty) || !fl(tx, ty - 1) || !fl(tx, ty + 1) || !fl(tx + 1, ty)) rims.push(tx, ty, px, py);
  }
  // the brinks: a dark line where the floor ends against the drop behind it, a lit one along the cliffs' tops
  ctx.lineCap = 'round';
  for (let i = 0; i < rims.length; i += 4) {
    const tx = rims[i], ty = rims[i + 1], px = rims[i + 2], py = rims[i + 3];
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    if (!fl(tx - 1, ty)) { ctx.moveTo(px - HW, py + HH); ctx.lineTo(px, py); }
    if (!fl(tx, ty - 1)) { ctx.moveTo(px, py); ctx.lineTo(px + HW, py + HH); }
    ctx.stroke();
    ctx.lineWidth = 1.1; ctx.strokeStyle = rgba(v.rim, 0.55);
    ctx.beginPath();
    if (!fl(tx, ty + 1)) { ctx.moveTo(px - HW, py + HH); ctx.lineTo(px, py + TH); }
    if (!fl(tx + 1, ty)) { ctx.moveTo(px, py + TH); ctx.lineTo(px + HW, py + HH); }
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ the abyss
const T = 768; // the layers tile every T px
const layers = new Map(); // variant id -> { mist: [canvas, canvas], motes: [canvas, canvas], glow }
function soft(g, x, y, rx, ry, col, a, size) {
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
    const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rx);
    gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
    g.save(); g.translate(x + ox, y + oy); g.scale(1, ry / rx); g.translate(-(x + ox), -(y + oy));
    g.fillStyle = gr; g.fillRect(x + ox - rx, y + oy - rx, rx * 2, rx * 2); g.restore();
  }
}
function layersFor(v) {
  let L = layers.get(v.id);
  if (L) return L;
  L = { mist: [], motes: [], glow: null };
  const n = v.id.length;
  // fog banks: long soft drifts, built small and blown up (smoothing on), two depths
  if (v.mist) for (let j = 0; j < 2; j++) {
    const S = 128, small = makeCanvas(S, S), g = small.getContext('2d');
    for (let k = 0; k < (j ? 16 : 26); k++) {
      const x = hash(k, 1 + j, n) * S, y = hash(k, 3 + j, n) * S, rx = 10 + hash(k, 5, n) * (j ? 34 : 24);
      soft(g, x, y, rx, rx * (0.22 + hash(k, 6, n) * 0.2), v.mist[j], (j ? 0.38 : 0.3) + hash(k, 7, n) * 0.3, S);
    }
    const c = makeCanvas(T, T), cg = c.getContext('2d');
    cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
    cg.drawImage(small, 0, 0, T, T);
    L.mist.push(c);
  }
  // what drifts in the void, two depths (the near one bigger and brighter)
  const M = v.motes, col = M.color;
  for (let j = 0; j < 2; j++) {
    const c = makeCanvas(T, T), g = c.getContext('2d'), cnt = { star: 520, dust: 140, ember: 90, snow: 160, glint: 70, gold: 80, spray: 110, ash: 120 }[M.kind] || 100;
    for (let k = 0; k < (j ? cnt * 0.45 : cnt); k++) {
      const x = hash(k, 11 + j, n) * T, y = hash(k, 13 + j, n) * T, b = hash(k, 15 + j, n), s = (j ? 1.6 : 1) * (0.6 + b);
      if (M.kind === 'star') {
        g.fillStyle = b > 0.96 ? '#ffffff' : b > 0.75 ? col : rgba(col, 0.35 + b * 0.3);
        g.fillRect(Math.floor(x), Math.floor(y), b > 0.9 ? 2 : 1, b > 0.9 ? 2 : 1);
        if (b > 0.985) { g.globalAlpha = 0.45; g.fillRect(x - 3, y, 8, 1); g.fillRect(x, y - 3, 1, 8); g.globalAlpha = 1; }
      } else if (M.kind === 'ember' || M.kind === 'gold' || M.kind === 'glint') {
        const r = 2 + s * 2.5, gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
        gr.addColorStop(0, rgba(col, 0.55 * b + 0.2)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
        g.fillStyle = M.kind === 'ember' ? '#ffe0a0' : '#ffffff'; g.fillRect(x - 0.5, y - 0.5, s, s);
        if (M.kind === 'glint' && b > 0.7) { g.globalAlpha = 0.5; g.fillRect(x - 4, y, 9, 1); g.fillRect(x, y - 4, 1, 9); g.globalAlpha = 1; }
      } else if (M.kind === 'spray') {
        g.fillStyle = rgba(col, 0.18 + b * 0.3); g.fillRect(x, y, 1 + s, 4 + s * 4);
      } else {
        g.fillStyle = rgba(col, (M.kind === 'snow' ? 0.4 : 0.18) + b * 0.35);
        g.beginPath(); g.arc(x, y, s * (M.kind === 'snow' ? 1.3 : 0.9), 0, Math.PI * 2); g.fill();
      }
    }
    L.motes.push(c);
  }
  // a light welling up out of the deep: broad glows scattered under the islands
  if (v.glow) {
    const S = 96, small = makeCanvas(S, S), g = small.getContext('2d');
    for (let k = 0; k < 9; k++) soft(g, hash(k, 21, n) * S, hash(k, 22, n) * S, 10 + hash(k, 23, n) * 22, 10 + hash(k, 23, n) * 22, rgba(v.glow, 'A'), 0.35, S);
    const c = makeCanvas(T, T), cg = c.getContext('2d');
    cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
    cg.drawImage(small, 0, 0, T, T);
    L.glow = c;
  }
  layers.set(v.id, L);
  return L;
}
const pats = new WeakMap();
function tileLayer(ctx, c, W, H, ox, oy, s, alpha = 1, add = false) {
  let p = pats.get(c);
  if (!p) { p = ctx.createPattern(c, 'repeat'); pats.set(c, p); }
  p.setTransform(new DOMMatrix([s, 0, 0, s, ((ox % (T * s)) + T * s) % (T * s), ((oy % (T * s)) + T * s) % (T * s)]));
  ctx.globalAlpha = alpha;
  if (add) ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = p; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
let flashT = 0, flashA = 0;
/** The abyss under a Sheer Drop, in screen space (W x H device px; cx, cy the camera in device px). */
export function drawAbyss(ctx, W, H, cx, cy, v, time, dt) {
  const L = layersFor(v), s = G.dpr || 1;
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, v.sky[0]); gr.addColorStop(1, v.sky[1]);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  if (L.glow) tileLayer(ctx, L.glow, W, H, -cx * 0.15, -cy * 0.15 - time * 4, s * 1.4, 0.9, true);
  // far motes, the fog banks drifting over them, nearer motes
  const M = v.motes.kind, rise = M === 'ember' ? -1 : M === 'snow' || M === 'spray' ? 1 : M === 'ash' ? 0.4 : 0.15, drift = M === 'dust' || M === 'ash' ? 6 : 2;
  tileLayer(ctx, L.motes[0], W, H, -cx * 0.2 + time * drift, -cy * 0.2 + time * 9 * rise, s, M === 'star' ? 1 : 0.7);
  if (L.mist.length) {
    tileLayer(ctx, L.mist[0], W, H, -cx * 0.3 + time * 7, -cy * 0.3, s * 1.6, 0.85);
    tileLayer(ctx, L.mist[1], W, H, -cx * 0.5 - time * 11, -cy * 0.5, s * 2.2, 0.75);
  }
  if (v.flash) { // lightning flickering in the storm clouds below
    flashT -= dt || 0;
    if (flashT <= 0) { flashT = 3 + Math.random() * 6; flashA = 0.5 + Math.random() * 0.4; }
    if (flashA > 0.01) {
      if (!G.settings?.reduceFlashing) { ctx.fillStyle = `rgba(220,232,255,${flashA * 0.35})`; ctx.fillRect(0, 0, W, H); }
      flashA *= Math.pow(0.02, dt || 0.016);
    }
  }
  tileLayer(ctx, L.motes[1], W, H, -cx * 0.55 + time * drift * 2, -cy * 0.55 + time * 22 * rise, s, M === 'star' ? 0.8 : 0.85, M === 'ember' || M === 'gold' || M === 'glint');
}

// ------------------------------------------------------------------ plunges
/** A body going over the brink at (x,y): drawn sinking away from the floor, fading as it goes (game/sheer.js). */
export function drawPlunge(ctx, f) {
  const c = f.c, k = Math.min(1, f.t / FALL_T), drop = 40 * f.t + 380 * f.t * f.t;
  const keep = [c.x, c.y, c.z, c.alpha, c.noShadow, c.hpShow, c.dead, c.aura, c.fly];
  c.x = f.x; c.y = f.y; c.z = (f.z0 || 0) - drop; c.alpha = Math.max(0.02, 1 - k * k); c.noShadow = true; c.hpShow = 0; c.dead = false; c.aura = null; c.fly = false;
  try { c.draw(ctx); } catch (e) { /* a body that can't draw itself any more just vanishes */ }
  [c.x, c.y, c.z, c.alpha, c.noShadow, c.hpShow, c.dead, c.aura, c.fly] = keep;
  ctx.globalAlpha = 1;
  return [isoX(f.x, f.y), isoY(f.x, f.y) + drop];
}
