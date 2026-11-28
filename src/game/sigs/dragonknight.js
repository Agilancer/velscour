// Dragon Knight: the Dragonheart. She wears a dragon's wings (a 3D model, gfx/dragons3d.js): folded and dark on her
// back when her blood is cold. Battle stokes the wyrm's blood in her (fire hits twice as much); as it heats, the
// wings open, their veins light and they shed embers. At full heat the heart wakes: a great dragon of fire rises
// behind her, rears, and pours a river of fire from its jaws over the foes in front, and she is left burning with
// Wyrmblood (damage, resistances) as the wings gutter out. The wings beat hard on her dashes and leaps, a dragon's
// ghost roars with her (Draconic Roar, Dragon Fear) and stands over her in her dragon forms.
// Without WebGL (or while the models load) the old flat flame wings and dragon's head are drawn.
import { G, stat, power, sigO, crowd, foesNear, glow, rand, TAU } from './common.js';
import { isoX, isoY, HW, HH, camera } from '../../core/view.js';
import { sfx } from '../../core/audio.js';
import { addEffect, Ring, floatText, spawn, addLight } from '../../gfx/vfx.js';
import { hit } from '../combat.js';
import { coneTargets } from '../hazards.js';
import { drawDkWings, drawSpectre, spectrePoint, worldAt } from '../../gfx/dragons3d.js';

const MAX = 100, EMBER = '#ff7a10', CORE = '#fff3a0', DEEP = '#a01808';
const screenDir = (a) => Math.atan2((Math.cos(a) + Math.sin(a)) * HH, (Math.cos(a) - Math.sin(a)) * HW);

/** One flame wing from the shoulder (x, y), side -1/1, span in px, flap 0..1. */
function wing(ctx, x, y, side, span, flap, t) {
  if (span < 2) return;
  const lift = -span * (0.55 + 0.15 * flap), tipX = x + side * span, tipY = y + lift;
  const g = ctx.createLinearGradient(x, y, tipX, tipY);
  g.addColorStop(0, 'rgba(160,24,8,0.85)'); g.addColorStop(0.55, 'rgba(255,122,16,0.75)'); g.addColorStop(1, 'rgba(255,243,160,0.9)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + side * span * 0.35, y + lift * 1.15, tipX, tipY);              // the leading edge (the arm)
  for (let i = 3; i >= 0; i--) { // scalloped trailing edge between three fingers
    const k = i / 3, fx = x + side * span * (0.25 + 0.75 * k), fy = y + lift * k * 0.85 + span * 0.35 * (1 - k * 0.6) + Math.sin(t * 9 + i) * 1.5;
    ctx.quadraticCurveTo(fx - side * span * 0.12, fy - span * 0.14, fx, fy);
  }
  ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = CORE; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + side * span * 0.35, y + lift * 1.15, tipX, tipY);
  for (let i = 1; i <= 3; i++) { const k = i / 3; ctx.moveTo(x + side * span * 0.3 * k + side * 2, y + lift * 0.9 * k); ctx.lineTo(x + side * span * (0.25 + 0.75 * k), y + lift * k * 0.85 + span * 0.35 * (1 - k * 0.6)); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/** The spectral dragon's head in profile at (x, y) facing dir, jaw open 0..1, scale s. */
function dragonHead(ctx, x, y, dir, jaw, s, a) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s); ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'lighter';
  const fill = (c) => { ctx.fillStyle = c; ctx.fill(); };
  ctx.beginPath(); // the neck rising from below
  ctx.moveTo(-26, 40); ctx.quadraticCurveTo(-30, 10, -12, -6); ctx.lineTo(4, 2); ctx.quadraticCurveTo(-10, 18, -6, 40); ctx.closePath(); fill('rgba(200,40,10,0.55)');
  ctx.save(); ctx.translate(-2, 2); ctx.rotate(jaw * 0.55); // the lower jaw
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, 2); ctx.lineTo(30, 7); ctx.lineTo(4, 9); ctx.closePath(); fill('rgba(220,60,10,0.75)');
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 6, 2); ctx.lineTo(12 + i * 6, -2); ctx.lineTo(14 + i * 6, 2); fill('rgba(255,243,200,0.9)'); }
  ctx.restore();
  ctx.beginPath(); // the skull and snout
  ctx.moveTo(-16, -8); ctx.quadraticCurveTo(-4, -20, 14, -12); ctx.lineTo(40, -4); ctx.lineTo(38, 1); ctx.lineTo(-2, 3); ctx.quadraticCurveTo(-14, 2, -16, -8); fill('rgba(255,110,20,0.75)');
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(14 + i * 6, 0.5); ctx.lineTo(16 + i * 6, 5); ctx.lineTo(18 + i * 6, 0.5); fill('rgba(255,243,200,0.9)'); }
  ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(-26, -26, -34, -18); ctx.quadraticCurveTo(-22, -18, -12, -9); fill('rgba(255,180,60,0.8)'); // horns
  ctx.beginPath(); ctx.moveTo(-2, -15); ctx.quadraticCurveTo(-14, -34, -26, -32); ctx.quadraticCurveTo(-14, -26, -6, -12); fill('rgba(255,150,40,0.7)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(10, -9, 3, 1.6, -0.3, 0, TAU); ctx.fill(); // the eye
  ctx.fillStyle = '#ffe040'; ctx.fillRect(9.5, -10, 1.5, 2);
  ctx.restore(); ctx.globalAlpha = 1;
}

