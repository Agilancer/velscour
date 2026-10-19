// Boomerang Knight: the Trick Shot. Every blade that bites spins up one of the eight big blue boomerangs that
// circle his helm. Eight and he lets fly the TRICK SHOT: a golden boomerang that ricochets from foe to foe (ten at
// most, back and forth between a few) and draws a glowing web of gold across the field behind it. It snaps back to
// his hand, and the web SNAPS too: every thread cuts whatever stands across it.
import { G, later, stat, power, sigO, foesNear, headAt, glow, rand, TAU } from './common.js';
import { isoX, isoY, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Beam, Ring, floatText, sparkle, spawn } from '../../gfx/vfx.js';
import { hit } from '../combat.js';
import { lineTargets } from '../hazards.js';

const MAX = 8, GOLD = '#ffd040', BLUE = '#3a9cff', HOP = 0.11;

/** A little boomerang (a bent blade) spun to angle a. */
function rang(ctx, x, y, a, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(-6, -1); ctx.quadraticCurveTo(0, -5, 6, -1); ctx.lineTo(4, 1); ctx.quadraticCurveTo(0, -2, -4, 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-0.7, -3.3, 1.4, 1.4);
  ctx.restore();
}

/** One of the big blue boomerangs that circle his helm: two swept arms round an elbow, spun to angle a. */
function blueRang(ctx, x, y, a, s, lit) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-6, -5, 0, -5); ctx.quadraticCurveTo(6, -5, 8, 4);
  ctx.quadraticCurveTo(7.6, 5.6, 6, 5); ctx.quadraticCurveTo(3, -1.2, 0, -1.2); ctx.quadraticCurveTo(-3, -1.2, -6, 5);
  ctx.quadraticCurveTo(-7.6, 5.6, -8, 4); ctx.closePath();
  ctx.fillStyle = lit ? BLUE : '#3a4868'; ctx.fill();
  ctx.lineWidth = 1.2 / s; ctx.strokeStyle = lit ? '#0a2050' : '#1a2032'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6.6, 2.6); ctx.quadraticCurveTo(-5, -3.6, 0, -3.8); ctx.quadraticCurveTo(5, -3.6, 6.6, 2.6); // the lit leading edge
  ctx.lineWidth = 1.1 / s; ctx.strokeStyle = lit ? '#c8ecff' : '#6a7898'; ctx.stroke();
  ctx.fillStyle = lit ? '#ffffff' : '#8a96b0'; ctx.fillRect(-1, -4.4, 2, 2); // the elbow gem
  ctx.restore();
}
/** The eight boomerangs, the half behind his head (in the depth pass, before him) or the half in front (on top). */
function ringDraw(ctx, p, s, front) {
  if (s.busy > 0 && !s.n) return;
  const t = G.time, [cx, cy] = headAt(p, 8), R = G.touch ? 20 : 26, sc = G.touch ? 0.95 : 1.15;
  for (let i = 0; i < MAX; i++) {
    const a = t * 1.8 + (i / MAX) * TAU, near = Math.sin(a) > 0;
    if (near !== front) continue;
    const x = cx + Math.cos(a) * R, y = cy - 4 + Math.sin(a) * R * 0.34, lit = i < s.n;
    if (lit) glow(ctx, BLUE, x, y, 11, near ? 0.7 : 0.4);
    ctx.globalAlpha = lit ? (near ? 1 : 0.8) : 0.45;
    blueRang(ctx, x, y, lit ? t * 12 + i : a + Math.PI / 2, sc, lit);
  }
  ctx.globalAlpha = 1;
  if (front && s.n >= MAX) glow(ctx, '#bfe4ff', cx, cy - 4, R * 1.4, 0.25 + 0.15 * Math.sin(t * 10));
}

