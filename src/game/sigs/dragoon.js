// Dragoon: Sky Lances. Each strike forges a spear of blue light that hangs behind his back; they fan out like a
// dragon's wings, four to a side (leaps forge two). Eight lances and he throws his arms wide: HEAVEN'S RAIN. The
// wings launch into the sky and come down one by one on every foe in reach as lances from the heavens, and he is
// borne up by Highwind (speed, damage) for a while.
import { G, later, stat, power, sigO, foesNear, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, addDecal } from '../../gfx/vfx.js';
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

class SkyLance {
  constructor(p, x, y) { Object.assign(this, { p, x, y, t: 0, dur: 0.24 }); }
  get depth() { return this.x + this.y + 0.5; }
  update(dt) {
    this.t += dt;
    if (this.t >= this.dur) {
      const p = this.p;
      aoe(p.world, p, this.x, this.y, 1.35, power(p) * 2.2, 'phys', sigO({ knock: 0.6, stun: true }));
      addEffect(new Ring(this.x, this.y, 0.1, 1.5, 0.35, BLUE, 5, { fill: true }));
      addEffect(new Ring(this.x, this.y, 0.1, 0.8, 0.25, '#ffffff', 2));
      for (let i = 0; i < 10; i++) { const a = rand(TAU), v = rand(1, 3); spawn({ type: 'shard', x: this.x, y: this.y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(40, 120), g: 260, life: rand(0.3, 0.6), size: rand(2, 3.5), size1: 1, color: i % 2 ? ICE : BLUE, rot: a, add: true }); }
      addDecal(this.x, this.y, 'rgba(10,20,40,0.5)', 0.6, 'scorch', 0.6);
      camera.shake(3); sfx('thud', 0.5);
      return false;
    }
    return true;
  }
  draw(ctx) {
    const k = this.t / this.dur, px = isoX(this.x, this.y), py = isoY(this.x, this.y), z = 380 * (1 - k);
    lance(ctx, px - 16 * (1 - k), py - z - 60, Math.PI / 2 - 0.25, 60, true, this.t);
    ctx.globalAlpha = 0.3 * k; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, py, 8, 3, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
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
      later(w, 0.45 + i * 0.07, () => { if (!p.dead && p.world === w) w.addHazard(new SkyLance(p, spots[i][0], spots[i][1])); });
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
