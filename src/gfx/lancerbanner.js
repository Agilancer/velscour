// The Lancer's war banner as cloth: a verlet grid pinned to the crossbar of a pole on his back, dragged by his
// movement (air drag, inertia, a flutter that grows with speed) and drawn as textured triangles from the skin.
// Art (replace the PNGs, keep the sizes; templates and specs in docs/art_kits/lancer_banner/):
//   banner_skin.png  48x96 texels = 24x48 world px, 2 texels per px. Its alpha is the cloth's silhouette;
//                    the top edge wraps the crossbar. Any 1:2 image works, it is stretched to the cloth.
//   banner_pole.png  64x200 texels = 32x100 world px. Anchor: bottom centre = the shoulder mount;
//                    the cloth hangs from the crossbar line 24 texels from the top, texels x 8..56.
// Physics frame, in world px: a = screen right, b = toward the camera along the ground, h = up.
// Projection: screen x = a, screen y = b / 2 - h (so a ground tile (x, y) is a = (x - y) * 32, b = (x + y) * 32).
import { elevationAt } from '../core/view.js';

export const BANNER_SKIN = 'assets/fx/lancer/banner_skin.png';
export const BANNER_POLE = 'assets/fx/lancer/banner_pole.png';
export const BANNER = Object.freeze({
  texel: 2,                       // texels per world px for both images
  skin: { w: 48, h: 96 },         // texels; world 24 x 48
  pole: { w: 64, h: 200, ax: 32, ay: 200, barY: 24, clothX0: 8, clothX1: 56 },
  cols: 5, rows: 9,               // mesh nodes: 4 x 8 quads, grid lines every 12 texels in the skin
  mount: 26, back: 4,             // the pole rises 26 px above his feet, 4 px behind his centre
});
const C = BANNER.cols, R = BANNER.rows, T = BANNER.texel, PO = BANNER.pole;
const CW = BANNER.skin.w / T, CH = BANNER.skin.h / T;           // cloth size in world px
const BAR = (PO.ay - PO.barY) / T;                              // crossbar height above the mount
const GRAV = 900, DRAG = 2.6, STEP = 1 / 60, ITER = 6, VIEW = [0, 2 / Math.sqrt(5), 1 / Math.sqrt(5)];
const LIGHT = (() => { const l = [-0.5, 0.6, 0.8], n = Math.hypot(...l); return l.map((v) => v / n); })();

const art = { skin: null, pole: null, roll: '#1c3470' };
function load(src, key) {
  if (art[key] || typeof Image === 'undefined') return;
  const im = new Image(), rec = (art[key] = { im, ok: false });
  im.onload = () => { rec.ok = im.naturalWidth > 0; if (key === 'skin') art.roll = rollColor(im); };
  im.src = src;
}
/** The rolled-up part of the banner: the skin's average opaque colour, darkened. */
function rollColor(im) {
  try {
    const c = document.createElement('canvas'); c.width = 12; c.height = 24;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0, 12, 24);
    const d = g.getImageData(0, 0, 12, 24).data; let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    if (n) return `rgb(${(r / n * 0.6) | 0},${(gg / n * 0.6) | 0},${(b / n * 0.6) | 0})`;
  } catch (e) { /* tainted or no canvas: keep the default */ }
  return art.roll;
}
export function preloadBanner() { load(BANNER_SKIN, 'skin'); load(BANNER_POLE, 'pole'); return art; }

/** The pole's shoulder mount in physics space. */
function mount(p) {
  const sc = p.scale || 1;
  return [(p.x - p.y) * 32, (p.x + p.y) * 32 - BANNER.back * sc, elevationAt(p.x, p.y) + (p.z || 0) + BANNER.mount * sc, sc];
}
/** Where crossbar node i sits, for a pole leaning th radians (screen clockwise). */
function pin(m, th, i, out) {
  const dx = (i / (C - 1) - 0.5) * CW * m[3], up = BAR * m[3], cs = Math.cos(th), sn = Math.sin(th);
  out[0] = m[0] + dx * cs + up * sn; out[1] = m[1] + 1.5 * m[3]; out[2] = m[2] + up * cs - dx * sn;
  return out;
}

