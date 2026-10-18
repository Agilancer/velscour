// Barbarian: Bloodlust. Every blow he lands feeds a combo counter that roars over his head in blood-red numerals
// (kills count double); stop hitting for 2.6 s and it breaks. At 25, 50, 100, 200 and every hundred after, an
// ANCESTOR answers: a giant ghost of the Barbarian rises behind him, raises its axe and slams the earth, a shockwave
// that hurls everything back. Each tier hits harder and has its own war cry.
import { G, stat, power, sigO, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, smoke, addDecal } from '../../gfx/vfx.js';
import { aoe } from '../combat.js';

const BREAK = 2.6, STEPS = [25, 50, 100, 200];
const CRIES = ['RAMPAGE', 'SAVAGERY', 'BLOODBATH', 'UNSTOPPABLE', 'GODLIKE'];
const milestone = (i) => (i < STEPS.length ? STEPS[i] : 200 + (i - STEPS.length + 1) * 100);
const heat = (n) => (n < 10 ? '#f0e0c0' : n < 25 ? '#ffb040' : n < 50 ? '#ff6a20' : n < 100 ? '#ff2a10' : '#ff1060');

class Ancestor {
  constructor(p, tier) { Object.assign(this, { p, tier, t: 0, dur: 1.15, slam: 0.6, done: false, x: p.x, y: p.y }); }
  get depth() { return this.x + this.y - 0.6; }
  update(dt) {
    this.t += dt;
    const p = this.p;
    if (!this.done && this.t >= this.slam) {
      this.done = true;
      const w = p.world, x = p.x, y = p.y, r = 3.4 + this.tier * 0.25;
      aoe(w, p, x, y, r, power(p) * (4 + this.tier * 1.2), 'phys', sigO({ knock: 1.6, stun: true }));
      for (let i = 0; i < 3; i++) addEffect(new Ring(x, y, 0.2, r * (0.7 + i * 0.25), 0.45 + i * 0.12, i ? '#ffb070' : '#ff4020', 8 - i * 2, { fill: !i }));
      for (let i = 0; i < (G.touch ? 20 : 40); i++) { const a = rand(TAU), v = rand(2, 6); spawn({ type: 'shard', x, y, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(60, 180), g: 320, drag: 1, life: rand(0.5, 1), size: rand(2.5, 5), size1: 1.5, color: i % 3 ? '#6a5040' : '#3a2a20', rot: a }); }
      smoke(x, y, 6, '#5a4a3a', G.touch ? 4 : 8, 14);
      addDecal(x, y, 'rgba(20,12,8,0.5)', 0.9, 'scorch', 0.5);
      camera.shake(12); G.hitStop = Math.max(G.hitStop || 0, 0.06);
      p.gainRage && p.gainRage(10);
      sfx('thud', 1); sfx('roar', 0.8);
    }
    return this.t < this.dur && !p.dead;
  }
  draw(ctx) {
    const p = this.p, t = this.t;
    const rise = Math.min(1, t / 0.3), fade = t > this.slam ? 1 - (t - this.slam) / (this.dur - this.slam) : 1;
    const S = 2.3 + this.tier * 0.15, lift = t < this.slam ? Math.sin(Math.min(1, t / this.slam) * Math.PI * 0.5) * 24 : 24 * (1 - Math.min(1, (t - this.slam) / 0.08));
    const px = isoX(p.x, p.y), py = isoY(p.x, p.y);
    glow(ctx, '#ff3010', px, py - 70 * S * 0.5, 70 * S * 0.6, 0.5 * fade * rise);
    const ox = p.x, oy = p.y, oa = p.alpha, os = p.scale, oz = p.z, top = p.screenTop, sbox = p.sbox;
    p.x = ox - 0.45; p.y = oy - 0.45; p.scale = S * (0.6 + 0.4 * rise); p.z = (oz || 0) + lift; p.ghostDraw = true;
    try {
      p.alpha = 0.5 * fade * rise; p.draw(ctx);                                          // the ancestor, in detail
      ctx.globalCompositeOperation = 'lighter'; p.alpha = 0.22 * fade * rise; p.draw(ctx); // and his spirit-fire
    } finally { ctx.globalCompositeOperation = 'source-over'; p.x = ox; p.y = oy; p.alpha = oa; p.scale = os; p.z = oz; p.ghostDraw = false; p.screenTop = top; p.sbox = sbox; }
  }
}

