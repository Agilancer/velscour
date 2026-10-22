// The third host of raid bosses (game/raid.js RAID_BOSSES, `sigs: true`): twenty fights built WoW-style around one
// fight-long mechanic each (tethers, polarity, beacons, conduits, the dance floor...) and two signature attacks that no
// other boss has. SIGS[k](raid, target) starts ability k; PASSIVES[id](raid, dt) runs the boss's mechanic every frame.
//
// Auto-play reads what the hazards here publish:
//   danger(out)     zones to stay out of (circles, lines, cones, rings, as autoplay.js dangers())
//   autoGoal()      {x, y, r}: where the hero must stand right now (beacons, conduits, the safe quadrant...)
//   safeAt(x, y)    out of the boss's sight counts as safe (autoplay takeCover)
//   holdFire        don't strike the boss while it is up (a riposte)      autoStill: stand still     autoMove: keep moving
// and monsters with `raidPriority` are killed first.
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, angleDiff, dist, pick, randi } from '../core/util.js';
import { isoX, isoY, HW, HH, camera } from '../core/view.js';
import { sfx } from '../core/audio.js';
import { addEffect, Telegraph, Ring, Bolt, Beam, Column, burst, spawn, sparkle, floatText, smoke, addLight, glowSprite } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit } from './combat.js';
import { Projectile, Delayed, Area, lineTargets } from './hazards.js';
import { makeMonster, Monster } from './monster.js';
import { UI } from '../ui/ui.js';
import { BESTIARY } from '../data/bestiary.js';
import { enemyArtReady } from '../core/enemyart.js';

const tele = (o) => addEffect(new Telegraph(o), 'ground');
const later = (w, delay, fn) => w.addHazard({ t: delay, update(dt) { if ((this.t -= dt) <= 0) { fn(); return false; } return true; }, draw() {} });
const fxEl = (el) => (el === 'phys' ? 'fire' : el === 'blood' ? 'fire' : el);
const dmgOf = (R, mul) => [R.m.dmg * mul * 0.85, R.m.dmg * mul * 1.1];
const live = (R) => !R.m.dead && R.m.world === G.world;
const hero = (R) => R.m.world.player;
const floorAt = (w, x, y) => w.map.walkable(x, y);

/** A circle that blows up after `delay` (an enemy Delayed: auto-play already dodges these). */
function blast(R, x, y, r, delay, mul, o = {}) {
  const w = R.m.world;
  return w.addHazard(new Delayed({ world: w, src: R.m, x, y, r, delay, fx: o.fx || 'explosion', el: fxEl(o.el || R.tpl.el), dmg: dmgOf(R, mul), o: o.o || {} }));
}

/** A straight strike: telegraphed for `delay`, then everything within w of the segment is hit. */
class LineStrike {
  constructor(R, x0, y0, x1, y1, w, delay, mul, color, o = {}) {
    Object.assign(this, { R, x0, y0, x1, y1, w, delay, mul, color, o, t: 0, ground: true, world: R.m.world, team: R.m.team });
  }
  danger(out) { out.push({ line: true, x: this.x0, y: this.y0, x1: this.x1, y1: this.y1, r: this.w + 0.45 }); }
  update(dt) {
    if (!live(this.R)) return false;
    this.t += dt;
    if (this.t < this.delay) return true;
    for (const c of lineTargets(this.world, this.team, this.x0, this.y0, this.x1, this.y1, this.w)) {
      if (this.o.group) { if (this.o.group.has(c)) continue; this.o.group.add(c); } // crossing strikes hit once
      hit(this.R.m, c, rand(...dmgOf(this.R, this.mul)), this.o.el || this.R.tpl.el, { knock: this.o.knock || 0.3, ang: angleTo(this.x0, this.y0, this.x1, this.y1), stun: this.o.stun });
    }
    addEffect(new Beam(this.x0, this.y0, this.x1, this.y1, this.color, 16 * this.w + 6, 0.35, { z: 4, wobble: 0.4 }));
    for (let k = 0; k <= 1; k += 0.2) burst(this.x0 + (this.x1 - this.x0) * k, this.y0 + (this.y1 - this.y0) * k, 6, fxEl(this.R.tpl.el), 4, 2);
    return false;
  }
  draw(ctx) {
    const k = this.t / this.delay, ax = isoX(this.x0, this.y0), ay = isoY(this.x0, this.y0), bx = isoX(this.x1, this.y1), by = isoY(this.x1, this.y1);
    ctx.save(); ctx.lineCap = 'round';
    ctx.globalAlpha = 0.18 + 0.3 * k; ctx.strokeStyle = this.color; ctx.lineWidth = this.w * 2 * HW * 0.75;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k); ctx.stroke();
    ctx.restore();
  }
}
const line = (R, x0, y0, ang, len, w, delay, mul, color, o) => {
  const L = Math.min(len, R.m.world.map.rayLength(x0, y0, ang, len));
  return R.m.world.addHazard(new LineStrike(R, x0, y0, x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L, w, delay, mul, color, o));
};

/** A glowing floor circle: a place to be (goal) or not to be (danger) while it lasts. */
class Zone {
  constructor(R, o) { Object.assign(this, { R, t: 0, ground: true, world: R.m.world, team: R.m.team, dur: 5, r: 2, color: '#ffe080', good: true }, o); }
  danger(out) { if (!this.good) out.push({ x: this.x, y: this.y, r: this.r + 0.35 }); }
  autoGoal() { return this.good && this.goal !== false ? { x: this.x, y: this.y, r: Math.max(0.5, this.r - 0.7) } : null; }
  inside(c) { return dist(c.x, c.y, this.x, this.y) < this.r; }
  update(dt) {
    if (!live(this.R) || this.dead) return false;
    this.t += dt;
    if (this.tick) this.tick(dt);
    if (this.good) addLight(this.x, this.y, this.r * 1.4, 0.7, 6);
    return this.t < this.dur;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y), k = clamp(this.t / 0.3, 0, 1), fade = clamp((this.dur - this.t) / 0.4, 0, 1);
    const rx = this.r * HW * 1.41, ry = this.r * HH * 1.41, pulse = 1 + Math.sin(this.t * 6) * 0.04;
    ctx.save();
    ctx.globalAlpha = (this.good ? 0.22 : 0.3) * k * fade; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.ellipse(px, py, rx * pulse, ry * pulse, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85 * k * fade; ctx.strokeStyle = this.color; ctx.lineWidth = 2.5;
    ctx.setLineDash(this.good ? [] : [8, 5]); ctx.lineDashOffset = -this.t * 20;
    ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, TAU); ctx.stroke();
    if (this.good) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 * fade;
      ctx.drawImage(glowSprite(this.color), px - rx * 0.6, py - 90, rx * 1.2, 100);
    }
    ctx.restore();
  }
}
const zone = (R, o) => R.m.world.addHazard(new Zone(R, o));

/** Something that travels and hits what it touches: rolling wheels, gears, storm cells, notes. */
class Mover {
  constructor(R, o) {
    Object.assign(this, { R, t: 0, world: R.m.world, team: R.m.team, r: 0.6, speed: 4, dur: 6, mul: 0.9, bounce: true, color: R.E.glow, hits: new Map() }, o);
    this.vx = Math.cos(this.ang) * this.speed; this.vy = Math.sin(this.ang) * this.speed;
  }
  get depth() { return this.x + this.y + 0.3; }
  danger(out) { out.push({ x: this.x + this.vx * 0.35, y: this.y + this.vy * 0.35, r: this.r + 0.9 }); }
  update(dt) {
    if (!live(this.R)) return false;
    this.t += dt;
    if (this.steer) this.steer(dt);
    const m = this.world.map, nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!m.isFloor(nx, this.y)) { if (!this.bounce) return false; this.vx = -this.vx; this.onBounce && this.onBounce(); }
    else this.x = nx;
    if (!m.isFloor(this.x, ny)) { if (!this.bounce) return false; this.vy = -this.vy; this.onBounce && this.onBounce(); }
    else this.y = ny;
    for (const c of this.world.hostiles(this.team, this.x, this.y, this.r)) {
      if ((this.hits.get(c) || 0) > this.t) continue;
      this.hits.set(c, this.t + 1);
      hit(this.R.m, c, rand(...dmgOf(this.R, this.mul)), this.el || this.R.tpl.el, { knock: 0.5, ang: Math.atan2(this.vy, this.vx) });
    }
    if (chance(dt * 25)) spawn({ type: 'glow', x: this.x, y: this.y, z: rand(5, 30), vz: 10, life: 0.4, size: 2.5 * this.r, size1: 0, color: this.color, add: true });
    addLight(this.x, this.y, 1.5 + this.r, 0.6);
    return this.t < this.dur;
  }
  draw(ctx) {
    const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - (this.z || 18), s = this.r * HW * 1.4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9; ctx.drawImage(glowSprite(this.color), px - s * 1.6, py - s * 1.6, s * 3.2, s * 3.2);
    ctx.translate(px, py); ctx.rotate(this.t * (this.spin || 6));
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    const n = this.teeth || 6;
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU, rr = i % 2 ? s * 0.55 : s; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.6) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.6); }
    ctx.stroke();
    ctx.restore();
  }
}
const mover = (R, o) => R.m.world.addHazard(new Mover(R, o));

