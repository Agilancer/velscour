// TESSARIEL'S KEEP's art (docs/TESSARIELS_KEEP.md): the baked hall (assets/tiles/tkeep/, gfx/castle3dart.js loadBaked)
// and what the hero hangs in it: banners and stained glass laid onto the wall planes (one canvas each, made once, an
// ordinary prop sprite after that, so the depth sort and the Castle's occlusion treat them like any other prop), rugs
// drawn into the floor tile by tile (world/keepworld.js dressTile), the trophies' baked sprites, the Castle Keep pack's
// painted furniture, the Sacred Flame and the windows' light.
import { G } from '../state.js';
import { makeCanvas, clamp, TAU, spriteCanvas as rasterCanvas, frozen } from '../core/util.js';
import { HW, HH } from '../core/view.js';
import { loadBaked, castle3dState } from './castle3dart.js';
import { glowSprite } from './vfx.js';

export const KEEP_DIR = 'assets/tiles/tkeep/';
const DECOR_DIR = KEEP_DIR + 'decor/';
const R = 2;   // decoration canvases are drawn at 2x (k = 0.5) so they stay crisp zoomed in
let A = null, loading = null;
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(src)); i.src = src; });

/** Everything the keep draws: the baked set, the decor atlases, the Castle Keep pack's props. Safe to call again. */
export function loadKeepArt() {
  // the baked set goes whenever the hero leaves for another level (game.js releaseCastle3D, by the portal home or the
  // Waygate): kept, this record made the next visit load nothing, and the hall drew as bare rock (slowly)
  if (A && A.baked !== castle3dState()) { A = null; loading = null; }
  if (A) return Promise.resolve(A);
  if (loading) return loading;
  loading = Promise.all([
    loadBaked(KEEP_DIR),
    fetch(DECOR_DIR + 'decor.json').then((r) => r.json()),
    loadImg(DECOR_DIR + 'banners.webp'), loadImg(DECOR_DIR + 'glass.webp'), loadImg(DECOR_DIR + 'rugs.webp'),
    loadImg('assets/tiles/castle_keep/scatter.webp'), fetch('assets/tiles/castle_keep/pack.json').then((r) => r.json()),
    fetch(KEEP_DIR + 'brazier_front.json').then((r) => r.json()).then((f) => loadImg(f.png).then((img) => ({ ...f, img }))).catch(() => null),
  ]).then(([baked, meta, banners, glass, rugs, scat, pack, front]) => {
    A = { baked, meta, banners, glass, rugs, scat, pack, front, cache: new Map() };
    return A;
  }).catch((e) => { loading = null; throw e; });
  return loading;
}
export const keepArt = () => A;
/** Let the art go when the hero leaves (the baked pages go with releaseCastle3D; this record held them as well). */
export function releaseKeepArt() { if (A) A.cache.clear(); A = null; loading = null; }

// ------------------------------------------------------------------ helpers
const ground = (x, y, lv) => [(x - y) * HW, (x + y) * HH - lv * 4];
/** A canvas covering world-px box [x0, y0, x1, y1] at R, and the sprite record for a prop standing at ground point g. */
function spriteCanvas(box, g, draw) {
  const [x0, y0, x1, y1] = box.map((v, i) => (i < 2 ? Math.floor(v) - 2 : Math.ceil(v) + 2));
  const c = makeCanvas(Math.max(2, (x1 - x0) * R), Math.max(2, (y1 - y0) * R)), x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  draw(x, x0, y0);
  return { img: c, sx: 0, sy: 0, w: c.width, h: c.height, ox: (x0 - g[0]) * R, oy: (y0 - g[1]) * R };
}
/** The corner, along and down vectors (world px) of a w-wide face rect on plane `axis` = c, from level zt down to zb.
 *  A face along x (plane y = c) faces +y; one along y (plane x = c) faces +x; both read left to right on screen. */