class TrickShot {
  constructor(p, path) { Object.assign(this, { p, path, t: 0, segs: [], i: 0, back: false, web: 0, snapped: false, spin: 0 }); }
  update(dt) {
    const p = this.p, w = this.world, P = power(p);
    this.t += dt; this.spin += dt * 30;
    if (!this.back) {
      while (this.i < this.path.length && this.t >= (this.i + 1) * HOP) { // each hop lands on its foe
        const c = this.path[this.i], from = this.i ? this.path[this.i - 1] : { x: p.x, y: p.y };
        this.segs.push([from.x, from.y, c.x, c.y]);
        if (!c.dead) hit(p, c, P * 1.6, 'phys', sigO({ knock: 0.3 }));
        sparkle(c.x, c.y, 30, GOLD, 6, 0.3);
        sfx('swing', 0.35);
        this.i++;
      }
      if (this.i >= this.path.length) { this.back = true; this.t0 = this.t; }
    } else if (this.t - this.t0 > 0.2 && !this.web) { this.web = this.t; }
    if (this.web && !this.snapped && this.t - this.web > 0.55) { // the web snaps
      this.snapped = true;
      const hitSet = new Set();
      for (const [ax, ay, bx, by] of this.segs) {
        addEffect(new Beam(ax, ay, bx, by, GOLD, 8, 0.35, { z: 26, core: '#ffffff' }));
        for (const c of lineTargets(w, p.team, ax, ay, bx, by, 0.5)) { if (hitSet.has(c)) continue; hitSet.add(c); hit(p, c, P * 1.2, 'phys', sigO({ bleed: true })); }
      }
      camera.shake(5); sfx('crit', 0.8);
    }
    return !p.dead && !(this.snapped && this.t - this.web > 0.9);
  }
  pos() {
    const p = this.p;
    if (!this.back) {
      const i = Math.min(this.path.length - 1, Math.floor(this.t / HOP)), k = (this.t - i * HOP) / HOP;
      const a = i ? this.path[i - 1] : { x: p.x, y: p.y }, b = this.path[i];
      return [a.x + (b.x - a.x) * Math.min(1, k), a.y + (b.y - a.y) * Math.min(1, k)];
    }
    const last = this.path[this.path.length - 1], k = Math.min(1, (this.t - this.t0) / 0.2);
    return [last.x + (p.x - last.x) * k, last.y + (p.y - last.y) * k];
  }
  draw(ctx) {
    const live = this.snapped ? Math.max(0, 1 - (this.t - this.web - 0.55) / 0.35) : 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [ax, ay, bx, by] of this.segs) { // the web of gold threads
      const x0 = isoX(ax, ay), y0 = isoY(ax, ay) - 26, x1 = isoX(bx, by), y1 = isoY(bx, by) - 26;
      const hum = this.web ? 0.6 + 0.4 * Math.sin((this.t - this.web) * 40) : 1;
      ctx.globalAlpha = 0.3 * live; ctx.strokeStyle = GOLD; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 0.95 * live * hum; ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.restore();
    if (this.back && this.t - this.t0 > 0.2) return;
    const [x, y] = this.pos(), px = isoX(x, y), py = isoY(x, y) - 28;
    glow(ctx, GOLD, px, py, 16, 0.8);
    rang(ctx, px, py, this.spin, 1.6, GOLD);
  }
}

export default {
  id: 'boomerang_knight', name: 'Trick Shot', color: GOLD,
  desc: 'Every blade that bites spins up one of eight blue boomerangs circling his helm. Eight and the TRICK SHOT flies: it ricochets foe to foe, weaving a web of gold that snaps when it returns to his hand.',
  init: () => ({ n: 0, gap: 0, flash: 0, busy: 0 }),
  hit(p, s) { if (s.gap > 0 || s.busy > 0) return; s.gap = 0.25; if (s.n < MAX) { s.n++; s.flash = 0.4; } },
  update(p, s, dt) {
    s.gap -= dt; s.flash = Math.max(0, s.flash - dt * 2); s.busy = Math.max(0, s.busy - dt);
    if (s.n >= MAX && s.busy <= 0 && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.25; if (foesNear(p, p.x, p.y, 8).length) this.fire(p, s); }
  },
  fill: (s) => s.n / MAX,
  fire(p, s) {
    const all = foesNear(p, p.x, p.y, 9);
    if (!all.length) return;
    const path = [];
    let at = { x: p.x, y: p.y };
    const left = all.slice();
    while (path.length < 10 && left.length) { // nearest unvisited foe from where the blade is
      left.sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
      if (path.length && Math.hypot(left[0].x - at.x, left[0].y - at.y) > 6) break;
      at = left.shift(); path.push(at);
    }
    const base = path.slice(), n = base.length; // with few foes it bounces between them, or rings a lone one, in a star
    for (let k = 0; path.length < 7; k++) {
      if (n >= 2) { const c = base[(k + 2) % n]; if (c !== path[path.length - 1]) path.push(c); }
      else { const c = base[0], a = k * 2.5; path.push(k % 2 ? c : { x: c.x + Math.cos(a) * 1.8, y: c.y + Math.sin(a) * 1.8, dead: true }); }
    }
    s.n = 0; s.busy = HOP * path.length + 1.6;
    p.world.addHazard(new TrickShot(p, path));
    floatText(p.x, p.y, 104, 'TRICK SHOT', GOLD, 18, { life: 1.5, vz: 16 });
    addEffect(new Ring(p.x, p.y, 0.1, 1.2, 0.3, GOLD, 3));
    sfx('swing', 0.9);
    stat('boomerang_knight', 'fire');
  },
  back(ctx, p, s) { ringDraw(ctx, p, s, false); },
  draw(ctx, p, s) { ringDraw(ctx, p, s, true); },
};
