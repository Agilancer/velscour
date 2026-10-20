// The Paladin's hammers as real 3D models, drawn with Canvas 2D (no WebGL). The hammer is a handful of convex prisms
// (octagonal head with flared striking faces and a gold band, a turned haft with rings and a pommel) and a glowing
// cross on each side of the head. Under the game's parallel 2:1 isometric projection every face is a flat polygon,
// so a hammer is a few dozen path fills: faces turned to the camera, parts painted far to near, lit from the
// top-left. A thrown or orbiting hammer tumbles end over end along its line of flight; renders are memoised per
// 1/32 turn of heading and spin, so a ring of hammers is one drawImage each.
// World frame (as in lancershields.js): x right, d toward the camera, u up; screen = (x, K d - u).
import { HW, HH, isoX, isoY } from '../core/view.js';
import { glowSprite } from './vfx.js';

const K = HH / HW, VIEW = [0, 1, K];
const LIGHT = norm([-0.45, 0.5, 0.75]), HALF = norm([LIGHT[0], LIGHT[1] + VIEW[1], LIGHT[2] + VIEW[2]]);
function norm(v) { const l = Math.hypot(...v); return v.map((c) => c / l); }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Palettes: steel head, gold fittings, wooden haft, the cross's glow. Elements other than holy tint the fittings. */
const BASE = { steel: '#c2cad6', gold: '#d8a838', wood: '#6a4426', grip: '#3e2c22', cross: '#fff6c0', glow: '#ffe890' };
const PALS = new Map();
export function hammerPalette(E, light) {
  const key = light ? 'light' : (E && E.name) || 'Holy';
  let p = PALS.get(key);
  if (p) return p;
  if (light) p = { steel: '#fff2c0', gold: '#ffd860', wood: '#f0c050', grip: '#e8b040', cross: '#ffffff', glow: '#ffe890', emit: 0.55 }; // JUDGEMENT: a hammer of light
  else if (!E || E.name === 'Holy' || E.name === 'Physical') p = { ...BASE };
  else p = { ...BASE, gold: E.core || BASE.gold, cross: E.core || BASE.cross, glow: E.glow || BASE.glow };
  p.id = key;
  PALS.set(key, p);
  return p;
}

