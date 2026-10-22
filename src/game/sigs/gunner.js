// Gunner: the Bombing Run. Every new foe he shoots is painted: a red target lock hangs over it, it shows as a blip on
// the little radar over his head, and the radar counts the mark (a painted foe that dies still counts). Ten marks and
// he calls it in: a biplane roars across the field low over his targets, its shadow racing over the floor, and drops
// eight whistling bombs on the painted foes still standing and on whatever is nearest him. The biplane is a three.js
// model baked to sprites (src/gfx/gunner3d.js); it swoops in, levels off over the targets and climbs away.
import { G, later, stat, power, sigO, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, floatText, spawn, smoke, addDecal } from '../../gfx/vfx.js';
import { explosionFx } from '../../gfx/shapes.js';
import { aoe } from '../combat.js';
import { drawBiplane3D, preloadGunner3D } from '../../gfx/gunner3d.js';

const MAX = 10, BOMBS = 8, RED = '#ff3a2a', AMBER = '#d0a060', PLANE_Z = 150, SPEED = 16;
const planeZ = (u) => PLANE_Z + 70 * (2 * u - 1) ** 2;   // swoops in, low over the targets, climbs away

function reticle(ctx, x, y, t, k = 1) {
  const r = 7 * k, a = t * 2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = RED; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0.3, 1.27); ctx.moveTo(Math.cos(1.87) * r, Math.sin(1.87) * r); ctx.arc(0, 0, r, 1.87, 2.84);
  ctx.moveTo(Math.cos(3.44) * r, Math.sin(3.44) * r); ctx.arc(0, 0, r, 3.44, 4.41); ctx.moveTo(Math.cos(5.01) * r, Math.sin(5.01) * r); ctx.arc(0, 0, r, 5.01, 5.98); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = RED; ctx.fillRect(x - 1, y - 1, 2, 2);
}
/** A biplane in screen space facing dir (1 right, -1 left). */
function biplane(ctx, x, y, dir, t, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  ctx.fillStyle = '#6a5a40'; ctx.fillRect(-14, -12, 30, 3);       // upper wing
  ctx.fillStyle = '#8a7a5a'; ctx.fillRect(-12, -3, 26, 3);        // lower wing
  ctx.strokeStyle = '#3a3020'; ctx.lineWidth = 1; ctx.beginPath(); for (const sx of [-8, 8]) { ctx.moveTo(sx, -9); ctx.lineTo(sx + 1, -3); } ctx.stroke(); // struts
  ctx.fillStyle = '#a08a5a'; ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(14, -8); ctx.lineTo(18, -4); ctx.lineTo(14, 0); ctx.lineTo(-22, -3); ctx.closePath(); ctx.fill(); // fuselage
  ctx.fillStyle = '#6a5a40'; ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(-26, -14); ctx.lineTo(-19, -6); ctx.fill(); ctx.fillRect(-25, -5, 8, 2); // tail
  ctx.fillStyle = '#c02818'; ctx.beginPath(); ctx.arc(0, -10.5, 2, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -10.5, 0.8, 0, TAU); ctx.fill(); // roundel
  ctx.fillStyle = '#2a2018'; ctx.fillRect(2, -10, 4, 2);          // the pilot
  ctx.globalAlpha = 0.6; ctx.fillStyle = '#d0d0d0'; const pr = 6 * Math.abs(Math.sin(t * 60)); ctx.fillRect(18, -4 - pr, 1.5, pr * 2); ctx.globalAlpha = 1; // propeller blur
  ctx.restore();
}

