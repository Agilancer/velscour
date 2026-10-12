// Particles, blood & gore, decals, spell effects and floating combat text.
import { G } from '../state.js';
import { camera, isoX, isoY, HW, HH } from '../core/view.js';
import { makeCanvas, rand, TAU, hexToRgb, shade, randi, pick } from '../core/util.js';

export const ELEM = {
  phys: { name: 'Physical', core: '#ffffff', glow: '#e0d8c8', dark: '#7a7060', sfx: 'phys' },
  fire: { name: 'Fire', core: '#fff3a0', glow: '#ff7a10', dark: '#c02000', sfx: 'fire' },
  cold: { name: 'Cold', core: '#f0ffff', glow: '#60c8ff', dark: '#1a50d0', sfx: 'cold' },
  light: { name: 'Lightning', core: '#ffffff', glow: '#a8ccff', dark: '#4a64ff', sfx: 'light' },
  poison: { name: 'Poison', core: '#e8ff90', glow: '#70e020', dark: '#206010', sfx: 'poison' },
  arcane: { name: 'Arcane', core: '#ffe0ff', glow: '#c060ff', dark: '#5a10c0', sfx: 'arcane' },
  holy: { name: 'Holy', core: '#fffff0', glow: '#ffd860', dark: '#d08a00', sfx: 'holy' },
  shadow: { name: 'Shadow', core: '#e8c0ff', glow: '#9030d0', dark: '#280038', sfx: 'shadow' },
  blood: { name: 'Blood', core: '#ffa0a0', glow: '#e01010', dark: '#5a0000', sfx: 'blood' },
  acid: { name: 'Acid', core: '#d8f0ff', glow: '#3a8cff', dark: '#0c2aa0', sfx: 'acid' }, // the Slime Lord's blue ooze
};
export const elem = (k) => ELEM[k] || ELEM.phys;

const MAX_P = () => (G.touch ? 1400 : 3000);
export const particles = [];
export const decals = [];
export const effects = [];
export const texts = [];
export const lights = [];

