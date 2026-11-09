// Abyssal Rifts (docs/ENDGAME.md, docs/ENDGAME_OVERHAUL.md): the run inside a rift level.
import { G } from '../state.js';
import { rand, chance, pick, escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Column, Bolt, sparkle, floatText } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { UI } from '../ui/ui.js';
import { makeRaidBoss, RAID_BOSSES } from './raid.js';
import { GroundItem } from './loot.js';
import { rollItem, rollSigil, rollGem, rarityAt, ABYSSAL, goldPile, RARITY } from '../data/items.js';
import { hit } from './combat.js';
import { RIFT_TIME, RIFT_QUOTA, RIFT_DENSITY, RIFT_GUARDIAN_HP, PYLONS, riftDepth, riftLevel, riftJump, riftWeight, riftReward, fmtTime, instabilitiesForTier } from '../data/rifts.js';
import { markBonuses, grantMarks, riftMarks } from './marks.js';
import { noteRiftBest, endgame } from './endgame.js';
import { Board, barred } from './leaderboard.js';
import { Cloud } from './cloud.js';

export { RIFT_TIME, RIFT_QUOTA, RIFT_DENSITY, riftDepth, riftLevel, riftJump, riftReward, fmtTime };
/** The clock a rift gives: the base plus Haste Marks. */
export const riftTime = () => RIFT_TIME + markBonuses().rift;
/** May the hero enter tier T: 1 .. the tier his wins opened. */
export const riftOpen = (c = G.char) => Math.max(1, (c && c.rifts && c.rifts.open) | 0);

/** The run object, kept on world.rift. */
export function createRiftRun(world, gen, tier, hooks = {}) {
  const total = world.creatures.reduce((s, m) => s + (m.team === 'enemy' && !m.dead ? riftWeight(m) : 0), 0);
  const run = {
    tier, t: 0, limit: riftTime(), progress: 0, total: Math.max(1, total), quota: Math.max(1, Math.ceil(total * RIFT_QUOTA)),
    guardian: null, done: false, failed: false, deaths: 0, gen, world, hooks, warned: {},
    get left() { return Math.max(0, this.limit - this.t); },
    get pct() { return Math.min(100, Math.floor((this.progress / this.quota) * 100)); },
    label() { return `TIER ${this.tier} · ${fmtTime(this.left)} · ${this.guardian ? (this.guardian.dead ? 'cleared' : 'the Guardian') : this.pct + '%'}`; },
  };
  return run;
}

/** A kill in a rift: progress toward the Guardian. */
export function riftKill(world, m) {
  const R = world.rift;
  if (!R || R.done || R.failed) return;
  const w = riftWeight(m);
  if (!w) return;
  R.progress += w;
  if (!R.guardian && R.progress >= R.quota) spawnGuardian(world);
}

/** Activate a Pylon buff for the party */
export function activatePylon(world, def) {
  const p = world.player;
  if (!p) return;
  UI.centerMsg(def.name.toUpperCase(), def.desc, 3.0);
  UI.log(`<b style="color:${def.color}">${def.name}</b> activated! ${def.desc}`, def.color);
  addEffect(new Ring(p.x, p.y, 0.4, 8, 1.2, def.color, 8));
  addEffect(new Column(p.x, p.y, def.color, 1.5, 50, 300));
  sfx('holy'); sfx('boss');
  p.pylonBuff = { id: def.id, timer: def.dur, dur: def.dur, def };
  if (def.id === 'aegis') p.invuln = def.dur;
}

