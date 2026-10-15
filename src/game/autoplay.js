// Auto-play: an AI that plays the hero. It spends skill and attribute points, keeps the skill bar sorted, fights
// with every skill on the bar (dodging telegraphed attacks, kiting with ranged builds, drinking potions), loots,
// equips upgrades and sockets gems, then shops in town (sell, potions, gear, gems, sockets, upgrades, enchants,
// gambling) and keeps delving. Toggled by the HUD's Auto button or P. Gear, stats and skills are judged by
// simulation: apply the change, recompute the hero, score the result with charScore(), undo.
import { G } from '../state.js';
import { input } from '../core/input.js';
import { dist, clamp, TAU, fmtInt, escapeHtml, angleDiff } from '../core/util.js';
import { SKILLS, CLASS_SKILLS, MAX_SKILL_LEVEL, manaCost, rageCost, cooldown, useTime, skillRange, buffAmount, curseAmount, skillDuration, effLevel } from '../data/skills.js';
import { SUMMONS } from '../data/summons.js';
import { SLOTS, RING_SLOTS, itemValue, itemName, itemColor, upgradeCost, socketCost, enchantCost, unsocketCost, addAffix, makeGem, RARITY, POTION_PRICE, GEMS } from '../data/items.js';
import { drawBiome } from '../data/biomes.js';
import { augHits } from '../data/rings.js';
import { canLearn } from '../ui/skills.js';
import { equipFromBag, socketGem, dropFromBag, changed } from '../ui/inventory.js';
import { Vendor, fuseAll } from '../ui/vendor.js';
import { Stash, addToStash } from '../ui/stash.js';
import { addToBag } from './player.js';
import { Delayed, Area, Whirl } from './hazards.js';
import { effects, Telegraph } from '../gfx/vfx.js';
import { BAR_SIZE, LMB, RMB, FILL_ORDER, SLOT_KEYS } from '../data/bar.js';

const OFFENSIVE = new Set(['melee', 'proj', 'nova', 'aoe', 'beam', 'chain', 'wall', 'zone', 'orbit', 'cyclone', 'whirl', 'leap', 'dash', 'trap', 'rain', 'strike', 'fissure', 'corpse']);
const CROWD = 2.2; // enemies a typical cast is expected to reach, for planning
const CC = new Set(['fear', 'freeze', 'confuse', 'charm', 'stun']);
const POT_TARGET = { hp: 16, mp: 8, rejuv: 4, fury: 2 };

// ================================================================== power model
const isWide = (sk) => (sk.m.arc ?? (sk.m.cleave ? 170 : sk.fx === 'spin' ? 360 : 115)) >= 170;
/** Expected hits per cast against `crowd` enemies near the target (very rough, per skill kind). */
function hitsPerCast(sk, crowd) {
  const m = sk.m, n = m.n || 1, extra = Math.max(0, crowd - 1);
  switch (sk.kind) {
    case 'melee': return n * (isWide(sk) ? Math.min(crowd, 2.4) : 1.1) * (m.exp ? 1 + extra * 0.4 : 1) * (m.chain ? 1 + Math.min(m.chain, extra + 1) * 0.4 : 1);
    case 'proj': {
      let h = m.ring ? Math.max(1, n * 0.18 * crowd) : n > 1 ? 1 + (Math.min(n, crowd * 1.5) - 1) * 0.5 : 1;
      if (m.pierce) h *= 1 + extra * 0.35;
      if (m.exp) h *= 1 + extra * 0.45;
      if (m.bounce) h *= 1 + Math.min(m.bounce, extra + 1) * 0.5;
      if (m.chain) h *= 1 + Math.min(m.chain, extra + 1) * 0.5;
      if (m.split) h *= 1.25;
      return h;
    }
    case 'nova': return (m.n || 1) * crowd * 0.9;
    case 'aoe': return m.n && m.dur ? m.n * 0.5 * crowd * 0.8 : m.dur ? (m.dur / 0.3) * 0.4 * crowd * 0.7 : crowd;
    case 'beam': return m.dur ? (m.dur / 0.13) * 0.32 * Math.min(crowd, 1.6) : 1 + extra * 0.4;
    case 'chain': return 1 + Math.min(m.n || 4, extra + 2) * 0.6;
    case 'wall': return m.block ? 0.4 : m.ring ? 2 * crowd : 1.2 * crowd; // monsters walk through a wall, or are kept out by it
    case 'zone': return (Math.min(m.dur || 5, 3) / 0.5) * (m.follow ? 0.45 : 0.35) * crowd;
    case 'orbit': return (m.n || 3) * (m.dur || 4) * 0.35 * Math.min(crowd, 2);
    case 'cyclone': return n * ((m.dur || 3.5) / 0.25) * 0.12 * crowd;
    case 'whirl': return ((m.dur || 2) / 0.22) * 0.6 * Math.min(crowd, 2.5);
    case 'leap': return crowd;
    case 'dash': return n * Math.min(crowd, 2);
    case 'blink': return m.nova ? crowd * 0.8 : 0;
    case 'trap': return n * Math.min(crowd, 2) * 0.6;
    case 'rain': return n * 0.3 * Math.min(crowd, 2.5);
    case 'strike': return n * 0.9;
    case 'fissure': return n * 1.1 * Math.min(crowd, 2);
    case 'corpse': return (m.n || 3) * 0.8;
  }
  return 0;
}
/** Seconds the hero is busy casting it (channels and whirls last their whole duration). */
function castTime(p, sk) {
  const spd = sk.attack ? p.st.atkSpeed : p.st.castSpeed;
  let t = useTime(sk) / (1 + spd / 100);
  if ((sk.kind === 'beam' && sk.m.dur) || sk.kind === 'whirl') t = Math.max(t, sk.m.dur || 2);
  return t;
}
/** How far a skill really reaches (returning projectiles turn back halfway). */
const reachOf = (sk) => skillRange(sk) * (sk.kind === 'proj' && sk.m.ret ? 0.48 : 1);
/** How close the hero should stand to use a skill on target t. bold (0..1, Auto.boldness): ranged builds close in. */
function engageRange(sk, t, bold = 0) {
  if (!sk) return 1.5;
  switch (sk.kind) {
    case 'melee': return skillRange(sk) + t.r;
    case 'whirl': case 'nova': return 2;
    case 'orbit': return sk.m.shields ? 1.1 : 2;
    case 'zone': return sk.m.follow ? 1.8 : 7;
    case 'wall': return sk.m.ring ? 2 : 6;
    case 'leap': case 'dash': return Math.min(skillRange(sk), 5);
  }
  const r = reachOf(sk);
  return Math.max(Math.min(r * 0.8, 2.6), Math.min(r * (0.8 - 0.4 * bold), 8 - 2.5 * bold));
}
const cdOf = (p, sk) => cooldown(sk) * (1 - p.st.cdr / 100);
const avg = (d) => (d[0] + d[1]) / 2;
const critMul = (p) => 1 + (p.st.critChance / 100) * (p.st.critDmg / 100);
const summonMax = (sk) => sk.m.max || sk.m.n || 1;

// ================================================================== build focus
// How the user wants some classes played on auto-play. Pet classes raise as many minions as they can (every summon
// skill that fits under the minion cap, kept up at all times); the Paladin builds around his hammers: Blessed Hammer
// and Hammerstorm (hammers spiralling out around him) as the main attack, Wheel of Hammers (six hammers circling him)
// fired whenever it is ready, and Hammer of the Gods. Only skill spending and the bar use it (focus = true); the
// HUD's DPS and gear choices (charScore) stay unbiased.
export const PET_CLASSES = new Set(['necromancer', 'totem_master', 'carrion_witch', 'slime_lord', 'ranger', 'gunner']);
const PET_CAP = 40; // createSummon keeps at most 40 minions per hero; more would only kill the oldest
const isHammer = (sk) => sk.fx === 'hammer' || /hammer/i.test(sk.name);
const petsOf = (sk) => (sk.m.sum === 'revive' ? 0 : summonMax(sk));
/** Skills a class pours its points into first, when it can (the Paladin's hammers), or null. */
const focusSkills = (classId) => {
  const list = CLASS_SKILLS[classId];
  if (classId === 'paladin') return list.filter(isHammer);
  if (classId === 'barbarian') return list.filter((sk) => sk.kind === 'whirl' || sk.kind === 'leap' || sk.kind === 'dash' || sk.name === 'Earthquake');
  if (classId === 'lancer') return list.filter((sk) => sk.m.shields || sk.kind === 'leap' || sk.kind === 'dash');
  if (classId === 'dragoon') return list.filter((sk) => sk.kind === 'leap' || sk.kind === 'dash');
  return null;
};
const mobility = (sk) => ['leap', 'dash', 'blink'].includes(sk.kind) ||
  (sk.kind === 'buff' && (sk.m.buff || []).includes('speed'));
/** Value multiplier for a skill under the class's build focus. */
function focusMul(classId, sk) {
  if (classId === 'paladin') return isHammer(sk) ? (sk.kind === 'orbit' ? 4 : 2.5) : 1;
  if (classId === 'barbarian') return sk.kind === 'whirl' ? 6 : mobility(sk) ? 1.8 : 1;
  if (classId === 'lancer') return sk.m.shields ? 5 : mobility(sk) ? 1.8 : 1;
  if (classId === 'dragoon') return sk.kind === 'leap' ? 5 : mobility(sk) ? 1.8 : 1;
  if (PET_CLASSES.has(classId) && sk.kind === 'summon') return sk.m.dur ? 2.5 : 4;
  return 1;
}

/** Damage per second one skill adds when used as often as its cast time, cooldown and mana allow. */
function skillDps(p, sk, L, crowd = CROWD) {
  const per = avg(p.skillDamage(sk, L)) * hitsPerCast(sk, crowd) * critMul(p);
  const period = Math.max(castTime(p, sk), cdOf(p, sk), 0.05);
  const cost = manaCost(sk, L), rage = rageCost(sk);
  const supply = p.st.manaRegen + p.maxMana / 40;
  const sustain = cost ? Math.min(1, supply / (cost / period)) :
    rage ? Math.min(1, 12 / (rage / period)) : 1;
  return { dps: per / period, sustain, period };
}

/**
 * The hero's damage output with the current skills and gear: the best spammable skill (topped up by the free skill
 * when mana runs dry), plus every cooldown skill, minion, buff and curse that fits on the 15-slot bar.
 * Returns { total, parts:[{sk, v, role}] } with parts sorted by value. `only` (a Set of skill ids) limits it to those.
 */
