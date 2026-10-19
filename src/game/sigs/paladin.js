// Paladin: the Halo of Judgement. Every prayer he casts inscribes a rune on the halo over his head (the basic attack
// every second swing, a slain champion one more). The seventh rune calls JUDGEMENT: a hammer of light the size of a
// house falls from the sky on the strongest foe in sight, a cross of light runs out from the impact, and the ground
// stays consecrated for six seconds (burns foes, heals him while he stands in it).
import { G, later, stat, power, sigO, toughest, crowd, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, HW, HH, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, Beam, Column, floatText, burst, sparkle, spawn, addLight, addDecal } from '../../gfx/vfx.js';
import { hit, aoe } from '../combat.js';
import { lineTargets } from '../hazards.js';

const RUNES = 7, GOLD = '#ffd860', WHITE = '#fffff0';

class Hammer {
  constructor(p, x, y) { Object.assign(this, { p, x, y, t: 0, fall: 0.55, done: false }); }
  get depth() { return this.x + this.y + 0.5; }
  update(dt) {
    this.t += dt;
    if (!this.done && this.t >= this.fall) { this.done = true; impact(this.p, this.x, this.y); }
    if (chance01(dt * 40)) sparkle(this.x + rand(-0.3, 0.3), this.y + rand(-0.3, 0.3), this.zAt() + rand(0, 60), WHITE, 1, 0.2);
    return this.t < this.fall + 0.35;
  }
  zAt() { const k = Math.min(1, this.t / this.fall); return 340 * (1 - k * k); }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - this.zAt(), a = this.t < this.fall ? 1 : 1 - (this.t - this.fall) / 0.35;
    // the shadow it casts as it falls
    const k = Math.min(1, this.t / this.fall);
    ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(px, isoY(this.x, this.y), 30 * k + 6, 12 * k + 3, 0, 0, TAU); ctx.fill();
    glow(ctx, GOLD, px, py - 50, 80, 0.8 * a);
    if (this.t < this.fall) { // light streaming behind it from the sky
      ctx.globalCompositeOperation = 'lighter';
      for (let i = -2; i <= 2; i++) { ctx.globalAlpha = 0.25 * a; ctx.fillStyle = i ? GOLD : '#ffffff'; ctx.fillRect(px + i * 9 - 1.5, py - 420, 3, 300); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 0.92 * a;
    const hg = ctx.createLinearGradient(px - 6, 0, px + 6, 0); // the haft, with leather wraps
    hg.addColorStop(0, '#c89020'); hg.addColorStop(0.5, '#fff8d0'); hg.addColorStop(1, '#c89020');
    ctx.fillStyle = hg; ctx.fillRect(px - 5, py - 128, 10, 104);
    ctx.fillStyle = 'rgba(120,70,10,0.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(px - 5, py - 120 + i * 9, 10, 3);
    ctx.fillStyle = '#ffe890'; ctx.beginPath(); ctx.arc(px, py - 134, 7, 0, TAU); ctx.fill(); // pommel
    const W = 34, H = 20, cy = py - 22; // the head: a great block with bevelled faces
    const g = ctx.createLinearGradient(0, cy - H, 0, cy + H);
    g.addColorStop(0, '#fffef0'); g.addColorStop(0.45, '#ffd860'); g.addColorStop(1, '#a86a10');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(px - W, cy - H + 6); ctx.lineTo(px - W + 6, cy - H); ctx.lineTo(px + W - 6, cy - H); ctx.lineTo(px + W, cy - H + 6);
    ctx.lineTo(px + W, cy + H - 6); ctx.lineTo(px + W - 6, cy + H); ctx.lineTo(px - W + 6, cy + H); ctx.lineTo(px - W, cy + H - 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(px - W - 4, cy - H + 4, 6, H * 2 - 8); ctx.fillRect(px + W - 2, cy - H + 4, 6, H * 2 - 8); // striking faces
    ctx.fillStyle = '#fffbe0'; ctx.fillRect(px - 3, cy - H + 5, 6, H * 2 - 10); ctx.fillRect(px - 12, cy - 6, 24, 6); // a cross on its side
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#ffffff', px, cy - 3, 26, 0.6 * a);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
const chance01 = (k) => Math.random() < k;

function impact(p, x, y) {
  const w = p.world;
  if (!w || p.dead) return;
  const P = power(p);
  addEffect(new Column(x, y, GOLD, 0.7, 60, 420));
  for (let i = 0; i < 3; i++) addEffect(new Ring(x, y, 0.2, 2.6 + i * 0.7, 0.45 + i * 0.15, i ? WHITE : GOLD, 8 - i * 2, { fill: !i }));
  burst(x, y, 20, 'holy', G.touch ? 24 : 50, 6, { up: 2 });
  aoe(w, p, x, y, 2.6, P * 6, 'holy', sigO({ stun: true, knock: 1.2 }));
  for (let i = 0; i < 4; i++) { // the cross of light, along the floor's axes
    const a = i * Math.PI / 2, ex = x + Math.cos(a) * 4.5, ey = y + Math.sin(a) * 4.5;
    addEffect(new Beam(x, y, ex, ey, GOLD, 12, 0.55, { z: 6, core: '#ffffff' }));
    for (const c of lineTargets(w, p.team, x, y, ex, ey, 0.55)) hit(p, c, P * 2, 'holy', sigO());
  }
  addDecal(x, y, 'rgba(255,220,120,0.35)', 1, 'scorch', 0.4);
  w.addHazard(new Consecration(p, x, y));
  camera.shake(10); G.flash = Math.max(G.flash || 0, 0.25);
  sfx('holy', 1); sfx('thud', 0.9);
}

class Consecration {
  constructor(p, x, y) { Object.assign(this, { p, x, y, t: 0, dur: 6, r: 2.8, tick: 0, ground: true }); }
  update(dt) {
    this.t += dt;
    const p = this.p, w = this.world;
    if ((this.tick -= dt) <= 0 && !p.dead) {
      this.tick = 0.5;
      aoe(w, p, this.x, this.y, this.r, power(p) * 0.3, 'holy', sigO({ crit: false }));
      if (Math.hypot(p.x - this.x, p.y - this.y) < this.r) p.heal(p.maxHp * 0.012, true);
    }
    if (Math.random() < dt * 14) { const a = rand(TAU), d = rand(this.r); spawn({ type: 'glow', x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d, z: 2, vz: rand(30, 70), life: rand(0.5, 1), size: rand(2, 3.5), size1: 0, color: Math.random() < 0.5 ? GOLD : WHITE, add: true }); }
    addLight(this.x, this.y, this.r * 1.4, 0.7, 10, GOLD);
    return this.t < this.dur;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), k = Math.min(1, this.t * 3) * Math.min(1, (this.dur - this.t) / 0.6);
    const RX = this.r * HW * 1.41, RY = this.r * HH * 1.41;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 * k; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(px, py, RX, RY, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 0.45 * k; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(px, py, RX * 0.72, RY * 0.72, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { // turning rays
      const a = this.t * 0.6 + (i / 12) * TAU;
      ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * RX * 0.72, py + Math.sin(a) * RY * 0.72); ctx.lineTo(px + Math.cos(a) * RX, py + Math.sin(a) * RY); ctx.stroke();
    }
    ctx.restore();
  }
}

/** A rune of the halo: a little cross, a ring or a wing, by its place. */
function rune(ctx, x, y, i, s) {
  ctx.beginPath();
  if (i % 3 === 0) { ctx.moveTo(x, y - 3 * s); ctx.lineTo(x, y + 3 * s); ctx.moveTo(x - 2 * s, y - 1 * s); ctx.lineTo(x + 2 * s, y - 1 * s); }
  else if (i % 3 === 1) { ctx.arc(x, y, 2 * s, 0, TAU); }
  else { ctx.moveTo(x - 2.5 * s, y + 2 * s); ctx.lineTo(x, y - 2.5 * s); ctx.lineTo(x + 2.5 * s, y + 2 * s); }
  ctx.stroke();
}

export default {
  id: 'paladin', name: 'Halo of Judgement', color: GOLD,
  desc: 'Each prayer inscribes a rune on his halo. Seven runes call JUDGEMENT: a hammer of light falls on the strongest foe, a cross of light runs out from it, and the ground stays consecrated.',
  init: () => ({ runes: 0, basic: 0, flash: 0, ready: false }),
  cast(p, s, sk) {
    if (sk.m.free && (++s.basic % 2)) return;
    this.add(p, s, 1);
  },
  kill(p, s, tgt) { if (tgt.rank !== 'normal') this.add(p, s, 1); },
  add(p, s, n) {
    if (s.runes >= RUNES) return;
    s.runes = Math.min(RUNES, s.runes + n); s.flash = 0.6;
    if (s.runes >= RUNES) s.ready = true;
  },
  update(p, s, dt) {
    s.flash = Math.max(0, s.flash - dt * 2);
    if (s.ready && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (toughest(p, 8)) this.fire(p, s); }
  },
  fill: (s) => s.runes / RUNES,
  fire(p, s) {
    const t = toughest(p, 9), c = crowd(p, 9);
    const [x, y] = t ? [t.x, t.y] : c ? c : [p.x + Math.cos(p.facing || 0) * 2, p.y + Math.sin(p.facing || 0) * 2];
    s.runes = 0; s.ready = false; s.flash = 1;
    p.world.addHazard(new Hammer(p, x, y));
    floatText(p.x, p.y, 100, 'JUDGEMENT', GOLD, 20, { life: 1.8, vz: 16 });
    sfx('holy', 0.8);
    stat('paladin', 'fire');
    later(p.world, 0.05, () => addEffect(new Ring(p.x, p.y, 0.1, 1.6, 0.4, WHITE, 3)));
  },
  draw(ctx, p, s, t) {
    const [cx, cy0] = headAt(p, 12), cy = cy0 + Math.sin(t * 2) * 1.5, RX = G.touch ? 13 : 16, RY = RX * 0.32, f = s.runes / RUNES;
    glow(ctx, GOLD, cx, cy, RX * 1.6, 0.15 + 0.35 * f + s.flash * 0.4);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.globalAlpha = 0.45 + 0.4 * f;
    ctx.beginPath(); ctx.ellipse(cx, cy, RX, RY, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6 * f + s.flash * 0.4; ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < RUNES; i++) {
      const a = t * 0.8 + (i / RUNES) * TAU, x = cx + Math.cos(a) * RX, y = cy + Math.sin(a) * RY - 4, lit = i < s.runes;
      ctx.globalAlpha = lit ? 1 : 0.22; ctx.strokeStyle = lit ? (s.ready ? '#ffffff' : '#fff0b0') : '#a08040';
      rune(ctx, x, y, i, G.touch ? 0.8 : 1);
      if (lit) glow(ctx, GOLD, x, y, 7, 0.6);
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
  ground(ctx, p, s, t) {
    const f = s.runes / RUNES;
    if (f <= 0) return;
    const px = isoX(p.x, p.y), py = isoY(p.x, p.y), R = 1.1 + 0.2 * f, RX = R * HW, RY = R * HH;
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.15 + 0.45 * f;
    ctx.beginPath(); ctx.ellipse(px, py, RX, RY, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(px, py, RX * 0.8, RY * 0.8, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < s.runes; i++) { // a seven-point star drawn one stroke per rune
      const a0 = -t * 0.5 + (i / RUNES) * TAU, a1 = a0 + (3 / RUNES) * TAU;
      ctx.beginPath(); ctx.moveTo(px + Math.cos(a0) * RX * 0.8, py + Math.sin(a0) * RY * 0.8); ctx.lineTo(px + Math.cos(a1) * RX * 0.8, py + Math.sin(a1) * RY * 0.8); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
};
