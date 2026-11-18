// Shared effects of the Ninja and the Rogue: shadow copies of the hero (after-images that keep his pose, flip and
// all), cut lines through a foe, the great crescent a katana leaves, the grappling hook's rope, and blood.
import { G } from '../state.js';
import { TAU, rand, chance } from '../core/util.js';
import { isoX, isoY, HW, HH } from '../core/view.js';
import { glowSprite, bloodSpray, addDecal, addEffect, spawn, screenAngle } from './vfx.js';
import { drawBlade3D } from './blades3d.js';

export const SHADE = 'brightness(0.16) contrast(1.3)'; // a hero copy as a shadow (Creature.tintAs)
export const CYAN = '#7fe6ff', BLOOD = '#c80f1c';
const touch = () => (G.touch ? 0.6 : 1);

/** Draw hero p as he would stand at g = { x, y, z, flip, acro, alpha, tint, facing }: his own draw, moved and restored. */
export function drawGhost(ctx, p, g) {
  const keep = { x: p.x, y: p.y, z: p.z, flip: p.flip, alpha: p.alpha, acro: p.acro, moving: p.moving, lunge: p.lunge, tintAs: p.tintAs, screenTop: p.screenTop, sbox: p.sbox, lastArt: p.lastArt, facing: p.facing };
  Object.assign(p, { x: g.x, y: g.y, z: g.z || 0, flip: g.flip ?? p.flip, alpha: g.alpha ?? 0.5, acro: g.acro || null, moving: false, lunge: g.lunge || 0, tintAs: g.tint === undefined ? SHADE : g.tint, ghostDraw: true });
  if (g.facing !== undefined) p.facing = g.facing;
  try { p.draw(ctx); } finally { Object.assign(p, keep); p.ghostDraw = false; }
}

/** A copy of the hero left where he was, fading (a hazard: it sorts by depth with the creatures). */
export class AfterImage {
  constructor(p, o = {}) {
    Object.assign(this, { p, x: p.x, y: p.y, z: p.z, flip: p.flip, acro: p.acro ? { ...p.acro } : null, t: 0, life: 0.34, a: 0.55, tint: SHADE, glow: null, facing: p.facing }, o);
  }
  get depth() { return this.x + this.y - 0.02; }
  update(dt) { this.t += dt; return this.t < this.life && !this.p.dead && this.p.world === this.world; }
  draw(ctx) {
    const k = 1 - this.t / this.life;
    if (this.glow) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * k;
      const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z - 30;
      ctx.drawImage(glowSprite(this.glow), px - 30, py - 38, 60, 76);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    drawGhost(ctx, this.p, { x: this.x, y: this.y, z: this.z, flip: this.flip, acro: this.acro, alpha: this.a * k, tint: this.tint, facing: this.facing, lunge: this.lunge });
  }
}
/** Leave after-images behind hero p for `dur` seconds, one every `gap` (a dash, a leap, a flip). */
export function shadowTrail(p, dur, o = {}) {
  const w = p.world, gap = (o.gap || 0.045) / touch();
  let t = 0, acc = gap;
  w.addHazard({ update(dt) {
    t += dt; acc += dt;
    if (acc >= gap && !p.dead && p.world === w) { acc = 0; w.addHazard(new AfterImage(p, o)); }
    return t < dur && !p.dead;
  }, draw() {} });
}

