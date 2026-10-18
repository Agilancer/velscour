// Necromancer: the Soul Harvest. A skull-lantern phylactery swings beside his head. Every monster that dies near him
// (to him or his dead) gives up its soul: a green wisp that streams across the field into the lantern (champions
// give two, uniques three, bosses six). Thirteen souls and the lantern bursts: DANSE MACABRE. Thirteen screaming
// skulls whirl out and hunt the living, the corpses on the ground erupt in bone spikes, and his minions are made whole.
import { G, stat, power, sigO, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, burst } from '../../gfx/vfx.js';
import { hit, aoe } from '../combat.js';

const SOULS = 13, GREEN = '#70ff90', PALE = '#d8ffe0';
const WORTH = { normal: 1, champion: 2, unique: 3, boss: 6 };
/** The lantern's place in tile space (where wisps fly and skulls leave from). */
const lanternAt = (p) => [p.x - 0.35, p.y + 0.35, 78];

function skull(ctx, x, y, s, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#f0f0e0'; ctx.beginPath(); ctx.arc(x, y - 1 * s, 3.4 * s, 0, TAU); ctx.fill();
  ctx.fillRect(x - 2 * s, y + 1 * s, 4 * s, 2.4 * s);
  ctx.fillStyle = '#103018'; ctx.fillRect(x - 2.2 * s, y - 1.6 * s, 1.6 * s, 1.6 * s); ctx.fillRect(x + 0.6 * s, y - 1.6 * s, 1.6 * s, 1.6 * s);
  ctx.fillStyle = '#30ff60'; ctx.fillRect(x - 1.8 * s, y - 1.2 * s, 0.8 * s, 0.8 * s); ctx.fillRect(x + 1 * s, y - 1.2 * s, 0.8 * s, 0.8 * s);
  ctx.globalAlpha = 1;
}

