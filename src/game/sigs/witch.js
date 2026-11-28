// Carrion Witch: the Hex Poppet. A burlap voodoo doll floats at her shoulder. Every foe she strikes gets a pin in
// the doll and a hex-thread from the doll to its head, a puppet on her string. A pinned foe that dies leaves its pin
// in the doll, black with rot: it still counts, and every rotten pin makes the squeeze 15% crueller. Six pins and
// she SQUEEZES: the threads draw tight, every living puppet is wrenched, stunned and rotted from inside, and the
// ones that die burst into crows and locusts.
// The doll is the 3D poppet of gfx/voodoodoll3d.js (the flat `doll` below is drawn until it loads): each pin is a
// needle stabbed in (the jab clip), rotten pins are its festering twins, the threads run from the wounds, and the
// SQUEEZE crushes it in an unseen fist. Her Voodoo Doll curse hangs a great spectral poppet over the cursed and
// stabs it (Effigy).
import { G, later, stat, power, sigO, glow, foesNear, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, burst } from '../../gfx/vfx.js';
import { hit } from '../combat.js';
import { drawDoll, dollPin, JAB, JAB_HIT } from '../../gfx/voodoodoll3d.js';

const PINS = 6, HEX = '#b070ff', ROT = '#9ac84a';
const BEADS = ['#ff4040', '#ffd040', '#9ac84a', '#60c0ff', '#ff70d0', '#ffffff', '#ff9030'];

const dollAt = (p, t) => { const px = isoX(p.x, p.y), py = isoY(p.x, p.y) - (p.z || 0); return [px + 26 * (G.touch ? 0.85 : 1), py - 58 * (p.scale || 1) + Math.sin(t * 2.4) * 2]; };
const KEY = 'hexpoppet', dollK = (p) => (G.touch ? 38 : 44) * (p.scale || 1);
/** Where pin i's thread leaves the doll: its wound on the 3D poppet, else the doll's middle. */
function woundAt(p, i, t) {
  const [dx, dy] = dollAt(p, t), w = dollPin(KEY, i);
  return w ? [dx + w[0], dy + dollK(p) * 0.5 + w[1]] : [dx, dy];
}
function star(ctx, x, y, r, a, color) { // the glint of a needle going in
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  ctx.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 4 + 0.3, k = i % 2 ? 0.55 : 1; ctx.moveTo(x - Math.cos(an) * r * k, y - Math.sin(an) * r * k); ctx.lineTo(x + Math.cos(an) * r * k, y + Math.sin(an) * r * k); } ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); ctx.restore();
}
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
    this.pinned.forEach((c, i) => {
      if (c.dead && this.done) return;
      const [hx, hy] = headOf(c), [wx, wy] = dollPin(KEY, 'head') ? woundAt(this.p, i, G.time || 0) : [dx, dy];
      ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = k > 0.8 ? '#ffffff' : HEX;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(hx, hy); ctx.stroke();
    });
    ctx.restore();
  }
}

/** The Voodoo Doll curse: a great spectral poppet hangs over the cursed, dances on its rope and takes three needles. */
class Effigy {
  constructor(x, y, n) { Object.assign(this, { x, y, t: 0, dur: 1.9, key: 'effigy' + (Effigy.n = (Effigy.n || 0) + 1) % 4, jabs: Math.min(3, Math.max(1, n)) }); }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const t = this.t, sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), k = 104 * (G.touch ? 0.8 : 1), rise = Math.min(1, t / 0.25), fade = Math.min(1, (this.dur - t) / 0.45);
    const n = Math.min(this.jabs, Math.floor((t - 0.3) / 0.38) + 1), jt = t - 0.3 - (n - 1) * 0.38, slot = Math.max(0, n - 1); // skull, heart, eye
    const y0 = sy - 30 - 26 * rise + Math.sin(t * 5) * 2;
    glow(ctx, HEX, sx, y0 - k * 0.5, k * 0.75, 0.3 * fade * rise);
    const o = { key: this.key, k, yaw: Math.PI / 4 + Math.sin(t * 3) * 0.35, clip: 'dance', t, pins: Math.max(0, n), add: true, alpha: 0.85 * fade * rise, tint: [0.75, 0.55, 1.15], ember: 3, light: 1.25 };
    if (n > 0 && jt < JAB) { o.clip = 'jab' + (slot + 1); o.t = jt; o.loop = false; o.clip2 = 'dance'; o.t2 = t; o.mix = Math.max(0, 1 - (JAB - jt) / 0.2); }
    if (!drawDoll(ctx, sx, y0, o)) { ctx.save(); ctx.globalAlpha = 0.7 * fade * rise; ctx.globalCompositeOperation = 'lighter'; doll(ctx, sx, y0 - k * 0.5, Math.max(0, n), 0, 1, 0, t); ctx.restore(); return; }
    if (n > 0 && jt > JAB_HIT && jt < JAB_HIT + 0.2) { const w = dollPin(this.key, slot); if (w) star(ctx, sx + w[0], y0 + w[1], 16 * (1 - (jt - JAB_HIT) / 0.2) + 5, fade, '#ffffff'); }
  }
}