export function buildPower(p, crowd = CROWD, only = null, focus = false) {
  const c = p.char;
  const fm = (sk) => (focus ? focusMul(c.classId, sk) : 1);
  const learned = CLASS_SKILLS[c.classId].filter((s) => (c.skills[s.id] || 0) > 0 && (!only || only.has(s.id)));
  const spam = [], parts = [];
  for (const sk of learned) {
    if (!OFFENSIVE.has(sk.kind) || sk.kind === 'corpse') continue;
    const L = effLevel(p, sk);
    const r = skillDps(p, sk, L, crowd);
    if (cooldown(sk) >= 1.2) parts.push({ sk, v: r.dps * r.sustain * 0.85 * fm(sk), role: 'cd' });
    else spam.push({ sk, v: r.dps * fm(sk), sustain: r.sustain });
  }
  spam.sort((a, b) => b.v * b.sustain - a.v * a.sustain);
  let base = 0;
  if (spam.length) {
    const best = spam[0];
    const free = spam.filter((s) => !manaCost(s.sk, 1)).sort((a, b) => b.v - a.v)[0];
    base = best.v * best.sustain + (best.sustain < 1 && free && free !== best ? (1 - best.sustain) * free.v : 0);
    parts.push({ sk: best.sk, v: base, role: 'main' });
    if (spam[1]) parts.push({ sk: spam[1].sk, v: spam[1].v * spam[1].sustain * 0.15, role: 'alt' });
    if (best.sustain < 1 && free && free !== best && free !== spam[1]) parts.push({ sk: free.sk, v: 0.01, role: 'filler' });
  }
  const ref = Math.max(base, 1);
  for (const sk of learned) {
    const L = effLevel(p, sk), m = sk.m;
    if (sk.kind === 'corpse') parts.push({ sk, v: skillDps(p, sk, L, crowd).dps * 0.35, role: 'cd' });
    else if (sk.kind === 'summon') {
      const def = SUMMONS[m.sum] || { dmg: 1, atk: { cd: 1 } };
      const n = m.sum === 'revive' ? (m.n || 1) * 0.5 : summonMax(sk);
      const up = m.dur ? Math.min(1, m.dur / Math.max(m.dur, cooldown(sk) * (1 - p.st.cdr / 100), 1)) : 1;
      const one = avg(p.skillDamage(sk, L)) * (def.dmg || 1) * (1 + (p.st.summonPct || 0) / 100) / ((def.atk && def.atk.cd) || 1);
      // under a pet focus every extra minion counts on its own too
      const pets = focus && PET_CLASSES.has(c.classId) ? ref * 0.12 * petsOf(sk) * up : 0;
      parts.push({ sk, v: (one * n * up * 0.55 + ref * 0.05) * fm(sk) + pets, role: 'summon' });
    } else if (sk.kind === 'buff') {
      const amt = buffAmount(sk, L) / 100, dur = skillDuration(sk, L);
      const up = Math.min(1, dur / Math.max(dur, cooldown(sk) * (1 - p.st.cdr / 100)));
      let v = 0;
      for (const b of m.buff || ['dmg']) v += (b === 'dmg' || b === 'as') ? amt : b === 'crit' ? amt * 0.15 : amt * 0.25;
      if (m.pulse) v += avg(p.skillDamage(sk, L)) * crowd / ref;
      parts.push({ sk, v: ref * v * up * (m.party ? 1.1 : 1), role: 'buff' });
    } else if (sk.kind === 'curse') {
      const amt = curseAmount(sk, L) / 100;
      let v = 0;
      for (const k of m.curse || ['amp']) v += k === 'amp' || k === 'mark' ? amt * 0.6 : ['decay', 'bomb', 'doom'].includes(k) ? avg(p.skillDamage(sk, L)) * crowd * 0.15 / ref : 0.06;
      parts.push({ sk, v: ref * v, role: 'curse' });
    } else if (sk.kind === 'heal') {
      parts.push({ sk, v: ref * 0.12 * ((m.amt || 20) / 20) * (1 + 0.04 * (L - 1)), role: 'heal' });
    } else if (sk.kind === 'blink') {
      parts.push({ sk, v: ref * 0.04 + (m.nova ? skillDps(p, sk, L, crowd).dps * 0.3 : 0), role: 'move' });
    }
  }
  parts.sort((a, b) => b.v - a.v);
  if (focus && PET_CLASSES.has(c.classId)) { // summons past the minion cap would only replace each other
    let pets = 0;
    for (const x of parts) if (x.role === 'summon') { pets += petsOf(x.sk); if (pets > PET_CAP) x.v *= 0.05; }
    parts.sort((a, b) => b.v - a.v);
  }
  const kept = parts.slice(0, BAR_SIZE);
  return { total: kept.reduce((a, x) => a + x.v, 0), parts: kept };
}

const DAMAGE_ROLES = new Set(['main', 'alt', 'cd', 'summon']);
/**
 * The HUD's sheet numbers. dps: what the skill bar deals to one target per second at the current stats (crits,
 * attack/cast speed, cooldowns, mana and minions included). atk: the average hit of the main attack, crits included.
 */
export function heroDamage(p) {
  const bar = p.char.bar.filter((id) => id && SKILLS[id]);
  const { parts } = buildPower(p, 1, new Set(bar));
  const dps = parts.reduce((a, x) => a + (DAMAGE_ROLES.has(x.role) ? x.v : 0), 0);
  const lmb = SKILLS[p.char.bar[0]];
  const main = lmb && OFFENSIVE.has(lmb.kind) ? lmb : (parts.find((x) => x.role === 'main') || {}).sk || SKILLS[`${p.classId}.0.0`];
  const atk = main ? avg(p.skillDamage(main, Math.max(1, effLevel(p, main)))) * critMul(p) : 0;
  return { dps, atk };
}

/** One number for "how strong is the hero": log offense + log effective life + a little utility. */
export function charScore(p) {
  const st = p.st, lvl = Math.max(1, (G.char && G.char.depth) || 1, p.char.level);
  const off = buildPower(p, CROWD, null, true).total; // attributes and gear follow the build focus too
  const armK = st.armor / (st.armor + 30 + lvl * 18);
  const res = ['fire', 'cold', 'light', 'poison'].reduce((a, k) => a + clamp(st.res[k], -100, 75), 0) / 4 / 100;
  const taken = (1 - armK) * 0.5 + (1 - res) * 0.4 + (1 - clamp(st.res.magic, -100, 75) / 100) * 0.1;
  const ehp = (p.maxHp / Math.max(0.1, taken) / (1 - Math.min(0.6, st.block / 100))) * (1 + Math.min(st.lifeSteal, 15) * 0.03) + st.lifeRegen * 10;
  return Math.log(off + 1) + 0.8 * Math.log(ehp + 1) + 0.15 * Math.log(p.maxMana + 10) + augScore(p)
    + st.moveSpeed * 0.003 + st.magicFind * 0.0008 + st.goldFind * 0.0003 + st.xpPct * 0.002;
}

/** What the ring augments on the bar's skills are worth (they change how skills play, so buildPower can't see them). */
function augScore(p) {
  if (!p.augs || !p.augs.length) return 0;
  const bar = p.char.bar.filter(Boolean).map((id) => SKILLS[id]).filter(Boolean);
  let v = 0;
  for (const a of p.augs) { const n = bar.filter((sk) => augHits(a, sk)).length; if (n) v += a.pow * (0.12 + 0.03 * Math.min(4, n - 1)); }
  return v;
}
/** Score with item `it` equipped (a ring tries each ring slot): {s, slot}. */
function fitScore(p, it) {
  const c = p.char;
  let best = { s: -Infinity, slot: it.slot };
  for (const slot of it.slot === 'ring' ? RING_SLOTS : [it.slot]) {
    const s = simulate(p, () => { const old = c.equip[slot]; c.equip[slot] = it; return () => { c.equip[slot] = old; }; });
    if (s > best.s) best = { s, slot };
  }
  return best;
}

/** buildPower with one more point in each skill of `chain`. */
function buildPowerWith(p, chain) {
  const c = p.char;
  for (const s of chain) c.skills[s.id] = (c.skills[s.id] || 0) + 1;
  const v = buildPower(p, CROWD, null, true).total;
  for (const s of chain) if (!--c.skills[s.id]) delete c.skills[s.id];
  return v;
}
const mainTree = (p) => { const sk = SKILLS[p.char.bar[0]]; return sk ? sk.tree : 0; };

/** Score the hero after mutate() (which returns an undo function), then put everything back. */
function simulate(p, mutate) {
  const hp = p.hp, mana = p.mana;
  const undo = mutate();
  p.recompute();
  const s = charScore(p);
  undo();
  p.recompute();
  p.hp = Math.min(hp, p.maxHp); p.mana = Math.min(mana, p.maxMana);
  return s;
}

// ================================================================== small helpers
function bagFree(c) { return c.bag.reduce((a, b) => a + (b ? 0 : 1), 0); }
function sellPrice(it) { return Math.max(1, Math.floor(itemValue(it) / 4)) * (it.type === 'gem' ? (it.count || 1) : 1); }
function vendorNpc(w, id) { return w.npcs.find((n) => n.vendor && n.vendor.id === id); }
function potionPrice(k, c) { return Math.round(POTION_PRICE[k] * (1 + c.level * 0.08)); }
function enemyNear(w, p, r) { return w.hostiles('player', p.x, p.y, r).filter((m) => !m.dead && m.team === 'enemy'); }
function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