/** A cut: a thin bright line through (x, y) at z, along screen angle `a`, that flashes white and fades to its colour. */
export class CutLine {
  constructor(x, y, a, o = {}) { Object.assign(this, { x, y, a, t: 0, dur: 0.32, len: 70, z: 26, color: CYAN, width: 5, delay: 0 }, o); }
  update(dt) { this.t += dt; return this.t < this.dur + this.delay; }
  draw(ctx) {
    const t = this.t - this.delay;
    if (t < 0) return;
    const k = t / this.dur, grow = Math.min(1, k * 5), px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.z;
    const dx = Math.cos(this.a) * this.len * 0.5, dy = Math.sin(this.a) * this.len * 0.5, h = -1 + 2 * grow;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [w, col, al] of [[this.width * 2.2, this.color, 0.35], [this.width, this.color, 0.9], [this.width * 0.4, '#ffffff', 1]]) {
      ctx.globalAlpha = al * (1 - k * k); ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.5, w * (1 - k * 0.7));
      ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx * h, py + dy * h); ctx.stroke();
    }
    ctx.restore();
  }
}
/** A cut along the tile-space line (x0, y0) -> (x1, y1). */
export function cutBetween(x0, y0, x1, y1, o = {}) {
  const ax = isoX(x0, y0), ay = isoY(x0, y0), bx = isoX(x1, y1), by = isoY(x1, y1);
  return addEffect(new CutLine((x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(by - ay, bx - ax), { len: Math.hypot(bx - ax, by - ay), ...o }));
}

/** The great crescent of a katana cut: a filled moon swept round the hero on the ground plane, bright at its edge. */
export class Crescent {
  constructor(x, y, ang, o = {}) { Object.assign(this, { x, y, ang, t: 0, dur: 0.24, r: 1.6, arc: 2.6, z: 24, color: CYAN, flip: 1, thick: 0.34 }, o); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = this.t / this.dur, R = this.r * HW * 1.41 * (0.75 + 0.3 * k), sa = screenAngle(this.ang);
    const sweep = this.arc * Math.min(1, k * 2.2), a0 = sa - this.flip * this.arc / 2, a1 = a0 + this.flip * sweep;
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    ctx.save(); ctx.translate(isoX(this.x, this.y), isoY(this.x, this.y) - this.z); ctx.scale(1, HH / HW * 1.1);
    ctx.globalCompositeOperation = 'lighter';
    const moon = (rOut, rIn, off) => { // a moon: the outer arc and a smaller circle pushed toward the tips
      ctx.beginPath(); ctx.arc(0, 0, rOut, lo, hi);
      const mid = (lo + hi) / 2; ctx.arc(-Math.cos(mid) * off, -Math.sin(mid) * off, rIn, hi - 0.25, lo + 0.25, true); ctx.closePath();
    };
    ctx.globalAlpha = 0.55 * (1 - k * k); ctx.fillStyle = this.color; moon(R, R * (1 - this.thick * 0.2), R * this.thick); ctx.fill();
    ctx.globalAlpha = 0.95 * (1 - k); ctx.fillStyle = '#ffffff'; moon(R, R * 0.985, R * this.thick * 0.28); ctx.fill();
    ctx.restore();
  }
}

/** The hook's rope: from the hero's hand to a point that flies out and comes back (o.at(t) -> [x, y, z] of the hook). */
export class Rope {
  constructor(p, at, o = {}) { Object.assign(this, { p, at, t: 0, dur: 0.6, color: '#b8a888', hand: 34, slack: 14 }, o); }
  update(dt) { this.t += dt; return this.t < this.dur && !this.p.dead; }
  draw(ctx) {
    const p = this.p, [hx, hy, hz] = this.at(this.t), u = this.t / this.dur;
    const ax = isoX(p.x, p.y) + (p.flip ? -8 : 8), ay = isoY(p.x, p.y) - this.hand - (p.z || 0), bx = isoX(hx, hy), by = isoY(hx, hy) - (hz || 0);
    const taut = typeof this.taut === 'function' ? this.taut() : this.taut;
    const sag = this.slack * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (taut ? 0.15 : 1), mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
    ctx.strokeStyle = this.color; ctx.lineWidth = 1.8; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
    ctx.setLineDash([]);
    const a = Math.atan2(by - my, bx - mx);
    if (!drawBlade3D(ctx, 'hook', bx, by, a, 1, this.t, { len: 26, spin: 9, glow: 0.3 })) { ctx.fillStyle = '#d0d8e0'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

/** A bloody cut on a foe: a crimson line through it, a spray along the blow, now and then a pool under it. */
export function bloodCut(t, ang, power = 1, color = null) {
  const w = t.world, col = color || (w && w.biome && w.biome.blood) || '#8a0b08';
  const sa = screenAngle(ang) + rand(-0.5, 0.5);
  addEffect(new CutLine(t.x, t.y, sa, { len: 44 + 18 * power, color: BLOOD, width: 4 + power, dur: 0.28, z: 24 + rand(-6, 8) }));
  bloodSpray(t.x, t.y, 24, ang, Math.round((5 + 4 * power) * touch()), col, 1 + power * 0.35);
  if (chance(0.25 + 0.15 * power)) addDecal(t.x + rand(-0.3, 0.3), t.y + rand(-0.3, 0.3), col, 0.5 + 0.25 * power, chance(0.5) ? 'pool' : 'splat');
}
/** Blood thrown outward from a point (a finisher's burst). */
export function bloodBurst(x, y, n, color, force = 1.6) {
  for (let i = 0; i < n; i++) bloodSpray(x, y, 20 + rand(0, 16), (i / n) * TAU + rand(-0.3, 0.3), Math.round(4 * touch()), color, force);
  addDecal(x, y, color, 1.1, 'pool');
}
/** Dust and chips where steel breaks the ground. */
export function dirtPop(x, y, color = '#5a4a40') {
  for (let i = 0; i < 4 * touch(); i++) spawn({ type: 'px', x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: 2, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), vz: rand(60, 150), g: 420, life: rand(0.3, 0.6), size: rand(1.5, 3), color });
}