export default {
  id: 'carrion_witch', name: 'Hex Poppet', color: HEX,
  desc: 'Every foe she strikes gets a pin in her voodoo doll and a hex-thread to its head: a puppet on her string; the pins of the dead stay, black with rot. Six pins and she SQUEEZES: every living puppet is wrenched, stunned and rotted from inside.',
  init: () => ({ pins: [], wob: 0, rot: 0, squeeze: 0, busy: 0, jab: null, sqT: -1 }),
  enter(p, s) { s.pins.length = 0; },
  hit(p, s, tgt) {
    if (s.busy > 0 || s.pins.length >= PINS || s.pins.includes(tgt) || tgt.team !== 'enemy') return;
    s.pins.push(tgt); s.wob = 1; s.jab = { slot: s.pins.length - 1, t: 0 };
    s.rot = Math.min(s.rot, PINS - s.pins.length); // a full doll of rot makes room for a living puppet
    spawn({ type: 'glow', x: tgt.x, y: tgt.y, z: 50, vz: -30, life: 0.35, size: 6, size1: 0, color: HEX, add: true });
  },
  update(p, s, dt) {
    s.wob = Math.max(0, s.wob - dt * 3); s.busy = Math.max(0, s.busy - dt);
    if (s.jab && (s.jab.t += dt) >= JAB) s.jab = null;
    if (s.sqT >= 0 && (s.sqT += dt) >= 1) s.sqT = -1;
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
    s.busy = 0.9; s.rot = 0; s.sqT = 0; s.jab = null; s.sqPins = pinned.length; s.sqRot = rot;
    p.world.addHazard(new Squeeze(p, s, pinned, rot));
    floatText(p.x, p.y, 104, 'SQUEEZE', HEX, 19, { life: 1.6, vz: 16 });
    later(p.world, 0.1, () => sfx('bones', 0.6));
    stat('carrion_witch', 'fire');
  },
  cast(p, s, sk, L, tx, ty) { // her Voodoo Doll curse: the effigy of the cursed, stabbed over their heads
    if (sk.name !== 'Voodoo Doll') return;
    const near = foesNear(p, tx, ty, 3).length;
    addEffect(new Effigy(tx, ty, near || 1), 'top'); sfx('shadow', 0.5);
  },
  draw(ctx, p, s, t) {
    const [dx, dy] = dollAt(p, t), K = dollK(p), sq = s.sqT >= 0, live = s.pins.length;
    // the 3D poppet: asked for first, so the threads know where its wounds are
    const o = { key: KEY, k: K, yaw: Math.PI / 4 + Math.sin(t * 0.55) * 0.75, clip: 'idle', t, pins: sq && s.sqT < 0.5 ? s.sqPins : live, rot: sq && s.sqT < 0.5 ? s.sqRot : s.rot, jab: s.jab, ember: 1 + live * 0.3 + s.squeeze * 3 };
    if (sq) { o.clip = 'squeeze'; o.t = s.sqT; o.loop = false; o.jab = null; if (s.sqT > 0.8) { o.clip2 = 'idle'; o.t2 = t; o.mix = (s.sqT - 0.8) / 0.2; } }
    const fy = dy + K * 0.5, gx = isoX(p.x, p.y) + (dx - isoX(p.x, p.y)) * 0.9, gy = isoY(p.x, p.y) + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(gx, gy, K * 0.2, K * 0.09, 0, 0, TAU); ctx.fill(); // its faint shadow on the floor
    glow(ctx, s.rot ? ROT : HEX, dx, fy + 2, K * 0.42, 0.28 + live * 0.05 + s.squeeze * 0.4); // the under-glow: hex violet, green once pins rot
    glow(ctx, HEX, dx, dy, K * 0.5 + live * 2, 0.16 + live * 0.04 + s.squeeze * 0.5);
    const d3 = drawDoll(ctx, dx, fy, o);
    if (s.pins.length) { // hex-threads to every puppet, sagging and swaying
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
      s.pins.forEach((c, i) => {
        const [hx, hy] = headOf(c), mx = (dx + hx) / 2 + Math.sin(t * 2 + i) * 6, my = Math.max(dy, hy) + 14 + Math.sin(t * 1.6 + i * 2) * 4;
        const [wx, wy] = d3 ? woundAt(p, i, t) : [dx, dy];
        ctx.globalAlpha = 0.55; ctx.strokeStyle = HEX; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(mx, my, hx, hy); ctx.stroke();
        ctx.globalAlpha = 0.9; ctx.fillStyle = BEADS[i]; ctx.fillRect(hx - 1, hy - 7, 2, 2); // a pin bead over the puppet
        ctx.strokeStyle = '#d0d8e0'; ctx.beginPath(); ctx.moveTo(hx, hy - 5); ctx.lineTo(hx, hy); ctx.stroke();
      });
      ctx.restore();
    }
    if (!d3) { doll(ctx, dx, dy, live, s.rot, s.wob, s.squeeze, t); return; }
    const j = s.jab;
    if (j && j.t > JAB_HIT && j.t < JAB_HIT + 0.18) { const [wx, wy] = woundAt(p, j.slot, t), f = (j.t - JAB_HIT) / 0.18; star(ctx, wx, wy, 4 + 7 * (1 - f), 1 - f, BEADS[j.slot]); }
  },
};