/** A ring that closes in on (x,y) with a gap: be inside it, or in the gap, when it passes. */
class InRing {
  constructor(R, o) { Object.assign(this, { R, t: 0, ground: true, world: R.m.world, team: R.m.team, r: 13, speed: 3.6, gapW: 1, done: new Set() }, o); }
  inGap(x, y) { return Math.abs(angleDiff(this.gap, angleTo(this.x, this.y, x, y))) < this.gapW / 2; }
  danger(out) { out.push({ ring: true, x: this.x, y: this.y, r0: Math.max(0, this.r - 1.6), r1: this.r + 0.6, gap: this.gap, gapW: this.gapW * 0.8 }); }
  update(dt) {
    if (!live(this.R)) return false;
    this.r -= this.speed * dt; this.t += dt;
    for (const c of this.world.hostiles(this.team, this.x, this.y, this.r + 1)) {
      if (this.done.has(c) || Math.abs(dist(this.x, this.y, c.x, c.y) - this.r) > 0.5 || this.inGap(c.x, c.y)) continue;
      this.done.add(c);
      hit(this.R.m, c, rand(...dmgOf(this.R, this.mul || 1.2)), this.R.tpl.el, { knock: 0.5, ang: angleTo(c.x, c.y, this.x, this.y) });
    }
    return this.r > 0.6;
  }
  draw(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [lw, al] of [[10, 0.25], [3, 0.9]]) {
      ctx.globalAlpha = al; ctx.strokeStyle = this.color || this.R.E.glow; ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = this.gap + this.gapW / 2 + (i / 64) * (TAU - this.gapW), x = this.x + Math.cos(a) * this.r, y = this.y + Math.sin(a) * this.r;
        i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y));
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** A short-lived add with a job (heads, thralls, pipes, prisms...). */
function add(R, x, y, o) {
  const m = R.m, w = m.world;
  [x, y] = w.map.nudge(x, y, 0.45);
  // painted art of an archetype when the sheet is in (else the pixel sprite stands in)
  if (o.arch && !o.art) { const pool = BESTIARY.filter((a) => a.arch === o.arch && !a.lone && !a.breach && !a.air && enemyArtReady(a.id)); if (pool.length) o.art = pick(pool).id; }
  const c = new Monster({
    x, y, team: 'enemy', ai: o.ai || 'ranged', static: !!o.static, sprite: o.sprite || 'crystal', art: o.art || null, artH: o.artH || 44, px: 3, r: o.r || 0.45,
    maxHp: m.maxHp * (o.hp || 0.04), hp: m.maxHp * (o.hp || 0.04), level: m.level, dmg: m.dmg * (o.dmg || 0.35), xp: m.xp * 0.01, name: o.name, rank: 'champion',
    aura: o.aura || R.E.glow, awake: true, el: R.tpl.el, res: {}, goreType: o.gore || 'spark', atkCd: o.atkCd || 2, range: o.range || 7,
    proj: { fx: R.fx, speed: 6 }, swap: o.swap || null, pal: o.pal || { a: R.E.glow, c: R.E.core, w: '#ffffff', m: '#4a4650' }, fly: o.fly,
  });
  c.raidPriority = o.priority ?? 3;
  c.aggro = hero(R);
  if (o.tick) c.wardTick = (dt) => { if (m.dead) { c.dead = true; return; } c.moving = false; o.tick(c, dt); };
  if (o.onDeath) c.onDeath = () => o.onDeath(c);
  R.minions.push(c);
  w.add(c);
  sparkle(x, y, 30, R.E.glow, 18, 0.6);
  return c;
}

const A = (R) => R.arena;
const randFloor = (R, pad = 3) => {
  const a = A(R), w = R.m.world;
  for (let i = 0; i < 40; i++) { const x = a.x + rand(pad, a.w - pad), y = a.y + rand(pad, a.h - pad); if (floorAt(w, x, y)) return [x, y]; }
  return [a.cx, a.cy];
};
const say = (R, text, color = '#ffd0a0') => floatText(R.m.x, R.m.y, R.m.artH * R.m.scale + 10, text, color, 15, { life: 1.6, vz: 20 });

// ======================================================================================== signature abilities
export const SIG_NAMES = {};
export const SIGS = {};
const sig = (k, name, fn) => { SIG_NAMES[k] = name; SIGS[k] = fn; };

// ---- 1 Ser Valdric the Bound — SOUL TETHER
sig('tether', 'Soul Tether', (R) => {
  const p = hero(R), w = R.m.world;
  if (!p) return;
  const sx = p.x, sy = p.y, len = 4.5;
  const T = zone(R, { x: sx, y: sy, r: len, dur: 9, color: '#fff0b0', good: true, goal: true });
  T.autoGoal = () => ({ x: sx, y: sy, r: len - 1.6 });
  T.tick = (dt) => {
    const d = dist(p.x, p.y, sx, sy);
    if ((T.fx = (T.fx || 0) - dt) <= 0) { T.fx = 0.08; addEffect(new Bolt(sx, sy, 30, p.x, p.y, 30, d > len ? '#ff4030' : '#fff0b0', 0.1, d > len ? 4 : 2)); }
    if (d > len && (T.hurt = (T.hurt || 0) - dt) <= 0) { T.hurt = 0.5; hit(R.m, p, R.m.dmg * 0.9, 'holy', { force: true, crit: false }); floatText(p.x, p.y, 70, 'TETHER!', '#ff6040', 13); }
  };
  addEffect(new Column(sx, sy, '#fff0b0', 0.7, 26, 300));
  sfx('holy');
});
sig('judgement_cross', 'Judgement Cross', (R) => {
  const p = hero(R);
  if (!p) return;
  const group = new Set();
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) line(R, p.x, p.y, a, 16, 0.75, 1.3, 1.3, '#ffe890', { el: 'holy', group });
  sfx('holy');
});
sig('halo', 'Halo Return', (R, t) => {
  const m = R.m, w = m.world;
  for (const off of R.pi >= 2 ? [-0.5, 0, 0.5] : [-0.3, 0.3]) w.addHazard(new Projectile({ world: w, src: m, x: m.x, y: m.y, z: 50, ang: angleTo(m.x, m.y, t.x, t.y) + off, speed: 6, range: 11, ret: true, pierce: 99, fx: 'holy', el: 'holy', dmg: dmgOf(R, 0.7), size: 2.2, light: true }));
  sfx('swing');
});

// ---- 2 Ophaniel — PETRIFYING GAZE (get behind it)
sig('gaze', 'Petrifying Gaze', (R, t) => {
  const m = R.m, w = m.world, dur = 2.6;
  const g = w.addHazard({
    t: 0, world: w, team: m.team, ground: true, ang: angleTo(m.x, m.y, t.x, t.y),
    danger(out) { out.push({ cone: true, x: m.x, y: m.y, ang: this.ang, half: 1.75, r: 30 }); },
    autoGoal() { const b = this.ang + Math.PI; return { x: m.x + Math.cos(b) * 2.6, y: m.y + Math.sin(b) * 2.6, r: 1.2 }; },
    update(dt) {
      if (!live(R)) return false;
      this.t += dt;
      const p = hero(R); if (p) this.ang += clamp(angleDiff(this.ang, angleTo(m.x, m.y, p.x, p.y)), -0.5 * dt, 0.5 * dt); // it turns, slowly
      m.face(this.ang);
      if (this.t < dur) return true;
      for (const c of w.hostiles(m.team, m.x, m.y, 30)) {
        if (Math.abs(angleDiff(this.ang, angleTo(m.x, m.y, c.x, c.y))) > 1.65 || !w.map.los(m.x, m.y, c.x, c.y)) continue;
        hit(m, c, m.dmg * 2.4, 'holy', { crit: false });
        c.status.stun = { t: c.isPlayer ? 1.6 : 3 };
        floatText(c.x, c.y, 70, 'PETRIFIED', '#d8d0b0', 14);
      }
      explosionFx(m.x, m.y, 3, 'holy', 'nova', { shake: 8 }); G.flash = 0.5;
      return false;
    },
    draw(ctx) {
      const k = this.t / dur, px = isoX(m.x, m.y), py = isoY(m.x, m.y);
      ctx.save(); ctx.globalAlpha = 0.12 + 0.25 * k; ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let i = 0; i <= 24; i++) { const a = this.ang - 1.65 + (i / 24) * 3.3, x = m.x + Math.cos(a) * 14, y = m.y + Math.sin(a) * 14; ctx.lineTo(isoX(x, y), isoY(x, y)); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    },
  });
  UI.centerMsg('PETRIFYING GAZE', 'Get behind it!', 2);
  sfx('arcane');
  return g;
});
sig('wheels', 'Wheels Within Wheels', (R) => {
  const m = R.m, n = 3 + R.pi;
  for (let i = 0; i < n; i++) mover(R, { x: m.x, y: m.y, ang: (i / n) * TAU + rand(0.3), speed: 3.6 + R.pi * 0.4, dur: 6, r: 0.75, teeth: 8, color: '#ffe8a0', spin: 9, mul: 0.8 });
  sfx('arcane');
});
sig('eye_lattice', 'Eye Lattice', (R) => {
  const a = A(R);
  for (let i = -3; i <= 3; i++) {
    const off = i * 4;
    later(R.m.world, (i + 3) * 0.12, () => {
      if (!live(R)) return;
      line(R, a.cx + off - 13, a.cy - 13, Math.PI / 4, 37, 0.6, 1.1, 1.3, '#ffd0ff');
      line(R, a.cx + off + 13, a.cy - 13, (3 * Math.PI) / 4, 37, 0.6, 1.5, 1.3, '#ffd0ff');
    });
  }
  sfx('arcane');
});

// ---- 3 Bastion Prime — OVERLOAD CONDUITS
sig('conduits', 'Overload Conduits', (R) => {
  const m = R.m, n = 3;
  if (R.conduits && R.conduits.some((c) => !c.dead)) return;
  m.ward = 0.15;
  R.conduits = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = randFloor(R, 4);
    const c = zone(R, { x, y, r: 1.3, dur: 16, color: '#80e0ff', good: true });
    c.charge = 0;
    c.tick = (dt) => {
      const p = hero(R);
      if (p && c.inside(p)) { c.charge += dt; if (chance(dt * 30)) addEffect(new Bolt(x, y, 10, p.x, p.y, 40, '#80e0ff', 0.1, 2)); }
      if (c.charge >= 1.4) {
        c.dead = true;
        addEffect(new Bolt(x, y, 20, m.x, m.y, 80, '#ffffff', 0.4, 6)); explosionFx(x, y, 1.5, 'light', 'nova');
        const left = R.conduits.filter((q) => !q.dead).length;
        m.ward = left ? 0.15 + (1 - left / n) * 0.6 : 1;
        if (!left) { m.status.stun = { t: 4 }; say(R, 'SHIELD OVERLOADED', '#80e0ff'); hit(hero(R), m, m.maxHp * 0.04, 'light', { force: true, crit: false }); }
      }
      if (c.t > 15.5 && R.conduits.some((q) => !q.dead)) {
        R.conduits.forEach((q) => (q.dead = true)); m.ward = 1;
        for (const h of m.world.hostiles(m.team, m.x, m.y, 40)) hit(m, h, h.maxHp * 0.5, 'light', { force: true, crit: false });
        explosionFx(m.x, m.y, 8, 'light', 'nova', { shake: 16 }); G.flash = 0.8; say(R, 'AEGIS DETONATION', '#ff6040');
      }
    };
    R.conduits.push(c);
  }
  UI.centerMsg('OVERLOAD CONDUITS', 'Stand on each conduit to break its shield', 2.4);
  sfx('summon');
});
sig('rampart', 'Rampart Cage', (R) => {
  const p = hero(R), w = R.m.world, map = w.map;
  if (!p) return;
  const cx = Math.floor(p.x), cy = Math.floor(p.y), gapSide = randi(0, 3), tiles = [];
  for (let k = -2; k <= 2; k++) {
    const ring = [[cx + k, cy - 2, 0], [cx + 2, cy + k, 1], [cx + k, cy + 2, 2], [cx - 2, cy + k, 3]];
    for (const [x, y, s] of ring) {
      if (s === gapSide && Math.abs(k) <= 1) continue;
      const i = y * map.w + x;
      if (map.t[i] === 1 && !map.block[i] && !(Math.floor(p.x) === x && Math.floor(p.y) === y)) { map.block[i] = 1; tiles.push(i); burst(x + 0.5, y + 0.5, 20, 'phys', 5, 2); }
    }
  }
  map.flowFrom = [-9, -9];
  w.addHazard({ t: 0, update(dt) { if ((this.t += dt) > 3.2 || !live(R)) { for (const i of tiles) map.block[i] = 0; map.flowFrom = [-9, -9]; return false; } return true; }, draw(ctx) {
    ctx.save(); ctx.fillStyle = '#9aa0b0'; ctx.globalAlpha = 0.85;
    for (const i of tiles) { const x = i % map.w + 0.5, y = (i / map.w | 0) + 0.5, px = isoX(x, y), py = isoY(x, y); ctx.fillRect(px - 10, py - 34, 20, 34); ctx.fillStyle = '#c8d0e0'; ctx.fillRect(px - 10, py - 36, 20, 4); ctx.fillStyle = '#9aa0b0'; }
    ctx.restore();
  }, get depth() { return cx + cy; } });
  blast(R, cx + 0.5, cy + 0.5, 1.9, 2.2, 2.4, { el: 'phys', fx: 'eruption' });
  sfx('thud');
});
sig('aegis_bash', 'Aegis Bash', (R, t) => {
  const m = R.m, ang = angleTo(m.x, m.y, t.x, t.y);
  line(R, m.x, m.y, ang, 9, 1.6, 0.8, 1.6, '#c0d8ff', { knock: 3 });
  sfx('swing');
});

