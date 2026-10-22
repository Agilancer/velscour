// Slime Lord: the Gelatinous Mass. What he kills melts into blue goo that slithers across the floor into him, and
// he GROWS (up to 40% bigger, his royal puddle spreading round his feet). At full mass he squats, bounds high into
// the air and comes down in a ROYAL BELLY FLOP: an acid tidal ring, a blue lake splashed across the floor, and three
// little slimes of the court (game/slimecourt.js), a rainbow, wobbling out of the splash to fight for him. Then he is his
// old size again. Round his feet a living royal puddle: wobbling lobes and creeping pseudopods, bubbles that pop,
// ripples, a glossy rim and droplets that crawl back in; it spreads as he grows and he leaves a trail of goo.
import { G, later, stat, power, sigO, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, HW, HH, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, addDecal } from '../../gfx/vfx.js';
import { aoe } from '../combat.js';
import { courtSummon } from '../slimecourt.js';

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
    const P = power(p);
    for (let i = 0; i < 3; i++) { // three little slimes of the court out of the splash, next colours of the rainbow
      const a = (i / 3) * TAU + rand(0.5), sx = x + Math.cos(a) * 1.4, sy = y + Math.sin(a) * 1.4;
      if (!w.map.walkable(sx, sy)) continue;
      const m = courtSummon(p, 'slimeling', sx, sy, P * 0.5, Math.max(20, p.maxHp * 0.15), 10);
      if (!m) continue;
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
  init: () => ({ mass: 0, blobs: [], cur: 1, squash: 0, gulp: 0, flop: null, bub: [], gT: 0, tx: 0, ty: 0 }),
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
    // a trail of royal goo where he goes
    if (Math.hypot(p.x - s.tx, p.y - s.ty) > 0.7) { if (s.tx || s.ty) addDecal(p.x + rand(-0.15, 0.15), p.y + rand(-0.15, 0.15), '#2a6cd8', rand(0.18, 0.32) * (0.8 + s.mass / MAX * 0.5), 'pool', 0.35); s.tx = p.x; s.ty = p.y; }
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
    const [cx, cy0] = headAt(p, G.touch ? 24 : 28), cy = cy0 + Math.sin(t * 3) * 1.5, f = s.mass / MAX, R = (G.touch ? 6 : 7.5) * (1 + 0.1 * Math.sin(t * 7));
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
    // the royal puddle: always there, wider the more he has eaten
    const f = s.mass / MAX, px = isoX(p.x, p.y), py = isoY(p.x, p.y), R = 0.62 + 0.8 * f;
    const rx = R * HW * 1.35, ry = R * HH * 1.35, dt = Math.min(0.1, Math.max(0, t - s.gT));
    s.gT = t;
    // pseudopods creep out and pull back in
    const pods = 6, rim = (a) => {
      let k = 1 + 0.06 * Math.sin(a * 3 + t * 1.7) + 0.04 * Math.sin(a * 5 - t * 2.3);
      for (let i = 0; i < pods; i++) {
        const pa = (i / pods) * TAU + Math.sin(t * 0.3 + i) * 0.5, ext = Math.max(0, Math.sin(t * 0.8 + i * 2.1)) * (0.14 + 0.1 * f);
        let d = a - pa; d -= Math.round(d / TAU) * TAU;
        k += ext * Math.exp(-(d * d) / 0.012);
      }
      return k;
    };
    const path = (sc, ox = 0, oy = 0) => {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU, k = rim(a) * sc; const x = px + ox + Math.cos(a) * rx * k, y = py + oy + Math.sin(a) * ry * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath();
    };
    ctx.save();
    // a dark wet stain under it all, then the jelly itself: deep at the rim, clearer in the middle
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#06143a'; path(1.1); ctx.fill();
    const g = ctx.createRadialGradient(px - rx * 0.2, py - ry * 0.25, 1, px, py, rx * 1.15);
    g.addColorStop(0, 'rgba(120,190,255,0.55)'); g.addColorStop(0.55, 'rgba(58,140,255,0.5)'); g.addColorStop(1, 'rgba(20,70,190,0.7)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; path(1); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#1a58d0'; path(0.78); ctx.fill(); // thicker jelly towards the middle
    // a slower, paler lobe swirling inside
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#9ad0ff'; path(0.55, Math.cos(t * 0.6) * rx * 0.18, Math.sin(t * 0.6) * ry * 0.18); ctx.fill();
    // ripples spreading from his feet
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.55 + i * 0.5) % 1);
      ctx.globalAlpha = 0.45 * (1 - k); ctx.strokeStyle = PALE; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(px, py, rx * (0.2 + 0.8 * k), ry * (0.2 + 0.8 * k), 0, 0, TAU); ctx.stroke();
    }
    // the meniscus: a bright rim with a darker line just inside
    ctx.globalAlpha = 0.75; ctx.strokeStyle = PALE; ctx.lineWidth = 1; path(1); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#0a2a80'; path(0.9); ctx.stroke();
    // glossy glints sliding over the top
    ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
    const gl = Math.sin(t * 0.7) * 0.25;
    ctx.beginPath(); ctx.ellipse(px - rx * 0.28, py - ry * 0.32, rx * 0.36, ry * 0.2, 0, Math.PI * (1.05 + gl), Math.PI * (1.55 + gl)); ctx.stroke();
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffffff'; ctx.fillRect(px + rx * 0.35, py - ry * 0.35, 1.6, 1.2);
    // bubbles well up, swell and pop
    if (Math.random() < dt * (3 + 5 * f)) { const a = rand(TAU), d = Math.sqrt(Math.random()) * 0.8; s.bub.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, t: 0, life: rand(0.6, 1.4), r: rand(1.2, 2.6) * (1 + f * 0.5) }); }
    for (let i = s.bub.length - 1; i >= 0; i--) {
      const b = s.bub[i], bx = px + b.x * rx, by = py + b.y * ry;
      b.t += dt;
      if (b.t > b.life + 0.18) { s.bub.splice(i, 1); continue; }
      if (b.t <= b.life) {
        const r = b.r * Math.min(1, b.t / (b.life * 0.7));
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#7ab8ff'; ctx.beginPath(); ctx.ellipse(bx, by, r, r * 0.8, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.85; ctx.strokeStyle = PALE; ctx.lineWidth = 0.6; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - r * 0.45, by - r * 0.5, 1, 1);
      } else { // pop: a tiny ring
        const k = (b.t - b.life) / 0.18;
        ctx.globalAlpha = 0.8 * (1 - k); ctx.strokeStyle = PALE; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.ellipse(bx, by, b.r * (1 + k * 1.6), b.r * 0.8 * (1 + k * 1.6), 0, 0, TAU); ctx.stroke();
      }
    }
    // droplets that crawl round the edge and back in
    for (let i = 0; i < 4; i++) {
      const a = t * (0.35 + i * 0.07) + i * 1.6, out = 1.08 + 0.12 * Math.sin(t * 1.3 + i * 2), x = px + Math.cos(a) * rx * out, y = py + Math.sin(a) * ry * out;
      ctx.globalAlpha = 0.7; ctx.fillStyle = BLUE; ctx.beginPath(); ctx.ellipse(x, y, 1.8, 1.2, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = PALE; ctx.fillRect(x - 0.8, y - 0.8, 1, 0.8);
    }
    ctx.restore();
  },
};