function facePlane(axis, a, c, w, zt, zb) {
  if (axis === 'x') { const [ox, oy] = ground(a - w / 2, c, zt); return { O: [ox, oy], U: [HW * w, HH * w], V: [0, 4 * (zt - zb)] }; }
  const [ox, oy] = ground(c, a + w / 2, zt);
  return { O: [ox, oy], U: [HW * w, -HH * w], V: [0, 4 * (zt - zb)] };
}
const rectOf = (P) => { const xs = [P.O[0], P.O[0] + P.U[0], P.O[0] + P.V[0], P.O[0] + P.U[0] + P.V[0]], ys = [P.O[1], P.O[1] + P.U[1], P.O[1] + P.V[1], P.O[1] + P.U[1] + P.V[1]]; return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
/** Draw atlas rect r of img onto face P (canvas origin x0, y0, scale R). */
function onFace(x, img, r, P, x0, y0) {
  const [sx, sy, sw, sh] = r;
  x.setTransform(R * P.U[0] / sw, R * P.U[1] / sw, R * P.V[0] / sh, R * P.V[1] / sh, R * (P.O[0] - x0), R * (P.O[1] - y0));
  x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  x.setTransform(1, 0, 0, 1, 0, 0);
}
const findMeta = (list, id) => list.find((d) => d.id === id);
/** Average colour of an atlas rect (for a window's glow). */
function avgColour(img, r) {
  const c = makeCanvas(8, 8), x = c.getContext('2d'); x.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, 8, 8);
  const d = x.getImageData(0, 0, 8, 8).data; let rr = 0, gg = 0, bb = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { rr += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
  n ||= 1; const k = 255 / Math.max(1, Math.max(rr, gg, bb) / n);
  return `rgb(${Math.round(rr / n * k * 0.9)},${Math.round(gg / n * k * 0.9)},${Math.round(bb / n * k * 0.9)})`;
}

// ------------------------------------------------------------------ banners
/** A banner hung on face slot `s` (layout anchors.banners) as a prop sprite: its height from the cloth's own aspect. */
export function bannerSprite(id, s, standLv) {
  const m = A && findMeta(A.meta.banners, id);
  if (!m) return null;
  const key = 'b|' + id + '|' + s.axis + s.a + s.c + s.z0;
  if (A.cache.has(key)) return A.cache.get(key);
  const [, , rw, rh] = m.r, w = s.w, faceLen = w * Math.hypot(HW, HH), hLv = Math.min(s.z0 - s.z1 + 6, faceLen * (rh / rw) / 4);
  const zt = s.z0, zb = zt - hLv;
  const P = facePlane(s.axis, s.a, s.c + 0.04, w, zt, zb);
  const g = s.axis === 'x' ? ground(s.a, s.c + 0.08, standLv) : ground(s.c + 0.08, s.a, standLv);
  const box = rectOf(P); box[0] -= 6; box[2] += 6; box[3] += 6;
  const spr = spriteCanvas(box, g, (x, x0, y0) => {
    // its shadow on the stone, then the cloth, shaded darker toward its foot and at the edges
    x.globalAlpha = 0.38; x.filter = 'brightness(0)';
    onFace(x, A.banners, m.r, { O: [P.O[0] + 2.5, P.O[1] + 2], U: P.U, V: P.V }, x0, y0);
    x.filter = 'none'; x.globalAlpha = 1;
    onFace(x, A.banners, m.r, P, x0, y0);
    x.globalCompositeOperation = 'source-atop';
    const gr = x.createLinearGradient(0, 0, 0, x.canvas.height);
    gr.addColorStop(0, 'rgba(255,240,210,0.06)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0.34)');
    x.fillStyle = gr; x.fillRect(0, 0, x.canvas.width, x.canvas.height);
    x.globalCompositeOperation = 'source-over';
  });
  A.cache.set(key, spr);
  return spr;
}

// ------------------------------------------------------------------ stained glass
/** The glass atlas with its blood reds turned to Tessariel's emerald and its violets to her azure (the hosts under the
 *  angels were painted in the Fiend's red; nothing of his colour hangs in her hall). Made once. */
function keepGlass() {
  if (A.glassT) return A.glassT;
  const c = makeCanvas(A.glass.width, A.glass.height), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(A.glass, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
    if (ch < 0.12) continue;
    let h = mx === r ? ((g - b) / ch + 6) % 6 : mx === g ? (b - r) / ch + 2 : (r - g) / ch + 4;   // 0..6
    const l = (mx + mn) / 2, sat = ch / (1 - Math.abs(2 * l - 1) + 1e-6);
    // reds (h near 0 / 6) -> emerald (2.55); magentas and violets (4.6..5.6) -> azure (3.75); oranges and golds stay
    const red = h < 0.28 || h > 5.6, vio = h >= 4.55 && h <= 5.6;
    if (!red && !vio) continue;
    const nh = red ? 2.55 : 3.75, nl = red ? l * 0.92 + 0.03 : l, ns = Math.min(1, sat * (red ? 0.8 : 0.9));
    const C = (1 - Math.abs(2 * nl - 1)) * ns, X = C * (1 - Math.abs(nh % 2 - 1)), m = nl - C / 2;
    const [R, G2, B] = nh < 3 ? [0, C, X] : [0, X, C];
    d[i] = (R + m) * 255; d[i + 1] = (G2 + m) * 255; d[i + 2] = (B + m) * 255;
  }
  x.putImageData(im, 0, 0);
  return (A.glassT = c);
}
/** A window's glass laid into its opening (layout anchors.windows), lit from behind; the great window takes two panes. */
export function glassSprite(id, win, standLv) {
  const m = A && findMeta(A.meta.glass, id);
  if (!m) return null;
  const key = 'g|' + id + '|' + win.axis + win.a;
  if (A.cache.has(key)) return A.cache.get(key);
  const panes = win.wide ? 2 : 1, gap = win.wide ? 0.22 : 0, pw = (win.w - gap * (panes - 1)) / panes;
  const g = win.axis === 'x' ? ground(win.a, win.c + 0.1, standLv) : ground(win.c + 0.1, win.a, standLv);
  const all = []; for (let p = 0; p < panes; p++) all.push(facePlane(win.axis, win.a - win.w / 2 + pw / 2 + p * (pw + gap), win.c + 0.02, pw, win.z1 + 1.2, win.z0 - 0.2));
  const boxes = all.map(rectOf), box = [Math.min(...boxes.map((b) => b[0])) - 18, Math.min(...boxes.map((b) => b[1])) - 18, Math.max(...boxes.map((b) => b[2])) + 18, Math.max(...boxes.map((b) => b[3])) + 18];
  const G = keepGlass(), col = avgColour(G, m.r);
  const spr = spriteCanvas(box, g, (x, x0, y0) => {
    // a soft bloom of the glass's colour round the opening, the glass, then the glass again added for its light
    const cx = ((box[0] + box[2]) / 2 - x0) * R, cy = ((box[1] + box[3]) / 2 - y0) * R;
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.22;
    x.drawImage(glowSprite(col), cx - (box[2] - box[0]) * R * 0.62, cy - (box[3] - box[1]) * R * 0.6, (box[2] - box[0]) * R * 1.24, (box[3] - box[1]) * R * 1.2);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    for (const P of all) onFace(x, G, m.r, P, x0, y0);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.28;
    for (const P of all) onFace(x, G, m.r, P, x0, y0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  });
  spr.glow = col;
  A.cache.set(key, spr);
  return spr;
}

// ------------------------------------------------------------------ rugs
/** A runner laid on rect [x0, y0, x1, y1] (tiles) at level lv: one canvas in world px, gold-bordered, tiled with the
 *  weave one repeat a tile. The floor draws it tile by tile, each clipped to its own diamond. */
export function rugCanvas(id, rect) {
  const m = A && findMeta(A.meta.rugs, id);
  if (!m) return null;
  const key = 'r|' + id + '|' + rect.x0 + rect.y0 + rect.x1 + rect.y1;
  if (A.cache.has(key)) return A.cache.get(key);
  const { x0, y0, x1, y1 } = rect, z = rect.z || 0;
  const pts = [ground(x0, y0, z), ground(x1, y0, z), ground(x1, y1, z), ground(x0, y1, z)];
  const bx0 = Math.floor(Math.min(...pts.map((p) => p[0]))) - 2, by0 = Math.floor(Math.min(...pts.map((p) => p[1]))) - 2;
  const bx1 = Math.ceil(Math.max(...pts.map((p) => p[0]))) + 2, by1 = Math.ceil(Math.max(...pts.map((p) => p[1]))) + 2;
  const c = makeCanvas((bx1 - bx0) * R, (by1 - by0) * R), x = c.getContext('2d');
  // the weave: pattern space (u, v) in tiles -> world px, one 192 px swatch per tile
  const sw = makeCanvas(m.r[2], m.r[3]); sw.getContext('2d').drawImage(A.rugs, m.r[0], m.r[1], m.r[2], m.r[3], 0, 0, m.r[2], m.r[3]);
  const pat = x.createPattern(sw, 'repeat'), s = 1 / m.r[2];
  pat.setTransform(new DOMMatrix([HW * s * R, HH * s * R, -HW * s * R, HH * s * R, (pts[0][0] - bx0) * R, (pts[0][1] - by0) * R]));
  const poly = (inset) => {
    const q = [ground(x0 + inset, y0 + inset, z), ground(x1 - inset, y0 + inset, z), ground(x1 - inset, y1 - inset, z), ground(x0 + inset, y1 - inset, z)];
    x.beginPath(); q.forEach(([px, py], i) => (i ? x.lineTo((px - bx0) * R, (py - by0) * R) : x.moveTo((px - bx0) * R, (py - by0) * R))); x.closePath();
  };
  x.fillStyle = 'rgba(0,0,0,0.35)'; poly(-0.05); x.fill();
  x.filter = id.startsWith('gold') ? 'brightness(1.05) saturate(0.85)' : 'brightness(1.4) saturate(1.1)';   // (the gold weave is bright already: a deep old gold, not orange)   // the weaves are dark swatches: lifted, a blue runner reads as blue on the floor
  x.fillStyle = pat; poly(0.02); x.fill();
  x.filter = 'none';
  // a gilt border: a broad band, a bright line in it, a fine line inside; a dark edge where the rug lies on the stone
  x.lineJoin = 'miter';
  x.lineWidth = 3.4 * R; x.strokeStyle = '#8a6a2c'; poly(0.16); x.stroke();
  x.lineWidth = 1.5 * R; x.strokeStyle = '#f0d488'; poly(0.16); x.stroke();
  x.lineWidth = 0.7 * R; x.strokeStyle = 'rgba(240,212,136,0.75)'; poly(0.34); x.stroke();
  x.lineWidth = 1 * R; x.strokeStyle = 'rgba(30,20,8,0.6)'; poly(0.03); x.stroke();
  const out = { img: c, x0: bx0, y0: by0, w: bx1 - bx0, h: by1 - by0, rect };
  A.cache.set(key, out);
  return out;
}
/** Draw the part of rug r over tile (tx, ty) at its level: the rug clipped to that tile's diamond. */
export function drawRugTile(ctx, r, tx, ty, lv) {
  const [px, py] = ground(tx, ty, lv);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(px, py - 0.3); ctx.lineTo(px + HW + 0.3, py + HH); ctx.lineTo(px, py + 2 * HH + 0.3); ctx.lineTo(px - HW - 0.3, py + HH); ctx.closePath(); ctx.clip();
  ctx.drawImage(r.img, r.x0, r.y0, r.w, r.h);
  ctx.restore();
}

// ------------------------------------------------------------------ trophies and furniture
/** A trophy's baked sprite (data/keepart.js art id), as a prop sprite record and its k. */
export function trophySprite(art) { return bakedSprite('trophy_' + art); }
/** A sprite of the bake by name, as a prop sprite record and its k. */
export function bakedSprite(name) {
  const st = castle3dState(), S = st && st.sprites && st.sprites[name];
  if (!S) return null;
  const [pg, sx, sy, w, h, ox, oy] = S.f[0];
  return { spr: { img: st.imgs[pg], sx, sy, w, h, ox: ox * S.S, oy: oy * S.S }, k: 1 / S.S };
}
/** A painted Castle Keep prop by name (assets/tiles/castle_keep/pack.json scatter), at the packs' scale. */
export function keepProp(name) {
  const s = A && A.pack.scatter.find((q) => q.name === name);
  if (!s) return null;
  return { spr: { img: A.scat, sx: s.x, sy: s.y, w: s.w, h: s.h, ox: s.ox, oy: s.oy }, k: 64 / A.pack.tile[0] };
}

// ------------------------------------------------------------------ fire: the Sacred Flame, braziers, candles
const FIRE = {
  sacred: { out: ['#35d24c', '#0f6a2c'], mid: ['#d6ff84', '#3fe050'], core: ['#fffbe6', '#ffe27a'], glow: '#7dff5a', spark: ['#b8ff70', '#fff4b0'] },
  ember: { out: ['#f0701c', '#8a2408'], mid: ['#ffc848', '#f0781c'], core: ['#fff6d0', '#ffd860'], glow: '#ff9a40', spark: ['#ffb050', '#fff0b0'] },
};
/** One tongue of flame from base (x, y), half-width w, height h: both edges ripple upward and the tip sways. */
function tongue(ctx, x, y, w, h, t, ph) {
  const N = 9;
  ctx.beginPath(); ctx.moveTo(x - w, y);
  for (let side = -1; side <= 1; side += 2) for (let k = 1; k <= N; k++) {
    const q = side < 0 ? k / N : 1 - k / N, prof = (q < 0.18 ? 0.8 + q / 0.18 * 0.2 : Math.pow((1 - q) / 0.82, 0.78)) * (1 + 0.2 * Math.sin(q * 8 - t * 9 + ph + side));
    const sway = Math.sin(t * 2.6 + ph + q * 2.4) * q * w * 0.9 + Math.sin(t * 6.1 + ph * 2 + q * 5) * q * w * 0.32;
    ctx.lineTo(x + sway + side * w * prof, y - q * h);
  }
  ctx.closePath(); ctx.fill();
}
/** A fire standing on (x, y): h tall, w its base's half-width; pal 'sacred' (Tessariel's green, a gold heart) or 'ember'. */
export function drawFire(ctx, x, y, t, h, w, pal = 'sacred', seed = 0, sparks = 0) {
  const P = FIRE[pal], grad = (c, top) => { const g = ctx.createLinearGradient(0, y, 0, y - top); g.addColorStop(0, c[0]); g.addColorStop(0.7, c[1]); g.addColorStop(1, c[1] + '66'); return g; };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3 + Math.sin(t * 3.1 + seed) * 0.05;
  ctx.drawImage(glowSprite(P.glow), x - w * 4.2, y - h * 1.25, w * 8.4, h * 1.55);
  ctx.globalCompositeOperation = 'source-over';
  const layer = (n, spread, hk, wk, c, a, off) => {
    ctx.fillStyle = grad(c, h * hk * 1.08); ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) * 2 - 1 : 0, ph = seed + off + i * 2.39;
      tongue(ctx, x + u * w * spread, y, w * wk * (1 - Math.abs(u) * 0.25), h * hk * (1 - Math.abs(u) * 0.42) * (0.9 + 0.1 * Math.sin(t * 5.3 + ph * 1.7)), t, ph);
    }
  };
  layer(5, 0.6, 1, 0.62, P.out, 0.96, 0);
  layer(4, 0.42, 0.78, 0.46, P.mid, 0.97, 1.3);
  layer(3, 0.22, 0.52, 0.36, P.core, 1, 2.1);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(glowSprite(P.core[1]), x - w * 1.5, y - h * 0.5, w * 3, h * 0.6);
  for (let i = 0; i < sparks; i++) {   // sparks rising off it, curling as they go
    const f = (t * (0.22 + (i % 5) * 0.03) + i * 0.618 + seed) % 1, a = i * 2.39 + seed, r = 1 + (i % 3 === 0);
    ctx.globalAlpha = (1 - f) * (1 - f) * 0.95;
    ctx.fillStyle = P.spark[i % 3 ? 0 : 1];
    ctx.fillRect(x + Math.sin(a + t * 1.3 + f * 4) * (w * 0.5 + f * w * 1.6), y - h * (0.3 + f * 1.25), r, r);
  }
  ctx.restore();
}
// ---- the Sacred Flame as pixel art: a fire field on a coarse grid (2 world px a cell), six flat steps of colour from
// a dark green rim to a pale heart, its edges broken by noise that scrolls upward and dithered where the steps meet.
// Its foot is round: below the coals' line it closes in the half of a flat ellipse (a disc of fire on the coals seen
// from the game's camera, 2:1), sunk in the bowl, so the brazier's near rim and blades drawn after cut across it.
const NOISE = (() => { const n = new Float32Array(4096); let s = 90210; for (let i = 0; i < 4096; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; n[i] = s / 4294967296; } return n; })();
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = NOISE[((yi & 63) << 6) | (xi & 63)], b = NOISE[((yi & 63) << 6) | ((xi + 1) & 63)], c = NOISE[(((yi + 1) & 63) << 6) | (xi & 63)], d = NOISE[(((yi + 1) & 63) << 6) | ((xi + 1) & 63)];
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
// FW x FH cells over the coals' line, FB under it for the rounded foot
const FW = 54, FH = 72, FB = 12, SACRED = [[6, 52, 28, 215], [12, 104, 42, 255], [34, 178, 64, 255], [112, 234, 86, 255], [206, 255, 128, 255], [255, 252, 216, 255]];
let fireCv = null, fireImg = null;
/** The fire, its foot's middle on the coals at (x, y); k its size. Its foot stays inside the bowl as it grows. */
function drawPixelFire(ctx, x, y, t, k) {
  if (!fireCv) { fireCv = makeCanvas(FW, FH + FB); fireImg = fireCv.getContext('2d').createImageData(FW, FH + FB); }
  const d = fireImg.data;
  // the foot's half-width (u: a fraction of FW) and its half-height under the line (h: a fraction of FH), 2:1 on screen
  const w0 = 0.273 * Math.min(1, 1.3 / k), e0 = w0 * FW / 2 / FH;
  for (let py = 0; py < FH + FB; py++) {
    const h = (FH - 1 - py) / FH, hh = Math.max(0, h);
    const w = h < 0 ? w0 : h < 0.12 ? w0 + (0.44 - w0) * h / 0.12 : Math.pow((1 - h) / 0.88, 0.9) * 0.44, sway = (noise(h * 3.2 + t * 0.9, 7.3) - 0.5) * 0.3 * hh;
    for (let px = 0; px < FW; px++) {
      const o = (py * FW + px) * 4, u = (px + 0.5) / FW - 0.5, a = Math.abs(u - sway) / (w + 0.001);
      const q = h < 0 ? Math.hypot(a, h / e0) : a;   // under the line: out from the foot's middle, round
      let I = 0;
      if (q < 1.3) {
        const n = noise(px * 0.17, py * 0.12 + t * 5.4) * 0.62 + noise(px * 0.39 + 11, py * 0.27 + t * 9.5) * 0.38;
        I = (1 - q) * (1.2 - hh * 0.78) + (n - 0.5) * (h < 0 ? 0.3 : 0.42 + h * 1.05) + ((px + py) & 1) * 0.045;
      }
      const i = I < 0.17 ? -1 : I < 0.31 ? 0 : I < 0.46 ? 1 : I < 0.63 ? 2 : I < 0.82 ? 3 : I < 1.0 ? 4 : 5;
      if (i < 0) { d[o + 3] = 0; continue; }
      const c = SACRED[i]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3];
    }
  }
  fireCv.getContext('2d').putImageData(fireImg, 0, 0);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fireCv, x - FW * k, y - FH * 2 * k, FW * 2 * k, (FH + FB) * 2 * k);
  ctx.imageSmoothingEnabled = sm;
  // embers: square sparks torn off the tips, rising and drifting
  for (let i = 0; i < 22; i++) {
    const f = (t * (0.2 + (i % 5) * 0.035) + i * 0.618) % 1, a = i * 2.39, s = i % 4 === 0 ? 3 : 2;
    ctx.globalAlpha = (1 - f) * (1 - f);
    ctx.fillStyle = i % 3 ? '#b8ff70' : '#fff4b0';
    ctx.fillRect(Math.round(x + Math.sin(a + t * 1.2 + f * 5) * (10 + f * 30) * k), Math.round(y - (64 + f * 140) * k), s, s);
  }
  ctx.globalAlpha = 1;
}
/** Tessariel's green fire over the basin, a gold heart in it. x, y: the rim's centre (world px); k: its size. `front`
 *  draws what stands nearer than the fire (the brazier's near rim and blades: drawBrazierFront), over the fire and the
 *  far motes, under the near ones. */
