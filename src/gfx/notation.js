// The Bard's notation art: procedural glyphs (notes, beamed groups, triplets, rests, clefs) cut into cached sprites,
// the wavy five-line staff of glowing particles that trails every note, cosmetic note flights for skills that are not
// projectiles, and the 4/4 measure over the Bard's head. Colours and particles step up at skill ranks 5/10/15/20.
import { G } from '../state.js';
import { makeCanvas, rand, TAU, chance } from '../core/util.js';
import { isoX, isoY, HW } from '../core/view.js';
import { glowSprite, spawn, addEffect, Ring } from './vfx.js';
import { NOTES, MEASURE } from '../data/notation.js';

// staff / glyph / glow / spark colours per tier (4 = rainbow staff and a gold glyph)
export const TIERS = [
  { staff: '#f2e6c4', note: '#fff8e2', glow: '#ffc860', spark: '#fff0b0' },
  { staff: '#7cd4ff', note: '#effaff', glow: '#3aa0ff', spark: '#c8f0ff' },
  { staff: '#62ffa4', note: '#effff5', glow: '#18d070', spark: '#c0ffd8' },
  { staff: '#ff72d2', note: '#fff0fb', glow: '#e028b4', spark: '#ffc8f0' },
  { staff: '#ffe070', note: '#fff2a0', glow: '#ffa818', spark: '#ffffff' },
];
const RAINBOW = ['#ff4a4a', '#ff8a2a', '#ffd030', '#c8ff30', '#50ff60', '#30ffb8', '#30e0ff', '#3a90ff', '#6a5aff', '#b048ff', '#ff48e0', '#ff4a9a'];
const OUT = '#1a0c22';

