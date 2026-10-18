// Slime Lord: the Gelatinous Mass. What he kills melts into blue goo that slithers across the floor into him, and
// he GROWS (up to 40% bigger, his royal puddle spreading round his feet). At full mass he squats, bounds high into
// the air and comes down in a ROYAL BELLY FLOP: an acid tidal ring, a blue lake splashed across the floor, and three
// slimelings wobbling out of the splash to fight for him. Then he is his old size again.
import { G, later, stat, power, sigO, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, HW, HH, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, addDecal } from '../../gfx/vfx.js';
import { aoe } from '../combat.js';
import { buildSummon } from '../monster.js';
import { SUMMONS } from '../../data/summons.js';

const MAX = 100, GROW = 0.4, BLUE = '#3a8cff', PALE = '#d8f0ff';
const WORTH = { normal: 9, champion: 20, unique: 30, boss: 50 };

class Flop {
  constructor(p, s) { Object.assign(this, { p, s, t: 0, squat: 0.3, air: 0.6, done: false }); p.invuln = Math.max(p.invuln || 0, 1); }
  update(dt) {
    const p = this.p, s = this.s;
    this.t += dt;
    const k = (this.t - this.squat) / this.air;
    if (this.t < this.squat) s.squash = this.t / this.squat;
    else if (k < 1) { s.squash = 0; p.z = Math.sin(Math.max(0, k) * Math.PI) * 110; }
    else if (!this.done) { this.done = true; p.z = 0; s.squash = 1; this.land(); }
    else s.squash = Math.max(0, s.squash - dt * 4);
    const on = this.t < this.squat + this.air + 0.4 && !p.dead && p.world === this.world;
    if (!on) { if (!this.done) p.z = 0; s.squash = 0; }
    return on;
  }
  land() {
    const p = this.p, s = this.s, w = this.world, x = p.x, y = p.y, r = 3.6;
    aoe(w, p, x, y, r, power(p) * 7, 'acid', sigO({ slow: true, knock: 1.4 }));
    for (let i = 0; i < 3; i++) addEffect(new Ring(x, y, 0.3, r * (0.75 + i * 0.25), 0.5 + i * 0.12, i ? PALE : BLUE, 9 - i * 2, { fill: !i }));
    for (let i = 0; i < (G.touch ? 24 : 48); i++) { const a = rand(TAU), v = rand(2, 7); spawn({ type: 'blood', x, y, z: 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(60, 200), g: 400, drag: 0.8, life: rand(0.6, 1.1), size: rand(2.5, 5), size1: 2, color: i % 3 ? BLUE : PALE }); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, d = rand(1, 3); addDecal(x + Math.cos(a) * d, y + Math.sin(a) * d, '#2a6cd8', rand(0.5, 0.9), 'pool', 0.75); }
    addDecal(x, y, '#2a6cd8', 1.6, 'pool', 0.8);
    const def = SUMMONS.slimeling, P = power(p);
    if (def) for (let i = 0; i < 3; i++) { // three slimelings out of the splash
      const a = (i / 3) * TAU + rand(0.5), sx = x + Math.cos(a) * 1.4, sy = y + Math.sin(a) * 1.4;
      if (!w.map.walkable(sx, sy)) continue;
      const m = buildSummon(p, def, 'slimeling', sx, sy, P * 0.5, Math.max(20, p.maxHp * 0.15), 10);
      m.skillId = 'sig_slime';
      w.add(m);
    }
    s.mass = 0;
    camera.shake(13); G.hitStop = Math.max(G.hitStop || 0, 0.06);
    sfx('acid', 1); sfx('thud', 1); sfx('squish', 1);
  }
  draw() {}
}

