// Lancer: Rally the Order. A war banner rises on a pole from his back and unfurls as he earns Valor: by his blows,
// by every foe he fells and by every wound he takes standing his ground. Full Valor and the banner blazes: CHARGE OF
// THE ORDER. Five phantom knights on phantom chargers thunder out from behind him, lances levelled, and ride down
// everything in their path; the Order's oath steels him (Rallied: damage reduction, armor) for a while after.
import { G, stat, power, sigO, crowd, foesNear, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, floatText, spawn, smoke } from '../../gfx/vfx.js';
import { hit } from '../combat.js';

const MAX = 100, SILVER = '#d8e0f0', BLUE = '#2a4a9a', GHOST = '#b8d8ff';

/** A charging knight, in screen space, facing dir (1 right, -1 left); ph = gallop phase. */
function knight(ctx, x, y, dir, ph, a) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.globalAlpha = a;
  const leg = (ox, k) => { const sw = Math.sin(ph + k) * 6; ctx.beginPath(); ctx.moveTo(ox, -10); ctx.lineTo(ox + sw * 0.6, -4); ctx.lineTo(ox + sw, 0); ctx.stroke(); };
  ctx.strokeStyle = GHOST; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  leg(-8, 0); leg(-5, 1.6); leg(6, 3.1); leg(9, 4.7);
  ctx.fillStyle = GHOST;
  ctx.beginPath(); ctx.ellipse(0, -13, 11, 5, 0, 0, TAU); ctx.fill();                                // the charger
  ctx.beginPath(); ctx.moveTo(8, -15); ctx.lineTo(14, -24); ctx.lineTo(19, -22); ctx.lineTo(13, -12); ctx.closePath(); ctx.fill(); // neck and head
  ctx.beginPath(); ctx.moveTo(-10, -14); ctx.quadraticCurveTo(-17, -12 + Math.sin(ph * 2) * 2, -16, -6); ctx.lineWidth = 2; ctx.stroke(); // tail
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -28, 6, 12);                                               // the rider
  ctx.beginPath(); ctx.arc(0, -31, 3.2, 0, TAU); ctx.fill();
  ctx.fillStyle = GHOST; ctx.fillRect(-6, -26, 4, 8);                                                    // his shield
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, -22); ctx.lineTo(34, -19); ctx.stroke(); // the lance
  ctx.fillStyle = '#8ab8ff'; ctx.beginPath(); ctx.moveTo(26, -19.5); ctx.lineTo(20, -23); ctx.lineTo(20, -19.8); ctx.fill(); // pennant
  ctx.restore();
}

class Charge {
  constructor(p, ang) {
    const nx = -Math.sin(ang), ny = Math.cos(ang), riders = [];
    for (let i = 0; i < 5; i++) { const off = (i - 2) * 0.95, back = 3.5 + Math.abs(i - 2) * 0.6; riders.push({ x: p.x - Math.cos(ang) * back + nx * off, y: p.y - Math.sin(ang) * back + ny * off, ph: rand(TAU), hit: new Set() }); }
    Object.assign(this, { p, ang, riders, t: 0, dur: 1.15, speed: 13 });
  }
  update(dt) {
    const p = this.p, w = this.world, P = power(p), dx = Math.cos(this.ang), dy = Math.sin(this.ang);
    this.t += dt;
    for (const r of this.riders) {
      r.x += dx * this.speed * dt; r.y += dy * this.speed * dt; r.ph += dt * 22;
      for (const c of w.hostiles(p.team, r.x, r.y, 0.9)) {
        if (r.hit.has(c)) continue;
        r.hit.add(c);
        hit(p, c, P * 3, 'light', sigO({ knock: 1.5, ang: this.ang, stun: true, noArc: true }));
      }
      if (Math.random() < 0.5) smoke(r.x, r.y, 2, '#8a8070', 1, 6);
      if (Math.random() < 0.4) spawn({ type: 'glow', x: r.x, y: r.y, z: rand(10, 40), vz: 10, life: 0.4, size: 3, size1: 0, color: GHOST, add: true });
    }
    if (Math.random() < dt * 20) camera.shake(2);
    return this.t < this.dur && !p.dead;
  }
  draw(ctx) {
    const a = Math.min(1, this.t / 0.15) * Math.min(1, (this.dur - this.t) / 0.25);
    const sdx = Math.cos(this.ang) - Math.sin(this.ang), dir = sdx >= 0 ? 1 : -1;
    const order = this.riders.slice().sort((u, v) => u.x + u.y - (v.x + v.y));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of order) { const px = isoX(r.x, r.y), py = isoY(r.x, r.y); glow(ctx, '#6aa0ff', px, py - 18, 30, 0.45 * a); ctx.globalCompositeOperation = 'lighter'; knight(ctx, px, py, dir, r.ph, 0.7 * a); }
    ctx.restore();
  }
}