class Bomb {
  constructor(p, c, ox = 0, oy = 0) { Object.assign(this, { p, c, ox, oy, x: c.x + ox, y: c.y + oy, t: 0, dur: 0.5 }); sfx('swing', 0.3); }
  get depth() { return this.x + this.y + 0.5; }
  update(dt) {
    this.t += dt;
    if (!this.c.dead && this.t < this.dur * 0.6) { this.x = this.c.x + this.ox; this.y = this.c.y + this.oy; } // it was aimed where the target was going
    if (this.t >= this.dur) {
      const p = this.p;
      explosionFx(this.x, this.y, 1.6, 'fire', 'explosion');
      aoe(p.world, p, this.x, this.y, 1.6, power(p) * 4.5, 'fire', sigO({ knock: 0.8, burn: true }));
      addDecal(this.x, this.y, 'rgba(20,10,4,0.6)', 0.55, 'scorch', 0.5);
      smoke(this.x, this.y, 10, '#3a3028', G.touch ? 3 : 6, 12);
      camera.shake(4);
      return false;
    }
    return true;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), z = PLANE_Z * (1 - (this.t / this.dur) ** 2);
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, py, 4, 1.6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(px, py - z, 2.4, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a6a6a'; ctx.fillRect(px - 2.5, py - z - 6, 5, 2);
  }
}

class Run {
  constructor(p, locks) {
    const cx = locks.reduce((s, c) => s + c.x, 0) / locks.length, cy = locks.reduce((s, c) => s + c.y, 0) / locks.length;
    let ang = Math.atan2(cy - p.y, cx - p.x);
    if (Math.hypot(cx - p.x, cy - p.y) < 0.5) ang = rand(TAU);
    const L = 14, x0 = cx - Math.cos(ang) * L, y0 = cy - Math.sin(ang) * L;
    const seen = new Set(), drops = locks.map((c) => { const again = seen.has(c); seen.add(c); return { c, ox: again ? rand(-1, 1) : 0, oy: again ? rand(-1, 1) : 0, at: Math.max(0.05, ((c.x - x0) * Math.cos(ang) + (c.y - y0) * Math.sin(ang)) / SPEED - 0.3 + (again ? rand(0.05, 0.2) : 0)), done: false }; });
    Object.assign(this, { p, ang, x0, y0, L, t: 0, dur: (2 * L) / SPEED, drops, x: x0, y: y0 });
    sfx('shoot', 0.4);
  }
  update(dt) {
    const p = this.p, w = this.world;
    this.t += dt;
    this.x = this.x0 + Math.cos(this.ang) * SPEED * this.t; this.y = this.y0 + Math.sin(this.ang) * SPEED * this.t;
    if (!this.shade) w.addHazard(this.shade = { ground: true, update: () => this.t < this.dur, draw: (ctx) => this.drawShadow(ctx) }); // its shadow on the floor
    for (const d of this.drops) if (!d.done && this.t >= d.at) { d.done = true; if (!p.dead) w.addHazard(new Bomb(p, d.c, d.ox, d.oy)); }
    if (Math.random() < 0.7) smoke(this.x, this.y, planeZ(this.t / this.dur) - 4, '#9a9080', 1, 5);
    if (Math.random() < dt * 6) sfx('shoot', 0.15);
    return this.t < this.dur;
  }
  drawShadow(ctx) {
    const u = this.t / this.dur, k = (G.touch ? 0.85 : 1) * (1 - 0.25 * Math.abs(2 * u - 1));   // smaller as it climbs
    drawBiplane3D(ctx, isoX(this.x, this.y), isoY(this.x, this.y), 0, this.ang, this.t, k, 0, true);
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), sdx = Math.cos(this.ang) - Math.sin(this.ang), u = this.t / this.dur;
    // the 3D biplane, rocking its wings; the old drawn one until its sheet is in
    if (drawBiplane3D(ctx, px, py, planeZ(u), this.ang, this.t, G.touch ? 0.85 : 1, Math.sin(this.t * 5) * 0.05 + (u > 0.75 ? (u - 0.75) * (sdx >= 0 ? -0.6 : 0.6) : 0))) return;
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#000'; // its shadow racing over the floor
    ctx.beginPath(); ctx.ellipse(px, py, 34, 9, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    const sy = (Math.cos(this.ang) + Math.sin(this.ang)) * 0.5, tilt = Math.atan2(sy, Math.abs(sdx)) * 0.5;
    ctx.save(); ctx.translate(px, py - PLANE_Z); ctx.rotate(tilt * (sdx >= 0 ? 1 : -1)); biplane(ctx, 0, 0, sdx >= 0 ? 1 : -1, this.t, G.touch ? 1.7 : 2.2); ctx.restore();
  }
}

