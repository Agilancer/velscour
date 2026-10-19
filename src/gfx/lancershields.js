// Lancer spinning shields as real 3D models, built at load time from the four
// golden shield turntables (4x2 sheets, 44x56 cells; frame 0 = front face,
// frame 4 = rear face, frames 2/6 = edge-on). Each model is an extruded slab:
//  - silhouette + front cap texture from frame 0 (stray pixels dropped),
//  - rear cap texture from frame 4, mirrored and fitted onto the silhouette,
//  - slab thickness and per-height rim colours from the edge-on frames.
// Every cap and rim face is planar, so under the game's parallel isometric
// projection it is an exact affine map: Canvas 2D draws the model with no
// WebGL. Shields face radially outward (front toward the camera on the near
// side at a=pi/4, rear on the far side) and are lit by a top-left-front light.
import { isoX, isoY } from '../core/view.js';
import { drawShape } from './shapes.js';

export const SHIELD_SHEET = Object.freeze({
  round:   'assets/fx/lancer/spinning_round.png',
  diamond: 'assets/fx/lancer/spinning_diamond.png',
  kite:    'assets/fx/lancer/spinning_kite.png',
  tower:   'assets/fx/lancer/spinning_tower.png',
});
export const SHIELD_FRAME = Object.freeze({w:44,h:56,columns:4,count:8,front:0,back:4,edges:[2,6]});

// Every Bulwark spinning shield ability is assigned one of the four models.
export const LANCER_SHIELD_ABILITY = Object.freeze({
  'Tower Shield': 'round',
  'Storm Bulwark': 'diamond',
  'Burning Aegis': 'kite',
  'Frost Rampart': 'tower',
  'Holy Citadel': 'round',
  'Shield Storm': 'diamond',
  'Bastion of Ten': 'tower',
});
// Compact Bulwark rings: 0.275-tile separation, one concentric orbit per skill.
export const SHIELD_ORBIT_RADIUS = Object.freeze({
  'Tower Shield': 0.70, 'Storm Bulwark': 0.975, 'Burning Aegis': 1.25,
  'Frost Rampart': 1.525, 'Holy Citadel': 1.80,
  'Shield Storm': 2.075, 'Bastion of Ten': 2.35,
});
export function shieldOrbitRadius(name) { return SHIELD_ORBIT_RADIUS[name] ?? 1.6; }
export function shieldVariantForSkill(name) { return LANCER_SHIELD_ABILITY[name] || 'round'; }

// Projection: a world-horizontal offset toward the camera drops K screen px per
// px of width (2:1 iso ground); vertical stays 1:1 like the sprite art. VIEW is
// the parallel view direction (x, toward-camera, up): everything along it lands
// on one screen point, so a face is visible when its normal . VIEW > 0.
const K = 0.5, VIEW = [0, 1, K];
const LIGHT = norm([-0.45, 0.55, 0.7]);
// Glint direction: halfway between light and camera, flattened (the shields stand upright).
const HALF = norm([LIGHT[0] + VIEW[0], LIGHT[1] + VIEW[1], 0]);
const LEVELS = 16, LO = 0.4, HI = 1.5;  // baked brightness steps for caps and rim
function norm(v) { const l = Math.hypot(...v); return v.map(c => c / l); }
const level = (b) => Math.max(0, Math.min(LEVELS - 1, Math.round((b - LO) / (HI - LO) * (LEVELS - 1))));
const levelValue = (i) => LO + (HI - LO) * i / (LEVELS - 1);
// Gold: the art as painted when face-on (~1.0), darker turned away, and a glint
// sweeping across a face as it swings between the light and the camera.
function shade(nx, nd, nu) {
  const dif = Math.max(0, nx * LIGHT[0] + nd * LIGHT[1] + nu * LIGHT[2]);
  const spec = Math.max(0, nx * HALF[0] + nd * HALF[1]) ** 40;
  return 0.62 + 0.7 * dif + 0.4 * spec;
}

const cached = new Map();