export default {
  id: 'lancer', name: 'Rally the Order', color: SILVER,
  desc: 'A war banner on his back unfurls as he earns Valor from his blows, his kills and the wounds he takes holding the line. Full Valor: CHARGE OF THE ORDER, five phantom knights ride down everything before him.',
  init: (p) => ({ valor: 0, hp: p.hp, flash: 0, busy: 0 }),
  hit(p, s) { this.add(s, 1.8); },
  kill(p, s) { this.add(s, 5); },
  add(s, n) { if (s.busy <= 0) s.valor = Math.min(MAX, s.valor + n); },
  update(p, s, dt) {
    s.flash = Math.max(0, s.flash - dt * 2); s.busy = Math.max(0, s.busy - dt);
    if (p.hp < s.hp) this.add(s, ((s.hp - p.hp) / p.maxHp) * 120); // wounds taken holding the line
    s.hp = p.hp;
    if (s.valor >= MAX && s.busy <= 0 && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (foesNear(p, p.x, p.y, 8).length) this.fire(p, s); }
  },
  fill: (s) => s.valor / MAX,
  fire(p, s) {
    const c = crowd(p, 9), ang = c ? Math.atan2(c[1] - p.y, c[0] - p.x) : p.facing || 0;
    s.valor = 0; s.busy = 1.4; s.flash = 1;
    p.world.addHazard(new Charge(p, ang));
    p.addBuff({ id: 'sig_rallied', name: 'Rallied: 15% less damage taken, +40% armor', el: 'light', fx: 'aura', stats: { reduce: 15, armor: 40 }, t: 8, max: 8 });
    floatText(p.x, p.y, 110, 'FOR THE ORDER!', SILVER, 19, { life: 1.8, vz: 16 });
    sfx('roar', 0.6); sfx('thud', 0.7);
    stat('lancer', 'fire');
  },
  back(ctx, p, s, t) {
    const f = s.valor / MAX, px = isoX(p.x, p.y) + 10, py = isoY(p.x, p.y) - (p.z || 0) - 26 * (p.scale || 1), top = py - 62;
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, top); ctx.stroke(); // the pole
    ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px - 1, top + 2); ctx.lineTo(px + 23, top + 2); ctx.stroke(); // crossbar
    ctx.fillStyle = '#e0c060'; ctx.beginPath(); ctx.moveTo(px, top - 5); ctx.lineTo(px - 2, top); ctx.lineTo(px + 2, top); ctx.fill(); // finial
    const L = 8 + 36 * f, W = 22, sp = f >= 1 ? 9 : 4;
    if (f >= 1) glow(ctx, '#8ab8ff', px + 8, top + L / 2, 26, 0.4 + 0.2 * Math.sin(t * 8));
    ctx.beginPath(); // the cloth, rippling
    const wave = (y) => Math.sin(t * sp - y * 0.25) * (1.5 + y * 0.06);
    ctx.moveTo(px, top + 2);
    for (let y = 0; y <= L; y += 3) ctx.lineTo(px + wave(y), top + 2 + y);
    ctx.lineTo(px + W / 2 + wave(L + 4), top + 2 + L + 5); // swallowtail point
    for (let y = L; y >= 0; y -= 3) ctx.lineTo(px + W + wave(y), top + 2 + y);
    ctx.closePath();
    ctx.fillStyle = BLUE; ctx.fill(); ctx.strokeStyle = SILVER; ctx.lineWidth = 1; ctx.stroke();
    if (L > 14) { // the Order's emblem: a lance over a tower shield
      const ex = px + W / 2 + wave(L * 0.45), ey = top + 2 + L * 0.45;
      ctx.fillStyle = SILVER; ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey - 5); ctx.lineTo(ex + 5, ey + 1); ctx.lineTo(ex, ey + 6); ctx.lineTo(ex - 5, ey + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 6, ey + 6); ctx.lineTo(ex + 6, ey - 7); ctx.stroke();
    }
  },
};