export default {
  id: 'gunner', name: 'Bombing Run', color: AMBER,
  desc: 'Every new foe he shoots is painted with a target lock and marked on the radar over his head. Ten marks and he calls in a BOMBING RUN: a biplane roars over and drops eight bombs on his painted targets.',
  init: () => ({ locks: [], marks: 0, busy: 0, sweep: 0, ping: 0 }),
  enter(p, s) { s.locks.length = 0; preloadGunner3D(); },
  hit(p, s, tgt) {
    if (s.busy > 0 || s.marks >= MAX || s.locks.includes(tgt) || tgt.team !== 'enemy') return;
    s.locks.push(tgt); s.marks++; s.ping = 1;
  },
  update(p, s, dt) {
    s.busy = Math.max(0, s.busy - dt); s.sweep += dt * 4; s.ping = Math.max(0, s.ping - dt * 3);
    for (let i = s.locks.length - 1; i >= 0; i--) { const c = s.locks[i]; if (c.dead || c.world !== p.world || Math.hypot(c.x - p.x, c.y - p.y) > 13) s.locks.splice(i, 1); }
    if (s.busy <= 0 && s.marks >= MAX && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (s.locks.length || foesNear(p, p.x, p.y, 9).length) this.fire(p, s); }
  },
  fill: (s) => s.marks / MAX,
  fire(p, s) {
    const targets = s.locks.splice(0).slice(0, BOMBS), near = foesNear(p, p.x, p.y, 9);
    for (let i = 0; targets.length < BOMBS && (near.length || targets.length); i++) targets.push(near.length ? near[i % near.length] : targets[i % targets.length]);
    if (!targets.length) return;
    s.busy = 2.6; s.marks = 0;
    p.world.addHazard(new Run(p, targets));
    floatText(p.x, p.y, 104, 'BOMBING RUN', AMBER, 18, { life: 1.6, vz: 16 });
    later(p.world, 0.3, () => sfx('roar', 0.2));
    stat('gunner', 'fire');
  },
  draw(ctx, p, s, t) {
    for (const c of s.locks) { if (!c.dead) reticle(ctx, isoX(c.x, c.y), (c.screenTop ?? isoY(c.x, c.y) - 40) + 14, t); }
    if (!s.marks && s.busy <= 0) return;
    // the radar: a green scope, a sweeping arm, a blip for every lock
    const [cx, cy] = headAt(p, 12), R = G.touch ? 9 : 11;
    ctx.fillStyle = 'rgba(6,20,10,0.8)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a8a40'; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, TAU); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const a = s.sweep - i * 0.12; ctx.globalAlpha = 0.35 * (1 - i / 6); ctx.strokeStyle = '#60ff60'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const c of s.locks) {
      const dx = isoX(c.x, c.y) - isoX(p.x, p.y), dy = isoY(c.x, c.y) - isoY(p.x, p.y), d = Math.hypot(dx, dy), k = Math.min(1, d / 260) * (R - 2) / (d || 1);
      ctx.fillStyle = RED; ctx.fillRect(cx + dx * k - 1, cy + dy * k - 1, 2.4, 2.4);
    }
    ctx.restore();
    if (s.ping > 0) glow(ctx, RED, cx, cy, R * 1.6, s.ping * 0.5);
    ctx.font = `bold ${G.touch ? 6 : 7}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = s.marks >= MAX - 2 ? RED : '#80ff80';
    ctx.fillText(s.busy > 0 ? 'INBOUND' : `MARK ${s.marks}/${MAX}`, cx, cy + R + 8);
  },
};