export function drawSacredFlame(ctx, x, y, t, k = 1, front = null) {
  // a pale pillar of its light going up into the vault, the fire (its foot on the coals, a level under the rim), then
  // motes circling the crown: the far ones dim and behind the brazier's near blades, the near ones bright and in front
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y, 0, y - 260 * k);
  g.addColorStop(0, 'rgba(150,255,120,0.20)'); g.addColorStop(0.5, 'rgba(150,255,120,0.07)'); g.addColorStop(1, 'rgba(150,255,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 16 * k, y); ctx.lineTo(x - 30 * k, y - 260 * k); ctx.lineTo(x + 30 * k, y - 260 * k); ctx.lineTo(x + 16 * k, y); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.26 + Math.sin(t * 3.1) * 0.04;
  ctx.drawImage(glowSprite('#7dff5a'), x - 80 * k, y - 170 * k, 160 * k, 200 * k); ctx.restore();
  drawPixelFire(ctx, x, y + 4, t, k);
  const motes = (far) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const a = t * (i % 2 ? 0.9 : -0.6) + i * TAU / 12, r = i % 2 ? 44 : 34, lift = 14 + (i % 3) * 16 + Math.sin(t * 1.3 + i) * 4;
      if ((Math.sin(a) < 0) !== far) continue;
      ctx.globalAlpha = (far ? 0.3 : 0.9) * (0.7 + 0.3 * Math.sin(t * 3 + i * 1.7));
      ctx.drawImage(glowSprite(i % 3 ? '#b8ff70' : '#fff0a0'), x + Math.cos(a) * r * k - 5, y - lift * k + Math.sin(a) * r * 0.45 * k - 5, 10, 10);
    }
    ctx.restore();
  };
  motes(true);
  if (front) front(ctx);
  motes(false);
}
// ---- the brazier's near half over the fire: the baked pieces' own pixels under the mask tools/tkeep3d.html bakeFront
// makes (assets/tiles/tkeep/brazier_front.json), so they lie exactly on the hall drawn under them
/** The brazier's stem, bowl, rim, runes and the near blades of its crown as the bake drew them, nearer the camera than
 *  the fire: { img, x, y, w, h } in world px (absolute, like the pieces). Made once from the loaded pieces, a raster
 *  sprite where those are on (drawn every frame: a plain canvas would go up to the GPU again each time). */
