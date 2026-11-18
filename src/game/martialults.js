// The Rogue's and the Ninja's F-key ultimates (game/smite.js executeUltimate): what is seen; `deal` lands the damage.
import { G } from '../state.js';
import { rand, TAU } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY, HW, HH } from '../core/view.js';
import { addEffect, Ring, burst, sparkle, addDecal, glowSprite } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { GiantBlade, GroundBlades, drawBlade3D } from '../gfx/blades3d.js';
import { CutLine, Crescent, bloodBurst, dirtPop, drawGhost, CYAN } from '../gfx/shadowfx.js';
import { ownBlade } from './rogue.js';

const after = (w, ms, fn) => setTimeout(() => { if (G.world === w && G.player && !G.player.dead) fn(); }, ms);

/** Daggers falling point-first over a circle (seen only). */
class BladeFall {
  constructor(x, y, r, n, dur) {
    Object.assign(this, { x, y, t: 0, dur });
    this.b = Array.from({ length: n }, () => { const a = rand(TAU), d = Math.sqrt(Math.random()) * r; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, at: rand(0, dur - 0.3), seed: rand(6), hit: false }; });
  }
  update(dt) { this.t += dt; return this.t < this.dur + 0.4; }
  draw(ctx) {
    for (const b of this.b) {
      const u = (this.t - b.at) / 0.26;
      if (u < 0 || u > 2.2) continue;
      const px = isoX(b.x, b.y), gy = isoY(b.x, b.y), z = u < 1 ? 300 * (1 - u * u) : 0;
      if (u >= 1 && !b.hit) { b.hit = true; dirtPop(b.x, b.y); }
      ctx.save(); ctx.globalAlpha *= u > 1.6 ? Math.max(0, (2.2 - u) / 0.6) : 1;
      if (u >= 1) { ctx.beginPath(); ctx.rect(px - 30, gy - 60, 60, 60); ctx.clip(); }
      if (!drawBlade3D(ctx, 'dagger', px, gy - z - 12, Math.PI / 2, 1, 0, { len: 34, spin: 0, seed: b.seed, glow: 0.25 })) { ctx.fillStyle = '#d0d6e0'; ctx.fillRect(px - 1, gy - z - 26, 2, 26); }
      ctx.restore();
    }
  }
}

/** The Rogue, NIGHT'S VERDICT: daggers close in out of the ground, steel rains, then the great blade falls. */
export function verdictUlt(ult, x, y, w, p, deal) {
  const R = ult.r, blood = (w.biome && w.biome.blood) || '#8a0b08';
  addEffect(new Ring(x, y, R + 0.6, 0.3, 0.9, ult.color, 4), 'ground');
  for (let ring = 0; ring < 3; ring++) after(w, ring * 170, () => {
    const n = 14 - ring * 3, rr = R * (1 - ring * 0.28);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + ring * 0.4; w.addHazard(new GroundBlades(x + Math.cos(a) * rr, y + Math.sin(a) * rr, { r: 0.1, n: 1, len: 50, hold: 0.9 - ring * 0.17, spread: 0.05, onPop: (bx, by) => dirtPop(bx, by) })); }
    sfx('swing', 0.6);
  });
  addEffect(new BladeFall(x, y, R, G.touch ? 16 : 30, 0.95));
  w.addHazard(new GiantBlade(x, y, { fall: 0.95, len: G.touch ? 240 : 310, h: 760, hold: 1.5, model: ownBlade(p) }));
  sfx('shadow', 1); sfx('swing', 1);
  after(w, 950, () => {
    explosionFx(x, y, 3.2, 'blood', 'eruption', { sound: false });
    for (let i = 0; i < 4; i++) addEffect(new Ring(x, y, 0.2, R * (0.5 + i * 0.3), 0.4 + i * 0.1, i % 2 ? '#ffffff' : ult.color, 7 - i));
    bloodBurst(x, y, G.touch ? 12 : 22, blood, 3.2);
    for (let i = 0; i < 8; i++) addEffect(new CutLine(x, y, (i / 8) * Math.PI, { len: R * 150, color: '#c80f1c', width: 6, delay: i * 0.02 }));
    addDecal(x, y, 'rgba(10,6,4,0.75)', R * 0.5, 'scorch', 0.8);
    camera.shake(18); G.flash = Math.max(G.flash || 0, 0.45);
    sfx('explode', 1); sfx('thud', 1.2); sfx('gore', 1);
    deal();
  });
}