// ------------------------------------------------------------------ the model (units = screen px at size 1)
// A prism along the x axis (head) or the z axis (haft) from a0 to a1, radius r0 -> r1, `sides` facets.
function prism(axis, a0, a1, r0, r1, sides, col, rot = 0.5) {
  const v = [];
  for (const [a, r] of [[a0, r0], [a1, r1]]) for (let k = 0; k < sides; k++) {
    const th = (k + rot) * 2 * Math.PI / sides, c = Math.cos(th) * r, s = Math.sin(th) * r;
    v.push(axis === 'x' ? [a, c, s] : [c, s, a]);
  }
  const faces = [];
  for (let k = 0; k < sides; k++) { const k1 = (k + 1) % sides; faces.push([k, k1, sides + k1, sides + k]); }
  faces.push([...Array(sides).keys()], [...Array(sides).keys()].map((k) => sides + k));
  return part(v, faces, col);
}
// Outward normals by Newell's method, flipped to point away from the part's centre.
function part(v, faces, col, emissive = false) {
  const c = v.reduce((a, p) => [a[0] + p[0] / v.length, a[1] + p[1] / v.length, a[2] + p[2] / v.length], [0, 0, 0]);
  return {
    v, col, emissive, c,
    f: faces.map((idx) => {
      let n = [0, 0, 0];
      for (let i = 0; i < idx.length; i++) {
        const a = v[idx[i]], b = v[idx[(i + 1) % idx.length]];
        n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
      }
      n = norm(n);
      const fc = idx.reduce((a, i) => [a[0] + v[i][0], a[1] + v[i][1], a[2] + v[i][2]], [0, 0, 0]).map((x) => x / idx.length);
      if (dot(n, [fc[0] - c[0], fc[1] - c[1], fc[2] - c[2]]) < 0) n = n.map((x) => -x);
      return { idx, n };
    }),
  };
}
// The glowing cross on one side of the head (y = +-side), a thin slab just proud of the facet.
function cross(side, y) {
  const q = (x0, z0, x1, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
  const parts = [];
  for (const r of [q(-0.45, -1.25, 0.45, 1.25), q(-1.7, 0.15, 1.7, 0.75)]) {
    const p = part(r, [[0, 1, 2, 3]], 'cross', true);
    p.f[0].n = [0, side, 0]; p.c = [0, y, 0]; p.decal = true;
    parts.push(p);
  }
  return parts;
}
const PIVOT = 3; // the model tumbles round a point this far down the haft (near its centre of mass)
let MODEL = null;
function model() {
  if (MODEL) return MODEL;
  const R = 3.3, RB = 3.65, ry = RB * Math.cos(Math.PI / 8) + 0.05; // the band's flat faces at +-y carry the cross
  const parts = [
    prism('x', -7.4, -5, 4.1, 3.4, 8, 'steel'), prism('x', -5, -2.6, R, R, 8, 'steel'), prism('x', -2.6, 2.6, RB, RB, 8, 'gold'),
    prism('x', 2.6, 5, R, R, 8, 'steel'), prism('x', 5, 7.4, 3.4, 4.1, 8, 'steel'),
    prism('z', -3.2, -5.2, 1.85, 1.4, 6, 'gold'), prism('z', -5.2, -9.6, 1.25, 1.25, 6, 'wood'), prism('z', -9.6, -10.3, 1.5, 1.5, 6, 'gold'),
    prism('z', -10.3, -14.4, 1.35, 1.35, 6, 'grip'), prism('z', -14.4, -15.3, 1.4, 1.95, 6, 'gold'), prism('z', -15.3, -16.4, 1.95, 0.9, 6, 'gold'),
    ...cross(1, ry), ...cross(-1, -ry),
  ];
  for (const p of parts) { for (const v of p.v) v[2] += PIVOT; p.c[2] += PIVOT; }
  let reach = 0;
  for (const p of parts) for (const v of p.v) reach = Math.max(reach, Math.hypot(...v));
  return (MODEL = { parts, reach });
}

// ------------------------------------------------------------------ colour
const LEVELS = 20, STYLES = new Map();
function style(hex, k) {
  const q = Math.max(0, Math.min(LEVELS * 2, Math.round(k * LEVELS))), key = hex + q;
  let v = STYLES.get(key);
  if (!v) {
    const n = parseInt(hex.slice(1), 16), g = q / LEVELS, c = (x) => Math.max(0, Math.min(255, Math.round(x * g)));
    v = `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; STYLES.set(key, v);
  }
  return v;
}
// Metal: diffuse plus a tight highlight; wood: diffuse only; the cross glows whatever way it faces.
function light(n, kind, emit) {
  if (kind === 'cross') return 1.15;
  const dif = Math.max(0, dot(n, LIGHT)), spec = kind === 'wood' || kind === 'grip' ? 0 : Math.max(0, dot(n, HALF)) ** 24;
  return Math.min(1.9, 0.42 + 0.72 * dif + (kind === 'gold' ? 0.75 : 0.55) * spec + (emit || 0));
}

// ------------------------------------------------------------------ drawing
const order = [], scratch = [];
/** Model axes for a hammer flying along ground heading `head` (0 = screen right), tumbled `spin` rad end over end:
 *  ex = the head's long axis, ez = up the haft, ey = their normal (the side the cross faces). */
export function hammerBasis(head, spin, roll = 0) {
  const T = [Math.cos(head), Math.sin(head), 0], S = [-Math.sin(head), Math.cos(head), 0], U = [0, 0, 1];
  const cs = Math.cos(spin), ss = Math.sin(spin);
  let ex = [T[0] * cs + U[0] * ss, T[1] * cs + U[1] * ss, T[2] * cs + U[2] * ss];
  let ez = [-T[0] * ss + U[0] * cs, -T[1] * ss + U[1] * cs, -T[2] * ss + U[2] * cs];
  let ey = S;
  if (roll) { // a twist about the haft: the cross turns toward or away from the camera
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const nx = ex.map((v, i) => v * cr + ey[i] * sr), ny = ey.map((v, i) => -ex[i] * sr + v * cr);
    ex = nx; ey = ny;
  }
  return [ex, ey, ez];
}
/** Draw the hammer model centred (its pivot) at screen (px, py), scale s, axes from hammerBasis. */
export function drawHammerModel(ctx, px, py, B, s, pal) {
  const M = model(), [ex, ey, ez] = B;
  const W = (p) => [p[0] * ex[0] + p[1] * ey[0] + p[2] * ez[0], p[0] * ex[1] + p[1] * ey[1] + p[2] * ez[1], p[0] * ex[2] + p[1] * ey[2] + p[2] * ez[2]];
  order.length = 0;
  for (const p of M.parts) { p.wc = W(p.c); p.depth = dot(p.wc, VIEW) + (p.decal ? 0.5 : 0); order.push(p); }
  order.sort((a, b) => a.depth - b.depth);
  for (const p of order) {
    const pts = scratch; pts.length = 0;
    for (const v of p.v) { const w = W(v); pts.push(px + s * w[0], py + s * (K * w[1] - w[2])); }
    const col = pal[p.col], kind = p.col;
    for (const f of p.f) {
      const n = W(f.n);
      if (dot(n, VIEW) <= 0.001) continue;
      ctx.fillStyle = style(col, light(n, kind, pal.emit));
      ctx.beginPath();
      for (let i = 0; i < f.idx.length; i++) { const j = f.idx[i] * 2; i ? ctx.lineTo(pts[j], pts[j + 1]) : ctx.moveTo(pts[j], pts[j + 1]); }
      ctx.closePath(); ctx.fill();
    }
  }
}

// A one-pixel dark outline round the render, so a hammer reads on any floor.
let OUT = null;
function outline(c, g) {
  if (!OUT) OUT = document.createElement('canvas');
  OUT.width = c.width; OUT.height = c.height;
  const o = OUT.getContext('2d');
  o.drawImage(c, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = '#1a1208'; o.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-over';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(OUT, dx, dy);
  g.globalCompositeOperation = 'source-over';
}

// Memoised renders: 32 headings x 32 spin steps per size and palette.
const STEPS = 32, VIEWS = new Map();
function view(head, spin, s, pal) {
  const hs = ((Math.round(head / (Math.PI * 2) * STEPS) % STEPS) + STEPS) % STEPS;
  const ss = ((Math.round(spin / (Math.PI * 2) * STEPS) % STEPS) + STEPS) % STEPS;
  const sk = Math.max(1, Math.round(s * 10)), key = `${pal.id}|${sk}|${hs}|${ss}`;
  let c = VIEWS.get(key);
  if (c) return c;
  if (VIEWS.size > 2500) VIEWS.clear();
  const size = Math.ceil(model().reach * 2 * sk / 10) + 4;
  c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  drawHammerModel(g, size / 2, size / 2, hammerBasis(hs * Math.PI * 2 / STEPS, ss * Math.PI * 2 / STEPS), sk / 10, pal);
  outline(c, g);
  VIEWS.set(key, c);
  return c;
}

/**
 * A flying / orbiting hammer at screen (px, py): o.head ground heading (rad, screen-aligned), o.spin tumble angle,
 * o.size scale, o.E element (fittings and glow), o.glow halo strength (0 = none), o.shadow px above the ground (0 = none).
 */
export function drawHammer3D(ctx, px, py, o) {
  if (typeof document === 'undefined') return false;
  const s = (o.size || 1) * 1.05, pal = o.pal || hammerPalette(o.E), prev = ctx.globalAlpha;
  if (o.shadow) {
    ctx.globalAlpha = prev * 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(px, py + o.shadow, 7 * s, 3.2 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (o.glow) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = prev * o.glow;
    const r = 16 * s; ctx.drawImage(glowSprite(pal.glow), px - r, py - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = prev;
  const img = view(o.head || 0, o.spin || 0, s, pal), smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(px - img.width / 2), Math.round(py - img.height / 2));
  ctx.imageSmoothingEnabled = smooth;
  return true;
}

/** Ground heading (as drawHammer3D wants it) of a screen-space angle (drawShape's `a`). */
export const headingOfScreen = (a) => Math.atan2(Math.sin(a) / K, Math.cos(a));

/** A great hammer standing head-down with the bottom of its head at screen (px, py), turned `turn` rad about its haft
 *  (drawn directly, not memoised: it is big and there is only ever one or two). */
export function drawGreatHammer(ctx, px, py, s, pal, turn = 0) {
  const RB = 3.65, B = hammerBasis(turn, Math.PI);
  drawHammerModel(ctx, px, py - s * (RB + PIVOT), B, s, pal);
}

/** A vfx effect: a 3D hammer drops out of the sky onto (x, y) in `fall` seconds, turning as it comes, then fades. */
export class FallingHammer {
  constructor(x, y, o = {}) { Object.assign(this, { x, y, t: 0, fall: 0.22, hold: 0.25, size: 2.6, h: 260, turn: -0.6, E: null }, o); this.pal = o.pal || hammerPalette(this.E); }
  update(dt) { this.t += dt; return this.t < this.fall + this.hold; }
  draw(ctx) {
    const k = Math.min(1, this.t / this.fall), z = this.h * (1 - k * k), a = this.t < this.fall ? 1 : 1 - (this.t - this.fall) / this.hold;
    const px = isoX(this.x, this.y), gy = isoY(this.x, this.y), prev = ctx.globalAlpha, s = this.size;
    ctx.globalAlpha = prev * 0.3 * k; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(px, gy, 9 * s * (0.4 + 0.6 * k), 4 * s * (0.4 + 0.6 * k), 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = prev * 0.7 * a;
    const r = 24 * s; ctx.drawImage(glowSprite(this.pal.glow), px - r, gy - z - 8 * s - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = prev * a;
    drawGreatHammer(ctx, px, gy - z + 2, s, this.pal, this.turn + this.t * 2.4);
    ctx.globalAlpha = prev;
  }
}