// ---------------------------------------------------------------- glyph paths (unit = 1 px at scale 1, centre 0,0)
function head(x, y, ctx, o, filled = true, big = false) {
  ctx.beginPath(); ctx.ellipse(x, y, (big ? 4.1 : 3.3) + o / 2, (big ? 2.7 : 2.35) + o / 2, big ? -0.12 : -0.38, 0, TAU);
  if (filled) ctx.fill();
  else {
    ctx.lineWidth = (big ? 2.3 : 1.6) + o; ctx.stroke();
    if (o) { ctx.beginPath(); ctx.ellipse(x, y, big ? 1.6 : 1.4, big ? 1.3 : 0.9, big ? 0.9 : -0.38, 0, TAU); ctx.lineWidth = o; ctx.stroke(); }
  }
}
function line(ctx, o, w, pts) { ctx.lineWidth = w + o; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); }
function flags(ctx, o, x, y, k) {
  ctx.lineWidth = 1.7 + o;
  for (let i = 0; i < k; i++) { const yy = y + i * 3.4; ctx.beginPath(); ctx.moveTo(x, yy); ctx.bezierCurveTo(x + 1, yy + 3, x + 5.6, yy + 3.6, x + 4.3, yy + 8.6); ctx.stroke(); }
}
function single(ctx, o, k) { head(-1.6, 5, ctx, o); line(ctx, o, 1.4, [1.45, 4.6, 1.45, -9.5]); if (k) flags(ctx, o, 1.45, -9.5, k); }
function beamed(ctx, o, n, k, trip) {
  const sp = n === 2 ? 9 : n === 3 ? 7.2 : 6.6, x0 = -((n - 1) * sp) / 2 - 1.5;
  for (let i = 0; i < n; i++) {
    const hx = x0 + i * sp, top = -9.5 - i * 0.5;
    head(hx, 5 - i * 0.5, ctx, o);
    line(ctx, o, 1.3, [hx + 3.05, 4.4 - i * 0.5, hx + 3.05, top]);
  }
  const xa = x0 + 3.05 - 0.6, xb = x0 + (n - 1) * sp + 3.05 + 0.6, ya = -9.5, yb = -9.5 - (n - 1) * 0.5;
  for (let j = 0; j < k; j++) {
    const d = j * 3.1;
    ctx.beginPath(); ctx.moveTo(xa - o / 2, ya + d - o / 2); ctx.lineTo(xb + o / 2, yb + d - o / 2); ctx.lineTo(xb + o / 2, yb + d + 2.1 + o / 2); ctx.lineTo(xa - o / 2, ya + d + 2.1 + o / 2); ctx.closePath(); ctx.fill();
  }
  if (trip) { // the bracketed "3" over a triplet
    const cx = (xa + xb) / 2, ty = yb - 4.2;
    line(ctx, o, 0.9, [xa, ty + 1.4, xa, ty, cx - 2.6, ty]); line(ctx, o, 0.9, [cx + 2.6, ty, xb, ty, xb, ty + 1.4]);
    ctx.font = 'bold 7px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o) { ctx.lineWidth = o + 0.6; ctx.strokeText('3', cx, ty); } else ctx.fillText('3', cx, ty);
  }
}
function restFlags(ctx, o, k) { // eighth / sixteenth / thirty-second rests: k dotted hooks on a slanted stem
  const top = -6 - (k - 1) * 2.1, x0 = 2.6 + (k - 1) * 0.8;
  line(ctx, o, 1.5, [x0 + 0.4, top - 1.4, -1.2 - (k - 1) * 0.6, 8]);
  for (let i = 0; i < k; i++) {
    const yy = top + i * 4.2, xx = x0 - i * 1.05;
    ctx.beginPath(); ctx.arc(xx - 4.4, yy - 0.6, 1.8 + o / 2, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.3 + o; ctx.beginPath(); ctx.moveTo(xx - 5, yy + 0.6); ctx.quadraticCurveTo(xx - 1.8, yy + 2, xx + 0.2, yy - 0.6); ctx.stroke();
  }
}
const DRAW = {
  q: (c, o) => single(c, o, 0), e: (c, o) => single(c, o, 1), s: (c, o) => single(c, o, 2),
  e2: (c, o) => beamed(c, o, 2, 1), s2: (c, o) => beamed(c, o, 2, 2), s3: (c, o) => beamed(c, o, 3, 2), s4: (c, o) => beamed(c, o, 4, 2),
  t8: (c, o) => beamed(c, o, 3, 1, true), t16: (c, o) => beamed(c, o, 3, 2, true), t32: (c, o) => beamed(c, o, 3, 3, true),
  w: (c, o) => head(0, 1, c, o, false, true),
  h: (c, o) => { head(-1.6, 5, c, o, false); line(c, o, 1.4, [1.6, 4.4, 1.6, -9.5]); },
  rw: (c, o) => { line(c, o, 1, [-7, -2, 7, -2]); c.fillRect(-3.8 - o / 2, -2 - o / 2, 7.6 + o, 3.4 + o); },
  rh: (c, o) => { line(c, o, 1, [-7, 2, 7, 2]); c.fillRect(-3.8 - o / 2, -1.4 - o / 2, 7.6 + o, 3.4 + o); },
  rq: (c, o) => {
    c.lineWidth = 2.3 + o; c.beginPath(); c.moveTo(-1.6, -10); c.lineTo(2.6, -5.2); c.lineTo(-1.6, -0.8); c.lineTo(2.5, 3.6);
    c.bezierCurveTo(-2.4, 1.6, -3.2, 6.8, 0.6, 9.6); c.stroke();
  },
  re: (c, o) => restFlags(c, o, 1), rs: (c, o) => restFlags(c, o, 2), rt: (c, o) => restFlags(c, o, 3),
  treble: (c, o) => {
    c.lineWidth = 1.9 + o; c.beginPath(); c.moveTo(-1.9, 2.6);
    c.bezierCurveTo(-1.5, -1.4, 4.8, -0.8, 4.5, 2.8); c.bezierCurveTo(4.2, 6.8, -5.2, 7.4, -5.5, 1.8);
    c.bezierCurveTo(-5.8, -3.6, 2.6, -6.4, 2.8, -11.4); c.bezierCurveTo(2.9, -15.4, -0.6, -15.8, -0.9, -11.8);
    c.bezierCurveTo(-1.3, -7.6, 0.6, 2.4, 0.9, 10); c.bezierCurveTo(1, 13.2, -2.7, 13.6, -3.4, 11);
    c.stroke(); c.beginPath(); c.arc(-2.4, 10.4, 1.7 + o / 2, 0, TAU); c.fill();
  },
  bass: (c, o) => {
    c.beginPath(); c.arc(-4.4, -3.6, 2.3 + o / 2, 0, TAU); c.fill();
    c.lineWidth = 2.1 + o; c.beginPath(); c.moveTo(-6.2, -3.8); c.bezierCurveTo(-5.6, -9.4, 5.4, -9.6, 5.2, -2.4);
    c.bezierCurveTo(5, 3.8, -0.6, 8, -6, 10.4); c.stroke();
    c.beginPath(); c.arc(8.2, -5.4, 1.3 + o / 2, 0, TAU); c.arc(8.2, -0.8, 1.3 + o / 2, 0, TAU); c.fill();
  },
};

const K = 3, BOX = 40; // sprites are 40 units square at 3x for crisp scaling
const sprites = new Map();
/** Cached square sprite of a glyph in one colour (BOX*K px). */
export function glyphSprite(id, col) {
  const key = id + col;
  let c = sprites.get(key);
  if (c) return c;
  c = makeCanvas(BOX * K, BOX * K);
  const x = c.getContext('2d');
  x.translate(BOX * K / 2, BOX * K / 2); x.scale(K, K); x.lineCap = 'round'; x.lineJoin = 'round';
  const f = DRAW[id] || DRAW.q;
  x.fillStyle = x.strokeStyle = OUT; x.globalAlpha = 0.9; f(x, 2);
  x.fillStyle = x.strokeStyle = col; x.globalAlpha = 1; f(x, 0);
  sprites.set(key, c);
  return c;
}
/** Draw glyph `id` centred at screen (x, y): s = scale (1 = a quarter note about 20 px tall), rot in radians. */
export function drawGlyph(ctx, id, x, y, s, col, rot = 0, alpha = 1) {
  const spr = glyphSprite(id, col), d = BOX * s;
  ctx.globalAlpha = alpha;
  if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(spr, -d / 2, -d / 2, d, d); ctx.restore(); }
  else ctx.drawImage(spr, x - d / 2, y - d / 2, d, d);
  ctx.globalAlpha = 1;
}
/** A projectile-sized glyph with its halo (used by drawShape for any 'n_*' fx: orbiters, rain, minion notes). */
export function drawNoteShape(ctx, id, s, t, tier = 0) {
  const T = TIERS[tier] || TIERS[0], r = 12 * s;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.42;
  ctx.drawImage(glowSprite(T.glow), -r, -r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  drawGlyph(ctx, id, 0, 0, s * 1.15, T.note, Math.sin(t * 7 + s) * 0.22);
}

// ---------------------------------------------------------------- the particle staff
/**
 * Five wavy staff lines of glowing particles through screen points `pts` (newest first): tier colours,
 * t = time (the wave travels), s = scale, alpha; fade = thin out toward the tail. Lines are offset perpendicular to the path.
 */
export function drawStaff(ctx, pts, tier, t, s = 1, alpha = 1, seed = 0, fade = true) {
  const n = pts.length;
  if (n < 2) return;
  const T = TIERS[tier] || TIERS[0], gap = 2.6 * s, amp = (1.1 + tier * 0.75) * s, step = G.touch ? 2 : 1;
  const dot = (1.5 + tier * 0.3) * s;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.lineWidth = tier >= 2 ? 1.3 : 1;
  for (let li = 0; li < 5; li++) {
    const col = tier === 4 ? RAINBOW[(li * 2 + Math.floor(t * 9)) % 12] : T.staff;
    const spr = glowSprite(col);
    ctx.strokeStyle = col;
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = a[0] - b[0], dy = a[1] - b[1];
      const len = Math.hypot(dx, dy);
      if (len < 0.01) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
      const k = fade ? i / (n - 1) : 0;
      const off = (li - 2) * gap * (1 + k * 0.35) + Math.sin(i * 0.8 - t * 9 + seed + li * 0.35) * amp * (fade ? Math.min(1, i / 3) : 1);
      const x = pts[i][0] - dy * off, y = pts[i][1] + dx * off;
      xs.push(x); ys.push(y);
      if (i % step === 0) { ctx.globalAlpha = alpha * (1 - k); const r = dot * (1 - k * 0.5) * 2.2; ctx.drawImage(spr, x - r, y - r, r * 2, r * 2); }
    }
    // the thin line under the dots, in one stroke (its far half fainter)
    const half = Math.ceil(n / 2);
    for (let h = 0; h < 2; h++) {
      ctx.globalAlpha = alpha * (h ? (fade ? 0.18 : 0.45) : 0.45);
      ctx.beginPath();
      for (let i = h ? half - 1 : 0; i < (h ? n : half); i++) i === (h ? half - 1 : 0) ? ctx.moveTo(xs[i], ys[i]) : ctx.lineTo(xs[i], ys[i]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Tier particles shed by a flying note (motes, falling mini notes, light, rainbow sparks). */
export function noteParticles(x, y, z, tier, dt, s = 1) {
  if (tier <= 0) { if (chance(dt * 4)) spawn({ type: 'glow', x, y, z, vz: rand(-6, 6), life: 0.35, size: 1.6 * s, size1: 0, color: TIERS[0].spark, add: true }); return; }
  const T = TIERS[tier], mob = G.touch ? 0.5 : 1;
  if (chance(dt * 12 * mob)) spawn({ type: 'glow', x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: z + rand(-6, 6), vz: rand(-10, 25), drag: 2, life: rand(0.3, 0.6), size: rand(1.4, 2.4) * s, size1: 0, color: T.spark, add: true });
  if (tier >= 2 && chance(dt * 3.5 * mob)) spawn({ type: 'img', img: glyphSprite(['q', 'e', 's', 'e2'][Math.floor(rand(4))], tier === 4 ? RAINBOW[Math.floor(rand(12))] : T.staff), x, y, z, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(10, 40), g: 30, life: rand(0.6, 1), size: rand(14, 20) * s, size1: 6 });
  if (tier >= 4 && chance(dt * 14 * mob)) { const a = rand(TAU); spawn({ type: 'streak', x, y, z, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, vz: rand(-20, 40), drag: 3, life: 0.35, size: 1.6, color: RAINBOW[Math.floor(rand(12))], add: true }); }
}

/** A burst of glyphs and motes where a note lands or a cadence plays. */
export function noteBurst(x, y, z, tier, n = 6, glyphs = ['q', 'e', 's', 'e2']) {
  const T = TIERS[tier] || TIERS[0], mob = G.touch ? 0.6 : 1;
  for (let i = 0; i < n * mob; i++) {
    const a = rand(TAU), v = rand(1, 3);
    spawn({ type: 'img', img: glyphSprite(glyphs[i % glyphs.length], tier === 4 ? RAINBOW[i % 12] : T.staff), x, y, z: z + rand(-4, 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(40, 110), g: 120, drag: 1.2, life: rand(0.6, 1.1), size: rand(14, 22), size1: 4 });
  }
  for (let i = 0; i < n * 1.5 * mob; i++) { const a = rand(TAU), v = rand(1.5, 4); spawn({ type: 'glow', x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(-20, 60), drag: 2, life: rand(0.3, 0.7), size: rand(1.5, 3), size1: 0, color: i % 2 ? T.spark : T.glow, add: true }); }
}

// ---------------------------------------------------------------- cosmetic note flights
/** A glyph with its staff flying from one point to another (tile coords + z): the visible "shot" of non-projectile skills. */
export class NoteFlight {
  constructor(o) {
    Object.assign(this, { t: 0, dur: 0.45, arc: 0, s: 1, tier: 0, glyph: 'q', delay: 0, seed: rand(TAU), burst: 4 }, o);
    this.hist = []; this.x = this.x0; this.y = this.y0; this.z = this.z0;
  }
  update(dt) {
    if (this.delay > 0) { this.delay -= dt; return true; }
    this.t += dt;
    const k = Math.min(1, this.t / this.dur), e = this.ease ? 1 - (1 - k) * (1 - k) : k;
    this.x = this.x0 + (this.x1 - this.x0) * e; this.y = this.y0 + (this.y1 - this.y0) * e;
    this.z = this.z0 + (this.z1 - this.z0) * e + this.arc * 4 * k * (1 - k);
    const h = this.hist;
    h.unshift([this.x, this.y, this.z]); if (h.length > 14) h.pop();
    noteParticles(this.x, this.y, this.z, this.tier, dt, this.s);
    if (k >= 1) { if (this.burst) noteBurst(this.x, this.y, this.z, this.tier, this.burst, [this.glyph]); return false; }
    return true;
  }
  draw(ctx) {
    if (this.delay > 0 || !this.hist.length) return;
    const pts = this.hist.map(([x, y, z]) => [isoX(x, y), isoY(x, y) - z]);
    drawStaff(ctx, pts, this.tier, this.t, this.s, 0.9, this.seed);
    ctx.save(); ctx.translate(pts[0][0], pts[0][1]); drawNoteShape(ctx, this.glyph, this.s, this.t, this.tier); ctx.restore();
  }
}
export const flyNote = (o) => addEffect(new NoteFlight(o));

// ---------------------------------------------------------------- the measure over the Bard's head
const HARM = ['#f2e6c4', '#7cd4ff', '#62ffa4', '#ffd84a', '#ff72d2', '#ffffff'];
/** Screen position (world px) of beat position `at` on the Bard's staff. */
export function scoreSlot(p, at) {
  const W = G.touch ? 60 : 76;
  const x0 = isoX(p.x, p.y) - W / 2, y = isoY(p.x, p.y) - (p.spriteH || 60) - 30;
  return [x0 + 15 + (at / MEASURE) * (W - 20), y];
}
/** Tile-space offset (dx, dy, z) of a staff slot, so cadence notes can launch from the very spot they were written. */
export function scoreWorld(p, at) {
  const [sx, sy] = scoreSlot(p, at), bx = isoX(p.x, p.y), by = isoY(p.x, p.y);
  const d = (sx - bx) / (2 * HW);
  return [p.x + d, p.y - d, by - sy];
}
export class ScoreFx {
  constructor(p) { this.p = p; this.layer = 'top'; this.t = 0; }
  update(dt) { this.t += dt; return !this.p.dead && this.p.score && this.p.world && G.player === this.p; }
  draw(ctx) {
    const p = this.p, sc = p.score;
    if (!sc || (p.world && p.world.kind === 'town') || G.settings.bardScore === false) return;
    const W = G.touch ? 60 : 76, gap = G.touch ? 2.6 : 3.2;
    const cx = isoX(p.x, p.y), top = isoY(p.x, p.y) - (p.spriteH || 60) - 30 - gap * 2;
    const x0 = cx - W / 2, busy = sc.notes.length || sc.flash > 0 || sc.discord > 0;
    const a = busy ? 1 : 0.4;
    const shake = sc.discord > 0 ? Math.sin(this.t * 70) * 2.5 * sc.discord : 0;
    const col = sc.discord > 0 ? '#ff5050' : HARM[Math.min(5, sc.harmony)];
    ctx.save();
    ctx.translate(shake, 0);
    // a dark wash so it reads over any floor
    ctx.globalAlpha = 0.38 * a; ctx.fillStyle = '#0a0610';
    ctx.fillRect(x0 - 3, top - 8, W + 6, gap * 4 + 16);
    ctx.globalCompositeOperation = 'lighter';
    // fill progress under the lines
    const fill = Math.min(1, sc.beats / MEASURE);
    if (fill > 0) { ctx.globalAlpha = 0.18 * a; ctx.fillStyle = col; ctx.fillRect(x0 + 12, top - 1, (W - 16) * fill, gap * 4 + 2); }
    ctx.globalAlpha = (0.55 + (sc.flash > 0 ? 0.45 * sc.flash : 0)) * a; ctx.strokeStyle = sc.flash > 0 ? '#ffffff' : col; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = top + i * gap + Math.sin(this.t * 3 + i * 0.7) * (sc.harmony >= 3 ? 0.6 : 0);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + W, y); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x0 + W, top); ctx.lineTo(x0 + W, top + gap * 4); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + W - 2.5, top); ctx.lineTo(x0 + W - 2.5, top + gap * 4); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    const gs = G.touch ? 0.42 : 0.5;
    drawGlyph(ctx, sc.key === 'bass' ? 'bass' : 'treble', x0 + 6, top + gap * 2 + (sc.key === 'bass' ? -1 : 0), sc.key === 'bass' ? gs * 0.8 : gs * 1.05, col, 0, a);
    for (const nt of sc.notes) {
      const [nx] = scoreSlot(p, nt.at + Math.min(0.5, NOTES[nt.g].beats / 2) * 0.6);
      const bob = Math.sin(this.t * 6 + nt.at * 2) * 0.8, rest = NOTES[nt.g].rest;
      drawGlyph(ctx, nt.g, nx, top + gap * 2 + (rest ? 0 : -1) + bob, gs, TIERS[nt.tier].note, 0, a);
    }
    // harmony pips
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = (i < sc.harmony ? 1 : 0.25) * a; ctx.fillStyle = i < sc.harmony ? HARM[Math.min(5, i + 1)] : '#806a80';
      ctx.beginPath(); ctx.arc(cx - 10 + i * 5, top + gap * 4 + 5, 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
/** A ring of glyphs springing off the staff when a measure completes. */
export function cadenceFx(p, tier, glyphs) {
  addEffect(new Ring(p.x, p.y, 0.2, 2.4, 0.5, TIERS[tier].glow, 4, { fill: true }));
  addEffect(new Ring(p.x, p.y, 0.1, 3.2, 0.7, TIERS[tier].staff, 2));
  const [wx, wy, wz] = scoreWorld(p, 2);
  noteBurst(wx, wy, wz, tier, 8, glyphs.length ? glyphs : ['q']);
}