/** A dragon's ghost that rears and roars over her (Draconic Roar, Dragon Fear). */
class RoarGhost {
  constructor(p) { Object.assign(this, { p, t: 0, dur: 0.95, key: 'dkroar' }); }
  update(dt) { this.t += dt; return this.t < this.dur && !this.p.dead; }
  draw(ctx) {
    const p = this.p, u = this.t / this.dur, a = Math.min(1, u * 5, (1 - u) * 2.5);
    const bx = p.x - Math.cos(p.facing) * 0.5, by = p.y - Math.sin(p.facing) * 0.5;
    drawSpectre(ctx, isoX(bx, by), isoY(bx, by) - 4, { key: this.key, k: (G.touch ? 105 : 125) * (0.8 + 0.2 * Math.min(1, u * 4)), yaw: p.facing, clip: 'roar', t: 1.75 + this.t * 1.5, loop: false, alpha: 0.85 * a, heat: 0.6 });
  }
}

class Wake {
  constructor(p, ang) { Object.assign(this, { p, ang, t: 0, dur: 2.1, breathFrom: 0.55, breathTo: 1.75, tick: 0, mouth: null }); }
  get depth() { return this.p.x + this.p.y - 0.02; } // the dragon stands behind her
  update(dt) {
    const p = this.p, w = this.world;
    this.t += dt;
    if (this.t > this.breathFrom && this.t < this.breathTo) {
      const c = crowd(p, 7); if (c) { const want = Math.atan2(c[1] - p.y, c[0] - p.x), d = Math.atan2(Math.sin(want - this.ang), Math.cos(want - this.ang)); this.ang += Math.max(-dt * 1.5, Math.min(dt * 1.5, d)); } // the head follows the crowd
      if ((this.tick -= dt) <= 0) { this.tick = 0.12; for (const f of coneTargets(w, p.team, p.x, p.y, this.ang, 6.5, 0.45)) hit(p, f, power(p) * 0.9, 'fire', sigO({ burn: true, crit: false })); }
      const m = this.mouth, mx = m ? m[0] : p.x + Math.cos(this.ang) * 0.6, my = m ? m[1] : p.y + Math.sin(this.ang) * 0.6, hz = m ? m[2] : 70;
      for (let i = 0; i < (G.touch ? 3 : 6); i++) { // the river of fire, from its jaws down onto the crowd
        const a = this.ang + rand(-0.35, 0.35), v = rand(7, 11), d = rand(0, 0.5);
        spawn({ type: 'glow', x: mx + Math.cos(a) * d, y: my + Math.sin(a) * d, z: hz * (1 - d * 0.12), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: -hz * rand(1.2, 1.6), drag: 0.6, life: rand(0.45, 0.7), size: rand(2.5, 4.5), size1: rand(6, 9), color: i % 3 ? (i % 2 ? EMBER : '#ff4a08') : (i ? DEEP : CORE), add: true });
      }
      if (m && Math.random() < dt * 40) spawn({ type: 'glow', x: mx + rand(-0.5, 0.5), y: my + rand(-0.5, 0.5), z: hz + rand(-10, 30), vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(40, 90), life: rand(0.6, 1.1), size: rand(1.5, 3), size1: 0, color: CORE, add: true }); // sparks off the maw
      if (!this.shook) { this.shook = true; camera.shake(5); }
    }
    return this.t < this.dur && !p.dead;
  }
  draw(ctx) {
    const p = this.p, t = this.t, sa = screenDir(this.ang), dir = Math.cos(sa) >= 0 ? 1 : -1;
    const rise = Math.min(1, t / 0.5), out = Math.min(1, (this.dur - t) / 0.35), jaw = t < this.breathFrom ? (t / this.breathFrom) * 0.4 : t < this.breathTo ? 0.9 + Math.sin(t * 20) * 0.08 : 0.3;
    if (this.draw3D(ctx, rise, out)) return;
    const px = isoX(p.x, p.y) - dir * 14, py = isoY(p.x, p.y) - 70 - 30 * rise;
    glow(ctx, EMBER, px + dir * 20, py, 70, 0.55 * rise * out);
    dragonHead(ctx, px, py, dir, jaw, (G.touch ? 1.3 : 1.6) * (0.6 + 0.4 * rise), 0.9 * out);
  }
  /** The dragon of fire: it rises behind her drawing breath, rears, and holds the breath on the crowd. */
  draw3D(ctx, rise, out) {
    const p = this.p, t = this.t, k = (G.touch ? 150 : 185) * (0.55 + 0.45 * rise * (2 - rise));
    const bx = p.x - Math.cos(this.ang) * 0.9, by = p.y - Math.sin(this.ang) * 0.9, px = isoX(bx, by), py = isoY(bx, by) - 26 - 34 * rise * (2 - rise) - Math.sin(t * 5) * 3;
    let o;
    if (t < this.breathFrom) o = { clip: 'hover_breath_in', t: 1.0 + (t / this.breathFrom) * 1.15, loop: false };
    else if (t < this.breathTo) { const u = t - this.breathFrom; o = { clip: 'hover_breath_in', t: 2.15, clip2: 'hover_breath_hold', t2: u * 1.3, mix: Math.min(1, u / 0.12) }; }
    else o = { clip: 'hover_breath_hold', t: (this.breathTo - this.breathFrom) * 1.3, clip2: 'hover_breath_out', t2: (t - this.breathTo) * 2.2, mix: Math.min(1, (t - this.breathTo) / 0.1), loop: false };
    const breathing = t >= this.breathFrom && t < this.breathTo, a = Math.min(1, t / 0.25) * out;
    glow(ctx, EMBER, px, py - k * 0.2, k * 1.0, 0.4 * a);
    if (!drawSpectre(ctx, px, py, { ...o, key: 'dkheart', k, yaw: this.ang, pitch: breathing ? -0.12 : 0.1, alpha: a, heat: breathing ? 1 : 0.55, points: ['mouth'] })) { this.mouth = null; return false; }
    const m = spectrePoint('dkheart');
    if (m) {
      this.mouth = worldAt(bx, by, m[0], isoY(bx, by) - (py + m[1]));
      if (breathing) glow(ctx, CORE, px + m[0], py + m[1], 26 + Math.sin(t * 30) * 5, 0.9 * out);
    }
    addLight(p.x, p.y, 5.5, 0.9 * a, 60, EMBER);
    if (breathing) addLight(p.x + Math.cos(this.ang) * 3, p.y + Math.sin(this.ang) * 3, 4.5, 1.1, 20, EMBER);
    return true;
  }
}