function build(p, unf) {
  const m = mount(p), n = C * R, pos = new Float64Array(n * 3), old = new Float64Array(n * 3), q = [0, 0, 0];
  const cl = { pos, old, m, pm: m.slice(), th: 0, om: 0, va: 0, vb: 0, acc: 0, t: 0, unf, links: [], speed: 0 };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    pin(m, 0, c, q); const k = (r * C + c) * 3;
    pos[k] = old[k] = q[0]; pos[k + 1] = old[k + 1] = q[1]; pos[k + 2] = old[k + 2] = q[2] - (r / (R - 1)) * CH * m[3] * unf;
  }
  const L = (i, j, kind, st) => cl.links.push([i, j, kind, st]); // kind: 0 across, 1 down, 2 diagonal, 3 bend across, 4 bend down
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const i = r * C + c;
    if (c < C - 1) L(i, i + 1, 0, 1);
    if (r < R - 1) L(i, i + C, 1, 1);
    if (c < C - 1 && r < R - 1) { L(i, i + C + 1, 2, 0.3); L(i + 1, i + C, 2, 0.3); }
    if (c < C - 2) L(i, i + 2, 3, 0.25);
    if (r < R - 2) L(i, i + 2 * C, 4, 0.25);
  }
  return cl;
}
function rest(cl, kind) {
  const sw = CW * cl.m[3] / (C - 1), sh = CH * cl.m[3] / (R - 1) * cl.unf;
  return kind === 0 ? sw : kind === 1 ? sh : kind === 2 ? Math.hypot(sw, sh) : kind === 3 ? sw * 2 : sh * 2;
}

/** Advance the banner: f = how unfurled (0..1, Valor), blaze = full Valor (a harder flutter). */
export function stepBanner(p, s, dt, f, blaze) {
  const target = 0.18 + 0.82 * f;
  let cl = s.cloth;
  if (!cl || cl.world !== p.world) { cl = s.cloth = build(p, target); cl.world = p.world; }
  const m = mount(p), jump = Math.hypot(m[0] - cl.m[0], m[1] - cl.m[1], m[2] - cl.m[2]);
  if (jump > 80 * m[3] || m[3] !== cl.m[3]) { s.cloth = null; return stepBanner(p, s, dt, f, blaze); } // a portal or a blink: hang it fresh
  if (dt > 0) { // his ground velocity, smoothed, and the pole's lean (a spring driven by his acceleration)
    const va = (m[0] - cl.m[0]) / dt, vb = (m[1] - cl.m[1]) / dt, k = Math.min(1, dt * 12), ova = cl.va;
    cl.va += (va - cl.va) * k; cl.vb += (vb - cl.vb) * k;
    const acc = (cl.va - ova) / dt;
    cl.om += (-90 * cl.th - 9 * cl.om - acc * 0.0009) * dt; cl.th = Math.max(-0.14, Math.min(0.14, cl.th + cl.om * dt));
  }
  cl.unf += (target - cl.unf) * Math.min(1, dt * 3);
  cl.pm = cl.m; cl.m = m; cl.acc = Math.min(cl.acc + dt, STEP * 4);
  const { pos, old, links } = cl, sp = Math.hypot(cl.va, cl.vb); cl.speed = sp;
  const pa = [0, 0, 0], pb = [0, 0, 0];
  const flut = (blaze ? 260 : 70) + sp * 1.1, freq = blaze ? 11 : 6 + sp * 0.02;
  const pa_ = sp > 20 ? -cl.vb / sp : 0, pb_ = sp > 20 ? cl.va / sp : 1; // flutter across his motion, or toward the camera
  const ceil = m[2] + (BAR + 10) * m[3], hr = 8 * m[3], hh = m[2] - BANNER.mount * m[3] + (p.spriteH || 60) * m[3] - 2, cx = m[0], cy = m[1] + BANNER.back * m[3];
  const floor = m[2] - BANNER.mount * m[3] + 2;
  let n = 0;
  while (cl.acc >= STEP && n++ < 4) {
    cl.acc -= STEP; cl.t += STEP;
    const u = Math.min(1, (n * STEP) / Math.max(dt, STEP)), mm = [0, 1, 2, 3].map((i) => cl.pm[i] + (m[i] - cl.pm[i]) * u);
    mm[3] = m[3];
    for (let i = C; i < C * R; i++) { // free nodes: verlet with gravity, air drag and flutter
      const k = i * 3, r = (i / C) | 0, c = i % C, w = r / (R - 1);
      const vx = (pos[k] - old[k]) / STEP, vy = (pos[k + 1] - old[k + 1]) / STEP, vz = (pos[k + 2] - old[k + 2]) / STEP;
      const wave = Math.sin(cl.t * freq - r * 0.8 + c * 0.5) * flut * w;
      const ax = -DRAG * vx + wave * pa_, ay = -DRAG * vy + wave * pb_, az = -GRAV - DRAG * vz;
      old[k] = pos[k]; old[k + 1] = pos[k + 1]; old[k + 2] = pos[k + 2];
      pos[k] += vx * STEP * 0.995 + ax * STEP * STEP; pos[k + 1] += vy * STEP * 0.995 + ay * STEP * STEP; pos[k + 2] += vz * STEP * 0.995 + az * STEP * STEP;
    }
    for (let c = 0; c < C; c++) { pin(mm, cl.th, c, pa); const k = c * 3; old[k] = pos[k]; old[k + 1] = pos[k + 1]; old[k + 2] = pos[k + 2]; pos[k] = pa[0]; pos[k + 1] = pa[1]; pos[k + 2] = pa[2]; }
    for (let it = 0; it < ITER; it++) {
      for (const [i, j, kind, st] of links) {
        const a = i * 3, b = j * 3, dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const d = Math.hypot(dx, dy, dz) || 1e-6, wi = i < C ? 0 : 1, wj = j < C ? 0 : 1, ws = wi + wj;
        if (!ws) continue;
        const g = ((d - rest(cl, kind)) / d) * st / ws;
        pos[a] += dx * g * wi; pos[a + 1] += dy * g * wi; pos[a + 2] += dz * g * wi;
        pos[b] -= dx * g * wj; pos[b + 1] -= dy * g * wj; pos[b + 2] -= dz * g * wj;
      }
      for (let i = C; i < C * R; i++) { // keep out of his head and shoulders, and off the ground
        const k = i * 3;
        if (pos[k + 2] < hh) { const dx = pos[k] - cx, dy = pos[k + 1] - cy, d = Math.hypot(dx, dy); if (d < hr) { const e = d > 1e-3 ? hr / d : 0; if (e) { pos[k] = cx + dx * e; pos[k + 1] = cy + dy * e; } else pos[k + 1] = cy - hr; } }
        if (pos[k + 2] < floor) pos[k + 2] = floor;
        if (pos[k + 2] > ceil) pos[k + 2] = ceil;
      }
    }
  }
  for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) { s.cloth = null; return; }
}