// ---------------------------------------------------------------- caches
const glowCache = new Map();
export function glowSprite(color) {
  let c = glowCache.get(color);
  if (c) return c;
  c = makeCanvas(64, 64);
  const x = c.getContext('2d');
  const [r, g, b] = hexToRgb(color);
  const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.25, `rgba(${r},${g},${b},.6)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad; x.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}

const splatMasks = [];
function makeSplatMasks() {
  for (let i = 0; i < 8; i++) {
    const c = makeCanvas(64, 64);
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    const blobs = randi(5, 11);
    x.beginPath(); x.arc(32, 32, rand(9, 14), 0, TAU); x.fill();
    for (let j = 0; j < blobs; j++) {
      const a = rand(TAU), d = rand(4, 22), r = rand(2, 8);
      x.beginPath(); x.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, r, 0, TAU); x.fill();
      if (Math.random() < 0.5) { x.beginPath(); x.arc(32 + Math.cos(a) * (d + r + 3), 32 + Math.sin(a) * (d + r + 3), r * 0.4, 0, TAU); x.fill(); }
    }
    splatMasks.push(c);
  }
}
const splatCache = new Map();
function splatSprite(color, idx) {
  if (!splatMasks.length) makeSplatMasks();
  const key = color + idx;
  let c = splatCache.get(key);
  if (c) return c;
  c = makeCanvas(64, 64);
  const x = c.getContext('2d');
  x.drawImage(splatMasks[idx], 0, 0);
  x.globalCompositeOperation = 'source-in';
  const grad = x.createRadialGradient(28, 26, 2, 32, 32, 34);
  grad.addColorStop(0, shade(color, 0.12)); grad.addColorStop(1, shade(color, -0.35));
  x.fillStyle = grad; x.fillRect(0, 0, 64, 64);
  splatCache.set(key, c);
  return c;
}

// ------------------------------------------------------------- particles
/**
 * type: 'dot' | 'glow' | 'blood' | 'gib' | 'streak' | 'smoke' | 'shard' | 'img'
 */
export function spawn(p) {
  if (particles.length >= MAX_P()) particles.shift();
  p.life = p.life ?? 0.6; p.max = p.life;
  p.z = p.z ?? 0; p.vx = p.vx ?? 0; p.vy = p.vy ?? 0; p.vz = p.vz ?? 0;
  p.g = p.g ?? 0; p.drag = p.drag ?? 0; p.size = p.size ?? 2; p.size1 = p.size1 ?? p.size;
  p.rot = p.rot ?? 0; p.vr = p.vr ?? 0;
  particles.push(p);
  return p;
}

export function burst(x, y, z, el, n = 12, speed = 3, opts = {}) {
  const E = elem(el);
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(0.3, 1) * speed;
    spawn({
      type: opts.type || (i % 3 === 0 ? 'glow' : 'dot'), x, y, z: z + rand(-4, 4),
      vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(-20, 60) * (opts.up ?? 1),
      g: opts.g ?? 60, drag: 2, life: rand(0.25, 0.7) * (opts.life ?? 1),
      size: rand(1.5, 3.5) * (opts.size ?? 1), size1: 0.3, color: i % 2 ? E.core : E.glow, add: true,
    });
  }
}

export function sparkle(x, y, z, color, n = 1, spread = 0.3) {
  for (let i = 0; i < n; i++) {
    spawn({ type: 'glow', x: x + rand(-spread, spread), y: y + rand(-spread, spread), z: z + rand(-6, 6), vz: rand(5, 30), life: rand(0.3, 0.7), size: rand(2, 4.5), size1: 0, color, add: true });
  }
}

export function smoke(x, y, z, color = '#2a2420', n = 4, size = 8) {
  for (let i = 0; i < n; i++) {
    spawn({ type: 'smoke', x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), z: z + rand(0, 10), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(10, 30), life: rand(0.8, 1.6), size: size * rand(0.6, 1), size1: size * 2.2, color, alpha: 0.45 });
  }
}

/** Blood spray: angle = direction of travel in tile space. */
export function bloodSpray(x, y, z, angle, n, color, force = 1) {
  if (G.settings.gore === 0) { burst(x, y, z, 'phys', Math.ceil(n / 3), 2); return; }
  n = Math.round(n * (G.settings.gore === 2 ? 1.6 : 1));
  for (let i = 0; i < n; i++) {
    const a = angle + rand(-0.9, 0.9), s = rand(0.8, 4.5) * force;
    spawn({
      type: 'blood', x, y, z: z + rand(-6, 6), vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      vz: rand(20, 110) * force, g: 260, drag: 0.6, life: 2, size: rand(1.2, 3.2), color: i % 4 ? color : shade(color, -0.3),
    });
  }
}

export function gibs(x, y, z, n, color, boneColor = '#e8dcc0', force = 1) {
  if (G.settings.gore === 0) return;
  n = Math.round(n * (G.settings.gore === 2 ? 1.5 : 1));
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(1, 5) * force;
    const bone = Math.random() < 0.3;
    spawn({
      type: 'gib', x, y, z: z + rand(0, 14), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(60, 200) * force,
      g: 420, drag: 0.5, life: rand(4, 9), size: rand(2, 5.5), color: bone ? boneColor : color,
      blood: bone ? null : color, rot: rand(TAU), vr: rand(-12, 12), bounces: 0, w: rand(0.6, 1.4),
    });
  }
}

// ----------------------------------------------------------------- decals
export function addDecal(x, y, color, size = 1, kind = 'splat', alpha = 0.9) {
  if (kind === 'splat' && G.settings.gore === 0) return;
  const max = G.touch ? 500 : 1100;
  if (decals.length >= max) decals.shift();
  decals.push({ x, y, color, size, kind, alpha, rot: rand(TAU), idx: randi(0, 7), grow: kind === 'pool' ? 0 : 1, life: kind === 'scorch' || kind === 'frost' ? 14 : 9999, t: 0 });
}

// ---------------------------------------------------------------- effects
export class Ring {
  constructor(x, y, r0, r1, dur, color, width = 4, opts = {}) {
    Object.assign(this, { x, y, r0, r1, dur, color, width, t: 0, z: opts.z || 2, fill: opts.fill || false, add: opts.add ?? true });
  }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur, r = this.r0 + (this.r1 - this.r0) * (1 - Math.pow(1 - k, 2));
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = this.color; ctx.lineWidth = this.width * (1 - k * 0.5);
    ctx.beginPath(); ctx.ellipse(px, py, r * HW * 1.41, r * HH * 1.41, 0, 0, TAU); ctx.stroke();
    if (this.fill) { ctx.globalAlpha = (1 - k) * 0.25; ctx.fillStyle = this.color; ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

export class Slash {
  constructor(x, y, ang, arc, r, dur, color, opts = {}) {
    Object.assign(this, { x, y, ang, arc, r, dur, color, t: 0, z: opts.z ?? 22, width: opts.width || 10, style: opts.style || 'slash', flip: opts.flip ? -1 : 1 });
  }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur;
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z;
    // convert tile angle into screen ellipse arc
    const R = this.r * HW * 1.41;
    ctx.save();
    ctx.translate(px, py); ctx.scale(1, 0.55);
    const sa = screenAngle(this.ang);
    const span = this.arc;
    const head = sa - this.flip * span / 2 + this.flip * span * Math.min(1, k * 1.8);
    const tail = sa - this.flip * span / 2 + this.flip * span * Math.max(0, k * 1.8 - 0.7);
    ctx.globalAlpha = 1 - k * k;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i === 0 ? this.color : i === 1 ? shade(this.color, 0.5) : '#ffffff';
      ctx.lineWidth = this.width * (1 - i * 0.33);
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (this.flip > 0) ctx.arc(0, 0, R * (1 - i * 0.04), tail, head); else ctx.arc(0, 0, R * (1 - i * 0.04), head, tail);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
/** Tile-space angle -> screen-space angle (iso), used to orient 2D effects. */
export function screenAngle(a) {
  const dx = Math.cos(a), dy = Math.sin(a);
  return Math.atan2((dx + dy) * HH, (dx - dy) * HW);
}

export class Bolt {
  // jagged lightning between two points (tile coords + z)
  constructor(x0, y0, z0, x1, y1, z1, color, dur = 0.25, width = 3) {
    Object.assign(this, { x0, y0, z0, x1, y1, z1, color, dur, width, t: 0, seg: null, regen: 0 });
  }
  build() {
    const ax = isoX(this.x0, this.y0), ay = isoY(this.x0, this.y0) - this.z0;
    const bx = isoX(this.x1, this.y1), by = isoY(this.x1, this.y1) - this.z1;
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(3, Math.floor(len / 12));
    const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
    const pts = [[ax, ay]];
    for (let i = 1; i < n; i++) {
      const t = i / n, off = rand(-1, 1) * Math.min(18, len * 0.12);
      pts.push([ax + (bx - ax) * t + nx * off, ay + (by - ay) * t + ny * off]);
    }
    pts.push([bx, by]);
    this.seg = pts;
  }
  update(dt) {
    this.t += dt; this.regen -= dt;
    if (this.regen <= 0) { this.build(); this.regen = 0.05; }
    return this.t < this.dur;
  }
  draw(ctx) {
    if (!this.seg) this.build();
    const k = this.t / this.dur;
    ctx.globalAlpha = 1 - k * 0.7;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? '#ffffff' : this.color;
      ctx.lineWidth = pass ? this.width * 0.4 : this.width * 1.8;
      ctx.beginPath();
      this.seg.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

export class Beam {
  constructor(x0, y0, x1, y1, color, width, dur, opts = {}) {
    Object.assign(this, { x0, y0, x1, y1, color, width, dur, t: 0, z: opts.z ?? 24, core: opts.core || '#ffffff', wobble: opts.wobble ?? 1 });
  }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur;
    const ax = isoX(this.x0, this.y0), ay = isoY(this.x0, this.y0) - this.z;
    const bx = isoX(this.x1, this.y1), by = isoY(this.x1, this.y1) - this.z * 0.6;
    const w = this.width * (1 - k * 0.6) * (1 + Math.sin(G.time * 40) * 0.12 * this.wobble);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35 * (1 - k); ctx.strokeStyle = this.color; ctx.lineWidth = w * 2.6;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.globalAlpha = 0.9 * (1 - k * 0.5); ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = this.core; ctx.lineWidth = w * 0.35;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export class Column {
  // vertical light/fire column from the sky
  constructor(x, y, color, dur = 0.5, width = 18, height = 260) { Object.assign(this, { x, y, color, dur, width, height, t: 0 }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur;
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y);
    const w = this.width * (1 - k);
    const g = ctx.createLinearGradient(px, py - this.height, px, py);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, this.color); g.addColorStop(1, '#ffffff');
    ctx.globalAlpha = 1 - k * 0.5;
    ctx.fillStyle = g; ctx.fillRect(px - w / 2, py - this.height, w, this.height);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px - w / 6, py - this.height, w / 3, this.height);
    ctx.globalAlpha = 1;
  }
}

export class Telegraph {
  // ground warning marker for enemy attacks: circle or line
  constructor(opts) { Object.assign(this, { t: 0, color: '#ff2a10' }, opts); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur;
    ctx.save();
    if (this.kind === 'line') {
      const ax = isoX(this.x, this.y), ay = isoY(this.x, this.y);
      const bx = isoX(this.x + Math.cos(this.ang) * this.len, this.y + Math.sin(this.ang) * this.len);
      const by = isoY(this.x + Math.cos(this.ang) * this.len, this.y + Math.sin(this.ang) * this.len);
      ctx.globalAlpha = 0.25 + k * 0.35; ctx.strokeStyle = this.color; ctx.lineWidth = this.w * HW;
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    } else {
      const px = isoX(this.x, this.y), py = isoY(this.x, this.y);
      ctx.globalAlpha = 0.6; ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(px, py, this.r * HW * 1.41, this.r * HH * 1.41, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.18 + 0.2 * k; ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(px, py, this.r * HW * 1.41 * k, this.r * HH * 1.41 * k, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

export class Sprite {
  // a sprite that fades / scales out at a world position
  constructor(x, y, z, img, w, h, dur, opts = {}) { Object.assign(this, { x, y, z, img, w, h, dur, t: 0, add: opts.add || false, rise: opts.rise || 0, grow: opts.grow || 0 }); }
  update(dt) { this.t += dt; this.z += this.rise * dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur, s = 1 + this.grow * k;
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z;
    ctx.globalAlpha = 1 - k;
    ctx.drawImage(this.img, px - this.w * s / 2, py - this.h * s / 2, this.w * s, this.h * s);
    ctx.globalAlpha = 1;
  }
}

export function addEffect(e, layer = 'top') { e.layer = layer; effects.push(e); return e; }

export function floatText(x, y, z, text, color = '#fff', size = 14, opts = {}) {
  if (texts.length > 120) texts.shift();
  texts.push({ x, y, z, text, color, size, life: opts.life || 0.9, max: opts.life || 0.9, vz: opts.vz ?? 45, dx: rand(-10, 10), crit: opts.crit, dmg: opts.dmg });
}

export function addLight(x, y, radius, intensity = 1) {
  if (lights.length < 48) lights.push({ x, y, radius, intensity });
}

export function clearVfx() {
  particles.length = 0; decals.length = 0; effects.length = 0; texts.length = 0; lights.length = 0;
}

// --------------------------------------------------------------- update
export function updateVfx(dt, world) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const drag = Math.max(0, 1 - p.drag * dt);
    p.vx *= drag; p.vy *= drag;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vz -= p.g * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
    if (p.type === 'blood') {
      if (p.z <= 0) {
        if (world && world.map.isFloor(p.x, p.y) && Math.random() < 0.55) addDecal(p.x, p.y, p.color, rand(0.12, 0.3) * p.size / 2);
        particles.splice(i, 1);
      }
    } else if (p.type === 'gib') {
      if (world && !world.map.isFloor(p.x, p.y)) { p.vx *= -0.5; p.vy *= -0.5; p.x += p.vx * dt * 2; p.y += p.vy * dt * 2; }
      if (p.z <= 0) {
        p.z = 0;
        if (p.vz < -40 && p.bounces < 2) {
          p.vz *= -0.35; p.bounces++; p.vx *= 0.6; p.vy *= 0.6; p.vr *= 0.5;
          if (p.blood) addDecal(p.x, p.y, p.blood, rand(0.25, 0.5));
        } else { p.vz = 0; p.vx *= 0.8; p.vy *= 0.8; p.vr = 0; }
      } else if (p.blood && Math.random() < dt * 14) {
        spawn({ type: 'blood', x: p.x, y: p.y, z: p.z, vz: 0, g: 260, life: 1, size: 1.4, color: p.blood });
      }
    } else if (p.type !== 'smoke' && p.g > 0 && p.z < 0) { p.z = 0; p.vz *= -0.3; }
  }
  for (const d of decals) {
    if (d.grow < 1) d.grow = Math.min(1, d.grow + dt * 1.2);
    if (d.life < 9999) d.life -= dt;
  }
  for (let i = decals.length - 1; i >= 0; i--) if (decals[i].life <= 0) decals.splice(i, 1);
  for (let i = effects.length - 1; i >= 0; i--) if (!effects[i].update(dt)) effects.splice(i, 1);
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt; t.z += t.vz * dt; t.vz *= 0.94;
    if (t.life <= 0) texts.splice(i, 1);
  }
}

// ----------------------------------------------------------------- draw
export function drawDecals(ctx, vr) {
  for (const d of decals) {
    const px = isoX(d.x, d.y), py = isoY(d.x, d.y);
    if (px < vr.x0 - 80 || px > vr.x1 + 80 || py < vr.y0 - 60 || py > vr.y1 + 60) continue;
    const s = d.size * HW * 1.6 * (d.kind === 'pool' ? 0.3 + 0.7 * d.grow : 1);
    let a = d.alpha;
    if (d.life < 3) a *= d.life / 3;
    ctx.globalAlpha = a;
    if (d.kind === 'splat' || d.kind === 'pool') {
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.5); ctx.rotate(d.rot);
      ctx.drawImage(splatSprite(d.color, d.idx), -s, -s, s * 2, s * 2);
      ctx.restore();
    } else if (d.kind === 'scorch') {
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.ellipse(px, py, s, s * 0.5, 0, 0, TAU); ctx.fill();
    } else if (d.kind === 'frost') {
      ctx.fillStyle = 'rgba(180,230,255,0.35)';
      ctx.beginPath(); ctx.ellipse(px, py, s, s * 0.5, 0, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawEffects(ctx, layer) {
  for (const e of effects) {
    if (e.layer !== layer) continue;
    if (e.add) ctx.globalCompositeOperation = 'lighter';
    e.draw(ctx);
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function drawParticles(ctx, vr) {
  let mode = 'source-over';
  for (const p of particles) {
    const px = isoX(p.x, p.y), py = isoY(p.x, p.y) - p.z;
    if (px < vr.x0 - 20 || px > vr.x1 + 20 || py < vr.y0 - 40 || py > vr.y1 + 20) continue;
    const k = 1 - p.life / p.max;
    const size = p.size + (p.size1 - p.size) * k;
    const want = p.add ? 'lighter' : 'source-over';
    if (want !== mode) { ctx.globalCompositeOperation = want; mode = want; }
    switch (p.type) {
      case 'glow': {
        ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
        const s = size * 3;
        ctx.drawImage(glowSprite(p.color), px - s, py - s, s * 2, s * 2);
        break;
      }
      case 'smoke':
        ctx.globalAlpha = (p.alpha ?? 0.4) * (1 - k);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(px, py, size, 0, TAU); ctx.fill();
        break;
      case 'streak': {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = p.color; ctx.lineWidth = size;
        const ex = isoX(p.x - p.vx * 0.05, p.y - p.vy * 0.05), ey = isoY(p.x - p.vx * 0.05, p.y - p.vy * 0.05) - p.z + p.vz * 0.05;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
        break;
      }
      case 'gib': {
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.save(); ctx.translate(px, py); ctx.rotate(p.rot);
        ctx.fillStyle = '#100404'; ctx.fillRect(-size * p.w - 0.6, -size / 2 - 0.6, size * p.w * 2 + 1.2, size + 1.2);
        ctx.fillStyle = p.color; ctx.fillRect(-size * p.w, -size / 2, size * p.w * 2, size);
        ctx.fillStyle = shade(p.color, 0.25); ctx.fillRect(-size * p.w, -size / 2, size * p.w, size / 2.5);
        ctx.restore();
        break;
      }
      case 'shard':
        ctx.globalAlpha = 1 - k; ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(px, py); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.moveTo(0, -size * 1.6); ctx.lineTo(size * 0.6, 0); ctx.lineTo(0, size * 1.6); ctx.lineTo(-size * 0.6, 0); ctx.fill();
        ctx.restore();
        break;
      case 'img':
        ctx.globalAlpha = 1 - k;
        ctx.drawImage(p.img, px - size / 2, py - size / 2, size, size);
        break;
      default:
        ctx.globalAlpha = p.type === 'blood' ? 1 : 1 - k * 0.6;
        ctx.fillStyle = p.color;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** Floating combat text in screen space (call with identity transform). */
export function drawTexts(ctx) {
  ctx.textAlign = 'center';
  for (const t of texts) {
    if (!G.settings.dmgNumbers && t.dmg) continue;
    const [sx, sy] = camera.tileToScreen(t.x, t.y, t.z);
    const k = t.life / t.max;
    const pop = t.crit ? 1 + Math.max(0, (k - 0.75)) * 3 : 1;
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.font = `${t.crit ? 900 : 700} ${Math.round(t.size * pop * G.dpr)}px Cinzel, Georgia, serif`;
    ctx.lineWidth = 3 * G.dpr; ctx.strokeStyle = '#000';
    ctx.strokeText(t.text, (sx + t.dx) * G.dpr, sy * G.dpr);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, (sx + t.dx) * G.dpr, sy * G.dpr);
  }
  ctx.globalAlpha = 1;
}

export { pick };
