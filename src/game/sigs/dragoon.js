// Dragoon: Sky Lances. Each strike forges a spear of blue light that hangs behind his back; they fan out like a
// dragon's wings, four to a side (leaps forge two). Eight lances and he throws his arms wide: HEAVEN'S RAIN. The
// wings launch into the sky and come down one by one on every foe in reach as great lances in every leap's colours (the spear
// barrage's lances), nose-first along their path; each flings five smaller spears that arc out point-first, stick fast for half a second and burst in
// blue fire. Highwind (speed, damage) bears him up for a while.
import { G, later, stat, power, sigO, foesNear, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, addDecal, smoke, addLight } from '../../gfx/vfx.js';
import { drawLeapLance, leapStyle } from '../../gfx/lancefx.js';
import { aoe } from '../combat.js';

const MAX = 8, BLUE = '#6aa8ff', ICE = '#d8ecff';

/** One spear of light from (x, y) pointing along angle a (screen space). */
function lance(ctx, x, y, a, len, lit, t) {
  const dx = Math.cos(a), dy = Math.sin(a), ex = x + dx * len, ey = y + dy * len;
  ctx.lineCap = 'round';
  if (lit) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4; ctx.strokeStyle = BLUE; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = ICE; ctx.lineWidth = 2.2; ctx.stroke();
  } else { ctx.globalAlpha = 0.22; ctx.strokeStyle = '#8090b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); }
  // the diamond head
  const hx = ex + dx * 3, hy = ey + dy * 3, nx = -dy * 2.6, ny = dx * 2.6;
  ctx.fillStyle = lit ? '#ffffff' : '#8090b0';
  ctx.beginPath(); ctx.moveTo(ex - dx * 2, ey - dy * 2); ctx.lineTo(hx - nx, hy - ny); ctx.lineTo(hx + dx * 7, hy + dy * 7); ctx.lineTo(hx + nx, hy + ny); ctx.closePath(); ctx.fill();
  if (lit) glow(ctx, BLUE, hx, hy, 6 + Math.sin(t * 6) * 1.5, 0.7);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/** Where lance i hangs behind his back (screen offsets from his chest, angle, length). */
function slot(i, t, spread) {
  const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), a = -Math.PI / 2 + side * (0.42 + k * 0.36) * spread;
  return { a: a + Math.sin(t * 1.8 + i) * 0.03, len: (G.touch ? 26 : 32) - k * 3 };
}

// the falling spears are the spear barrage's lances (lancefx.js): every one in a different leap's colours
/** Screen position of tile (x, y) at height z. */
const scr = (x, y, z) => [isoX(x, y), isoY(x, y) - z];
/** Blue flame licking up from (x, y). */
function blueFire(x, y, n, r) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), d = rand(0, r);
    spawn({ type: 'glow', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: rand(0, 8), vx: Math.cos(a) * rand(0.2, 1), vy: Math.sin(a) * rand(0.2, 1), vz: rand(40, 110), life: rand(0.35, 0.7), size: rand(3, 5), size1: 0.5, color: i % 3 ? BLUE : i % 2 ? ICE : '#3a6aff', add: true });
  }
}

