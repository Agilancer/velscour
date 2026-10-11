// Monsters and minions: one AI for both teams.
import { G } from '../state.js';
import { rand, chance, TAU, clamp, angleTo, angleDiff, dist, pick, randi, shuffle } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Telegraph, Slash, Ring, Bolt, Column, burst, spawn, sparkle, elem, floatText, smoke, addLight } from '../gfx/vfx.js';
import { shiftPalette } from '../gfx/pixelart.js';
import { Creature } from './creature.js';
import { hit, aoe, chainHit } from './combat.js';
import { Projectile, Delayed, NovaWave, Area, explode, lineTargets, coneTargets } from './hazards.js';
import { ARCH, ELITE_AFFIXES, bossName, uniqueName } from '../data/enemies.js';
import { SUMMONS } from '../data/summons.js';

const PROJ_FX = { fire: 'fireball', cold: 'shard', light: 'spark', poison: 'blob', shadow: 'skull', arcane: 'orb', holy: 'bolt', blood: 'blob', acid: 'blob', phys: 'rock' };

export function monsterBase(level) {
  return {
    hp: 20 * Math.pow(1.066, level - 1),
    dmg: (3 + Math.min(level, 10) * 0.15) * Math.pow(1.052, level - 1),
    xp: 4 * Math.pow(level, 1.5),
  };
}

export class Monster extends Creature {
  constructor(o) {
    super(o);
    this.cd = rand(0.4, 1.4);
    this.state = 'idle';
    this.stateT = 0;
    this.wanderT = rand(1, 3);
    this.strafe = chance(0.5) ? 1 : -1;
    this.home = [this.x, this.y];
    this.aggroRange = this.aggroRange || 8.5;
    this.lifeT = 0;
    this.bossT = 2;
    this.patternQ = [];
    this.phase = 1;
  }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  /** All damage a monster deals goes through here (vampiric / thorns curse). */
  deal(target, amount, el, o = {}) {
    const d = hit(this, target, amount, el, o);
    if (d > 0) {
      if (this.affixes && this.affixes.includes('vampiric')) this.heal(d * 0.3);
      const th = this.curses.thorns;
      if (th && th.t > 0) hit(th.src, this, d * th.amt / 100, 'phys', { dot: true, crit: false });
      if (this.leech && this.owner) this.owner.heal(d * this.leech * 0.15, true);
    }
    return d;
  }

  onDamaged(src) {
    if (!this.affixes) return;
    if (this.affixes.includes('shocking') && (this.shockCd || 0) <= 0) {
      this.shockCd = 1.2;
      for (let i = 0; i < 5; i++) this.world.addHazard(new Projectile({ world: this.world, src: this, x: this.x, y: this.y, ang: rand(TAU), speed: 5, range: 5, fx: 'spark', el: 'light', dmg: [this.dmg * 0.4, this.dmg * 0.6] }));
    }
    if (this.affixes.includes('thorns') && src && !src.dead && src.isPlayer) hit(this, src, this.dmg * 0.25, 'phys', { dot: true, crit: false });
  }

  // ---------------------------------------------------------------- targeting
  pickTarget() {
    const w = this.world;
    if (this.curses.confuse && this.curses.confuse.t > 0) {
      const others = w.query(this.x, this.y, 8, (c) => c !== this && c.team === this.team && !c.isPlayer);
      if (others.length) return others[0];
    }
    if (this.summon) {
      const o = this.owner;
      const range = this.static ? (this.atk && this.atk.range) || 8 : 9;
      const cx = this.static ? this.x : o.x, cy = this.static ? this.y : o.y;
      if (this.aggro && !this.aggro.dead && this.aggro.team !== this.team && dist(cx, cy, this.aggro.x, this.aggro.y) < range + 2) return this.aggro;
      return w.nearestHostile(this.team, cx, cy, range, this.static);
    }
    // monsters: taunting totems first, then whatever hits them, then the closest of player/minions
    const taunt = w.query(this.x, this.y, 6, (c) => c.taunt && c.team !== this.team)[0];
    if (taunt) return taunt;
    if (this.aggro && !this.aggro.dead && this.aggro.team !== this.team && dist(this.x, this.y, this.aggro.x, this.aggro.y) < 14) return this.aggro;
    return w.nearestHostile(this.team, this.x, this.y, this.awake ? 30 : this.aggroRange, !this.awake);
  }