/** Her dragon form, if she is in one: 'true' (True Dragon Form), 'iron' (Ironclad Wyrmform). */
const formOf = (p) => { const b = p.buffs && p.buffs.find((b) => b.transform); return b ? (b.el === 'fire' ? 'true' : 'iron') : null; };

export default {
  id: 'dragon_knight', name: 'Dragonheart', color: EMBER,
  desc: 'Battle stokes the wyrm\'s blood; her dragon wings unfold and their veins catch fire as it heats. At full heat a great dragon of fire rises behind her and pours a river of fire on the foes in front, leaving her with Wyrmblood.',
  init: () => ({ heat: 0, gap: 0, busy: 0, flap: 0, vent: 0, open: 0, beat: 0, wt: 0 }),
  cast(p, s, sk) {
    if (!['buff', 'heal', 'summon'].includes(sk.kind)) this.add(s, sk.m.free ? 2 : 4);
    if (sk.kind === 'dash' || sk.kind === 'leap') { s.beat = sk.kind === 'leap' ? 1.1 : 0.7; s.beatT = 0; } // the wings beat hard
    if (sk.name === 'Draconic Roar' || sk.name === 'Dragon Fear') addEffect(new RoarGhost(p));
  },
  hit(p, s, tgt, dmg, el) { if (s.gap > 0) return; s.gap = 0.1; this.add(s, el === 'fire' ? 3 : 2); },
  kill(p, s) { this.add(s, 3); },
  add(s, n) { if (s.busy <= 0) s.heat = Math.min(MAX, s.heat + n); },
  update(p, s, dt) {
    s.gap -= dt; s.busy = Math.max(0, s.busy - dt); s.vent = Math.max(0, s.vent - dt);
    const f = s.heat / MAX;
    s.flap += dt * (2 + f * 4);
    const form = formOf(p);
    s.beat = Math.max(0, (s.beat || 0) - dt); s.beatT = (s.beatT || 0) + dt; s.wt = (s.wt || 0) + dt * (0.8 + 0.5 * f);
    const want = Math.max(f, s.vent > 0 ? Math.min(1, Math.max(0, s.vent - 0.4) / 1.8) : 0, s.beat > 0 ? 0.85 : 0, form ? 1 : 0);
    s.open = (s.open || 0) + (want - (s.open || 0)) * Math.min(1, dt * (want > (s.open || 0) ? 5 : 2.5));
    if (f > 0.25 && Math.random() < dt * 30 * f) { // embers off the wings
      const side = Math.random() < 0.5 ? -1 : 1, nx = -0.7 * side, ny = 0.7 * side;
      spawn({ type: 'glow', x: p.x + nx * rand(0.3, 1.2 * f), y: p.y + ny * rand(0.3, 1.2 * f), z: rand(50, 90), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(30, 70), life: rand(0.5, 1), size: rand(1.5, 3), size1: 0, color: Math.random() < 0.5 ? EMBER : CORE, add: true });
    }
    if (s.heat >= MAX && s.busy <= 0 && (s.wait = (s.wait || 0) - dt) <= 0) { s.wait = 0.3; if (foesNear(p, p.x, p.y, 6.5).length) this.fire(p, s); }
  },
  fill: (s) => s.heat / MAX,
  /** The 3D wings on her back (and the dragon's ghost over her in her dragon forms). */
  wings3D(ctx, p, s, f) {
    const sc = p.scale || 1, open = s.open || 0, form = formOf(p), moving = p.moving;
    const bob = moving ? Math.abs(Math.sin(p.animT * 9)) * 2.8 : Math.sin(p.animT * 2) * 0.6;
    const px = isoX(p.x, p.y) + (p.flip ? 2 : -2) * sc, py = isoY(p.x, p.y) - (p.z || 0) - bob - 33 * sc;
    const beat = s.beat > 0 ? Math.min(1, s.beat / 0.2, (s.beatT || 0) / 0.08) : 0, air = (p.z || 0) > 6 ? 1 : 0;
    const flap = Math.max(beat, air, open > 0.55 && moving ? 0.55 : 0), hard = beat > 0 || air;
    const heat = Math.max(f, form ? 0.8 : 0), k = (G.touch ? 0.9 : 1) * (33 + 17 * open) * sc;
    if (form) { // the dragon she has become stands over her, a ghost of fire (or of iron)
      const bx = p.x - Math.cos(p.facing) * 0.35, by = p.y - Math.sin(p.facing) * 0.35;
      drawSpectre(ctx, isoX(bx, by), isoY(bx, by) - 30 - (p.z || 0), { key: 'dkform', k: 100 * sc, yaw: p.facing, clip: 'fly_hover', t: s.wt * 1.2, alpha: 0.42 + 0.08 * Math.sin(s.wt * 5), heat: 0.4, body: 0.35,
        tint: form === 'iron' ? [0.6, 0.66, 0.8] : undefined });
    }
    if (heat > 0.15) glow(ctx, EMBER, px, py - k * 0.4, k * (1.2 + 0.8 * open), 0.12 + 0.3 * heat * open);
    const ok = drawDkWings(ctx, px, py, { key: 'dkw' + (p.id || 0), flip: p.flip, open: 0.14 + 0.86 * open, k, light: 1.25, t: s.wt, flap, flapClip: hard ? 'dash' : 'flap', flapT: hard ? (s.beatT || 0) + 0.3 : s.wt * 1.3,
      ember: 0.08 + 2.1 * heat * heat + (heat > 0.5 ? 0.25 * Math.sin(s.wt * 7) : 0), tint: form === 'iron' ? [0.75, 0.8, 0.95] : undefined });
    if (ok && heat > 0.3) glow(ctx, CORE, px, py + 6, 8 + 6 * heat, 0.4 * heat); // the heart glows through her armor
    return ok;
  },
  fire(p, s) {
    const c = crowd(p, 7), ang = c ? Math.atan2(c[1] - p.y, c[0] - p.x) : p.facing || 0;
    s.busy = 2.2; s.vent = 2.2; s.heat = 0;
    p.world.addHazard(new Wake(p, ang));
    if (typeof p?.addBuff === 'function') p.addBuff({ id: 'sig_wyrmblood', name: 'Wyrmblood: +25% damage, +30 resistances', el: 'fire', fx: 'aura', stats: { dmg: 25, res: 30 }, t: 7, max: 7 });
    addEffect(new Ring(p.x, p.y, 0.2, 2.5, 0.5, EMBER, 6, { fill: true }));
    floatText(p.x, p.y, 120, 'DRAGONHEART', CORE, 19, { life: 1.8, vz: 16 });
    sfx('roar', 1); sfx('fire', 0.9);
    camera.shake(6);
    stat('dragon_knight', 'fire');
  },
  back(ctx, p, s, t) {
    let f = s.heat / MAX;
    if (s.vent > 0) f = Math.max(f, Math.min(1, Math.max(0, s.vent - 0.4) / 1.8)); // the wings gutter out after the breath
    if (this.wings3D(ctx, p, s, f)) return;
    if (f <= 0.02) return;
    const px = isoX(p.x, p.y), py = isoY(p.x, p.y) - (p.z || 0) - 38 * (p.scale || 1), span = 8 + 40 * f, flap = 0.5 + 0.5 * Math.sin(s.flap);
    glow(ctx, EMBER, px, py - span * 0.3, span * 1.2, 0.2 + 0.35 * f);
    wing(ctx, px - 3, py, -1, span, flap, t);
    wing(ctx, px + 3, py, 1, span, flap, t + 1);
    glow(ctx, CORE, px, py + 6, 8 + 6 * f, 0.5 * f); // the heart glows through his armor
  },
};