// ---- 4 Thessaly the Herald — CHORUS OF BEACONS
sig('beacons', 'Hymn of Ending', (R) => {
  const p = hero(R), dur = 4.2;
  const spots = [randFloor(R, 4), randFloor(R, 4)];
  const zs = spots.map(([x, y]) => zone(R, { x, y, r: 1.5, dur: dur + 0.3, color: '#ffffff', good: true }));
  later(R.m.world, dur, () => {
    if (!live(R)) return;
    for (const c of R.m.world.hostiles(R.m.team, R.m.x, R.m.y, 40)) if (!zs.some((z) => z.inside(c))) hit(R.m, c, c.maxHp * 0.55, 'holy', { force: true, crit: false });
    explosionFx(R.m.x, R.m.y, 7, 'holy', 'nova', { shake: 14 }); G.flash = 0.7;
    for (const z of zs) addEffect(new Column(z.x, z.y, '#ffffff', 0.8, 40, 400));
  });
  UI.centerMsg('HYMN OF ENDING', 'Stand in a beacon of light!', dur);
  sfx('holy'); sfx('boss');
});
sig('trumpet', 'Trumpet Blast', (R, t) => {
  const m = R.m, w = m.world, ang = angleTo(m.x, m.y, t.x, t.y), half = 0.55;
  w.addHazard({
    r: 1, t: 0, ground: true, done: new Set(), world: w, team: m.team,
    danger(out) { out.push({ cone: true, x: m.x, y: m.y, ang, half: half + 0.15, r: this.r + 2.5 }); },
    update(dt) {
      if (!live(R)) return false;
      this.r += 6 * dt; this.t += dt;
      for (const c of w.hostiles(m.team, m.x, m.y, this.r + 0.5)) {
        if (this.done.has(c) || Math.abs(dist(m.x, m.y, c.x, c.y) - this.r) > 0.7 || Math.abs(angleDiff(ang, angleTo(m.x, m.y, c.x, c.y))) > half) continue;
        this.done.add(c); hit(m, c, m.dmg * 1.2, 'holy', { knock: 2.5, ang });
      }
      return this.r < 15;
    },
    draw(ctx) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#fff6c0';
      for (let j = 0; j < 3; j++) {
        const rr = this.r - j * 0.5; if (rr <= 0) continue;
        ctx.globalAlpha = 0.8 - j * 0.25; ctx.lineWidth = 5 - j;
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const a = ang - half + (i / 16) * half * 2, x = m.x + Math.cos(a) * rr, y = m.y + Math.sin(a) * rr; i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y)); }
        ctx.stroke();
      }
      ctx.restore();
    },
  });
  sfx('roar', 0.7);
});
sig('choir', 'Choir of Notes', (R) => {
  const p = hero(R), w = R.m.world, n = 6 + R.pi * 2;
  if (!p) return;
  const cx = p.x, cy = p.y;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, x = cx + Math.cos(a) * 4.5, y = cy + Math.sin(a) * 4.5;
    later(w, 1.1, () => live(R) && w.addHazard(new Projectile({ world: w, src: R.m, x, y, z: 30, ang: a + Math.PI, speed: 4, range: 9, fx: 'holy', el: 'holy', dmg: dmgOf(R, 0.8), size: 1.3 })));
    sparkle(x, y, 30, '#fff0a0', 6, 0.3);
  }
  tele({ kind: 'circle', x: cx, y: cy, r: 4.5, dur: 1.1, color: '#fff0a0' });
  sfx('holy');
});

// ---- 5 Vexis the Judgement — POLARITY (passive) + signatures
sig('scales', 'Scales of Judgement', (R) => {
  const m = R.m;
  const a = angleTo(m.x, m.y, A(R).cx, A(R).cy) + Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    blast(R, m.x + Math.cos(a) * side * 3.6, m.y + Math.sin(a) * side * 3.6, 3, 1.1 + i * 0.8, 1.8, { fx: 'eruption', el: 'arcane' });
  }
  sfx('thud');
});
sig('verdict', 'Verdict Chains', (R) => {
  const m = R.m, w = m.world, p = hero(R), dur = 4;
  if (!p) return;
  w.addHazard({
    t: 0, world: w,
    autoGoal() { const a = angleTo(m.x, m.y, p.x, p.y), x = m.x + Math.cos(a) * 12, y = m.y + Math.sin(a) * 12; return { x, y, r: 2 }; },
    update(dt) {
      if (!live(R)) return false;
      this.t += dt;
      const d = dist(m.x, m.y, p.x, p.y);
      if (d > 9.5) { floatText(p.x, p.y, 70, 'CHAINS BROKEN', '#c0a0ff', 13); burst(p.x, p.y, 30, 'arcane', 20, 3); return false; }
      const a = angleTo(p.x, p.y, m.x, m.y); w.map.move(p, Math.cos(a) * 1.4 * dt, Math.sin(a) * 1.4 * dt);
      if ((this.fx = (this.fx || 0) - dt) <= 0) { this.fx = 0.06; addEffect(new Bolt(m.x, m.y, 60, p.x, p.y, 30, '#b080ff', 0.08, 3)); }
      if (this.t >= dur) { hit(m, p, p.maxHp * 0.45, 'arcane', { force: true, crit: false }); explosionFx(p.x, p.y, 2, 'arcane', 'nova'); return false; }
      return true;
    }, draw() {},
  });
  UI.centerMsg('VERDICT CHAINS', 'Break away — get far from it!', 2);
  sfx('arcane');
});

// ---- 6 Throne-Seraph Aurion — ECLIPSE (wandering light)
sig('eclipse', 'Total Eclipse', (R) => {
  if (R.eclipse && !R.eclipse.dead) return;
  const [x, y] = randFloor(R, 5), w = R.m.world;
  const z = (R.eclipse = zone(R, { x, y, r: 3, dur: 11, color: '#ffe060', good: true }));
  z.dir = rand(TAU);
  z.tick = (dt) => {
    z.dir += rand(-1.2, 1.2) * dt;
    const nx = z.x + Math.cos(z.dir) * 1.3 * dt, ny = z.y + Math.sin(z.dir) * 1.3 * dt;
    if (floorAt(w, nx, ny) && R.inside({ x: nx, y: ny }, 4)) { z.x = nx; z.y = ny; } else z.dir += Math.PI * 0.7;
    if ((z.hurt = (z.hurt || 0) - dt) <= 0) {
      z.hurt = 0.5;
      for (const c of w.hostiles(R.m.team, R.m.x, R.m.y, 40)) if (!z.inside(c)) hit(R.m, c, c.maxHp * 0.045, 'shadow', { force: true, crit: false, dot: true });
    }
    w.darkK = Math.min(1, (w.darkK || 0) + dt * 2);
  };
  const old = z.update.bind(z);
  z.update = (dt) => { const ok = old(dt); if (!ok) w.darkK = 0; return ok; };
  UI.centerMsg('TOTAL ECLIPSE', 'Stay in the wandering light!', 2.4);
  sfx('boss');
});
sig('dawn_rays', 'Dawn Rays', (R) => {
  const a = A(R), vertical = chance(0.5), gap = randi(1, 5);
  for (let i = 0; i < 7; i++) {
    if (i === gap) continue;
    const off = -12 + i * 4;
    if (vertical) line(R, a.cx + off, a.y + 1, Math.PI / 2, a.h, 1.2, 1.3 + i * 0.08, 1.5, '#ffe060', { el: 'holy' });
    else line(R, a.x + 1, a.cy + off * 0.8, 0, a.w, 1.2, 1.3 + i * 0.08, 1.5, '#ffe060', { el: 'holy' });
  }
  sfx('holy');
});
sig('corona', 'Corona Collapse', (R) => {
  const m = R.m;
  for (let i = 0; i < 1 + (R.pi >= 2 ? 1 : 0); i++) later(m.world, i * 1.4, () => live(R) && m.world.addHazard(new InRing(R, { x: m.x, y: m.y, gap: rand(TAU), gapW: 1.25, color: '#ffd040', mul: 1.1 })));
  sfx('fire');
});