/** The night itself over the circle, a thin moon above it. */
class Night {
  constructor(x, y, r, dur) { Object.assign(this, { x, y, r, dur, t: 0 }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const k = Math.min(1, this.t * 5) * Math.min(1, (this.dur - this.t) * 4), px = isoX(this.x, this.y), py = isoY(this.x, this.y), rx = this.r * HW * 2.6, ry = this.r * HH * 2.6;
    const g = ctx.createRadialGradient(px, py, 4, px, py, rx);
    g.addColorStop(0, `rgba(4,2,14,${0.78 * k})`); g.addColorStop(0.7, `rgba(4,2,14,${0.5 * k})`); g.addColorStop(1, 'rgba(4,2,14,0)');
    ctx.save(); ctx.translate(px, py); ctx.scale(1, ry / rx); ctx.translate(-px, -py); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rx, 0, TAU); ctx.fill(); ctx.restore();
    const my = py - 150, R = 20; // the moon, nearly gone
    ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowSprite(CYAN), px - 46, my - 46, 92, 92);
    ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(px, my, R, 0.6, 0.6 + Math.PI * 1.25); ctx.arc(px + 7, my - 3, R * 0.86, 0.6 + Math.PI * 1.2, 0.65, true); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
/** A shadow of the hero crossing the circle (seen only). */
class Cross {
  constructor(p, x0, y0, x1, y1, delay) { Object.assign(this, { p, x0, y0, x1, y1, t: -delay, dur: 0.2, cut: false }); }
  update(dt) {
    this.t += dt;
    if (this.t >= 0 && !this.cut) {
      this.cut = true;
      const dx = isoX(this.x1, this.y1) - isoX(this.x0, this.y0), dy = isoY(this.x1, this.y1) - isoY(this.x0, this.y0);
      addEffect(new CutLine((this.x0 + this.x1) / 2, (this.y0 + this.y1) / 2, Math.atan2(dy, dx), { len: Math.hypot(dx, dy), width: 5, dur: 0.6, delay: 0.08, z: 22 }));
    }
    return this.t < this.dur + 0.1 && !this.p.dead;
  }
  draw(ctx) {
    if (this.t < 0) return;
    const u = Math.min(1, this.t / this.dur), flip = isoX(this.x1, this.y1) < isoX(this.x0, this.y0);
    for (let k = 2; k >= 0; k--) {
      const v = Math.max(0, u - k * 0.14);
      drawGhost(ctx, this.p, { x: this.x0 + (this.x1 - this.x0) * v, y: this.y0 + (this.y1 - this.y0) * v, z: 8, flip, alpha: 0.85 - k * 0.25, lunge: 1, acro: { t: v * this.dur, dur: this.dur, spins: 1, h: 16, dir: 1 } });
    }
  }
}
/** The Ninja, MOONLESS NIGHT: the light goes, nine shadows cross the circle, and every line they drew opens. */
export function moonlessUlt(ult, x, y, w, p, deal) {
  const R = ult.r, N = G.touch ? 6 : 9;
  addEffect(new Night(x, y, R, 1.5), 'ground');
  addEffect(new Ring(x, y, R + 0.6, 0.3, 0.8, ult.color, 3), 'ground');
  for (let i = 0; i < N; i++) {
    const a = (i * 4 / N) * TAU + 0.3; // a star: each crossing starts well round the circle from the last
    addEffect(new Cross(p, x + Math.cos(a) * R, y + Math.sin(a) * R, x - Math.cos(a + 0.5) * R, y - Math.sin(a + 0.5) * R, i * 0.075));
    after(w, i * 75, () => sfx('swing', 0.6));
  }
  sfx('shadow', 1);
  after(w, N * 75 + 260, () => {
    for (let i = 0; i < 6; i++) addEffect(new Crescent(x, y, i * 1.05, { r: R * (0.5 + (i % 3) * 0.25), arc: 3.4, dur: 0.4, color: i % 2 ? '#ffffff' : CYAN, z: 20 }));
    addEffect(new Ring(x, y, 0.2, R + 1, 0.5, '#ffffff', 7));
    burst(x, y, 30, 'shadow', G.touch ? 20 : 40, 8); sparkle(x, y, 40, '#ffffff', 30, R * 0.7);
    camera.shake(16); G.flash = Math.max(G.flash || 0, 0.5);
    sfx('explode', 0.8); sfx('gore', 1); sfx('hit', 1);
    deal();
  });
}