let oc = null, og = null;
function canvas(w, h) {
  if (!oc) { oc = document.createElement('canvas'); og = oc.getContext('2d'); }
  if (oc.width < w || oc.height < h) { oc.width = Math.max(oc.width, w); oc.height = Math.max(oc.height, h); }
  og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
  og.clearRect(0, 0, w, h); og.imageSmoothingEnabled = false;
  return og;
}

/** Draw the pole and the cloth (call with the world transform on ctx). Returns false before the first step. */
export function drawBanner(ctx, p, s, fallback = '#2a4a9a') {
  const cl = s.cloth; if (!cl) return false;
  preloadBanner();
  const { pos } = cl, m = cl.m, M = ctx.getTransform(), sk = art.skin && art.skin.ok ? art.skin.im : null;
  const n = C * R, sx = new Float64Array(n), sy = new Float64Array(n);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) { // to device px
    const k = i * 3, wx = pos[k], wy = pos[k + 1] / 2 - pos[k + 2];
    sx[i] = M.a * wx + M.c * wy + M.e; sy[i] = M.b * wx + M.d * wy + M.f;
    x0 = Math.min(x0, sx[i]); y0 = Math.min(y0, sy[i]); x1 = Math.max(x1, sx[i]); y1 = Math.max(y1, sy[i]);
  }
  x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; x1 = Math.ceil(x1) + 2; y1 = Math.ceil(y1) + 2;
  const tris = [];
  for (let r = 0; r < R - 1; r++) for (let c = 0; c < C - 1; c++) {
    const i = r * C + c, q = [i, i + 1, i + C + 1, i + C];
    tris.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]);
  }
  const poleB = m[1];
  for (const t of tris) { // painter's order along the view, and a shade from the face normal
    const [a, b, c] = t.map((i) => i * 3);
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const facing = nx * VIEW[0] + ny * VIEW[1] + nz * VIEW[2], lit = Math.abs(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    t.dark = Math.max(0, Math.min(0.7, 0.42 - lit * 0.42 + (facing < 0 ? 0.18 : 0)));
    t.b = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3; t.key = 2 * t.b + (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
  }
  tris.sort((u, v) => u.key - v.key);
  const vt = (i) => [((i % C) / (C - 1)) * (sk ? sk.naturalWidth : 1), (((i / C) | 0) / (R - 1)) * cl.unf * (sk ? sk.naturalHeight : 1)];
  const layer = (list) => {
    if (!list.length) return;
    const g = canvas(x1 - x0, y1 - y0);
    for (const t of list) {
      const P = t.map((i) => [sx[i] - x0, sy[i] - y0]), cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cy = (P[0][1] + P[1][1] + P[2][1]) / 3;
      const E = P.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / d * 0.7, y + (y - cy) / d * 0.7]; });
      g.save(); g.beginPath(); g.moveTo(E[0][0], E[0][1]); g.lineTo(E[1][0], E[1][1]); g.lineTo(E[2][0], E[2][1]); g.closePath(); g.clip();
      if (sk) {
        const [U0, U1, U2] = t.map(vt), du1 = U1[0] - U0[0], dv1 = U1[1] - U0[1], du2 = U2[0] - U0[0], dv2 = U2[1] - U0[1], det = du1 * dv2 - du2 * dv1;
        if (Math.abs(det) > 1e-9) {
          const dx1 = P[1][0] - P[0][0], dy1 = P[1][1] - P[0][1], dx2 = P[2][0] - P[0][0], dy2 = P[2][1] - P[0][1];
          const A = (dx1 * dv2 - dx2 * dv1) / det, B = (dy1 * dv2 - dy2 * dv1) / det, Cc = (dx2 * du1 - dx1 * du2) / det, D = (dy2 * du1 - dy1 * du2) / det;
          g.setTransform(A, B, Cc, D, P[0][0] - A * U0[0] - Cc * U0[1], P[0][1] - B * U0[0] - D * U0[1]);
          g.drawImage(sk, 0, 0);
          g.setTransform(1, 0, 0, 1, 0, 0);
        }
      } else { g.fillStyle = fallback; g.fill(); }
      if (t.dark > 0.01) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,12,${t.dark.toFixed(3)})`; g.fillRect(0, 0, x1 - x0, y1 - y0); }
      g.restore();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(oc, 0, 0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); ctx.restore();
  };
  layer(tris.filter((t) => t.b < poleB));
  drawPole(ctx, cl);
  layer(tris.filter((t) => t.b >= poleB));
  if (cl.unf < 0.97) { // the rest of the cloth, still rolled up along the bottom edge
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const line = (w, col, dy) => { ctx.beginPath(); for (let c = 0; c < C; c++) { const k = ((R - 1) * C + c) * 3; ctx[c ? 'lineTo' : 'moveTo'](pos[k], pos[k + 1] / 2 - pos[k + 2] + dy); } ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); };
    line(3.6 * m[3], art.roll, 0.6); line(1, 'rgba(255,255,255,0.35)', -0.6);
    ctx.restore();
  }
  return true;
}

function drawPole(ctx, cl) {
  const m = cl.m, sc = m[3], x = m[0], y = m[1] / 2 - m[2], pl = art.pole && art.pole.ok ? art.pole.im : null;
  ctx.save(); ctx.translate(x, y); ctx.rotate(cl.th); ctx.scale(sc, sc);
  if (pl) { ctx.imageSmoothingEnabled = false; ctx.drawImage(pl, -PO.ax / T, -PO.ay / T, PO.w / T, PO.h / T); }
  else { // procedural stand-in until the sprite loads
    const top = -BAR, h = CW / 2;
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, top - 2); ctx.stroke();
    ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-h - 2, top); ctx.lineTo(h + 2, top); ctx.stroke();
    ctx.fillStyle = '#e0c060'; ctx.beginPath(); ctx.moveTo(0, top - 8); ctx.lineTo(-2, top - 2); ctx.lineTo(2, top - 2); ctx.fill();
  }
  ctx.restore();
}