/** The Guardian stirs in the boss room once quota is met */
export function spawnGuardian(world) {
  const R = world.rift;
  if (!R || R.guardian) return null;
  const A = R.gen?.raid || R.gen?.bossRoom;
  if (!A) return null;

  const depth = world.depth, lvl = riftLevel(R.tier);
  const c = G.char, tpl = pick(RAID_BOSSES.filter((b) => !b.sigs && b.id !== (c && c.lastRiftBoss)));
  if (c) c.lastRiftBoss = tpl.id;

  const m = makeRaidBoss(world, A, depth, lvl + 3, { tpl, hp: RIFT_GUARDIAN_HP });
  world.add(m);
  world.boss = m; world.raid = m.raid;
  R.guardian = m; R.gT = R.t;
  const od = m.onDeath;
  m.onDeath = () => { od(); riftWin(world, m); };
  m.raid.announced = true;

  // Reveal the boss room on the map so the player knows where to head
  if (world.map) {
    world.map.reveal(A.cx, A.cy, 18);
  }

  UI.centerMsg('THE GUARDIAN STIRS IN THE BOSS ROOM', `${m.name}, ${m.title}`, 3.2);
  UI.log(`<b style="color:#20e0ff">The Guardian stirs in the Boss Room:</b> ${escapeHtml(m.name)}. Enter the arena and slay it before the clock runs out!`, '#a0f0ff');
  addEffect(new Ring(m.x, m.y, 0.4, 8, 1.2, '#20e0ff', 8)); sfx('roar'); sfx('boss');
  return m;
}

/** Death penalty in co-op/solo rift */
export function riftDeathPenalty(world) {
  const R = world.rift;
  if (!R || R.done || R.failed) return;
  R.deaths = (R.deaths || 0) + 1;
  const penalty = Math.min(25, 5 * R.deaths);
  R.t += penalty;
  UI.log(`<b style="color:#ff6050">+${penalty}s death penalty added to the Rift clock!</b>`, '#ff9090');
}

/** The clock and active pylon ticks */
export function riftTick(world, dt) {
  const R = world.rift, p = world.player;
  if (R && R.failed && R.backT > 0) { if ((R.backT -= dt) <= 0 && R.hooks.onBack) R.hooks.onBack(); return; }
  if (!R || R.done || R.failed || !p) return;

  // Pylon buff processing
  if (p.pylonBuff && p.pylonBuff.timer > 0) {
    p.pylonBuff.timer -= dt;
    const b = p.pylonBuff;
    if (b.id === 'conduit' && chance(dt * 3.5)) {
      const targets = world.creatures.filter((m) => m.team === 'enemy' && !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 10);
      if (targets.length) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        addEffect(new Bolt(p.x, p.y, 25, target.x, target.y, 25, '#30b0ff', 0.15, 4));
        sfx('spark');
        hit(p, target, p.st.attack * 4.5 * (1 + (R.tier || 1) * 0.1), 'lightning');
        sparkle(target.x, target.y, 10, '#30b0ff', 12, 0.5);
      }
    } else if (b.id === 'velocity') {
      p.speedMul = Math.max(p.speedMul || 1, 1.8);
    }
    if (b.timer <= 0) {
      UI.log(`<b style="color:${b.def.color}">${b.def.name}</b> has expired.`, '#ccc');
      p.pylonBuff = null;
    }
  }

  if (p.dead) return;
  R.t += dt;
  const left = R.left;
  for (const [at, msg] of [[60, 'One minute left in the Rift!'], [30, 'Thirty seconds!'], [10, 'Ten seconds!']]) {
    if (left <= at && !R.warned[at]) { R.warned[at] = true; UI.centerMsg(fmtTime(at), 'The Rift is closing', 1.8); sfx('error'); }
  }
  if (left <= 0) riftCollapse(world);
}

