// Carrion Witch: the Hex Poppet. A burlap voodoo doll floats at her shoulder. Every foe she strikes gets a pin in
// the doll and a hex-thread from the doll to its head, a puppet on her string. A pinned foe that dies leaves its pin
// in the doll, black with rot: it still counts, and every rotten pin makes the squeeze 15% crueller. Six pins and
// she SQUEEZES: the threads draw tight, every living puppet is wrenched, stunned and rotted from inside, and the
// ones that die burst into crows and locusts.
import { G, later, stat, power, sigO, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, burst } from '../../gfx/vfx.js';
import { hit } from '../combat.js';

const PINS = 6, HEX = '#b070ff', ROT = '#9ac84a';
const BEADS = ['#ff4040', '#ffd040', '#9ac84a', '#60c0ff', '#ff70d0', '#ffffff', '#ff9030'];

const dollAt = (p, t) => { const px = isoX(p.x, p.y), py = isoY(p.x, p.y) - (p.z || 0); return [px + 26 * (G.touch ? 0.85 : 1), py - 58 * (p.scale || 1) + Math.sin(t * 2.4) * 2]; };
const headOf = (c) => [isoX(c.x, c.y), (c.screenTop ?? isoY(c.x, c.y) - 40) + 4];

function doll(ctx, x, y, pins, rot, wob, squeeze, t) {
  const sq = 1 - squeeze * 0.35, s = G.touch ? 1.1 : 1.35;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.7) * 0.12 + wob * Math.sin(t * 40) * 0.25); ctx.scale(s * (1 + squeeze * 0.15), s * sq);
  ctx.fillStyle = '#a08860'; ctx.strokeStyle = '#4a3820'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, -8, 5, 0, TAU); ctx.fill(); ctx.stroke();           // head
  ctx.beginPath(); ctx.ellipse(0, 1, 4.5, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); // body
  ctx.lineWidth = 2.6; ctx.strokeStyle = '#a08860'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(-8, 2); ctx.moveTo(3, -1); ctx.lineTo(8, 2); ctx.moveTo(-2, 6); ctx.lineTo(-3, 11); ctx.moveTo(2, 6); ctx.lineTo(3, 11); ctx.stroke(); // limbs
  ctx.strokeStyle = '#1a1008'; ctx.lineWidth = 0.9; // X-stitched eyes, a stitched mouth
  for (const ex of [-2, 2]) { ctx.beginPath(); ctx.moveTo(ex - 1.2, -9.2); ctx.lineTo(ex + 1.2, -6.8); ctx.moveTo(ex + 1.2, -9.2); ctx.lineTo(ex - 1.2, -6.8); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-2.5, -5); ctx.lineTo(2.5, -5); for (let i = -2; i <= 2; i += 1.25) { ctx.moveTo(i, -5.8); ctx.lineTo(i, -4.2); } ctx.stroke();
  ctx.strokeStyle = '#6a5030'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 6); ctx.stroke(); // seam
  for (let i = 0; i < pins + rot; i++) { // pins stuck in it, beads out (the rotten ones black)
    const a = -Math.PI / 2 + (i - (PINS - 1) / 2) * 0.42, bx = Math.cos(a) * 9, by = Math.sin(a) * 9 - 2;
    ctx.strokeStyle = '#d0d8e0'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(bx * 0.35, by * 0.35 - 1); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = i < pins ? BEADS[i] : '#1a2a10'; ctx.beginPath(); ctx.arc(bx, by, 1.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

class Squeeze {
  constructor(p, s, pinned, rot) { Object.assign(this, { p, s, pinned, rot, t: 0, dur: 0.85, at: 0.45, done: false }); }
  update(dt) {
    const p = this.p, s = this.s;
    this.t += dt;
    s.squeeze = Math.min(1, this.t / this.at) * (this.t < this.at ? 1 : Math.max(0, 1 - (this.t - this.at) / 0.3));
    if (!this.done && this.t >= this.at) {
      this.done = true;
      const P = power(p) * 4 * (1 + 0.15 * this.rot);
      for (const c of this.pinned) {
        if (c.dead) continue;
        c.curses.amp = { t: 6, amt: 25, src: p };
        hit(p, c, P, 'poison', sigO({ stun: true, poison: true }));
        burst(c.x, c.y, 30, 'poison', 10, 2.5);
        if (c.dead) for (let i = 0; i < 12; i++) { const a = rand(TAU), v = rand(1.5, 4); spawn({ type: i % 3 ? 'dot' : 'shard', x: c.x, y: c.y, z: 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(40, 120), g: i % 3 ? -20 : 60, drag: 1, life: rand(0.6, 1.2), size: i % 3 ? 2 : 4, size1: 1, color: i % 3 ? ROT : '#140c18', rot: a, vr: rand(-8, 8) }); }
        else addEffect(new Ring(c.x, c.y, 0.1, 0.9, 0.3, HEX, 3));
      }
      camera.shake(6); sfx('poison', 1); sfx('shadow', 0.7);
    }
    return this.t < this.dur && !p.dead;
  }
  draw(ctx) {
    const [dx, dy] = dollAt(this.p, G.time || 0), k = Math.min(1, this.t / this.at), a = this.t < this.at ? 1 : 1 - (this.t - this.at) / (this.dur - this.at);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.5 + k * 1.5; // the threads pull taut and blaze
    for (const c of this.pinned) {
      if (c.dead && this.done) continue;
      const [hx, hy] = headOf(c);
      ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = k > 0.8 ? '#ffffff' : HEX;
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(hx, hy); ctx.stroke();
    }
    ctx.restore();
  }
}

export default {
  id: 'carrion_witch', name: 'Hex Poppet', color: HEX,
  desc: 'Every foe she strikes gets a pin in her voodoo doll and a hex-thread to its head: a puppet on her string; the pins of the dead stay, black with rot. Six pins and she SQUEEZES: every living puppet is wrenched, stunned and rotted from inside.',
  init: () => ({ pins: [], wob: 0, rot: 0, squeeze: 0, busy: 0 }),
  enter(p, s) { s.pins.length = 0; },
  hit(p, s, tgt) {
    if (s.busy > 0 || s.pins.length >= PINS || s.pins.includes(tgt) || tgt.team !== 'enemy') return;
    s.pins.push(tgt); s.wob = 1;
    s.rot = Math.min(s.rot, PINS - s.pins.length); // a full doll of rot makes room for a living puppet
    spawn({ type: 'glow', x: tgt.x, y: tgt.y, z: 50, vz: -30, life: 0.35, size: 6, size1: 0, color: HEX, add: true });
  },
  update(p, s, dt) {
    s.wob = Math.max(0, s.wob - dt * 3); s.busy = Math.max(0, s.busy - dt);
    for (let i = s.pins.length - 1; i >= 0; i--) {
      const c = s.pins[i];
      if (c.dead || c.world !== p.world || Math.hypot(c.x - p.x, c.y - p.y) > 14) { s.pins.splice(i, 1); if (c.dead) s.rot++; }
    }
    if (s.pins.length + s.rot >= PINS && s.pins.length && s.busy <= 0) this.fire(p, s);
  },
  fill: (s) => (s.pins.length + s.rot) / PINS,
  fire(p, s) {
    const pinned = s.pins.splice(0), rot = s.rot;
    if (!pinned.length) return;
    s.busy = 0.9; s.rot = 0;
    p.world.addHazard(new Squeeze(p, s, pinned, rot));
    floatText(p.x, p.y, 104, 'SQUEEZE', HEX, 19, { life: 1.6, vz: 16 });
    later(p.world, 0.1, () => sfx('bones', 0.6));
    stat('carrion_witch', 'fire');
  },
  draw(ctx, p, s, t) {
    const [dx, dy] = dollAt(p, t);
    if (s.pins.length) { // hex-threads to every puppet, sagging and swaying
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
      s.pins.forEach((c, i) => {
        const [hx, hy] = headOf(c), mx = (dx + hx) / 2 + Math.sin(t * 2 + i) * 6, my = Math.max(dy, hy) + 14 + Math.sin(t * 1.6 + i * 2) * 4;
        ctx.globalAlpha = 0.55; ctx.strokeStyle = HEX; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.quadraticCurveTo(mx, my, hx, hy); ctx.stroke();
        ctx.globalAlpha = 0.9; ctx.fillStyle = BEADS[i]; ctx.fillRect(hx - 1, hy - 7, 2, 2); // a pin bead over the puppet
        ctx.strokeStyle = '#d0d8e0'; ctx.beginPath(); ctx.moveTo(hx, hy - 5); ctx.lineTo(hx, hy); ctx.stroke();
      });
      ctx.restore();
    }
    glow(ctx, HEX, dx, dy, 12 + s.pins.length * 2, 0.2 + s.pins.length * 0.05 + s.squeeze * 0.5);
    doll(ctx, dx, dy, s.pins.length, s.rot, s.wob, s.squeeze, t);
  },
};