// ---- 7 Grimscale Triad — THREE HEADS
sig('heads', 'Grow the Heads', (R) => {
  R.heads = (R.heads || []).filter((h) => !h.dead);
  const m = R.m;
  for (let i = R.heads.length; i < 3; i++) {
    const a = (i / 3) * TAU + rand(0.5);
    const h = add(R, m.x + Math.cos(a) * 3, m.y + Math.sin(a) * 3, {
      name: 'Grimscale Head', art: R.artId, artH: 36, ai: 'ranged', hp: 0.035, dmg: 0.4, atkCd: 1.6, range: 9, priority: 6, swap: { tint: [140, 255, 140, 0.25] },
      onDeath: () => { hit(hero(R) || m, m, m.maxHp * 0.07, 'shadow', { force: true, crit: false }); say(R, 'A HEAD FALLS', '#80ff80'); },
    });
    R.heads.push(h);
  }
  sfx('roar');
});
sig('grave_breath', 'Grave Breath', (R, t) => {
  const m = R.m, base = angleTo(m.x, m.y, t.x, t.y);
  [-0.9, 0, 0.9].forEach((o, i) => later(m.world, i * 0.6, () => {
    if (!live(R)) return;
    const a = base + o * (i % 2 ? -1 : 1);
    tele({ kind: 'cone', x: m.x, y: m.y, ang: a, len: 8, half: 0.42, dur: 0.6 });
    later(m.world, 0.6, () => {
      if (!live(R)) return;
      for (const c of m.world.hostiles(m.team, m.x, m.y, 8)) if (Math.abs(angleDiff(a, angleTo(m.x, m.y, c.x, c.y))) < 0.42) hit(m, c, m.dmg * 1.4, 'shadow', { poison: true });
      for (let k = 1; k < 8; k += 1.4) burst(m.x + Math.cos(a) * k, m.y + Math.sin(a) * k, 20, 'poison', 6, 3);
    });
  }));
  sfx('acid');
});
sig('bone_lanes', 'Bone Rain Lanes', (R) => {
  const a = A(R), safe = randi(0, 5), lane = a.h / 6;
  for (let i = 0; i < 6; i++) {
    if (i === safe) continue;
    const y = a.y + lane * (i + 0.5);
    line(R, a.x + 0.5, y, 0, a.w, lane / 2 - 0.1, 1.8, 1.6, '#e8e0c8', { el: 'shadow' });
    for (let x = a.x + 2; x < a.x + a.w; x += 3) sparkle(x, y, 120, '#e8e0c8', 2, 0.6);
  }
  sfx('boss');
});

// ---- 8 Ambrecoil — AMBER ENTOMB
sig('entomb', 'Amber Entomb', (R) => {
  const p = hero(R), w = R.m.world;
  if (!p) return;
  const z = zone(R, { x: p.x, y: p.y, r: 1.2, dur: 3, color: '#ffb030', good: false });
  z.tick = (dt) => {
    z.r = 1.2 + z.t * 0.5;
    for (const c of w.hostiles(R.m.team, z.x, z.y, z.r)) c.status.slow = { t: 0.3, amt: 0.6 };
    if (z.t >= 2.9) {
      for (const c of w.hostiles(R.m.team, z.x, z.y, z.r)) { c.status.stun = { t: 2 }; hit(R.m, c, R.m.dmg * 1.8, 'fire', { crit: false }); floatText(c.x, c.y, 70, 'ENTOMBED', '#ffb030', 14); }
      zone(R, { x: z.x, y: z.y, r: z.r, dur: 14, color: '#c08020', good: false, tick(dt) { for (const c of w.hostiles(R.m.team, this.x, this.y, this.r)) c.status.slow = { t: 0.3, amt: 0.45 }; } });
    }
  };
  z.danger = (out) => out.push({ x: z.x, y: z.y, r: z.r + 0.8 });
  sfx('acid');
});
sig('frill_flash', 'Frill Flash', (R) => {
  const m = R.m, w = m.world, a0 = rand(TAU), wedges = 4, gap = 0.5;
  for (let i = 0; i < wedges; i++) tele({ kind: 'cone', x: m.x, y: m.y, ang: a0 + (i / wedges) * TAU + Math.PI / wedges, len: 14, half: Math.PI / wedges - gap / 2, dur: 1.3, color: '#ffc040' });
  later(w, 1.3, () => {
    if (!live(R)) return;
    for (const c of w.hostiles(m.team, m.x, m.y, 14)) {
      const rel = ((angleTo(m.x, m.y, c.x, c.y) - a0) % (TAU / wedges) + TAU) % (TAU / wedges);
      if (Math.abs(rel) > gap / 2 && Math.abs(rel - TAU / wedges) > gap / 2) hit(m, c, m.dmg * 1.7, 'fire', {});
    }
    G.flash = 0.6; explosionFx(m.x, m.y, 4, 'fire', 'nova');
  });
  w.addHazard({ t: 0, update(dt) { return (this.t += dt) < 1.3 && live(R); }, draw() {}, danger(out) {
    for (let i = 0; i < wedges; i++) out.push({ cone: true, x: m.x, y: m.y, ang: a0 + (i / wedges) * TAU + Math.PI / wedges, half: Math.PI / wedges - gap / 2 + 0.05, r: 14.5 });
  } });
  sfx('fire');
});
sig('geysers', 'Sap Geysers', (R) => {
  const m = R.m, dir = chance(0.5) ? 1 : -1;
  for (let i = 0; i < 18; i++) {
    const a = dir * i * 0.7, rr = 1.6 + i * 0.6, x = m.x + Math.cos(a) * rr, y = m.y + Math.sin(a) * rr;
    if (floorAt(m.world, x, y)) blast(R, x, y, 1.3, 0.8 + i * 0.12, 1.2, { fx: 'eruption', el: 'fire' });
  }
  sfx('fire');
});

// ---- 9 Copperjaw the Hammer — MINEFIELD + MAGNETIC PULSE
sig('mines', 'Spark Minefield', (R) => {
  const w = R.m.world, n = 10 + R.pi * 3;
  for (let i = 0; i < n; i++) {
    const [x, y] = randFloor(R, 2);
    const z = zone(R, { x, y, r: 0.7, dur: 22, color: '#ff9030', good: false, arm: 1.2 });
    z.tick = () => {
      if (z.t < 1.2) return;
      const c = w.hostiles(R.m.team, z.x, z.y, z.r)[0];
      if (c) { z.dead = true; hit(R.m, c, R.m.dmg * 1.5, 'light', { knock: 1 }); explosionFx(z.x, z.y, 1.4, 'light', 'explosion'); }
    };
  }
  sfx('trap');
});
sig('magnet', 'Magnetic Pulse', (R) => {
  const m = R.m, w = m.world, pull = chance(0.5);
  tele({ kind: 'circle', x: m.x, y: m.y, r: 12, dur: 1, color: pull ? '#60a0ff' : '#ff6060' });
  say(R, pull ? 'ATTRACT' : 'REPEL', pull ? '#60a0ff' : '#ff6060');
  later(w, 1, () => {
    if (!live(R)) return;
    for (const c of w.hostiles(m.team, m.x, m.y, 14)) {
      if (c.static) continue;
      const a = angleTo(m.x, m.y, c.x, c.y) + (pull ? Math.PI : 0);
      c.kbx = (c.kbx || 0) + Math.cos(a) * 9; c.kby = (c.kby || 0) + Math.sin(a) * 9;
    }
    addEffect(new Ring(m.x, m.y, pull ? 12 : 0.5, pull ? 0.5 : 12, 0.6, pull ? '#60a0ff' : '#ff6060', 6));
  });
  sfx('arcane');
});
sig('anvil', 'Anvil Drop', (R) => {
  const p = hero(R), w = R.m.world, map = w.map;
  if (!p) return;
  const x = Math.floor(p.x) + 0.5, y = Math.floor(p.y) + 0.5;
  blast(R, x, y, 2.1, 1.6, 2.2, { fx: 'eruption', el: 'phys' });
  later(w, 1.6, () => {
    if (!live(R)) return;
    const i = Math.floor(y) * map.w + Math.floor(x);
    if (map.t[i] !== 1 || map.block[i]) return;
    for (const c of w.creatures) if (!c.dead && Math.floor(c.x) === Math.floor(x) && Math.floor(c.y) === Math.floor(y)) c.x += 1.1;
    map.block[i] = 1; map.flowFrom = [-9, -9];
    w.addHazard({ t: 0, get depth() { return x + y; }, update(dt) { if ((this.t += dt) > 12 || !live(R)) { map.block[i] = 0; map.flowFrom = [-9, -9]; return false; } return true; }, draw(ctx) {
      const px = isoX(x, y), py = isoY(x, y);
      ctx.save(); ctx.fillStyle = '#3a3a42'; ctx.fillRect(px - 22, py - 30, 44, 22); ctx.fillStyle = '#5c5c66'; ctx.fillRect(px - 26, py - 36, 52, 8); ctx.fillStyle = '#26262c'; ctx.fillRect(px - 12, py - 10, 24, 10); ctx.restore();
    } });
  });
  sfx('thud');
});

// ---- 10 Ser Leonis, the Silver Lion — SUNDER STACKS (break sight) + RIPOSTE
sig('riposte', 'Silver Riposte', (R) => {
  const m = R.m, w = m.world, dur = 2.4;
  m.reflect = true;
  w.addHazard({ t: 0, holdFire: true, update(dt) {
    if (!live(R)) { m.reflect = false; return false; }
    this.t += dt;
    if (chance(dt * 20)) sparkle(m.x, m.y, rand(20, 90), '#e0f0ff', 2, 0.6);
    if (this.t >= dur) { m.reflect = false; return false; }
    return true;
  }, draw() {} });
  say(R, 'EN GARDE', '#e0f0ff');
  UI.log('Silver Riposte: every blow against Ser Leonis is turned back on you — hold your attacks!', '#c8e0ff');
  sfx('swing');
});
sig('mane_lightning', 'Mane Lightning', (R) => {
  const p = hero(R);
  if (!p) return;
  const n = 8, cx = p.x, cy = p.y;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = cx + Math.cos(a) * 2.6, y = cy + Math.sin(a) * 2.6; if (floorAt(R.m.world, x, y)) blast(R, x, y, 1, 0.9 + i * 0.05, 1.1, { el: 'light' }); }
  blast(R, cx, cy, 1.6, 1.9, 1.8, { el: 'light', fx: 'nova' });
  sfx('light');
});