/** The Guardian is dead: The Grand Piñata reward explosion */
export function riftWin(world, m) {
  const R = world.rift, c = G.char, p = world.player;
  if (!R || R.done || R.failed) return;
  R.done = true;
  const time = R.t, k = time / R.limit, jump = riftJump(k), tier = R.tier;
  c.rifts ||= { open: 1, best: 0, cleared: {}, bestTime: {}, runs: 0, fails: 0, deaths: 0 };
  const first = !c.rifts.cleared[tier];
  c.rifts.cleared[tier] = (c.rifts.cleared[tier] || 0) + 1;
  c.rifts.best = Math.max(c.rifts.best || 0, tier);
  c.rifts.open = Math.max(c.rifts.open || 1, tier + jump);
  c.rifts.bestTime[tier] = Math.min(c.rifts.bestTime[tier] || 1e9, Math.round(time * 10) / 10);
  const marks = grantMarks(riftMarks(tier), `for Tier ${tier}`);

  // The Grand Piñata Reward Hoard:
  const RW = riftReward(tier, first), lvl = 100;
  const drop = (kind, data) => world.addLoot(new GroundItem(m.x + rand(-2.0, 2.0), m.y + rand(-2.0, 2.0), kind, data));

  // Equipment drops
  for (let i = 0; i < (RW.items || 4); i++) {
    const isAbyssal = (i === 0 && chance(RW.abyssal)) || (RW.abyssal >= 1 && i < 2);
    const rar = isAbyssal ? ABYSSAL : rarityAt(lvl, 5);
    drop('item', { item: rollItem(lvl, { rarity: rar, mf: p ? p.st.magicFind : 0 }) });
  }

  // Abyssal Keys for Unbound Exploration
  if (RW.keys > 0) {
    for (let k = 0; k < RW.keys; k++) drop('key', {});
    UI.log(`<b style="color:#20e0ff">+${RW.keys} Abyssal Key${RW.keys > 1 ? 's' : ''}</b> dropped! Use them at the town portal for Unbound Exploration.`, '#a0f0ff');
  }

  // Sigils, Gems & Gold
  for (let i = 0; i < RW.sigils; i++) drop('item', { item: rollSigil(world.depth, RW.sigilBonus) });
  for (let i = 0; i < 3; i++) drop('item', { item: rollGem(lvl + 4) });
  for (let i = 0; i < 6; i++) drop('gold', { amount: Math.round(goldPile(lvl) * rand(3, 6) * (1 + ((p && p.st.goldFind) || 0) / 100)) });

  // Records
  const cheat = barred(c), best = !cheat && noteRiftBest(c.classId, tier, time);
  R.result = { tier, time, jump, next: tier + jump, marks, first, rarity: chance(RW.abyssal) ? ABYSSAL : 5, best, personal: c.rifts.bestTime[tier] === Math.round(time * 10) / 10 };
  if (cheat) { R.result.board = 'barred'; Board.withdraw(c.classId).catch((e) => console.warn('Honour board:', e)); }
  else if (best) {
    R.result.board = Cloud.signedIn ? 'pending' : 'signedout';
    Board.submit(c, tier, time).then((r) => { R.result.board = r && r.ok ? 'posted' : r && r.kept ? 'kept' : Cloud.signedIn ? 'offline' : 'signedout'; })
      .catch((e) => { R.result.board = 'offline'; console.warn('Honour board:', e); });
  }
  UI.centerMsg('THE RIFT IS CLOSED', `Tier ${tier} in ${fmtTime(time)} · Tier${jump > 1 ? 's' : ''} ${tier + 1}${jump > 1 ? `-${tier + jump}` : ''} open`, 4);
  UI.log(`<b style="color:#20e0ff">Abyssal Rift Tier ${tier}</b> closed in ${fmtTime(time)} (${Math.round(k * 100)}% of the clock): +${jump} tier${jump > 1 ? 's' : ''}${best ? ', <b>a new best</b> for your ' + c.classId.replace('_', ' ') : ''}.`, '#a0f0ff');
  addEffect(new Column(m.x, m.y, '#20e0ff', 1.4, 60, 420)); G.flash = 0.5; sfx('levelup');
  if (R.hooks.onWin) R.hooks.onWin(R.result);
}

/** The hero left a rift: fail */
export function riftLeave(world) {
  const R = world.rift, c = G.char;
  if (!R || R.done || R.failed || !c) return;
  R.failed = true;
  c.rifts.fails = (c.rifts.fails || 0) + 1;
}

/** The clock ran out: the rift collapses */
export function riftCollapse(world) {
  const R = world.rift, c = G.char, p = world.player;
  if (!R || R.done || R.failed) return;
  R.failed = true; R.backT = 2.5;
  c.rifts.fails = (c.rifts.fails || 0) + 1;
  if (p) p.invuln = 3;
  UI.centerMsg('THE RIFT COLLAPSES', `Tier ${R.tier} · the clock ran out`, 3.5);
  UI.log(`<b style="color:#ff6050">The Rift collapses</b> round you: the clock ran out ${R.guardian ? 'with the Guardian still standing' : `at ${R.pct}% of the quota`}. Tier ${R.tier} is still yours to try.`, '#ffb0a0');
  explosionFx(p.x, p.y, 5, 'arcane', 'eruption', { shake: 16 }); G.flash = 0.8; sfx('explode'); sfx('portal');
  if (R.hooks.onFail) R.hooks.onFail();
}
export { pick };