  // ---------------------------------------------------------------- main update
  update(dt) {
    const w = this.world;
    this.animT += dt;
    this.lifeT += dt;
    if (this.shockCd > 0) this.shockCd -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    const canAct = this.tickStatus(dt, (k, amount, src) => hit(src, this, amount, k === 'burn' ? 'fire' : k === 'poison' ? 'poison' : k === 'bleed' ? 'blood' : 'shadow', { dot: true, crit: false }));
    if (this.dead) return;
    if (this.life && this.lifeT > this.life) { this.dead = true; burst(this.x, this.y, 20, this.el || 'arcane', 10, 2); return; }
    // charm wears off
    const ch = this.curses.charm;
    if (ch && ch.t <= 0 && ch.team) { this.team = ch.team; ch.team = null; this.aggro = null; }
    if (this.partyBuff && (this.partyBuff.t -= dt) <= 0) this.partyBuff = null;
    if (this.affixes && this.affixes.includes('regen')) this.heal(this.maxHp * 0.02 * dt);
    if (this.affixes && this.affixes.includes('frozen') && w.player) {
      const p = w.player;
      if (dist(this.x, this.y, p.x, p.y) < 3) p.status.chill = { t: 0.5, amt: 0.3 };
      if (chance(dt * 6)) spawn({ type: 'dot', x: this.x + rand(-1.5, 1.5), y: this.y + rand(-1.5, 1.5), z: rand(5, 40), vz: -8, life: 1, size: 1.5, color: '#c8f0ff' });
    }
    if (this.aura) addLight(this.x, this.y, 2.5, 0.5);
    if (this.defAura && chance(dt * 2)) aoe(w, this, this.x, this.y, this.defAura.r, this.dmg * 0.3, this.defAura.el, { dot: true });
    if (!canAct) { this.moving = false; return; }
    this.cd -= dt * (this.partyBuff && this.partyBuff.stats.as ? 1 + this.partyBuff.stats.as / 100 : 1);

    // fear: run away
    if (this.status.fear && this.status.fear.t > 0) {
      const t = w.nearestHostile(this.team, this.x, this.y, 10);
      if (t) { const a = angleTo(t.x, t.y, this.x, this.y); this.moveToward(this.x + Math.cos(a) * 2, this.y + Math.sin(a) * 2, dt, this.speed * 0.8); }
      return;
    }
    if (this.state === 'windup' || this.state === 'act') { this.runAction(dt); return; }

    if (this.ai === 'boss') return this.bossUpdate(dt);
    const target = this.pickTarget();
    this.target = target;
    if (!target) return this.idle(dt);
    if (!this.summon && !this.awake) { this.awake = true; this.alertPack(); }
    const d = dist(this.x, this.y, target.x, target.y);
    switch (this.ai) {
      case 'melee': case 'brute': return this.aiMelee(dt, target, d);
      case 'ranged': case 'caster': return this.aiRanged(dt, target, d);
      case 'charger': return this.aiCharger(dt, target, d);
      case 'swarm': return this.aiSwarm(dt, target, d);
      case 'nova': return this.aiNova(dt, target, d);
      case 'beamer': return this.aiBeamer(dt, target, d);
      case 'exploder': return this.aiExploder(dt, target, d);
      case 'turret': return this.aiTurret(dt, target, d);
      case 'aura': return this.aiAura(dt, target, d);
      case 'follow': return this.aiFollow(dt, target, d);
      default: return this.aiMelee(dt, target, d);
    }
  }

  alertPack() {
    for (const c of this.world.query(this.x, this.y, 6, (c) => c.team === this.team && !c.summon)) c.awake = true;
  }

