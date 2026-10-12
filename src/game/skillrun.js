// Executes a skill: turns the declarative spec into hazards, buffs, curses and minions.
import { G } from '../state.js';
import { rand, chance, TAU, DEG, clamp, angleTo, dist, pick, randi } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Slash, Ring, Bolt, Column, Beam, burst, spawn, smoke, sparkle, elem, floatText, gibs, bloodSpray, addDecal } from '../gfx/vfx.js';
import { camera } from '../core/view.js';
import { GroundItem } from './loot.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit, aoe, chainHit } from './combat.js';
import { Projectile, Delayed, Area, makeWall, Orbit, Whirl, Leap, Dash, NovaWave, BeamCh, Trap, Rain, Fissure, AuraFx, explode, coneTargets } from './hazards.js';
import { buffAmount, curseAmount, skillDuration } from '../data/skills.js';
import { createSummon } from './monster.js';

const roll = (d) => rand(d[0], d[1]);

export class Timer {
  constructor(delay, fn) { this.t = delay; this.fn = fn; }
  update(dt) { this.t -= dt; if (this.t <= 0) { this.fn(); return false; } return true; }
  draw() {}
}
const later = (w, delay, fn) => (delay <= 0 ? fn() : w.addHazard(new Timer(delay, fn)));

function statusOpts(m) {
  const o = {};
  for (const k of ['burn', 'poison', 'bleed', 'slow', 'freeze', 'stun', 'fear', 'knock', 'leech', 'pull']) if (m[k]) o[k] = m[k];
  if (m.curse && !['curse'].includes(m.kind)) o.curse = m.curse;
  return o;
}

/** Clamp a target point to max range from the caster and onto walkable floor. */
function clampTarget(w, p, tx, ty, range) {
  const a = angleTo(p.x, p.y, tx, ty);
  let d = Math.min(range, dist(p.x, p.y, tx, ty));
  let x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
  while (d > 0 && !w.map.isFloor(x, y)) { d -= 0.25; x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d; }
  return [x, y];
}

/**
 * Cast `sk` at level L from player p toward (tx,ty).
 * Returns false if the skill could not be used (e.g. no corpses).
 */