export default {
  id: 'slime_lord', name: 'Gelatinous Mass', color: BLUE,
  desc: 'What he kills melts into goo that slithers into him, and he GROWS. At full mass he bounds into the air for a ROYAL BELLY FLOP: an acid tidal ring, a lake of slime and three slimelings out of the splash.',
  init: () => ({ mass: 0, blobs: [], cur: 1, squash: 0, gulp: 0, flop: null }),
  enter(p, s) { s.blobs.length = 0; if (s.flop) { p.z = 0; s.flop = null; s.squash = 0; } },
  kill(p, s, tgt) {
    if (Math.hypot(tgt.x - p.x, tgt.y - p.y) > 9) return;
    s.blobs.push({ sx: tgt.x, sy: tgt.y, x: tgt.x, y: tgt.y, t: 0, dur: rand(0.7, 1.1), n: WORTH[tgt.rank] || 9, seed: rand(TAU) });
  },
  hit(p, s) { if (!s.flop) s.mass = Math.min(MAX, s.mass + 0.6); },
  update(p, s, dt) {
    s.gulp = Math.max(0, s.gulp - dt * 3);
    for (let i = s.blobs.length - 1; i >= 0; i--) { // goo slithers along the floor into him
      const b = s.blobs[i];
      b.t += dt;
      const k = Math.min(1, b.t / b.dur), e = k * k;
      b.x = b.sx + (p.x - b.sx) * e + Math.sin(k * 9 + b.seed) * 0.25 * (1 - k); b.y = b.sy + (p.y - b.sy) * e + Math.cos(k * 9 + b.seed) * 0.25 * (1 - k);
      if (Math.random() < 0.3) addDecal(b.x, b.y, '#2a6cd8', 0.18, 'pool', 0.45);
      if (k >= 1) { s.blobs.splice(i, 1); if (!s.flop) s.mass = Math.min(MAX, s.mass + b.n); s.gulp = 1; sfx('squish', 0.35); }
    }
    if (s.flop && !p.world.hazards.includes(s.flop)) s.flop = null;
    const want = 1 + GROW * (s.mass / MAX);
    s.cur += (want - s.cur) * Math.min(1, dt * (s.flop ? 6 : 3));
    // squash and stretch: wobble while he digests, flatten when he squats or lands
    p.sigScale = s.cur * (1 + 0.05 * s.gulp * Math.sin(G.time * 30)) * (1 - 0.18 * s.squash);
    if (s.mass >= MAX && !s.flop && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (foesNear(p, p.x, p.y, 4).length) this.fire(p, s); }
  },
  fill: (s) => s.mass / MAX,
  fire(p, s) {
    s.mass = MAX;
    s.flop = p.world.addHazard(new Flop(p, s));
    floatText(p.x, p.y, 130, 'ROYAL BELLY FLOP', PALE, 18, { life: 1.6, vz: 18 });
    later(p.world, 0.25, () => sfx('roar', 0.4));
    stat('slime_lord', 'fire');
  },
  draw(ctx, p, s, t) {
    if (s.mass <= 0 && !s.blobs.length) return;
    // the goo on its way in
    for (const b of s.blobs) {
      const px = isoX(b.x, b.y), py = isoY(b.x, b.y) - 3, r = 3 + b.n * 0.12;
      ctx.fillStyle = BLUE; ctx.beginPath(); ctx.ellipse(px, py, r * 1.4, r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = PALE; ctx.fillRect(px - r * 0.5, py - r * 0.4, 2, 1.5);
    }
    if (s.mass <= 0) return;
    // a wobbling bead of royal jelly over his head, filling with mass
    const [cx, cy0] = headAt(p, 10), cy = cy0 + Math.sin(t * 3) * 1.5, f = s.mass / MAX, R = (G.touch ? 6 : 7.5) * (1 + 0.1 * Math.sin(t * 7));
    glow(ctx, BLUE, cx, cy, R * 2.4, 0.25 + 0.45 * f);
    ctx.fillStyle = 'rgba(10,30,80,0.7)'; ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.92, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.92, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = f >= 1 ? '#7ab8ff' : BLUE; ctx.fillRect(cx - R, cy + R - 2 * R * f + Math.sin(t * 5) * 0.8, 2 * R, 2 * R);
    ctx.restore();
    ctx.strokeStyle = PALE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.92, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - R * 0.5, cy - R * 0.55, 2, 2); // the gloss
    ctx.font = `bold ${G.touch ? 6 : 7}px Georgia, serif`; ctx.textAlign = 'center'; ctx.fillStyle = PALE;
    ctx.fillText(`${Math.round(f * 100)}%`, cx, cy + R + 8);
  },
  ground(ctx, p, s, t) {
    if (s.mass <= 0) return;
    const f = s.mass / MAX, px = isoX(p.x, p.y), py = isoY(p.x, p.y), R = 0.5 + 0.8 * f;
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#2a6cd8';
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * TAU, w = 1 + 0.12 * Math.sin(a * 3 + t * 2); const x = px + Math.cos(a) * R * HW * 1.3 * w, y = py + Math.sin(a) * R * HH * 1.3 * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.strokeStyle = PALE; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
  },
};