  idle(dt) {
    this.moving = false;
    if (this.summon) return this.followOwner(dt);
    if (this.ai === 'aura' || this.static) return;
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = rand(2, 5);
      this.wander = chance(0.5) ? this.world.map.randomNear(this.home[0], this.home[1], 2.5) : null;
    }
    if (this.wander) {
      const r = this.moveToward(this.wander[0], this.wander[1], dt, this.speed * 0.35);
      if (r < 0.1) this.wander = null;
    }
  }

  followOwner(dt) {
    const o = this.owner;
    if (!o || this.static) { this.moving = false; return; }
    const d = dist(this.x, this.y, o.x, o.y);
    if (d > 14) { const [x, y] = this.world.map.randomNear(o.x, o.y, 1.5); this.x = x; this.y = y; return; }
    if (d > 2.6) this.moveToward(o.x + Math.cos(this.id) * 1.4, o.y + Math.sin(this.id) * 1.4, dt, this.speed * 1.1);
    else this.moving = false;
  }

  /** Move toward a target using LOS, else the flow field (monsters) or direct steering. */
  chase(dt, t, speed = this.speed) {
    const w = this.world;
    const d = dist(this.x, this.y, t.x, t.y);
    if (this.fly || this.ghost || d < 2.2 || (d < 9 && w.map.los(this.x, this.y, t.x, t.y))) {
      this.moveToward(t.x, t.y, dt, speed);
      return;
    }
    if (t === w.player || (!this.summon && t.isPlayer)) {
      const step = w.map.flowStep(this.x, this.y);
      if (step) { this.moveToward(step[0], step[1], dt, speed); return; }
    }
    this.moveToward(t.x, t.y, dt, speed);
  }

  atkRange(t) { return this.r + t.r + (this.atkReach || 0.55); }

  startAction(kind, windup, data = {}) {
    this.state = 'windup';
    this.action = { kind, t: 0, windup, ...data };
    this.moving = false;
  }

  // ------------------------------------------------------------------ AIs
  aiMelee(dt, t, d) {
    if (d <= this.atkRange(t)) {
      this.face(angleTo(this.x, this.y, t.x, t.y));
      this.moving = false;
      if (this.cd <= 0) {
        const brute = this.ai === 'brute' && chance(0.45);
        this.startAction(brute ? 'slam' : 'melee', brute ? 0.6 : (this.summon ? 0.15 : 0.32), { target: t });
        if (brute) addEffect(new Telegraph({ kind: 'circle', x: this.x + Math.cos(this.facing) * 0.8, y: this.y + Math.sin(this.facing) * 0.8, r: 1.6 * this.scale, dur: 0.6, color: this.team === 'enemy' ? '#ff2a10' : '#40ff60' }), 'ground');
      }
    } else this.chase(dt, t);
  }

  aiRanged(dt, t, d) {
    const range = this.range || 7;
    const los = this.world.map.los(this.x, this.y, t.x, t.y);
    if (d < range && los) {
      this.face(angleTo(this.x, this.y, t.x, t.y));
      if (this.cd <= 0) {
        if (this.summoner && chance(0.35) && !this.summon) this.startAction('summonMinions', 0.8);
        else if (this.aoeCaster && chance(0.6)) this.startAction('aoeCast', 0.4, { tx: t.x, ty: t.y });
        else this.startAction('shoot', this.summon ? 0.1 : 0.3, { target: t });
        return;
      }
      // kite / strafe
      if (d < (this.summon ? 2.5 : 3.5) && !this.static) {
        const a = angleTo(t.x, t.y, this.x, this.y);
        this.moveToward(this.x + Math.cos(a), this.y + Math.sin(a), dt, this.speed * 0.8);
      } else if (!this.static) {
        const a = angleTo(t.x, t.y, this.x, this.y) + this.strafe * 1.57;
        if (!this.world.map.move(this, Math.cos(a) * this.speed * 0.4 * dt, Math.sin(a) * this.speed * 0.4 * dt)) this.strafe *= -1;
        this.moving = true;
        if (chance(dt * 0.5)) this.strafe *= -1;
      }
    } else this.chase(dt, t);
  }

  aiCharger(dt, t, d) {
    const los = this.world.map.los(this.x, this.y, t.x, t.y);
    if (d > 2.2 && d < 7 && los && this.cd <= 0 && chance(0.6)) {
      const ang = angleTo(this.x, this.y, t.x, t.y);
      this.startAction('charge', 0.55, { ang, len: Math.min(8, d + 1.5) });
      addEffect(new Telegraph({ kind: 'line', x: this.x, y: this.y, ang, len: Math.min(8, d + 1.5), w: 0.7, dur: 0.55 }), 'ground');
      return;
    }
    this.aiMelee(dt, t, d);
  }

  aiSwarm(dt, t, d) {
    if (d <= this.atkRange(t) && this.cd <= 0) { this.startAction('melee', 0.15, { target: t }); return; }
    const a = angleTo(t.x, t.y, this.x, this.y) + Math.sin(this.animT * 2 + this.id) * 1.3;
    const rr = this.cd > 0 ? 2.2 : 0.3;
    this.moveToward(t.x + Math.cos(a) * rr, t.y + Math.sin(a) * rr, dt, this.speed);
  }

  aiNova(dt, t, d) {
    const range = this.range || 4;
    if (d < range && this.cd <= 0 && this.world.map.los(this.x, this.y, t.x, t.y)) {
      this.startAction('nova', 0.65);
      addEffect(new Telegraph({ kind: 'circle', x: this.x, y: this.y, r: 2.4, dur: 0.65 }), 'ground');
      return;
    }
    if (d > range * 0.7) this.chase(dt, t, this.speed);
    else this.moving = false;
  }

  aiBeamer(dt, t, d) {
    const range = this.range || 7;
    if (d < range && this.cd <= 0 && this.world.map.los(this.x, this.y, t.x, t.y)) {
      const ang = angleTo(this.x, this.y, t.x, t.y);
      this.startAction('beam', 0.75, { ang });
      addEffect(new Telegraph({ kind: 'line', x: this.x, y: this.y, ang, len: range, w: 0.5, dur: 0.75, color: '#ff40ff' }), 'ground');
      return;
    }
    if (d > range * 0.8) this.chase(dt, t); else this.aiRanged(dt, t, d);
  }

  aiExploder(dt, t, d) {
    if (d < this.r + t.r + 0.5) { this.startAction('explode', 0.4); return; }
    this.chase(dt, t, this.speed);
  }

  aiTurret(dt, t, d) {
    this.moving = false;
    if (!this.static) this.followOwner(dt);
    const range = (this.atk && this.atk.range) || 7;
    if (d < range && this.cd <= 0) {
      this.face(angleTo(this.x, this.y, t.x, t.y));
      this.summonAttack(t);
    }
  }

  aiAura(dt) {
    this.moving = false;
    if (!this.static) this.followOwner(dt);
    if (this.cd <= 0) this.summonAttack(this.target);
  }

  aiFollow(dt, t, d) {
    const o = this.owner;
    if (o) {
      const tx = o.x - 1.2, ty = o.y - 1.2;
      if (dist(this.x, this.y, tx, ty) > 0.5) this.moveToward(tx, ty, dt, this.speed);
    }
    if (t && d < (this.atk.range || 7) && this.cd <= 0) this.summonAttack(t);
  }

  // ------------------------------------------------------------------ actions
  runAction(dt) {
    const a = this.action;
    a.t += dt;
    if (this.state === 'windup') {
      if (a.kind === 'explode' && Math.floor(a.t * 12) % 2) this.flash = 0.05;
      if (a.target && !a.target.dead) this.face(angleTo(this.x, this.y, a.target.x, a.target.y));
      if (a.t < a.windup) return;
      this.state = 'act'; a.t = 0;
      this.perform(a);
      if (this.state === 'act' && !a.ongoing) this.state = 'idle';
      return;
    }
    // ongoing actions (charge)
    if (a.kind === 'charge') {
      const step = 13 * dt;
      const moved = this.world.map.move(this, Math.cos(a.ang) * step, Math.sin(a.ang) * step, this.ghost);
      a.len -= step;
      this.moving = true;
      spawn({ type: 'glow', x: this.x, y: this.y, z: 20, life: 0.25, size: 6, size1: 0, color: '#ff8040', add: true });
      const t = this.world.hostiles(this.team, this.x, this.y, this.r + 0.4)[0];
      if (t && !a.hit) { a.hit = true; this.deal(t, this.dmg * 1.4, this.el || 'phys', { knock: 1, ang: a.ang, melee: true }); }
      if (a.len <= 0 || !moved) { this.state = 'idle'; this.cd = this.atkCd; }
    } else this.state = 'idle';
  }

  perform(a) {
    const w = this.world;
    const el = this.el || 'phys';
    this.lunge = 1;
    switch (a.kind) {
      case 'melee': {
        const t = a.target;
        if (t && !t.dead && dist(this.x, this.y, t.x, t.y) <= this.atkRange(t) + 0.5) {
          const o = { melee: true, ang: this.facing };
          if (this.atk) { o.slow = this.atk.slow; o.freeze = this.atk.freeze; o.stun = this.atk.stun; }
          if (this.poison) o.poison = true;
          if (this.affixes && this.affixes.includes('fiery')) o.burn = true;
          if (this.atk && this.atk.aoe) aoe(w, this, t.x, t.y, this.atk.aoe, this.dmg, this.summonEl || 'phys', o);
          else this.deal(t, this.dmg, this.summonEl || (this.atk ? this.el : 'phys') || 'phys', o);
          if (this.atk && this.atk.chain) chainHit(w, this, t.x, t.y, w.hostiles(this.team, t.x, t.y, 5).find((c) => c !== t), this.atk.chain, this.dmg * 0.6, this.el || 'light', elem(this.el || 'light').glow);
        }
        addEffect(new Slash(this.x, this.y, this.facing, 1.8, 0.9 * this.scale, 0.18, this.team === 'enemy' ? '#ffd0c0' : '#c0ffd0', { width: 6 }));
        if (!this.summon || chance(0.3)) sfx('swing', 0.5);
        this.cd = this.atkCd;
        break;
      }
      case 'slam': {
        const x = this.x + Math.cos(this.facing) * 0.8, y = this.y + Math.sin(this.facing) * 0.8;
        explode(w, this, x, y, 1.6 * this.scale, this.dmg * 1.6, 'phys', { knock: 1, sound: true }, 'eruption');
        sfx('thud');
        this.cd = this.atkCd * 1.4;
        break;
      }
      case 'shoot': {
        const t = a.target;
        if (!t || t.dead) break;
        const shots = this.affixes && this.affixes.includes('multishot') ? 3 : 1;
        const base = angleTo(this.x, this.y, t.x, t.y);
        const P = this.proj || { fx: PROJ_FX[el], speed: 7 };
        for (let i = 0; i < shots; i++) {
          const ang = base + (shots > 1 ? (i - 1) * 0.25 : 0) + rand(-0.04, 0.04);
          w.addHazard(new Projectile({ world: w, src: this, x: this.x, y: this.y, ang, speed: P.speed || 7, range: (this.range || 7) + 2, fx: P.fx, el, dmg: [this.dmg * 0.85, this.dmg * 1.15], lob: P.lob, tx: t.x, ty: t.y, exp: P.lob ? 0.9 : 0, o: { poison: el === 'poison' } }));
        }
        sfx(P.fx === 'arrow' ? 'bow' : elem(el).sfx, 0.5);
        this.cd = this.atkCd;
        break;
      }
      case 'aoeCast': {
        w.addHazard(new Delayed({ world: w, src: this, x: a.tx, y: a.ty, r: 1.4, delay: 1.0, fx: el === 'fire' ? 'explosion' : 'explosion', el, dmg: [this.dmg * 1.1, this.dmg * 1.4] }));
        sfx(elem(el).sfx, 0.5);
        this.cd = this.atkCd * 1.3;
        break;
      }
      case 'summonMinions': {
        for (let i = 0; i < 2; i++) {
          const [x, y] = w.map.randomNear(this.x, this.y, 1.5);
          const m = makeMonster(w, 'skeleton', w.biome, this.level, 'normal', x, y);
          m.awake = true;
          w.add(m);
          sparkle(x, y, 10, '#b040ff', 10, 0.4);
        }
        sfx('summon');
        this.cd = this.atkCd * 2;
        break;
      }
      case 'nova': {
        if (this.arch === 'shroom') {
          w.addHazard(new Area({ world: w, src: this, x: this.x, y: this.y, r: 2.2, dur: 3, tick: 0.5, dmg: [this.dmg * 0.25, this.dmg * 0.35], el: 'poison', fx: 'poison' }));
        } else {
          const n = 10;
          for (let i = 0; i < n; i++) w.addHazard(new Projectile({ world: w, src: this, x: this.x, y: this.y, ang: (i / n) * TAU + rand(0.3), speed: 5.5, range: 6, fx: PROJ_FX[el], el, dmg: [this.dmg * 0.6, this.dmg * 0.8] }));
        }
        sfx(elem(el).sfx);
        this.cd = this.atkCd * 1.6;
        break;
      }
      case 'beam': {
        const len = this.range || 7;
        const L = w.map.rayLength(this.x, this.y, a.ang, len);
        const ex = this.x + Math.cos(a.ang) * L, ey = this.y + Math.sin(a.ang) * L;
        for (const c of lineTargets(w, this.team, this.x, this.y, ex, ey, 0.45)) this.deal(c, this.dmg * 1.4, el, {});
        addEffect(new (Bolt)(this.x, this.y, 30, ex, ey, 20, elem(el).glow, 0.3, 4));
        sfx(elem(el).sfx);
        this.cd = this.atkCd * 1.5;
        break;
      }
      case 'charge':
        this.state = 'act'; a.ongoing = true; sfx('roar', 0.6);
        return;
      case 'explode':
        explode(w, this, this.x, this.y, 1.7 * this.scale, this.dmg * 1.6, el === 'phys' ? 'fire' : el, {}, 'explosion');
        this.hp = 0; this.dead = true;
        if (!this.summon) { this.world.kills++; }
        break;
      default:
        if (a.kind.startsWith('boss_')) this.bossPerform(a);
    }
  }

  /** Minion attacks driven by the summon definition. */
  summonAttack(t) {
    const w = this.world, A = this.atk, el = this.el || 'phys', E = elem(el);
    this.cd = A.cd || 1;
    const dmg = [this.dmg * 0.85, this.dmg * 1.15];
    switch (A.type) {
      case 'proj': {
        if (!t) return;
        const n = A.n || 1;
        for (let i = 0; i < n; i++) {
          const ang = angleTo(this.x, this.y, t.x, t.y) + (n > 1 ? (i - (n - 1) / 2) * 0.2 : 0);
          w.addHazard(new Projectile({ world: w, src: this, x: this.x, y: this.y, z: this.fly ? 40 : 26, ang, speed: A.spd || 9, range: (A.range || 7) + 2, fx: A.fx || PROJ_FX[el], el, dmg, home: A.home ? 1 : 0, exp: A.exp || 0, heal: A.heal, o: { slow: A.slow, poison: A.poison } }));
        }
        if (chance(0.4)) sfx(A.fx === 'bullet' ? 'shoot' : A.fx === 'arrow' ? 'bow' : E.sfx, 0.35);
        break;
      }
      case 'chain':
        if (!t) return;
        chainHit(w, this, this.x, this.y, t, A.n || 2, rand(dmg[0], dmg[1]), el, E.glow);
        sfx('light', 0.35);
        break;
      case 'strike':
        if (!t) return;
        if (A.fx === 'meteor') w.addHazard(new Delayed({ world: w, src: this, x: t.x, y: t.y, r: 1.3, delay: 0.6, fx: 'meteor', el, dmg, showRing: false }));
        else {
          addEffect(new Bolt(t.x - 0.6, t.y - 0.6, 300, t.x, t.y, 0, E.glow, 0.25, 3));
          if (A.fx === 'pillar') addEffect(new Column(t.x, t.y, E.glow, 0.4, 20, 240));
          aoe(w, this, t.x, t.y, 0.9, rand(dmg[0], dmg[1]), el, {});
          sfx(E.sfx, 0.4);
        }
        break;
      case 'beam': {
        if (!t) return;
        const ang = angleTo(this.x, this.y, t.x, t.y);
        if (A.cone) {
          for (const c of coneTargets(w, this.team, this.x, this.y, ang, A.range || 4, 0.5)) hit(this, c, rand(dmg[0], dmg[1]), el, {});
          for (let i = 0; i < 14; i++) { const aa = ang + rand(-0.45, 0.45), sp = rand(5, 8); spawn({ type: 'glow', x: this.x, y: this.y, z: this.fly ? 40 : 22, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, drag: 1.5, life: 0.5, size: 4, size1: 8, color: chance(0.5) ? E.glow : E.core, add: true }); }
        } else {
          const L = w.map.rayLength(this.x, this.y, ang, A.range || 7);
          const ex = this.x + Math.cos(ang) * L, ey = this.y + Math.sin(ang) * L;
          for (const c of lineTargets(w, this.team, this.x, this.y, ex, ey, 0.5)) hit(this, c, rand(dmg[0], dmg[1]), el, { freeze: A.freeze });
          addEffect(new Bolt(this.x, this.y, 30, ex, ey, 20, E.glow, 0.2, 3));
        }
        sfx(E.sfx, 0.35);
        break;
      }
      case 'nova':
        w.addHazard(new NovaWave({ world: w, src: this, x: this.x, y: this.y, r: A.r || 2.5, dmg, el, fx: el === 'phys' ? 'shock' : 'nova' }));
        if (A.buff) this.buffAllies(A.buff, A.amt, (A.r || 2.5) + 1);
        break;
      case 'heal': {
        const r = A.r || 5;
        for (const c of w.alliesOf(this.team, this.x, this.y, r)) {
          if (c.isPlayer) c.heal(c.maxHp * (A.amt || 2) / 100 * (A.cd || 1) * 2, true);
          else c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.04);
        }
        addEffect(new Ring(this.x, this.y, 0.2, r, 0.6, '#80ff80', 2));
        break;
      }
      case 'buff':
        this.buffAllies(A.stat, A.amt, A.r || 5, A);
        addEffect(new Ring(this.x, this.y, 0.2, A.r || 5, 0.8, E.glow, 1.5));
        break;
      case 'curse': {
        for (const c of w.hostiles(this.team, this.x, this.y, A.r || 4)) {
          if (A.curse === 'fear' && c.rank !== 'boss') c.status.fear = { t: 1.5 };
          else if (A.curse === 'slow') c.curses.slow = { t: 1.2, amt: 0.45 };
          else c.curses[A.curse] = { t: 1.2, amt: 30, src: this.owner };
        }
        addEffect(new Ring(this.x, this.y, 0.2, A.r || 4, 0.7, E.glow, 1.5));
        break;
      }
      case 'spawn': {
        const kids = w.creatures.filter((c) => c.parentId === this.id && !c.dead).length;
        if (kids < (A.max || 6)) {
          const def = SUMMONS[A.what];
          const m = buildSummon(this.owner, def, A.what, this.x + rand(-1, 1), this.y + rand(-1, 1), this.dmg * 0.5, this.maxHp * 0.15, 12);
          m.parentId = this.id;
          w.add(m);
        }
        break;
      }
      case 'melee':
        if (t && dist(this.x, this.y, t.x, t.y) <= this.atkRange(t)) this.startAction('melee', 0.1, { target: t });
        break;
    }
  }

  buffAllies(stat, amt, r, A = {}) {
    const p = this.owner;
    if (p && dist(this.x, this.y, p.x, p.y) < r) {
      const stats = { [stat]: amt };
      if (A.as) stats.as = A.as;
      if (A.regen) stats.regen = A.regen * 10;
      p.addBuff({ id: 'aura_' + this.skillId, name: this.name, el: this.el || 'holy', stats, t: 1.5, max: 1.5, hidden: false, aura: true });
    }
    for (const c of this.world.alliesOf(this.team, this.x, this.y, r)) if (c.summon) c.partyBuff = { stats: { [stat]: amt }, t: 1.5 };
  }

  // ------------------------------------------------------------------ bosses
  bossUpdate(dt) {
    const w = this.world, p = w.player;
    if (!p || p.dead) return this.idle(dt);
    const t = this.pickTarget() || p;
    const d = dist(this.x, this.y, t.x, t.y);
    if (!this.awake) {
      if (d > 9 || !w.map.los(this.x, this.y, t.x, t.y)) return this.idle(dt);
      this.awake = true;
      this.alertPack();
      if (w.onBossAwake) w.onBossAwake(this);
    }
    if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
      this.phase = 2;
      this.speed *= 1.2; this.atkCd *= 0.75;
      floatText(this.x, this.y, 90, 'ENRAGED!', '#ff4020', 22, { life: 1.5 });
      addEffect(new Ring(this.x, this.y, 0.2, 4, 0.8, '#ff3010', 6));
      sfx('roar'); sfx('boss');
      this.patternQ = ['summon', ...this.patternQ];
    }
    this.bossT -= dt;
    if (this.bossT <= 0) {
      if (!this.patternQ.length) this.patternQ = shuffle(this.patterns.slice());
      const pat = this.patternQ.shift();
      this.bossT = rand(2.6, 4.2) * (this.phase === 2 ? 0.7 : 1);
      return this.bossPattern(pat, t);
    }
    // between patterns: chase and melee
    if (d <= this.atkRange(t) + 0.3) {
      this.face(angleTo(this.x, this.y, t.x, t.y));
      if (this.cd <= 0) this.startAction('melee', 0.35, { target: t });
      this.moving = false;
    } else this.chase(dt, t);
  }

  bossPattern(pat, t) {
    const w = this.world;
    const tele = (o) => addEffect(new Telegraph(o), 'ground');
    switch (pat) {
      case 'slam':
        this.startAction('boss_slam', 0.9);
        tele({ kind: 'circle', x: this.x, y: this.y, r: 3.2 * (this.scale / 1.6), dur: 0.9 });
        break;
      case 'nova':
        this.startAction('boss_nova', 0.7);
        tele({ kind: 'circle', x: this.x, y: this.y, r: 1.5, dur: 0.7 });
        break;
      case 'volley':
        this.startAction('boss_volley', 0.5, { target: t });
        break;
      case 'charge': {
        const ang = angleTo(this.x, this.y, t.x, t.y), len = Math.min(10, dist(this.x, this.y, t.x, t.y) + 2);
        this.startAction('charge', 0.8, { ang, len });
        tele({ kind: 'line', x: this.x, y: this.y, ang, len, w: 1.2, dur: 0.8 });
        break;
      }
      case 'summon':
        this.startAction('boss_summon', 1.0);
        break;
      case 'meteor':
        this.startAction('boss_meteor', 0.4, { target: t });
        break;
      case 'spiral':
        this.startAction('boss_spiral', 0.6);
        break;
      case 'beam': {
        const ang = angleTo(this.x, this.y, t.x, t.y);
        this.startAction('boss_beam', 1.0, { ang });
        tele({ kind: 'line', x: this.x, y: this.y, ang, len: 11, w: 0.8, dur: 1.0, color: '#ff40ff' });
        break;
      }
    }
  }

  bossPerform(a) {
    const w = this.world, el = this.el || 'fire', E = elem(el);
    const dmg = this.dmg;
    switch (a.kind) {
      case 'boss_slam':
        explode(w, this, this.x, this.y, 3.2 * (this.scale / 1.6), dmg * 1.8, 'phys', { knock: 1.5 }, 'eruption');
        sfx('thud'); sfx('explode');
        break;
      case 'boss_nova': {
        const n = this.isVelscour ? 28 : 18;
        for (let ring = 0; ring < (this.phase === 2 ? 2 : 1); ring++) {
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * TAU + ring * (Math.PI / n);
            const pr = new Projectile({ world: w, src: this, x: this.x, y: this.y, ang, speed: 4.5 + ring * 1.5, range: 11, fx: PROJ_FX[el], el, dmg: [dmg * 0.7, dmg * 0.9], size: 1.2 });
            w.addHazard(pr);
          }
        }
        sfx(E.sfx);
        break;
      }
      case 'boss_volley': {
        const t = a.target || w.player;
        const base = angleTo(this.x, this.y, t.x, t.y);
        const n = this.isVelscour ? 9 : 5;
        for (let i = 0; i < n; i++) w.addHazard(new Projectile({ world: w, src: this, x: this.x, y: this.y, ang: base + (i - (n - 1) / 2) * 0.16, speed: 8, range: 12, fx: PROJ_FX[el], el, dmg: [dmg * 0.8, dmg], size: 1.1 }));
        sfx(E.sfx);
        break;
      }
      case 'boss_summon': {
        const roster = this.isVelscour ? ['demon', 'imp', 'gargoyle', 'knight'] : w.biome.roster;
        const n = this.isVelscour ? 5 : 3 + (this.phase === 2 ? 2 : 0);
        for (let i = 0; i < n; i++) {
          const [x, y] = w.map.randomNear(this.x, this.y, 3);
          const m = makeMonster(w, pick(roster.filter((r) => r !== 'abomination')), w.biome, this.level, 'normal', x, y);
          m.awake = true;
          w.add(m);
          addEffect(new Ring(x, y, 0.1, 1, 0.5, '#ff2020', 3));
          smoke(x, y, 0, '#200808', 4, 8);
        }
        sfx('summon'); sfx('roar');
        break;
      }
      case 'boss_meteor': {
        const p = w.player;
        const n = this.isVelscour ? 7 : 4;
        for (let i = 0; i < n; i++) {
          const x = p.x + (i ? rand(-3, 3) : 0), y = p.y + (i ? rand(-3, 3) : 0);
          if (!w.map.isFloor(x, y)) continue;
          w.addHazard(new Delayed({ world: w, src: this, x, y, r: 1.5, delay: 1.1 + i * 0.12, fx: 'meteor', el: el === 'phys' ? 'fire' : el, dmg: [dmg * 1.2, dmg * 1.5] }));
        }
        sfx('boss');
        break;
      }
      case 'boss_spiral': {
        let k = 0;
        const total = this.isVelscour ? 60 : 36;
        const fire = () => {
          if (this.dead || k >= total) return;
          for (let arm = 0; arm < (this.isVelscour ? 4 : 3); arm++) {
            const ang = k * 0.32 + (arm * TAU) / (this.isVelscour ? 4 : 3);
            w.addHazard(new Projectile({ world: w, src: this, x: this.x, y: this.y, ang, speed: 5, range: 11, fx: PROJ_FX[el], el, dmg: [dmg * 0.5, dmg * 0.7] }));
          }
          k++;
          w.addHazard({ t: 0.06, update(dt) { this.t -= dt; if (this.t <= 0) { fire(); return false; } return true; }, draw() {} });
        };
        fire();
        sfx(E.sfx);
        break;
      }
      case 'boss_beam': {
        const len = 11;
        const L = w.map.rayLength(this.x, this.y, a.ang, len);
        const ex = this.x + Math.cos(a.ang) * L, ey = this.y + Math.sin(a.ang) * L;
        for (const c of lineTargets(w, this.team, this.x, this.y, ex, ey, 0.75)) this.deal(c, dmg * 2, el, {});
        for (let i = 0; i < 3; i++) addEffect(new Bolt(this.x, this.y, 40, ex, ey, 20, i ? E.core : E.glow, 0.45, 6 - i * 2));
        sfx('explode');
        break;
      }
    }
    this.cd = this.atkCd;
  }

  spawnChild() {
    const w = this.world;
    const [x, y] = w.map.randomNear(this.x, this.y, 0.8);
    const c = new Monster({ ...this.cloneProps(), x, y, scale: this.scale * 0.65, maxHp: this.maxHp * 0.35, hp: this.maxHp * 0.35, xp: this.xp * 0.3, rank: 'normal', aura: null, affixes: null, awake: true });
    c.split = this.scale * 0.65 > 0.6;
    w.add(c);
  }
  cloneProps() {
    const keys = ['arch', 'sprite', 'pal', 'px', 'ai', 'team', 'speed', 'dmg', 'r', 'level', 'el', 'res', 'goreType', 'bloodColor', 'name', 'atkCd', 'range', 'proj', 'undead', 'demon', 'fly', 'atkReach'];
    const o = {};
    for (const k of keys) o[k] = this[k];
    return o;
  }
}