/** Lazy, nonblocking load; the procedural tshield stands in until the model is built. */
export function preloadLancerShield(variant) {
  if (!SHIELD_SHEET[variant] || typeof Image === 'undefined') return null;
  if (cached.has(variant)) return cached.get(variant);
  const record = {image: new Image(), model: null, ready: false, error: false};
  cached.set(variant, record);
  record.image.onload = () => {
    const ok = record.image.naturalWidth === SHIELD_FRAME.w * SHIELD_FRAME.columns &&
      record.image.naturalHeight === SHIELD_FRAME.h * 2;
    try { if (ok) record.model = buildShieldModel(record.image); } catch (e) { console.warn('shield model', variant, e); }
    record.ready = !!record.model; record.error = !record.ready;
  };
  record.image.onerror = () => { record.error = true; };
  record.image.src = SHIELD_SHEET[variant];
  return record;
}
export function shieldModel(variant) { return preloadLancerShield(variant)?.model || null; }

// ------------------------------------------------------------------ model building
function cellPixels(c, f) {
  const {w, h, columns} = SHIELD_FRAME;
  return c.getImageData((f % columns) * w, Math.floor(f / columns) * h, w, h);
}
// Keep only the largest 8-connected blob of visible pixels (the sheets carry stray specks).
function mainBlob(px) {
  const {w, h} = SHIELD_FRAME, lab = new Int32Array(w * h), d = px.data;
  let best = 0, bestN = 0, id = 0;
  for (let s = 0; s < w * h; s++) {
    if (lab[s] || d[s * 4 + 3] < 24) continue;
    const stack = [s]; lab[s] = ++id; let n = 0;
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0; n++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, q = Y * w + X;
        if (X < 0 || Y < 0 || X >= w || Y >= h || lab[q] || d[q * 4 + 3] < 24) continue;
        lab[q] = id; stack.push(q);
      }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  const mask = new Uint8Array(w * h);
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let p = 0; p < w * h; p++) {
    if (lab[p] !== best) { d[p * 4 + 3] = 0; continue; }
    if (d[p * 4 + 3] < 90) continue;
    mask[p] = 1; const x = p % w, y = (p / w) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return {px, mask, x0, x1, y0, y1, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, bw: x1 - x0 + 1, bh: y1 - y0 + 1};
}
// Ramer-Douglas-Peucker on an open chain of [x,y] points.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const L = Math.hypot(bx - ax, by - ay) || 1;
  let far = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const dd = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
    if (dd > far) { far = dd; at = i; }
  }
  if (far <= tol) return [pts[0], pts[pts.length - 1]];
  return simplify(pts.slice(0, at + 1), tol).slice(0, -1).concat(simplify(pts.slice(at), tol));
}
// Silhouette outline from per-row extents: left side down, right side up.
function outline(b) {
  const {w} = SHIELD_FRAME, left = [], right = [];
  for (let y = b.y0; y <= b.y1; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) if (b.mask[y * w + x]) { if (l < 0) l = x; r = x; }
    if (l < 0) continue;
    left.push([l, y], [l, y + 1]); right.push([r + 1, y], [r + 1, y + 1]);
  }
  right.reverse();
  return simplify(left, 0.8).concat(simplify(right, 0.8));
}
// Average colour of each row of the edge-on frames (the shield's rim as painted).
function rimRows(edges) {
  const {w} = SHIELD_FRAME, rows = [];
  for (const e of edges) {
    const d = e.px.data, out = [];
    for (let y = e.y0; y <= e.y1; y++) {
      let r = 0, g = 0, bl = 0, n = 0;
      for (let x = e.x0; x <= e.x1; x++) {
        const p = (y * w + x) * 4;
        if (!e.mask[y * w + x]) continue;
        r += d[p]; g += d[p + 1]; bl += d[p + 2]; n++;
      }
      if (n) out.push([r / n, g / n, bl / n]);
    }
    rows.push(out);
  }
  return (t) => {
    let r = 0, g = 0, bl = 0;
    for (const out of rows) { const c = out[Math.min(out.length - 1, Math.max(0, Math.round(t * (out.length - 1))))]; r += c[0]; g += c[1]; bl += c[2]; }
    return [r / rows.length, g / rows.length, bl / rows.length];
  };
}
// Median opaque run per row of the edge-on frames: the slab's thickness, boss excluded.
function slabThickness(edges) {
  const {w} = SHIELD_FRAME, widths = [];
  for (const e of edges) for (let y = e.y0; y <= e.y1; y++) {
    let n = 0; for (let x = e.x0; x <= e.x1; x++) n += e.mask[y * w + x];
    if (n) widths.push(n);
  }
  widths.sort((a, b) => a - b);
  return Math.max(2, Math.min(5, (widths[widths.length >> 1] || 3) * 0.75));
}
// One canvas per brightness level, so a cap is a single drawImage.
function bakeLevels(b) {
  const {w, h} = SHIELD_FRAME, out = [];
  for (let i = 0; i < LEVELS; i++) {
    const k = levelValue(i), img = new ImageData(new Uint8ClampedArray(b.px.data), w, h), d = img.data;
    for (let p = 0; p < d.length; p += 4) { d[p] *= k; d[p + 1] *= k; d[p + 2] *= k; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').putImageData(img, 0, 0); out.push(c);
  }
  return out;
}

export function buildShieldModel(image) {
  const {w, h, columns, front: F, back: B, edges: E} = SHIELD_FRAME;
  const c = document.createElement('canvas'); c.width = w * columns; c.height = h * 2;
  const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(image, 0, 0);
  const front = mainBlob(cellPixels(g, F)), back = mainBlob(cellPixels(g, B));
  const edges = E.map(f => mainBlob(cellPixels(g, f)));
  const rim = rimRows(edges), T = slabThickness(edges);
  // Outline in model units: U across (right as seen from the front), V up, centred.
  const pts = outline(front).map(([x, y]) => ({U: x - front.cx, V: front.cy - y, t: (y - front.y0) / front.bh}));
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], q = pts[(i + 1) % pts.length]; area += a.U * q.V - q.U * a.V; }
  const faces = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], q = pts[(i + 1) % pts.length];
    let nU = q.V - a.V, nV = a.U - q.U; if (area < 0) { nU = -nU; nV = -nV; }
    const L = Math.hypot(nU, nV); if (!L) continue;
    const ca = rim(a.t), cb = rim(q.t), col = ca.map((v, k) => (v + cb[k]) / 2);
    faces.push({a, b: q, nU: nU / L, nV: nV / L, col, styles: []});
  }
  return {
    T, pts, faces, dark: rgb(rim(0.5), 0.35),
    front: {levels: bakeLevels(front), cx: front.cx, cy: front.cy, sx: 1, sy: 1},
    // The rear art is painted as seen from behind: mirror it and fit its box to the front's.
    back: {levels: bakeLevels(back), cx: back.cx, cy: back.cy, sx: front.bw / back.bw, sy: front.bh / back.bh},
    size: {w: front.bw, h: front.bh},
  };
}