/** One of the five smaller spears the impact flings out: it arcs out point-first, sticks for half a second, then bursts in blue fire. */
class Splinter {
  constructor(p, x0, y0, x1, y1, si) { Object.assign(this, { p, x0, y0, x1, y1, si, st: leapStyle(si), t: 0, fly: 0.5, stick: 0.5, h: 70, x: x0, y: y0, z: 6 }); this.aim(0); }
  get depth() { return this.x + this.y + 0.5; }
  at(k) { return [this.x0 + (this.x1 - this.x0) * k, this.y0 + (this.y1 - this.y0) * k, 6 * (1 - k) + this.h * 4 * k * (1 - k)]; }
  aim(k) { // place it on its arc and point it down the arc's tangent: nose up on the climb, nose down on the fall
    const [x, y, z] = this.at(k), [nx, ny, nz] = this.at(Math.min(1, k + 0.02)), [sx, sy] = scr(x, y, z), [ex, ey] = scr(nx, ny, nz);
    Object.assign(this, { x, y, z, a: Math.atan2(ey - sy, ex - sx) });
  }
  update(dt) {
    this.t += dt;
    if (this.t < this.fly) {
      this.aim(Math.min(0.98, this.t / this.fly));
      if (Math.random() < 0.7) spawn({ type: 'glow', x: this.x, y: this.y, z: this.z, vz: 6, life: 0.3, size: 2.2, size1: 0, color: this.st.glow, add: true });
      return true;
    }
    if (!this.landed) { // it bites into the ground at the angle it fell
      this.landed = true; Object.assign(this, { x: this.x1, y: this.y1, z: 0 });
      for (let i = 0; i < 5; i++) spawn({ type: 'shard', x: this.x, y: this.y, z: 2, vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(40, 90), g: 300, life: 0.35, size: 2, color: '#8a7a68', rot: rand(TAU) });
      addDecal(this.x, this.y, 'rgba(10,20,40,0.4)', 0.3, 'scorch', 0.6);
      sfx('thud', 0.2);
    }
    if (Math.random() < 0.35) spawn({ type: 'glow', x: this.x + rand(-0.1, 0.1), y: this.y + rand(-0.1, 0.1), z: rand(4, 18), vz: 30, life: 0.3, size: 2, size1: 0, color: this.st.core, add: true });
    if (this.t < this.fly + this.stick) return true;
    const p = this.p; // and bursts into a little blue fireball
    aoe(p.world, p, this.x, this.y, 0.95, power(p) * 0.7, 'fire', sigO({ noArc: true }));
    addEffect(new Ring(this.x, this.y, 0.1, 1.05, 0.3, '#3a6aff', 4, { fill: true }));
    addEffect(new Ring(this.x, this.y, 0.1, 0.7, 0.22, ICE, 2));
    blueFire(this.x, this.y, 16, 0.6);
    smoke(this.x, this.y, 4, '#1a2448', 2, 10);
    addLight(this.x, this.y, 2.4, 1, 20, BLUE);
    camera.shake(1.2); sfx('fire', 0.3);
    return false;
  }
  draw(ctx) {
    const [px, py] = scr(this.x, this.y, this.z);
    if (!this.landed) {
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(...scr(this.x, this.y, 0), 5, 2, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      return drawLeapLance(ctx, this.si, px, py, this.a, 46, 1, this.t);
    }
    const k = (this.t - this.fly) / this.stick, sink = 5; // stuck fast, the tip buried, glowing hotter until it blows
    glow(ctx, '#3a6aff', px, py - 6, 10 + 14 * k + Math.sin(this.t * 40) * 2 * k, 0.3 + 0.5 * k);
    drawLeapLance(ctx, this.si, px + Math.cos(this.a) * sink, py + Math.sin(this.a) * sink, this.a, 46, 1, this.t);
  }
}

/** One great sky lance: it falls on a slant from high over the Dragoon's shoulder, nose-first along its own path. */
class SkyLance {
  constructor(p, x, y, si) {
    // it comes in from the hero's side of the screen: a tile step of (k, -k) is purely sideways on screen (64k px)
    const side = Math.sign(isoX(x, y) - isoX(p.x, p.y)) || (Math.random() < 0.5 ? -1 : 1), k = 3 * side;
    Object.assign(this, { p, x, y, si, st: leapStyle(si), sx: x - k, sy: y + k, z0: 420, t: 0, dur: 0.34 });
    const [ax, ay] = scr(this.sx, this.sy, this.z0), [bx, by] = scr(x, y, 0);
    this.a = Math.atan2(by - ay, bx - ax); // its exact screen path (a straight line), so it flies point-first
  }
  get depth() { return this.x + this.y + 0.5; }
  at(k) { const e = k * k * 0.45 + k * 0.55; return [this.sx + (this.x - this.sx) * e, this.sy + (this.y - this.sy) * e, this.z0 * (1 - e)]; }
  update(dt) {
    this.t += dt;
    const [x, y, z] = this.at(Math.max(0, Math.min(1, this.t / this.dur) - 0.06)); // shed from the shaft, behind the head
    for (let i = 0; i < 2; i++) spawn({ type: 'glow', x: x + rand(-0.1, 0.1), y: y + rand(-0.1, 0.1), z: z + rand(-6, 6), vz: rand(-10, 20), life: rand(0.2, 0.4), size: rand(1.5, 2.8), size1: 0, color: i ? this.st.glow : this.st.core, add: true });
    if (Math.random() < 0.6) spawn({ type: 'shard', x, y, z, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(-20, 30), life: 0.35, size: rand(1.5, 2.5), size1: 0.5, color: this.st.core, rot: this.a + Math.PI / 2, add: true });
    if (this.t < this.dur) return true;
    const p = this.p, w = p.world, { glow: G1, core: C1 } = this.st;
    aoe(w, p, this.x, this.y, 1.45, power(p) * 2.2, 'phys', sigO({ knock: 0.6, stun: true }));
    addEffect(new Ring(this.x, this.y, 0.1, 1.8, 0.4, G1, 6, { fill: true }));
    addEffect(new Ring(this.x, this.y, 0.1, 1.1, 0.3, '#ffffff', 3));
    addEffect(new Ring(this.x, this.y, 0.4, 2.4, 0.5, C1, 2));
    for (let i = 0; i < 18; i++) { const a = rand(TAU), v = rand(1.5, 4); spawn({ type: 'shard', x: this.x, y: this.y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(60, 160), g: 280, life: rand(0.35, 0.7), size: rand(2.5, 4), size1: 1, color: i % 2 ? C1 : G1, rot: a, add: true }); }
    for (let i = 0; i < 6; i++) spawn({ type: 'streak', x: this.x, y: this.y, z: 4, vz: rand(260, 420), life: 0.35, size: 2, color: i % 2 ? '#ffffff' : G1, add: true });
    blueFire(this.x, this.y, 12, 0.5);
    smoke(this.x, this.y, 6, '#3a3648', 2.5, 14);
    addLight(this.x, this.y, 4, 1.4, 30, G1);
    addDecal(this.x, this.y, 'rgba(10,20,40,0.5)', 0.7, 'scorch', 0.6);
    camera.shake(4); sfx('thud', 0.6);
    const off = rand(TAU); // five smaller spears fly out of the crater
    for (let i = 0; i < 5; i++) {
      const a = off + (i / 5) * TAU + rand(-0.2, 0.2), d = rand(1.8, 2.5);
      let tx = this.x + Math.cos(a) * d, ty = this.y + Math.sin(a) * d;
      if (!w.map.isFloor(tx, ty)) { tx = this.x + Math.cos(a) * d * 0.5; ty = this.y + Math.sin(a) * d * 0.5; }
      if (w.map.isFloor(tx, ty)) w.addHazard(new Splinter(p, this.x, this.y, tx, ty, this.si + 1 + i * 2));
    }
    return false;
  }
  draw(ctx) {
    const k = Math.min(1, this.t / this.dur), [x, y, z] = this.at(k), [px, py] = scr(x, y, z);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = this.st.glow; ctx.lineCap = 'round';
    for (let i = 3; i >= 1; i--) { // afterimages back along its path
      const [gx, gy, gz] = this.at(Math.max(0, k - i * 0.07)), [qx, qy] = scr(gx, gy, gz);
      ctx.globalAlpha = 0.5 / (i + 1); ctx.lineWidth = 9 - i * 2; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawLeapLance(ctx, this.si, px, py, this.a, 104, 1, this.t);
    ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(...scr(this.x, this.y, 0), 10 * k + 3, 4 * k + 1, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
}

export default {
  id: 'dragoon', name: 'Sky Lances', color: BLUE,
  desc: 'Each strike forges a spear of light behind his back, fanning out like a dragon\'s wings. Eight lances and HEAVEN\'S RAIN: they launch into the sky and fall on every foe in reach, and Highwind lifts him.',
  init: () => ({ n: 0, flash: 0, launch: 0 }),
  cast(p, s, sk) { this.add(s, sk.kind === 'leap' ? 2 : sk.m.free ? 0.34 : 1); },
  kill(p, s) { this.add(s, 0.25); },
  add(s, n) { if (s.launch > 0) return; const was = Math.floor(s.n); s.n = Math.min(MAX, s.n + n); if (Math.floor(s.n) > was) s.flash = 0.5; },
  update(p, s, dt) {
    s.flash = Math.max(0, s.flash - dt * 2);
    if (s.launch > 0) s.launch -= dt;
    if (s.n >= MAX && s.launch <= 0 && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (foesNear(p, p.x, p.y, 9).length) this.fire(p, s); }
  },
  fill: (s) => s.n / MAX,
  fire(p, s) {
    const w = p.world;
    s.n = 0; s.launch = 0.9;
    const foes = foesNear(p, p.x, p.y, 9.5), spots = [];
    for (let i = 0; i < MAX; i++) {
      const c = foes[i % Math.max(1, foes.length)];
      spots.push(c ? [c.x + rand(-0.4, 0.4), c.y + rand(-0.4, 0.4)] : [p.x + Math.cos((i / MAX) * TAU) * 3, p.y + Math.sin((i / MAX) * TAU) * 3]);
    }
    for (let i = 0; i < MAX; i++) { // the wings launch upward
      for (let j = 0; j < 4; j++) spawn({ type: 'streak', x: p.x + rand(-0.3, 0.3), y: p.y + rand(-0.3, 0.3), z: 40 + j * 10, vx: 0, vy: 0, vz: 520, life: 0.5, size: 2.5, color: j ? BLUE : '#ffffff', add: true });
      later(w, 0.45 + i * 0.07, () => { if (!p.dead && p.world === w) w.addHazard(new SkyLance(p, spots[i][0], spots[i][1], i)); });
    }
    p.addBuff({ id: 'sig_highwind', name: 'Highwind: +25% speed, +20% damage', el: 'light', fx: 'aura', stats: { speed: 40, dmg: 20 }, t: 6, max: 6 });
    floatText(p.x, p.y, 104, "HEAVEN'S RAIN", ICE, 19, { life: 1.8, vz: 16 });
    sfx('light', 0.7); sfx('roar', 0.3);
    stat('dragoon', 'fire');
  },
  back(ctx, p, s, t) {
    const px = isoX(p.x, p.y), py = isoY(p.x, p.y) - (p.z || 0) - 34 * (p.scale || 1), n = Math.floor(s.n);
    if (s.launch > 0.5) return;
    const spread = 0.85 + 0.15 * Math.min(1, s.n / MAX) + s.flash * 0.1;
    if (n) glow(ctx, BLUE, px, py - 6, 20 + n * 3, 0.15 + n * 0.04);
    for (let i = 0; i < MAX; i++) { const { a, len } = slot(i, t, spread); lance(ctx, px + Math.cos(a) * 4, py + Math.sin(a) * 4, a, len, i < n, t + i); }
  },
};