export function castSkill(p, sk, L, tx, ty, opts = {}) {
  const w = p.world, m = sk.m, st = p.st;
  const el = sk.el, fx = sk.fx, E = elem(el);
  const dmg = p.skillDamage(sk, L);
  const area = 1 + (st.areaPct || 0) / 100;
  const ang = angleTo(p.x, p.y, tx, ty);
  const o = statusOpts(m);
  p.face(ang);

  switch (sk.kind) {
    case 'melee': {
      const range = 1.5 * (m.range ?? 1) * (fx === 'thrust' ? 1.15 : 1) * (m.r ?? 1);
      const arc = (m.arc ?? (m.cleave ? 170 : fx === 'thrust' ? 36 : fx === 'spin' ? 360 : 115)) * DEG;
      const strikes = m.n || 1;
      for (let i = 0; i < strikes; i++) {
        later(w, i * 0.085, () => {
          if (p.dead) return;
          const a = p.aim ? angleTo(p.x, p.y, p.aim[0], p.aim[1]) : ang;
          const targets = arc >= TAU * 0.95 ? w.hostiles(p.team, p.x, p.y, range) : coneTargets(w, p.team, p.x, p.y, a, range + 0.25, arc / 2);
          for (const t of targets) {
            hit(p, t, roll(dmg), el, { ...o, ang: a, melee: true });
            if (m.gold && chance(0.25)) w.addLoot(new GroundItem(t.x, t.y, 'gold', { amount: Math.round((2 + t.level * 2) * (1 + st.goldFind / 100)) }));
          }
          if (m.chain && targets[0]) chainHit(w, p, targets[0].x, targets[0].y, w.hostiles(p.team, targets[0].x, targets[0].y, 5).find((c) => c !== targets[0]), m.chain, roll(dmg) * 0.6, el, E.glow);
          const fxX = p.x + Math.cos(a) * range * 0.6, fxY = p.y + Math.sin(a) * range * 0.6;
          if (m.exp) explode(w, p, targets[0] ? targets[0].x : fxX, targets[0] ? targets[0].y : fxY, 1.2 * (m.r ?? 1) * area, dmg.map((v) => v * 0.6), el, o, el === 'fire' ? 'explosion' : 'eruption');
          meleeFx(p, a, range, arc, fx, E, i);
          p.lunge = 1;
          sfx(targets.length ? (el === 'phys' ? 'swing' : E.sfx) : 'swing', 0.8);
        });
      }
      break;
    }
    case 'proj': {
      const n = Math.max(1, (m.n || 1) + Math.floor(st.extraProj || 0));
      const spread = (m.spread ?? (n > 1 ? Math.min(80, 10 + n * 5) : 0)) * DEG;
      const speed = 9 * (m.spd ?? 1) * (1 + (st.projSpeed || 0) / 100) * (fx === 'bullet' ? 1.4 : fx === 'arrow' ? 1.25 : 1);
      const range = 10 * (m.range ?? 1);
      for (let i = 0; i < n; i++) {
        const a = m.ring ? ang + (i / n) * TAU : m.rand ? ang + rand(-spread / 2 - 0.1, spread / 2 + 0.1) : ang + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
        const delay = m.rand ? i * 0.035 : 0;
        later(w, delay, () => {
          if (p.dead) return;
          w.addHazard(new Projectile({
            world: w, src: p, x: p.x + Math.cos(a) * 0.3, y: p.y + Math.sin(a) * 0.3, ang: a, speed, range, fx, el, dmg, o,
            pierce: (m.pierce ? 99 : 0) + Math.floor(st.pierce || 0), bounce: (m.bounce || 0) + (m.bounce ? Math.floor(st.chainPlus || 0) : 0),
            home: m.home || st.homing ? 1 : 0, split: m.split || chance((st.splitChance || 0) / 100), ret: m.ret, lob: m.lob,
            tx: tx + (m.lob && n > 1 ? rand(-1, 1) : 0), ty: ty + (m.lob && n > 1 ? rand(-1, 1) : 0),
            exp: m.exp ? 1.1 * (m.r ?? 1) * area : 0, chain: m.chain ? m.chain + Math.floor(st.chainPlus || 0) : 0,
            spray: m.spray, pull: m.pull, size: (m.r ?? 1), r: 0.3 * (m.r ?? 1), dur: m.dur, light: el !== 'phys',
          }));
        });
      }
      sfx(fx === 'arrow' || fx === 'javelin' ? 'bow' : fx === 'bullet' || fx === 'rocket' ? 'shoot' : fx === 'note' ? 'note' : fx === 'rang' || fx === 'blade' || fx === 'axe' ? 'swing' : E.sfx, 0.7);
      p.lunge = 0.6;
      break;
    }
    case 'nova': {
      const n = m.n || 1;
      for (let i = 0; i < n; i++) later(w, i * 0.28, () => { if (!p.dead) w.addHazard(new NovaWave({ world: w, src: p, x: p.x, y: p.y, r: 3 * (m.r ?? 1) * area, dmg, el, fx, o, heal: m.heal, pullIn: m.pull })); });
      if (m.pull) sfx('shadow');
      break;
    }
    case 'aoe': {
      const [x, y] = clampTarget(w, p, tx, ty, 10);
      const r = 1.6 * (m.r ?? 1) * area;
      if (m.n && m.dur) {
        for (let i = 0; i < m.n; i++) {
          later(w, (i / m.n) * m.dur, () => {
            const a = rand(TAU), d = rand(0, r * 1.4);
            const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d;
            if (w.map.isFloor(ex, ey)) explode(w, p, ex, ey, r * 0.85, dmg, el, { ...o, sound: true }, fx);
          });
        }
      } else if (m.dur) {
        const ar = w.addHazard(new Area({ world: w, src: p, x, y, r, dur: m.dur, tick: 0.3, dmg: dmg.map((v) => v * 0.4), el, fx: fx === 'blizzard' ? 'frost' : fx === 'void' ? 'void' : 'earth', o, pullIn: m.pull }));
        ar.onTick = () => {
          // falling shards / quakes as flavour
          for (let i = 0; i < 3; i++) {
            const a = rand(TAU), d = Math.sqrt(Math.random()) * r;
            const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d;
            if (fx === 'blizzard') spawn({ type: 'shard', x: ex - 0.6, y: ey - 0.6, z: 160, vx: 2, vy: 2, vz: -320, g: 0, life: 0.5, size: 3.5, color: '#d8f4ff', rot: 0.7 });
            else burst(ex, ey, 0, el, 3, 1.4, { up: 2 });
          }
          if (fx !== 'blizzard') camera.shake(2);
        };
        if (m.pull) later(w, m.dur, () => explode(w, p, x, y, r, dmg.map((v) => v * 2), el, o, 'void'));
      } else if (fx === 'meteor' || fx === 'nuke' || m.delay) {
        w.addHazard(new Delayed({ world: w, src: p, x, y, r, delay: m.delay ?? 0.85, fx: fx === 'meteor' ? 'meteor' : fx, el, dmg, o }));
        if (fx === 'nuke') sfx('boss');
      } else {
        explode(w, p, x, y, r, dmg, el, o, fx);
      }
      break;
    }
    case 'beam': {
      const len = 8 * (m.range ?? 1) * (m.cone ? 0.55 : 1);
      const channel = (m.dur || 0) > 0;
      w.addHazard(new BeamCh({ world: w, src: p, ang, len, dur: m.dur || 0, cone: m.cone, fx, el, dmg: channel ? dmg.map((v) => v * 0.32) : dmg, o: { ...o, leech: m.leech }, n: m.n || 1 }));
      break;
    }
    case 'chain': {
      const first = w.nearestHostile(p.team, tx, ty, 3, false) || w.nearestHostile(p.team, p.x, p.y, 7, true);
      if (first) chainHit(w, p, p.x, p.y, first, (m.n || 4) + Math.floor(st.chainPlus || 0), roll(dmg), el, E.glow, { ...o, leech: m.leech });
      else addEffect(new Bolt(p.x, p.y, 28, tx, ty, 10, E.glow, 0.25, 2.5));
      sfx(el === 'light' ? 'light' : E.sfx);
      break;
    }
    case 'wall': {
      const [x, y] = m.ring ? [p.x, p.y] : clampTarget(w, p, tx, ty, 7);
      makeWall(w, p, x, y, ang, 4.5 * (m.len ?? 1) * area, { dur: m.dur || 5, dmg: dmg, el, fx, block: m.block, slow: m.slow, ring: m.ring ? 2.6 * area : 0, o });
      sfx(el === 'fire' ? 'fire' : E.sfx);
      break;
    }
    case 'zone': {
      const [x, y] = m.follow ? [p.x, p.y] : clampTarget(w, p, tx, ty, 9);
      w.addHazard(new Area({ world: w, src: p, x, y, r: 1.8 * (m.r ?? 1) * area, dur: m.dur || 5, tick: 0.5, dmg, el, fx, follow: m.follow ? p : null, heal: m.heal, slow: m.slow, o, freezeZone: m.freeze }));
      sfx(E.sfx);
      break;
    }
    case 'orbit': {
      const extra = ['blade', 'hammer', 'axe', 'rang', 'orb', 'bone', 'shard', 'feather'].includes(fx) ? Math.floor(st.extraProj || 0) : 0;
      w.addHazard(new Orbit({ world: w, src: p, n: (m.n || 3) + extra, radius: 1.6 * (m.r ?? 1) * area, dur: m.dur || 4, spiral: m.spiral, fx, el, dmg, o, speed: m.spiral ? 5 : 4.2 }));
      sfx('swing');
      break;
    }
    case 'cyclone': {
      const n = m.n || 1;
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * 1.2 : 0);
        w.addHazard(new Area({ mode: 'cyclone', world: w, src: p, x: p.x + Math.cos(a) * 0.8, y: p.y + Math.sin(a) * 0.8, vx: Math.cos(a), vy: Math.sin(a), r: 0.95 * (m.r ?? 1) * area, dur: m.dur || 3.5, tick: 0.25, dmg, el, fx, o, speed: 2.6 * (m.spd ?? 1) }));
      }
      sfx('swing'); sfx(E.sfx, 0.5);
      break;
    }
    case 'whirl':
      w.addHazard(new Whirl({ world: w, src: p, tx, ty, dur: m.dur || 2, r: 1.35 * (m.r ?? 1) * area, dmg, el, fx, o }));
      break;
    case 'leap': {
      const [x, y] = clampTarget(w, p, tx, ty, 6.5 * (m.range ?? 1));
      w.addHazard(new Leap({ world: w, src: p, tx: x, ty: y, r: 1.6 * (m.r ?? 1) * area, dmg, el, fx, o, nova: m.nova }));
      sfx('swing');
      break;
    }
    case 'dash':
      w.addHazard(new Dash({ world: w, src: p, ang, len: Math.min(5 * (m.range ?? 1), Math.max(2, dist(p.x, p.y, tx, ty) + 0.5)), dmg, el, fx, o, n: m.n || 1, exp: m.exp }));
      sfx('swing');
      break;
    case 'blink': {
      const [x, y] = clampTarget(w, p, tx, ty, 6.5 * (m.range ?? 1));
      smoke(p.x, p.y, 10, fx === 'smoke' || fx === 'shadow' ? '#201820' : E.dark, 6, 8);
      sparkle(p.x, p.y, 20, E.glow, 10, 0.4);
      if (fx === 'lightning') addEffect(new Bolt(p.x, p.y, 20, x, y, 20, E.glow, 0.25, 3));
      p.x = x; p.y = y; p.path = null; p.moveTarget = null;
      sparkle(x, y, 20, E.glow, 14, 0.5);
      addEffect(new Ring(x, y, 0.1, 1.2, 0.3, E.glow, 3));
      if (m.nova) w.addHazard(new NovaWave({ world: w, src: p, x, y, r: 2.2 * area, dmg, el, fx: fx === 'feather' ? 'crow' : fx, o }));
      sfx('portal', 0.5);
      break;
    }
    case 'summon':
      return summonCast(p, sk, L, tx, ty, dmg);
    case 'buff': {
      const amt = buffAmount(sk, L), dur = skillDuration(sk, L);
      const stats = {};
      for (const b of m.buff || ['dmg']) stats[b] = amt;
      const buff = p.addBuff({ id: sk.id, name: sk.name, el, fx, stats, t: dur, max: dur, pulse: m.pulse ? { dmg, acc: 0 } : null, transform: m.transform, slowPulse: m.slow });
      if (m.party) for (const c of w.creatures) if (c.summon && c.owner === p && !c.dead) c.partyBuff = { stats, t: dur };
      w.addHazard(new AuraFx({ world: w, src: p, el, buff, transform: m.transform }));
      burst(p.x, p.y, 20, el, 24, 3, { up: 1.5 });
      addEffect(new Ring(p.x, p.y, 0.2, 1.6, 0.5, E.glow, 4));
      if (m.transform) { addEffect(new Column(p.x, p.y, E.glow, 0.6, 30, 200)); sfx('roar'); }
      sfx(fx === 'shout' ? 'roar' : fx === 'note' ? 'note' : 'buff');
      break;
    }
    case 'curse': {
      const self = m.at === 'self';
      const [x, y] = self ? [p.x, p.y] : clampTarget(w, p, tx, ty, 9);
      const r = 2.2 * (m.r ?? 1) * area;
      const amt = curseAmount(sk, L), dur = skillDuration(sk, L);
      const targets = w.hostiles(p.team, x, y, r);
      for (const t of targets) for (const c of m.curse || ['amp']) applyCurse(p, t, c, amt, m.dur && ['stun', 'freeze'].includes(c) ? m.dur : dur, dmg, area);
      addEffect(new Ring(x, y, 0.2, r, 0.6, E.glow, 3, { fill: true }));
      sigil(x, y, r, E);
      if (fx === 'shout') { addEffect(new Ring(x, y, 0.1, r * 1.2, 0.4, '#ffffff', 3)); sfx('roar'); }
      else if (fx === 'flash') { G.flash = 0.35; sfx('explode', 0.5); }
      else if (fx === 'smoke') smoke(x, y, 6, '#3a3640', 14, 16);
      else sfx(fx === 'note' ? 'note' : 'shadow');
      if (!targets.length && !self) floatText(x, y, 30, 'Cursed ground', E.glow, 11);
      break;
    }
    case 'heal': {
      const pct = (m.amt || 20) * (1 + 0.04 * (L - 1)) / 100;
      p.heal(p.maxHp * pct);
      if (m.party) for (const c of w.creatures) if (c.summon && c.owner === p && !c.dead) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * pct);
      addEffect(new Column(p.x, p.y, E.glow === '#e0d8c8' ? '#80ff80' : E.glow, 0.6, 26, 220));
      sparkle(p.x, p.y, 20, '#a0ffa0', 16, 0.5);
      sfx('heal');
      break;
    }
    case 'trap': {
      const [x, y] = clampTarget(w, p, tx, ty, 8);
      const n = m.n || 1;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(0.3), d = n > 1 ? 0.6 + Math.sqrt(i) * 0.55 * (m.r ?? 1) : 0;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (!w.map.isFloor(px, py)) continue;
        w.addHazard(new Trap({ world: w, src: p, x: px, y: py, fx, el, dmg, o, r: 1.5 * area, pull: m.pull }));
      }
      sfx('ui');
      break;
    }
    case 'rain': {
      const [x, y] = clampTarget(w, p, tx, ty, 10);
      w.addHazard(new Rain({ world: w, src: p, x, y, r: 2 * (m.r ?? 1) * area, n: (m.n || 12) + Math.floor((st.extraProj || 0) * 3), dur: m.dur || 1.2, fx, el, dmg, o }));
      addEffect(new Ring(x, y, 0.2, 2 * (m.r ?? 1) * area, 0.5, E.glow, 2));
      break;
    }
    case 'strike': {
      const n = m.n || 1;
      const [cx, cy] = clampTarget(w, p, tx, ty, 10);
      const pool = w.hostiles(p.team, cx, cy, 5 * (m.r ?? 1));
      for (let i = 0; i < n; i++) {
        later(w, i * 0.09, () => {
          let x, y;
          const t = pool.length ? pool[i % pool.length] : null;
          if (t && !t.dead) { x = t.x; y = t.y; } else { const a = rand(TAU), d = rand(0, 3); x = cx + Math.cos(a) * d; y = cy + Math.sin(a) * d; }
          if (!w.map.isFloor(x, y)) return;
          strikeFx(x, y, fx, E);
          aoe(w, p, x, y, 0.95 * area, roll(dmg), el, o);
        });
      }
      break;
    }
    case 'fissure': {
      const n = m.n || 1;
      const spread = (m.spread ?? 40) * DEG;
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
        w.addHazard(new Fissure({ world: w, src: p, x: p.x, y: p.y, ang: a, len: 7 * (m.range ?? 1), w: 0.85 * area, fx, el, dmg, o }));
      }
      sfx(fx === 'earth' ? 'thud' : E.sfx);
      break;
    }
    case 'corpse': {
      const r = 4 * (m.r ?? 1);
      const list = w.corpses.filter((c) => !c.used && dist(c.x, c.y, tx, ty) < r).sort((a, b) => dist(a.x, a.y, tx, ty) - dist(b.x, b.y, tx, ty)).slice(0, m.n || 3);
      if (!list.length) { floatText(p.x, p.y, 60, 'No corpses nearby', '#c0b0a0', 12); sfx('error'); return false; }
      list.forEach((c, i) => {
        c.used = true;
        later(w, i * 0.07, () => corpseFx(p, c, sk, dmg, el, fx, area, o));
      });
      break;
    }
    default:
      break;
  }
  // gem / legendary on-cast procs
  if (!opts.echo) {
    if (st.novaOnCast && chance(st.novaOnCast / 100)) w.addHazard(new NovaWave({ world: w, src: p, x: p.x, y: p.y, r: 2.4 * area, dmg: dmg.map((v) => v * 0.5), el, fx: 'nova', o: {} }));
    if (st.orbitOnCast && chance(st.orbitOnCast / 100)) w.addHazard(new Orbit({ world: w, src: p, n: 1, radius: 1.4, dur: 5, fx: 'orb', el, dmg: dmg.map((v) => v * 0.4), o: {} }));
  }
  return true;
}

