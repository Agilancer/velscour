// Ring augments at runtime, and skill mastery (each skill's own XP and level, 1-1000).
// Augments ride on a skill's hits as o.aug ({id: pow}, from Player.augFor); combat.hit calls augHit for them, and
// World.update calls augHazard for every hazard a skill with augments made (enchant visuals, Storm Tether).
import { G } from '../state.js';
import { rand, chance, TAU, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Bolt, Column, Ring, burst, spawn, sparkle, smoke, elem, addLight } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { isoX, isoY } from '../core/view.js';
import { hit, leechHeal } from './combat.js';
import { Projectile, lineTargets } from './hazards.js';

// ------------------------------------------------------------------ mastery
export const MAX_MASTERY = 1000;
/** XP a skill needs to go from mastery level L to L+1. */
export const masteryNeed = (L) => Math.round(30 * Math.pow(L, 1.5) + 10 * L);
/** Damage multiplier at mastery level M: about x1.6 at 50, x2.4 at 100, x5 at 250, x11 at 500, x29 at 1000. */
export const masteryMul = (M) => 1 + 0.012 * (M - 1) + Math.pow(M / 250, 2);
/** Size of a skill's effects at mastery level M: up to +80% at 1000. */
export const masteryVis = (M) => 1 + Math.min(1, (M - 1) / 999) * 0.8;
/** Visual tier: 0 below 25, then 1 (25), 2 (100), 3 (250), 4 (500), 5 (750), 6 (1000). */
export const masteryTier = (M) => (M >= 1000 ? 6 : M >= 750 ? 5 : M >= 500 ? 4 : M >= 250 ? 3 : M >= 100 ? 2 : M >= 25 ? 1 : 0);
export const TIER_NAMES = ['Novice', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Legend', 'Transcendent'];

/** Extra cast flourish by mastery tier: rings, motes, light, then pillars and shockwaves. */
export function masteryCastFx(p, sk, M, tx, ty) {
  const tier = masteryTier(M);
  if (!tier) return;
  const E = elem(sk.el), n = tier * 4;
  sparkle(p.x, p.y, 26, E.glow, n, 0.5 + tier * 0.1);
  if (tier >= 2) addEffect(new Ring(p.x, p.y, 0.2, 0.8 + tier * 0.35, 0.35, E.glow, 2 + tier));
  if (tier >= 3) burst(p.x, p.y, 20, sk.el, 6 + tier * 3, 2 + tier * 0.5, { up: 1.5 });
  if (tier >= 4 && chance(0.5)) addEffect(new Column(p.x, p.y, E.glow, 0.35, 10 + tier * 4, 160 + tier * 40));
  if (tier >= 5) { addEffect(new Ring(tx, ty, 0.1, 1 + tier * 0.25, 0.4, E.core, 3)); burst(tx, ty, 10, sk.el, tier * 3, 3, { up: 2 }); }
  if (tier >= 6) { addEffect(new Ring(p.x, p.y, 0.2, 4, 0.6, '#ffffff', 5, { fill: true })); G.flash = Math.max(G.flash || 0, 0.06); }
  addLight(p.x, p.y, 2 + tier, 0.6 + tier * 0.1);
}

// ------------------------------------------------------------------ on-hit augments
/** Apply a skill hit's augments. dmg: the damage dealt; o.dot hits (field ticks) proc at half the chance. */
export function augHit(src, owner, tgt, dmg, el, o) {
  const A = o.aug, w = tgt.world;
  if (!w || tgt.isPlayer) return;
  const k = o.dot ? 0.5 : 1;
  const proc = { proc: true, noArc: true, crit: false, sk: o.sk };
  const s = tgt.status;
  for (const id in A) {
    const p = A[id];
    switch (id) {
      case 'ignite':
        s.burn = { t: 3, dps: Math.max(s.burn && s.burn.t > 0 ? s.burn.dps : 0, dmg * 0.37 * p), src: owner };
        if (chance(0.5 * k)) burst(tgt.x, tgt.y, 30, 'fire', 4, 1.5, { up: 2 });
        break;
      case 'venom': {
        const cur = s.poison && s.poison.t > 0 ? s.poison.dps : 0;
        s.poison = { t: 4, dps: Math.min(cur + dmg * 0.2 * p * k, dmg * 1.6 * p), src: owner };
        if (chance(0.4 * k)) spawn({ type: 'glow', x: tgt.x, y: tgt.y, z: 30, vz: -10, life: 0.8, size: 3, size1: 5, color: '#70ff30', add: true });
        break;
      }
      case 'frost':
        s.chill = { t: 2.5, amt: 0.4 };
        if (tgt.rank !== 'boss' && chance(Math.min(0.5, 0.14 * p) * k)) { s.freeze = { t: 1.3 }; sparkle(tgt.x, tgt.y, 30, '#c8f0ff', 8, 0.4); }
        if (!o.dot) hitLater(src, tgt, dmg * 0.25 * p, 'cold', proc);
        break;
      case 'storm':
        if (chance(Math.min(0.85, 0.32 * p) * k)) {
          const n = 3 + Math.round(p);
          chainFrom(w, src, tgt, n, dmg * 0.6 * p, proc);
        }
        break;
      case 'tether':
        // skills with no hazard to tether (melee, beams, chains) lash out instead
        if (!o.tethered && chance(0.3 * k)) {
          addEffect(new Bolt(owner.x, owner.y, 34, tgt.x, tgt.y, 26, '#b8d8ff', 0.2, 3));
          hitLater(src, tgt, dmg * 0.5 * p, 'light', proc);
        }
        break;
      case 'detonate':
        if (chance(Math.min(0.7, 0.22 * p) * k)) {
          explosionFx(tgt.x, tgt.y, 1.4, 'fire', 'explosion', { sound: chance(0.4), shakeMul: 0.4 });
          for (const c of w.hostiles(owner.team, tgt.x, tgt.y, 1.7)) hitLater(src, c, dmg * 0.75 * p, el === 'phys' ? 'fire' : el, { ...proc, aoe: true });
        }
        break;
      case 'smite':
        if (chance(Math.min(0.6, 0.18 * p) * k)) {
          addEffect(new Column(tgt.x, tgt.y, '#fff0a0', 0.45, 22, 320));
          burst(tgt.x, tgt.y, 4, 'holy', 10, 2);
          sfx('holy', 0.4);
          for (const c of w.hostiles(owner.team, tgt.x, tgt.y, 1.1)) hitLater(src, c, dmg * 1.2 * p, 'holy', proc);
        }
        break;
      case 'meteor':
        if (chance(Math.min(0.4, 0.08 * p) * k)) meteorAt(w, src, owner, tgt.x, tgt.y, dmg * 2.2 * p, proc);
        break;
      case 'rift':
        if (chance(Math.min(0.4, 0.1 * p) * k) && !w.hazards.some((h) => h.augRift && dist(h.x, h.y, tgt.x, tgt.y) < 2.5)) riftAt(w, src, owner, tgt.x, tgt.y, dmg * 0.3 * p, proc);
        break;
      case 'blood':
        s.bleed = { t: 3, dps: Math.max(s.bleed && s.bleed.t > 0 ? s.bleed.dps : 0, dmg * 0.25 * p), src: owner };
        leechHeal(owner, tgt, dmg, 0.02 * p * k);
        break;
      case 'shatter':
        if (chance(Math.min(0.6, 0.2 * p) * k)) shardsFrom(w, src, owner, tgt, 4 + Math.round(p), dmg * 0.35 * p, proc);
        break;
    }
  }
}

// procs land a moment later so a burst of procs can't recurse through one hit() call stack
function hitLater(src, tgt, amount, el, o) {
  const w = tgt.world;
  if (!w || amount <= 0) return;
  w.addHazard({ t: 0.03, update(dt) { this.t -= dt; if (this.t > 0) return true; if (!tgt.dead) hit(src, tgt, amount, el, o); return false; }, draw() {} });
}
function chainFrom(w, src, first, n, amount, o) {
  const seen = new Set([first.id]);
  let cur = first;
  for (let i = 0; i < n; i++) {
    let best = null, bd = 25;
    for (const c of w.hostiles(src.team, cur.x, cur.y, 5)) {
      if (seen.has(c.id)) continue;
      const d = (c.x - cur.x) ** 2 + (c.y - cur.y) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) break;
    seen.add(best.id);
    addEffect(new Bolt(cur.x, cur.y, 28, best.x, best.y, 28, '#a8ccff', 0.25, 2.6));
    hitLater(src, best, amount, 'light', o);
    cur = best;
  }
  if (cur !== first) sfx('light', 0.4);
}
function meteorAt(w, src, owner, x, y, amount, o) {
  let t = 0.6;
  addEffect(new Ring(x, y, 1.6, 0.2, 0.6, '#ff6020', 2));
  w.addHazard({
    x, y, update(dt) {
      t -= dt;
      if (t > 0) { if (chance(dt * 30)) spawn({ type: 'glow', x: x - t * 2, y: y - t * 2, z: 40 + t * 400, vz: -100, life: 0.2, size: 6, size1: 1, color: '#ffb040', add: true }); return true; }
      explosionFx(x, y, 1.8, 'fire', 'meteor', { sound: true, shakeMul: 0.6 });
      for (const c of w.hostiles(owner.team, x, y, 1.9)) hit(src, c, amount, 'fire', { ...o, aoe: true });
      return false;
    }, draw() {},
  });
}
function riftAt(w, src, owner, x, y, amount, o) {
  let t = 0, tick = 0;
  w.addHazard({
    x, y, augRift: true, ground: true, update(dt) {
      t += dt; tick -= dt;
      if (t > 2.6) { explosionFx(x, y, 1.6, 'shadow', 'void', { sound: false, shakeMul: 0.3 }); return false; }
      for (const c of w.hostiles(owner.team, x, y, 2.6)) {
        if (c.static || c.rank === 'boss') continue;
        const d = Math.max(0.3, dist(c.x, c.y, x, y));
        c.kbx += (x - c.x) / d * 6 * dt; c.kby += (y - c.y) / d * 6 * dt;
      }
      if (tick <= 0) { tick = 0.3; for (const c of w.hostiles(owner.team, x, y, 1.6)) hit(src, c, amount, 'shadow', { ...o, dot: true }); }
      if (chance(dt * 40)) { const a = rand(TAU), r = rand(0.5, 2.4); spawn({ type: 'glow', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: 4, vx: -Math.cos(a) * r * 1.5, vy: -Math.sin(a) * r * 1.5, vz: 6, life: 0.6, size: 3, size1: 0, color: chance(0.5) ? '#a040ff' : '#2a0a40', add: true }); }
      addLight(x, y, 2, 0.4);
      return true;
    },
    draw(ctx) {
      const px = isoX(x, y), py = isoY(x, y), k = Math.min(1, t * 4) * Math.min(1, (2.6 - t) * 3);
      ctx.save(); ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#0a0010';
      ctx.beginPath(); ctx.ellipse(px, py, 34 * k, 17 * k, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#a040ff'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(px, py, (12 + i * 9) * k, (6 + i * 4.5) * k, 0, t * (3 + i) + i, t * (3 + i) + i + 4); ctx.stroke(); }
      ctx.restore();
    },
    get depth() { return x + y - 0.5; },
  });
  sfx('shadow', 0.5);
}
function shardsFrom(w, src, owner, tgt, n, amount, o) {
  const a0 = rand(TAU);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU;
    w.addHazard(new Projectile({ world: w, src, team: owner.team, x: tgt.x, y: tgt.y, ang: a, speed: 10, range: 3.2, fx: 'shard', el: 'phys', dmg: [amount * 0.9, amount * 1.1], o, size: 0.7, child: true, hitSet: new Set([tgt.id]) }));
  }
}

// ------------------------------------------------------------------ hazards made by augmented skills
const GLOW = { ignite: ['#ff7010', '#ffd040'], venom: ['#60ff30', '#2a8a10'], frost: ['#c8f0ff', '#60c8ff'], storm: ['#a8ccff', '#ffffff'], tether: ['#b8d8ff', '#ffffff'], detonate: ['#ff8030', '#ffe080'], smite: ['#fff0a0', '#ffffff'], meteor: ['#ff6020', '#ffb040'], rift: ['#a040ff', '#3a0a60'], blood: ['#c01010', '#600000'], shatter: ['#e0e0e8', '#9a9aa8'] };
/** The points a hazard occupies now (an orbit's weapons, a projectile, a field's centre). */
function points(h) {
  if (h.pos && h.pos.length) return h.pos;
  if (h.x === undefined || h.dead) return null;
  return [[h.x, h.y]];
}
/** Per frame, for a hazard made by an augmented skill: enchant particles and the Storm Tether arcs. */
export function augHazard(h, dt) {
  const A = h.o && h.o.aug, owner = h.src && (h.src.owner || h.src);
  if (!A || !owner || !owner.isPlayer || h.child) return;
  const pts = points(h);
  if (!pts) return;
  const vis = h.o.vis || 1;
  for (const id in A) {
    const g = GLOW[id];
    if (!g) continue;
    for (const [x, y] of pts) {
      if (!chance(dt * (id === 'ignite' ? 26 : 12) * vis)) continue;
      if (id === 'ignite') spawn({ type: 'glow', x: x + rand(-0.12, 0.12), y: y + rand(-0.12, 0.12), z: rand(16, 32), vz: rand(30, 70), life: rand(0.3, 0.55), size: rand(3, 5.5) * vis, size1: 0.5, color: chance(0.5) ? g[0] : g[1], add: true });
      else if (id === 'venom') spawn({ type: 'glow', x, y, z: 24, vz: -25, g: 120, life: 0.6, size: 2.5 * vis, size1: 1, color: chance(0.6) ? g[0] : g[1], add: true });
      else if (id === 'frost') spawn({ type: 'shard', x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: rand(18, 30), vz: -8, life: 0.5, size: 2.4 * vis, color: g[0], rot: rand(TAU) });
      else if (id === 'blood') spawn({ type: 'blood', x, y, z: 24, vz: 0, g: 260, life: 0.8, size: 1.8, color: g[0] });
      else if (id === 'rift') smoke(x, y, 22, '#1a0628', 1, 5 * vis);
      else spawn({ type: 'glow', x: x + rand(-0.1, 0.1), y: y + rand(-0.1, 0.1), z: rand(18, 30), vz: 15, life: 0.4, size: 2.6 * vis, size1: 0, color: chance(0.5) ? g[0] : g[1], add: true });
    }
  }
  if (A.tether) tether(h, owner, pts, A.tether, dt);
}
function tether(h, owner, pts, pow, dt) {
  const w = h.world;
  if (!h.o.tethered) h.o = { ...h.o, tethered: true };
  h.tetherT = (h.tetherT || 0) - dt;
  const zap = h.tetherT <= 0;
  if (zap) h.tetherT = 0.25;
  const dmg = h.dmg ? (h.dmg[0] + h.dmg[1]) / 2 * 0.3 * pow : 0;
  const segs = pts.map(([x, y]) => [owner.x, owner.y, x, y]);
  if (pts.length > 2) for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; segs.push([a[0], a[1], b[0], b[1]]); }
  for (const [x0, y0, x1, y1] of segs) {
    if (dist(x0, y0, x1, y1) < 0.5 || dist(x0, y0, x1, y1) > 9) continue;
    if (chance(dt * 22)) addEffect(new Bolt(x0, y0, 26, x1, y1, 24, chance(0.3) ? '#ffffff' : '#9cc4ff', 0.09, 1.8));
    if (zap && dmg > 0) for (const c of lineTargets(w, owner.team, x0, y0, x1, y1, 0.35)) hit(h.src, c, dmg, 'light', { proc: true, noArc: true, crit: false, sk: h.o.sk, silent: false });
  }
  for (const [x, y] of pts) addLight(x, y, 1.4, 0.5);
}
