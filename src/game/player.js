// The hero.
import { G } from '../state.js';
import { rand, chance, clamp, angleTo, dist, TAU } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { floatText, addEffect, Column, Ring, sparkle, burst, spawn, elem } from '../gfx/vfx.js';
import { Creature } from './creature.js';
import { CLASSES } from '../data/classes.js';
import { SKILLS, CLASS_SKILLS, effLevel, skillBaseDamage, manaCost, cooldown, useTime, weaponCoef, grantedSkillsAt, skillRange } from '../data/skills.js';
import { SLOTS, itemStats, itemDmg, itemArmor, GEMS } from '../data/items.js';
import { castSkill, Timer } from './skillrun.js';
import { Orbit, Area, BeamCh } from './hazards.js';
import { hit, aoe } from './combat.js';

export const xpToNext = (L) => Math.round(60 * L * L + 40 * L);
export const MAX_LEVEL = 100;

const ELEM_KEYS = ['fire', 'cold', 'light', 'poison', 'arcane', 'holy', 'shadow', 'blood', 'acid'];

export class Player extends Creature {
  constructor(char) {
    super({ team: 'player', r: 0.3, speed: 4.2 });
    this.isPlayer = true;
    this.char = char;
    this.classId = char.classId;
    this.cls = CLASSES[char.classId];
    this.spriteH = 60;
    this.cooldowns = {};
    this.castLock = 0;
    this.channel = null;
    this.potionCd = 0;
    this.potionRegen = [];
    this.buffs = [];
    this.moveVec = [0, 0];
    this.moveTarget = null;
    this.path = null;
    this.aim = null;
    this.hitCounter = 0;
    this.phoenixCd = 0;
    this.infernoT = 0;
    this.st = {};
    this.recompute();
    this.hp = this.maxHp;
    this.mana = this.maxMana;
  }