export function applyCurse(src, t, c, amt, dur, dmg, area = 1) {
  if (t.dead) return;
  const boss = t.rank === 'boss';
  switch (c) {
    case 'amp': case 'weaken': case 'mark': t.curses[c] = { t: dur, amt: c === 'mark' ? amt * 1.5 : amt, src }; break;
    case 'slow': t.curses.slow = { t: dur, amt: Math.min(0.65, 0.3 + amt / 200), src }; break;
    case 'leech': t.curses.leech = { t: dur, amt: Math.max(4, amt / 3), src }; break;
    case 'thorns': t.curses.thorns = { t: dur, amt: Math.max(40, amt * 2), src }; break;
    case 'fear': if (!boss) t.status.fear = { t: Math.min(dur, 4) }; break;
    case 'stun': if (!boss || chance(0.25)) t.status.stun = { t: Math.min(dur, boss ? 0.6 : 3) }; break;
    case 'freeze': if (!boss) t.status.freeze = { t: 1.6 }; break;
    case 'confuse': if (!boss) t.curses.confuse = { t: dur, src }; break;
    case 'charm':
      if (!boss && t.rank !== 'unique') { t.curses.charm = { t: Math.min(dur, 10), src, team: t.team }; t.team = 'player'; t.aggro = null; }
      break;
    case 'decay': t.curses.decay = { t: dur, dps: rand(dmg[0], dmg[1]) * 0.8, src }; break;
    case 'bomb':
      t.curses.bomb = { t: 2.2, src, onExpire: (m) => explode(m.world, src, m.x, m.y, 1.8 * area, dmg.map((v) => v * 2.2), 'fire', {}, 'explosion') };
      break;
    case 'doom':
      t.curses.doom = { t: 3, src, onExpire: (m) => { addEffect(new Column(m.x, m.y, '#a020ff', 0.5, 30, 260)); hit(src, m, rand(dmg[0], dmg[1]) * 2.5, 'shadow', { force: true }); } };
      break;
    default: t.curses[c] = { t: dur, amt, src };
  }
}