class Skull {
  constructor(p, i, n) {
    const [x, y, z] = lanternAt(p), a = (i / n) * TAU;
    Object.assign(this, { p, x, y, z, t: 0, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, tgt: null, life: 3.2, hist: [] });
  }
  get depth() { return this.x + this.y + 0.4; }
  update(dt) {
    const p = this.p, w = this.world;
    this.t += dt;
    if (this.t > 0.35) { // whirl out, then hunt
      if (!this.tgt || this.tgt.dead) this.tgt = foesNear(p, this.x, this.y, 9)[Math.floor(rand(3))] || foesNear(p, this.x, this.y, 9)[0] || null;
      if (this.tgt) {
        const a = Math.atan2(this.tgt.y - this.y, this.tgt.x - this.x), sp = 9;
        this.vx += (Math.cos(a) * sp - this.vx) * Math.min(1, dt * 6); this.vy += (Math.sin(a) * sp - this.vy) * Math.min(1, dt * 6);
      }
    } else { const c = Math.cos(dt * 5), s = Math.sin(dt * 5), vx = this.vx; this.vx = vx * c - this.vy * s; this.vy = vx * s + this.vy * c; }
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += (30 - this.z) * Math.min(1, dt * 3);
    this.hist.unshift([this.x, this.y, this.z]); if (this.hist.length > 8) this.hist.pop();
    const t = this.tgt;
    if (t && !t.dead && Math.hypot(t.x - this.x, t.y - this.y) < 0.5 + t.r) {
      hit(p, t, power(p) * 1.2, 'shadow', sigO({ fear: Math.random() < 0.3 }));
      burst(this.x, this.y, this.z, 'poison', 10, 2.5);
      return false;
    }
    return this.t < this.life && w.map.isFloor(this.x, this.y);
  }
  draw(ctx) {
    const P = this.hist.map(([x, y, z]) => [isoX(x, y), isoY(x, y) - z]);
    ctx.globalCompositeOperation = 'lighter';
    P.forEach(([x, y], i) => { ctx.globalAlpha = 0.5 * (1 - i / P.length); ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(x, y, 4 - i * 0.4, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const [x, y] = P[0] || [isoX(this.x, this.y), isoY(this.x, this.y) - this.z];
    glow(ctx, GREEN, x, y, 12, 0.7);
    skull(ctx, x, y, 1.2);
  }
}

export default {
  id: 'necromancer', name: 'Soul Harvest', color: GREEN,
  desc: 'The souls of monsters dying near him stream into the skull-lantern at his side. Thirteen souls burst it: DANSE MACABRE, a whirl of hunting skulls, bone spikes from every corpse, his minions made whole.',
  init: () => ({ souls: 0, wisps: [], flash: 0, crack: 0 }),
  enter(p, s) { s.wisps.length = 0; },
  kill(p, s, tgt) {
    if (Math.hypot(tgt.x - p.x, tgt.y - p.y) > 10) return;
    s.wisps.push({ x: tgt.x, y: tgt.y, z: 30, t: 0, n: WORTH[tgt.rank] || 1, sx: tgt.x, sy: tgt.y, bend: rand(-2, 2), hist: [] });
  },
  update(p, s, dt) {
    s.flash = Math.max(0, s.flash - dt * 2); s.crack = Math.max(0, s.crack - dt);
    const [lx, ly, lz] = lanternAt(p);
    for (let i = s.wisps.length - 1; i >= 0; i--) {
      const o = s.wisps[i];
      o.t += dt;
      const k = Math.min(1, o.t / 0.9), e = k * k * (3 - 2 * k), mx = (o.sx + lx) / 2 + o.bend, my = (o.sy + ly) / 2 - o.bend; // a curve through a bent midpoint
      o.x = (1 - e) * (1 - e) * o.sx + 2 * (1 - e) * e * mx + e * e * lx; o.y = (1 - e) * (1 - e) * o.sy + 2 * (1 - e) * e * my + e * e * ly;
      o.z = 30 + (lz - 30) * e + Math.sin(k * Math.PI) * 40;
      o.hist.unshift([o.x, o.y, o.z]); if (o.hist.length > 7) o.hist.pop();
      if (k >= 1) { s.wisps.splice(i, 1); s.souls = Math.min(SOULS, s.souls + o.n); s.flash = 1; }
    }
    if (s.souls >= SOULS) this.fire(p, s);
  },
  fill: (s) => s.souls / SOULS,
  fire(p, s) {
    const w = p.world, P = power(p);
    s.souls = 0; s.crack = 0.6;
    const n = G.touch ? 9 : SOULS;
    for (let i = 0; i < n; i++) w.addHazard(new Skull(p, i, n));
    const [lx, ly, lz] = lanternAt(p);
    burst(lx, ly, lz, 'poison', 30, 4);
    let k = 0;
    for (const c of w.corpses) { // the dead beneath erupt in bone
      if (c.used || Math.hypot(c.x - p.x, c.y - p.y) > 8 || k >= 6) continue;
      k++;
      for (let j = 0; j < 8; j++) spawn({ type: 'shard', x: c.x + rand(-0.3, 0.3), y: c.y + rand(-0.3, 0.3), z: 0, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(120, 200), g: 300, life: rand(0.5, 0.8), size: rand(3, 5), size1: 1.5, color: j % 2 ? '#e8dcc0' : '#ffffff', rot: -Math.PI / 2 });
      addEffect(new Ring(c.x, c.y, 0.1, 1.3, 0.35, '#e8dcc0', 3));
      aoe(w, p, c.x, c.y, 1.3, P * 2, 'phys', sigO({ knock: 0.5 }));
    }
    for (const m of w.creatures) if (m.summon && m.owner === p && !m.dead) { // his dead made whole
      m.hp = m.maxHp;
      for (let j = 0; j < 8; j++) spawn({ type: 'glow', x: m.x + rand(-0.3, 0.3), y: m.y + rand(-0.3, 0.3), z: rand(0, 30), vz: rand(40, 90), life: rand(0.5, 0.9), size: rand(2, 4), size1: 0, color: GREEN, add: true });
    }
    floatText(p.x, p.y, 104, 'DANSE MACABRE', GREEN, 19, { life: 1.8, vz: 16 });
    camera.shake(5); sfx('shadow', 1); sfx('bones', 0.8);
    stat('necromancer', 'fire');
  },
  draw(ctx, p, s, t) {
    // wisps streaming in
    ctx.globalCompositeOperation = 'lighter';
    for (const o of s.wisps) {
      o.hist.forEach(([x, y, z], i) => { ctx.globalAlpha = 0.6 * (1 - i / o.hist.length); ctx.fillStyle = i ? GREEN : PALE; ctx.beginPath(); ctx.arc(isoX(x, y), isoY(x, y) - z, 3.2 - i * 0.35, 0, TAU); ctx.fill(); });
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // the lantern: a swinging iron cage, green glass filling with souls, a skull inside
    const [hx, hy] = headAt(p, -6), sw = Math.sin(t * 2.2) * 0.25, f = s.souls / SOULS, sc = G.touch ? 0.85 : 1;
    ctx.save(); ctx.translate(hx - 20 * sc, hy); ctx.rotate(sw); ctx.scale(sc, sc);
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -8); ctx.stroke(); // chain
    glow(ctx, GREEN, 0, 2, 14 + f * 12 + s.flash * 8, 0.3 + f * 0.5 + s.flash * 0.3);
    ctx.fillStyle = 'rgba(20,40,24,0.75)'; ctx.fillRect(-6, -7, 12, 17);
    const fh = 17 * f; ctx.fillStyle = s.crack > 0 ? '#ffffff' : 'rgba(80,255,120,0.75)'; ctx.fillRect(-6, 10 - fh, 12, fh);
    skull(ctx, 0, 2, 1, 0.9);
    ctx.strokeStyle = '#1a1a20'; ctx.lineWidth = 1.5; // the cage bars, cap and foot
    ctx.strokeRect(-6, -7, 12, 17); ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(-2, 10); ctx.moveTo(2, -7); ctx.lineTo(2, 10); ctx.stroke();
    ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(0, -11); ctx.lineTo(8, -7); ctx.closePath(); ctx.fill(); ctx.fillRect(-7, 10, 14, 2);
    ctx.restore();
    // a tally of souls: pale pips under it
    if (s.souls) for (let i = 0; i < SOULS; i++) { ctx.globalAlpha = i < s.souls ? 1 : 0.2; ctx.fillStyle = i < s.souls ? GREEN : '#406040'; ctx.fillRect(hx - 20 * sc - 13 + i * 2, hy + 16 * sc, 1.5, 2); }
    ctx.globalAlpha = 1;
  },
};
