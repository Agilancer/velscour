// Ranger: the Hunt. A spirit hawk circles high over the field and marks the toughest foe in reach as her QUARRY (a
// reticle under it, the hawk wheeling over it). Every arrow that strikes the quarry earns a feather (other hits a
// little). Six feathers and the hawk folds its wings and STOOPS: a screaming dive that tears into the quarry and
// rakes the foes beside it. Taking the quarry down by any means grants Hunter's Focus (crit, damage) and a feather.
import { G, stat, power, sigO, toughest, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, HW, HH, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, burst } from '../../gfx/vfx.js';
import { hit } from '../combat.js';

const FEATHERS = 6, HAWK_Z = 96, GREEN = '#7ccf5a', CREAM = '#f0e6c8';

/** The hawk, in screen space: wings spread (k = flap) or folded (fold = 1) into a stoop. */
function drawHawk(ctx, x, y, head, flap, fold = 0, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(head); ctx.scale(s, s);
  const up = Math.sin(flap) * 5 * (1 - fold), span = 13 * (1 - 0.7 * fold);
  const wingPath = () => {
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.quadraticCurveTo(-4, -span * 0.6 - up, -6, -span - up); ctx.quadraticCurveTo(-1, -span * 0.4, 2, -1.5);
    ctx.moveTo(-2, 0); ctx.quadraticCurveTo(-4, span * 0.6 + up, -6, span + up); ctx.quadraticCurveTo(-1, span * 0.4, 2, 1.5);
  };
  wingPath(); ctx.strokeStyle = 'rgba(150,255,130,0.6)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); // the spirit's rim light
  wingPath(); ctx.fillStyle = '#e8f4dc'; ctx.fill(); // pale spirit wings
  ctx.fillStyle = '#4a6a3a'; // dark primaries at the wing tips
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-6, sg * (span + up)); ctx.lineTo(-3.2, sg * (span * 0.55 + up * 0.6)); ctx.lineTo(-1.5, sg * (span * 0.6 + up * 0.5)); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#c8b890'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.4, 0, 0, TAU); ctx.fill(); // body
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-10, -3); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill(); // tail fan
  ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(5.5, 0, 2, 0, TAU); ctx.fill(); // white head
  ctx.fillStyle = '#ffc040'; ctx.fillRect(7, -0.6, 2, 1.2); // beak
  ctx.restore();
}
/** A feather icon. */
function feather(ctx, x, y, a, lit, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.globalAlpha = lit ? 1 : 0.3;
  ctx.fillStyle = lit ? CREAM : '#6a6050';
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.quadraticCurveTo(2.6, -1, 0, 4); ctx.quadraticCurveTo(-2.6, -1, 0, -5); ctx.fill();
  ctx.strokeStyle = lit ? '#6a4a28' : '#403a30'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, -4.5); ctx.lineTo(0, 5.5); ctx.stroke();
  if (lit) { ctx.fillStyle = GREEN; ctx.fillRect(-1, -4, 2, 1.4); }
  ctx.restore(); ctx.globalAlpha = 1;
}
const featherBurst = (x, y, z, n) => { for (let i = 0; i < n; i++) { const a = rand(TAU), v = rand(1, 3); spawn({ type: 'shard', x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(10, 70), g: 40, drag: 2, life: rand(0.6, 1.2), size: rand(2, 3.5), size1: 1, color: i % 3 ? CREAM : '#6a4a28', rot: a, vr: rand(-6, 6) }); } };

class Stoop {
  constructor(p, s, q) { Object.assign(this, { p, s, q, t: 0, dur: 0.5, hitDone: false, x0: s.hx, y0: s.hy, z0: s.hz }); }
  update(dt) {
    const s = this.s, q = this.q, p = this.p;
    this.t += dt;
    const k = Math.min(1, this.t / this.dur), e = k * k;
    if (k < 1) { s.hx = this.x0 + (q.x - this.x0) * e; s.hy = this.y0 + (q.y - this.y0) * e; s.hz = this.z0 + (24 - this.z0) * e; s.fold = 1; }
    else if (!this.hitDone) {
      this.hitDone = true; s.fold = 0;
      const P = power(p);
      if (!q.dead) hit(p, q, P * 8, 'phys', sigO({ bleed: true, knock: 0.6 }));
      for (const c of foesNear(p, q.x, q.y, 2.2).filter((c) => c !== q).slice(0, 2)) { hit(p, c, P * 3, 'phys', sigO({ bleed: true })); featherBurst(c.x, c.y, 26, 5); }
      featherBurst(q.x, q.y, 30, G.touch ? 10 : 20);
      addEffect(new Ring(q.x, q.y, 0.1, 1.8, 0.35, CREAM, 4));
      burst(q.x, q.y, 26, 'blood', 12, 3);
      camera.shake(5); sfx('crit', 0.9);
    }
    if (k >= 1) { s.hz += dt * 160; s.dive = null; return this.t < this.dur + 0.4 ? true : false; }
    if (Math.random() < 0.6) spawn({ type: 'streak', x: s.hx, y: s.hy, z: s.hz, vx: 0, vy: 0, vz: 0, life: 0.18, size: 2, color: CREAM, add: true });
    return true;
  }
  draw() {}
}