// ---- 11 Crescent Lancer Nyx — LUNAR TIDE + signatures
sig('crescent', 'Crescent Volley', (R, t) => {
  const m = R.m, w = m.world, base = angleTo(m.x, m.y, t.x, t.y), n = 7, curve = chance(0.5) ? 0.6 : -0.6;
  for (let i = 0; i < n; i++) {
    const pr = w.addHazard(new Projectile({ world: w, src: m, x: m.x, y: m.y, z: 40, ang: base + (i - (n - 1) / 2) * 0.16, speed: 5, range: 15, fx: 'shard', el: 'arcane', dmg: dmgOf(R, 0.6), size: 1.4 }));
    const up = pr.update.bind(pr);
    pr.update = (dt) => { const a = Math.atan2(pr.vy, pr.vx) + curve * dt; pr.vx = Math.cos(a) * pr.speed; pr.vy = Math.sin(a) * pr.speed; return up(dt); };
  }
  sfx('cold');
});
sig('lance_pin', 'Lance Pin', (R) => {
  const p = hero(R), w = R.m.world, map = w.map;
  if (!p) return;
  const tiles = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, x = Math.floor(p.x + Math.cos(a) * 2.2), y = Math.floor(p.y + Math.sin(a) * 2.2), k = y * map.w + x;
    if (map.t[k] === 1 && !map.block[k]) { map.block[k] = 1; tiles.push(k); addEffect(new Column(x + 0.5, y + 0.5, '#c0a0ff', 0.4, 10, 200)); }
  }
  map.flowFrom = [-9, -9];
  w.addHazard({ t: 0, get depth() { return p.x + p.y; }, update(dt) { if ((this.t += dt) > 4 || !live(R)) { for (const k of tiles) map.block[k] = 0; map.flowFrom = [-9, -9]; return false; } return true; }, draw(ctx) {
    ctx.save(); ctx.strokeStyle = '#d8c8ff'; ctx.lineWidth = 3;
    for (const k of tiles) { const x = k % map.w + 0.5, y = (k / map.w | 0) + 0.5, px = isoX(x, y), py = isoY(x, y); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 46); ctx.stroke(); }
    ctx.restore();
  } });
  blast(R, Math.floor(p.x) + 0.5, Math.floor(p.y) + 0.5, 2.6, 2.2, 1.9, { el: 'arcane', fx: 'nova' });
  sfx('cold');
});