// ------------------------------------------------------------------ drawing
/** Outward normal (x, toward-camera) and in-plane right vector for orbit angle a. */
export function shieldBasis(angle) {
  const th = angle + Math.PI / 4, nx = Math.cos(th), nd = Math.sin(th);
  return {nx, nd, ux: nd, ud: -nx};
}
/** Which face the camera sees at orbit angle a: 'front' on the near side, 'back' on the far side. */
export function shieldFacing(angle) { return shieldBasis(angle).nd >= 0 ? 'front' : 'back'; }

const faceOrder = [];
/** Draw a shield model centred at screen (px,py), facing radially out along world angle a. */
export function drawShieldModel(ctx, model, px, py, angle, s) {
  const {nx, nd, ux, ud} = shieldBasis(angle), T2 = model.T / 2;
  // Model (U across, V up, N out) -> screen offset.
  const sx = (U, N) => px + s * (U * ux + N * nx);
  const sy = (U, V, N) => py + s * (-V + K * (U * ud + N * nd));
  const showFront = nd >= 0, capN = showFront ? T2 : -T2, farN = -capN;
  // Far outline first: covers hairline seams between rim faces.
  const pts = model.pts;
  ctx.fillStyle = model.dark;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], x = sx(p.U, farN), y = sy(p.U, p.V, farN);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.fill();
  // Rim faces turned toward the camera, painted far to near.
  faceOrder.length = 0;
  for (const f of model.faces) {
    const fx = f.nU * ux, fd = f.nU * ud, fu = f.nV;
    if (fd * VIEW[1] + fu * VIEW[2] <= 0.001) continue;
    f.depth = ((f.a.U + f.b.U) / 2) * ud + K * (f.a.V + f.b.V) / 2;
    f.lv = level(shade(fx, fd, fu));
    faceOrder.push(f);
  }
  faceOrder.sort((p, q) => p.depth - q.depth);
  for (const f of faceOrder) {
    const {a, b} = f;
    ctx.fillStyle = f.styles[f.lv] || rimStyle(f, f.lv);
    ctx.beginPath();
    ctx.moveTo(sx(a.U, T2), sy(a.U, a.V, T2)); ctx.lineTo(sx(b.U, T2), sy(b.U, b.V, T2));
    ctx.lineTo(sx(b.U, -T2), sy(b.U, b.V, -T2)); ctx.lineTo(sx(a.U, -T2), sy(a.U, a.V, -T2));
    ctx.closePath(); ctx.fill();
  }
  // The visible cap: texel (tx,ty) -> U = m*(tx-cx)*fx, V = (cy-ty)*fy, N = capN.
  const cap = showFront ? model.front : model.back, m = showFront ? 1 : -1;
  const lv = level(shade(m * nx, m * nd, 0));
  const fx = m * cap.sx, fy = cap.sy;
  const a = s * fx * ux, b = s * K * fx * ud, d = s * fy;
  const e = sx(-fx * cap.cx, capN), f = sy(-fx * cap.cx, fy * cap.cy, capN);
  ctx.save();
  ctx.transform(a, b, 0, d, e, f);
  ctx.drawImage(cap.levels[lv], 0, 0);
  ctx.restore();
}
function rimStyle(f, lv) {
  return (f.styles[lv] = rgb(f.col, levelValue(lv)));
}
const rgb = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;