export function brazierFront() {
  const F = A && A.front, st = F && castle3dState();
  if (!st || st.dir !== KEEP_DIR || st.S !== F.S) return null;   // (a bake at another scale than the mask's: none)
  if (A.cache.has('front')) return A.cache.get('front');
  const c = rasterCanvas(F.w, F.h, st.imgs[0]), x = c.getContext('2d'), W = st.idx.W;
  for (const tile of F.tiles) for (const id of [st.base.get(tile), st.over.get(tile)]) {
    if (id === undefined) continue;
    const [pg, sx, sy, w, h, ox, oy] = st.pieces[id], tx = tile % W, ty = (tile / W) | 0;
    x.drawImage(st.imgs[pg], sx, sy, w, h, Math.round((ox + (tx - ty) * HW) * st.S) - F.x, Math.round((oy + (tx + ty) * HH) * st.S) - F.y, w, h);
  }
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(F.img, 0, 0);
  const out = { img: frozen(c), x: F.x / st.S, y: F.y / st.S, w: F.w / st.S, h: F.h / st.S };
  A.cache.set('front', out);
  return out;
}
/** Draw the brazier's near half (brazierFront) where the hall's pieces put it. */
export function drawBrazierFront(ctx) {
  const f = brazierFront();
  if (f) ctx.drawImage(f.img, f.x, f.y, f.w, f.h);
}
/** A candle's flame at (x, y), its tip up. */
export function drawCandle(ctx, x, y, t, seed = 0) {
  const f = Math.sin(t * 11 + seed * 3) * 0.5 + Math.sin(t * 17 + seed) * 0.3;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 + f * 0.1;
  ctx.drawImage(glowSprite('#ffb050'), x - 13, y - 16, 26, 26);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#ff9a30'; ctx.beginPath(); ctx.ellipse(x, y - 2.6 - f * 0.5, 1.5, 3.2 + f * 0.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff0a8'; ctx.beginPath(); ctx.ellipse(x, y - 1.8, 0.8, 1.7, 0, 0, TAU); ctx.fill();
}
/** The baked chandelier as a prop sprite, and where its candles burn (world px off its ground point). */
export function chandelierSprite() { const r = bakedSprite('chandelier'); return r && { ...r, candles: castle3dState().idx.candles || [] }; }
/** A faint grey shade of a trophy's sprite: the Elder not yet carved on its plinth. */
export function ghostSprite(art) {
  const r = trophySprite(art);
  if (!r) return null;
  const key = 'ghost|' + art;
  if (A.cache.has(key)) return A.cache.get(key);
  const s = r.spr, c = makeCanvas(s.w, s.h), x = c.getContext('2d');
  // a statue of grey stone, not yet carved fine: the sprite without its colour, its shading kept, a cool stone tint
  x.filter = 'grayscale(1) contrast(0.8) brightness(1.25)'; x.drawImage(s.img, s.sx, s.sy, s.w, s.h, 0, 0, s.w, s.h); x.filter = 'none';
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(120,128,140,0.28)'; x.fillRect(0, 0, s.w, s.h);
  const out = { spr: { img: c, sx: 0, sy: 0, w: s.w, h: s.h, ox: s.ox, oy: s.oy }, k: r.k };
  A.cache.set(key, out);
  return out;
}