function sigil(x, y, r, E) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    spawn({ type: 'glow', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: 2, vz: 30, life: 0.8, size: 3, size1: 0, color: E.glow, add: true });
  }
}

function strikeFx(x, y, fx, E) {
  switch (fx) {
    case 'lightning': case 'spirit': case 'crow':
      addEffect(new Bolt(x - 0.8, y - 0.8, 320, x, y, 0, E.glow, 0.3, 3.5));
      addEffect(new Ring(x, y, 0.1, 1, 0.3, E.glow, 3));
      burst(x, y, 4, 'light', 10, 2.5);
      sfx('light', 0.6);
      break;
    case 'meteor':
      explosionFx(x, y, 1.1, 'fire', 'meteor', { sound: chance(0.5), shakeMul: 0.4 });
      break;
    case 'spear':
      addEffect(new Column(x, y, E.glow, 0.35, 10, 260));
      burst(x, y, 4, 'holy', 8, 2);
      sfx('hit', 0.5);
      break;
    case 'laser':
      addEffect(new Column(x, y, '#ff3010', 0.55, 30, 340));
      explosionFx(x, y, 1.2, 'fire', 'explosion', { sound: true, shakeMul: 0.5 });
      break;
    default:
      addEffect(new Column(x, y, E.glow, 0.45, 24, 300));
      burst(x, y, 4, 'holy', 10, 2);
      sfx('holy', 0.5);
  }
  camera.shake(2);
}