  // ------------------------------------------------------------------ stats
  recompute() {
    const c = this.char, C = this.cls;
    const add = {};
    const put = (k, v) => { add[k] = (add[k] || 0) + v; };
    let itemArmorSum = 0;
    let weapon = null;
    const legendary = {};
    for (const slot of SLOTS) {
      const it = c.equip[slot];
      if (!it) continue;
      for (const [k, v] of itemStats(it)) put(k, v);
      itemArmorSum += itemArmor(it);
      if (slot === 'weapon') weapon = it;
      if (it.legendary) legendary[it.legendary] = true;
    }
    // buffs
    let buffDmg = 0, buffAs = 0, buffArmor = 0, buffRes = 0, buffRegen = 0, buffSpeed = 0, buffCrit = 0, buffThorns = 0, buffLeech = 0, buffBlock = 0, buffLife = 0, buffCdr = 0;
    for (const b of this.buffs) {
      const s = b.stats;
      buffDmg += s.dmg || 0; buffAs += s.as || 0; buffArmor += s.armor || 0; buffRes += s.res || 0; buffRegen += s.regen || 0;
      buffSpeed += s.speed || 0; buffCrit += s.crit || 0; buffThorns += s.thorns || 0; buffLeech += s.leech || 0; buffBlock += s.block || 0;
      buffLife += s.life || 0; buffCdr += s.cdr || 0;
    }
    const attr = (k) => c.attrs[k] + (add[k] || 0) + (add.allAttr || 0);
    const str = attr('str'), dex = attr('dex'), vit = attr('vit'), int = attr('int');
    const st = {
      str, dex, vit, int, legendary,
      armor: Math.round((itemArmorSum + (add.armor || 0) + str) * (1 + ((add.armorPct || 0) + buffArmor) / 100)),
      res: {
        fire: (add.resFire || 0) + (add.resAll || 0) + buffRes,
        cold: (add.resCold || 0) + (add.resAll || 0) + buffRes,
        light: (add.resLight || 0) + (add.resAll || 0) + buffRes,
        poison: (add.resPoison || 0) + (add.resAll || 0) + buffRes,
        magic: Math.round(((add.resAll || 0) + buffRes) * 0.75),
      },
      critChance: clamp(5 + dex * 0.05 + (add.critChance || 0) + buffCrit / 4, 0, 75),
      critDmg: 50 + (add.critDmg || 0),
      atkSpeed: Math.min(150, dex * 0.3 + (add.atkSpeed || 0) + buffAs),
      castSpeed: Math.min(150, int * 0.1 + (add.castSpeed || 0) + buffAs),
      moveSpeed: Math.min(80, (add.moveSpeed || 0) + buffSpeed * 0.6),
      lifeSteal: (add.lifeSteal || 0) + buffLeech / 4,
      manaSteal: add.manaSteal || 0,
      block: Math.min(60, (add.block || 0) + buffBlock / 2),
      thorns: (add.thorns || 0) + buffThorns * c.level * 0.2,
      goldFind: add.goldFind || 0,
      magicFind: add.magicFind || 0,
      xpPct: add.xpPct || 0,
      cdr: Math.min(60, (add.cdr || 0) + buffCdr / 2),
      areaPct: add.areaPct || 0,
      projSpeed: add.projSpeed || 0,
      extraProj: add.extraProj || 0,
      pierce: add.pierce || 0,
      chainPlus: add.chainPlus || 0,
      splitChance: add.splitChance || 0,
      echoChance: add.echoChance || 0,
      homing: add.homing || 0,
      novaOnCast: add.novaOnCast || 0,
      orbitOnCast: add.orbitOnCast || 0,
      bossDmg: add.bossDmg || 0,
      summonPct: add.summonPct || 0,
      skillsAll: add.skillsAll || 0,
      skillTree0: add.skillTree0 || 0, skillTree1: add.skillTree1 || 0, skillTree2: add.skillTree2 || 0,
      dmgPct: (add.dmgPct || 0) + buffDmg + (this.furyT > 0 ? 30 : 0),
      physPct: (add.physPct || 0) + str,
      elemPct: {},
      primary: { str, dex, vit, int }[C.primary],
      regenPct: buffRegen / 10,
    };
    for (const k of ELEM_KEYS) st.elemPct[k] = (add[k + 'Pct'] || 0) + int;
    st.weapon = weapon ? itemDmg(weapon) : [1, 3];
    if (weapon) { const fd = add.flatDmg || 0; st.weapon = [st.weapon[0] + fd, st.weapon[1] + fd]; }
    const lifePct = (add.lifePct || 0) + buffLife;
    this.maxHp = Math.round((C.life + (c.level - 1) * C.lifeLvl + vit * 3 + (add.life || 0)) * (1 + lifePct / 100));
    this.maxMana = Math.round(C.mana + (c.level - 1) * C.manaLvl + int * 2 + (add.mana || 0));
    st.lifeRegen = 0.6 + c.level * 0.12 + vit * 0.05 + (add.lifeRegen || 0) + this.maxHp * st.regenPct / 100;
    st.manaRegen = 1.6 + c.level * 0.15 + int * 0.06 + (add.manaRegen || 0);
    this.st = st;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    if (this.mana > this.maxMana) this.mana = this.maxMana;
    this.speed = 4.2 * (1 + st.moveSpeed / 100);
    this.ghost = !!legendary.wraith && false;
    this.dirty = false;
  }

  skillLevel(sk) { return effLevel(this, sk); }

  synergy(sk) {
    let pts = 0;
    for (const s of CLASS_SKILLS[this.classId]) if (s.tree === sk.tree && s.id !== sk.id) pts += this.char.skills[s.id] || 0;
    return 1 + pts * 0.03;
  }