// ======================================================================= factories
export function makeMonster(world, archId, biome, level, rank = 'normal', x = 0, y = 0) {
  const A = ARCH[archId];
  const B = monsterBase(level);
  const depth = world.depth || 1;
  const biomeEl = biome.el && biome.el !== 'phys' ? biome.el : null;
  let el = A.el || 'phys';
  if (biomeEl && ['ranged', 'caster', 'nova', 'beamer', 'exploder'].includes(A.ai) && archId !== 'archer') el = biomeEl;
  const pal = biome.mon ? shiftPalette(A.pal, biome.mon) : A.pal;
  const tierName = A.names[Math.min(A.names.length - 1, Math.floor(depth / 34))];
  const adj = biome.adj ? biome.adj[(archId.length + depth) % biome.adj.length] : '';
  const res = {};
  if (biomeEl) res[biomeEl] = 0.3;
  if (A.undead) { res.poison = 0.5; res.shadow = 0.3; }
  if (A.ghost) res.phys = 0.3;
  if (A.armor) res.phys = (res.phys || 0) + 0.15;
  if (archId === 'elemental') res[el] = 0.6;
  if (archId === 'slime') res.acid = 0.5;
  const m = new Monster({
    arch: archId, sprite: A.sprite, pal, px: A.px || 2.3, r: A.r || 0.33, ai: A.ai, team: 'enemy',
    level, maxHp: B.hp * A.hp, hp: B.hp * A.hp, dmg: B.dmg * A.dmg, xp: B.xp * (A.xp || 1),
    speed: A.spd * rand(0.92, 1.08), el, res, goreType: A.gore, bloodColor: A.gore === 'flesh' ? biome.blood : null,
    name: `${adj} ${tierName}`.trim(), atkCd: 1.2, range: A.range, proj: A.proj ? { ...A.proj, fx: archId === 'archer' ? 'arrow' : A.proj.fx === 'blob' ? 'blob' : PROJ_FX[el] || A.proj.fx } : null,
    undead: A.undead, demon: A.demon, fly: A.fly, ghost: A.ghost, poison: A.poison, split: A.split,
    summoner: A.summoner && chance(A.summoner), aoeCaster: A.aoe, rank: 'normal', x, y,
  });
  if (A.ai === 'brute') m.atkReach = 0.7;
  if (rank !== 'normal') makeElite(m, rank, depth, world);
  return m;
}