// ------------------------------------------------------------------ the windows' light
/** Shafts of coloured light from the windows down into the hall, laid over everything very faintly (lighter). */
export function drawLightShafts(ctx, world, t) {
  const w = world.keepWindows;
  if (!w || G.settings?.reduceFlashing) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of w) {
    if (!s.glow) continue;
    const a = 0.1 + 0.025 * Math.sin(t * 0.6 + s.phase);
    for (const q of s.shaft) {
      const gr = ctx.createLinearGradient(q[0][0], q[0][1], q[2][0], q[2][1]);
      gr.addColorStop(0, s.glow.replace('rgb', 'rgba').replace(')', `,${a})`)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); q.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
      // dust in the light: a few motes drifting down each shaft
      ctx.fillStyle = '#fff6d8';
      for (let i = 0; i < 7; i++) {
        const u = 0.12 + 0.76 * ((i * 0.381 + s.phase * 0.17 + Math.sin(t * 0.21 + i * 1.9) * 0.06) % 1), v = (t * (0.018 + (i % 3) * 0.007) + i * 0.23 + s.phase) % 1;
        const ax = q[0][0] + (q[1][0] - q[0][0]) * u, ay = q[0][1] + (q[1][1] - q[0][1]) * u, bx = q[3][0] + (q[2][0] - q[3][0]) * u, by = q[3][1] + (q[2][1] - q[3][1]) * u;
        ctx.globalAlpha = Math.sin(v * Math.PI) * (0.35 + 0.25 * Math.sin(t * 1.7 + i * 2.1));
        ctx.fillRect(ax + (bx - ax) * v + Math.sin(t * 0.7 + i) * 3, ay + (by - ay) * v, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
/** The shaft polygons (world px) of a window: the opening's foot swept down and out along the light. */
export function windowShaft(win) {
  // the light comes into the hall: +y off the north wall, +x off the west; s along the wall, d out from it
  const hw = win.w / 2 * 0.8, reach = 9, drop = win.z0 + 4;
  const P = (s, d, lv) => (win.axis === 'x' ? ground(win.a + s, win.c + d, lv) : ground(win.c + d, win.a + s, lv));
  return [[P(-hw, 0.1, win.z1 - 6), P(hw, 0.1, win.z1 - 6), P(hw * 1.3, reach, Math.max(0, win.z0 - drop)), P(-hw * 1.3, reach, Math.max(0, win.z0 - drop))]];
}
export { clamp, TAU };