export default {
  id: 'ranger', name: 'The Hunt', color: GREEN,
  desc: 'A spirit hawk marks the toughest foe as her quarry. Arrows that strike it earn feathers; six feathers and the hawk stoops on it in a screaming dive. Taking the quarry grants Hunter\'s Focus.',
  init: (p) => ({ quarry: null, feathers: 0, gap: 0, look: 0, hx: p.x, hy: p.y, hz: HAWK_Z, ang: 0, flap: 0, fold: 0, dive: null, flash: 0 }),
  enter(p, s) { s.quarry = null; s.dive = null; s.hx = p.x; s.hy = p.y; s.hz = HAWK_Z; },
  hit(p, s, tgt) {
    if (tgt === s.quarry) { if (s.gap <= 0) { s.gap = 0.25; this.add(s, 1); } }
    else this.add(s, 0.1);
  },
  add(s, n) { const was = Math.floor(s.feathers); s.feathers = Math.min(FEATHERS, s.feathers + n); if (Math.floor(s.feathers) > was) s.flash = 0.5; },
  kill(p, s, tgt) {
    if (tgt !== s.quarry) return;
    s.quarry = null; s.look = 0;
    p.addBuff({ id: 'sig_focus', name: "Hunter's Focus: +20% crit, +25% damage", el: 'phys', fx: 'aura', stats: { crit: 80, dmg: 25 }, t: 8, max: 8 });
    floatText(tgt.x, tgt.y, 70, 'Quarry Taken!', GREEN, 15, { life: 1.6 });
    this.add(s, 1);
    stat('ranger', 'quarry');
  },
  update(p, s, dt) {
    s.gap -= dt; s.flash = Math.max(0, s.flash - dt * 2); s.flap += dt * (s.fold ? 0 : 9);
    const q = s.quarry;
    if (q && (q.dead || q.world !== p.world || Math.hypot(q.x - p.x, q.y - p.y) > 12)) s.quarry = null;
    if ((s.look -= dt) <= 0 && !s.dive) { s.look = 0.6; const t = toughest(p, 9); if (t && (!s.quarry || (t.rank !== 'normal' && s.quarry.rank === 'normal'))) s.quarry = t; }
    if (!s.dive) { // wheel over the quarry, or over her
      const c = s.quarry || p, a = (s.ang += dt * 1.6), r = s.quarry ? 1.1 : 1.5;
      const tx = c.x + Math.cos(a) * r, ty = c.y + Math.sin(a) * r, k = Math.min(1, dt * 3);
      s.hx += (tx - s.hx) * k; s.hy += (ty - s.hy) * k; s.hz += (HAWK_Z - s.hz) * Math.min(1, dt * 2);
    }
    const sx = isoX(s.hx, s.hy), sy = isoY(s.hx, s.hy) - s.hz, dx = sx - (s.sx ?? sx), dy = sy - (s.sy ?? sy);
    if (dx * dx + dy * dy > 0.01) s.head = Math.atan2(dy, dx);
    s.sx = sx; s.sy = sy;
    if (s.feathers >= FEATHERS && s.quarry && !s.dive) this.fire(p, s);
  },
  fill: (s) => s.feathers / FEATHERS,
  fire(p, s) {
    const q = s.quarry || toughest(p, 10);
    if (!q) return;
    s.quarry = q; s.feathers = 0;
    s.dive = p.world.addHazard(new Stoop(p, s, q));
    floatText(q.x, q.y, 90, 'STOOP!', CREAM, 16, { life: 1.2 });
    sfx('roar', 0.35); sfx('bow', 0.8);
    stat('ranger', 'fire');
  },
  draw(ctx, p, s, t) {
    const [cx, cy] = headAt(p, 4);
    for (let i = 0; i < FEATHERS; i++) { // a fan of feathers over her head
      const a = (i - (FEATHERS - 1) / 2) * 0.32, x = cx + Math.sin(a) * 24, y = cy - Math.cos(a) * 10 + 4, lit = i < Math.floor(s.feathers);
      feather(ctx, x, y, a, lit, G.touch ? 1.1 : 1.4);
      if (lit && s.flash > 0 && i === Math.floor(s.feathers) - 1) glow(ctx, CREAM, x, y, 9, s.flash * 2);
    }
    const q = s.quarry;
    if (q && !q.dead) { // reticle brackets over the quarry
      const qx = isoX(q.x, q.y), qy = (q.screenTop ?? isoY(q.x, q.y) - 50) - 8, k = 6 + Math.sin(t * 6) * 1.5;
      ctx.strokeStyle = s.feathers >= FEATHERS - 1 ? '#ffffff' : GREEN; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(qx + sx * k, qy + sy * (k - 3)); ctx.lineTo(qx + sx * k, qy + sy * k); ctx.lineTo(qx + sx * (k - 3), qy + sy * k); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // the hawk itself, with its shadow on the floor
    const hx = isoX(s.hx, s.hy), hy = isoY(s.hx, s.hy);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(hx, hy, 7, 2.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    glow(ctx, GREEN, hx, hy - s.hz, 26, 0.5);
    drawHawk(ctx, hx, hy - s.hz, s.head || 0, s.flap, s.fold, G.touch ? 1.6 : 2);
  },
  ground(ctx, p, s, t) {
    const q = s.quarry;
    if (!q || q.dead) return;
    const px = isoX(q.x, q.y), py = isoY(q.x, q.y), R = (q.r || 0.4) + 0.45;
    ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75;
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.ellipse(px, py, R * HW * 1.41, R * HH * 1.41, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  },
};