export function makeElite(m, rank, depth, world) {
  m.rank = rank;
  const keys = Object.keys(ELITE_AFFIXES).filter((k) => k !== 'multishot' || ['ranged', 'caster'].includes(m.ai));
  if (rank === 'champion') {
    m.maxHp *= 3; m.dmg *= 1.4; m.xp *= 3; m.aura = '#4a8aff'; m.scale = 1.15;
    m.affixes = shuffle(keys).slice(0, depth > 40 ? 2 : 1);
    m.name = 'Champion ' + m.name;
  } else if (rank === 'unique') {
    m.maxHp *= 5; m.dmg *= 1.6; m.xp *= 6; m.aura = '#ffb030'; m.scale = 1.3;
    m.affixes = shuffle(keys).slice(0, depth > 50 ? 3 : 2);
    m.name = uniqueName();
  } else if (rank === 'boss') {
    const vel = m.arch === 'velscour';
    m.maxHp *= vel ? 70 : 14 + depth / 4; m.dmg *= vel ? 2.4 : 1.9; m.xp *= vel ? 200 : 25;
    m.aura = vel ? '#ff2000' : '#ff4020';
    m.scale = vel ? 1.6 : 1.9; m.r *= vel ? 1 : 1.6;
    m.ai = 'boss';
    m.affixes = depth > 20 && !vel ? shuffle(keys.filter((k) => !['teleport', 'multishot', 'fast'].includes(k))).slice(0, 1) : [];
    m.name = vel ? 'DEMON LORD VELSCOUR' : bossName();
    m.isVelscour = vel;
    const base = ['slam', 'nova', 'volley', 'charge', 'summon', 'meteor', 'spiral', 'beam'];
    m.patterns = vel ? base : shuffle(base.slice()).slice(0, 3 + Math.min(3, Math.floor(depth / 20)));
    if (!m.patterns.includes('slam')) m.patterns.push('slam');
    m.atkCd = 1.1;
    m.aggroRange = 9;
    if (!m.el || m.el === 'phys') m.el = world.biome.el && world.biome.el !== 'phys' ? world.biome.el : 'fire';
    m.res = { ...m.res, [m.el]: 0.4 };
  }
  if (m.affixes) {
    if (m.affixes.includes('strong')) m.dmg *= 1.5;
    if (m.affixes.includes('fast')) { m.speed *= 1.4; m.atkCd *= 0.75; }
    if (m.affixes.includes('tough')) { m.maxHp *= 1.5; for (const k of ['phys', 'fire', 'cold', 'light', 'poison']) m.res[k] = (m.res[k] || 0) + 0.15; }
    if (m.affixes.includes('fiery')) m.res.fire = (m.res.fire || 0) + 0.4;
    if (m.affixes.includes('frozen')) m.res.cold = (m.res.cold || 0) + 0.4;
  }
  m.hp = m.maxHp;
}