  skillDamage(sk, L) {
    const st = this.st;
    const base = skillBaseDamage(sk, L);
    const wc = weaponCoef(sk);
    const elBonus = sk.el === 'phys' ? st.physPct : st.elemPct[sk.el] || 0;
    let mult = (1 + (st.dmgPct + st.primary + elBonus) / 100) * this.synergy(sk);
    if (st.legendary.berserk) mult *= 1 + 0.04 * Math.floor((1 - this.hp / this.maxHp) * 10);
    const lo = (base * 0.85 + st.weapon[0] * wc) * mult, hi = (base * 1.15 + st.weapon[1] * wc) * mult;
    return [Math.max(1, Math.round(lo)), Math.max(2, Math.round(hi))];
  }

  heal(n, quiet) {
    if (this.dead || n <= 0) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (!quiet && this.hp - before > 1) floatText(this.x, this.y, 50, '+' + Math.round(this.hp - before), '#60ff60', 13);
  }

  addBuff(b) {
    const old = this.buffs.find((x) => x.id === b.id);
    if (old) { Object.assign(old, b); this.recompute(); return old; }
    this.buffs.push(b);
    this.recompute();
    return b;
  }

  // ------------------------------------------------------------------ progression
  gainXp(n) {
    const c = this.char;
    if (c.level >= MAX_LEVEL) return;
    const depth = (this.world && this.world.depth) || 1;
    const diff = c.level - depth;
    const pen = diff > 5 ? Math.max(0.1, 1 - (diff - 5) * 0.1) : 1;
    c.xp += Math.round(n * pen * (1 + this.st.xpPct / 100));
    while (c.level < MAX_LEVEL && c.xp >= xpToNext(c.level)) {
      c.xp -= xpToNext(c.level);
      this.levelUp();
    }
  }
  levelUp() {
    const c = this.char;
    c.level++;
    c.statPoints += 5;
    c.skillPoints += 1;
    const granted = this.applyGrants();
    this.recompute();
    this.hp = this.maxHp; this.mana = this.maxMana;
    addEffect(new Column(this.x, this.y, '#ffd860', 1, 40, 320));
    addEffect(new Ring(this.x, this.y, 0.2, 3, 0.8, '#ffd860', 5));
    sparkle(this.x, this.y, 30, '#ffe080', 30, 0.8);
    sfx('levelup');
    if (G.ui) {
      G.ui.centerMsg(`LEVEL ${c.level}`, '+5 attribute points · +1 skill point');
      for (const id of granted) G.ui.log(`New ability learned: <b>${SKILLS[id].name}</b>`, '#ffd860');
      G.ui.refresh();
    }
  }
  /** Grant default class abilities for the current level. Returns newly granted ids. */
  applyGrants() {
    const c = this.char;
    const out = [];
    for (const id of grantedSkillsAt(this.classId, c.level)) {
      if (!c.granted[id]) {
        c.granted[id] = true;
        if (!c.skills[id]) { c.skills[id] = 1; out.push(id); }
        // auto-slot into the first free bar slot
        if (!c.bar.includes(id)) {
          const free = c.bar.findIndex((x, i) => !x && i !== 0);
          if (free >= 0) c.bar[free] = id;
        }
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ items & potions
  pickup(g) {
    const c = this.char;
    switch (g.kind) {
      case 'gold':
        c.gold += g.amount; sfx('gold');
        floatText(this.x, this.y, 46, `+${g.amount} gold`, '#ffd34a', 12);
        return true;
      case 'orb_hp': this.heal(this.maxHp * 0.15); sfx('orb'); return true;
      case 'orb_mp': this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.18); sfx('orb'); floatText(this.x, this.y, 46, '+mana', '#6a8aff', 11); return true;
      case 'potion':
        if ((c.potions[g.item.kind] || 0) >= 30) { if (g.t > 0.6 && !g.warned) { g.warned = true; floatText(this.x, this.y, 50, 'Potion belt full', '#ccc', 11); } return false; }
        c.potions[g.item.kind] = (c.potions[g.item.kind] || 0) + 1; sfx('pickup');
        G.ui && G.ui.refresh();
        return true;
      case 'item': {
        const ok = addToBag(c, g.item);
        if (!ok) { if (!g.warned) { g.warned = true; floatText(this.x, this.y, 50, 'Inventory full', '#ff8080', 12); sfx('error'); } return false; }
        sfx('pickup');
        if (G.ui) { G.ui.log(`Picked up <span style="color:${g.color}">${g.label}</span>`); G.ui.refresh(); }
        return true;
      }
    }
    return false;
  }

  usePotion(kind) {
    const c = this.char;
    if (this.dead || this.potionCd > 0) return;
    if (!c.potions[kind]) { floatText(this.x, this.y, 50, 'No potions', '#ccc', 11); sfx('error'); return; }
    c.potions[kind]--;
    this.potionCd = 0.4;
    sfx('potion');
    switch (kind) {
      case 'hp': this.potionRegen.push({ hp: this.maxHp * 0.45 / 2, mp: 0, t: 2 }); break;
      case 'mp': this.potionRegen.push({ hp: 0, mp: this.maxMana * 0.5 / 2, t: 2 }); break;
      case 'rejuv': this.heal(this.maxHp * 0.35); this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.35); break;
      case 'fury':
        this.furyT = 15;
        this.addBuff({ id: 'fury', name: 'Elixir of Fury', el: 'fire', stats: { as: 30 }, t: 15, max: 15 });
        burst(this.x, this.y, 20, 'fire', 20, 3);
        break;
    }
    const col = { hp: '#ff3030', mp: '#4060ff', rejuv: '#c040ff', fury: '#ffa020' }[kind];
    sparkle(this.x, this.y, 20, col, 12, 0.4);
    G.ui && G.ui.refresh();
  }

  // ------------------------------------------------------------------ skills
  canUse(sk) {
    const L = this.skillLevel(sk);
    if (!L) return 'unlearned';
    if ((this.cooldowns[sk.id] || 0) > 0) return 'cooldown';
    if (this.mana < manaCost(sk, L)) return 'mana';
    return null;
  }

  tryUseSkill(sk, tx, ty, target = null) {
    if (this.dead || !sk) return false;
    if (this.castLock > 0) { this.queued = { sk, tx, ty, target }; return false; }
    if (this.channel) {
      if (!(this.channel instanceof BeamCh)) return false;
      this.channel = null; // re-casting cancels a channelled beam
    }
    const L = this.skillLevel(sk);
    if (!L) return false;
    if ((this.cooldowns[sk.id] || 0) > 0) return false;
    const cost = manaCost(sk, L);
    if (this.mana < cost) {
      if ((this.noManaT || 0) <= 0) { floatText(this.x, this.y, 60, 'Not enough mana', '#6a8aff', 12); sfx('error'); this.noManaT = 0.8; }
      return false;
    }
    // melee needs to be in range of a clicked monster
    if (sk.kind === 'melee' && target && !target.dead) {
      const reach = skillRange(sk) + target.r;
      if (dist(this.x, this.y, target.x, target.y) > reach + 0.2) {
        this.attackTarget = { sk, target };
        this.moveTarget = null; this.path = null;
        return false;
      }
      tx = target.x; ty = target.y;
    }
    this.mana -= cost;
    if (this.st.legendary.surge && chance(0.15)) { this.mana += cost; sparkle(this.x, this.y, 30, '#c060ff', 6, 0.3); }
    const spd = sk.attack ? this.st.atkSpeed : this.st.castSpeed;
    this.castLock = useTime(sk) / (1 + spd / 100);
    this.cooldowns[sk.id] = cooldown(sk) * (1 - this.st.cdr / 100);
    this.aim = [tx, ty];
    this.lastEl = sk.el;
    const ok = castSkill(this, sk, L, tx, ty);
    if (ok === false) { this.mana += cost; this.cooldowns[sk.id] = 0; return false; }
    if (this.st.echoChance && chance(this.st.echoChance / 100) && sk.kind !== 'summon' && sk.kind !== 'buff') {
      this.world.addHazard(new Timer(0.2, () => { if (!this.dead) { castSkill(this, sk, L, this.aim ? this.aim[0] : tx, this.aim ? this.aim[1] : ty, { echo: true }); floatText(this.x, this.y, 64, 'Echo!', '#ff80ff', 11); } }));
    }
    this.moving = false;
    return true;
  }

  onHit(tgt, dmg) {
    if (this.st.legendary.hammer && ++this.hitCounter % 6 === 0) {
      this.world.addHazard(new Orbit({ world: this.world, src: this, n: 1, radius: 1.6, dur: 2.5, spiral: true, fx: 'hammer', el: 'holy', dmg: [dmg * 0.5, dmg * 0.7], o: {}, speed: 5 }));
    }
  }

  // ------------------------------------------------------------------ death
  die(src) {
    if (this.st.legendary.phoenix && this.phoenixCd <= 0) {
      this.phoenixCd = 90;
      this.hp = this.maxHp * 0.5;
      addEffect(new Column(this.x, this.y, '#ff8020', 1, 50, 300));
      burst(this.x, this.y, 20, 'fire', 40, 5);
      floatText(this.x, this.y, 70, 'PHOENIX!', '#ffa020', 20, { life: 1.5 });
      sfx('roar');
      return;
    }
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.channel = null;
    sfx('die');
    if (G.game) G.game.onPlayerDeath(src);
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    const st = this.st;
    this.animT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.noManaT > 0) this.noManaT -= dt;
    if (this.phoenixCd > 0) this.phoenixCd -= dt;
    if (this.furyT > 0) this.furyT -= dt;
    const canAct = this.tickStatus(dt, (k, amount, src) => {
      hit(src, this, amount, k === 'burn' ? 'fire' : k === 'poison' ? 'poison' : 'blood', { dot: true });
    });
    if (this.dead) return;
    // regen
    if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + st.lifeRegen * dt);
    if (this.mana < this.maxMana) this.mana = Math.min(this.maxMana, this.mana + st.manaRegen * dt);
    for (let i = this.potionRegen.length - 1; i >= 0; i--) {
      const r = this.potionRegen[i];
      const k = Math.min(dt, r.t);
      this.hp = Math.min(this.maxHp, this.hp + r.hp * k);
      this.mana = Math.min(this.maxMana, this.mana + r.mp * k);
      r.t -= dt;
      if (r.t <= 0) this.potionRegen.splice(i, 1);
    }
    if (this.potionCd > 0) this.potionCd -= dt;
    // buffs
    let changed = false;
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      b.t -= dt;
      if (b.pulse) {
        b.pulse.acc += dt;
        if (b.pulse.acc >= 1) {
          b.pulse.acc -= 1;
          const E = elem(b.el);
          addEffect(new Ring(this.x, this.y, 0.3, 2.6, 0.4, E.glow, 3));
          aoe(this.world, this, this.x, this.y, 2.6, rand(b.pulse.dmg[0], b.pulse.dmg[1]), b.el, { dot: false, slow: b.slowPulse });
        }
      }
      if (b.t <= 0) { this.buffs.splice(i, 1); changed = true; }
    }
    if (changed) this.recompute();
    this.scale = this.buffs.some((b) => b.transform) ? 1.22 : 1;
    for (const k in this.cooldowns) if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;
    if (this.castLock > 0) {
      this.castLock -= dt;
      if (this.castLock <= 0 && this.queued) { const q = this.queued; this.queued = null; this.tryUseSkill(q.sk, q.tx, q.ty, q.target); }
    }
    // legendary passives
    if (st.legendary.orbit && !this.world.hazards.some((h) => h.legendaryOrbit && !h.dead)) {
      const d = this.skillDamage(SKILLS[`${this.classId}.0.0`], Math.max(1, this.char.skills[`${this.classId}.0.0`] || 1));
      const o = new Orbit({ world: this.world, src: this, n: 3, radius: 1.5, dur: 1e9, fx: 'blade', el: 'arcane', dmg: d.map((v) => v * 0.4), o: {} });
      o.legendaryOrbit = true;
      this.world.addHazard(o);
    }
    if (st.legendary.inferno && this.moving) {
      this.infernoT -= dt;
      if (this.infernoT <= 0) {
        this.infernoT = 0.3;
        const d = this.skillDamage(SKILLS[`${this.classId}.0.0`], 1);
        this.world.addHazard(new Area({ world: this.world, src: this, x: this.x, y: this.y, r: 0.7, dur: 2, tick: 0.5, dmg: d.map((v) => v * 0.3), el: 'fire', fx: 'fire' }));
      }
    }
    if (!canAct) { this.moving = false; return; }
    if (this.channel) return;
    // movement
    this.moving = false;
    if (this.castLock > 0) return;
    const [vx, vy] = this.moveVec;
    if (vx || vy) {
      this.moveTarget = null; this.path = null; this.attackTarget = null; this.interact = null;
      const sp = this.speed * this.speedMul();
      const moved = this.world.map.move(this, vx * sp * dt, vy * sp * dt, false);
      this.moving = moved;
      this.face(Math.atan2(vy, vx));
      return;
    }
    if (this.attackTarget) {
      const { sk, target } = this.attackTarget;
      if (target.dead) { this.attackTarget = null; return; }
      if (dist(this.x, this.y, target.x, target.y) <= skillRange(sk) + target.r) {
        this.attackTarget = null;
        this.tryUseSkill(sk, target.x, target.y, target);
        return;
      }
      this.walkTo(target.x, target.y, dt);
      return;
    }
    if (this.interact) {
      const t = this.interact;
      if (dist(this.x, this.y, t.x, t.y) <= (t.reach || 1.4)) { this.interact = null; this.moveTarget = null; this.path = null; t.use(); return; }
      this.walkTo(t.x, t.y, dt);
      return;
    }
    if (this.moveTarget) this.walkTo(this.moveTarget[0], this.moveTarget[1], dt);
  }

  setMoveTarget(x, y) {
    this.moveTarget = [x, y];
    this.path = null;
    this.pathFor = null;
  }

  walkTo(x, y, dt) {
    const m = this.world.map;
    const key = Math.floor(x) + ',' + Math.floor(y);
    if (!this.path || this.pathFor !== key) {
      this.pathFor = key;
      this.path = m.losWide(this.x, this.y, x, y) ? [[x, y]] : m.findPath(this.x, this.y, x, y, 2500) || [[x, y]];
    }
    const node = this.path[0];
    if (!node) { this.moveTarget = null; return; }
    const sp = this.speed * this.speedMul();
    const rem = this.moveToward(node[0], node[1], dt, sp);
    if (rem < 0.08 || (!this.moving && rem < 0.6)) {
      this.path.shift();
      if (!this.path.length) { this.moveTarget = null; this.path = null; }
    } else if (!this.moving) {
      this.stuckT = (this.stuckT || 0) + dt;
      if (this.stuckT > 0.4) { this.stuckT = 0; this.moveTarget = null; this.path = null; }
    }
  }
}

/** Put an item in the first free bag slot (gems stack). */
export function addToBag(c, item) {
  if (item.type === 'gem') {
    const same = c.bag.find((b) => b && b.type === 'gem' && b.gem === item.gem && b.tier === item.tier);
    if (same) { same.count = (same.count || 1) + (item.count || 1); return true; }
  }
  const i = c.bag.findIndex((b) => !b);
  if (i < 0) return false;
  c.bag[i] = item;
  return true;
}

export { GEMS, TAU, angleTo, spawn };