// ================================================================== the bot
export const Auto = {
  on: false,
  status: '',
  overrideT: 0,

  toggle(v = !this.on) {
    this.on = v;
    this.errors = 0;
    this.reset();
    const p = G.player;
    if (!v && p) { p.moveVec = [0, 0]; p.lootTarget = null; p.whirlAuto = false; }
    if (v && G.ui) G.ui.log(`<b>Auto-play on.</b> ${G.touch ? 'Use the controls to take over for a moment; tap Auto to stop.' : 'Move or click to take over for a moment; P or the Auto button stops it.'}`, '#8fe0ff');
    else if (G.ui) G.ui.log('Auto-play off.', '#8fe0ff');
    this.setStatus(v ? 'Thinking…' : '');
    const btn = document.getElementById('auto-btn');
    if (btn) btn.classList.toggle('on', v);
  },

  reset() {
    this.world = null; this.nav = null; this.path = null; this.goal = null; this.thinkT = 0; this.navT = 0;
    this.town = null; this.transitT = 0; this.stuck = { t: 0, x: 0, y: 0, n: 0 }; this.jiggle = null;
    this.target = null; this.dodge = null; this.retreat = false; this.ignore = new WeakSet(); this.lastSig = '';
    this.screenT = 0; this.lastCast = {}; this.stall = null; this.banT = 0; this.shun = new WeakMap(); this.giveUp = new WeakSet();
    this.lootFor = null; this.lootT = 0; this.wantCache = new WeakMap(); this.hurt = 0; this.lastHp = -1;
  },

  setStatus(s) {
    if (s === this.status) return;
    this.status = s;
    const el = document.getElementById('auto-status');
    if (el) { el.textContent = s ? `AUTO · ${s}` : ''; el.classList.toggle('hidden', !this.on); }
  },

  /** Did the player touch the controls this frame? (checked before controls.update eats the input) */
  noteInput() {
    if (!this.on) return;
    const k = input.keys;
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ...SLOT_KEYS.filter(Boolean)];
    if (input.joy.active || input.worldTouch || keys.some((x) => k.has(x)) || ((input.mouse.left || input.mouse.right) && input.mouse.inside && input.lastPointerType === 'mouse')) this.overrideT = 1.5;
  },

  // ---------------------------------------------------------------- main tick (after controls.update)
  update(dt) {
    if (!this.on) return;
    // a bug in the bot must never stop the world from updating
    try { this.tick(dt); } catch (e) {
      console.error('auto-play:', e);
      this.path = null; this.nav = null;
      // skip the town errand that failed instead of starting the whole shopping round over
      if (this.town) {
        const st = this.town.steps[this.town.i];
        if (st) G.ui.log(`Auto-play hit a snag (${escapeHtml(st.label.toLowerCase())}) and moved on.`, '#ff8080');
        this.town.i++; this.town.phase = 'walk'; this.town.t = 0;
        try { G.ui.closeAll(); } catch (e2) { /* ignore */ }
      }
      if (++this.errors > 20) { this.toggle(false); G.ui.log('Auto-play stopped after repeated errors.', '#ff8080'); }
    }
  },
  tick(dt) {
    const p = G.player, w = G.world, c = G.char;
    if (!p || !w || !c) return;
    if (w !== this.world) { const keep = this.ignore; this.reset(); this.ignore = keep; this.world = w; }
    p.whirlAuto = this.overrideT <= 0;
    if (this.handleScreens(dt)) return;
    if (p.dead) { this.setStatus('Fallen…'); return; }
    if (this.transitT > 0) { this.transitT -= dt; this.setStatus('Travelling…'); return; }
    if (this.overrideT > 0) { p.whirlAuto = false; this.overrideT -= dt; this.setStatus('Manual control'); return; }
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 1; this.manageHero(); }
    p.moveVec = [0, 0];
    if (w.kind === 'town') this.townTick(dt);
    else this.dungeonTick(dt);
  },

  /** Click through the death and victory screens. */
  handleScreens(dt) {
    const scr = [...document.querySelectorAll('#screens > .screen')].find((x) => x.querySelector('.death-title'));
    if (!scr) { this.screenT = 0; return false; }
    const btn = [...scr.querySelectorAll('button')].find((b) => /Return to Town|Continue/.test(b.textContent));
    if (!btn) return false;
    this.screenT += dt;
    this.setStatus(/Return/.test(btn.textContent) ? 'Back to town…' : 'Victory!');
    if (this.screenT > (/Return/.test(btn.textContent) ? 2.5 : 5)) { this.screenT = 0; btn.click(); }
    return true;
  },

  // ================================================================ character management
  manageHero() {
    const p = G.player, c = G.char;
    let dirty = false;
    if (c.statPoints > 0) { this.spendStats(); dirty = true; }
    if (c.skillPoints > 0) { if (this.spendSkills()) dirty = true; }
    const sig = Object.entries(c.skills).map((e) => e.join(':')).join(',') + '|' + c.level;
    if (sig !== this.lastSig) { this.lastSig = sig; this.arrangeBar(); dirty = true; }
    if (this.optimizeGear()) dirty = true;
    if (this.socketGems()) dirty = true;
    if (dirty) { p.recompute(); G.ui.refresh(); G.game.autosave(); }
  },

  spendStats() {
    const p = G.player, c = G.char;
    while (c.statPoints > 0) {
      let best = 'vit', bs = -Infinity;
      for (const k of ['str', 'dex', 'vit', 'int']) {
        const s = simulate(p, () => { c.attrs[k]++; return () => { c.attrs[k]--; }; });
        if (s > bs) { bs = s; best = k; }
      }
      c.attrs[best]++;
      c.statPoints--;
    }
    p.recompute();
  },

  /** Put each skill point where it raises buildPower most (counting the prerequisites a new skill needs). */
  spendSkills() {
    const p = G.player, c = G.char;
    const list = CLASS_SKILLS[c.classId];
    let spent = false;
    while (c.skillPoints > 0) {
      const base = buildPower(p, CROWD, null, true).total;
      let best = null, bv = 0;
      const focus = focusSkills(c.classId) || [];
      // Unlock each class-defining skill as soon as its level gate opens.
      // Walk backwards through prerequisites, instead of endlessly maxing
      // the first high-DPS skill and leaving the rest of the build locked.
      if (focus.length && c.classId !== 'paladin') {
        for (const goal of focus.filter((sk) => sk.reqLevel <= c.level && !c.skills[sk.id])
          .sort((a, b) => a.reqLevel - b.reqLevel || a.tree - b.tree || a.idx - b.idx)) {
          let step = goal;
          while (step.prereq && !c.skills[step.prereq]) step = SKILLS[step.prereq];
          if (!canLearn(step)) { best = step; break; }
        }
        // Spread later points through the focused rotation, not one spell.
        if (!best) best = focus.filter((sk) => !canLearn(sk))
          .sort((a, b) => (c.skills[a.id] || 0) - (c.skills[b.id] || 0) ||
            (a.kind === 'whirl' ? -1 : 0) - (b.kind === 'whirl' ? -1 : 0) || a.idx - b.idx)[0];
        if (best) {
          c.skills[best.id] = (c.skills[best.id] || 0) + 1;
          c.skillPoints--; spent = true;
          if (c.skills[best.id] === 1) G.ui.log(`Auto-play learned <b>${escapeHtml(best.name)}</b>.`, '#8fe0ff');
          continue;
        }
      }
      // a focused build (the Paladin's hammers) takes the point whenever one of its skills can use it
      for (const sk of focusSkills(c.classId) || []) {
        if (canLearn(sk)) continue;
        const v = (buildPowerWith(p, [sk]) - base) * (sk.kind === 'orbit' ? 1.5 : 1) + 1e-6; // the swirling hammers first
        if (v > bv) { bv = v; best = sk; }
      }
      if (best) bv = Infinity;
      // none can take it yet, but one opens within a few levels (Blessed Hammer at 6): save the points for it
      else if ((focusSkills(c.classId) || []).some((sk) => !(c.skills[sk.id] > 0) && sk.reqLevel > c.level && sk.reqLevel - c.level <= 4 && (!sk.prereq || c.skills[sk.prereq] > 0))) break;
      for (const sk of bv === Infinity ? [] : list) {
        if ((c.skills[sk.id] || 0) >= MAX_SKILL_LEVEL || c.level < sk.reqLevel) continue;
        // the chain of unlearned prerequisites below this skill (same column)
        const chain = [];
        let s = sk;
        while (s) { if (!(c.skills[s.id] > 0) || s === sk) chain.push(s); s = s.prereq && !(c.skills[s.prereq] > 0) ? SKILLS[s.prereq] : null; }
        if (chain.length > c.skillPoints + 3) continue;
        const v = buildPowerWith(p, chain) - base;
        let per = v / chain.length + (chain[0].tree === mainTree(p) ? base * 0.002 : 0);
        if (sk.kind === 'summon' && PET_CLASSES.has(c.classId)) per *= 1.6; // pet builds grow their minions first
        if (per > bv) { bv = per; best = chain[chain.length - 1]; }
      }
      if (!best || canLearn(best)) best = [SKILLS[c.bar[0]], ...list].find((x) => x && !canLearn(x));
      if (!best) break;
      c.skills[best.id] = (c.skills[best.id] || 0) + 1;
      c.skillPoints--;
      spent = true;
      if (c.skills[best.id] === 1) G.ui.log(`Auto-play learned <b>${escapeHtml(best.name)}</b>.`, '#8fe0ff');
    }
    if (spent) { p.recompute(); this.lastSig = ''; }
    return spent;
  },

  /** LMB = main attack, RMB = the second attack (or the free one), ` 1-9 0 - = = cooldowns, minions, buffs, curses, heals. */
  arrangeBar() {
    const p = G.player, c = G.char;
    const { parts } = buildPower(p, CROWD, null, true);
    const learned = CLASS_SKILLS[c.classId].filter((sk) => effLevel(p, sk) > 0);
    const focused = (focusSkills(c.classId) || []).filter((sk) => effLevel(p, sk) > 0);
    const bar = Array(BAR_SIZE).fill(null);
    const main = parts.find((x) => x.role === 'main');
    const alt = parts.find((x) => x.role === 'alt' || x.role === 'filler');
    const free = (c.classId === 'barbarian' && learned.find((sk) => sk.id === 'barbarian.0.0')) || learned.find((sk) => !manaCost(sk, 1) && !rageCost(sk) &&
      !(sk.classId === 'barbarian' && sk.kind === 'whirl') && OFFENSIVE.has(sk.kind));
    const hammer = c.classId === 'paladin' && parts.filter((x) => x.sk.kind === 'orbit' &&
      isHammer(x.sk) && cooldown(x.sk) < 1.2).sort((a, b) => b.v - a.v)[0];
    const signature = c.classId === 'barbarian' ? learned.find((sk) => sk.name === 'Whirlwind') || learned.find((sk) => sk.kind === 'whirl') :
      c.classId === 'lancer' ? learned.find((sk) => sk.m.shields) :
      c.classId === 'dragoon' ? learned.find((sk) => sk.kind === 'leap') : null;
    bar[LMB] = signature?.id || hammer?.sk.id || main?.sk.id || free?.id || c.bar[LMB];
    const lmbSk = SKILLS[bar[LMB]];
    const rmb = free && free.id !== bar[LMB] && (lmbSk && (manaCost(lmbSk, 1) || rageCost(lmbSk) || lmbSk.kind === 'whirl' || lmbSk.kind === 'orbit' || lmbSk.kind === 'leap')) ? free :
      alt && alt.sk;
    if (rmb && rmb.id !== bar[LMB]) bar[RMB] = rmb.id;
    // All learned bar skills participate, including low-ranked gap closers.
    // Put signature and mobility skills before pure damage picks if slots fill.
    const priority = [...focused, ...learned.filter(mobility), ...parts.map((x) => x.sk),
      ...learned.filter((sk) => OFFENSIVE.has(sk.kind)),
      ...learned];
    const keys = FILL_ORDER.filter((k) => k !== RMB);
    let i = 0;
    for (const sk of priority) {
      if (i >= keys.length) break;
      if (bar.includes(sk.id)) continue;
      bar[keys[i++]] = sk.id;
    }
    if (bar.join() !== c.bar.join()) { c.bar = bar; G.ui.refresh(); }
  },

  // ---------------------------------------------------------------- gear
  /** Equip any bag item that makes the hero stronger. */
  optimizeGear() {
    const p = G.player, c = G.char;
    let any = false;
    for (let pass = 0; pass < 3; pass++) {
      const cur = simulate(p, () => () => {});
      let best = -1, bs = cur * 1.004 + 0.002, bslot = null;
      c.bag.forEach((it, i) => {
        if (!it || it.type !== 'gear' || it.unid || (it.req || 1) > c.level) return;
        const f = fitScore(p, it);
        if (f.s > bs) { bs = f.s; best = i; bslot = f.slot; }
      });
      // a fresh look: body armor or a helm of the same or better rarity that's nearly as strong gets worn anyway
      if (best < 0) {
        this.worn = this.worn || new Set();
        c.bag.forEach((it, i) => {
          if (best >= 0 || !it || it.type !== 'gear' || it.unid || (it.req || 1) > c.level || (it.slot !== 'body' && it.slot !== 'head') || this.worn.has(it.uid)) return;
          const old = c.equip[it.slot];
          if (old && (it.rarity < old.rarity || it.ilvl < old.ilvl - 4)) return;
          if (fitScore(p, it).s > cur * 0.975) { best = i; bslot = it.slot; }
        });
      }
      if (best < 0) break;
      if (this.worn) { this.worn.add(c.bag[best].uid); if (c.equip[bslot]) this.worn.add(c.equip[bslot].uid); }
      const it = c.bag[best];
      equipFromBag(best, bslot);
      G.ui.log(`Auto-play equipped <span style="color:${itemColor(it)}">${escapeHtml(itemName(it))}</span>.`, '#8fe0ff');
      any = true;
    }
    return any;
  },

  /** Fill free sockets of equipped gear with the bag gems that help most. */
  socketGems() {
    const p = G.player, c = G.char;
    let any = false;
    for (let guard = 0; guard < 12; guard++) {
      let best = null, bs = simulate(p, () => () => {}) + 0.0005;
      for (const slot of SLOTS) {
        const it = c.equip[slot];
        if (!it || it.gems.length >= it.sockets) continue;
        const tried = new Set();
        c.bag.forEach((g, gi) => {
          if (!g || g.type !== 'gem' || tried.has(g.gem + g.tier)) return;
          tried.add(g.gem + g.tier);
          const s = simulate(p, () => { it.gems.push({ gem: g.gem, tier: g.tier }); return () => { it.gems.pop(); }; });
          if (s > bs) { bs = s; best = { gi, slot }; }
        });
      }
      if (!best) break;
      socketGem(best.gi, { where: 'equip', slot: best.slot });
      any = true;
    }
    return any;
  },

  /** Would we pick this ground item up? (gear verdicts are cached for a couple of seconds: they simulate) */
  wantLoot(g) {
    if (g.kind !== 'item') return this.wantLootNow(g);
    const now = G.world.time, hit = this.wantCache.get(g);
    if (hit && now - hit.t < 2) return hit.v;
    const v = this.wantLootNow(g);
    this.wantCache.set(g, { t: now, v });
    return v;
  },
  wantLootNow(g) {
    const c = G.char, p = G.player;
    if (this.ignore.has(g.item || g) || this.giveUp.has(g)) return false;
    if (g.kind === 'gold') return true;
    if (g.kind === 'orb_hp') return p.hp < p.maxHp * 0.85;
    if (g.kind === 'orb_mp') return p.mana < p.maxMana * 0.7;
    if (g.kind === 'potion') return (c.potions[g.item.kind] || 0) < 30;
    if (g.kind !== 'item') return false;
    const it = g.item, free = bagFree(c);
    if (it.type === 'gem') return free > 0 || c.bag.some((b) => b && b.type === 'gem' && b.gem === it.gem && b.tier === it.tier) || this.worstBag(itemValue(it)) >= 0;
    if (it.type !== 'gear') return free > 0;
    const upgrade = (it.req || 1) <= c.level && this.isUpgrade(it);
    if (upgrade) return true;
    if ((it.slot === 'body' || it.slot === 'head') && (it.req || 1) <= c.level && (!c.equip[it.slot] || it.rarity >= c.equip[it.slot].rarity) && free > 0) return true; // new looks
    const minRarity = free > 30 ? 1 : free > 12 ? 2 : 3;
    if (it.rarity < minRarity) return false;
    return free > 0 || this.worstBag(itemValue(it)) >= 0;
  },
  isUpgrade(it) {
    const p = G.player, c = G.char;
    const cur = simulate(p, () => () => {});
    return fitScore(p, it).s > cur * 1.004 + 0.002;
  },
  /** Index of the cheapest sellable bag item worth less than `than`, or -1. */
  worstBag(than) {
    const c = G.char;
    let wi = -1, wv = than * 0.8;
    c.bag.forEach((b, i) => { if (b && b.type === 'gear' && sellPrice(b) * 4 < wv) { wv = sellPrice(b) * 4; wi = i; } });
    return wi;
  },
  makeRoom(it) {
    const i = this.worstBag(itemValue(it));
    if (i < 0) return false;
    const old = G.char.bag[i];
    this.ignore.add(old);
    dropFromBag(i);
    return true;
  },

  // ================================================================ navigation
  /** BFS distance field from the hero's tile (8-way, no corner cutting). */
  buildNav() {
    const w = G.world, p = G.player, m = w.map, W = m.w, H = m.h;
    if (!this.nav || this.nav.d.length !== W * H) this.nav = { d: new Int32Array(W * H), q: new Int32Array(W * H) };
    const { d, q } = this.nav;
    d.fill(-1);
    let sx = Math.floor(p.x), sy = Math.floor(p.y);
    if (!m.walkableTile(sx, sy)) {
      let found = false;
      for (let r = 1; r < 3 && !found; r++) for (let oy = -r; oy <= r && !found; oy++) for (let ox = -r; ox <= r && !found; ox++) if (m.walkableTile(sx + ox, sy + oy)) { sx += ox; sy += oy; found = true; }
    }
    let h = 0, t = 0;
    q[t++] = sy * W + sx; d[sy * W + sx] = 0;
    while (h < t) {
      const i = q[h++], x = i % W, y = (i / W) | 0, nd = d[i] + 1;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = x + ox, ny = y + oy;
        if (!m.walkableTile(nx, ny)) continue;
        if (ox && oy && (!m.walkableTile(x + ox, y) || !m.walkableTile(x, y + oy))) continue;
        const ni = ny * W + nx;
        if (d[ni] !== -1) continue;
        d[ni] = nd; q[t++] = ni;
      }
    }
    this.navT = 0.35;
  },
  /** Path distance (tiles) from the hero to (x,y), or Infinity. */
  navDist(x, y) {
    const m = G.world.map, d = this.nav && this.nav.d;
    if (!d) return Infinity;
    const tx = Math.floor(x), ty = Math.floor(y);
    let best = Infinity;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const nx = tx + ox, ny = ty + oy;
      if (!m.inb(nx, ny)) continue;
      const v = d[ny * m.w + nx];
      if (v >= 0) best = Math.min(best, v + (ox || oy ? 1 : 0));
      if (!ox && !oy && v >= 0) return v;
    }
    return best;
  },
  pathTo(gx, gy) {
    const w = G.world, m = w.map, W = m.w, d = this.nav.d, p = G.player;
    if (m.losWide(p.x, p.y, gx, gy)) return [[gx, gy]];
    let tx = Math.floor(gx), ty = Math.floor(gy), cur = -1, cd = Infinity;
    for (let r = 0; r < 4 && cur < 0; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
      if (!m.inb(tx + ox, ty + oy)) continue;
      const v = d[(ty + oy) * W + tx + ox];
      if (v >= 0 && v < cd) { cd = v; cur = (ty + oy) * W + tx + ox; }
    }
    if (cur < 0) return null;
    const path = [];
    for (let guard = 0; d[cur] > 0 && guard < 5000; guard++) {
      path.push([(cur % W) + 0.5, ((cur / W) | 0) + 0.5]);
      const x = cur % W, y = (cur / W) | 0;
      let next = -1;
      for (let oy = -1; oy <= 1 && next < 0; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox, ny = y + oy;
        if ((!ox && !oy) || !m.inb(nx, ny)) continue;
        if (ox && oy && (!m.walkableTile(x + ox, y) || !m.walkableTile(x, y + oy))) continue;
        if (d[ny * W + nx] === d[cur] - 1) { next = ny * W + nx; break; }
      }
      if (next < 0) break;
      cur = next;
    }
    path.reverse();
    if (path.length) path[path.length - 1] = [gx, gy];
    return m.smooth(p.x, p.y, path);
  },
  /** Steer toward (gx,gy) along a path. Returns true when there. */
  goTo(gx, gy, near = 0.35, dt = 0) {
    const p = G.player;
    if (dist(p.x, p.y, gx, gy) <= near) { this.path = null; return true; }
    if (!this.path || !this.goal || dist(this.goal[0], this.goal[1], gx, gy) > 0.7 || this.navT <= 0) {
      if (this.navT <= 0) this.buildNav();
      this.goal = [gx, gy];
      const path = this.pathTo(gx, gy);
      this.path = path && path.length ? path : [[gx, gy]];
    }
    // move on to the next waypoint early only if the hero itself (not the waypoint) can see it; cutting a corner
    // from a spot near the waypoint can clip a prop and leave the hero sliding along it
    while (this.path.length > 1) {
      const d0 = dist(p.x, p.y, this.path[0][0], this.path[0][1]);
      if (d0 < 0.08 || (d0 < 0.3 && G.world.map.losWide(p.x, p.y, this.path[1][0], this.path[1][1]))) this.path.shift();
      else break;
    }
    let [nx, ny] = this.path[0];
    if (this.jiggle && this.jiggle.t > 0) { this.jiggle.t -= dt; nx = p.x + Math.cos(this.jiggle.a); ny = p.y + Math.sin(this.jiggle.a); }
    this.steer(nx, ny);
    return false;
  },
  steer(x, y) {
    const p = G.player, dx = x - p.x, dy = y - p.y, l = Math.hypot(dx, dy);
    if (l > 1e-3) p.moveVec = [dx / l, dy / l];
  },
  /** Notice when the hero walks into a wall or a crowd and wiggle free. */
  watchStuck(dt) {
    const p = G.player, s = this.stuck;
    const trying = (p.moveVec[0] || p.moveVec[1]) && p.castLock <= 0 &&
      (!p.channel || (p.channel instanceof Whirl && p.classId === 'barbarian'));
    s.t += dt;
    if (s.t < 0.6) return;
    const moved = dist(p.x, p.y, s.x, s.y);
    // sliding along a wall counts as stuck too: moving, but no closer to the waypoint
    const wp = this.path && this.path[0], wd = wp ? dist(p.x, p.y, wp[0], wp[1]) : 0;
    const noGain = wp && wp === s.wp && wd > s.wd - 0.15;
    if (trying && (moved < 0.12 || noGain)) {
      s.n++;
      this.navT = 0; this.path = null;
      if (s.n >= 2) this.jiggle = { t: 0.35, a: Math.random() * TAU };
    } else s.n = 0;
    s.t = 0; s.x = p.x; s.y = p.y; s.wp = this.path && this.path[0]; s.wd = s.wp ? dist(p.x, p.y, s.wp[0], s.wp[1]) : 0;
  },

  // ================================================================ dungeon
  dungeonTick(dt) {
    const p = G.player, w = G.world, c = G.char;
    this.navT -= dt;
    // life lost per second (share of max), smoothed over a few seconds: how hard the fight is pushing back
    if (this.lastHp >= 0) this.hurt += (Math.max(0, this.lastHp - p.hp) / p.maxHp / dt - this.hurt) * Math.min(1, dt / 3);
    this.lastHp = p.hp;
    if (!this.nav || this.navT <= 0) this.buildNav();
    this.potions(w);
    // danger first: hide from a raid boss's cataclysm, step out of telegraphed attacks and enemy ground effects
    if (this.takeCover(dt)) { this.watchStuck(dt); return; }
    if (this.dodgeDanger(dt)) { this.watchStuck(dt); return; }
    const foes = enemyNear(w, p, 13).filter((m) => w.map.los(p.x, p.y, m.x, m.y));
    // retreat to the town portal when nearly dead with nothing left to heal with
    const healLeft = c.potions.hp + c.potions.rejuv > 0 || this.readySkill((s) => s.kind === 'heal');
    const sealed = w.raid && w.raid.sealed; // no way out of a sealed boss room
    if (!this.retreat && p.hp < p.maxHp * 0.22 && !healLeft && foes.length && !sealed) this.retreat = true;
    if (this.retreat && (p.hp > p.maxHp * 0.75 || !foes.length && p.hp > p.maxHp * 0.5)) this.retreat = false;
    if (this.retreat) {
      const tp = w.portals.find((q) => q.type === 'town');
      this.setStatus('Retreating to town!');
      if (foes.length && p.castLock <= 0) this.combat(foes, true);
      if (tp && this.goTo(tp.x, tp.y, 1.2, dt)) { this.transitT = 3; G.game.enterTown(); return; }
      this.watchStuck(dt);
      return;
    }
    if (foes.length) { this.combat(foes, false); this.watchStuck(dt); return; }
    this.target = null;
    // keep pets and buffs up between fights
    if (p.castLock <= 0 && !p.channel) this.preCast(w);
    // Outdoor trials are explicitly shrine-started; auto-play must participate instead of
    // roaming forever after killing ambient enemies. Combat and self-preservation take priority.
    const ow = w.overworldScenario;
    if (ow && !ow.completed && !ow.failed) {
      const nearEnemy = foes.some((m) => !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 6);
      if (!ow.active) {
        this.setStatus('Finding the scenario shrine');
        if (this.goTo(ow.shrine.x, ow.shrine.y, 1.4, dt)) ow.shrine.use();
        this.watchStuck(dt); return;
      }
      let objective = null;
      if (ow.type === 'zones' && ow.route && ow.route[ow.stage]) {
        const spot = ow.route[ow.stage];
        objective = { x: spot[0], y: spot[1], reach: 2.5 };
      } else if (ow.type === 'escort' && ow.escort && ow.routeIndex < ow.route.length) {
        objective = { x: ow.escort.x, y: ow.escort.y, reach: 3.5 };
      } else if (ow.markers.length && !nearEnemy) {
        objective = ow.markers.reduce((a,b) =>
          !a || Math.hypot(b.x-p.x,b.y-p.y) < Math.hypot(a.x-p.x,a.y-p.y) ? b : a, null);
      }
      if (objective && !nearEnemy) {
        this.setStatus('Completing '+ow.title);
        if (this.goTo(objective.x, objective.y, objective.reach||1.4, dt) && objective.use) objective.use();
        this.watchStuck(dt); return;
      }
    }
    // loot, chests, then the job at hand
    if (this.lootStep(w, dt)) { this.watchStuck(dt); return; }
    const exit = w.portals.find((q) => q.type === 'exit');
    const bossDead = !w.boss || w.boss.dead;
    if (bossDead && exit && exit.active) {
      this.setStatus('Heading for the exit');
      if (this.goTo(exit.x, exit.y, 1.1, dt)) this.leaveLevel(w);
      this.watchStuck(dt);
      return;
    }
    const goal = this.huntGoal(w);
    if (goal) {
      this.setStatus(goal === w.boss ? `Hunting the guardian${w.boss.name ? ' — ' + w.boss.name : ''}` : 'Clearing the level');
      this.goTo(goal.x, goal.y, 1, dt);
    } else this.setStatus('Exploring');
    this.watchStuck(dt);
  },

  /** The next monster to walk to: the boss, unless the hero is under-levelled or something is close by. */
  huntGoal(w) {
    const p = G.player, c = G.char;
    const farm = c.level < w.depth + 1;
    let best = null, bd = Infinity;
    for (const m of w.creatures) {
      if (m.dead || m.team !== 'enemy' || m.targetable === false || this.giveUp.has(m)) continue;
      const d = this.navDist(m.x, m.y);
      if (d === Infinity) continue;
      const lim = farm ? 999 : 12;
      if (m !== w.boss && d > lim) continue;
      const v = m === w.boss ? d + (farm ? 40 : 0) : d;
      if (v < bd) { bd = v; best = m; }
    }
    if (!best && w.boss && !w.boss.dead) return w.boss;
    return best;
  },

  /** Pick up good loot, gold and orbs, and open chests, when they're close. Returns true while busy with it. */
  lootStep(w, dt) {
    const p = G.player, c = G.char;
    let best = null, bd = 16;
    for (const g of w.loot) {
      if (g.z > 0 || g.t < 0.4) continue;
      const lim = g.kind === 'gold' ? 9 : g.kind.startsWith('orb') ? 7 : 16;
      const d = this.navDist(g.x, g.y);
      if (d > lim || d >= bd || !this.wantLoot(g)) continue;
      bd = d; best = g;
    }
    for (const ch of w.chests) {
      if (ch.opened) continue;
      const d = this.navDist(ch.x, ch.y);
      if (d < 14 && d < bd) { bd = d; best = ch; }
    }
    if (!best) { this.lootT = 0; return false; }
    if (this.lootFor !== best) { this.lootFor = best; this.lootT = 0; }
    this.lootT += dt;
    if (this.lootT > 8) { this.giveUp.add(best); return false; } // unreachable
    if (best.use) {
      this.setStatus('Opening a chest');
      if (this.goTo(best.x, best.y, (best.reach || 1.3) - 0.2, dt)) best.use();
      return true;
    }
    this.setStatus(best.kind === 'item' ? `Picking up ${best.label}` : 'Collecting');
    if (best.kind === 'item' && best.item.type !== 'potion' && bagFree(c) === 0 && !(best.item.type === 'gem' && c.bag.some((b) => b && b.type === 'gem' && b.gem === best.item.gem && b.tier === best.item.tier))) {
      if (!this.makeRoom(best.item)) { this.ignore.add(best.item); return false; }
    }
    p.lootTarget = best.kind === 'item' || best.kind === 'potion' ? best : null;
    this.goTo(best.x, best.y, 0.25, dt);
    return true;
  },

  leaveLevel(w) {
    const c = G.char;
    const next = w.depth + 1;
    const town = this.needTown();
    c.depth = next;
    c.nextBiome = drawBiome(c, next);
    this.transitT = 3;
    if (town) { G.ui.log('Auto-play heads back to town to trade.', '#8fe0ff'); G.game.enterTown(); }
    else G.game.enterDungeon();
  },
  needTown() {
    const c = G.char;
    this.sinceTown = (this.sinceTown || 0) + 1;
    if (bagFree(c) < 14) return true;
    if (c.potions.hp < 5 && c.gold > potionPrice('hp', c) * 6) return true;
    if (this.sinceTown >= 4 && c.gold > 400 * Math.pow(1.06, c.level)) return true;
    return false;
  },

  // ---------------------------------------------------------------- dodging
  /** A raid boss is winding up its cataclysm: get out of its sight (behind a pillar) before it lands. */
  takeCover(dt) {
    const p = G.player, w = G.world, m = w.map;
    const g = w.hazards.find((h) => h.safeAt && !h.dead);
    if (!g) { this.cover = null; return false; }
    if (g.safeAt(p.x, p.y) && !this.cover) return false; // already hidden: fight on from here
    if (!this.cover || !g.safeAt(this.cover[0], this.cover[1])) {
      let best = null, bs = Infinity;
      const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
      for (let y = y0 - 14; y <= y0 + 14; y++) {
        for (let x = x0 - 14; x <= x0 + 14; x++) {
          const cx = x + 0.5, cy = y + 0.5;
          if (!m.circleFree(cx, cy, 0.35) || !g.safeAt(cx, cy)) continue;
          // well inside the shadow: its neighbours are hidden too
          if (!g.safeAt(cx + 0.6, cy) || !g.safeAt(cx - 0.6, cy) || !g.safeAt(cx, cy + 0.6) || !g.safeAt(cx, cy - 0.6)) continue;
          const d = this.navDist(cx, cy);
          if (d < bs) { bs = d; best = [cx, cy]; }
        }
      }
      if (!best) return false;
      this.cover = best;
    }
    this.setStatus('Taking cover!');
    this.goTo(this.cover[0], this.cover[1], 0.3, dt);
    return true;
  },

  /** Dangerous circles and lines on the ground right now (enemy telegraphs, delayed blasts, damaging zones). */
  dangers(w) {
    const out = [];
    for (const h of w.hazards) {
      if (h.team !== 'enemy' || h.dead) continue;
      if (h.danger) { h.danger(out); continue; } // raid hazards describe their own zones
      if (h instanceof Delayed) out.push({ x: h.x, y: h.y, r: h.r + 0.45 });
      else if (h instanceof Area && h.dmg && h.dmg[1] > 0) out.push({ x: h.x, y: h.y, r: h.r + 0.3 });
      else if (h.lob && h.exp && h.tx !== undefined) out.push({ x: h.tx, y: h.ty, r: h.exp + 0.4, minor: true });
    }
    for (const e of effects) {
      if (!(e instanceof Telegraph) || e.color === '#40ff60' || e.t >= e.dur) continue;
      if (e.kind === 'line') out.push({ line: true, x: e.x, y: e.y, x1: e.x + Math.cos(e.ang) * e.len, y1: e.y + Math.sin(e.ang) * e.len, r: e.w / 2 + 0.45 });
      else if (e.kind === 'cone') out.push({ cone: true, x: e.x, y: e.y, ang: e.ang, half: e.half + 0.15, r: e.len + 0.5 });
      else out.push({ x: e.x, y: e.y, r: (e.r || 1.5) + 0.45 });
    }
    return out;
  },
  inDanger(list, x, y) {
    for (const d of list) {
      if (d.ring) {
        const r = Math.hypot(x - d.x, y - d.y);
        if (r > d.r0 && r < d.r1 && Math.abs(angleDiff(d.gap, Math.atan2(y - d.y, x - d.x))) > d.gapW / 2) return true;
      } else if (d.cone) {
        if (Math.hypot(x - d.x, y - d.y) < d.r && Math.abs(angleDiff(d.ang, Math.atan2(y - d.y, x - d.x))) < d.half) return true;
      } else if (d.line ? segDist(x, y, d.x, d.y, d.x1, d.y1) < d.r : Math.hypot(x - d.x, y - d.y) < d.r) return true;
    }
    return false;
  },
  dodgeDanger(dt) {
    const p = G.player, w = G.world, m = w.map;
    if (p.channel) return false;
    let list = this.dangers(w);
    // a lobbed shot is worth eating once or twice to close on a shooter: healthy and not melting, push through
    const tough = p.hp > p.maxHp * 0.7 && this.hurt < 0.03 && enemyNear(w, p, 4).length < 3 && this.target && !this.target.dead && dist(p.x, p.y, this.target.x, this.target.y) > 2.2;
    if (tough) list = list.filter((d) => !d.minor);
    if (this.dodge) {
      this.dodge.t -= dt;
      if (this.dodge.t > 0 && this.inDanger(list, p.x, p.y)) { this.setStatus('Dodging!'); this.steer(this.dodge.x, this.dodge.y); return true; }
      this.dodge = null;
    }
    if (!list.length || !this.inDanger(list, p.x, p.y)) return false;
    const foes = enemyNear(w, p, 8);
    let best = null, bs = -Infinity;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      for (const r of [1.4, 2.3, 3.3]) {
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        if (!m.circleFree(x, y, 0.3) || !m.losWide(p.x, p.y, x, y) || this.inDanger(list, x, y)) continue;
        let s = -r;
        for (const f of foes) s += Math.min(3, dist(x, y, f.x, f.y)) * 0.15;
        // side-step toward a shooter rather than away from it, so the gap still closes
        const t = this.target;
        if (t && !t.dead && (t.ai === 'ranged' || t.ai === 'caster')) s -= dist(x, y, t.x, t.y) * 0.35;
        if (s > bs) { bs = s; best = [x, y]; }
      }
    }
    if (!best) return false;
    this.dodge = { x: best[0], y: best[1], t: 0.9 };
    this.setStatus('Dodging!');
    this.steer(best[0], best[1]);
    return true;
  },

  // ---------------------------------------------------------------- potions
  potions(w) {
    const p = G.player, c = G.char;
    if (p.potionCd > 0 || p.dead) return;
    const boss = w.boss && !w.boss.dead && w.boss.awake && dist(p.x, p.y, w.boss.x, w.boss.y) < 14;
    const hpK = p.hp / p.maxHp;
    const regen = p.potionRegen.some((r) => r.hp > 0);
    if (hpK < 0.28 && c.potions.rejuv > 0) return p.usePotion('rejuv');
    if (hpK < (boss ? 0.6 : 0.5) && !regen && c.potions.hp > 0) return p.usePotion('hp');
    if (hpK < 0.35 && !regen && c.potions.rejuv > 0) return p.usePotion('rejuv');
    const main = SKILLS[c.bar[0]];
    const needMana = main && manaCost(main, effLevel(p, main)) > 0;
    if (needMana && p.mana < p.maxMana * 0.18 && !p.potionRegen.some((r) => r.mp > 0) && c.potions.mp > 0 && enemyNear(w, p, 10).length) return p.usePotion('mp');
    if (boss && c.potions.fury > 0 && !(p.furyT > 0) && w.boss.hp < w.boss.maxHp * 0.95) return p.usePotion('fury');
  },

  // ---------------------------------------------------------------- combat
  barSkills() {
    const c = G.char, p = G.player;
    return [...new Set(c.bar)].map((id) => id && SKILLS[id]).filter((sk) => sk && effLevel(p, sk) > 0);
  },
  readySkill(pred) {
    const p = G.player;
    return this.barSkills().find((sk) => pred(sk) && !p.canUse(sk));
  },
  meleeBuild() {
    const sk = SKILLS[G.char.bar[0]];
    return ['lancer', 'barbarian', 'dragoon'].includes(G.char.classId) ||
      !!sk && ['melee', 'whirl', 'leap', 'dash'].includes(sk.kind);
  },

  pickTarget(foes) {
    const p = G.player, w = G.world;
    let best = null, bs = Infinity;
    for (const m of foes) {
      if ((this.shun.get(m) || 0) > w.time && foes.length > 1) continue;
      let s = dist(p.x, p.y, m.x, m.y);
      if (m === this.target) s -= 1.5;
      if (m.isWard) s -= 6; // a raid boss's warding crystals: break them first
      else if (m.rank === 'boss') s -= m.ward < 1 ? -4 : 2.5;
      else if (m.rank === 'unique' || m.rank === 'champion') s -= 0.5;
      if (m.hp < m.maxHp * 0.3) s -= 0.7;
      if (m.ai === 'ranged' || m.ai === 'caster') s -= 0.4;
      if (s < bs) { bs = s; best = m; }
    }
    return best;
  },

  /**
   * 0..1: how hard the hero can press in. High when over-levelled for the depth, healthy and barely scratched;
   * drops fast when life is low or melting, and near a boss. Ranged builds close in and kite less as it rises.
   */
  boldness() {
    const p = G.player, w = G.world, c = G.char;
    const hpK = p.hp / p.maxHp;
    let k = 0.55 + clamp((c.level - (w.depth || 1)) / 8, -0.5, 0.4) + (hpK - 0.7) * 0.9 - this.hurt * 4;
    if (w.boss && !w.boss.dead && w.boss.awake && dist(p.x, p.y, w.boss.x, w.boss.y) < 12) k -= 0.25;
    if (hpK < 0.45) k = Math.min(k, 0.15);
    return clamp(k, 0, 1);
  },

  /** Fight: choose a skill and cast it, or move into position. */
  combat(foes, fleeing) {
    const p = G.player, w = G.world;
    const t = this.target = this.pickTarget(foes);
    if (!t) return;
    // watchdog: if the target's life hasn't moved in a while, stop casting utility skills, then try another target
    const sw = this.stall;
    if (!sw || sw.m !== t || t.hp < sw.hp - 1) this.stall = { m: t, hp: t.hp, t: 0 };
    else if ((sw.t += 1 / 30) > 12) {
      this.banT = 10;
      if (sw.t > 25 && t.rank !== 'boss') { this.shun.set(t, w.time + 30); this.stall = null; }
    }
    if (this.banT > 0) this.banT -= 1 / 30;
    p.aim = [t.x, t.y];
    if (!fleeing) this.setStatus(`Fighting ${t.name || 'a monster'}`);
    // A Barbarian can run at distant visible foes WHILE channeling Whirlwind.
    // This feeds the same goTo/steer path waypoints as ordinary movement.
    if (p.channel instanceof Whirl && p.classId === 'barbarian') {
      if (!fleeing && dist(p.x, p.y, t.x, t.y) > Math.max(0.7, p.channel.r * 0.65))
        this.goTo(t.x, t.y, Math.max(0.6, p.channel.r * 0.6), 1 / 30);
      return;
    }
    if (p.channel) return;
    const d = dist(p.x, p.y, t.x, t.y);
    const melee = this.meleeBuild();
    if (p.castLock <= 0) {
      const pick = this.chooseSkill(foes, t, d, fleeing);
      if (pick && p.tryUseSkill(pick.sk, pick.x, pick.y, pick.sk.kind === 'melee' ? t : null)) { this.lastCast[pick.sk.id] = w.time; return; }
    }
    if (fleeing) return;
    // positioning
    const near = foes.filter((m) => dist(p.x, p.y, m.x, m.y) < 2.2).length;
    const bold = this.boldness();
    let reach = engageRange(SKILLS[G.char.bar[0]], t, bold);
    if (this.stall && this.stall.t > 6) reach = Math.min(reach, 1.6); // nothing is landing: walk right up to it
    // shooters and casters: don't trade shots from the edge of range (they win that), close in to a sure hit
    else if ((t.ai === 'ranged' || t.ai === 'caster') && p.hp > p.maxHp * 0.55) reach = Math.min(reach, Math.max(2.4, reach * (0.65 - 0.25 * bold)));
    // ranged builds back off from a crowd: later the bolder they are, and never while healthy and over-powered
    if (!melee && (near >= 3 + Math.round(bold * 3) || (near >= 1 && p.hp < p.maxHp * (0.55 - 0.2 * bold))) && this.kite(foes)) return;
    if (d > reach || !w.map.los(p.x, p.y, t.x, t.y)) this.goTo(t.x, t.y, Math.max(0.6, reach * 0.85));
  },
  /** Step away from the crowd (ranged builds). */
  kite(foes) {
    const p = G.player, m = G.world.map;
    let best = null, bs = -Infinity;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, x = p.x + Math.cos(a) * 2.2, y = p.y + Math.sin(a) * 2.2;
      if (!m.circleFree(x, y, 0.3) || !m.losWide(p.x, p.y, x, y)) continue;
      let s = 0;
      for (const f of foes) s += Math.min(6, dist(x, y, f.x, f.y));
      s += m.rayLength(x, y, a, 3) * 0.6; // don't back into corners
      if (s > bs) { bs = s; best = [x, y]; }
    }
    if (!best) return false;
    this.setStatus('Kiting');
    this.steer(best[0], best[1]);
    return true;
  },

  /** Best skill to cast right now, with its aim point, or null. */
  chooseSkill(foes, t, d, fleeing) {
    const p = G.player, w = G.world, c = G.char;
    const hpK = p.hp / p.maxHp;
    const boss = t.rank === 'boss';
    const crowdAt = (x, y, r) => foes.filter((m) => dist(x, y, m.x, m.y) <= r).length;
    const los = w.map.los(p.x, p.y, t.x, t.y);
    const choices = [];
    const consider = (sk, score, x = t.x, y = t.y) => {
      if (score > 0) choices.push({ sk, score, x, y });
    };
    const now = G.world.time;
    for (const sk of this.barSkills()) {
      if (p.canUse(sk)) continue;
      // Do not repeatedly overwrite a still-active spinning ring; this also
      // gives other shield abilities a turn in the rotation.
      if (sk.m.shields && w.hazards.some((h) => !h.dead && h.o?.sk === sk.id &&
        h.t < h.dur - 2)) continue;
      // Four seconds of useful Whirlwind at minimum, not a 0.1s spin at 10 Rage.
      if (sk.classId === 'barbarian' && sk.kind === 'whirl' && p.rage < 40) continue;
      // Spend 25 Rage on Earthquake only with surplus Rage and a real crowd,
      // keeping enough in reserve to initiate another Whirlwind.
      if (rageCost(sk) && this.barSkills().some((s) => s.kind === 'whirl') &&
        (p.rage < 85 || (t.rank !== 'boss' && foes.filter((m) => dist(m.x, m.y, t.x, t.y) < 2.5).length < 2))) continue;
      if (sk.kind === 'summon' && now - (this.lastCast[sk.id] || -99) < 1.5) continue;
      if (this.banT > 0 && !OFFENSIVE.has(sk.kind) && sk.kind !== 'heal') continue;
      const L = effLevel(p, sk), m = sk.m, cost = manaCost(sk, L);
      const lowMana = cost > 0 && p.mana - cost < p.maxMana * 0.12 && !boss;
      switch (sk.kind) {
        case 'heal': if (hpK < 0.55) consider(sk, 1e9 * (1 - hpK), p.x, p.y); continue;
        case 'buff':
          if (!p.buffs.some((b) => b.id === sk.id && b.t > 1.5)) consider(sk, 5e8, p.x, p.y);
          continue;
        case 'summon': {
          const mine = w.creatures.filter((x) => x.summon && x.skillId === sk.id && !x.dead).length;
          if (this.petCount(w) + (m.n || 1) > PET_CAP) continue; // past the cap a new minion only replaces an old one
          if (m.sum === 'revive') {
            if (mine < (m.max || m.n || 1) && w.corpses.some((k) => !k.used && dist(k.x, k.y, p.x, p.y) < 5)) consider(sk, 4e8, p.x, p.y);
          } else if (mine < summonMax(sk) || (m.dur && cooldown(sk) >= 3)) consider(sk, 4e8 - mine, t.x, t.y);
          continue;
        }
        case 'curse': {
          const self = m.at === 'self', r = 2.2 * (m.r ?? 1);
          const cx = self ? p.x : t.x, cy = self ? p.y : t.y;
          if (self ? d > 3.5 : d > 8.5 || !los) continue;
          const n = crowdAt(cx, cy, r);
          if (now - (this.lastCast[sk.id] || -99) < Math.max(2, skillDuration(sk, L) * 0.6)) continue;
          // bosses shrug off fear, freezes, confusion and charms (and most stuns)
          const fresh = (m.curse || ['amp']).some((k) => !(boss && CC.has(k)) && !(t.curses[k] && t.curses[k].t > 0.5) && !(t.status[k] && t.status[k].t > 0.2));
          if (fresh && (n >= 3 || boss || t.rank === 'unique' || t.rank === 'champion') && !lowMana) consider(sk, 3e8, cx, cy);
          continue;
        }
        case 'blink': {
          const crowded = crowdAt(p.x, p.y, 2) >= 2;
          if (fleeing || (crowded && hpK < 0.45)) {
            const away = this.escapePoint(foes, 6);
            if (away) consider(sk, 6e8, away[0], away[1]);
          } else if (this.meleeBuild() && d > 3 && d <= skillRange(sk) && los && !lowMana) consider(sk, 1e6, t.x, t.y);
          else if (m.nova && d < 3 && !lowMana) consider(sk, avg(p.skillDamage(sk, L)) * crowdAt(p.x, p.y, 2.2), p.x, p.y);
          continue;
        }
      }
      if (!OFFENSIVE.has(sk.kind) || fleeing && !['nova', 'orbit'].includes(sk.kind)) continue;
      // can it reach?
      let n = 1, ok = true, ax = t.x, ay = t.y;
      switch (sk.kind) {
        case 'melee': ok = d <= skillRange(sk) + t.r + 0.1; n = isWide(sk) ? crowdAt(p.x, p.y, skillRange(sk) + 0.4) : 1; break;
        case 'nova': { const r = 3 * (m.r ?? 1) * (1 + p.st.areaPct / 100); n = crowdAt(p.x, p.y, r * 0.95); ok = n > 0; ax = p.x; ay = p.y; break; }
        case 'orbit': n = crowdAt(p.x, p.y, sk.m.shields ? Math.max(1.5, 0.75 * (sk.m.r || 1) + 2.2) : 2.6); ok = n > 0 && d < 4; break;
        case 'whirl': n = crowdAt(p.x, p.y, 2.6); ok = n > 0 && d < 3; break;
        case 'zone': if (m.follow) { n = crowdAt(p.x, p.y, 2); ok = n > 0; } else { ok = d < 8.5 && los; n = crowdAt(t.x, t.y, 1.8); } break;
        case 'wall': ok = m.ring ? d < 2.6 : d < 7 && los; n = crowdAt(t.x, t.y, 2); break;
        case 'leap': ok = d <= 6.5 * (m.range ?? 1) && los; n = crowdAt(t.x, t.y, 1.6); break;
        case 'dash': ok = d <= 5 * (m.range ?? 1) && los; n = crowdAt(t.x, t.y, 1.5); break;
        case 'corpse': ok = w.corpses.some((k) => !k.used && dist(k.x, k.y, t.x, t.y) < 4 * (m.r ?? 1)) && d < 9 && los; n = crowdAt(t.x, t.y, 2); break;
        case 'aoe': case 'rain': case 'strike': case 'trap': n = crowdAt(t.x, t.y, 2); ok = d <= Math.min(9.5, skillRange(sk)) && los; break;
        default: ok = d <= reachOf(sk) * 0.92 && los; n = crowdAt(t.x, t.y, 2.2);
      }
      if (!ok) continue;
      if (lowMana) continue;
      const per = avg(p.skillDamage(sk, L)) * hitsPerCast(sk, Math.max(1, n));
      let score = per / Math.max(0.2, castTime(p, sk));
      if (cooldown(sk) >= 1.2) score *= 1.6; // fire cooldowns whenever they are up
      score *= focusMul(c.classId, sk); // the build focus: the Paladin swings hammers before anything else
      if (sk.kind === 'leap' || sk.kind === 'dash') score *= d > 3 ? 2.5 : d > 1.8 ? 1.2 : 0.5;
      if (cost) score *= 1 - 0.35 * clamp(1 - p.mana / p.maxMana, 0, 1);
      consider(sk, score, ax, ay);
    }
    if (!choices.length) return null;
    // Keep emergency heals, missing buffs, and summons ahead of DPS rotation.
    const urgent = choices.filter((x) => x.score >= 1e8).sort((a, b) => b.score - a.score);
    if (urgent.length) return urgent[0];
    // Leap/charge/blink replaces slow walking when a melee fighter is out of
    // range. A jump is only chosen after its usual range/LOS checks above.
    const main = SKILLS[c.bar[LMB]];
    const closing = d > 3.3 && (this.meleeBuild() ||
      (main && d > engageRange(main, t, this.boldness()) + 1.2));
    if (!fleeing && closing) {
      const gap = choices.filter((x) => ['leap', 'dash', 'blink'].includes(x.sk.kind))
        .sort((a, b) => b.score - a.score);
      if (gap.length) return gap[0];
    }
    // A valid skill that has been ignored in recent combat gets a turn even
    // when its raw damage is lower. Never override reach, Rage, mana, or CD checks.
    const lastUsed = (x) => this.lastCast[x.sk.id] ?? -1000;
    const overdue = choices.filter((x) => now - lastUsed(x) >= 9)
      .sort((a, b) => lastUsed(a) - lastUsed(b) || b.score - a.score);
    if (overdue.length) return overdue[0];
    choices.sort((a, b) => b.score - a.score);
    return choices[0];
  },
  escapePoint(foes, r) {
    const p = G.player, m = G.world.map;
    let best = null, bs = -Infinity;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (!m.circleFree(x, y, 0.3) || !m.los(p.x, p.y, x, y)) continue;
      const s = foes.reduce((acc, f) => acc + Math.min(8, dist(x, y, f.x, f.y)), 0);
      if (s > bs) { bs = s; best = [x, y]; }
    }
    return best;
  },
  /** The hero's living minions (createSummon caps them at PET_CAP). */
  petCount(w) { const p = G.player; let n = 0; for (const x of w.creatures) if (x.summon && x.owner === p && !x.dead) n++; return n; },
  /** Out of combat: raise permanent minions. */
  preCast(w) {
    const p = G.player;
    for (const sk of this.barSkills()) {
      if (sk.kind !== 'summon' || sk.m.dur || sk.m.sum === 'revive' || p.canUse(sk)) continue;
      const mine = w.creatures.filter((x) => x.summon && x.skillId === sk.id && !x.dead).length;
      if (mine < summonMax(sk) && this.petCount(w) + (sk.m.n || 1) <= PET_CAP && p.mana > p.maxMana * 0.5) { p.tryUseSkill(sk, p.x + Math.cos(p.facing), p.y + Math.sin(p.facing)); return; }
    }
  },

  // ================================================================ town
  townTick(dt) {
    const p = G.player, w = G.world, c = G.char;
    this.navT -= dt;
    if (!this.nav || this.navT <= 0) this.buildNav();
    if (!this.town) this.town = { steps: this.townPlan(), i: 0, phase: 'walk', t: 0 };
    const T = this.town;
    // skip errands with nothing to do there (a fresh hero heads straight for the portal); checked on arrival at
    // each step, so gold from the first sale still counts
    while (T.phase === 'walk' && T.t === 0 && T.steps[T.i] && T.steps[T.i].want && !this.wants(T.steps[T.i].want)) T.i++;
    const step = T.steps[T.i];
    if (!step) {
      // done: through the portal
      const po = w.portals[0];
      this.setStatus(`To the portal — Depth ${c.depth}`);
      if (this.goTo(po.x, po.y, 1.3, dt)) {
        G.ui.closeAll();
        this.transitT = 4;
        this.sinceTown = 0;
        G.game.enterDungeon();
      }
      this.watchStuck(dt);
      return;
    }
    const npc = step.stash ? w.npcs.find((n) => n.stash) : vendorNpc(w, step.vendor);
    if (!npc) { T.i++; return; }
    T.t += dt;
    if (T.phase === 'walk') {
      this.setStatus(step.label);
      // blocked short of the counter (summons, props): trade from anywhere in reach, or give up on this vendor
      const reach = npc.reach || 1.8, d = dist(p.x, p.y, npc.x, npc.y);
      if (this.goTo(npc.x, npc.y, reach - 0.3, dt) || (T.t > 6 && d <= reach)) { T.phase = 'open'; T.t = 0; }
      else if (T.t > 25) { G.ui.log(`Auto-play couldn't reach the ${npc.vendor ? npc.vendor.title : npc.name} and moved on.`, '#ff8080'); T.i++; T.t = 0; }
      this.watchStuck(dt);
      return;
    }
    if (T.phase === 'open') {
      try { if (step.stash) Stash.open(); else Vendor.open(step.vendor); } catch (e) { console.warn('auto-play could not open a vendor', e); }
      T.phase = 'act'; T.t = 0;
      return;
    }
    if (T.phase === 'act' && T.t > 0.5) {
      try { step.fn(); } catch (e) { console.warn('auto-play town step failed', e); }
      try { this.manageHero(); G.ui.refresh(); } catch (e) { console.warn('auto-play town step failed', e); }
      T.phase = 'linger'; T.t = 0;
      return;
    }
    if (T.phase === 'linger' && T.t > 1.1) {
      G.ui.closeAll();
      T.i++; T.phase = 'walk'; T.t = 0;
    }
  },

  townPlan() {
    const c = G.char;
    const steps = [];
    if (c.stash && c.stash.some((b) => b && (b.type === 'gem' || (b.req || 1) <= c.level))) steps.push({ stash: true, label: 'Checking the storage chest', fn: () => this.unstash() });
    const gear = (k) => () => this.gearGain(Vendor.stock[k]);
    steps.push({ vendor: 'weapons', label: 'Selling loot', want: () => c.bag.some((b) => b && b.type !== 'gem') || this.gearGain(Vendor.stock.weapons), fn: () => { this.sellJunk(); this.buyGear(Vendor.stock.weapons); } });
    steps.push({ vendor: 'alchemist', label: 'Buying potions', want: () => this.potionsWanted(), fn: () => this.buyPotions() });
    steps.push({ vendor: 'armor', label: 'Browsing armor', want: gear('armor'), fn: () => this.buyGear(Vendor.stock.armor) });
    if (c.bag.some((b) => b && b.type === 'gem') || c.gold > 2000) steps.push({ vendor: 'gems', label: 'Visiting the gem merchant', fn: () => this.gemShop() });
    steps.push({ vendor: 'socket', label: 'Visiting the jeweler', want: () => c.bag.some((b) => b && b.type === 'gem') || this.equipped().some((it) => it.sockets < it.maxSockets && socketCost(it) <= this.budget(0.3)) || this.gearGain(Vendor.stock.rings), fn: () => this.jeweler() });
    steps.push({ vendor: 'upgrade', label: 'Upgrading gear', want: () => this.equipped().some((it) => (it.upg || 0) < 10 && upgradeCost(it) <= this.budget(0.45)), fn: () => this.blacksmith() });
    steps.push({ vendor: 'enchant', label: 'Enchanting gear', want: () => this.equipped().some((it) => it.rarity >= 1 && enchantCost(it, true) <= this.budget(0.2)), fn: () => this.enchanter() });
    steps.push({ vendor: 'gamble', label: 'Gambling', want: () => c.gold >= Math.round(180 * Math.pow(1.065, Math.max(c.level, c.depth || 1))) * 8 && bagFree(c) >= 3, fn: () => { this.gamble(); this.sellJunk(); } });
    steps.push({ stash: true, label: 'Stashing gems and gear for later', want: () => c.bag.some((b) => b && (b.type === 'gem' || (b.type === 'gear' && (b.req || 1) > c.level && b.rarity >= 2))), fn: () => this.stashExtras() });
    return steps;
  },
  wants(f) { try { return !!f(); } catch (e) { return true; } },
  equipped() { return SLOTS.map((s) => G.char.equip[s]).filter(Boolean); },
  /** Is anything in this shop list an affordable upgrade (same test as buyGear)? */
  gearGain(list) {
    const p = G.player, c = G.char;
    if (!list || !bagFree(c)) return false;
    const cur = simulate(p, () => () => {});
    return list.some((it) => it && it.type === 'gear' && (it.req || 1) <= c.level && itemValue(it) <= this.budget(0.85) && fitScore(p, it).s - cur >= 0.012);
  },
  potionsWanted() {
    const c = G.char;
    return ['hp', 'mp', 'rejuv'].some((k) => c.potions[k] < (k === 'mp' ? 5 : POT_TARGET[k]) && c.gold >= potionPrice(k, c) && (k === 'hp' || c.gold - potionPrice(k, c) > potionPrice('hp', c) * 4));
  },
  /** Storage chest: take out the gems (for the jeweler and fusing) and any stored gear the hero can now wear. */
  unstash() {
    const c = G.char;
    c.stash.forEach((it, i) => {
      if (!it || (it.type === 'gear' && (it.req || 1) > c.level) || (it.type === 'gear' && bagFree(c) < 12)) return;
      if (addToBag(c, it)) c.stash[i] = null;
    });
    this.optimizeGear();
    changed();
  },
  /** Storage chest: put away every gem and the good gear the hero is still too low-level to wear. */
  stashExtras() {
    const c = G.char;
    let n = 0;
    c.bag.forEach((it, i) => {
      if (!it || !(it.type === 'gem' || (it.type === 'gear' && (it.req || 1) > c.level && it.rarity >= 2))) return;
      if (addToStash(c, it)) { c.bag[i] = null; n++; }
    });
    // a full chest: make room by dropping the weakest stored gear (lowest rarity, then item level)
    if (c.stash.every(Boolean)) {
      const worst = c.stash.map((b, i) => ({ b, i })).filter(({ b }) => b.type === 'gear').sort((a, b) => a.b.rarity - b.b.rarity || a.b.ilvl - b.b.ilvl).slice(0, 30);
      for (const { b, i } of worst) { c.gold += sellPrice(b); c.stash[i] = null; }
    }
    if (n) G.ui.log(`Auto-play stored ${n} item${n > 1 ? 's' : ''} in the storage chest.`, '#c8f0ff');
    changed();
  },
  budget(frac) {
    const c = G.char;
    const reserve = potionPrice('hp', c) * 10;
    return Math.max(0, (c.gold - reserve) * frac);
  },

  /** Sell everything in the bag that isn't an upgrade or a near-future one; keep gems unless the bag is crowded. */
  sellJunk() {
    const p = G.player, c = G.char;
    this.optimizeGear();
    let gold = 0, n = 0;
    const future = {};
    c.bag.forEach((it, i) => {
      if (!it) return;
      if (it.type === 'gem') {
        const top = Math.max(0, ...SLOTS.flatMap((s) => (c.equip[s] ? c.equip[s].gems.map((g) => g.tier) : [])), ...c.bag.filter((b) => b && b.type === 'gem').map((b) => b.tier));
        if (bagFree(c) > 15 || GEMS[it.gem].special || it.tier >= top - 1) return;
      } else if (it.type === 'gear' && (it.req || 1) > c.level && (it.req || 1) <= c.level + 6 && it.rarity >= 2 && !future[it.slot]) {
        const s = fitScore(p, it).s;
        if (s > simulate(p, () => () => {}) * 1.02) { future[it.slot] = true; return; }
      }
      // gems socketed in gear we're selling: pry them out when that's cheap compared to their worth
      if (it.type === 'gear' && it.gems.length) {
        const worth = it.gems.reduce((a, g) => a + itemValue(makeGem(g.gem, g.tier)) / 4, 0);
        if (worth > unsocketCost(it) * 1.5 && c.gold >= unsocketCost(it) && bagFree(c) >= it.gems.length) {
          c.gold -= unsocketCost(it);
          for (const g of it.gems) addToBag(c, makeGem(g.gem, g.tier));
          it.gems = [];
        }
      }
      const price = sellPrice(it);
      c.bag[i] = null;
      c.gold += price; gold += price; n++;
    });
    if (n) G.ui.log(`Auto-play sold ${n} item${n > 1 ? 's' : ''} for ${fmtInt(gold)} gold.`, '#ffd34a');
    changed();
  },

  buyPotions() {
    const c = G.char;
    const caster = this.barSkills().some((sk) => manaCost(sk, 1) > 0 && sk.id === c.bar[0]);
    const want = { ...POT_TARGET, mp: caster ? 12 : 5 };
    let spent = 0;
    for (const k of ['hp', 'mp', 'rejuv', 'fury']) {
      const price = potionPrice(k, c);
      while (c.potions[k] < want[k] && c.gold >= price && (k === 'hp' || c.gold - price > potionPrice('hp', c) * 4)) {
        c.gold -= price; c.potions[k]++; spent += price;
      }
    }
    if (spent) G.ui.log(`Auto-play restocked potions for ${fmtInt(spent)} gold.`, '#ffd34a');
    changed();
  },

  buyGear(list) {
    const p = G.player, c = G.char;
    for (let guard = 0; guard < 4; guard++) {
      const cur = simulate(p, () => () => {});
      let best = -1, bv = 0;
      list.forEach((it, i) => {
        if (!it || it.type !== 'gear' || (it.req || 1) > c.level) return;
        const price = itemValue(it);
        if (price > this.budget(0.85)) return;
        const gain = fitScore(p, it).s - cur;
        if (gain < 0.012) return;
        const v = gain / (0.3 + price / Math.max(1, c.gold));
        if (v > bv) { bv = v; best = i; }
      });
      if (best < 0 || !bagFree(c)) break;
      Vendor.buy({ type: 'shop', list, i: best });
      this.optimizeGear();
    }
  },

  gemShop() {
    const p = G.player, c = G.char;
    // the Gem Forge: fuse every triple it can afford, lowest grades first
    const fused = fuseAll(c, this.budget(0.3));
    if (fused) G.ui.log(`Auto-play fused ${fused} gem${fused > 1 ? 's' : ''} at the Gem Forge.`, '#c8f0ff');
    // buy gems for empty sockets when the bag has none that help
    const empty = SLOTS.reduce((a, s) => a + (c.equip[s] ? c.equip[s].sockets - c.equip[s].gems.length : 0), 0);
    for (let k = 0; k < empty; k++) {
      const list = Vendor.stock.gems;
      let best = -1, bv = 0;
      const cur = simulate(p, () => () => {});
      const slot = SLOTS.find((s) => c.equip[s] && c.equip[s].gems.length < c.equip[s].sockets);
      if (!slot) break;
      const it = c.equip[slot];
      list.forEach((g, i) => {
        if (!g || itemValue(g) > this.budget(0.2)) return;
        const gain = simulate(p, () => { it.gems.push({ gem: g.gem, tier: g.tier }); return () => { it.gems.pop(); }; }) - cur;
        if (gain > 0.003 && gain / itemValue(g) > bv) { bv = gain / itemValue(g); best = i; }
      });
      if (best < 0 || !bagFree(c)) break;
      Vendor.buy({ type: 'shop', list, i: best });
      this.socketGems();
    }
    changed();
  },

  jeweler() {
    const c = G.char;
    const spare = c.bag.reduce((a, b) => a + (b && b.type === 'gem' ? b.count || 1 : 0), 0);
    let added = 0;
    for (const s of ['weapon', 'body', 'offhand', 'head', 'legs', 'hands', 'feet']) {
      const it = c.equip[s];
      if (!it || added >= spare + 1 || it.sockets >= it.maxSockets) continue;
      const cost = socketCost(it);
      if (cost > this.budget(0.3)) continue;
      c.gold -= cost; it.sockets++; added++;
      G.ui.log(`Auto-play had a socket added to ${escapeHtml(itemName(it))}.`, '#c8f0ff');
    }
    this.socketGems();
    this.buyGear(Vendor.stock.rings || []); // the jeweler's rings: augments for the bar's skills
    changed();
  },

  blacksmith() {
    const p = G.player, c = G.char;
    for (let guard = 0; guard < 10; guard++) {
      const cur = simulate(p, () => () => {});
      let best = null, bv = 0;
      for (const s of SLOTS) {
        const it = c.equip[s];
        if (!it || (it.upg || 0) >= 10) continue;
        const cost = upgradeCost(it);
        if (cost > this.budget(0.45)) continue;
        const gain = simulate(p, () => { it.upg = (it.upg || 0) + 1; return () => { it.upg--; }; }) - cur;
        if (gain > 0.002 && gain / cost > bv) { bv = gain / cost; best = it; }
      }
      if (!best) break;
      c.gold -= upgradeCost(best);
      best.upg = (best.upg || 0) + 1;
      G.ui.log(`Auto-play upgraded ${escapeHtml(itemName(best))}.`, '#ffd34a');
    }
    changed();
  },

  enchanter() {
    const c = G.char;
    for (const s of ['weapon', 'body', 'head', 'offhand', 'hands', 'legs', 'feet']) {
      const it = c.equip[s];
      if (!it || it.rarity < 1) continue;
      const n = it.affixes.filter((a) => !a.implicit).length;
      if (n >= RARITY[it.rarity].affixes[1] + 1) continue;
      const cost = enchantCost(it, true);
      if (cost > this.budget(0.2)) continue;
      c.gold -= cost;
      if (addAffix(it)) G.ui.log(`Auto-play enchanted ${escapeHtml(itemName(it))} with a new affix.`, '#c090ff');
    }
    changed();
  },

  gamble() {
    const c = G.char;
    const lvl = Math.max(c.level, c.depth || 1);
    const price = Math.round(180 * Math.pow(1.065, lvl));
    for (let k = 0; k < 3; k++) {
      if (c.gold < price * 8 || bagFree(c) < 3) break;
      // gamble for the weakest slot
      let slot = 'weapon', low = Infinity;
      for (const s of SLOTS) {
        const it = c.equip[s];
        const v = it ? it.ilvl * (1 + it.rarity * 0.4) : -1;
        if (v < low) { low = v; slot = s; }
      }
      const btn = [...document.querySelectorAll('.panel[data-panel="vendor"] .btn')].find((b) => b.textContent.startsWith({ weapon: 'Weapon', offhand: 'Off-hand', head: 'Head', body: 'Body', hands: 'Hands', legs: 'Legs', feet: 'Feet' }[slot] || 'Ring'));
      if (!btn || btn.disabled) break;
      btn.click();
      this.optimizeGear();
    }
  },
};