function meleeFx(p, a, range, arc, fx, E, i) {
  const col = E.name === 'Physical' ? '#f0e8d8' : E.glow;
  switch (fx) {
    case 'smash': {
      const x = p.x + Math.cos(a) * range * 0.75, y = p.y + Math.sin(a) * range * 0.75;
      addEffect(new Ring(x, y, 0.1, 0.9, 0.25, col, 4));
      burst(x, y, 2, E.name === 'Physical' ? 'phys' : p.lastEl || 'phys', 8, 2.5, { up: 1.6 });
      smoke(x, y, 2, '#4a4038', 2, 6);
      addEffect(new Slash(p.x, p.y, a, 1.6, range * 0.7, 0.18, col, { width: 9, flip: i % 2 }));
      break;
    }
    case 'thrust': {
      const x = p.x + Math.cos(a) * range, y = p.y + Math.sin(a) * range;
      addEffect(new Beam(p.x, p.y, x, y, col, 5, 0.14, { z: 22, core: '#ffffff' }));
      break;
    }
    case 'claw': case 'bite':
      for (let k = -1; k <= 1; k++) addEffect(new Slash(p.x + Math.cos(a + 1.57) * k * 0.15, p.y + Math.sin(a + 1.57) * k * 0.15, a, 0.9, range * 0.8, 0.16, col, { width: 3 }));
      break;
    case 'spin':
      addEffect(new Slash(p.x, p.y, a, TAU, range, 0.3, col, { width: 10 }));
      addEffect(new Ring(p.x, p.y, 0.2, range, 0.25, col, 3));
      break;
    default:
      addEffect(new Slash(p.x, p.y, a, Math.min(TAU, arc + 0.3), range * 0.9, 0.2, col, { width: 11, flip: i % 2 }));
  }
}

