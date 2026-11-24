// TESSARIEL'S KEEP's art (docs/TESSARIELS_KEEP.md): the baked hall (assets/tiles/tkeep/, gfx/castle3dart.js loadBaked)
// and what the hero hangs in it: banners and stained glass laid onto the wall planes (one canvas each, made once, an
// ordinary prop sprite after that, so the depth sort and the Castle's occlusion treat them like any other prop), rugs
// drawn into the floor tile by tile (world/keepworld.js dressTile), the trophies' baked sprites, the Castle Keep pack's
// painted furniture, the Sacred Flame and the windows' light.
import { G } from '../state.js';
import { makeCanvas, clamp, TAU } from '../core/util.js';
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
  if (A) return Promise.resolve(A);
  if (loading) return loading;
  loading = Promise.all([
    loadBaked(KEEP_DIR),
    fetch(DECOR_DIR + 'decor.json').then((r) => r.json()),
    loadImg(DECOR_DIR + 'banners.webp'), loadImg(DECOR_DIR + 'glass.webp'), loadImg(DECOR_DIR + 'rugs.webp'),
    loadImg('assets/tiles/castle_keep/scatter.webp'), fetch('assets/tiles/castle_keep/pack.json').then((r) => r.json()),
  ]).then(([baked, meta, banners, glass, rugs, scat, pack]) => {
    A = { baked, meta, banners, glass, rugs, scat, pack, cache: new Map() };
    return A;
  }).catch((e) => { loading = null; throw e; });
  return loading;
}
export const keepArt = () => A;
/** Let the canvases go when the hero leaves (the baked pages go with releaseCastle3D). */
export function releaseKeepArt() { if (A) A.cache.clear(); }

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
  const col = avgColour(A.glass, m.r);
  const spr = spriteCanvas(box, g, (x, x0, y0) => {
    // a soft bloom of the glass's colour round the opening, the glass, then the glass again added for its light
    const cx = ((box[0] + box[2]) / 2 - x0) * R, cy = ((box[1] + box[3]) / 2 - y0) * R;
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.22;
    x.drawImage(glowSprite(col), cx - (box[2] - box[0]) * R * 0.62, cy - (box[3] - box[1]) * R * 0.6, (box[2] - box[0]) * R * 1.24, (box[3] - box[1]) * R * 1.2);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    for (const P of all) onFace(x, A.glass, m.r, P, x0, y0);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.28;
    for (const P of all) onFace(x, A.glass, m.r, P, x0, y0);
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
  x.fillStyle = pat; poly(0.02); x.fill();
  x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(70,64,52,0.9)'; poly(0.02); x.fill(); x.globalCompositeOperation = 'source-over';   // lifts the dark weaves, so a blue runner reads as blue on the floor
  x.lineWidth = 2.2 * R; x.strokeStyle = '#a8843c'; poly(0.13); x.stroke();
  x.lineWidth = 0.8 * R; x.strokeStyle = '#e8cc7a'; poly(0.13); x.stroke();
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
export function trophySprite(art) {
  const st = castle3dState(), S = st && st.sprites && st.sprites['trophy_' + art];
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

// ------------------------------------------------------------------ the Sacred Flame
/** Tessariel's green fire over the basin: tongues of flame, embers rising, a pale core. x, y: the rim's centre (world px). */
export function drawSacredFlame(ctx, x, y, t, k = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.42 + Math.sin(t * 3.1) * 0.06;
  ctx.drawImage(glowSprite('#7dff5a'), x - 80 * k, y - 140 * k, 160 * k, 170 * k);
  ctx.globalCompositeOperation = 'source-over';
  // the tongues: layered teardrops, deep green outside, bright green, then gold-white within; drawn solid so they read
  const tongue = (dx, h, w, col, ph, a) => {
    const sway = Math.sin(t * 5.2 + ph) * 4 * k, top = y - h * k * (0.84 + 0.16 * Math.sin(t * 7.3 + ph * 2));
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(x + (dx - w) * k, y);
    ctx.bezierCurveTo(x + (dx - w * 1.1) * k, y - h * k * 0.35, x + (dx - w * 0.3) * k + sway * 0.5, y - h * k * 0.7, x + dx * k + sway, top);
    ctx.bezierCurveTo(x + (dx + w * 0.3) * k + sway * 0.5, y - h * k * 0.7, x + (dx + w * 1.1) * k, y - h * k * 0.35, x + (dx + w) * k, y);
    ctx.closePath(); ctx.fill();
  };
  for (let i = 0; i < 7; i++) tongue((i - 3) * 6, 44 + Math.abs(3 - i) * -5 + (i % 2) * 8, 8, '#1f8a34', i * 1.7, 0.85);
  for (let i = 0; i < 5; i++) tongue((i - 2) * 5, 40 + (i === 2 ? 14 : 0) - Math.abs(2 - i) * 4, 6.5, '#45d84a', i * 2.3 + 1, 0.9);
  for (let i = 0; i < 3; i++) tongue((i - 1) * 4, 30 + (i === 1 ? 10 : 0), 4.5, '#b8ff70', i * 1.3 + 2, 0.95);
  tongue(0, 24, 3.2, '#fbffd8', 0.6, 1);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45;
  ctx.drawImage(glowSprite('#e8ffb0'), x - 22 * k, y - 50 * k, 44 * k, 52 * k);
  // embers rising from it
  for (let i = 0; i < 18; i++) {
    const f = (t * 0.32 + i / 18) % 1, a = i * 2.39;
    ctx.globalAlpha = (1 - f) * 0.95;
    ctx.fillStyle = i % 3 ? '#b8ff70' : '#fff4b0';
    ctx.fillRect(x + Math.sin(a + t * 1.3) * (10 + f * 16) * k, y - (18 + f * 110) * k, 2 * k, 2 * k);
  }
  ctx.restore();
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
    const a = 0.06 + 0.02 * Math.sin(t * 0.6 + s.phase);
    for (const q of s.shaft) {
      const gr = ctx.createLinearGradient(q[0][0], q[0][1], q[2][0], q[2][1]);
      gr.addColorStop(0, s.glow.replace('rgb', 'rgba').replace(')', `,${a})`)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); q.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
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