// ---- 12 Ashenward Colossus — FLOOR IS LAVA (quadrants)
sig('lava_quadrants', 'Floor of Magma', (R) => {
  const a = A(R), safe = randi(0, 3), w = R.m.world;
  const quad = (q) => [a.x + (q % 2 ? a.w * 0.75 : a.w * 0.25), a.y + (q > 1 ? a.h * 0.75 : a.h * 0.25)];
  const [sx, sy] = quad(safe);
  zone(R, { x: sx, y: sy, r: 3.2, dur: 2.6, color: '#80ff90', good: true });
  w.addHazard({ t: 0, ground: true, update(dt) { return (this.t += dt) < 2.4 && live(R); }, danger(out) {
    for (let q = 0; q < 4; q++) if (q !== safe) { const [x, y] = quad(q); out.push({ x, y, r: Math.max(a.w, a.h) * 0.37 }); }
  }, draw(ctx) {
    ctx.save(); ctx.globalAlpha = 0.12 + 0.15 * (this.t / 2.4); ctx.fillStyle = '#ff4010';
    for (let q = 0; q < 4; q++) {
      if (q === safe) continue;
      const x0 = a.x + (q % 2 ? a.w / 2 : 0), y0 = a.y + (q > 1 ? a.h / 2 : 0), x1 = x0 + a.w / 2, y1 = y0 + a.h / 2;
      ctx.beginPath(); ctx.moveTo(isoX(x0, y0), isoY(x0, y0)); ctx.lineTo(isoX(x1, y0), isoY(x1, y0)); ctx.lineTo(isoX(x1, y1), isoY(x1, y1)); ctx.lineTo(isoX(x0, y1), isoY(x0, y1)); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } });
  later(w, 2.4, () => {
    if (!live(R)) return;
    for (const c of w.hostiles(R.m.team, a.cx, a.cy, 40)) {
      const q = (c.x > a.x + a.w / 2 ? 1 : 0) + (c.y > a.y + a.h / 2 ? 2 : 0);
      if (q !== safe) hit(R.m, c, c.maxHp * 0.42, 'fire', { force: true, crit: false, burn: true });
    }
    for (let i = 0; i < 26; i++) { const x = a.x + rand(2, a.w - 2), y = a.y + rand(2, a.h - 2), q = (x > a.x + a.w / 2 ? 1 : 0) + (y > a.y + a.h / 2 ? 2 : 0); if (q !== safe) explosionFx(x, y, 1.4, 'fire', 'eruption'); }
    camera.shake(14);
  });
  UI.centerMsg('FLOOR OF MAGMA', 'Find the cool quadrant!', 2.2);
  sfx('fire'); sfx('boss');
});
sig('magma_trail', 'Magma Fist', (R) => {
  const w = R.m.world;
  for (let i = 0; i < 10; i++) later(w, i * 0.35, () => { const p = hero(R); if (live(R) && p) blast(R, p.x, p.y, 1.1, 1, 0.8, { el: 'fire', fx: 'eruption' }); });
  sfx('fire');
});
sig('cinder_turret', 'Cinder Shield', (R, t) => {
  const m = R.m, w = m.world;
  const [x, y] = w.map.nudge((m.x + t.x) / 2, (m.y + t.y) / 2, 0.4);
  const T = { x, y, a: rand(TAU), t: 0, world: w, team: m.team, hits: new Map(), get depth() { return x + y + 0.4; },
    danger(out) { for (const o of [0, Math.PI]) { const a = this.a + o + 0.4; out.push({ line: true, x, y, x1: x + Math.cos(a) * 7, y1: y + Math.sin(a) * 7, r: 1.2 }); } },
    update(dt) {
      if (!live(R)) return false;
      this.t += dt; this.a += 1.3 * dt;
      if (this.t < 0.8) return true;
      for (const o of [0, Math.PI]) {
        const a = this.a + o, L = w.map.rayLength(x, y, a, 7);
        for (const c of lineTargets(w, m.team, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 0.5)) { if ((this.hits.get(c) || 0) > this.t) continue; this.hits.set(c, this.t + 0.4); hit(m, c, m.dmg * 0.8, 'fire', { burn: true }); }
        if (chance(dt * 30)) burst(x + Math.cos(a) * rand(1, L), y + Math.sin(a) * rand(1, L), 15, 'fire', 3, 2);
      }
      addLight(x, y, 3, 0.9);
      return this.t < 6;
    },
    draw(ctx) {
      const px = isoX(x, y), py = isoY(x, y) - 14;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const o of [0, Math.PI]) {
        const a = this.a + o, L = w.map.rayLength(x, y, a, 7), ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
        if (this.t < 0.8) { ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff4010'; ctx.lineWidth = 2; }
        else { ctx.globalAlpha = 0.85; ctx.strokeStyle = '#ffa040'; ctx.lineWidth = 9 + Math.sin(this.t * 40) * 2; }
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(isoX(ex, ey), isoY(ex, ey) - 10); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.drawImage(glowSprite('#ff8020'), px - 20, py - 20, 40, 40);
      ctx.restore();
    } };
  w.addHazard(T);
  sfx('fire');
});

// ---- 13 Voidmother Ysol — DEFILE (grows when stood in) + NULL ORBS (collect)
sig('defile', 'Defile', (R) => {
  const p = hero(R), w = R.m.world;
  if (!p) return;
  const z = zone(R, { x: p.x, y: p.y, r: 1.4, dur: 30, color: '#6020a0', good: false, arm: 1.2 });
  z.tick = (dt) => {
    if (z.t < 1.2 || (z.hurt = (z.hurt || 0) - dt) > 0) return;
    z.hurt = 0.4;
    const inside = w.hostiles(R.m.team, z.x, z.y, z.r);
    for (const c of inside) hit(R.m, c, R.m.dmg * 0.35, 'shadow', { dot: true, crit: false });
    if (inside.length) { z.r = Math.min(6, z.r + 0.3 * inside.length); addEffect(new Ring(z.x, z.y, z.r - 0.3, z.r, 0.4, '#a040ff', 3)); }
  };
  sfx('arcane');
});
sig('null_orbs', 'Null Orbs', (R) => {
  const m = R.m, w = m.world, n = 3 + R.pi;
  for (let i = 0; i < n; i++) {
    const [x, y] = randFloor(R, 2);
    const o = { x, y, t: 0, world: w, get depth() { return this.x + this.y; },
      autoGoal() { return { x: this.x, y: this.y, r: 0.4 }; },
      update(dt) {
        if (!live(R) || this.dead) return false;
        this.t += dt;
        const a = angleTo(this.x, this.y, m.x, m.y); this.x += Math.cos(a) * 0.9 * dt; this.y += Math.sin(a) * 0.9 * dt;
        const p = hero(R);
        if (p && dist(p.x, p.y, this.x, this.y) < 0.8) { burst(this.x, this.y, 30, 'arcane', 20, 3); floatText(this.x, this.y, 50, 'Orb absorbed', '#d0a0ff', 12); p.heal && p.heal(p.maxHp * 0.03); return false; }
        if (dist(m.x, m.y, this.x, this.y) < 1.4) { m.heal(m.maxHp * 0.05); floatText(m.x, m.y, 100, '+HEAL', '#a040ff', 15); addEffect(new Ring(m.x, m.y, 0.5, 3, 0.5, '#a040ff', 4)); return false; }
        addLight(this.x, this.y, 1.6, 0.8);
        return true;
      },
      draw(ctx) { const px = isoX(this.x, this.y), py = isoY(this.x, this.y) - 24 - Math.sin(this.t * 4) * 4; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#a040ff'), px - 18, py - 18, 36, 36); ctx.fillStyle = '#100018'; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill(); ctx.restore(); } };
    w.addHazard(o);
  }
  UI.log('Null Orbs drift toward the Voidmother — catch them before they reach her!', '#d0a0ff');
  sfx('summon');
});
sig('tendrils', 'Tendril Grasp', (R) => {
  const p = hero(R);
  if (!p) return;
  const a0 = rand(TAU);
  for (let i = 0; i < 7; i++) { const a = a0 + (i / 7) * TAU, x = p.x + Math.cos(a) * 1.8, y = p.y + Math.sin(a) * 1.8; if (floorAt(R.m.world, x, y)) blast(R, x, y, 0.9, 1, 1, { el: 'shadow', o: { stun: 0.6 } }); }
  sfx('arcane');
});

// ---- 14 Prismatic Lith — PRISM BEAMS + CRYSTAL GROWTH + CHECKERBOARD
sig('prisms', 'Prism Lattice', (R) => {
  const m = R.m, w = m.world, a = A(R), a0 = rand(TAU), dur = 7;
  const pts = [0, 1, 2].map((i) => [a.cx + Math.cos(a0 + (i / 3) * TAU) * 7, a.cy + Math.sin(a0 + (i / 3) * TAU) * 6]);
  w.addHazard({ t: 0, world: w, team: m.team, hits: new Map(), ground: true,
    cur() { const s = 0.35 * this.t; return pts.map(([x, y]) => { const dx = x - a.cx, dy = y - a.cy; return [a.cx + dx * Math.cos(s) - dy * Math.sin(s), a.cy + dx * Math.sin(s) + dy * Math.cos(s)]; }); },
    danger(out) { const c = this.cur(); for (let i = 0; i < 3; i++) { const [x0, y0] = c[i], [x1, y1] = c[(i + 1) % 3]; out.push({ line: true, x: x0, y: y0, x1, y1, r: 1.1 }); } },
    update(dt) {
      if (!live(R)) return false;
      this.t += dt;
      if (this.t < 1) return true;
      const c = this.cur();
      for (let i = 0; i < 3; i++) for (const h of lineTargets(w, m.team, c[i][0], c[i][1], c[(i + 1) % 3][0], c[(i + 1) % 3][1], 0.45)) { if ((this.hits.get(h) || 0) > this.t) continue; this.hits.set(h, this.t + 0.5); hit(m, h, m.dmg * 0.9, 'light', {}); }
      return this.t < dur;
    },
    draw(ctx) {
      const c = this.cur();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const cols = ['#ff60a0', '#60ffd0', '#a0a0ff'];
      for (let i = 0; i < 3; i++) {
        const [x0, y0] = c[i], [x1, y1] = c[(i + 1) % 3];
        ctx.globalAlpha = this.t < 1 ? 0.3 : 0.8; ctx.strokeStyle = cols[i]; ctx.lineWidth = this.t < 1 ? 2 : 7 + Math.sin(this.t * 30) * 2;
        ctx.beginPath(); ctx.moveTo(isoX(x0, y0), isoY(x0, y0) - 20); ctx.lineTo(isoX(x1, y1), isoY(x1, y1) - 20); ctx.stroke();
        ctx.globalAlpha = 1; ctx.drawImage(glowSprite(cols[i]), isoX(x0, y0) - 16, isoY(x0, y0) - 36, 32, 32);
      }
      ctx.restore();
    } });
  sfx('light');
});
sig('checkerboard', 'Light Lattice', (R) => {
  const a = A(R), w = R.m.world;
  const pass = (k) => { for (let y = a.y + 1; y < a.y + a.h - 1; y += 2) for (let x = a.x + 1; x < a.x + a.w - 1; x += 2) {
    if (((Math.floor((x - a.x) / 2) + Math.floor((y - a.y) / 2)) & 1) !== k) continue;
    if (floorAt(w, x + 1, y + 1)) blast(R, x + 1, y + 1, 1.2, 1.3, 1.1, { el: 'light' });
  } };
  const first = randi(0, 1);
  pass(first);
  later(w, 1.35, () => live(R) && pass(1 - first)); // the other half lights once the first has burst
  sfx('light');
});
sig('crystal_growth', 'Crystal Growth', (R) => {
  const p = hero(R), w = R.m.world;
  for (let i = 0; i < 5; i++) {
    const [x, y] = i < 2 && p ? [p.x + rand(-3, 3), p.y + rand(-3, 3)] : randFloor(R, 3);
    if (!floorAt(w, x, y)) continue;
    add(R, x, y, { name: 'Unstable Crystal', static: true, ai: 'ward', hp: 0.012, sprite: 'crystal', art: 'va_crystal', artH: 46, priority: 1, swap: { tint: [180, 255, 240, 0.7] },
      tick(c, dt) { c.fuse = (c.fuse ?? 6) - dt; if (c.fuse <= 0) { c.dead = true; for (const h of w.hostiles(c.team, c.x, c.y, 2.4)) hit(R.m, h, R.m.dmg * 1.6, 'light', { knock: 1 }); explosionFx(c.x, c.y, 2.4, 'light', 'nova'); } },
    });
    const z = zone(R, { x, y, r: 2.4, dur: 6, color: '#80fff0', good: false, arm: 3.5 });
  }
  sfx('summon');
});

// ---- 15 Stormwraith Kaela — STATIC (keep moving) + STORM CELLS + ARC CHAIN
sig('storm_cells', 'Storm Cells', (R) => {
  const n = 3 + R.pi;
  for (let i = 0; i < n; i++) {
    const [x, y] = randFloor(R, 3);
    const cell = mover(R, { x, y, ang: rand(TAU), speed: 1.6, dur: 9, r: 0.3, color: '#90b0ff', mul: 0, z: 110, teeth: 4 });
    cell.zap = 1;
    cell.steer = (dt) => {
      if ((cell.zap -= dt) > 0) return;
      cell.zap = 1.5;
      blast(R, cell.x, cell.y, 1.3, 0.6, 1.2, { el: 'light' });
      later(R.m.world, 0.6, () => live(R) && addEffect(new Bolt(cell.x, cell.y, 120, cell.x, cell.y, 0, '#e0e8ff', 0.25, 5)));
    };
    cell.danger = (out) => out.push({ x: cell.x, y: cell.y, r: 1.5, minor: true });
  }
  sfx('light');
});
sig('arc_chain', 'Arc Chain', (R, t) => {
  const m = R.m, w = m.world;
  let from = m, cur = t;
  const done = new Set();
  for (let i = 0; i < 6 && cur; i++) {
    const a = from, b = cur;
    later(w, i * 0.12, () => { if (!live(R) || b.dead) return; addEffect(new Bolt(a.x, a.y, 50, b.x, b.y, 30, '#a0c0ff', 0.3, 4)); hit(m, b, m.dmg * (1.1 - i * 0.1), 'light', {}); });
    done.add(cur); from = cur;
    cur = w.hostiles(m.team, cur.x, cur.y, 6).find((c) => !done.has(c)) || null;
  }
  sfx('light');
});

// ---- 16 Necrolyte Hollowmere — DEEP CHILL (braziers) + signatures
sig('braziers', 'Kindle the Braziers', (R) => {
  for (let i = 0; i < 2; i++) {
    const [x, y] = randFloor(R, 4);
    const z = zone(R, { x, y, r: 1.8, dur: 14, color: '#ff9040', good: true });
    z.goal = false; // only a goal while frozen (passive below)
    (R.braziers || (R.braziers = [])).push(z);
    addEffect(new Column(x, y, '#ff9040', 0.6, 20, 200));
  }
  sfx('fire');
});
sig('glacial_spears', 'Glacial Spears', (R, t) => {
  const m = R.m, ang = angleTo(m.x, m.y, t.x, t.y);
  for (const o of R.pi >= 1 ? [-0.4, 0, 0.4] : [0]) {
    line(R, m.x, m.y, ang + o, 13, 0.7, 0.95, 1.5, '#a0e0ff', { el: 'cold' });
    for (let i = 1; i <= 10; i++) later(m.world, 0.95 + i * 0.03, () => live(R) && burst(m.x + Math.cos(ang + o) * i * 1.2, m.y + Math.sin(ang + o) * i * 1.2, 10, 'cold', 4, 2));
  }
  sfx('cold');
});
sig('corpse_bombs', 'Frozen Corpses', (R) => {
  const p = hero(R), w = R.m.world;
  if (!p) return;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + rand(0.4);
    add(R, p.x + Math.cos(a) * 2.5, p.y + Math.sin(a) * 2.5, { name: 'Frozen Corpse', static: true, ai: 'ward', hp: 0.01, sprite: 'zombie', arch: 'zombie', artH: 44, priority: 5, swap: { tint: [150, 220, 255, 0.6] },
      tick(c, dt) { c.fuse = (c.fuse ?? 3) - dt; if (c.fuse <= 0) { c.dead = true; for (const h of w.hostiles(c.team, c.x, c.y, 2.2)) hit(R.m, h, R.m.dmg * 1.4, 'cold', { slow: 0.5 }); explosionFx(c.x, c.y, 2.2, 'cold', 'nova'); } },
    });
  }
  sfx('summon');
});

// ---- 17 The Pipe Organ — THE DANCE (rows) + PIPES + DISSONANCE
sig('dance', 'Danse Macabre', (R) => {
  const a = A(R), w = R.m.world, rows = 5, beats = 6 + R.pi * 2;
  const bandH = a.h / rows;
  let safe = randi(0, rows - 1);
  for (let b = 0; b < beats; b++) {
    const s = safe;
    later(w, b * 1.05, () => {
      if (!live(R)) return;
      w.addHazard({ t: 0, ground: true, update(dt) { return (this.t += dt) < 1 && live(R); }, danger(out) {
        for (let r = 0; r < rows; r++) if (r !== s) out.push({ line: true, x: a.x, y: a.y + bandH * (r + 0.5), x1: a.x + a.w, y1: a.y + bandH * (r + 0.5), r: bandH / 2 + 0.3 });
      }, draw(ctx) {
        ctx.save(); ctx.globalAlpha = 0.1 + 0.25 * this.t; ctx.fillStyle = '#ffd060';
        for (let r = 0; r < rows; r++) {
          if (r === s) continue;
          const y0 = a.y + bandH * r, y1 = y0 + bandH;
          ctx.beginPath(); ctx.moveTo(isoX(a.x, y0), isoY(a.x, y0)); ctx.lineTo(isoX(a.x + a.w, y0), isoY(a.x + a.w, y0)); ctx.lineTo(isoX(a.x + a.w, y1), isoY(a.x + a.w, y1)); ctx.lineTo(isoX(a.x, y1), isoY(a.x, y1)); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      } });
      later(w, 1, () => {
        if (!live(R)) return;
        for (const c of w.hostiles(R.m.team, a.cx, a.cy, 40)) { const r = Math.floor((c.y - a.y) / bandH); if (r !== s) hit(R.m, c, R.m.dmg * 0.9, 'holy', { crit: false }); }
        for (let r = 0; r < rows; r++) if (r !== s) for (let x = a.x + 2; x < a.x + a.w; x += 3) burst(x, a.y + bandH * (r + 0.5), 4, 'holy', 3, 2);
        sfx('thud', 0.5);
      });
    });
    safe = clamp(safe + (chance(0.5) ? 1 : -1), 0, rows - 1);
  }
  UI.centerMsg('DANSE MACABRE', 'Follow the dark row!', 2);
  sfx('boss');
});
sig('organ_pipes', 'Organ Pipes', (R) => {
  const w = R.m.world;
  for (let i = 0; i < 4; i++) {
    const [x, y] = randFloor(R, 3);
    add(R, x, y, { name: 'Organ Pipe', static: true, ai: 'ward', hp: 0.025, sprite: 'totem', arch: 'golem', artH: 50, priority: 4, swap: { tint: [200, 170, 120, 0.5] },
      tick(c, dt) {
        c.steam = (c.steam ?? rand(1, 2.5)) - dt;
        const p = hero(R);
        if (c.steam <= 0 && p) { c.steam = 2.8; line(R, c.x, c.y, angleTo(c.x, c.y, p.x, p.y), 10, 0.55, 0.7, 0.9, '#f0e0c0'); }
      },
    });
  }
  sfx('summon');
});
sig('dissonance', 'Dissonance', (R) => {
  const p = hero(R), w = R.m.world, dur = 4.5;
  if (!p) return;
  w.addHazard({ t: 0, world: w,
    autoGoal() { // carry it away from the hero's pets and the boss
      const m = R.m, a = angleTo(m.x, m.y, p.x, p.y);
      return { x: clamp(m.x + Math.cos(a) * 9, A(R).x + 2, A(R).x + A(R).w - 2), y: clamp(m.y + Math.sin(a) * 9, A(R).y + 2, A(R).y + A(R).h - 2), r: 1.5 };
    },
    update(dt) {
      if (!live(R)) return false;
      this.t += dt;
      if (chance(dt * 12)) addEffect(new Ring(p.x, p.y, 0.3, 3, 0.4, '#ff60ff', 2));
      if (this.t < dur) return true;
      for (const c of w.creatures) if (!c.dead && c.team === p.team && dist(c.x, c.y, p.x, p.y) < 3) hit(R.m, c, R.m.dmg * (c === p ? 1.2 : 2.5), 'holy', { force: true, crit: false });
      explosionFx(p.x, p.y, 3, 'holy', 'nova', { shake: 8 });
      return false;
    }, draw() {} });
  floatText(p.x, p.y, 80, 'DISSONANCE', '#ff60ff', 14);
  sfx('arcane');
});

// ---- 18 Bloodqueen Saranthe — BLOOD THRALLS (heal tethers) + CRIMSON CRESCENT + HEMORRHAGE (stand still)
sig('thralls', 'Blood Thralls', (R) => {
  const m = R.m;
  for (let i = 0; i < 2 + (R.pi >= 2 ? 1 : 0); i++) {
    const [x, y] = randFloor(R, 3);
    add(R, x, y, { name: 'Blood Thrall', ai: 'melee', hp: 0.03, dmg: 0.45, sprite: 'ghoul', arch: 'ghoul', artH: 48, priority: 7, gore: 'blood',
      tick(c, dt) {
        m.heal(m.maxHp * 0.012 * dt);
        if ((c.beam = (c.beam || 0) - dt) <= 0) { c.beam = 0.1; addEffect(new Bolt(c.x, c.y, 30, m.x, m.y, 70, '#ff2030', 0.1, 3)); }
        const p = hero(R); if (p) c.moveToward(p.x, p.y, dt, 1.4);
      },
    });
  }
  UI.log('Blood Thralls feed the Bloodqueen — kill them!', '#ff8080');
  sfx('summon');
});
sig('crimson_crescent', 'Crimson Crescent', (R) => {
  const m = R.m;
  for (let k = 0; k < 2; k++) mover(R, { x: m.x, y: m.y, ang: rand(TAU), speed: 5, dur: 5, r: 0.9, color: '#ff2040', teeth: 3, spin: 14, mul: 0.9, el: 'fire' });
  sfx('swing');
});
sig('hemorrhage', 'Hemorrhage', (R) => {
  const p = hero(R), w = R.m.world, dur = 4;
  if (!p) return;
  let lx = p.x, ly = p.y;
  w.addHazard({ t: 0, autoStill: true, update(dt) {
    if (!live(R)) return false;
    this.t += dt;
    const moved = dist(lx, ly, p.x, p.y); lx = p.x; ly = p.y;
    if (moved > 0.01) { hit(R.m, p, p.maxHp * moved * 0.06, 'phys', { force: true, crit: false, dot: true }); if (chance(0.4)) burst(p.x, p.y, 20, 'blood', 3, 2); }
    return this.t < dur;
  }, draw() {} });
  floatText(p.x, p.y, 80, 'HEMORRHAGE — STAND STILL', '#ff4040', 13);
  sfx('blood');
});

// ---- 19 Kragmaul the Hellforged — WRECKING CHARGE (into a pillar) + HOOKS + HELLFIRE GRID
sig('wrecking_charge', 'Wrecking Charge', (R, t) => {
  const m = R.m, w = m.world, wind = 2.6;
  w.addHazard({ t: 0, world: w,
    safeAt: (x, y) => !w.map.los(m.x, m.y, x, y),
    update(dt) {
      if (!live(R)) return false;
      this.t += dt;
      const p = hero(R);
      if (p) { m.face(angleTo(m.x, m.y, p.x, p.y)); if (chance(dt * 20)) smoke(m.x, m.y, 0, '#301008', 2, 10); }
      if (this.t < wind || !p) return true;
      const ang = angleTo(m.x, m.y, p.x, p.y), L = w.map.rayLength(m.x, m.y, ang, 30), D = dist(m.x, m.y, p.x, p.y), stop = Math.min(L - 1, D + 1.5);
      const sx = m.x, sy = m.y;
      for (const c of lineTargets(w, m.team, sx, sy, sx + Math.cos(ang) * stop, sy + Math.sin(ang) * stop, 1)) hit(m, c, m.dmg * 2.6, 'fire', { knock: 2.5, ang });
      const [nx, ny] = w.map.nudge(sx + Math.cos(ang) * stop, sy + Math.sin(ang) * stop, 1);
      m.x = nx; m.y = ny; m.nav = null;
      addEffect(new Beam(sx, sy, nx, ny, '#ff6020', 30, 0.4, { z: 20 }));
      if (L - 1 < D) { // it hit the stone first
        m.status.stun = { t: 4 }; m.dazed = 4; say(R, 'STUNNED — STRIKE NOW', '#ffe060'); explosionFx(nx, ny, 2.5, 'fire', 'eruption', { shake: 14 });
      } else explosionFx(nx, ny, 1.5, 'fire', 'explosion');
      return false;
    }, draw() {} });
  UI.centerMsg('WRECKING CHARGE', 'Put a pillar between you!', 2.2);
  sfx('roar');
});
sig('hooks', 'Brimstone Hooks', (R, t) => {
  const m = R.m, w = m.world;
  const pr = w.addHazard(new Projectile({ world: w, src: m, x: m.x, y: m.y, z: 40, ang: angleTo(m.x, m.y, t.x, t.y), speed: 10, range: 12, fx: 'fireball', el: 'fire', dmg: dmgOf(R, 0.6), size: 1.4 }));
  const strike = pr.onHit.bind(pr);
  pr.onHit = (c) => {
    strike(c);
    if (c.static || !live(R)) return;
    const a = angleTo(c.x, c.y, m.x, m.y), d = Math.max(0, dist(c.x, c.y, m.x, m.y) - 2);
    c.kbx = Math.cos(a) * d * 3; c.kby = Math.sin(a) * d * 3;
    addEffect(new Beam(m.x, m.y, c.x, c.y, '#ff6020', 6, 0.5, { z: 30 }));
    blast(R, m.x, m.y, 2.6, 1.1, 1.8, { el: 'fire', fx: 'eruption' });
  };
  sfx('swing');
});
sig('hellfire_grid', 'Hellfire Grid', (R) => {
  const a = A(R), order = [0, 2, 6, 8, 1, 3, 5, 7, 4];
  order.forEach((cell, i) => {
    const gx = cell % 3, gy = Math.floor(cell / 3), x = a.x + a.w * (gx + 0.5) / 3, y = a.y + a.h * (gy + 0.5) / 3;
    blast(R, x, y, Math.min(a.w, a.h) / 6.2, 1.2 + i * 0.35, 1.7, { el: 'fire', fx: 'eruption' });
  });
  sfx('fire'); sfx('boss');
});

// ---- 20 Pharaoh Sekhmun — CURSE OF EXCHANGE (swap places) + SCARAB CARPET + SARCOPHAGI
sig('exchange', 'Curse of Exchange', (R) => {
  const m = R.m, p = hero(R), w = m.world;
  if (!p) return;
  tele({ kind: 'circle', x: m.x, y: m.y, r: 2.4, dur: 1.4, color: '#e0c060' });
  tele({ kind: 'circle', x: p.x, y: p.y, r: 1.2, dur: 1.4, color: '#e0c060' });
  later(w, 1.4, () => {
    if (!live(R) || p.dead) return;
    const [mx, my] = [m.x, m.y], [px, py] = w.map.nudge(mx, my, p.r || 0.35), [bx, by] = w.map.nudge(p.x, p.y, 1);
    addEffect(new Bolt(mx, my, 60, p.x, p.y, 30, '#ffe080', 0.4, 5));
    p.x = px; p.y = py; m.x = bx; m.y = by; m.nav = null;
    explosionFx(bx, by, 2.4, 'holy', 'nova'); for (const c of w.hostiles(m.team, bx, by, 2.4)) hit(m, c, m.dmg * 1.6, 'holy', { knock: 1 });
    camera.follow(p.x, p.y, 0, true);
  });
  say(R, 'EXCHANGE', '#e0c060');
  sfx('portal');
});
sig('scarab_carpet', 'Scarab Carpet', (R) => {
  const a = A(R), w = R.m.world, alongX = chance(0.5), gap = rand(0.25, 0.75);
  const band = { t: 0, world: w, team: R.m.team, ground: true, pos: 0, hits: new Set(),
    gapAt() { return (alongX ? a.y + a.h * gap : a.x + a.w * gap); },
    danger(out) {
      const g = this.gapAt(), P = (alongX ? a.x : a.y) + this.pos, W = 1.6;
      if (alongX) { out.push({ line: true, x: P + 1.2, y: a.y, x1: P + 1.2, y1: g - 1.4, r: W }); out.push({ line: true, x: P + 1.2, y: g + 1.4, x1: P + 1.2, y1: a.y + a.h, r: W }); }
      else { out.push({ line: true, x: a.x, y: P + 1.2, x1: g - 1.4, y1: P + 1.2, r: W }); out.push({ line: true, x: g + 1.4, y: P + 1.2, x1: a.x + a.w, y1: P + 1.2, r: W }); }
    },
    update(dt) {
      if (!live(R)) return false;
      this.pos += 2.6 * dt;
      const g = this.gapAt(), P = (alongX ? a.x : a.y) + this.pos;
      for (const c of w.hostiles(R.m.team, a.cx, a.cy, 40)) {
        const along = alongX ? c.x : c.y, across = alongX ? c.y : c.x;
        if (Math.abs(along - P) < 0.8 && Math.abs(across - g) > 1.1 && !this.hits.has(c)) { this.hits.add(c); hit(R.m, c, R.m.dmg * 1.5, 'poison', { poison: true }); }
      }
      if (chance(dt * 40)) { const across = (alongX ? a.y : a.x) + rand(0, alongX ? a.h : a.w); if (Math.abs(across - g) > 1.1) spawn({ type: 'dot', x: alongX ? P : across, y: alongX ? across : P, z: 2, life: 0.6, size: 2.2, color: '#2a1a08' }); }
      return this.pos < (alongX ? a.w : a.h);
    },
    draw(ctx) {
      const g = this.gapAt(), P = (alongX ? a.x : a.y) + this.pos;
      ctx.save(); ctx.fillStyle = '#3a2810'; ctx.globalAlpha = 0.75;
      for (let s = 0; s < (alongX ? a.h : a.w); s += 0.45) {
        const across = (alongX ? a.y : a.x) + s; if (Math.abs(across - g) < 1.1) continue;
        for (let k = -0.6; k <= 0.6; k += 0.4) { const x = alongX ? P + k : across, y = alongX ? across : P + k; ctx.fillRect(isoX(x, y) - 3, isoY(x, y) - 3, 6, 4); }
      }
      ctx.restore();
    } };
  w.addHazard(band);
  sfx('acid');
});
sig('sarcophagi', 'Sarcophagus Trap', (R) => {
  const w = R.m.world, live1 = randi(0, 2);
  for (let i = 0; i < 3; i++) {
    const [x, y] = randFloor(R, 4);
    tele({ kind: 'circle', x, y, r: 2, dur: 2.2, color: '#e0c060' });
    later(w, 2.2, () => {
      if (!live(R)) return;
      if (i === live1) {
        const c = makeMonster(w, pick(R.tpl.adds), w.biome, R.m.level - 1, 'champion', x, y);
        c.awake = true; c.aggro = hero(R); c.raidAdd = true; c.name = 'Risen Royal Guard'; w.add(c); R.minions.push(c);
        smoke(x, y, 0, '#2a2010', 10, 14);
      } else { explosionFx(x, y, 2, 'holy', 'eruption'); for (const h of w.hostiles(R.m.team, x, y, 2)) hit(R.m, h, R.m.dmg * 1.6, 'poison', { poison: true }); }
    });
  }
  sfx('thud');
});

// ======================================================================================== passives (fight-long rules)
export const PASSIVES = {
  // Vexis: polarity — red or blue each 14 s; the arena's halves are coloured; the wrong half burns, the right one empowers
  vexis(R, dt) {
    const a = A(R), p = hero(R), w = R.m.world;
    if (!p) return;
    if (!R.pol || (R.polT -= dt) <= 0) {
      R.polT = 14; R.pol = chance(0.5) ? 1 : -1; R.polSplit = chance(0.5);
      floatText(p.x, p.y, 90, R.pol > 0 ? 'POSITIVE CHARGE' : 'NEGATIVE CHARGE', R.pol > 0 ? '#ff5050' : '#5080ff', 15);
      if (!R.polZone) R.polZone = w.addHazard({ ground: true, t: 0,
        half: (x, y) => (R.polSplit ? x < a.cx : y < a.cy) ? 1 : -1,
        autoGoal() { const s = R.pol; const off = 5.5 * (R.polSplit ? 1 : 0), offy = 5 * (R.polSplit ? 0 : 1); return { x: a.cx + (s > 0 ? -off : off), y: a.cy + (s > 0 ? -offy : offy), r: 3.5 }; },
        update(dt2) { this.t += dt2; return live(R); },
        draw(ctx) {
          ctx.save(); ctx.globalAlpha = 0.08 + Math.sin(this.t * 3) * 0.02;
          for (const s of [1, -1]) {
            ctx.fillStyle = s > 0 ? '#ff3030' : '#3060ff';
            const [x0, y0, x1, y1] = R.polSplit ? (s > 0 ? [a.x, a.y, a.cx, a.y + a.h] : [a.cx, a.y, a.x + a.w, a.y + a.h]) : (s > 0 ? [a.x, a.y, a.x + a.w, a.cy] : [a.x, a.cy, a.x + a.w, a.y + a.h]);
            ctx.beginPath(); ctx.moveTo(isoX(x0, y0), isoY(x0, y0)); ctx.lineTo(isoX(x1, y0), isoY(x1, y0)); ctx.lineTo(isoX(x1, y1), isoY(x1, y1)); ctx.lineTo(isoX(x0, y1), isoY(x0, y1)); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        } });
    }
    const mine = R.polZone.half(p.x, p.y) === R.pol;
    p.raidDmgMul = mine ? 1.3 : 1;
    if (!mine && (R.polHurt = (R.polHurt || 0) - dt) <= 0) { R.polHurt = 0.5; hit(R.m, p, p.maxHp * 0.05, 'light', { force: true, crit: false, dot: true }); }
    if (chance(dt * 6)) spawn({ type: 'glow', x: p.x, y: p.y, z: 60, vz: 10, life: 0.5, size: 3, size1: 0, color: R.pol > 0 ? '#ff5050' : '#5080ff', add: true });
  },
  // Ser Leonis: every blow he lands sunders; at five stacks, break his line of sight to shake them off
  leonis(R, dt) {
    const p = hero(R), m = R.m, w = m.world;
    if (!p) return;
    if (!R.sunderHooked) {
      R.sunderHooked = true;
      const deal = m.deal.bind(m);
      m.deal = (c, amt, el, o) => { const r = deal(c, amt, el, o); if (c === p && o && o.melee) { R.sunder = Math.min(8, (R.sunder || 0) + 1); floatText(p.x, p.y, 70, 'SUNDERED ×' + R.sunder, '#c0c8ff', 12); } return r; };
    }
    p.raidTakenMul = 1 + 0.1 * (R.sunder || 0);
    if ((R.sunder || 0) >= 4) {
      if (!R.sunderCover || R.sunderCover.dead) R.sunderCover = w.addHazard({ t: 0, safeAt: (x, y) => !w.map.los(m.x, m.y, x, y), update() { return live(R) && (R.sunder || 0) >= 4; }, draw() {} });
      if (!w.map.los(m.x, m.y, p.x, p.y)) { R.hidT = (R.hidT || 0) + dt; if (R.hidT > 2) { R.sunder = 0; R.hidT = 0; floatText(p.x, p.y, 70, 'SUNDER CLEARED', '#a0ffa0', 13); } }
      else R.hidT = 0;
    }
  },
  // Nyx: lunar tide — the inner circle or the outer ring floods, alternating every 9 s
  nyx(R, dt) {
    const a = A(R), w = R.m.world;
    if ((R.tideT = (R.tideT ?? 6) - dt) > 0) return;
    R.tideT = 9;
    const inner = (R.tideIn = !R.tideIn), dur = 3.2;
    w.addHazard({ t: 0, ground: true,
      danger(out) { if (inner) out.push({ x: a.cx, y: a.cy, r: 6.3 }); else out.push({ ring: true, x: a.cx, y: a.cy, r0: 8.3, r1: 40, gap: 0, gapW: 0 }); },
      autoGoal() { return { x: a.cx + (inner ? 7.3 : 0), y: a.cy, r: inner ? 0.6 : 4 }; },
      update(dt2) {
        if (!live(R)) return false;
        this.t += dt2;
        if (this.t > 1.6 && (this.hurt = (this.hurt || 0) - dt2) <= 0) {
          this.hurt = 0.4;
          for (const c of w.hostiles(R.m.team, a.cx, a.cy, 40)) { const d = dist(c.x, c.y, a.cx, a.cy); if (inner ? d < 6 : d > 8.6) hit(R.m, c, c.maxHp * 0.06, 'cold', { force: true, crit: false, dot: true }); }
        }
        return this.t < dur;
      },
      draw(ctx) {
        const k = this.t < 1.6 ? 0.25 : 0.5, px = isoX(a.cx, a.cy), py = isoY(a.cx, a.cy);
        ctx.save(); ctx.globalAlpha = k * 0.6; ctx.fillStyle = '#6080ff'; ctx.strokeStyle = '#a0c0ff'; ctx.lineWidth = 3;
        if (inner) { ctx.beginPath(); ctx.ellipse(px, py, 6 * HW * 1.41, 6 * HH * 1.41, 0, 0, TAU); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(px, py, 30 * HW, 30 * HH, 0, 0, TAU); ctx.ellipse(px, py, 8.6 * HW * 1.41, 8.6 * HH * 1.41, 0, 0, TAU); ctx.fill('evenodd'); }
        ctx.restore();
      } });
    UI.centerMsg(inner ? 'HIGH TIDE — CENTER' : 'HIGH TIDE — EDGES', inner ? 'Leave the middle!' : 'Get to the middle!', 1.6);
  },
  // Kaela: static — standing still builds charge; at 8 stacks the sky answers
  kaela(R, dt) {
    const p = hero(R), w = R.m.world;
    if (!p) return;
    if (!R.staticMark) R.staticMark = w.addHazard({ autoMove: true, update() { return live(R); }, draw() {} });
    const moved = dist(R.sx ?? p.x, R.sy ?? p.y, p.x, p.y) > 0.02; R.sx = p.x; R.sy = p.y;
    R.static = clamp((R.static || 0) + (moved ? -1.2 : 2) * dt, 0, 8);
    if (R.static >= 8) { R.static = 0; addEffect(new Bolt(p.x, p.y, 300, p.x, p.y, 0, '#ffffff', 0.4, 8)); hit(R.m, p, p.maxHp * 0.4, 'light', { force: true, crit: false, stun: 1 }); explosionFx(p.x, p.y, 1.6, 'light', 'nova'); G.flash = 0.4; }
    else if (R.static > 4 && chance(dt * 10)) addEffect(new Bolt(p.x + rand(-0.5, 0.5), p.y + rand(-0.5, 0.5), 30, p.x, p.y, 70, '#a0c0ff', 0.1, 2));
  },
  // Hollowmere: deep chill — frost stacks build; braziers thaw; at 10 the hero freezes solid
  hollowmere(R, dt) {
    const p = hero(R);
    if (!p) return;
    const bz = (R.braziers || []).filter((z) => !z.dead && z.t < z.dur);
    const warm = bz.some((z) => z.inside(p));
    R.chill = clamp((R.chill || 0) + (warm ? -3 : 0.32) * dt, 0, 10);
    for (const z of bz) z.goal = R.chill > 5 ? true : false;
    if (R.chill > 3) p.status.chill = { t: 0.3, amt: Math.min(0.5, R.chill * 0.05) };
    if (R.chill >= 10) { R.chill = 6; p.status.freeze = { t: 1.5 }; hit(R.m, p, p.maxHp * 0.25, 'cold', { force: true, crit: false }); floatText(p.x, p.y, 80, 'FROZEN SOLID', '#a0e0ff', 15); }
    if (!bz.length && R.chill > 4 && !R.bzPending) { R.bzPending = true; later(R.m.world, 0.5, () => { R.bzPending = false; live(R) && SIGS.braziers(R); }); }
  },
};

/** Raid-wide hero damage multipliers set by passives (Vexis polarity, Leonis sunder). */
export function raidHeroMul(p, taken) { return taken ? (p.raidTakenMul || 1) : (p.raidDmgMul || 1); }