function corpseFx(p, c, sk, dmg, el, fx, area, o) {
  const w = p.world;
  const base = rand(dmg[0], dmg[1]) + c.maxHp * 0.25;
  bloodSpray(c.x, c.y, 10, rand(TAU), 40, w.biome ? w.biome.blood : '#8a0b08', 1.6);
  gibs(c.x, c.y, 8, 12, '#7a1010', '#e8dcc0', 1.5);
  addDecal(c.x, c.y, w.biome ? w.biome.blood : '#8a0b08', 1.1, 'pool');
  switch (fx) {
    case 'bone':
      for (let i = 0; i < 8; i++) w.addHazard(new Projectile({ world: w, src: p, x: c.x, y: c.y, ang: (i / 8) * TAU, speed: 9, range: 6, fx: 'bone', el: 'phys', dmg: [base * 0.5, base * 0.6], pierce: 2 }));
      sfx('bones');
      break;
    case 'crow': case 'spirit':
      for (let i = 0; i < 4; i++) w.addHazard(new Projectile({ world: w, src: p, x: c.x, y: c.y, ang: rand(TAU), speed: 7, range: 9, fx, el, dmg: [base * 0.4, base * 0.5], home: 1 }));
      sfx(fx === 'crow' ? 'shadow' : 'arcane');
      break;
    default:
      explode(w, p, c.x, c.y, 1.9 * area, [base * 0.9, base * 1.1], el, o, el === 'poison' ? 'void' : 'explosion');
      sfx('gore');
  }
  if (sk.m.heal) p.heal(p.maxHp * 0.04);
}

function summonCast(p, sk, L, tx, ty, dmg) {
  const w = p.world, m = sk.m;
  const n = m.n || 1;
  const [x, y] = clampTarget(w, p, tx, ty, 4);
  if (m.sum === 'revive') {
    const list = w.corpses.filter((c) => !c.used && dist(c.x, c.y, tx, ty) < 5).slice(0, n);
    if (!list.length) { floatText(p.x, p.y, 60, 'No corpses nearby', '#c0b0a0', 12); sfx('error'); return false; }
    for (const c of list) { c.used = true; createSummon(p, sk, L, c.x, c.y, dmg, c); }
  } else {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const [sx, sy] = w.map.randomNear(x + Math.cos(a) * 0.6 * Math.min(1, n - 1), y + Math.sin(a) * 0.6 * Math.min(1, n - 1), 0.4);
      createSummon(p, sk, L, sx, sy, dmg);
    }
  }
  addEffect(new Ring(x, y, 0.1, 1.5, 0.5, elem(sk.el).glow, 4));
  sparkle(x, y, 10, elem(sk.el).glow, 14, 0.6);
  sfx('summon');
  return true;
}

export { pick, randi };