export default {
  id: 'barbarian', name: 'Bloodlust', color: '#ff3a20',
  desc: 'Every blow feeds a combo counter over his head; stop hitting and it breaks. At 25, 50, 100, 200 and every hundred after, a giant ANCESTOR rises behind him and slams the earth.',
  init: () => ({ combo: 0, t: 0, pop: 0, tier: 0, best: 0, cry: 0 }),
  enter(p, s) { s.combo = 0; s.tier = 0; },
  hit(p, s) { this.add(p, s, 1); },
  kill(p, s) { if (s.combo) this.add(p, s, 2); },
  add(p, s, n) {
    s.combo += n; s.t = 0; s.pop = 1; s.best = Math.max(s.best, s.combo);
    if (s.combo >= milestone(s.tier)) { this.fire(p, s); }
  },
  update(p, s, dt) {
    s.pop = Math.max(0, s.pop - dt * 5); s.cry = Math.max(0, s.cry - dt);
    if (s.combo && (s.t += dt) > BREAK) {
      if (s.combo >= 10) floatText(p.x, p.y, 96, `${s.combo} hit combo`, '#c0a080', 11, { life: 1.2 });
      s.combo = 0; s.tier = 0;
    }
  },
  fill: (s) => Math.min(1, s.combo / milestone(s.tier)),
  fire(p, s) {
    if (s.combo < milestone(s.tier)) s.combo = milestone(s.tier); // forced (tests)
    s.t = 0;
    const tier = s.tier;
    s.tier++; s.cry = 1.6; s.cryText = CRIES[Math.min(CRIES.length - 1, tier)];
    p.world.addHazard(new Ancestor(p, tier));
    floatText(p.x, p.y, 120, s.cryText, heat(s.combo), 20 + Math.min(6, tier * 2), { life: 1.8, vz: 14 });
    sfx('roar', 0.6);
    stat('barbarian', 'fire');
  },
  draw(ctx, p, s, t) {
    if (s.combo < 3) return;
    const [cx, cy] = headAt(p, 8), n = s.combo, c = heat(n), k = 1 + s.pop * 0.35, left = 1 - s.t / BREAK;
    const big = Math.round((G.touch ? 13 : 16) * k * (n >= 100 ? 1.15 : 1)), sh = n >= 50 ? rand(-1, 1) * (n >= 100 ? 1.5 : 0.8) : 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.font = `900 ${big}px Cinzel, Georgia, serif`;
    if (n >= 25) glow(ctx, c, cx, cy - big * 0.35, big * 1.4, 0.35 + 0.3 * s.pop);
    ctx.lineWidth = 4; ctx.strokeStyle = '#140404'; ctx.strokeText(`${n}`, cx + sh, cy + sh);
    ctx.fillStyle = c; ctx.fillText(`${n}`, cx + sh, cy + sh);
    ctx.font = `900 ${G.touch ? 6 : 7}px Georgia, serif`; ctx.lineWidth = 2.5;
    ctx.strokeText('HITS', cx, cy + 8); ctx.fillStyle = '#e0c0a0'; ctx.fillText('HITS', cx, cy + 8);
    ctx.fillStyle = '#200606'; ctx.fillRect(cx - 14, cy + 11, 28, 2); // the bar until it breaks
    ctx.fillStyle = left < 0.3 ? '#ff4030' : c; ctx.fillRect(cx - 14, cy + 11, 28 * Math.max(0, left), 2);
    const next = milestone(s.tier), prev = s.tier ? milestone(s.tier - 1) : 0, f = (n - prev) / (next - prev); // to the next ancestor
    ctx.fillStyle = '#ffd0a0'; ctx.globalAlpha = 0.8; ctx.fillRect(cx - 14, cy + 14, 28 * Math.min(1, f), 1); ctx.globalAlpha = 1;
  },
};