/** World-space depth of a single shield, not of its containing orbit.
 * Negative sum = behind the lancer; positive sum = in front of lancer.
 * A tiny tie-breaker makes edge-on shields stable beside the body.
 */
export function orbitShieldDepth(x, y, angle) {
  return x + y + (Math.cos(angle) + Math.sin(angle) >= 0 ? 0.0001 : -0.0001);
}

/** Render one orbiting shield. Model texels match the old sprite scale (0.72 x orbit size). */
export function drawLancerOrbitShield(ctx, orbit, position) {
  if (!position) return false;
  const [x, y, a] = position, record = preloadLancerShield(orbit.shieldVariant);
  const px = isoX(x, y), py = isoY(x, y) - 24;
  if (!record?.ready) {
    // Keep the skill visually functional on the first frame/offline.
    drawShape(ctx, 'tshield', px, py, 0, 0.82 * orbit.size, orbit.E, orbit.t);
    return false;
  }
  const img = shieldView(record.model, a, 0.72 * orbit.size), smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, px - img.width / 2, py - img.height / 2);
  ctx.imageSmoothingEnabled = smooth;
  return true;
}

// A model render costs ~25 path fills; memoise it per 1/96 turn and size so a
// spinning shield is one drawImage per frame (Bastion of Ten alone is ten shields).
export const SHIELD_STEPS = 96;
export function shieldView(model, angle, s) {
  const step = ((Math.round(angle / (Math.PI * 2) * SHIELD_STEPS) % SHIELD_STEPS) + SHIELD_STEPS) % SHIELD_STEPS;
  const sk = Math.round(s * 20), key = sk * SHIELD_STEPS + step, cache = model.views || (model.views = new Map());
  let c = cache.get(key);
  if (c) return c;
  if (cache.size > 1500) cache.clear();
  const R = model.pts.reduce((r, p) => Math.max(r, Math.abs(p.U), Math.abs(p.V) + K * Math.abs(p.U)), 0) + model.T;
  const size = Math.ceil(R * 2 * sk / 20) + 4;
  c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  drawShieldModel(g, model, size / 2, size / 2, step * Math.PI * 2 / SHIELD_STEPS, sk / 20);
  cache.set(key, c);
  return c;
}