/** Build a player minion from a summon definition. */
export function buildSummon(owner, def, key, x, y, dmg, hp, life) {
  const look = def.look || { sprite: 'skeleton', pal: {}, px: 2.3 };
  const m = new Monster({
    team: 'player', owner, summon: true, x, y, ai: def.ai, atk: def.atk, el: def.el || 'phys', summonEl: def.el,
    dmg, maxHp: hp, hp, speed: def.spd || 3, static: !!def.static, fly: !!def.fly, ghost: !!def.ghost,
    targetable: def.targetable !== false, alpha: def.alpha, level: owner.char.level, life: life || 0, taunt: def.taunt,
    atkCd: (def.atk && def.atk.cd) || 1, name: def.name, leech: def.atk && def.atk.leech, r: look.px > 3.5 ? 0.5 : 0.3,
    defAura: def.aura, summonKey: key, awake: true,
  });
  if (look.cls) { m.classId = look.cls === true ? owner.classId : look.cls; m.classPal = look.pal || null; m.spriteH = 50; }
  else { m.sprite = look.sprite; m.pal = look.pal; m.px = look.px || 2.3; }
  return m;
}

export function createSummon(p, sk, L, x, y, dmgRange, corpse) {
  const w = p.world;
  const key = sk.m.sum;
  const def = SUMMONS[key];
  if (!def) return null;
  const sp = 1 + (p.st.summonPct || 0) / 100;
  const avg = (dmgRange[0] + dmgRange[1]) / 2;
  const hp = Math.max(20, p.maxHp * def.hp * (1 + 0.08 * (L - 1)) * sp);
  const m = buildSummon(p, def, key, x, y, avg * def.dmg * sp, hp, sk.m.dur || 0);
  m.skillId = sk.id;
  if (corpse) {
    m.sprite = corpse.sprite; m.pal = shiftPalette(corpse.pal || {}, { hue: 120, sat: 0.5, light: 0.05 }); m.px = corpse.px; m.fly = corpse.fly;
    m.name = 'Revived ' + (ARCH[corpse.arch] ? ARCH[corpse.arch].names[0] : 'Monster');
    m.maxHp = m.hp = Math.max(hp, corpse.maxHp * 0.6);
    m.aura = '#40ff80';
  }
  // enforce per-skill maximum and a global cap
  const mine = w.creatures.filter((c) => c.summon && c.skillId === sk.id && !c.dead);
  const max = sk.m.max || (sk.m.dur ? 99 : (sk.m.n || 1));
  while (mine.length >= max) { const old = mine.shift(); old.dead = true; burst(old.x, old.y, 20, old.el || 'arcane', 8, 2); }
  const all = w.creatures.filter((c) => c.summon && !c.dead && c.owner === p);
  if (all.length >= 40) all[0].dead = true;
  w.add(m);
  return m;
}
